import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { BannerAudience, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { formatErrorMessage } from '../utils/errorResponse.js';

const bannerAudienceEnum = z.nativeEnum(BannerAudience);

const bannerCreateSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(3),
  image_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  target_audience: bannerAudienceEnum.default('all'),
  is_active: z.boolean().default(true),
  start_date: z.string().datetime().nullable().optional(),
  end_date: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).default(0),
});

const bannerUpdateSchema = bannerCreateSchema.partial();

const adminListQuerySchema = z.object({
  audience: bannerAudienceEnum.optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

const publicListQuerySchema = z.object({
  audience: bannerAudienceEnum.optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional(),
});

const adminGetParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number(value)),
});

function parseDate(value?: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function validateDateRange(start: Date | null, end: Date | null) {
  if (start && end && start >= end) {
    throw new Error('Start date must be before end date');
  }
}

function getActiveBannerWhereClause(audience?: BannerAudience) {
  const now = new Date();
  const conditions: Prisma.BannerWhereInput = {
    is_active: true,
    AND: [
      {
        OR: [{ start_date: null }, { start_date: { lte: now } }],
      },
      {
        OR: [{ end_date: null }, { end_date: { gt: now } }],
      },
    ],
  };

  if (audience && audience !== 'all') {
    conditions.OR = [
      { target_audience: 'all' },
      { target_audience: audience },
    ];
  }

  return conditions;
}

export async function bannersRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Admin list
  fastify.get(
    '/admin',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request) => {
      const query = adminListQuerySchema.parse(request.query);
      const where: Prisma.BannerWhereInput = {};

      if (query.audience) {
        where.target_audience = query.audience;
      }
      if (query.active !== undefined) {
        where.is_active = query.active;
      }

      const banners = await prisma.banner.findMany({
        where,
        orderBy: [
          { is_active: 'desc' },
          { priority: 'desc' },
          { start_date: 'desc' },
        ],
      });

      return { success: true, data: banners };
    }
  );

  // Admin get single
  fastify.get(
    '/admin/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = adminGetParamsSchema.parse(request.params);
      const banner = await prisma.banner.findUnique({ where: { id } });

      if (!banner) {
        reply.code(404);
        return { success: false, error: 'Banner not found' };
      }

      return { success: true, data: banner };
    }
  );

  // Public list
  fastify.get('/', async (request) => {
    const query = publicListQuerySchema.parse(request.query);
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 20) : 10;

    const banners = await prisma.banner.findMany({
      where: getActiveBannerWhereClause(query.audience),
      orderBy: [
        { priority: 'desc' },
        { start_date: 'desc' },
        { created_at: 'desc' },
      ],
      take: limit,
    });

    return { success: true, data: banners };
  });

  // Create banner (admin)
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const body = bannerCreateSchema.parse(request.body);
      const startDate = parseDate(body.start_date);
      const endDate = parseDate(body.end_date);

      try {
        validateDateRange(startDate, endDate);

        const banner = await prisma.banner.create({
          data: {
            title: body.title,
            content: body.content,
            image_url: body.image_url || null,
            target_audience: body.target_audience,
            is_active: body.is_active,
            start_date: startDate,
            end_date: endDate,
            priority: body.priority ?? 0,
          },
        });

        return { success: true, data: banner };
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to create banner');
        reply.code(400);
        return {
          success: false,
          error: formatErrorMessage(error, 'Failed to create banner'),
        };
      }
    }
  );

  // Update banner (admin)
  fastify.put(
    '/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = adminGetParamsSchema.parse(request.params);
      const body = bannerUpdateSchema.parse(request.body);

      const startDate =
        body.start_date !== undefined
          ? body.start_date === null
            ? null
            : parseDate(body.start_date)
          : undefined;
      const endDate =
        body.end_date !== undefined
          ? body.end_date === null
            ? null
            : parseDate(body.end_date)
          : undefined;

      try {
        validateDateRange(
          startDate ?? null,
          endDate ?? null
        );

        const banner = await prisma.banner.update({
          where: { id },
          data: {
            title: body.title,
            content: body.content,
            image_url: body.image_url === undefined ? undefined : body.image_url || null,
            target_audience: body.target_audience,
            is_active: body.is_active,
            start_date: startDate,
            end_date: endDate,
            priority: body.priority,
          },
        });

        return { success: true, data: banner };
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          reply.code(404);
          return { success: false, error: 'Banner not found' };
        }
        fastify.log.error({ error }, 'Failed to update banner');
        reply.code(400);
        return {
          success: false,
          error: formatErrorMessage(error, 'Failed to update banner'),
        };
      }
    }
  );

  // Delete banner (admin)
  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = adminGetParamsSchema.parse(request.params);

      try {
        await prisma.banner.delete({ where: { id } });
        return { success: true, message: 'Banner deleted' };
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          reply.code(404);
          return { success: false, error: 'Banner not found' };
        }
        fastify.log.error({ error }, 'Failed to delete banner');
        reply.code(500);
        return { success: false, error: 'Failed to delete banner' };
      }
    }
  );
}

