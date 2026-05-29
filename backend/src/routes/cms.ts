import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { CMSStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const cmsStatusEnum = z.nativeEnum(CMSStatus);

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const cmsCreateSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(1).optional(),
  content_html: z.string().min(1),
  status: cmsStatusEnum.default('draft'),
  publish_at: z.string().datetime().nullable().optional(),
  unpublish_at: z.string().datetime().nullable().optional(),
  banner_id: z.number().int().positive().nullable().optional(),
});

const cmsUpdateSchema = cmsCreateSchema.partial().extend({
  status: cmsStatusEnum.optional(),
  publish_at: z.string().datetime().nullable().optional(),
  unpublish_at: z.string().datetime().nullable().optional(),
  banner_id: z.number().int().positive().nullable().optional(),
});

const adminListQuerySchema = z.object({
  status: cmsStatusEnum.optional(),
  search: z.string().optional(),
});

const publicListQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional(),
});

function parseDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function validateSchedule(publishAt: Date | null, unpublishAt: Date | null) {
  if (publishAt && unpublishAt && publishAt >= unpublishAt) {
    throw new Error('Publish date must be before unpublish date');
  }
}

function getPublishedWhereClause() {
  const now = new Date();
  return {
    status: 'published' as CMSStatus,
    AND: [
      {
        OR: [{ publish_at: null }, { publish_at: { lte: now } }],
      },
      {
        OR: [{ unpublish_at: null }, { unpublish_at: { gt: now } }],
      },
    ],
  };
}

export async function cmsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Admin list (all statuses)
  fastify.get(
    '/admin',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request) => {
      const query = adminListQuerySchema.parse(request.query);

      const where: Prisma.CMSContentWhereInput = {};
      if (query.status) {
        where.status = query.status;
      }
      if (query.search) {
        where.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const contents = await prisma.cMSContent.findMany({
        where,
        orderBy: [
          { status: 'asc' },
          { publish_at: 'desc' },
          { created_at: 'desc' },
        ],
      });

      return {
        success: true,
        data: contents,
      };
    }
  );

  // Admin get single by ID
  fastify.get(
    '/admin/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const contentId = parseInt(id, 10);

      const content = await prisma.cMSContent.findUnique({
        where: { id: contentId },
      });

      if (!content) {
        reply.code(404);
        return { success: false, error: 'Content not found' };
      }

      return { success: true, data: content };
    }
  );

  // Public list
  fastify.get('/', async (request) => {
    const query = publicListQuerySchema.parse(request.query);
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 50) : 20;

    const contents = await prisma.cMSContent.findMany({
      where: getPublishedWhereClause(),
      orderBy: [
        { publish_at: 'desc' },
        { created_at: 'desc' },
      ],
      take: limit,
    });

    return {
      success: true,
      data: contents,
    };
  });

  // Public get by slug
  fastify.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const content = await prisma.cMSContent.findFirst({
      where: {
        slug,
        ...getPublishedWhereClause(),
      },
    });

    if (!content) {
      reply.code(404);
      return { success: false, error: 'Content not found' };
    }

    return {
      success: true,
      data: content,
    };
  });

  // Create content (admin)
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = cmsCreateSchema.parse(request.body);
      const publishAt = parseDate(body.publish_at);
      const unpublishAt = parseDate(body.unpublish_at);

      validateSchedule(publishAt, unpublishAt);

      try {
        // Generate slug from title if not provided, otherwise sanitize the provided slug
        const finalSlug = body.slug
          ? sanitizeSlug(body.slug)
          : generateSlug(body.title);

        if (!finalSlug || finalSlug.length < 3) {
          reply.code(400);
          return {
            success: false,
            error: 'Slug must be at least 3 characters long',
          };
        }

        const content = await prisma.cMSContent.create({
          data: {
            title: body.title.trim(),
            slug: finalSlug,
            content_html: body.content_html,
            status: body.status,
            publish_at: publishAt,
            unpublish_at: unpublishAt,
            banner_id: body.banner_id ?? null,
          },
        });

        fastify.log.info(
          { contentId: content.id, userId: user.id },
          'CMS content created'
        );

        return {
          success: true,
          data: content,
        };
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          reply.code(409);
          return {
            success: false,
            error: 'Slug already exists',
          };
        }
        fastify.log.error({ error }, 'Failed to create CMS content');
        reply.code(500);
        return {
          success: false,
          error: 'Failed to create content',
        };
      }
    }
  );

  // Update content (admin)
  fastify.put(
    '/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const contentId = parseInt(id, 10);
      const body = cmsUpdateSchema.parse(request.body);
      const publishAt = parseDate(body.publish_at);
      const unpublishAt = parseDate(body.unpublish_at);

      validateSchedule(publishAt, unpublishAt);

      try {
        const updateData: any = {};

        // Only update fields that are provided
        if (body.content_html !== undefined) {
          updateData.content_html = body.content_html;
        }
        if (body.status !== undefined) {
          updateData.status = body.status;
        }
        if (body.publish_at !== undefined) {
          updateData.publish_at = publishAt;
        }
        if (body.unpublish_at !== undefined) {
          updateData.unpublish_at = unpublishAt;
        }
        if (body.banner_id !== undefined) {
          updateData.banner_id = body.banner_id ?? null;
        }

        if (body.title) {
          updateData.title = body.title.trim();
        }

        if (body.slug) {
          const sanitizedSlug = sanitizeSlug(body.slug);
          if (!sanitizedSlug || sanitizedSlug.length < 3) {
            reply.code(400);
            return {
              success: false,
              error: 'Slug must be at least 3 characters long',
            };
          }
          updateData.slug = sanitizedSlug;
        }

        const content = await prisma.cMSContent.update({
          where: { id: contentId },
          data: updateData,
        });

        return {
          success: true,
          data: content,
        };
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            reply.code(409);
            return {
              success: false,
              error: 'Slug already exists',
            };
          }
          if (error.code === 'P2025') {
            reply.code(404);
            return {
              success: false,
              error: 'Content not found',
            };
          }
        }
        fastify.log.error({ error }, 'Failed to update CMS content');
        reply.code(500);
        return {
          success: false,
          error: 'Failed to update content',
        };
      }
    }
  );

  // Delete content (admin)
  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const contentId = parseInt(id, 10);

      try {
        await prisma.cMSContent.delete({
          where: { id: contentId },
        });

        return {
          success: true,
          message: 'Content deleted',
        };
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          reply.code(404);
          return {
            success: false,
            error: 'Content not found',
          };
        }
        fastify.log.error({ error }, 'Failed to delete CMS content');
        reply.code(500);
        return {
          success: false,
          error: 'Failed to delete content',
        };
      }
    }
  );
}

