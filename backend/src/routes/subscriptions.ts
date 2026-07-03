import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { getPlanConfig, calculateEndDate, provisionNewUserTrialSubscription, getEffectivePlanConfig, ensureAITokenWallet, syncWalletsForPlanType } from '../lib/subscription.js';
import { PaymentService } from '../services/payment.service.js';
import { SubscriptionNotificationService } from '../services/subscriptionNotification.service.js';
import { logger } from '../utils/logger.js';
import { REFERRAL_SUBSCRIPTION_POINTS } from '../services/user.service.js';
import { calculatePaymentFee } from '../utils/paymentFee.js';
import crypto from 'crypto';

// Helper function to get all plans as object
async function getAllPlans() {
  const configs = await prisma.subscriptionPlanConfig.findMany({
    where: { is_active: true },
    orderBy: { price: 'asc' },
  });

  const plans: Record<string, any> = {};
  for (const config of configs) {
    plans[config.plan_type] = {
      name: config.name,
      description: config.description,
      weeks: config.weeks,
      aiAccess: config.ai_access,
      monthlyTokenLimit: config.monthly_token_limit,
      price: config.price,
    };
  }

  return plans;
}

const createSubscriptionSchema = z.object({
  user_id: z.number().int().positive(),
  plan_type: z.enum(['free', 'pro', 'premium', 'therapist']),
  status: z.enum(['active', 'cancelled', 'expired', 'trial']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime(), // Now mandatory - frontend will always send it
});

const updateSubscriptionSchema = z.object({
  plan_type: z.enum(['free', 'pro', 'premium', 'therapist']).optional(),
  status: z.enum(['active', 'cancelled', 'expired', 'trial']).optional(),
  end_date: z.string().datetime(), // Now mandatory - frontend will always send it
});

const updateQuotaSchema = z.object({
  child_id: z.number().int().positive(),
  monthly_quota: z.number().int().positive(),
});

export async function subscriptionsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Payment service diagnostic endpoint (admin only)
  fastify.get(
    '/payment-status',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, _reply) => {
      const { PaymentService } = await import('../services/payment.service.js');
      const paymentService = new PaymentService();
      const { config } = await import('../config/env.js');
      
      const serverKey = config.payment.midtransServerKey?.trim() || '';
      const isSandboxKey = serverKey.startsWith('SB-Mid-server-');
      const isProductionKey = serverKey.startsWith('Mid-server-');
      const keyFormatValid = isSandboxKey || isProductionKey;
      const environmentMatch = config.payment.midtransIsProduction 
        ? isProductionKey 
        : isSandboxKey;
      
      // Test the key by making a simple API call
      let keyTestResult = 'Not tested';
      let keyTestError = null;
      
      if (serverKey && keyFormatValid) {
        try {
          const snapApiUrl = config.payment.midtransIsProduction
            ? 'https://app.midtrans.com/snap/v1'
            : 'https://app.sandbox.midtrans.com/snap/v1';
          
          const authString = Buffer.from(serverKey + ':').toString('base64');
          
          // Make a test request with minimal payload
          const testResponse = await fetch(`${snapApiUrl}/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Basic ${authString}`,
            },
            body: JSON.stringify({
              transaction_details: {
                order_id: `test-${Date.now()}`,
                gross_amount: 1000,
              },
            }),
          });
          
          if (testResponse.ok) {
            keyTestResult = 'SUCCESS - Key is valid and working';
          } else {
            const errorText = await testResponse.text();
            keyTestResult = `FAILED - Status ${testResponse.status}`;
            keyTestError = errorText.substring(0, 200);
          }
        } catch (error: any) {
          keyTestResult = 'ERROR - Could not test key';
          keyTestError = error.message;
        }
      }
      
      // Validate key length (Midtrans keys can vary - typically 30-60 characters)
      // Some keys are 35 characters, others are 40-50
      const expectedMinLength = 30;
      const expectedMaxLength = 60;
      const keyLengthValid = serverKey.length >= expectedMinLength && serverKey.length <= expectedMaxLength;
      
      // Get raw environment variable value for debugging
      const rawEnvValue = process.env.MIDTRANS_IS_PRODUCTION;
      const rawEnvType = typeof rawEnvValue;
      
      return {
        success: true,
        data: {
          hasServerKey: !!config.payment.midtransServerKey,
          serverKeyPrefix: serverKey 
            ? serverKey.substring(0, 15) + '...' 
            : 'NOT SET',
          serverKeyLength: serverKey.length,
          serverKeyRawLength: config.payment.midtransServerKey?.length || 0,
          expectedKeyLength: `${expectedMinLength}-${expectedMaxLength} characters`,
          keyLengthValid,
          keyLengthWarning: !keyLengthValid && serverKey.length > 0 
            ? `Key length is ${serverKey.length} characters, expected ${expectedMinLength}-${expectedMaxLength}. Key may be incomplete or truncated.`
            : null,
          hasWhitespace: serverKey !== (config.payment.midtransServerKey || ''),
          hasClientKey: !!config.payment.midtransClientKey,
          isProduction: config.payment.midtransIsProduction,
          rawEnvValue: rawEnvValue !== undefined ? String(rawEnvValue) : 'NOT SET',
          rawEnvType,
          parsedValue: config.payment.midtransIsProduction,
          expectedKeyPrefix: config.payment.midtransIsProduction 
            ? 'Mid-server-' 
            : 'SB-Mid-server-',
          actualKeyPrefix: serverKey.substring(0, 12),
          keyFormatValid,
          environmentMatch,
          serviceAvailable: (paymentService as any).isAvailable,
          apiUrl: config.payment.midtransIsProduction
            ? 'https://app.midtrans.com/snap/v1'
            : 'https://app.sandbox.midtrans.com/snap/v1',
          keyTestResult,
          keyTestError,
        },
      };
    }
  );

  // Get subscription plans (public)
  fastify.get('/plans', async (_request, _reply) => {
    const plans = await getAllPlans();
    return {
      success: true,
      data: plans,
    };
  });

  // Get all plan configurations with details (admin only)
  fastify.get(
    '/plans/configs',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, _reply) => {
      const configs = await prisma.subscriptionPlanConfig.findMany({
        orderBy: { price: 'asc' },
      });

      return {
        success: true,
        data: configs,
      };
    }
  );

  // Update plan configuration (admin only)
  fastify.put(
    '/plans/:planType',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { planType } = request.params as { planType: string };
      const body = z
        .object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          weeks: z.number().int().positive().optional(),
          ai_access: z.boolean().optional(),
          monthly_token_limit: z.number().int().nonnegative().optional(),
          price: z.number().int().nonnegative().optional(),
          is_active: z.boolean().optional(),
        })
        .parse(request.body);

      if (!['free', 'pro', 'premium', 'therapist'].includes(planType)) {
        reply.code(400);
        return {
          success: false,
          error: 'Invalid plan type',
        };
      }

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.weeks !== undefined) updateData.weeks = body.weeks;
      if (body.ai_access !== undefined) updateData.ai_access = body.ai_access;
      if (body.monthly_token_limit !== undefined)
        updateData.monthly_token_limit = body.monthly_token_limit;
      if (body.price !== undefined) updateData.price = body.price;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;

      // Find the config first to get the ID, then update by ID to avoid enum casting issues
      // Query all configs and filter by plan_type string to avoid enum type mismatch
      const allConfigs = await prisma.subscriptionPlanConfig.findMany();
      const existingConfig = allConfigs.find(
        (config) => config.plan_type.toString().toLowerCase() === planType.toLowerCase()
      );

      if (!existingConfig) {
        reply.code(404);
        return {
          success: false,
          error: 'Plan configuration not found',
        };
      }

      const updated = await prisma.subscriptionPlanConfig.update({
        where: { id: existingConfig.id },
        data: updateData,
      });

      let walletsSynced = 0;
      if (body.monthly_token_limit !== undefined) {
        walletsSynced = await syncWalletsForPlanType(
          planType as 'free' | 'pro' | 'premium' | 'therapist',
          body.monthly_token_limit
        );
      }

      return {
        success: true,
        data: updated,
        message:
          walletsSynced > 0
            ? `Plan updated. Synced token limit to ${walletsSynced} active wallet(s).`
            : 'Plan updated successfully.',
      };
    }
  );

  // Request subscription change (authenticated - for parents to request plan upgrade)
  const requestSubscriptionSchema = z.object({
    plan_type: z.enum(['free', 'pro', 'premium', 'therapist']),
    message: z.string().optional(),
    promotion_code: z.string().optional(),
    points_to_use: z.number().int().nonnegative().optional(),
    payment_method: z.string().optional(), // Payment method selected by customer (e.g., 'gopay', 'credit_card', 'bank_transfer')
  });

  fastify.post(
    '/request',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = requestSubscriptionSchema.parse(request.body);

      // Get plan configuration
      const planConfig = await getPlanConfig(body.plan_type);

      // Validate mutual exclusivity: points and promotion codes cannot be used together
      if (body.promotion_code && body.points_to_use && body.points_to_use > 0) {
        reply.code(400);
        return {
          success: false,
          error: 'Cannot use both promotion code and points. Please choose one discount method.',
        };
      }

      // Validate and apply promotion code if provided
      let promotionCodeId: number | null = null;
      let discountAmount = 0;
      let finalAmount = planConfig.price;
      let pointsDiscount = 0;
      let pointsToDeduct = 0;

      // Validate and apply points if provided
      if (body.points_to_use && body.points_to_use > 0) {
        // Get user's current points
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { points: true },
        });

        if (!currentUser) {
          reply.code(404);
          return {
            success: false,
            error: 'User not found',
          };
        }

        const availablePoints = currentUser.points || 0;
        
        if (body.points_to_use > availablePoints) {
          reply.code(400);
          return {
            success: false,
            error: `You only have ${availablePoints} points available. Cannot use ${body.points_to_use} points.`,
          };
        }

        // Points discount: 1 point = 1 IDR
        pointsToDeduct = body.points_to_use;
      }

      if (body.promotion_code) {
        const promotionCode = await prisma.promotionCode.findUnique({
          where: { code: body.promotion_code.toUpperCase() },
          include: {
            _count: {
              select: {
                usages: true,
              },
            },
          },
        });

        if (promotionCode) {
          const now = new Date();
          const isExpired = now > new Date(promotionCode.end_date);
          const isNotStarted = now < new Date(promotionCode.start_date);
          const isInactive = !promotionCode.is_active;
          const isQuotaExceeded = promotionCode.quota > 0 && promotionCode._count.usages >= promotionCode.quota;

          if (!isExpired && !isNotStarted && !isInactive && !isQuotaExceeded) {
            // Calculate discount
            if (promotionCode.discount_type === 'percentage') {
              discountAmount = Math.floor((planConfig.price * promotionCode.discount_value) / 100);
            } else {
              discountAmount = Math.min(promotionCode.discount_value, planConfig.price);
            }

            finalAmount = Math.max(0, planConfig.price - discountAmount);
            promotionCodeId = promotionCode.id;
          } else {
            reply.code(400);
            let reason = 'Promotion code is invalid';
            if (isExpired) reason = 'Promotion code has expired';
            else if (isNotStarted) reason = 'Promotion code is not yet active';
            else if (isInactive) reason = 'Promotion code is inactive';
            else if (isQuotaExceeded) reason = 'Promotion code quota has been reached';

            return {
              success: false,
              error: reason,
            };
          }
        } else {
          reply.code(404);
          return {
            success: false,
            error: 'Promotion code not found',
          };
        }
      }

      // Apply points discount (only if no promotion code was used)
      if (pointsToDeduct > 0 && !promotionCodeId) {
        pointsDiscount = Math.min(pointsToDeduct, planConfig.price);
        finalAmount = Math.max(0, planConfig.price - pointsDiscount);
      }

      // Calculate payment amount including fee based on selected payment method
      let paymentAmount = finalAmount;
      let adminFee = 0;
      
      if (finalAmount > 0 && body.payment_method) {
        // Calculate exact fee based on customer's selected payment method
        adminFee = calculatePaymentFee(body.payment_method, finalAmount);
        paymentAmount = finalAmount + adminFee;
        
        logger.info({
          paymentMethod: body.payment_method,
          finalAmount,
          calculatedFee: adminFee,
          paymentAmount
        }, 'Calculated payment fee based on selected payment method');
      } else if (finalAmount > 0) {
        // If no payment method specified (shouldn't happen for paid plans), use highest fee as fallback
        adminFee = Math.ceil((finalAmount * 2.9) / 100) + 2000;
        paymentAmount = finalAmount + adminFee;
        logger.warn('No payment method specified, using default highest fee');
      }

      // Generate unique order ID
      const orderId = `SUB-${user.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      // Deduct points from user if they're using points
      if (pointsToDeduct > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            points: {
              decrement: pointsToDeduct,
            },
          },
        });
      }

      // Create subscription request
      const subscriptionRequest = await prisma.subscriptionRequest.create({
        data: {
          user_id: user.id,
          plan_type: body.plan_type,
          amount: finalAmount, // Store final amount after all discounts
          promotion_code_id: promotionCodeId,
          discount_amount: discountAmount + pointsDiscount, // Total discount (promotion + points)
          status: 'pending',
          notes: body.message || null,
        },
      });

      // Track promotion code usage if applied
      if (promotionCodeId) {
        await prisma.promotionCodeUsage.create({
          data: {
            promotion_code_id: promotionCodeId,
            user_id: user.id,
            subscription_request_id: subscriptionRequest.id,
            discount_amount: discountAmount,
          },
        });

        // Update used count
        await prisma.promotionCode.update({
          where: { id: promotionCodeId },
          data: {
            used_count: {
              increment: 1,
            },
          },
        });
      }

      // If plan is free, auto-activate
      if (planConfig.price === 0) {
        const startDate = new Date();
        const endDate = calculateEndDate(startDate, planConfig.weeks);

        // Update or create subscription
        const existingSubscription = await prisma.subscription.findUnique({
          where: { user_id: user.id },
        });

        if (existingSubscription) {
          await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              plan_type: body.plan_type,
              status: 'active',
              start_date: startDate,
              end_date: endDate,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              user_id: user.id,
              plan_type: body.plan_type,
              status: 'active',
              start_date: startDate,
              end_date: endDate,
            },
          });
        }

        // Update request status
        await prisma.subscriptionRequest.update({
          where: { id: subscriptionRequest.id },
          data: {
            status: 'completed',
            completed_at: new Date(),
            payment_method: 'free',
          },
        });

        return {
          success: true,
          message: 'Free subscription activated successfully!',
          data: {
            request_id: subscriptionRequest.id,
            plan_type: body.plan_type,
            activated: true,
          },
        };
      }

      // For paid plans, create payment
      const paymentService = new PaymentService();
      let paymentToken: string | null = null;
      let paymentRedirectUrl: string | null = null;
      let paymentError: string | null = null;

      try {
        // Get user details for payment
        const userDetails = await prisma.user.findUnique({
          where: { id: user.id },
          select: { name: true, email: true, phone_number: true },
        });

        if (!userDetails) {
          reply.code(404);
          return {
            success: false,
            error: 'User not found',
          };
        }

        logger.info({ 
          userId: user.id, 
          orderId, 
          finalAmount,
          adminFee,
          paymentAmount,
          planType: body.plan_type 
        }, 'Creating Midtrans payment');

        const payment = await paymentService.createPayment({
          orderId,
          amount: paymentAmount, // Include admin fee in payment amount
          customerName: userDetails.name,
          customerEmail: userDetails.email,
          customerPhone: userDetails.phone_number || undefined,
          planType: body.plan_type,
          paymentMethod: body.payment_method, // Pass selected payment method
        });

        paymentToken = payment.token;
        paymentRedirectUrl = payment.redirectUrl;

        logger.info({ 
          orderId, 
          hasToken: !!paymentToken,
          hasRedirectUrl: !!paymentRedirectUrl 
        }, 'Payment created successfully');

        // Update request with payment info
        await prisma.subscriptionRequest.update({
          where: { id: subscriptionRequest.id },
          data: {
            midtrans_order_id: orderId,
            midtrans_token: paymentToken,
            status: 'processing',
          },
        });
      } catch (error: any) {
        paymentError = error.message || 'Failed to create payment';
        logger.error({ 
          error: error.message || error,
          stack: error.stack,
          requestId: subscriptionRequest.id,
          orderId,
          amount: finalAmount
        }, 'Failed to create payment');
        
        // For paid plans, payment creation failure should be reported to user
        // Don't silently continue - user needs to know payment failed
        if (finalAmount > 0) {
          reply.code(500);
          return {
            success: false,
            error: `Payment setup failed: ${paymentError}. Please contact support or try again later.`,
            data: {
              request_id: subscriptionRequest.id,
              plan_type: body.plan_type,
              amount: finalAmount,
            },
          };
        }
      }

      // Send notification to admins
      const notificationService = new SubscriptionNotificationService();
      await notificationService.notifyAdminNewRequest(subscriptionRequest.id);

      return {
        success: true,
        message: paymentToken
          ? 'Payment link generated. Please complete the payment to activate your subscription.'
          : 'Subscription request submitted. An administrator will review and activate your subscription.',
        data: {
          request_id: subscriptionRequest.id,
          plan_type: body.plan_type,
          original_amount: planConfig.price,
          discount_amount: discountAmount + pointsDiscount,
          amount: finalAmount,
          admin_fee: adminFee,
          total_amount: paymentAmount,
          payment_token: paymentToken,
          payment_redirect_url: paymentRedirectUrl,
          requires_payment: finalAmount > 0,
          promotion_code_applied: promotionCodeId !== null,
        },
      };
    }
  );

  // Get user's subscription (authenticated)
  fastify.get(
    '/me',
    { preHandler: authenticate },
    async (request, _reply) => {
      const user = (request as AuthenticatedRequest).user!;

      let subscription = await prisma.subscription.findUnique({
        where: { user_id: user.id },
      });

      // Create default 2-week free trial if none exists (legacy users without subscription)
      if (!subscription) {
        subscription = await provisionNewUserTrialSubscription(user.id);
      }

      const { wallet: aiWallet } = await ensureAITokenWallet(user.id);

      const planConfig = await getEffectivePlanConfig(subscription);

      return {
        success: true,
        data: {
          subscription,
          aiWallet,
          planConfig,
        },
      };
    }
  );

  // Get subscription by user ID (admin only)
  fastify.get(
    '/user/:userId',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, _reply) => {
      const { userId } = request.params as { userId: string };
      const id = parseInt(userId);

      const subscription = await prisma.subscription.findUnique({
        where: { user_id: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      const { wallet: aiWallet } = await ensureAITokenWallet(id);

      const planConfig = subscription
        ? await getEffectivePlanConfig(subscription)
        : null;

      return {
        success: true,
        data: {
          subscription,
          aiWallet,
          planConfig,
        },
      };
    }
  );

  // Create subscription (admin only)
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const body = createSubscriptionSchema.parse(request.body);

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: body.user_id },
      });

      if (!user) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Check if subscription already exists
      const existing = await prisma.subscription.findUnique({
        where: { user_id: body.user_id },
      });

      if (existing) {
        reply.code(400);
        return {
          success: false,
          error: 'User already has a subscription',
        };
      }

      const planConfig = await getPlanConfig(body.plan_type);
      const startDate = body.start_date ? new Date(body.start_date) : new Date();
      // End date is now mandatory from frontend, but calculate if not provided (fallback)
      const endDate = body.end_date
        ? new Date(body.end_date)
        : calculateEndDate(startDate, planConfig.weeks);

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          user_id: body.user_id,
          plan_type: body.plan_type,
          status: body.status || 'active',
          start_date: startDate,
          end_date: endDate,
        },
      });

      // Create AI token wallet
      const renewalDate = new Date(endDate);
      const aiWallet = await prisma.aITokenWallet.create({
        data: {
          user_id: body.user_id,
          plan_type: body.plan_type,
          monthly_token_limit: planConfig.monthlyTokenLimit,
          renewal_date: renewalDate,
        },
      });

      // Award referral points if applicable (admin-created subscriptions)
      await awardSubscriptionReferralPoints(body.user_id, body.plan_type);

      return {
        success: true,
        data: {
          subscription,
          aiWallet,
        },
      };
    }
  );

  // Update subscription (admin only)
  fastify.put(
    '/:subscriptionId',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { subscriptionId } = request.params as { subscriptionId: string };
      const id = parseInt(subscriptionId);
      const body = updateSubscriptionSchema.parse(request.body);

      const subscription = await prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        reply.code(404);
        return {
          success: false,
          error: 'Subscription not found',
        };
      }

      const updateData: any = {};
      const oldPlanType = subscription.plan_type;
      if (body.plan_type) {
        updateData.plan_type = body.plan_type;
        const planConfig = await getPlanConfig(body.plan_type);
        
        // Recalculate end_date based on new plan weeks from current date
        const startDate = new Date(); // Always use current date for recalculation
        updateData.end_date = calculateEndDate(startDate, planConfig.weeks);

        // Update AI wallet
        await prisma.aITokenWallet.update({
          where: { user_id: subscription.user_id },
          data: {
            plan_type: body.plan_type,
            monthly_token_limit: planConfig.monthlyTokenLimit,
          },
        });
      }
      if (body.status) updateData.status = body.status;
      // End date is mandatory - always use the provided value (frontend calculates it)
      if (body.end_date !== undefined) {
        updateData.end_date = new Date(body.end_date);
      } else if (body.plan_type) {
        // If plan_type changed but end_date not provided, it was already calculated above
        // This ensures end_date is always set
      }

      const updated = await prisma.subscription.update({
        where: { id },
        data: updateData,
      });

      // Award referral points if upgrading from free to paid plan
      if (body.plan_type && oldPlanType === 'free' && body.plan_type !== 'free') {
        await awardSubscriptionReferralPoints(subscription.user_id, body.plan_type, oldPlanType);
      }

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Update child quota (admin only)
  fastify.post(
    '/quota',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const body = updateQuotaSchema.parse(request.body);

      const child = await prisma.child.findUnique({
        where: { id: body.child_id },
      });

      if (!child) {
        reply.code(404);
        return {
          success: false,
          error: 'Child not found',
        };
      }

      const updated = await prisma.child.update({
        where: { id: body.child_id },
        data: {
          monthly_quota: body.monthly_quota,
        },
      });

      return {
        success: true,
        data: updated,
      };
    }
  );

  // Get all subscriptions (admin only)
  fastify.get(
    '/',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, _reply) => {
      const { status, plan_type } = request.query as {
        status?: string;
        plan_type?: string;
      };

      const where: any = {};
      if (status) where.status = status;
      if (plan_type) where.plan_type = plan_type;

      const subscriptions = await prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return {
        success: true,
        data: subscriptions,
      };
    }
  );

  // Reset monthly quotas (admin only - for manual reset)
  fastify.post(
    '/reset-quotas',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, _reply) => {
      const now = new Date();

      // Reset child session quotas
      await prisma.child.updateMany({
        data: {
          used_sessions: 0,
        },
      });

      // Reset AI token wallets
      const walletsToReset = await prisma.aITokenWallet.findMany({
        where: {
          renewal_date: {
            lte: now,
          },
        },
      });

      for (const wallet of walletsToReset) {
        const planConfig = await getPlanConfig(wallet.plan_type);
        const newRenewalDate = new Date(now);
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);

        await prisma.aITokenWallet.update({
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
        message: 'Quotas reset successfully',
      };
    }
  );

  // Midtrans webhook test endpoint (GET request for easy testing)
  fastify.get('/webhook/midtrans', async (_request, _reply) => {
    return {
      success: true,
      message: 'Midtrans webhook endpoint is accessible',
      method: 'POST',
      endpoint: '/api/subscriptions/webhook/midtrans',
    };
  });

  // Midtrans payment webhook
  fastify.post('/webhook/midtrans', async (request, reply) => {
    try {
      const body = request.body as any;
      
      // Log incoming webhook for debugging
      logger.info({ 
        orderId: body.order_id,
        transactionStatus: body.transaction_status,
        headers: Object.keys(request.headers),
        bodyKeys: Object.keys(body)
      }, 'Midtrans webhook received');

      // Handle test notifications from Midtrans
      // Midtrans sends test notifications that may not have order_id or may not match existing records
      // We should return 200 OK to confirm the endpoint is accessible
      if (!body || !body.order_id) {
        logger.info({ body: body || 'empty' }, 'Midtrans test notification received (no order_id or empty body)');
        return {
          success: true,
          message: 'Webhook endpoint is accessible',
        };
      }

      const orderId = body.order_id;
      const transactionStatus = body.transaction_status;
      const fraudStatus = body.fraud_status;
      const paymentType = body.payment_type || body.payment_method; // Midtrans provides payment_type or payment_method in webhook

      // Find subscription request by order ID
      const subscriptionRequest = await prisma.subscriptionRequest.findFirst({
        where: { midtrans_order_id: orderId },
        include: {
          user: true,
        },
      });

      // If subscription request not found, still return 200 OK
      // This allows Midtrans test notifications to succeed
      // In production, Midtrans will only send webhooks for actual transactions
      if (!subscriptionRequest) {
        logger.warn({ orderId }, 'Subscription request not found for webhook (may be test notification)');
        // Return 200 OK instead of 404 to allow test notifications to pass
        return {
          success: true,
          message: 'Webhook received but subscription request not found',
          orderId: orderId,
        };
      }

      // Calculate actual admin fee based on payment method (if payment type is known)
      let actualPaymentMethod = paymentType || 'midtrans';
      let actualAdminFee = null;
      
      if (paymentType && subscriptionRequest.amount > 0) {
        // Calculate actual fee based on the payment method used
        try {
          actualAdminFee = calculatePaymentFee(paymentType, subscriptionRequest.amount);
          logger.info({
            orderId,
            paymentType,
            amount: subscriptionRequest.amount,
            calculatedFee: actualAdminFee,
          }, 'Calculated actual admin fee based on payment method');
        } catch (error) {
          logger.warn({ error, paymentType }, 'Failed to calculate payment fee, using estimated fee');
        }
      }

      // Handle payment status
      if (transactionStatus === 'capture') {
        if (fraudStatus === 'accept') {
          // Payment successful - activate subscription
          await activateSubscriptionFromRequest(subscriptionRequest.id);
        } else if (fraudStatus === 'challenge') {
          // Payment challenged - mark as processing
          await prisma.subscriptionRequest.update({
            where: { id: subscriptionRequest.id },
            data: {
              status: 'processing',
              payment_reference: body.transaction_id,
              payment_method: actualPaymentMethod,
            },
          });
        }
      } else if (transactionStatus === 'settlement') {
        // Payment settled - activate subscription
        await activateSubscriptionFromRequest(subscriptionRequest.id);
      } else if (transactionStatus === 'pending') {
        // Payment pending - update with payment method info
        await prisma.subscriptionRequest.update({
          where: { id: subscriptionRequest.id },
          data: {
            status: 'processing',
            payment_reference: body.transaction_id,
            payment_method: actualPaymentMethod,
          },
        });
      } else if (
        transactionStatus === 'deny' ||
        transactionStatus === 'expire' ||
        transactionStatus === 'cancel'
      ) {
        // Payment failed
        await prisma.subscriptionRequest.update({
          where: { id: subscriptionRequest.id },
          data: {
            status: 'failed',
            payment_reference: body.transaction_id,
            payment_method: actualPaymentMethod,
          },
        });
      }

      return {
        success: true,
        message: 'Webhook processed',
      };
    } catch (error: any) {
      logger.error({ error }, 'Failed to process Midtrans webhook');
      reply.code(500);
      return {
        success: false,
        error: 'Failed to process webhook',
      };
    }
  });

  // Helper function to award referral points when a referred user subscribes
  async function awardSubscriptionReferralPoints(userId: number, planType: string, oldPlanType?: string) {
    try {
      // Only award points for paid subscriptions (not free)
      if (planType === 'free') {
        return;
      }

      // Get user to check if they were referred
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referred_by_code: true },
      });

      if (!user || !user.referred_by_code) {
        return; // User was not referred
      }

      // Find the referrer
      const referrer = await prisma.user.findUnique({
        where: { referral_code: user.referred_by_code },
      });

      if (!referrer) {
        logger.warn({ userId, referralCode: user.referred_by_code }, 'Referrer not found for subscription referral points');
        return;
      }

      // Check if this is the user's first paid subscription
      let shouldAward = false;
      
      if (oldPlanType !== undefined) {
        // If oldPlanType is provided (e.g., from update), check if upgrading from free
        shouldAward = oldPlanType === 'free';
      } else {
        // Otherwise, check existing subscription in database
        const existingSubscription = await prisma.subscription.findUnique({
          where: { user_id: userId },
        });
        // Only award if this is their first paid subscription
        // (no existing subscription, or existing was free)
        shouldAward = !existingSubscription || existingSubscription.plan_type === 'free';
      }

      if (shouldAward) {
        // Award subscription referral points to the referrer
        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            points: {
              increment: REFERRAL_SUBSCRIPTION_POINTS,
            },
          },
        });
        logger.info(
          { referrerId: referrer.id, userId, planType, oldPlanType, points: REFERRAL_SUBSCRIPTION_POINTS },
          'Awarded referral points for subscription'
        );
      }
    } catch (error: any) {
      logger.error({ error, userId, planType, oldPlanType }, 'Failed to award subscription referral points');
      // Don't throw - this is a bonus feature, shouldn't break subscription flow
    }
  }

  // Helper function to activate subscription from request
  async function activateSubscriptionFromRequest(requestId: number) {
    const request = await prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request || request.status === 'completed') {
      return;
    }

    const planConfig = await getPlanConfig(request.plan_type);
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, planConfig.weeks);

    // Update or create subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { user_id: request.user_id },
    });

    if (existingSubscription) {
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan_type: request.plan_type,
          status: 'active',
          start_date: startDate,
          end_date: endDate,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          user_id: request.user_id,
          plan_type: request.plan_type,
          status: 'active',
          start_date: startDate,
          end_date: endDate,
        },
      });
    }

    // Update AI token wallet
    const existingWallet = await prisma.aITokenWallet.findUnique({
      where: { user_id: request.user_id },
    });

    if (existingWallet) {
      await prisma.aITokenWallet.update({
        where: { id: existingWallet.id },
        data: {
          plan_type: request.plan_type,
          monthly_token_limit: planConfig.monthlyTokenLimit,
        },
      });
    } else {
      const renewalDate = new Date(endDate);
      await prisma.aITokenWallet.create({
        data: {
          user_id: request.user_id,
          plan_type: request.plan_type,
          monthly_token_limit: planConfig.monthlyTokenLimit,
          renewal_date: renewalDate,
        },
      });
    }

    // Mark request as completed
    await prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        completed_at: new Date(),
        payment_method: 'midtrans',
        payment_reference: request.midtrans_order_id || null,
      },
    });

    // Award referral points if applicable
    await awardSubscriptionReferralPoints(request.user_id, request.plan_type);

    // Send success notification to user
    const notificationService = new SubscriptionNotificationService();
    await notificationService.notifyUserPaymentSuccess(requestId);

    logger.info({ requestId, userId: request.user_id }, 'Subscription activated from payment');
  }
}

