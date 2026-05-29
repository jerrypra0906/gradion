import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';

export class RegistrationAttemptService {
  private getWindowStart(): Date {
    const windowMinutes = config.security.registrationWindowMinutes;
    const date = new Date();
    date.setMinutes(date.getMinutes() - windowMinutes);
    return date;
  }

  async ensureWithinLimit(ipAddress: string) {
    const windowStart = this.getWindowStart();
    const attempts = await prisma.registrationAttempt.count({
      where: {
        ip_address: ipAddress,
        created_at: {
          gte: windowStart,
        },
      },
    });

    if (attempts >= config.security.registrationMaxAttempts) {
      throw new Error(
        'Too many registration attempts from this IP address. Please try again later.'
      );
    }
  }

  async recordAttempt(ipAddress: string, email: string) {
    await prisma.registrationAttempt.create({
      data: {
        ip_address: ipAddress,
        email,
      },
    });
  }
}

