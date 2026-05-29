import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { formatErrorMessage, sendError } from '../utils/errorResponse.js';

const createPromotionCodeSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/i, 'Code must contain only letters, numbers, hyphens, and underscores'),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().int().positive(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  quota: z.number().int().nonnegative().default(0), // 0 = unlimited
  is_active: z.boolean().default(true),
});

const updatePromotionCodeSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/i).optional(),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().int().positive().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  quota: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

const validatePromotionCodeSchema = z.object({
  code: z.string().min(1),
  plan_type: z.enum(['free', 'pro', 'premium', 'therapist']),
  amount: z.number().int().nonnegative(), // Original amount before discount
});

export async function promotionCodesRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Get all promotion codes (admin only)
  fastify.get(
    '/',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const { is_active, code } = request.query as {
          is_active?: string;
          code?: string;
        };

        const where: any = {};
        if (is_active !== undefined) {
          where.is_active = is_active === 'true';
        }
        if (code) {
          where.code = { contains: code, mode: 'insensitive' };
        }

        const promotionCodes = await prisma.promotionCode.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                usages: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        });

        // Calculate remaining quota
        const codesWithStats = promotionCodes.map((code) => ({
          ...code,
          used_count: code._count.usages,
          remaining_quota: code.quota === 0 ? null : Math.max(0, code.quota - code._count.usages),
          is_expired: new Date() > new Date(code.end_date),
          is_valid: new Date() >= new Date(code.start_date) && new Date() <= new Date(code.end_date) && code.is_active,
        }));

        return {
          success: true,
          data: codesWithStats,
        };
      } catch (error: any) {
        return sendError(reply, 500, error, 'Failed to fetch promotion codes');
      }
    }
  );

  // Get promotion code by ID (admin only)
  fastify.get(
    '/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const promotionCodeId = parseInt(id);

        const promotionCode = await prisma.promotionCode.findUnique({
          where: { id: promotionCodeId },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            usages: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                used_at: 'desc',
              },
            },
            _count: {
              select: {
                usages: true,
              },
            },
          },
        });

        if (!promotionCode) {
          reply.code(404);
          return {
            success: false,
            error: 'Promotion code not found',
          };
        }

        const stats = {
          used_count: promotionCode._count.usages,
          remaining_quota: promotionCode.quota === 0 ? null : Math.max(0, promotionCode.quota - promotionCode._count.usages),
          is_expired: new Date() > new Date(promotionCode.end_date),
          is_valid: new Date() >= new Date(promotionCode.start_date) && new Date() <= new Date(promotionCode.end_date) && promotionCode.is_active,
        };

        return {
          success: true,
          data: {
            ...promotionCode,
            ...stats,
          },
        };
      } catch (error: any) {
        return sendError(reply, 500, error, 'Failed to fetch promotion code');
      }
    }
  );

  // Create promotion code (admin only)
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const body = createPromotionCodeSchema.parse(request.body);

        // Validate discount value
        if (body.discount_type === 'percentage' && body.discount_value > 100) {
          reply.code(400);
          return {
            success: false,
            error: 'Percentage discount cannot exceed 100%',
          };
        }

        // Validate dates
        const startDate = new Date(body.start_date);
        const endDate = new Date(body.end_date);
        if (endDate <= startDate) {
          reply.code(400);
          return {
            success: false,
            error: 'End date must be after start date',
          };
        }

        // Check if code already exists
        const existing = await prisma.promotionCode.findUnique({
          where: { code: body.code.toUpperCase() },
        });

        if (existing) {
          reply.code(400);
          return {
            success: false,
            error: 'Promotion code already exists',
          };
        }

        const promotionCode = await prisma.promotionCode.create({
          data: {
            code: body.code.toUpperCase(),
            description: body.description,
            discount_type: body.discount_type,
            discount_value: body.discount_value,
            start_date: startDate,
            end_date: endDate,
            quota: body.quota,
            is_active: body.is_active,
            created_by: user.id,
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return {
          success: true,
          data: promotionCode,
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.code(400);
          return {
            success: false,
            error: formatErrorMessage(error, 'Invalid request data'),
          };
        }
        return sendError(reply, 500, error, 'Failed to create promotion code');
      }
    }
  );

  // Update promotion code (admin only)
  fastify.put(
    '/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const promotionCodeId = parseInt(id);
        const body = updatePromotionCodeSchema.parse(request.body);

        const existing = await prisma.promotionCode.findUnique({
          where: { id: promotionCodeId },
        });

        if (!existing) {
          reply.code(404);
          return {
            success: false,
            error: 'Promotion code not found',
          };
        }

        // Validate discount value if provided
        if (body.discount_type === 'percentage' && body.discount_value && body.discount_value > 100) {
          reply.code(400);
          return {
            success: false,
            error: 'Percentage discount cannot exceed 100%',
          };
        }

        // Validate dates if provided
        const startDate = body.start_date ? new Date(body.start_date) : existing.start_date;
        const endDate = body.end_date ? new Date(body.end_date) : existing.end_date;
        if (endDate <= startDate) {
          reply.code(400);
          return {
            success: false,
            error: 'End date must be after start date',
          };
        }

        // Check if code already exists (if changing code)
        if (body.code && body.code.toUpperCase() !== existing.code) {
          const codeExists = await prisma.promotionCode.findUnique({
            where: { code: body.code.toUpperCase() },
          });

          if (codeExists) {
            reply.code(400);
            return {
              success: false,
              error: 'Promotion code already exists',
            };
          }
        }

        const updateData: any = {};
        if (body.code !== undefined) updateData.code = body.code.toUpperCase();
        if (body.description !== undefined) updateData.description = body.description;
        if (body.discount_type !== undefined) updateData.discount_type = body.discount_type;
        if (body.discount_value !== undefined) updateData.discount_value = body.discount_value;
        if (body.start_date !== undefined) updateData.start_date = startDate;
        if (body.end_date !== undefined) updateData.end_date = endDate;
        if (body.quota !== undefined) updateData.quota = body.quota;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;

        const updated = await prisma.promotionCode.update({
          where: { id: promotionCodeId },
          data: updateData,
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return {
          success: true,
          data: updated,
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.code(400);
          return {
            success: false,
            error: formatErrorMessage(error, 'Invalid request data'),
          };
        }
        return sendError(reply, 500, error, 'Failed to update promotion code');
      }
    }
  );

  // Delete promotion code (admin only)
  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const promotionCodeId = parseInt(id);

        const existing = await prisma.promotionCode.findUnique({
          where: { id: promotionCodeId },
        });

        if (!existing) {
          reply.code(404);
          return {
            success: false,
            error: 'Promotion code not found',
          };
        }

        await prisma.promotionCode.delete({
          where: { id: promotionCodeId },
        });

        return {
          success: true,
          message: 'Promotion code deleted successfully',
        };
      } catch (error: any) {
        return sendError(reply, 500, error, 'Failed to delete promotion code');
      }
    }
  );

  // Validate promotion code (public - for frontend to check before submitting)
  fastify.post(
    '/validate',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const body = validatePromotionCodeSchema.parse(request.body);

        const promotionCode = await prisma.promotionCode.findUnique({
          where: { code: body.code.toUpperCase() },
          include: {
            _count: {
              select: {
                usages: true,
              },
            },
          },
        });

        if (!promotionCode) {
          reply.code(404);
          return {
            success: false,
            error: 'Promotion code not found',
            valid: false,
          };
        }

        const now = new Date();
        const isExpired = now > new Date(promotionCode.end_date);
        const isNotStarted = now < new Date(promotionCode.start_date);
        const isInactive = !promotionCode.is_active;
        const isQuotaExceeded = promotionCode.quota > 0 && promotionCode._count.usages >= promotionCode.quota;

        if (isExpired || isNotStarted || isInactive || isQuotaExceeded) {
          let reason = '';
          if (isExpired) reason = 'Promotion code has expired';
          else if (isNotStarted) reason = 'Promotion code is not yet active';
          else if (isInactive) reason = 'Promotion code is inactive';
          else if (isQuotaExceeded) reason = 'Promotion code quota has been reached';

          reply.code(400);
          return {
            success: false,
            error: reason,
            valid: false,
          };
        }

        // Calculate discount
        let discountAmount = 0;
        if (promotionCode.discount_type === 'percentage') {
          discountAmount = Math.floor((body.amount * promotionCode.discount_value) / 100);
        } else {
          discountAmount = Math.min(promotionCode.discount_value, body.amount); // Don't exceed original amount
        }

        const finalAmount = Math.max(0, body.amount - discountAmount);

        return {
          success: true,
          valid: true,
          data: {
            code: promotionCode.code,
            description: promotionCode.description,
            discount_type: promotionCode.discount_type,
            discount_value: promotionCode.discount_value,
            original_amount: body.amount,
            discount_amount: discountAmount,
            final_amount: finalAmount,
          },
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.code(400);
          return {
            success: false,
            error: formatErrorMessage(error, 'Invalid request data'),
            valid: false,
          };
        }
        return sendError(reply, 500, error, 'Failed to validate promotion code');
      }
    }
  );
}

