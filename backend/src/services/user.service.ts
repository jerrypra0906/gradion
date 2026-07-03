import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { provisionNewUserTrialSubscription } from '../lib/subscription.js';
import { Role } from '../types/index.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** Points awarded to referrer when someone registers with their code */
export const REFERRAL_REGISTRATION_POINTS = 1000;
/** Points awarded to referrer when a referred user gets their first paid subscription */
export const REFERRAL_SUBSCRIPTION_POINTS = 900;

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone_number?: string; // Mobile phone number
  referral_code?: string; // Referral code used during registration
  is_email_verified?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  phone_number?: string | null;
  is_email_verified?: boolean;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at: Date;
  is_email_verified: boolean;
}

export class UserService {
  private generateReferralCode(): string {
    // Generate an 8-character alphanumeric code
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(input.password, config.auth.bcryptRounds);

    // Generate unique referral code
    let referralCode: string;
    let codeExists = true;
    while (codeExists) {
      referralCode = this.generateReferralCode();
      const existing = await prisma.user.findUnique({
        where: { referral_code: referralCode },
      });
      codeExists = !!existing;
    }

    // Handle referral code if provided
    let referredByCode: string | null = null;
    if (input.referral_code) {
      const referrer = await prisma.user.findUnique({
        where: { referral_code: input.referral_code },
      });

      if (referrer) {
        referredByCode = input.referral_code;
        // Award points to the referrer when someone registers using their code
        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            points: {
              increment: REFERRAL_REGISTRATION_POINTS,
            },
          },
        });
        logger.info(
          { referrerId: referrer.id, points: REFERRAL_REGISTRATION_POINTS },
          'Awarded referral points for registration'
        );
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role: input.role,
        phone_number: input.phone_number?.trim() || null,
        referral_code: referralCode!,
        referred_by_code: referredByCode,
        points: 0,
        is_email_verified: input.is_email_verified ?? false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        is_email_verified: true,
      },
    });

    try {
      await provisionNewUserTrialSubscription(user.id);
    } catch (provisionError) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw provisionError;
    }

    return user;
  }

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        points: true,
        created_at: true,
        is_email_verified: true,
      },
    });
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /** Generate a unique referral code for users who don't have one yet (e.g. Google OAuth). */
  async ensureReferralCode(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referral_code: true },
    });

    if (user?.referral_code) {
      return user.referral_code;
    }

    let referralCode: string;
    let codeExists = true;
    while (codeExists) {
      referralCode = this.generateReferralCode();
      const existing = await prisma.user.findUnique({
        where: { referral_code: referralCode },
      });
      codeExists = !!existing;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { referral_code: referralCode! },
      select: { referral_code: true },
    });

    return updated.referral_code!;
  }

  async countReferralSignups(referralCode: string): Promise<number> {
    return prisma.user.count({
      where: { referred_by_code: referralCode },
    });
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password_hash: true },
    });

    if (!user?.password_hash) {
      throw new Error(
        'This account uses Google Sign-In. Please continue with Google to sign in.'
      );
    }

    const isValid = await this.verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });
  }

  async getAllUsers(role?: Role) {
    const where = role ? { role } : {};
    return prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async updateUser(id: number, input: UpdateUserInput): Promise<UserResponse> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('User not found');
    }

    if (input.role && input.role !== existing.role && existing.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        throw new Error('Cannot change role of the last admin account');
      }
    }

    return prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.phone_number !== undefined ? { phone_number: input.phone_number } : {}),
        ...(input.is_email_verified !== undefined
          ? { is_email_verified: input.is_email_verified }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        is_email_verified: true,
      },
    });
  }
}

