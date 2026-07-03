import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { z } from 'zod';
import jwt, { SignOptions } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from '../services/user.service.js';
import { config } from '../config/env.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { EmailVerificationService } from '../services/emailVerification.service.js';
import { PasswordResetService } from '../services/passwordReset.service.js';
import { RegistrationAttemptService } from '../services/registrationAttempt.service.js';
import { formatErrorMessage } from '../utils/errorResponse.js';
import { prisma } from '../lib/prisma.js';
import { provisionNewUserTrialSubscription } from '../lib/subscription.js';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';

// Helper function to auto-link therapist from pending invitations
async function linkTherapistFromInvitations(
  therapistId: number,
  therapistEmail: string,
  log: any = logger
): Promise<void> {
  try {
    const pendingInvitations = await prisma.therapistInvitation.findMany({
      where: {
        therapist_email: therapistEmail,
        status: 'pending',
      },
      include: {
        child: true,
      },
    });

    if (pendingInvitations.length > 0) {
      // Link therapist to all children with pending invitations
      for (const invitation of pendingInvitations) {
        try {
          await prisma.therapistChild.create({
            data: {
              therapist_id: therapistId,
              child_id: invitation.child_id,
            },
          });
          // Update invitation status to accepted
          await prisma.therapistInvitation.update({
            where: { id: invitation.id },
            data: {
              status: 'accepted',
              linked_at: new Date(),
            },
          });
        } catch (error: any) {
          // Ignore unique constraint errors (already linked)
          if (!String(error.message).includes('Unique constraint')) {
            log.warn({ error, invitationId: invitation.id }, 'Failed to auto-link therapist to child');
          }
        }
      }
      log.info({ email: therapistEmail, linkedCount: pendingInvitations.length }, 'Auto-linked therapist to children');
    }
  } catch (error) {
    // Don't fail if auto-linking fails, just log it
    log.warn({ error, email: therapistEmail }, 'Failed to auto-link therapist invitations');
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'therapist', 'parent']),
  phone_number: z.string().optional(), // Mobile phone number
  referral_code: z.string().optional(), // Referral code used during registration
});

