import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { EmailService } from '../services/email.service.js';
import { formatErrorMessage, getUserFacingError } from '../utils/errorResponse.js';
import { Prisma, SubscriptionPlan } from '@prisma/client';
import { listAutismCases, seedMockAutismCases } from '../services/abaAutismCase.service.js';
import {
  findMissingMasterIds,
  mergeMasterPrograms,
  setMasterProgramArchived,
  syncWeeklyPlanToMasterPrograms,
  translateMasterProgram,
  updateMasterProgram,
} from '../services/abaMasterProgram.service.js';
import { healWeekPlans } from './abaProgram.js';
import { UserService } from '../services/user.service.js';
import { Role } from '../types/index.js';

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
      const q = (request.query || {}) as {
        lang?: string;
        search?: string;
        take?: string;
        skip?: string;
        status?: string;
      };
      const lang = q.lang === 'en' ? 'en' : 'id';
      const search = String(q.search || '').trim();
      const take = Math.max(1, Math.min(500, parseInt(String(q.take || '100'), 10) || 100));
      const skip = Math.max(0, parseInt(String(q.skip || '0'), 10) || 0);
      const status =
        q.status === 'curated' || q.status === 'archived' || q.status === 'all'
          ? q.status
          : 'active';

      const statusWhere: Prisma.AbaMasterProgramWhereInput =
        status === 'curated'
          ? { is_curated: true, is_archived: false, merged_into_id: null }
          : status === 'archived'
            ? { is_archived: true }
            : status === 'all'
              ? {}
              : { is_archived: false, merged_into_id: null };

      const where: Prisma.AbaMasterProgramWhereInput = {
        language: lang,
        ...statusWhere,
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
          orderBy: [{ is_curated: 'desc' }, { usage_count: 'desc' }, { updated_at: 'desc' }],
          take,
          skip,
        }),
        prisma.abaMasterProgram.count({ where }),
      ]);

      return { success: true, data: { rows, total } };
    }
  );

  // Edit a master program (marks it curated and logs before/after for AI learning).
  fastify.patch(
    '/aba-master-programs/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const user = (request as any).user!;
      const id = String((request.params as any).id || '');

      const bodySchema = z.object({
        name: z.string().trim().min(1).max(200).optional(),
        domain: z.string().trim().max(120).nullable().optional(),
        rationale: z.string().trim().max(1000).nullable().optional(),
        targets: z.array(z.string().trim().max(300)).max(20).optional(),
        recommended_trials_per_day: z.number().int().min(1).max(100).nullable().optional(),
        materials: z.array(z.string().trim().max(300)).max(20).optional(),
        demo_video_url: z.string().trim().url().max(500).nullable().or(z.literal('').transform(() => null)).optional(),
        steps: z.array(z.string().trim().max(300)).max(20).optional(),
        prompts: z.array(z.string().trim().max(300)).max(20).optional(),
        mastery_criteria: z.string().trim().max(500).nullable().optional(),
      });
      const parsed = bodySchema.safeParse(request.body || {});
      if (!parsed.success) {
        reply.code(400);
        return { success: false, error: formatErrorMessage(parsed.error, 'Invalid input') };
      }

      const result = await updateMasterProgram({ id, editorId: user.id, patch: parsed.data });
      if (!result.ok) {
        reply.code(result.code || 400);
        return { success: false, error: result.error, conflict_id: result.conflictId };
      }
      return { success: true, data: { row: result.row } };
    }
  );

  // Archive / restore a master program (archived programs are hidden from AI generation).
  fastify.post(
    '/aba-master-programs/:id/archive',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const id = String((request.params as any).id || '');
      const body = (request.body || {}) as { archived?: boolean };
      const archived = body.archived !== false;

      const result = await setMasterProgramArchived({ id, archived });
      if (!result.ok) {
        reply.code(result.code || 400);
        return { success: false, error: result.error, conflict_id: result.conflictId };
      }
      return { success: true, data: { row: result.row } };
    }
  );

  // Create the missing-language counterpart of a master program (AI translation).
  fastify.post(
    '/aba-master-programs/:id/translate',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const id = String((request.params as any).id || '');
      const body = (request.body || {}) as { to?: string };
      const to = body.to === 'en' ? 'en' : 'id';

      const result = await translateMasterProgram({ id, to });
      if (!result.ok) {
        reply.code(result.code || 400);
        return { success: false, error: result.error, conflict_id: result.conflictId };
      }
      return {
        success: true,
        data: { row: result.row, already_existed: Boolean(result.alreadyExisted) },
      };
    }
  );

  // Repair all stored weekly plans:
  // 1. Programs missing from the master library entirely get backfilled (and
  //    the plan's ids remapped to the new master ids).
  // 2. Guided-flow drift is healed so every program card is runnable — orphaned
  //    links after merges are relinked and uncovered programs get activities.
  fastify.post(
    '/aba-master-programs/repair-plans',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, reply) => {
      try {
        const weeks = await prisma.childAbaProgramWeek.findMany({
          select: { id: true, plan_json: true },
          orderBy: { id: 'asc' },
        });

        let mastersBackfilled = 0;
        for (const w of weeks) {
          const plan: any = w.plan_json;
          if (!plan || !Array.isArray(plan.programs) || !plan.programs.length) continue;
          const ids = plan.programs
            .map((p: any) => (p?.id != null ? String(p.id) : ''))
            .filter(Boolean);
          const missing = await findMissingMasterIds(ids);
          if (!missing.size) continue;

          const lang = plan.language === 'id' ? 'id' : 'en';
          const synced = await syncWeeklyPlanToMasterPrograms({ planJson: plan, language: lang });
          await prisma.childAbaProgramWeek.update({
            where: { id: w.id },
            data: { plan_json: synced as any },
          });
          w.plan_json = synced;
          mastersBackfilled += missing.size;
        }

        const { repaired } = await healWeekPlans(weeks);

        return {
          success: true,
          data: {
            weeks_scanned: weeks.length,
            masters_backfilled: mastersBackfilled,
            plans_repaired: repaired,
          },
        };
      } catch (error) {
        reply.code(500);
        return { success: false, error: formatErrorMessage(error, 'Repair failed') };
      }
    }
  );

  // Merge duplicate master programs into one surviving program.
  fastify.post(
    '/aba-master-programs/merge',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const bodySchema = z.object({
        keep_id: z.string().min(1),
        merge_ids: z.array(z.string().min(1)).min(1).max(50),
      });
      const parsed = bodySchema.safeParse(request.body || {});
      if (!parsed.success) {
        reply.code(400);
        return { success: false, error: formatErrorMessage(parsed.error, 'Invalid input') };
      }

      const result = await mergeMasterPrograms({
        keepId: parsed.data.keep_id,
        mergeIds: parsed.data.merge_ids,
      });
      if (!result.ok) {
        reply.code(result.code || 400);
        return { success: false, error: result.error, conflict_id: result.conflictId };
      }
      return { success: true, data: { row: result.row } };
    }
  );

  // -----------------------------
  // ABA Autism Cases (observation + initial programs, admin only)
  // -----------------------------
  fastify.get(
    '/aba-autism-cases',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request) => {
      const q = (request.query || {}) as {
        source?: string;
        lang?: string;
        search?: string;
        take?: string;
        skip?: string;
      };
      const source =
        q.source === 'mock' || q.source === 'generated' ? q.source : 'all';
      const language = q.lang === 'en' ? 'en' : q.lang === 'id' ? 'id' : undefined;
      const search = String(q.search || '').trim();
      const take = Math.max(1, Math.min(500, parseInt(String(q.take || '100'), 10) || 100));
      const skip = Math.max(0, parseInt(String(q.skip || '0'), 10) || 0);

      const data = await listAutismCases({
        source,
        language,
        search,
        take,
        skip,
      });

      return { success: true, data };
    }
  );

  fastify.post(
    '/aba-autism-cases/seed-mock',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, reply) => {
      try {
        const result = await seedMockAutismCases();
        reply.code(200);
        return { success: true, data: result };
      } catch (e: unknown) {
        reply.code(500);
        return { success: false, error: formatErrorMessage(e, 'Failed to seed mock autism cases') };
      }
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

  // Drill-down detail behind each analytics number (admin only).
  // Returns a generic {title, columns, rows} table so the UI stays metric-agnostic.
  fastify.get(
    '/analytics/detail',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const q = (request.query || {}) as { metric?: string; plan?: string; status?: string };
      const metric = String(q.metric || '');
      const TAKE = 200;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const ymd = (d?: Date | string | null) =>
        d ? new Date(d).toISOString().slice(0, 10) : '';

      const userCols = [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'created', label: 'Registered' },
      ];
      const userRows = (users: Array<{ name: string; email: string; role: string; created_at: Date }>) =>
        users.map((u) => ({ name: u.name, email: u.email, role: u.role, created: ymd(u.created_at) }));

      const listUsers = async (where: Prisma.UserWhereInput, title: string) => {
        const users = await prisma.user.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: TAKE,
          select: { name: true, email: true, role: true, created_at: true },
        });
        return { title, columns: userCols, rows: userRows(users) };
      };

      const logCols = [
        { key: 'date', label: 'Date' },
        { key: 'child', label: 'Child' },
        { key: 'creator', label: 'Created by' },
        { key: 'status', label: 'Status' },
      ];
      const listLogs = async (where: Prisma.ParentLogWhereInput, title: string) => {
        const logs = await prisma.parentLog.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: TAKE,
          select: {
            log_date: true,
            status: true,
            child: { select: { name: true } },
            creator: { select: { name: true } },
          },
        });
        return {
          title,
          columns: logCols,
          rows: logs.map((l) => ({
            date: ymd(l.log_date),
            child: l.child?.name ?? '—',
            creator: l.creator?.name ?? '—',
            status: l.status,
          })),
        };
      };

      const sessionCols = [
        { key: 'date', label: 'Date' },
        { key: 'child', label: 'Child' },
        { key: 'therapist', label: 'Therapist' },
        { key: 'status', label: 'Status' },
      ];
      const listSessions = async (where: Prisma.SessionWhereInput, title: string) => {
        const sessions = await prisma.session.findMany({
          where,
          orderBy: { date: 'desc' },
          take: TAKE,
          select: {
            date: true,
            status: true,
            child: { select: { name: true } },
            therapist: { select: { name: true } },
          },
        });
        return {
          title,
          columns: sessionCols,
          rows: sessions.map((s) => ({
            date: ymd(s.date),
            child: s.child?.name ?? '—',
            therapist: s.therapist?.name ?? '—',
            status: s.status ?? '—',
          })),
        };
      };

      const subCols = [
        { key: 'user', label: 'User' },
        { key: 'email', label: 'Email' },
        { key: 'plan', label: 'Plan' },
        { key: 'status', label: 'Status' },
        { key: 'since', label: 'Since' },
      ];
      const listSubs = async (where: Prisma.SubscriptionWhereInput, title: string) => {
        const subs = await prisma.subscription.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: TAKE,
          include: { user: { select: { name: true, email: true } } },
        });
        return {
          title,
          columns: subCols,
          rows: subs.map((s) => ({
            user: s.user?.name ?? '—',
            email: s.user?.email ?? '—',
            plan: s.plan_type,
            status: s.status,
            since: ymd(s.created_at),
          })),
        };
      };

      const walletCols = [
        { key: 'user', label: 'User' },
        { key: 'email', label: 'Email' },
        { key: 'usage', label: 'Tokens used' },
        { key: 'limit', label: 'Monthly limit' },
        { key: 'pct', label: '%' },
      ];
      const listWallets = async (title: string) => {
        const wallets = await prisma.aITokenWallet.findMany({
          orderBy: { current_token_usage: 'desc' },
          take: TAKE,
          include: { user: { select: { name: true, email: true } } },
        });
        return {
          title,
          columns: walletCols,
          rows: wallets.map((w) => ({
            user: w.user?.name ?? '—',
            email: w.user?.email ?? '—',
            usage: w.current_token_usage,
            limit: w.monthly_token_limit,
            pct:
              w.monthly_token_limit > 0
                ? `${Math.round((w.current_token_usage / w.monthly_token_limit) * 100)}%`
                : '—',
          })),
        };
      };

      const childCols = [
        { key: 'child', label: 'Child' },
        { key: 'parent', label: 'Parent' },
        { key: 'email', label: 'Parent email' },
        { key: 'active', label: 'Active' },
        { key: 'created', label: 'Created' },
      ];
      const listChildren = async (where: Prisma.ChildWhereInput, title: string) => {
        const children = await prisma.child.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: TAKE,
          include: { parent: { select: { name: true, email: true } } },
        });
        return {
          title,
          columns: childCols,
          rows: children.map((c) => ({
            child: c.name,
            parent: c.parent?.name ?? '—',
            email: c.parent?.email ?? '—',
            active: c.is_active ? 'yes' : 'no',
            created: ymd(c.created_at),
          })),
        };
      };

      // Children + their ABA practice state, for the adoption drill-downs.
      const listAbaChildren = async (ran: boolean, title: string) => {
        const children = await prisma.child.findMany({
          where: {
            is_active: true,
            abaProgramWeeks: ran
              ? { some: { sessions: { some: { status: 'completed' } } } }
              : { none: { sessions: { some: { status: 'completed' } } } },
          },
          orderBy: { created_at: 'desc' },
          take: TAKE,
          include: {
            parent: { select: { name: true, email: true } },
            abaProgramWeeks: {
              orderBy: { week_start: 'desc' },
              take: 1,
              include: {
                sessions: {
                  where: { status: 'completed' },
                  orderBy: { completed_at: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });
        return {
          title,
          columns: [
            { key: 'child', label: 'Child' },
            { key: 'parent', label: 'Parent' },
            { key: 'email', label: 'Parent email' },
            { key: 'program', label: 'Has program' },
            { key: 'last_run', label: 'Last completed run' },
          ],
          rows: children.map((c) => {
            const latest = c.abaProgramWeeks[0];
            const lastRun = latest?.sessions?.[0]?.completed_at ?? null;
            return {
              child: c.name,
              parent: c.parent?.name ?? '—',
              email: c.parent?.email ?? '—',
              program: latest ? `yes (${ymd(latest.week_start)})` : 'no',
              last_run: lastRun ? ymd(lastRun) : '—',
            };
          }),
        };
      };

      const tokenLogCols = [
        { key: 'date', label: 'Date' },
        { key: 'user', label: 'User' },
        { key: 'child', label: 'Child' },
        { key: 'feature', label: 'Feature' },
        { key: 'tokens', label: 'Tokens' },
      ];
      const listTokenLogs = async (title: string) => {
        const rows = await prisma.aITokenUsageLog.findMany({
          orderBy: { created_at: 'desc' },
          take: TAKE,
          include: {
            user: { select: { name: true } },
            child: { select: { name: true } },
          },
        });
        return {
          title,
          columns: tokenLogCols,
          rows: rows.map((r) => ({
            date: ymd(r.created_at),
            user: r.user?.name ?? '—',
            child: r.child?.name ?? '—',
            feature: r.feature,
            tokens: r.tokens,
          })),
        };
      };

      let data: { title: string; columns: Array<{ key: string; label: string }>; rows: unknown[] } | null =
        null;

      switch (metric) {
        case 'total_users':
          data = await listUsers({}, 'All users');
          break;
        case 'users_this_month':
          data = await listUsers({ created_at: { gte: thisMonth } }, 'Users registered this month');
          break;
        case 'users_last_month':
          data = await listUsers(
            { created_at: { gte: lastMonth, lt: thisMonth } },
            'Users registered last month'
          );
          break;
        case 'daily_active_users':
          data = await listUsers(
            { sessions: { some: { date: { gte: today } } } },
            'Users with a session today'
          );
          break;
        case 'monthly_active_users':
          data = await listUsers(
            {
              OR: [
                { sessions: { some: { date: { gte: thisMonth } } } },
                { parentLogs: { some: { created_at: { gte: thisMonth } } } },
              ],
            },
            'Users active this month'
          );
          break;
        case 'total_children':
          data = await listChildren({}, 'All children');
          break;
        case 'recent_logs':
          data = await listLogs({ created_at: { gte: thisWeek } }, 'Logs — last 7 days');
          break;
        case 'total_logs':
          data = await listLogs({}, 'Latest logs');
          break;
        case 'logs_this_month':
          data = await listLogs({ created_at: { gte: thisMonth } }, 'Logs this month');
          break;
        case 'recent_sessions':
          data = await listSessions({ date: { gte: thisWeek } }, 'Sessions — last 7 days');
          break;
        case 'total_sessions':
          data = await listSessions({}, 'Latest sessions');
          break;
        case 'trial_subscriptions':
          data = await listSubs({ status: 'trial' }, 'Trial subscriptions');
          break;
        case 'active_paid_subscriptions':
          data = await listSubs(
            { status: 'active', plan_type: { in: ['pro', 'premium'] } },
            'Active paid subscriptions'
          );
          break;
        case 'subscription_breakdown': {
          const plan = String(q.plan || '');
          const status = String(q.status || '');
          data = await listSubs(
            {
              ...(plan ? { plan_type: plan as any } : {}),
              ...(status ? { status: status as any } : {}),
            },
            `Subscriptions — ${plan || 'all plans'} (${status || 'all statuses'})`
          );
          break;
        }
        case 'tokens_used':
          data = await listTokenLogs('Latest AI token usage');
          break;
        case 'token_wallets':
          data = await listWallets('AI token wallets');
          break;
        case 'aba_ran':
          data = await listAbaChildren(true, 'Children who have run the weekly home program');
          break;
        case 'aba_not_ran':
          data = await listAbaChildren(false, 'Children who have not run the weekly home program yet');
          break;
        default:
          reply.code(400);
          return { success: false, error: `Unknown metric: ${metric}` };
      }

      return { success: true, data };
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

      // Weekly home program (ABA) adoption among active children
      const [activeChildren, childrenRanAba] = await Promise.all([
        prisma.child.count({ where: { is_active: true } }),
        prisma.child.count({
          where: {
            is_active: true,
            abaProgramWeeks: { some: { sessions: { some: { status: 'completed' } } } },
          },
        }),
      ]);

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
          aba_adoption: {
            active_children: activeChildren,
            children_ran: childrenRanAba,
            children_not_ran: Math.max(0, activeChildren - childrenRanAba),
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
  const adminCreateUserSchema = z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(6),
    role: z.enum(['admin', 'therapist', 'consultant', 'parent']),
    phone_number: z.string().trim().optional(),
    is_email_verified: z.boolean().optional(),
  });

  const adminUpdateUserSchema = z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['admin', 'therapist', 'consultant', 'parent']).optional(),
    phone_number: z.string().nullable().optional(),
    is_email_verified: z.boolean().optional(),
  });

  const userService = new UserService();

  fastify.get(
    '/users/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = parseInt(id, 10);
      if (Number.isNaN(userId)) {
        reply.code(400);
        return { success: false, error: 'Invalid user id' };
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
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
      });

      if (!user) {
        reply.code(404);
        return { success: false, error: 'User not found' };
      }

      return { success: true, data: user };
    }
  );

  // Reset a user's AI token usage back to 0 (support action, e.g. after a
  // billing correction). The monthly limit and renewal date stay untouched.
  fastify.post(
    '/users/:id/reset-token-usage',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = parseInt(id, 10);
      if (Number.isNaN(userId)) {
        reply.code(400);
        return { success: false, error: 'Invalid user id' };
      }

      const wallet = await prisma.aITokenWallet.findUnique({
        where: { user_id: userId },
      });
      if (!wallet) {
        reply.code(404);
        return { success: false, error: 'This user has no AI token wallet yet.' };
      }

      const updated = await prisma.aITokenWallet.update({
        where: { user_id: userId },
        data: {
          current_token_usage: 0,
          last_reset_date: new Date(),
        },
      });

      return { success: true, data: updated };
    }
  );

  fastify.post(
    '/users',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const body = adminCreateUserSchema.parse(request.body);
        const user = await userService.createUser({
          name: body.name,
          email: body.email,
          password: body.password,
          role: body.role as Role,
          phone_number: body.phone_number,
          is_email_verified: body.is_email_verified ?? true,
        });
        reply.code(201);
        return { success: true, data: user };
      } catch (error: unknown) {
        reply.code(400);
        return { success: false, error: getUserFacingError(error, 'Failed to create user') };
      }
    }
  );

  fastify.put(
    '/users/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = parseInt(id, 10);
      if (Number.isNaN(userId)) {
        reply.code(400);
        return { success: false, error: 'Invalid user id' };
      }

      try {
        const body = adminUpdateUserSchema.parse(request.body);
        const user = await userService.updateUser(userId, body);
        return { success: true, data: user };
      } catch (error: unknown) {
        reply.code(400);
        return { success: false, error: getUserFacingError(error, 'Failed to update user') };
      }
    }
  );

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

  // -----------------------------
  // AI Content Review (admin only)
  // Assessment reports + weekly ABA programs require admin approval before
  // parents can see them. Admins can list, view, edit, approve/reject, delete.
  // -----------------------------
  const reviewStatusEnum = z.enum(['pending', 'approved', 'rejected']);
  const reviewFilterEnum = z.enum(['pending', 'approved', 'rejected', 'all']);

  fastify.get(
    '/ai-content',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request) => {
      const q = (request.query || {}) as { status?: string };
      const status = reviewFilterEnum.catch('pending').parse(q.status);
      const statusWhere = status === 'all' ? {} : { assessment_review_status: status };
      const weekStatusWhere = status === 'all' ? {} : { review_status: status };

      const [assessmentChildren, weeks] = await Promise.all([
        prisma.child.findMany({
          where: {
            OR: [
              { initial_assessment_report: { not: null } },
              { initial_assessment_report_id: { not: null } },
            ],
            ...statusWhere,
          },
          orderBy: { id: 'desc' },
          take: 200,
          include: { parent: { select: { id: true, name: true, email: true } } },
        }),
        prisma.childAbaProgramWeek.findMany({
          where: weekStatusWhere,
          orderBy: { id: 'desc' },
          take: 200,
          include: { child: { select: { id: true, name: true, parent_id: true } } },
        }),
      ]);

      const assessments = assessmentChildren.map((c) => ({
        child_id: c.id,
        child_name: c.name,
        parent_name: c.parent?.name ?? null,
        review_status: c.assessment_review_status,
        reviewed_at: c.assessment_reviewed_at,
        report_en: c.initial_assessment_report,
        report_id: c.initial_assessment_report_id,
        created_at: c.created_at,
      }));

      const weekItems = weeks.map((w) => ({
        week_id: w.id,
        child_id: w.child_id,
        child_name: w.child?.name ?? null,
        week_start: w.week_start,
        lifecycle_status: w.status,
        review_status: w.review_status,
        reviewed_at: w.reviewed_at,
        plan_json: w.plan_json,
        updated_at: w.updated_at,
      }));

      return { success: true, data: { assessments, weeks: weekItems } };
    }
  );

  // Approve / reject an assessment report
  fastify.post(
    '/ai-content/assessment/:childId/review',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const user = (request as any).user!;
      const childId = parseInt((request.params as any).childId, 10);
      if (Number.isNaN(childId)) {
        reply.code(400);
        return { success: false, error: 'Invalid child id' };
      }
      const { decision } = z
        .object({ decision: reviewStatusEnum })
        .parse(request.body);

      const updated = await prisma.child.update({
        where: { id: childId },
        data: {
          assessment_review_status: decision,
          assessment_reviewed_at: new Date(),
          assessment_reviewed_by: user.id,
        },
      });
      return { success: true, data: { child_id: updated.id, review_status: updated.assessment_review_status } };
    }
  );

  // Edit an assessment report's content (markdown)
  fastify.put(
    '/ai-content/assessment/:childId',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const childId = parseInt((request.params as any).childId, 10);
      if (Number.isNaN(childId)) {
        reply.code(400);
        return { success: false, error: 'Invalid child id' };
      }
      const body = z
        .object({
          report_en: z.string().nullable().optional(),
          report_id: z.string().nullable().optional(),
        })
        .parse(request.body);

      const updated = await prisma.child.update({
        where: { id: childId },
        data: {
          ...(body.report_en !== undefined ? { initial_assessment_report: body.report_en } : {}),
          ...(body.report_id !== undefined ? { initial_assessment_report_id: body.report_id } : {}),
        },
      });
      return {
        success: true,
        data: {
          child_id: updated.id,
          report_en: updated.initial_assessment_report,
          report_id: updated.initial_assessment_report_id,
        },
      };
    }
  );

  // Delete (clear) an assessment report
  fastify.delete(
    '/ai-content/assessment/:childId',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const childId = parseInt((request.params as any).childId, 10);
      if (Number.isNaN(childId)) {
        reply.code(400);
        return { success: false, error: 'Invalid child id' };
      }
      await prisma.child.update({
        where: { id: childId },
        data: {
          initial_assessment_report: null,
          initial_assessment_report_id: null,
          assessment_review_status: 'pending',
          assessment_reviewed_at: null,
          assessment_reviewed_by: null,
        },
      });
      return { success: true, data: { child_id: childId } };
    }
  );

  // Approve / reject a weekly ABA program
  fastify.post(
    '/ai-content/week/:weekId/review',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const user = (request as any).user!;
      const weekId = parseInt((request.params as any).weekId, 10);
      if (Number.isNaN(weekId)) {
        reply.code(400);
        return { success: false, error: 'Invalid week id' };
      }
      const { decision } = z
        .object({ decision: reviewStatusEnum })
        .parse(request.body);

      const updated = await prisma.childAbaProgramWeek.update({
        where: { id: weekId },
        data: {
          review_status: decision,
          reviewed_at: new Date(),
          reviewed_by: user.id,
        },
      });
      return { success: true, data: { week_id: updated.id, review_status: updated.review_status } };
    }
  );

  // Edit a weekly ABA program's plan JSON
  fastify.put(
    '/ai-content/week/:weekId',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const weekId = parseInt((request.params as any).weekId, 10);
      if (Number.isNaN(weekId)) {
        reply.code(400);
        return { success: false, error: 'Invalid week id' };
      }
      const body = z
        .object({ plan_json: z.any() })
        .parse(request.body);
      if (body.plan_json === null || typeof body.plan_json !== 'object') {
        reply.code(400);
        return { success: false, error: 'plan_json must be a JSON object' };
      }

      const updated = await prisma.childAbaProgramWeek.update({
        where: { id: weekId },
        data: { plan_json: body.plan_json as any },
      });
      return { success: true, data: { week_id: updated.id, plan_json: updated.plan_json } };
    }
  );

  // Delete a weekly ABA program
  fastify.delete(
    '/ai-content/week/:weekId',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const weekId = parseInt((request.params as any).weekId, 10);
      if (Number.isNaN(weekId)) {
        reply.code(400);
        return { success: false, error: 'Invalid week id' };
      }
      await prisma.childAbaProgramWeek.delete({ where: { id: weekId } });
      return { success: true, data: { week_id: weekId } };
    }
  );
}

