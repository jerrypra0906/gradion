import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ensureAITokenWallet, getEffectivePlanConfig } from '../lib/subscription.js';
import { AI_TOKEN_COST_ESTIMATES } from '../lib/aiTokenCosts.js';

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
  // Token wallet + plan limits + operation cost estimates
  fastify.get('/info', { preHandler: authenticate }, async (request, _reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const { wallet, subscription } = await ensureAITokenWallet(user.id);
    const planConfig = await getEffectivePlanConfig(subscription);

    return {
      success: true,
      data: {
        wallet: {
          ...wallet,
          tokens_remaining: wallet.monthly_token_limit - wallet.current_token_usage,
          has_quota: wallet.current_token_usage < wallet.monthly_token_limit,
        },
        planConfig: {
          planType: subscription.plan_type,
          status: subscription.status,
          monthlyTokenLimit: planConfig.monthlyTokenLimit,
          aiAccess: planConfig.aiAccess,
          isTrial: planConfig.isTrial ?? false,
        },
        operationEstimates: AI_TOKEN_COST_ESTIMATES,
      },
    };
  });

  // Get user's AI token wallet (authenticated)
  fastify.get(
    '/wallet',
    { preHandler: authenticate },
    async (request, _reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { wallet, subscription } = await ensureAITokenWallet(user.id);
      const planConfig = await getEffectivePlanConfig(subscription);

      return {
        success: true,
        data: {
          ...wallet,
          tokens_remaining: wallet.monthly_token_limit - wallet.current_token_usage,
          has_quota: wallet.current_token_usage < wallet.monthly_token_limit,
          plan_type: subscription.plan_type,
          subscription_status: subscription.status,
          plan_monthly_token_limit: planConfig.monthlyTokenLimit,
        },
      };
    }
  );

  // Check if user has enough tokens (authenticated)
  fastify.post(
    '/check',
    { preHandler: authenticate },
    async (request, _reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = checkTokenQuotaSchema.parse(request.body);

      const { wallet } = await ensureAITokenWallet(user.id);

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

      const { wallet } = await ensureAITokenWallet(user.id);

      const tokensRemaining = wallet.monthly_token_limit - wallet.current_token_usage;
      if (tokensRemaining < body.tokens_used) {
        reply.code(403);
        return {
          success: false,
          error: `Insufficient tokens. You have ${tokensRemaining} tokens remaining, but need ${body.tokens_used}.`,
        };
      }

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