const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const googleLoginSchema = z.object({
  credential: z.string().min(10),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

function rateLimitKeyFromEmail(prefix: string) {
  return (request: FastifyRequest) => {
    const body = request.body as { email?: string } | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.toLowerCase().trim() : 'unknown';
    return `${prefix}:${request.ip ?? 'unknown'}:${email}`;
  };
}

export async function authRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  const userService = new UserService();
  const emailVerificationService = new EmailVerificationService();
  const passwordResetService = new PasswordResetService();
  const registrationAttemptService = new RegistrationAttemptService();
  const googleClient = config.google.clientId
    ? new OAuth2Client(config.google.clientId)
    : null;

  const loginRateLimit = {
    rateLimit: {
      max: config.security.loginMaxAttempts,
      timeWindow: config.security.loginWindowMs,
      global: false,
      hook: 'preHandler' as const,
      keyGenerator: rateLimitKeyFromEmail('auth-login'),
    },
  };

  const passwordResetRateLimit = {
    rateLimit: {
      max: config.security.loginMaxAttempts,
      timeWindow: config.security.loginWindowMs,
      global: false,
      hook: 'preHandler' as const,
      keyGenerator: rateLimitKeyFromEmail('auth-forgot'),
    },
  };

  // Log route registration for debugging
  fastify.log.info('Registering auth routes...');

  // Register new user
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);
      const ipAddress = request.ip ?? 'unknown';

      await registrationAttemptService.ensureWithinLimit(ipAddress);
      await registrationAttemptService.recordAttempt(ipAddress, body.email);

      const user = await userService.createUser({
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role,
        phone_number: body.phone_number,
        referral_code: body.referral_code,
      });
      await emailVerificationService.sendVerificationEmail({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      // Auto-link therapist to children if they have pending invitations
      if (body.role === 'therapist') {
        await linkTherapistFromInvitations(user.id, body.email, fastify.log);
      }

      reply.code(201);
      return {
        success: true,
        data: {
          message: 'Registration successful. Please check your email to verify your account before logging in.',
        },
      };
    } catch (error: any) {
      // Surface known, non-sensitive cases with a clear message even in
      // production (formatErrorMessage otherwise masks everything as generic).
      if (error.message === 'User with this email already exists') {
        reply.code(409);
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
        };
      }
      if (error.message?.includes('Too many registration attempts')) {
        reply.code(429);
        return {
          success: false,
          error: 'Too many registration attempts. Please wait a while and try again.',
        };
      }
      reply.code(400);
      return {
        success: false,
        error: formatErrorMessage(error, 'Registration failed'),
      };
    }
  });

  // Login
  fastify.post('/login', { config: loginRateLimit }, async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const user = await userService.findUserByEmail(body.email);
      if (!user) {
        reply.code(401);
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      if (!user.password_hash) {
        reply.code(400);
        return {
          success: false,
          error: 'This account uses Google Sign-In. Please continue with Google to sign in.',
        };
      }

      const isValidPassword = await userService.verifyPassword(
        body.password,
        user.password_hash
      );

      if (!isValidPassword) {
        reply.code(401);
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      if (!user.is_email_verified) {
        reply.code(403);
        return {
          success: false,
          error: 'Please verify your email address before signing in.',
        };
      }

      // Generate JWT token
      const signOptions: SignOptions = {
        expiresIn: config.auth.jwtExpiresIn as unknown as SignOptions['expiresIn'],
      };

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.auth.jwtSecret,
        signOptions
      );

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_email_verified: user.is_email_verified,
          },
        },
      };
    } catch (error: any) {
      reply.code(401);
      return {
        success: false,
        error: formatErrorMessage(error, 'Login failed'),
      };
    }
  });

  // Verify email
  fastify.post('/verify-email', async (request, reply) => {
    try {
      const body = verifyEmailSchema.parse(request.body);
      await emailVerificationService.verifyToken(body.token);

      return {
        success: true,
        data: {
          message: 'Email verified successfully. You can now sign in.',
        },
      };
    } catch (error: any) {
      reply.code(400);
      return {
        success: false,
        error: formatErrorMessage(error, 'Unable to verify email'),
      };
    }
  });

  // Resend verification email
  fastify.post('/resend-verification', async (request, reply) => {
    try {
      const body = resendVerificationSchema.parse(request.body);
      const user = await userService.findUserByEmail(body.email);

      if (!user) {
        return {
          success: true,
          data: {
            message: 'If an account exists for this email, a verification link will be sent.',
          },
        };
      }

      if (user.is_email_verified) {
        return {
          success: true,
          data: {
            message: 'This email is already verified. Please sign in.',
          },
        };
      }

      await emailVerificationService.resendVerification({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      return {
        success: true,
        data: {
          message: 'Verification email sent. Please check your inbox.',
        },
      };
    } catch (error: any) {
      reply.code(400);
      return {
        success: false,
        error: formatErrorMessage(error, 'Unable to resend verification email'),
      };
    }
  });

  // Google OAuth login
  fastify.post('/google', async (request, reply) => {
    if (!googleClient || !config.google.clientId) {
      reply.code(503);
      return {
        success: false,
        error: 'Google authentication is not configured.',
      };
    }

    try {
      const body = googleLoginSchema.parse(request.body);
      const ticket = await googleClient.verifyIdToken({
        idToken: body.credential,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new Error('Unable to verify Google account');
      }

      let user = await prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: payload.name ?? 'Google User',
            email: payload.email,
            password_hash: null,
            role: 'parent',
            is_email_verified: true,
            google_id: payload.sub,
          },
        });
        await provisionNewUserTrialSubscription(user.id);
        await userService.ensureReferralCode(user.id);
      } else {
        const updates: Record<string, unknown> = {};
        if (!user.google_id) {
          updates.google_id = payload.sub;
        }
        if (!user.is_email_verified) {
          updates.is_email_verified = true;
        }

        if (Object.keys(updates).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updates,
          });
        }

        if (!user.referral_code) {
          await userService.ensureReferralCode(user.id);
        }
      }

      const signOptions: SignOptions = {
        expiresIn: config.auth.jwtExpiresIn as unknown as SignOptions['expiresIn'],
      };

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.auth.jwtSecret,
        signOptions
      );

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_email_verified: user.is_email_verified,
          },
        },
      };
    } catch (error: any) {
      reply.code(400);
      return {
        success: false,
        error: formatErrorMessage(error, 'Google authentication failed'),
      };
    }
  });

  // Forgot password - request password reset
  fastify.post('/forgot-password', { config: passwordResetRateLimit }, async (request, reply) => {
    fastify.log.info({ email: (request.body as any)?.email }, 'Forgot password route called');
    try {
      const body = forgotPasswordSchema.parse(request.body);
      await passwordResetService.requestPasswordReset(body.email.trim().toLowerCase());

      // Always return success message (security best practice - don't reveal if email exists)
      return {
        success: true,
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.',
        },
      };
    } catch (error: any) {
      fastify.log.error({ error, email: (request.body as any)?.email }, 'Error in forgot password route');
      reply.code(400);
      return {
        success: false,
        error: formatErrorMessage(error, 'Unable to process password reset request'),
      };
    }
  });

  // Reset password - verify token and update password
  fastify.post('/reset-password', async (request, reply) => {
    try {
      const body = resetPasswordSchema.parse(request.body);
      
      // Verify token
      const { userId } = await passwordResetService.verifyResetToken(body.token);
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(body.newPassword, config.auth.bcryptRounds);
      
      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password_hash: hashedPassword },
      });
      
      // Mark token as used
      await passwordResetService.markTokenAsUsed(body.token);
      
      return {
        success: true,
        data: {
          message: 'Password reset successfully. You can now sign in with your new password.',
        },
      };
    } catch (error: any) {
      reply.code(400);
      return {
        success: false,
        error: formatErrorMessage(error, 'Unable to reset password'),
      };
    }
  });

  // Get current user
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      reply.code(401);
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const userData = await userService.findUserById(user.id);
    if (!userData) {
      reply.code(404);
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: userData,
    };
  });

  fastify.log.info('✅ All auth routes registered successfully');
}

