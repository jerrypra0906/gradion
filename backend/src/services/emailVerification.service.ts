import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { EmailService } from './email.service.js';

export class EmailVerificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getExpiryDate(): Date {
    const expires = new Date();
    expires.setHours(expires.getHours() + config.email.verificationExpiresHours);
    return expires;
  }

  async createToken(userId: number) {
    const token = this.generateToken();
    const expires_at = this.getExpiryDate();

    await prisma.emailVerificationToken.create({
      data: {
        user_id: userId,
        token,
        expires_at,
      },
    });

    return token;
  }

  async sendVerificationEmail(user: { id: number; email: string; name: string }) {
    const token = await this.createToken(user.id);
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    const html = `
      <div>
        <h2>Welcome to Gradion, ${user.name}!</h2>
        <p>Please confirm your email address by clicking the button below:</p>
        <p>
          <a href="${verifyUrl}" style="background-color:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
            Verify my email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link will expire in ${config.email.verificationExpiresHours} hour(s).</p>
        <p>If you did not create an account, you can safely ignore this email.</p>
      </div>
    `;

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Confirm your Gradion account',
      html,
    });
  }

  async verifyToken(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      throw new Error('Invalid or expired verification token');
    }

    if (record.used_at) {
      throw new Error('This verification link has already been used');
    }

    if (record.expires_at < new Date()) {
      throw new Error('Verification link has expired');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.user_id },
        data: { is_email_verified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { used_at: new Date() },
      }),
    ]);

    return {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
      role: record.user.role,
    };
  }

  async ensureResendCooldown(userId: number) {
    const lastToken = await prisma.emailVerificationToken.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    if (!lastToken) {
      return;
    }

    const cooldownMs = config.email.resendCooldownMinutes * 60 * 1000;
    const nextAllowed = lastToken.created_at.getTime() + cooldownMs;

    if (Date.now() < nextAllowed) {
      const minutesLeft = Math.ceil((nextAllowed - Date.now()) / 60000);
      throw new Error(`Please wait ${minutesLeft} minute(s) before requesting another verification email.`);
    }
  }

  async resendVerification(user: { id: number; email: string; name: string }) {
    await this.ensureResendCooldown(user.id);
    // Mark previous tokens as used to avoid clutter
    await prisma.emailVerificationToken.updateMany({
      where: {
        user_id: user.id,
        used_at: null,
      },
      data: {
        used_at: new Date(),
      },
    });

    await this.sendVerificationEmail(user);
  }
}

