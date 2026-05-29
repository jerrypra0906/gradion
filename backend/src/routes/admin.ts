import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { EmailService } from '../services/email.service.js';
import { formatErrorMessage } from '../utils/errorResponse.js';
import { Prisma, SubscriptionPlan } from '@prisma/client';

export async function adminRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  const subscriptionPlanEnum = z.nativeEnum(SubscriptionPlan);

  // -----------------------------
  // ABA Master Program Library (admin only)
  // -----------------------------
  fastify.get(
    '/aba-master-programs',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request) => {
      const q = (request.query || {}) as { lang?: string; search?: string; take?: string; skip?: string };
      const lang = q.lang === 'en' ? 'en' : 'id';
      const search = String(q.search || '').trim();
      const take = Math.max(1, Math.min(500, parseInt(String(q.take || '100'), 10) || 100));
      const skip = Math.max(0, parseInt(String(q.skip || '0'), 10) || 0);

      const where: Prisma.AbaMasterProgramWhereInput = {
        language: lang,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { domain: { contains: search, mode: 'insensitive' } },
                { rationale: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.abaMasterProgram.findMany({
          where,
          orderBy: { updated_at: 'desc' },
          take,
          skip,
        }),
        prisma.abaMasterProgram.count({ where }),
      ]);

      return { success: true, data: { rows, total } };
    }
  );

  // -----------------------------
  // Initial Observation Template CMS (admin only)
  // -----------------------------
  const ioTemplateCreateSchema = z.object({
    key: z.string().min(3).max(120),
    version: z.number().int().min(1).optional(),
    template_json: z.unknown(),
    is_active: z.boolean().optional(),
  });

  const ioTemplateUpdateSchema = ioTemplateCreateSchema.partial();

  fastify.get(
    '/initial-observation-templates',
    { preHandler: [authenticate, requireRole('admin')] },
    async () => {
      const rows = await prisma.initialObservationTemplate.findMany({
        orderBy: [{ is_active: 'desc' }, { updated_at: 'desc' }],
      });
      return { success: true, data: rows };
    }
  );

  fastify.get(
    '/initial-observation-templates/active',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, reply) => {
      const row = await prisma.initialObservationTemplate.findFirst({
        where: { is_active: true },
        orderBy: { updated_at: 'desc' },
      });
      if (!row) {
        reply.code(404);
        return { success: false, error: 'No active template found' };
      }
      return { success: true, data: row };
    }
  );

  fastify.post(
    '/initial-observation-templates',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const body = ioTemplateCreateSchema.parse(request.body);
      try {
        const created = await prisma.initialObservationTemplate.create({
          data: {
            key: body.key.trim(),
            version: body.version ?? 1,
            template_json: body.template_json as any,
            is_active: body.is_active ?? false,
          },
        });

        // If setting active, deactivate others
        if (created.is_active) {
          await prisma.initialObservationTemplate.updateMany({
            where: { id: { not: created.id } },
            data: { is_active: false },
          });
        }

        reply.code(201);
        return { success: true, data: created };
      } catch (e: any) {
        reply.code(400);
        return { success: false, error: formatErrorMessage(e, 'Failed to create template') };
      }
    }
  );

  fastify.put(
    '/initial-observation-templates/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const templateId = parseInt(id, 10);
      if (Number.isNaN(templateId)) {
        reply.code(400);
        return { success: false, error: 'Invalid template id' };
      }
      const body = ioTemplateUpdateSchema.parse(request.body);
      try {
        const updated = await prisma.initialObservationTemplate.update({
          where: { id: templateId },
          data: {
            ...(body.key !== undefined ? { key: body.key.trim() } : {}),
            ...(body.version !== undefined ? { version: body.version } : {}),
            ...(body.template_json !== undefined ? { template_json: body.template_json as any } : {}),
            ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
          },
        });

        if (body.is_active === true) {
          await prisma.initialObservationTemplate.updateMany({
            where: { id: { not: templateId } },
            data: { is_active: false },
          });
        }

        return { success: true, data: updated };
      } catch (e: any) {
        reply.code(400);
        return { success: false, error: formatErrorMessage(e, 'Failed to update template') };
      }
    }
  );

  fastify.delete(
    '/initial-observation-templates/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const templateId = parseInt(id, 10);
      if (Number.isNaN(templateId)) {
        reply.code(400);
        return { success: false, error: 'Invalid template id' };
      }
      await prisma.initialObservationTemplate.delete({ where: { id: templateId } });
      return { success: true };
    }
  );

  // -----------------------------
  // Learning Modules CMS (admin only)
  // -----------------------------
  const learningModuleCreateSchema = z.object({
    key: z.string().min(3).max(120),
    order: z.number().int().min(1),
    is_active: z.boolean().optional(),
    required_plans: z.array(subscriptionPlanEnum).optional(),
    prerequisites: z.array(z.string().min(1).max(120)).optional(),
    youtube_url: z.string().url().optional().nullable(),
    content_json: z.unknown(),
    quiz_json: z.unknown().optional().nullable(),
  });

  const learningModuleUpdateSchema = learningModuleCreateSchema.partial();

  fastify.get(
    '/learning-modules',
    { preHandler: [authenticate, requireRole('admin')] },
    async () => {
      const rows = await prisma.learningModule.findMany({
        orderBy: [{ order: 'asc' }, { updated_at: 'desc' }],
      });
      return { success: true, data: rows };
    }
  );

  fastify.get(
    '/learning-modules/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const moduleId = parseInt(id, 10);
      if (Number.isNaN(moduleId)) {
        reply.code(400);
        return { success: false, error: 'Invalid module id' };
      }
      const row = await prisma.learningModule.findUnique({ where: { id: moduleId } });
      if (!row) {
        reply.code(404);
        return { success: false, error: 'Module not found' };
      }
      return { success: true, data: row };
    }
  );

  fastify.post(
    '/learning-modules',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const body = learningModuleCreateSchema.parse(request.body);
      const created = await prisma.learningModule.create({
        data: {
          key: body.key.trim(),
          order: body.order,
          is_active: body.is_active ?? true,
          required_plans: body.required_plans ?? [],
          prerequisites: body.prerequisites ?? [],
          youtube_url: body.youtube_url ?? null,
          content_json: body.content_json as any,
          quiz_json:
            body.quiz_json === undefined
              ? undefined
              : body.quiz_json === null
              ? Prisma.DbNull
              : (body.quiz_json as any),
        },
      });
      reply.code(201);
      return { success: true, data: created };
    }
  );

  fastify.put(
    '/learning-modules/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const moduleId = parseInt(id, 10);
      if (Number.isNaN(moduleId)) {
        reply.code(400);
        return { success: false, error: 'Invalid module id' };
      }
      const body = learningModuleUpdateSchema.parse(request.body);
      const updated = await prisma.learningModule.update({
        where: { id: moduleId },
        data: {
          ...(body.key !== undefined ? { key: body.key.trim() } : {}),
          ...(body.order !== undefined ? { order: body.order } : {}),
          ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
          ...(body.required_plans !== undefined ? { required_plans: body.required_plans } : {}),
          ...(body.prerequisites !== undefined ? { prerequisites: body.prerequisites } : {}),
          ...(body.youtube_url !== undefined ? { youtube_url: body.youtube_url ?? null } : {}),
          ...(body.content_json !== undefined ? { content_json: body.content_json as any } : {}),
          ...(body.quiz_json !== undefined
            ? {
                quiz_json:
                  body.quiz_json === null ? Prisma.DbNull : (body.quiz_json as any),
              }
            : {}),
        },
      });
      return { success: true, data: updated };
    }
  );

  fastify.delete(
    '/learning-modules/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const moduleId = parseInt(id, 10);
      if (Number.isNaN(moduleId)) {
        reply.code(400);
        return { success: false, error: 'Invalid module id' };
      }
      await prisma.learningModule.delete({ where: { id: moduleId } });
      return { success: true };
    }
  );

  // Get dashboard analytics (admin only)
  fastify.get(
    '/analytics',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, _reply) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Total counts
      const [
        totalUsers,
        totalChildren,
        totalSessions,
        totalLogs,
        totalSubscriptions,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.child.count(),
        prisma.session.count(),
        prisma.parentLog.count(),
        prisma.subscription.count(),
      ]);

      // Active users (DAU/MAU)
      const dailyActiveUsers = await prisma.user.count({
        where: {
          sessions: {
            some: {
              date: {
                gte: today,
              },
            },
          },
        },
      });

      const monthlyActiveUsers = await prisma.user.count({
        where: {
          OR: [
            {
              sessions: {
                some: {
                  date: {
                    gte: thisMonth,
                  },
                },
              },
            },
            {
              parentLogs: {
                some: {
                  created_at: {
                    gte: thisMonth,
                  },
                },
              },
            },
          ],
        },
      });

      // Log submissions per day (last 30 days)
      const logSubmissions = await prisma.parentLog.groupBy({
        by: ['created_at'],
        where: {
          created_at: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          id: true,
        },
      });

      // Subscription breakdown
      const subscriptionBreakdown = await prisma.subscription.groupBy({
        by: ['plan_type', 'status'],
        _count: {
          id: true,
        },
      });

      // Subscription funnel
      const trialSubscriptions = await prisma.subscription.count({
        where: {
          status: 'trial',
        },
      });

      const activePaidSubscriptions = await prisma.subscription.count({
        where: {
          status: 'active',
          plan_type: {
            in: ['pro', 'premium'],
          },
        },
      });

      // AI token usage
      const aiTokenStats = await prisma.aITokenWallet.aggregate({
        _sum: {
          current_token_usage: true,
          monthly_token_limit: true,
        },
        _avg: {
          current_token_usage: true,
        },
      });

      const totalTokensUsed = aiTokenStats._sum.current_token_usage || 0;
      const avgTokensPerUser = aiTokenStats._avg.current_token_usage || 0;
      const totalTokenLimit = aiTokenStats._sum.monthly_token_limit || 0;

      // Users near quota (AI tokens) - using raw query for percentage calculation
      const allWallets = await prisma.aITokenWallet.findMany({
        where: {
          monthly_token_limit: {
            gt: 0,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const usersNearQuota = allWallets
        .filter(
          (wallet) =>
            wallet.current_token_usage >= wallet.monthly_token_limit * 0.8
        )
        .slice(0, 10)
        .sort((a, b) => b.current_token_usage - a.current_token_usage);

      // Top AI users
      const topAIUsers = await prisma.aITokenWallet.findMany({
        where: {
          current_token_usage: {
            gt: 0,
          },
        },
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
          current_token_usage: 'desc',
        },
        take: 10,
      });

      // Recent activity (last 7 days)
      const recentLogs = await prisma.parentLog.count({
        where: {
          created_at: {
            gte: thisWeek,
          },
        },
      });

      const recentSessions = await prisma.session.count({
        where: {
          date: {
            gte: thisWeek,
          },
        },
      });

      // Monthly growth
      const usersThisMonth = await prisma.user.count({
        where: {
          created_at: {
            gte: thisMonth,
          },
        },
      });

      const usersLastMonth = await prisma.user.count({
        where: {
          created_at: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      });

      const logsThisMonth = await prisma.parentLog.count({
        where: {
          created_at: {
            gte: thisMonth,
          },
        },
      });

      const logsLastMonth = await prisma.parentLog.count({
        where: {
          created_at: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      });

      // Estimated AI cost (rough estimate: $0.002 per 1K tokens)
      const estimatedAICost = (totalTokensUsed / 1000) * 0.002;

      return {
        success: true,
        data: {
          overview: {
            total_users: totalUsers,
            total_children: totalChildren,
            total_sessions: totalSessions,
            total_logs: totalLogs,
            total_subscriptions: totalSubscriptions,
            daily_active_users: dailyActiveUsers,
            monthly_active_users: monthlyActiveUsers,
          },
          activity: {
            recent_logs: recentLogs,
            recent_sessions: recentSessions,
            log_submissions: logSubmissions.map((item) => ({
              date: item.created_at.toISOString().split('T')[0],
              count: item._count.id,
            })),
          },
          subscriptions: {
            breakdown: subscriptionBreakdown.map((item) => ({
              plan_type: item.plan_type,
              status: item.status,
              count: item._count.id,
            })),
            funnel: {
              trial: trialSubscriptions,
              active_paid: activePaidSubscriptions,
              conversion_rate:
                trialSubscriptions > 0
                  ? (activePaidSubscriptions / trialSubscriptions) * 100
                  : 0,
            },
          },
          ai_usage: {
            total_tokens_used: totalTokensUsed,
            total_token_limit: totalTokenLimit,
            avg_tokens_per_user: Math.round(avgTokensPerUser),
            estimated_cost_usd: estimatedAICost.toFixed(2),
            users_near_quota: usersNearQuota.map((wallet) => ({
              user: wallet.user,
              current_usage: wallet.current_token_usage,
              monthly_limit: wallet.monthly_token_limit,
              usage_percentage: Math.round(
                (wallet.current_token_usage / wallet.monthly_token_limit) *
                  100
              ),
            })),
            top_users: topAIUsers.map((wallet) => ({
              user: wallet.user,
              tokens_used: wallet.current_token_usage,
              monthly_limit: wallet.monthly_token_limit,
            })),
          },
          growth: {
            users: {
              this_month: usersThisMonth,
              last_month: usersLastMonth,
              growth_percentage:
                usersLastMonth > 0
                  ? ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100
                  : 0,
            },
            logs: {
              this_month: logsThisMonth,
              last_month: logsLastMonth,
              growth_percentage:
                logsLastMonth > 0
                  ? ((logsThisMonth - logsLastMonth) / logsLastMonth) * 100
                  : 0,
            },
          },
        },
      };
    }
  );

  // Get all users with subscription info (admin only)
  fastify.get(
    '/users',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, _reply) => {
      const { role, search, page = '1', limit = '50' } = request.query as {
        role?: string;
        search?: string;
        page?: string;
        limit?: string;
      };

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (role) where.role = role;
      if (search) {
        // Check if search is a number (user ID)
        const searchNum = parseInt(search);
        if (!isNaN(searchNum)) {
          where.id = searchNum;
        } else {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            subscription: true,
            aiTokenWallet: true,
            _count: {
              select: {
                children: true,
                parentLogs: true,
                sessions: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: {
            created_at: 'desc',
          },
        }),
        prisma.user.count({ where }),
      ]);

      // For search by ID, filter the results
      let filteredUsers = users;
      if (search && !isNaN(parseInt(search))) {
        const searchId = parseInt(search);
        filteredUsers = users.filter((u) => u.id === searchId);
      }

      return {
        success: true,
        data: filteredUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredUsers.length === 1 && search ? 1 : total,
          total_pages: Math.ceil((filteredUsers.length === 1 && search ? 1 : total) / limitNum),
        },
      };
    }
  );

  // Send manual email to registered users (admin only)
  const sendEmailSchema = z.object({
    to: z.union([
      z.string().email(), // Single email
      z.array(z.string().email()), // Array of emails
      z.enum(['all', 'parents', 'therapists', 'admins']), // Send to all users of a role
    ]),
    subject: z.string().min(1),
    html: z.string().min(1),
    user_ids: z.array(z.number()).optional(), // Optional: specific user IDs
  });

  fastify.post(
    '/send-email',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const body = sendEmailSchema.parse(request.body);

        const emailService = new EmailService();
        let recipients: string[] = [];

        // Determine recipients based on 'to' field
        if (typeof body.to === 'string') {
          if (body.to === 'all') {
            const allUsers = await prisma.user.findMany({
              where: { is_email_verified: true },
              select: { email: true },
            });
            recipients = allUsers.map((u) => u.email);
          } else if (['parents', 'therapists', 'admins'].includes(body.to)) {
            const role = body.to.slice(0, -1) as 'parent' | 'therapist' | 'admin'; // Remove 's'
            const users = await prisma.user.findMany({
              where: {
                role,
                is_email_verified: true,
              },
              select: { email: true },
            });
            recipients = users.map((u) => u.email);
          } else {
            // Single email address
            recipients = [body.to];
          }
        } else if (Array.isArray(body.to)) {
          // Array of email addresses
          recipients = body.to;
        }

        // If user_ids provided, filter to only those users
        if (body.user_ids && body.user_ids.length > 0) {
          const specificUsers = await prisma.user.findMany({
            where: {
              id: { in: body.user_ids },
              is_email_verified: true,
            },
            select: { email: true },
          });
          recipients = specificUsers.map((u) => u.email);
        }

        if (recipients.length === 0) {
          reply.code(400);
          return {
            success: false,
            error: 'No valid recipients found',
          };
        }

        // Send email to all recipients
        const results = await Promise.allSettled(
          recipients.map((email) =>
            emailService.sendEmail({
              to: email,
              subject: body.subject,
              html: body.html,
            })
          )
        );

        const successful = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        return {
          success: true,
          message: `Email sent to ${successful} recipient(s)${failed > 0 ? `, ${failed} failed` : ''}`,
          data: {
            total_recipients: recipients.length,
            successful,
            failed,
            recipients: recipients.slice(0, 10), // Show first 10 for preview
          },
        };
      } catch (error: any) {
        reply.code(400);
        return {
          success: false,
          error: formatErrorMessage(error, 'Failed to send email'),
        };
      }
    }
  );
}

