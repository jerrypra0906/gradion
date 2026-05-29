import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import type { SubscriptionPlan } from '@prisma/client';

// Helper function to get plan config from database
async function getPlanConfig(planType: SubscriptionPlan) {
  const config = await prisma.subscriptionPlanConfig.findUnique({
    where: { plan_type: planType },
  });

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

const checkTokenQuotaSchema = z.object({
  tokens_needed: z.number().int().positive(),
});

const useTokensSchema = z.object({
  tokens_used: z.number().int().positive(),
});

export async function aiTokensRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Get user's AI token wallet (authenticated)
  fastify.get(
    '/wallet',
    { preHandler: authenticate },
    async (request, _reply) => {
      const user = (request as AuthenticatedRequest).user!;

      let wallet = await prisma.aITokenWallet.findUnique({
        where: { user_id: user.id },
      });

      // Create default wallet if none exists
      if (!wallet) {
        const subscription = await prisma.subscription.findUnique({
          where: { user_id: user.id },
        });

        const planType = (subscription?.plan_type || 'free') as SubscriptionPlan;
        const planConfig = await getPlanConfig(planType);
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);

        wallet = await prisma.aITokenWallet.create({
          data: {
            user_id: user.id,
            plan_type: planType,
            monthly_token_limit: planConfig.monthlyTokenLimit,
            renewal_date: renewalDate,
          },
        });
      }

      // Check if renewal is needed
      const now = new Date();
      if (wallet.renewal_date <= now) {
        const subscription = await prisma.subscription.findUnique({
          where: { user_id: user.id },
        });

        const planType = (subscription?.plan_type || 'free') as SubscriptionPlan;
        const planConfig = await getPlanConfig(planType);
        const newRenewalDate = new Date(now);
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);

        wallet = await prisma.aITokenWallet.update({
          where: { id: wallet.id },
          data: {
            current_token_usage: 0,
            monthly_token_limit: planConfig.monthlyTokenLimit,
            renewal_date: newRenewalDate,
            last_reset_date: now,
          },
        });
      }

      return {
        success: true,
        data: {
          ...wallet,
          tokens_remaining: wallet.monthly_token_limit - wallet.current_token_usage,
          has_quota: wallet.current_token_usage < wallet.monthly_token_limit,
        },
      };
    }
  );

  // Check if user has enough tokens (authenticated)
  fastify.post(
    '/check',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = checkTokenQuotaSchema.parse(request.body);

      let wallet = await prisma.aITokenWallet.findUnique({
        where: { user_id: user.id },
      });

      if (!wallet) {
        reply.code(404);
        return {
          success: false,
          error: 'AI token wallet not found',
        };
      }

      // Check if renewal is needed
      const now = new Date();
      if (wallet.renewal_date <= now) {
        const subscription = await prisma.subscription.findUnique({
          where: { user_id: user.id },
        });

        const planType = (subscription?.plan_type || 'free') as SubscriptionPlan;
        const planConfig = await getPlanConfig(planType);
        const newRenewalDate = new Date(now);
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);

        wallet = await prisma.aITokenWallet.update({
          where: { id: wallet.id },
          data: {
            current_token_usage: 0,
            monthly_token_limit: planConfig.monthlyTokenLimit,
            renewal_date: newRenewalDate,
            last_reset_date: now,
          },
        });
      }

      const tokensRemaining = wallet.monthly_token_limit - wallet.current_token_usage;
      const hasEnough = tokensRemaining >= body.tokens_needed;

      return {
        success: true,
        data: {
          has_enough: hasEnough,
          tokens_remaining: tokensRemaining,
          tokens_needed: body.tokens_needed,
          current_usage: wallet.current_token_usage,
          monthly_limit: wallet.monthly_token_limit,
        },
      };
    }
  );

  // Use tokens (authenticated) - called after AI request
  fastify.post(
    '/use',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = useTokensSchema.parse(request.body);

      let wallet = await prisma.aITokenWallet.findUnique({
        where: { user_id: user.id },
      });

      if (!wallet) {
        reply.code(404);
        return {
          success: false,
          error: 'AI token wallet not found',
        };
      }

      // Check if renewal is needed
      const now = new Date();
      if (wallet.renewal_date <= now) {
        const subscription = await prisma.subscription.findUnique({
          where: { user_id: user.id },
        });

        const planType = (subscription?.plan_type || 'free') as SubscriptionPlan;
        const planConfig = await getPlanConfig(planType);
        const newRenewalDate = new Date(now);
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);

        wallet = await prisma.aITokenWallet.update({
          where: { id: wallet.id },
          data: {
            current_token_usage: 0,
            monthly_token_limit: planConfig.monthlyTokenLimit,
            renewal_date: newRenewalDate,
            last_reset_date: now,
          },
        });
      }

      // Check if user has enough tokens
      const tokensRemaining = wallet.monthly_token_limit - wallet.current_token_usage;
      if (tokensRemaining < body.tokens_used) {
        reply.code(403);
        return {
          success: false,
          error: `Insufficient tokens. You have ${tokensRemaining} tokens remaining, but need ${body.tokens_used}.`,
        };
      }

      // Update token usage
      const updated = await prisma.aITokenWallet.update({
        where: { id: wallet.id },
        data: {
          current_token_usage: {
            increment: body.tokens_used,
          },
        },
      });

      return {
        success: true,
        data: {
          ...updated,
          tokens_remaining: updated.monthly_token_limit - updated.current_token_usage,
        },
      };
    }
  );
}

