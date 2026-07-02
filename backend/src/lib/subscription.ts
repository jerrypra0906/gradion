import { prisma } from './prisma.js';
import { config } from '../config/env.js';
import type { Subscription, SubscriptionPlan } from '@prisma/client';

export function getTrialWeeks(): number {
  return config.subscription.trialWeeks;
}

export function getTrialTokenLimit(): number {
  return config.ai.tokenLimitFreeTrial;
}

/**
 * Check if a subscription is active (not expired)
 * Returns true if subscription exists, is active/trial, and current date is within start_date and end_date
 * Free subscriptions are allowed as long as they're within the date range
 */
export async function isSubscriptionActive(
  userId: number
): Promise<{ active: boolean; subscription: Subscription | null; message?: string }> {
  let subscription = await prisma.subscription.findUnique({
    where: { user_id: userId },
  });

  if (!subscription) {
    return {
      active: false,
      subscription: null,
      message: 'No subscription found',
    };
  }

  subscription = await expireTrialIfNeeded(subscription);

  // Allow active or trial status (trial is also considered active)
  if (subscription.status !== 'active' && subscription.status !== 'trial') {
    return {
      active: false,
      subscription,
      message: `Subscription status is ${subscription.status}`,
    };
  }

  // Check if current date is within subscription period
  const now = new Date();

  // Check start_date: current date must be >= start_date
  if (subscription.start_date && subscription.start_date > now) {
    return {
      active: false,
      subscription,
      message: 'Subscription has not started yet',
    };
  }

  // Check end_date: if end_date exists, current date must be <= end_date
  if (subscription.end_date && subscription.end_date < now) {
    return {
      active: false,
      subscription,
      message: 'Subscription has expired',
    };
  }

  // Subscription is active (including Free subscriptions) if we reach here
  return {
    active: true,
    subscription,
  };
}

/**
 * Mark an expired trial as expired (lazy, on access checks).
 */
export async function expireTrialIfNeeded(subscription: Subscription): Promise<Subscription> {
  if (subscription.status !== 'trial') return subscription;
  if (!subscription.end_date || subscription.end_date >= new Date()) return subscription;

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'expired' },
  });
}

/**
 * Provision a 2-week free trial with AI access for a newly registered user.
 * Idempotent — skips if the user already has a subscription.
 */
export async function provisionNewUserTrialSubscription(userId: number): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({
    where: { user_id: userId },
  });
  if (existing) return existing;

  const trialWeeks = getTrialWeeks();
  const tokenLimit = getTrialTokenLimit();
  const startDate = new Date();
  const endDate = calculateEndDate(startDate, trialWeeks);

  const subscription = await prisma.subscription.create({
    data: {
      user_id: userId,
      plan_type: 'pro',
      status: 'trial',
      start_date: startDate,
      end_date: endDate,
    },
  });

  await prisma.aITokenWallet.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      plan_type: 'pro',
      monthly_token_limit: tokenLimit,
      renewal_date: endDate,
    },
    update: {
      plan_type: 'pro',
      monthly_token_limit: tokenLimit,
      current_token_usage: 0,
      renewal_date: endDate,
      last_reset_date: startDate,
    },
  });

  return subscription;
}

/**
 * Calculate end date based on start date and number of weeks
 */
export function calculateEndDate(startDate: Date, weeks: number): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + weeks * 7);
  return endDate;
}

/**
 * Get plan configuration from database
 */
export async function getPlanConfig(planType: SubscriptionPlan) {
  // Query all configs and filter by plan_type string to avoid enum type mismatch
  const allConfigs = await prisma.subscriptionPlanConfig.findMany();
  const configRow = allConfigs.find(
    (c) => c.plan_type.toString().toLowerCase() === planType.toString().toLowerCase()
  );

  if (!configRow) {
    throw new Error(`Plan configuration not found for type: ${planType}`);
  }

  return {
    weeks: configRow.weeks,
    aiAccess: configRow.ai_access,
    monthlyTokenLimit: configRow.monthly_token_limit,
    price: configRow.price,
  };
}

/**
 * Plan config as shown to the client — trial users get AI + trial token pool.
 */
export async function getEffectivePlanConfig(subscription: Subscription) {
  const base = await getPlanConfig(subscription.plan_type);

  if (subscription.status === 'trial') {
    return {
      ...base,
      weeks: getTrialWeeks(),
      aiAccess: true,
      monthlyTokenLimit: getTrialTokenLimit(),
      price: 0,
      isTrial: true as const,
    };
  }

  return { ...base, isTrial: false as const };
}
