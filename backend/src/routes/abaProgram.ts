import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { config } from '../config/env.js';
import { AI_TOKEN_COST_ESTIMATES } from '../lib/aiTokenCosts.js';
import { formatErrorMessage } from '../utils/errorResponse.js';
import { logger } from '../utils/logger.js';
import {
  hasAIAccess,
  checkTokenQuota,
  updateTokenUsage,
} from '../services/ai.service.js';
import {
  extractTherapyNotesJsonFromImage,
} from '../services/abaProgram.service.js';
import { ensureGuidedFlow } from '../services/abaProgram.service.js';
import { translateWeeklyAbaPlanJson } from '../services/abaProgram.service.js';
import { syncWeeklyPlanToMasterPrograms } from '../services/abaMasterProgram.service.js';
import {
  recordLearningInsightForWeek,
} from '../services/abaProgramLearning.service.js';
import { syncParentLogForCompletedSession } from '../services/parentLogFromAba.service.js';
import { generateAbaWeekForChild } from '../services/abaProgramGeneration.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_THERAPY_NOTES_DIR = path.join(__dirname, '../../uploads/therapy-notes');

let supabaseClient: ReturnType<typeof createClient> | null = null;
if (config.storage.supabaseUrl && config.storage.supabaseServiceRoleKey) {
  supabaseClient = createClient(config.storage.supabaseUrl, config.storage.supabaseServiceRoleKey);
}

function isAssignedStaff(role: string) {
  return role === 'therapist' || role === 'consultant';
}

async function canAccessChild(
  user: { id: number; role: string },
  childId: number
): Promise<boolean> {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'parent' && child.parent_id === user.id) return true;
  if (isAssignedStaff(user.role)) {
    const row = await prisma.therapistChild.findFirst({
      where: { therapist_id: user.id, child_id: childId },
    });
    return !!row;
  }
  return false;
}

async function ensureLocalTherapyNotesDir() {
  try {
    await fs.access(LOCAL_THERAPY_NOTES_DIR);
  } catch {
    await fs.mkdir(LOCAL_THERAPY_NOTES_DIR, { recursive: true });
  }
}

