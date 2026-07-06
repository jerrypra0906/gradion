import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { EmailService } from '../services/email.service.js';
import { logger } from '../utils/logger.js';
import {
  generateInitialAssessmentFromObservation,
  getLastTextGenerationError,
  translateInitialAssessmentMarkdown,
  hasAIAccess,
  checkTokenQuota,
  updateTokenUsage,
} from '../services/ai.service.js';
import { ensureFirstAbaWeekForChild } from '../services/abaProgramGeneration.service.js';
import {
  computeWeeklyExecutedHours,
  syncMissingParentLogsForChild,
} from '../services/parentLogFromAba.service.js';
import { config } from '../config/env.js';
import { AI_TOKEN_COST_ESTIMATES } from '../lib/aiTokenCosts.js';

const createChildSchema = z.object({
  name: z.string().min(1),
  // Empty string from <input type="date"> must become null, not Invalid Date.
  birthdate: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() ? value.trim() : undefined))
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: 'Invalid birthdate',
    }),
  diagnosis: z.string().optional(),
  // Coerce so JSON numbers sent as strings (common from form inputs) still work.
  monthly_quota: z.coerce.number().int().positive().default(12),
  behaviors: z.string().max(10000).optional(),
  concerns: z.string().max(10000).optional(),
  environment: z.string().max(10000).optional(),
  lang: z.enum(['en', 'id']).optional(),
  initial_observation: z.unknown().optional(),
});

function parseOptionalBirthdate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const updateChildSchema = z.object({
  name: z.string().min(1).optional(),
  birthdate: z.string().optional(),
  diagnosis: z.string().optional(),
  // Weekly hours target; coerce so form inputs sent as strings still work.
  monthly_quota: z.coerce.number().int().positive().max(100).optional(),
});

const linkTherapistSchema = z.object({
  therapist_email: z.string().email(),
});

function isAssignedStaff(role: string) {
  return role === 'therapist' || role === 'consultant';
}

const INITIAL_ASSESSMENT_TOKEN_ESTIMATE = AI_TOKEN_COST_ESTIMATES.initialAssessment.preCheck;

async function assertInitialAssessmentAICapability(
  userId: number
): Promise<{ ok: true } | { ok: false; code: number; error: string }> {
  if (!config.features.ai) {
    return { ok: false, code: 503, error: 'AI features are disabled' };
  }

  const access = await hasAIAccess(userId);
  if (!access.hasAccess) {
    return {
      ok: false,
      code: 403,
      error:
        access.reason ||
        'AI features require an active subscription or free trial. Upgrade to continue.',
    };
  }

  const quota = await checkTokenQuota(userId, INITIAL_ASSESSMENT_TOKEN_ESTIMATE);
  if (!quota.hasQuota) {
    return {
      ok: false,
      code: 403,
      error: quota.reason || 'Insufficient AI tokens for Initial Observation report.',
    };
  }

  return { ok: true };
}

