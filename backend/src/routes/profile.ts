import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { UserService } from '../services/user.service.js';
import { formatErrorMessage } from '../utils/errorResponse.js';

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export async function profileRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  const userService = new UserService();

  // Get current user profile
  fastify.get(
    '/me',
    { preHandler: authenticate },
    async (request, _reply) => {
      const user = (request as AuthenticatedRequest).user!;

      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          referral_code: true,
          points: true,
          role: true,
          created_at: true,
          is_email_verified: true,
          password_hash: true,
        },
      });

      if (!userProfile) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const referralCode = await userService.ensureReferralCode(user.id);
      const referralSignups = await userService.countReferralSignups(referralCode);
      const pointsBalance = userProfile.points ?? 0;

      const { password_hash, referral_code: _storedCode, points: _points, ...profile } = userProfile;

      return {
        success: true,
        data: {
          ...profile,
          referral_code: referralCode,
          points: pointsBalance,
          referral_signups: referralSignups,
          has_password: !!password_hash,
        },
      };
    }
  );

  // Change password (authenticated users with email/password login)
  fastify.post(
    '/change-password',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;

      try {
        const body = changePasswordSchema.parse(request.body);

        if (body.currentPassword === body.newPassword) {
          reply.code(400);
          return {
            success: false,
            error: 'New password must be different from your current password',
          };
        }

        await userService.changePassword(user.id, body.currentPassword, body.newPassword);

        return {
          success: true,
          data: {
            message: 'Password changed successfully',
          },
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error && error.message === 'Current password is incorrect'
            ? error.message
            : formatErrorMessage(error, 'Unable to change password');

        reply.code(400);
        return {
          success: false,
          error: message,
        };
      }
    }
  );

  // Update user profile
  fastify.put(
    '/me',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = updateProfileSchema.parse(request.body);

      // Check if email is being changed and if it's already taken
      if (body.email && body.email !== user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: body.email },
        });

        if (existingUser) {
          reply.code(409);
          return {
            success: false,
            error: 'Email already in use',
          };
        }

        // If email is changed, reset email verification
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email: body.email,
            phone_number: body.phone_number ?? undefined,
            is_email_verified: false,
          },
        });

        // TODO: Send verification email to new email address
      } else {
        // Only update phone number
        await prisma.user.update({
          where: { id: user.id },
          data: {
            phone_number: body.phone_number ?? undefined,
          },
        });
      }

      // Fetch updated user
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          referral_code: true,
          points: true,
          role: true,
          created_at: true,
          is_email_verified: true,
          password_hash: true,
        },
      });

      const { password_hash, referral_code: _storedCode, points: _points, ...profile } = updatedUser!;

      return {
        success: true,
        data: {
          ...profile,
          referral_code: updatedUser!.referral_code ?? (await userService.ensureReferralCode(user.id)),
          points: updatedUser!.points ?? 0,
          referral_signups: updatedUser!.referral_code
            ? await userService.countReferralSignups(updatedUser!.referral_code)
            : 0,
          has_password: !!password_hash,
        },
        message: 'Profile updated successfully',
      };
    }
  );
}

