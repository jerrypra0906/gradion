import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { Role } from '../types/index.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone_number?: string; // Mobile phone number
  referral_code?: string; // Referral code used during registration
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
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
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
        // Award 100 points to the referrer when someone registers using their code
        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            points: {
              increment: 100,
            },
          },
        });
        logger.info({ referrerId: referrer.id, newUserId: 'pending' }, 'Awarded 100 points to referrer for registration');
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password_hash,
        role: input.role,
        phone_number: input.phone_number || null,
        referral_code: referralCode!,
        referred_by_code: referredByCode,
        points: 0,
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
}

