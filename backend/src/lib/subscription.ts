import { prisma } from './prisma.js';
import type { Subscription, SubscriptionPlan } from '@prisma/client';

/**
 * Check if a subscription is active (not expired)
 * Returns true if subscription exists, is active/trial, and current date is within start_date and end_date
 * Free subscriptions are allowed as long as they're within the date range
 */
export async function isSubscriptionActive(
  userId: number
): Promise<{ active: boolean; subscription: Subscription | null; message?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { user_id: userId },
  });

  if (!subscription) {
    return {
      active: false,
      subscription: null,
      message: 'No subscription found',
    };
  }

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
  const config = allConfigs.find(
    (c) => c.plan_type.toString().toLowerCase() === planType.toString().toLowerCase()
  );

  if (!config) {
    throw new Error(`Plan configuration not found for type: ${planType}`);
  }

  return {
    weeks: config.weeks,
    aiAccess: config.ai_access,
    monthlyTokenLimit: config.monthly_token_limit,
    price: config.price,
  };
}