function safeFilename(original: string, prefix: string) {
  const ext = path.extname(original || '') || '.jpg';
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${stamp}_${rand}${ext}`;
}

export async function abaProgramRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  await ensureLocalTherapyNotesDir();

  fastify.get(
    '/children/:childId/weeks',
    {
      preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const childId = parseInt((request.params as any).childId, 10);
        if (Number.isNaN(childId)) {
          reply.code(400);
          return { success: false, error: 'Invalid child id' };
        }
        if (!(await canAccessChild(user, childId))) {
          reply.code(403);
          return { success: false, error: 'Forbidden' };
        }

        const weeks = await prisma.childAbaProgramWeek.findMany({
          where: { child_id: childId },
          orderBy: { week_start: 'desc' },
          take: 12,
          include: {
            sessions: {
              orderBy: { started_at: 'desc' },
              take: 50,
            },
          },
        });

        // Parents only see a week's plan once an admin approves it.
        const gatedWeeks =
          user.role === 'parent'
            ? weeks.map((w) =>
                w.review_status === 'approved'
                  ? w
                  : { ...w, plan_json: null, therapy_notes_json: null }
              )
            : weeks;

        return { success: true, data: { weeks: gatedWeeks } };
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to list ABA program weeks');
        reply.code(500);
        return { success: false, error: formatErrorMessage(error, 'Failed to list programs') };
      }
    }
  );

  fastify.post(
    '/children/:childId/weeks/generate',
    {
      preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')],
    },
    async (request, reply) => {
      try {
        if (!config.features.ai) {
          reply.code(503);
          return { success: false, error: 'AI features are disabled' };
        }

        const user = (request as AuthenticatedRequest).user!;
        const childId = parseInt((request.params as any).childId, 10);
        if (Number.isNaN(childId)) {
          reply.code(400);
          return { success: false, error: 'Invalid child id' };
        }
        if (!(await canAccessChild(user, childId))) {
          reply.code(403);
          return { success: false, error: 'Forbidden' };
        }

        const child = await prisma.child.findUnique({
          where: { id: childId },
          select: { parent_id: true },
        });
        if (!child) {
          reply.code(404);
          return { success: false, error: 'Child not found' };
        }
        const billingUserId = user.role === 'parent' ? user.id : child.parent_id;

        const body = (request.body || {}) as { week_start?: string; lang?: 'en' | 'id' };
        const lang = body.lang === 'id' ? 'id' : 'en';
        if (!body.week_start) {
          reply.code(400);
          return { success: false, error: 'week_start is required (YYYY-MM-DD, Monday of week)' };
        }

        const result = await generateAbaWeekForChild({
          childId,
          userId: billingUserId,
          weekStartYmd: body.week_start,
          lang,
        });

        if (!result.ok) {
          if (result.code) reply.code(result.code);
          return { success: false, error: result.error };
        }

        const week = await prisma.childAbaProgramWeek.findUnique({
          where: { id: result.weekId },
        });
        if (!week) {
          reply.code(500);
          return { success: false, error: 'Failed to load generated program week' };
        }

        const gatedWeek =
          user.role === 'parent' ? { ...week, plan_json: null, therapy_notes_json: null } : week;

        return { success: true, data: { week: gatedWeek, tokens_used: result.tokensUsed } };
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to generate ABA week');
        reply.code(500);
        return { success: false, error: formatErrorMessage(error, 'Failed to generate program') };
      }
    }
  );

  fastify.post(
    '/children/:childId/weeks/:weekId/translate',
    {
      preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')],
    },
    async (request, reply) => {
      try {
        if (!config.features.ai) {
          reply.code(503);
          return { success: false, error: 'AI features are disabled' };
        }

        const user = (request as AuthenticatedRequest).user!;
        const childId = parseInt((request.params as any).childId, 10);
        const weekId = parseInt((request.params as any).weekId, 10);
        if (Number.isNaN(childId) || Number.isNaN(weekId)) {
          reply.code(400);
          return { success: false, error: 'Invalid id' };
        }
        if (!(await canAccessChild(user, childId))) {
          reply.code(403);
          return { success: false, error: 'Forbidden' };
        }

        const body = (request.body || {}) as { to?: 'en' | 'id' };
        const to = body.to === 'id' ? 'id' : 'en';

        const access = await hasAIAccess(user.id);
        if (!access.hasAccess) {
          reply.code(403);
          return { success: false, error: access.reason || 'AI access denied' };
        }

        const week = await prisma.childAbaProgramWeek.findFirst({
          where: { id: weekId, child_id: childId },
        });
        if (!week) {
          reply.code(404);
          return { success: false, error: 'Week not found' };
        }

        const quota = await checkTokenQuota(
          user.id,
          AI_TOKEN_COST_ESTIMATES.weeklyProgramTranslate.preCheck
        );
        if (!quota.hasQuota) {
          reply.code(403);
          return { success: false, error: quota.reason || 'Insufficient AI tokens' };
        }

        const translated = await translateWeeklyAbaPlanJson({
          fromPlanJson: week.plan_json,
          toLanguage: to,
        });
        if (!translated) {
          reply.code(500);
          return { success: false, error: 'Failed to translate program' };
        }

        await updateTokenUsage(user.id, translated.tokensUsed, {
          childId,
          feature: 'weekly_program_translation',
        });

        const synced = await syncWeeklyPlanToMasterPrograms({
          planJson: translated.json as any,
          language: to,
        });

        const updated = await prisma.childAbaProgramWeek.update({
          where: { id: week.id },
          data: { plan_json: synced as any },
        });

        return { success: true, data: { week: updated, tokens_used: translated.tokensUsed } };
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to translate ABA week');
        reply.code(500);
        return { success: false, error: formatErrorMessage(error, 'Failed to translate program') };
      }
    }
  );

  fastify.post(
    '/children/:childId/weeks/:weekId/sessions',
    {
      preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const childId = parseInt((request.params as any).childId, 10);
        const weekId = parseInt((request.params as any).weekId, 10);
        if (Number.isNaN(childId) || Number.isNaN(weekId)) {
          reply.code(400);
          return { success: false, error: 'Invalid id' };
        }
        if (!(await canAccessChild(user, childId))) {
          reply.code(403);
          return { success: false, error: 'Forbidden' };
        }

        const body = (request.body || {}) as { mode?: 'guided' | 'upload' };
        if (body.mode !== 'guided' && body.mode !== 'upload') {
          reply.code(400);
          return { success: false, error: 'mode must be guided or upload' };
        }

        const week = await prisma.childAbaProgramWeek.findFirst({
          where: { id: weekId, child_id: childId },
        });
        if (!week) {
          reply.code(404);
          return { success: false, error: 'Week not found' };
        }

        // Backfill guided flow for older plans (so guided mode always has activities).
        if (body.mode === 'guided') {
          const plan: any = week.plan_json as any;
          const flow = plan?.daily_guided_flow;
          const firstActs =
            Array.isArray(flow) && flow.length > 0 && Array.isArray(flow[0]?.activities)
              ? flow[0].activities
              : [];
          if (!Array.isArray(firstActs) || firstActs.length === 0) {
            const patched = ensureGuidedFlow(plan);
            await prisma.childAbaProgramWeek.update({
              where: { id: week.id },
              data: { plan_json: patched as any },
            });
          }
        }

        const session = await prisma.childAbaProgramSession.create({
          data: {
            week_id: week.id,
            user_id: user.id,
            mode: body.mode,
            status: 'in_progress',
          },
        });

        return { success: true, data: { session } };
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to start ABA session');
        reply.code(500);
        return { success: false, error: formatErrorMessage(error, 'Failed to start session') };
      }
    }
  );

  fastify.post(
    '/children/:childId/weeks/:weekId/sessions/:sessionId/complete-guided',
    {
      preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const childId = parseInt((request.params as any).childId, 10);
        const weekId = parseInt((request.params as any).weekId, 10);
        const sessionId = parseInt((request.params as any).sessionId, 10);
        if (Number.isNaN(childId) || Number.isNaN(weekId) || Number.isNaN(sessionId)) {
          reply.code(400);
          return { success: false, error: 'Invalid id' };
        }
        if (!(await canAccessChild(user, childId))) {
          reply.code(403);
          return { success: false, error: 'Forbidden' };
        }

        const body = (request.body || {}) as { results?: unknown };
        if (body.results === undefined || body.results === null) {
          reply.code(400);
          return { success: false, error: 'results is required' };
        }

        const session = await prisma.childAbaProgramSession.findFirst({
          where: { id: sessionId, week_id: weekId, user_id: user.id },
          include: { week: true },
        });
        if (!session || session.week.child_id !== childId) {
          reply.code(404);
          return { success: false, error: 'Session not found' };
        }
        if (session.mode !== 'guided') {
          reply.code(400);
          return { success: false, error: 'Session is not guided mode' };
        }

        const updated = await prisma.$transaction(async (tx) => {
          const s = await tx.childAbaProgramSession.update({
            where: { id: session.id },
            data: {
              status: 'completed',
              completed_at: new Date(),
              guided_results_json: body.results as any,
            },
          });
          await tx.childAbaProgramWeek.update({
            where: { id: weekId },
            data: { status: 'completed' },
          });
          return s;
        });

        await recordLearningInsightForWeek(weekId);
        await syncParentLogForCompletedSession(updated.id);

        return { success: true, data: { session: updated } };
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to complete guided ABA session');
        reply.code(500);
        return { success: false, error: formatErrorMessage(error, 'Failed to save results') };
      }
    }
  );

  fastify.post(
    '/children/:childId/weeks/:weekId/sessions/:sessionId/upload-ocr',
    {
      preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')],
    },
    async (request, reply) => {
      try {
        if (!config.features.ai) {
          reply.code(503);
          return { success: false, error: 'AI features are disabled' };
        }

        const user = (request as AuthenticatedRequest).user!;
        const childId = parseInt((request.params as any).childId, 10);
        const weekId = parseInt((request.params as any).weekId, 10);
        const sessionId = parseInt((request.params as any).sessionId, 10);
        if (Number.isNaN(childId) || Number.isNaN(weekId) || Number.isNaN(sessionId)) {
          reply.code(400);
          return { success: false, error: 'Invalid id' };
        }
        if (!(await canAccessChild(user, childId))) {
          reply.code(403);
          return { success: false, error: 'Forbidden' };
        }

        const access = await hasAIAccess(user.id);
        if (!access.hasAccess) {
          reply.code(403);
          return { success: false, error: access.reason || 'AI access denied' };
        }

        const session = await prisma.childAbaProgramSession.findFirst({
          where: { id: sessionId, week_id: weekId, user_id: user.id },
          include: { week: true },
        });
        if (!session || session.week.child_id !== childId) {
          reply.code(404);
          return { success: false, error: 'Session not found' };
        }
        if (session.mode !== 'upload') {
          reply.code(400);
          return { success: false, error: 'Session is not upload mode' };
        }

        const parts = request.parts();
        let buffer: Buffer | null = null;
        let mime = '';
        let filename = 'notes.jpg';
        for await (const part of parts) {
          if (part.type === 'file') {
            buffer = await part.toBuffer();
            mime = part.mimetype;
            filename = part.filename || filename;
          }
        }

        if (!buffer || !mime) {
          reply.code(400);
          return { success: false, error: 'Image file is required' };
        }

        const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
        if (!allowed.has(mime)) {
          reply.code(400);
          return { success: false, error: 'Unsupported image type' };
        }

        const maxBytes = 12 * 1024 * 1024;
        if (buffer.length > maxBytes) {
          reply.code(400);
          return { success: false, error: 'Image too large (max 12MB)' };
        }

        const quota = await checkTokenQuota(
          user.id,
          AI_TOKEN_COST_ESTIMATES.therapyNotesOcr.preCheck
        );
        if (!quota.hasQuota) {
          reply.code(403);
          return { success: false, error: quota.reason || 'Insufficient AI tokens' };
        }

        const plan = session.week.plan_json as any;
        const programs = Array.isArray(plan?.programs)
          ? plan.programs.map((p: any) => ({ id: String(p.id), name: String(p.name) }))
          : [];

        const b64 = buffer.toString('base64');
        const ocr = await extractTherapyNotesJsonFromImage({
          imageBase64: b64,
          mimeType: mime,
          expectedPrograms: programs,
        });

        if (!ocr) {
          reply.code(500);
          return {
            success: false,
            error:
              'OCR failed. Configure GEMINI_API_KEY (preferred) or OPENAI_API_KEY with vision support.',
          };
        }

        await updateTokenUsage(user.id, ocr.tokensUsed, {
          childId,
          feature: 'therapy_notes_ocr',
        });

        const fileSafe = safeFilename(filename, `child_${childId}_week_${weekId}`);
        const storagePath = `therapy-notes/${fileSafe}`;
        let publicUrl = '';

        if (supabaseClient && config.storage.supabaseStorageBucket) {
          const { error: uploadError } = await supabaseClient.storage
            .from(config.storage.supabaseStorageBucket)
            .upload(storagePath, buffer, { contentType: mime, upsert: false });
          if (uploadError) {
            throw new Error(`Failed to upload to storage: ${uploadError.message}`);
          }
          const { data: urlData } = supabaseClient.storage
            .from(config.storage.supabaseStorageBucket)
            .getPublicUrl(storagePath);
          publicUrl = urlData.publicUrl;
        } else {
          const diskPath = path.join(LOCAL_THERAPY_NOTES_DIR, fileSafe);
          await fs.writeFile(diskPath, buffer);
          publicUrl = `/uploads/therapy-notes/${fileSafe}`;
        }

        const updated = await prisma.$transaction(async (tx) => {
          const s = await tx.childAbaProgramSession.update({
            where: { id: session.id },
            data: {
              status: 'completed',
              completed_at: new Date(),
              upload_image_url: publicUrl,
              upload_mime: mime,
              ocr_parsed_json: ocr.json as any,
            },
          });
          await tx.childAbaProgramWeek.update({
            where: { id: weekId },
            data: {
              status: 'completed',
              therapy_notes_json: ocr.json as any,
            },
          });
          return s;
        });

        await recordLearningInsightForWeek(weekId);
        await syncParentLogForCompletedSession(updated.id);

        return {
          success: true,
          data: { session: updated, ocr: ocr.json, tokens_used: ocr.tokensUsed },
        };
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed OCR upload for ABA session');
        reply.code(500);
        return { success: false, error: formatErrorMessage(error, 'Failed OCR upload') };
      }
    }
  );
}
