import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { EmailService } from './email.service.js';
import { logger } from '../utils/logger.js';

export interface PasswordResetTokenData {
  token: string;
  expiresAt: Date;
}

export class PasswordResetService {
  private emailService: EmailService;
  private readonly TOKEN_EXPIRATION_HOURS = 1; // Reset links expire in 1 hour

  constructor() {
    this.emailService = new EmailService();
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getExpiryDate(): Date {
    const expires = new Date();
    expires.setHours(expires.getHours() + this.TOKEN_EXPIRATION_HOURS);
    return expires;
  }

  /**
   * Request password reset - sends email with reset link
   */
  async requestPasswordReset(email: string): Promise<void> {
    let user: { id: number; name: string | null; email: string; password_hash: string | null; role: string } | null = null;
    try {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          password_hash: true,
          role: true,
        },
      });

      if (!user) {
        // Don't reveal if user exists - security best practice
        logger.info({ email }, 'Password reset requested for non-existent user (silent fail)');
        return;
      }

      // Check if user has a password (Google OAuth users don't have password_hash)
      if (!user.password_hash) {
        logger.info({ userId: user.id, email, role: user.role }, 'Password reset requested for Google OAuth user (no password to reset)');
        // Still return silently - don't reveal account type
        return;
      }

      // Generate reset token
      const token = this.generateToken();
      const expiresAt = this.getExpiryDate();

      // Store token in database
      await prisma.passwordResetToken.create({
        data: {
          user_id: user.id,
          token,
          expires_at: expiresAt,
        },
      });

      try {
        // Create reset URL
        const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

        // Send email
        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Reset Your Password</h2>
          <p>Dear ${user.name},</p>
          <p>We received a request to reset your password for your Gradion account.</p>
          
          <p>
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0;">
              Reset Password
            </a>
          </p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 14px;">
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;">
              <strong>⚠️ Security Notice:</strong><br>
              This link will expire in ${this.TOKEN_EXPIRATION_HOURS} hour(s).<br>
              If you didn't request this, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated email from Gradion. Please do not reply to this email.
          </p>
        </div>
      `;

        logger.info({ userId: user.id, email, name: user.name }, 'Attempting to send password reset email');

        await this.emailService.sendEmail({
          to: user.email,
          subject: 'Reset Your Gradion Password',
          html,
        });

        logger.info({ userId: user.id, email, name: user.name }, 'Password reset email sent successfully');
      } catch (emailError) {
        await prisma.passwordResetToken.delete({ where: { token } }).catch((deleteError) => {
          logger.error({ deleteError, token }, 'Failed to clean up password reset token after email error');
        });
        logger.error(
          { error: emailError, email, userId: user.id, userName: user.name },
          'Failed to send password reset email'
        );
        if (emailError instanceof Error && emailError.message) {
          throw emailError;
        }
        throw new Error('We could not send the password reset email. Please try again later.');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('We could not send')) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('Email service is not configured')) {
        throw error;
      }
      logger.error({ error, email, userId: user?.id }, 'Password reset request failed');
      throw error;
    }
  }

  /**
   * Verify reset token (to be called when user clicks reset link)
   */
  async verifyResetToken(token: string): Promise<{ userId: number; email: string }> {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      throw new Error('Invalid or expired reset token');
    }

    if (record.used_at) {
      throw new Error('This reset link has already been used');
    }

    if (record.expires_at < new Date()) {
      throw new Error('Reset link has expired');
    }

    return {
      userId: record.user_id,
      email: record.user.email,
    };
  }

  /**
   * Mark token as used after password is reset
   */
  async markTokenAsUsed(token: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { token },
      data: { used_at: new Date() },
    });
  }
}