export async function childrenRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  fastify.get(
    '/initial-observation-template/active',
    { preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')] },
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

  // Get all children (for parent or therapist)
  fastify.get(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;

      let children;
      if (user.role === 'parent') {
        // Parents see their own children (deleted/deactivated ones are hidden entirely)
        children = await prisma.child.findMany({
          where: { parent_id: user.id, is_active: true },
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        });
      } else if (isAssignedStaff(user.role)) {
        // Therapists and consultants see assigned children
        children = await prisma.child.findMany({
          where: {
            is_active: true,
            therapistMap: {
              some: {
                therapist_id: user.id,
              },
            },
          },
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        });
      } else if (user.role === 'admin') {
        // Admins see all children
        children = await prisma.child.findMany({
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        });
      } else {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      // Attach each child's AI token consumption from the usage ledger so the
      // UI can report utilization per child (the wallet is per parent).
      const childIds = children.map((c) => c.id);
      const usage = childIds.length
        ? await prisma.aITokenUsageLog.groupBy({
            by: ['child_id'],
            where: { child_id: { in: childIds } },
            _sum: { tokens: true },
          })
        : [];
      const usageByChild = new Map(
        usage.map((u) => [u.child_id, u._sum.tokens ?? 0])
      );

      return {
        success: true,
        data: children.map((c) => ({
          ...c,
          ai_tokens_used: usageByChild.get(c.id) ?? 0,
        })),
      };
    }
  );

  // Get child by ID
  fastify.get(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const childId = parseInt(id);

      const child = await prisma.child.findUnique({
        where: { id: childId },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          therapistMap: {
            include: {
              therapist: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!child || (!child.is_active && user.role !== 'admin')) {
        reply.code(404);
        return {
          success: false,
          error: 'Child not found',
        };
      }

      // Check permissions
      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      if (isAssignedStaff(user.role)) {
        const isAssigned = await prisma.therapistChild.findFirst({
          where: {
            therapist_id: user.id,
            child_id: childId,
          },
        });
        if (!isAssigned) {
          reply.code(403);
          return {
            success: false,
            error: 'Forbidden',
          };
        }
      }

      // Shape response to expose therapists as a flat array
      const therapists =
        (child as any).therapistMap?.map((m: any) => ({
          id: m.therapist.id,
          name: m.therapist.name,
          email: m.therapist.email,
        })) ?? [];

      // The AI Initial Assessment stays hidden until an admin approves it.
      // Admins get the same gated view here as parents — they review and edit
      // the content in the dedicated AI Content Review page instead.
      const hasReport = Boolean(child.initial_assessment_report || child.initial_assessment_report_id);
      const isGatedViewer = user.role === 'parent' || user.role === 'admin';
      const gatePending = isGatedViewer && child.assessment_review_status !== 'approved';
      const gatedChild = gatePending
        ? {
            ...child,
            initial_assessment_report: null,
            initial_assessment_report_id: null,
            // Tells the UI a report exists but is awaiting admin review.
            has_pending_assessment: hasReport,
          }
        : { ...child, has_pending_assessment: false };

      await syncMissingParentLogsForChild(childId);
      const weekly_hours_executed = await computeWeeklyExecutedHours(childId);
      const tokenUsage = await prisma.aITokenUsageLog.aggregate({
        where: { child_id: childId },
        _sum: { tokens: true },
      });

      return {
        success: true,
        data: {
          ...gatedChild,
          therapists,
          weekly_hours_executed,
          ai_tokens_used: tokenUsage._sum.tokens ?? 0,
        },
      };
    }
  );

  // Generate Initial Assessment Report (Claude) from Initial Observation
  fastify.post(
    '/:id/initial-assessment',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const childId = parseInt(id, 10);
      if (Number.isNaN(childId)) {
        reply.code(400);
        return { success: false, error: 'Invalid child ID' };
      }

      const child = await prisma.child.findUnique({
        where: { id: childId },
        include: {
          parent: { select: { id: true, name: true, email: true } },
        },
      });
      if (!child) {
        reply.code(404);
        return { success: false, error: 'Child not found' };
      }

      // Permission checks (same spirit as GET /children/:id)
      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return { success: false, error: 'Forbidden' };
      }

      if (isAssignedStaff(user.role)) {
        const isAssigned = await prisma.therapistChild.findFirst({
          where: { therapist_id: user.id, child_id: childId },
        });
        if (!isAssigned) {
          reply.code(403);
          return { success: false, error: 'Forbidden' };
        }
      }

      if (!child.initial_observation) {
        reply.code(400);
        return {
          success: false,
          error: 'Initial observation checklist has not been completed for this child.',
        };
      }

      const query = z
        .object({
          lang: z.enum(['en', 'id']).optional(),
          mode: z.enum(['generate', 'translate']).optional(),
        })
        .parse(request.query);
      const lang = query.lang ?? 'en';
      const mode = query.mode ?? 'generate';

      logger.info({ childId, lang, mode }, 'Initial assessment request');

      const billingUserId = user.role === 'parent' ? user.id : child.parent_id;
      const aiGate = await assertInitialAssessmentAICapability(billingUserId);
      if (!aiGate.ok) {
        reply.code(aiGate.code);
        return { success: false, error: aiGate.error };
      }

      let reportMarkdown: string;
      let tokensUsed: number;

      if (mode === 'translate') {
        // Translate from the other language's existing report — never regenerate
        // here, so translation can safely preserve the admin review status.
        const sourceMarkdown =
          lang === 'id' ? child.initial_assessment_report : child.initial_assessment_report_id;
        if (!sourceMarkdown) {
          reply.code(400);
          return {
            success: false,
            error:
              'No AI Initial Assessment found in the other language to translate. Generate it first.',
          };
        }
        logger.info({ childId, lang }, 'Translating assessment');
        const translated = await translateInitialAssessmentMarkdown(sourceMarkdown, lang);
        if (!translated) {
          reply.code(config.ai.anthropicApiKey ? 502 : 503);
          return {
            success: false,
            error:
              getLastTextGenerationError() ??
              `AI translation failed. Verify ANTHROPIC_MODEL is valid for your Anthropic account (current: ${config.ai.anthropicModel}).`,
          };
        }
        reportMarkdown = translated.reportMarkdown;
        tokensUsed = translated.tokensUsed;
      } else {
        const generated = await generateInitialAssessmentFromObservation({
          childName: child.name,
          diagnosis: child.diagnosis,
          initialObservation: child.initial_observation,
          language: lang,
        });
        if (!generated.ok) {
          const hasAnyAiKey =
            Boolean(config.ai.geminiApiKey) ||
            Boolean(config.ai.openaiApiKey) ||
            Boolean(config.ai.anthropicApiKey);
          reply.code(hasAnyAiKey ? 502 : 503);
          return { success: false, error: generated.error };
        }
        reportMarkdown = generated.reportMarkdown;
        tokensUsed = generated.tokensUsed;
      }

      await updateTokenUsage(billingUserId, tokensUsed, {
        childId,
        feature: mode === 'translate' ? 'assessment_translation' : 'initial_assessment',
      });

      // Re-generating resets the report to "pending" admin review. Translating
      // does NOT: it preserves the approved content's meaning, and resetting
      // here silently un-approved reports whenever the child page auto-filled
      // a missing language version.
      const isTranslate = mode === 'translate';
      const updated = await prisma.child.update({
        where: { id: childId },
        data: {
          ...(lang === 'id'
            ? { initial_assessment_report_id: reportMarkdown }
            : { initial_assessment_report: reportMarkdown }),
          ...(isTranslate
            ? {}
            : {
                assessment_review_status: 'pending',
                assessment_reviewed_at: null,
                assessment_reviewed_by: null,
              }),
        },
        include: {
          parent: { select: { id: true, name: true, email: true } },
        },
      });

      // Hide unapproved content until an admin approves it in the AI Content
      // Review page. Admins get the same gated view as parents.
      const gatePending =
        (user.role === 'parent' || user.role === 'admin') &&
        updated.assessment_review_status !== 'approved';
      const gatedUpdated = gatePending
        ? {
            ...updated,
            initial_assessment_report: null,
            initial_assessment_report_id: null,
            has_pending_assessment: true,
          }
        : { ...updated, has_pending_assessment: false };

      if (mode === 'generate') {
        await ensureFirstAbaWeekForChild({
          childId,
          userId: billingUserId,
          lang,
        });
      }

      return {
        success: true,
        data: {
          child: gatedUpdated,
          tokensUsed,
        },
      };
    }
  );

  // Create child (parent only)
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('parent', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;

      let body: z.infer<typeof createChildSchema>;
      try {
        body = createChildSchema.parse(request.body);
      } catch (error) {
        reply.code(400);
        return {
          success: false,
          error:
            error instanceof z.ZodError
              ? error.errors.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')
              : 'Invalid child data',
        };
      }

      const parentId = user.role === 'admin' && (request.body as any).parent_id
        ? (request.body as any).parent_id
        : user.id;

      const trimmedName = body.name.trim();

      // Idempotency guard: double clicks or client retries after a slow response
      // resubmit the same payload. The advisory lock serializes concurrent
      // submissions for the same parent+name, so the duplicate check cannot
      // race with the insert; retries get the already-created child back.
      let child;
      let deduplicated = false;
      try {
        const result = await prisma.$transaction(async (tx) => {
          // ::text cast because the void return type cannot be deserialized by Prisma.
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`child-create:${parentId}:${trimmedName}`}))::text AS locked`;

          const recentDuplicate = await tx.child.findFirst({
            where: {
              parent_id: parentId,
              name: trimmedName,
              is_active: true,
              created_at: { gte: new Date(Date.now() - 5 * 60 * 1000) },
            },
            orderBy: { created_at: 'desc' },
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
          if (recentDuplicate) {
            return { row: recentDuplicate, deduplicated: true };
          }

          const created = await tx.child.create({
            data: {
              parent_id: parentId,
              name: trimmedName,
              birthdate: parseOptionalBirthdate(body.birthdate),
              diagnosis: body.diagnosis || null,
              monthly_quota: body.monthly_quota,
              used_sessions: 0,
              behaviors: body.behaviors?.trim() ? body.behaviors.trim() : null,
              concerns: body.concerns?.trim() ? body.concerns.trim() : null,
              environment: body.environment?.trim() ? body.environment.trim() : null,
              initial_observation: body.initial_observation ?? undefined,
            },
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
          return { row: created, deduplicated: false };
        });
        child = result.row;
        deduplicated = result.deduplicated;
      } catch (error: any) {
        logger.error({ err: error, parentId }, 'Failed to create child');
        reply.code(500);
        return {
          success: false,
          error: 'Failed to create child. Please try again.',
        };
      }

      if (deduplicated) {
        logger.info(
          { parentId, childId: child.id, name: trimmedName },
          'Duplicate child creation detected — returning existing child'
        );
        return {
          success: true,
          data: child,
          deduplicated: true,
        };
      }

      // AI work is best-effort and must not block/fail child creation (proxy timeouts).
      const hasAnyAiKey =
        Boolean(config.ai.geminiApiKey) ||
        Boolean(config.ai.openaiApiKey) ||
        Boolean(config.ai.anthropicApiKey);
      if (child.initial_observation && config.features.ai && hasAnyAiKey) {
        const lang = body.lang ?? 'en';
        const childId = child.id;
        const childName = child.name;
        const diagnosis = child.diagnosis;
        const initialObservation = child.initial_observation;

        void (async () => {
          try {
            const aiGate = await assertInitialAssessmentAICapability(parentId);
            if (!aiGate.ok) {
              logger.info(
                { childId, parentId, reason: aiGate.error },
                'Skipped auto-generate initial assessment — no AI access'
              );
              return;
            }

            const result = await generateInitialAssessmentFromObservation({
              childName,
              diagnosis,
              initialObservation,
              language: lang,
            });
            if (!result.ok) {
              logger.warn(
                { childId, parentId, error: result.error },
                'Auto-generate initial assessment returned failure'
              );
              return;
            }

            await updateTokenUsage(parentId, result.tokensUsed, {
              childId,
              feature: 'initial_assessment',
            });
            await prisma.child.update({
              where: { id: childId },
              data:
                lang === 'id'
                  ? {
                      initial_assessment_report_id: result.reportMarkdown,
                      assessment_review_status: 'pending',
                    }
                  : {
                      initial_assessment_report: result.reportMarkdown,
                      assessment_review_status: 'pending',
                    },
            });

            await ensureFirstAbaWeekForChild({
              childId,
              userId: parentId,
              lang,
            });
          } catch (error: any) {
            logger.warn(
              { error: error?.message, childId },
              'Failed to auto-generate initial assessment report'
            );
          }
        })();
      }

      return {
        success: true,
        data: child,
      };
    }
  );

  // Update child
  fastify.put(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const childId = parseInt(id);
      const body = updateChildSchema.parse(request.body);

      // Check permissions
      const child = await prisma.child.findUnique({
        where: { id: childId },
      });

      if (!child) {
        reply.code(404);
        return {
          success: false,
          error: 'Child not found',
        };
      }

      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      // Admins and the owning parent can update the weekly hours target
      // (parent ownership is already enforced above).
      const updateData: any = {};
      if (body.name) updateData.name = body.name;
      if (body.birthdate !== undefined) {
        updateData.birthdate = body.birthdate ? new Date(body.birthdate) : null;
      }
      if (body.diagnosis !== undefined) updateData.diagnosis = body.diagnosis;
      if (
        body.monthly_quota !== undefined &&
        (user.role === 'admin' || user.role === 'parent')
      ) {
        updateData.monthly_quota = body.monthly_quota;
      }

      const updatedChild = await prisma.child.update({
        where: { id: childId },
        data: updateData,
        include: {
          parent: {
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
        data: updatedChild,
      };
    }
  );

  // Soft-delete child (parent owns it, or admin). Parent view: gone entirely.
  // Admin view: flagged as deactivated and can be reactivated later.
  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireRole('parent', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const childId = parseInt(id, 10);
      if (Number.isNaN(childId)) {
        reply.code(400);
        return { success: false, error: 'Invalid child ID' };
      }

      const child = await prisma.child.findUnique({ where: { id: childId } });
      if (!child || (!child.is_active && user.role !== 'admin')) {
        reply.code(404);
        return { success: false, error: 'Child not found' };
      }

      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return { success: false, error: 'Forbidden' };
      }

      if (!child.is_active) {
        return { success: true, message: 'Child is already deactivated' };
      }

      await prisma.child.update({
        where: { id: childId },
        data: {
          is_active: false,
          deactivated_at: new Date(),
          deactivated_by: user.id,
        },
      });

      logger.info({ childId, userId: user.id, role: user.role }, 'Child deactivated');
      return { success: true, message: 'Child deleted' };
    }
  );

  // Reactivate a deactivated child (admin only, e.g. on parent request).
  fastify.post(
    '/:id/reactivate',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const childId = parseInt(id, 10);
      if (Number.isNaN(childId)) {
        reply.code(400);
        return { success: false, error: 'Invalid child ID' };
      }

      const child = await prisma.child.findUnique({ where: { id: childId } });
      if (!child) {
        reply.code(404);
        return { success: false, error: 'Child not found' };
      }

      if (child.is_active) {
        return { success: true, message: 'Child is already active' };
      }

      const updated = await prisma.child.update({
        where: { id: childId },
        data: {
          is_active: true,
          deactivated_at: null,
          deactivated_by: null,
        },
        include: {
          parent: { select: { id: true, name: true, email: true } },
        },
      });

      logger.info({ childId, adminId: user.id }, 'Child reactivated');
      return { success: true, data: updated };
    }
  );

  // Update the Behavior (OBS 1) values of the initial observation. Only allowed
  // while the AI pipeline has not produced anything yet: no assessment report
  // and no weekly ABA program. After that the observation is the immutable
  // input that generated those artifacts.
  fastify.put(
    '/:id/initial-observation/behaviors',
    { preHandler: [authenticate, requireRole('parent', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const childId = parseInt(id, 10);
      if (Number.isNaN(childId)) {
        reply.code(400);
        return { success: false, error: 'Invalid child ID' };
      }

      const behaviorEntrySchema = z.object({
        f: z.coerce.number().min(0).max(5),
        s: z.coerce.number().min(0).max(5),
        label: z.string().max(500).nullable().optional(),
      });
      const bodySchema = z.object({
        behaviors: z.record(z.string(), behaviorEntrySchema),
      });

      let body: z.infer<typeof bodySchema>;
      try {
        body = bodySchema.parse(request.body);
      } catch {
        reply.code(400);
        return { success: false, error: 'Invalid behaviors payload' };
      }

      const child = await prisma.child.findUnique({ where: { id: childId } });
      if (!child || (!child.is_active && user.role !== 'admin')) {
        reply.code(404);
        return { success: false, error: 'Child not found' };
      }
      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return { success: false, error: 'Forbidden' };
      }

      // Editing stays open while nothing has been approved yet: an assessment
      // or weekly program that is still pending (or rejected) in admin review
      // does not lock the observation.
      const hasApprovedAssessment =
        Boolean(child.initial_assessment_report || child.initial_assessment_report_id) &&
        child.assessment_review_status === 'approved';
      const approvedWeekCount = await prisma.childAbaProgramWeek.count({
        where: { child_id: childId, review_status: 'approved' },
      });
      if (hasApprovedAssessment || approvedWeekCount > 0) {
        reply.code(409);
        return {
          success: false,
          error:
            'Behavior values can no longer be edited because an approved assessment report or weekly ABA program already exists for this child.',
        };
      }

      const observation = (child.initial_observation as Record<string, any> | null) ?? {};
      const obs1 = (observation.obs1 as Record<string, any> | undefined) ?? {};
      const existingBehaviors = (obs1.behaviors as Record<string, any> | undefined) ?? {};

      const ALLOWED_BEHAVIOR_KEYS = new Set([
        'tantrums',
        'self_abuse',
        'aggression',
        'self_stim',
        'other_major_1',
        'other_major_2',
        'leaves_work_area',
        'hands_feet_restless',
      ]);

      const nextBehaviors: Record<string, any> = { ...existingBehaviors };
      for (const [key, entry] of Object.entries(body.behaviors)) {
        if (!ALLOWED_BEHAVIOR_KEYS.has(key)) continue;
        nextBehaviors[key] = {
          ...(existingBehaviors[key] || {}),
          f: entry.f,
          s: entry.s,
          ...(entry.label !== undefined ? { label: entry.label } : {}),
        };
      }

      const updated = await prisma.child.update({
        where: { id: childId },
        data: {
          initial_observation: {
            ...observation,
            obs1: { ...obs1, behaviors: nextBehaviors },
          },
        },
        include: {
          parent: { select: { id: true, name: true, email: true } },
        },
      });

      logger.info({ childId, userId: user.id }, 'Initial observation behaviors updated');
      return { success: true, data: updated };
    }
  );

  // Link child to therapist (or invite therapist) - parent/admin only
  fastify.post(
    '/:id/link-therapist',
    { preHandler: [authenticate, requireRole('parent', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const childId = parseInt(id);
      const body = linkTherapistSchema.parse(request.body);

      // Ensure child exists and belongs to parent (or admin)
      const child = await prisma.child.findUnique({
        where: { id: childId },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!child) {
        reply.code(404);
        return {
          success: false,
          error: 'Child not found',
        };
      }

      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      // Check if therapist already exists
      const therapist = await prisma.user.findFirst({
        where: {
          email: body.therapist_email,
          role: 'therapist',
        },
      });

      if (therapist) {
        // Link existing therapist to child
        try {
          await prisma.therapistChild.create({
            data: {
              therapist_id: therapist.id,
              child_id: childId,
            },
          });
        } catch (error: any) {
          // Unique constraint means already linked
          if (!String(error.message).includes('Unique constraint')) {
            logger.error({ error, childId, therapistId: therapist.id }, 'Failed to link therapist to child');
            reply.code(500);
            return {
              success: false,
              error: 'Failed to link therapist to child',
            };
          }
        }

        return {
          success: true,
          message: 'Therapist linked to child successfully',
        };
      }

      // Therapist not found: create invitation record and send invitation email
      try {
        // Create or update invitation record
        // First check if invitation already exists
        const existingInvitation = await prisma.therapistInvitation.findFirst({
          where: {
            therapist_email: body.therapist_email,
            child_id: childId,
          },
        });

        if (existingInvitation) {
          // Update existing invitation
          await prisma.therapistInvitation.update({
            where: { id: existingInvitation.id },
            data: {
              status: 'pending',
              invited_by_id: user.id,
            },
          });
        } else {
          // Create new invitation
          await prisma.therapistInvitation.create({
            data: {
              therapist_email: body.therapist_email,
              child_id: childId,
              invited_by_id: user.id,
              status: 'pending',
            },
          });
        }

        const emailService = new EmailService();
        const registerUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/register`;

        const html = `
          <div>
            <h2>Invitation to join Gradion as Therapist</h2>
            <p>Dear Therapist,</p>
            <p>${child.parent?.name || 'A parent'} has invited you to join <strong>Gradion</strong> to help track and support their child's progress.</p>
            <p><strong>Child Name:</strong> ${child.name}</p>
            <p>Please click the button below to create your therapist account:</p>
            <p>
              <a href="${registerUrl}" style="background-color:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
                Register as Therapist
              </a>
            </p>
            <p>If you already have an account with this email, you can simply log in.</p>
            <p><strong>Note:</strong> Once you register as a therapist, you will be automatically linked to ${child.name}'s profile.</p>
          </div>
        `;

        await emailService.sendEmail({
          to: body.therapist_email,
          subject: 'Invitation to join Gradion as Therapist',
          html,
        });

        return {
          success: true,
          message:
            'Therapist not found. Invitation email has been sent. Once they register as therapist, they will be automatically linked to this child.',
        };
      } catch (error) {
        logger.error({ error, childId, therapistEmail: body.therapist_email }, 'Failed to send therapist invitation');
        reply.code(500);
        return {
          success: false,
          error: 'Failed to send invitation email',
        };
      }
    }
  );
}

