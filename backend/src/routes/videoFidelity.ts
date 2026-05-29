import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  ensureLocalUploadDirs,
  resolveLocalFilePath,
  uploadObject,
} from '../lib/storage.js';
import {
  hasAIAccess,
  checkTokenQuota,
  updateTokenUsage,
} from '../services/ai.service.js';
import { analyzeSessionVideo } from '../services/videoFidelity.service.js';

const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

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

export async function videoFidelityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  await ensureLocalUploadDirs();

  fastify.post(
    '/',
    {
      preHandler: [
        authenticate,
        requireRole('parent', 'therapist', 'consultant', 'admin'),
      ],
    },
    async (request, reply) => {
      if (!config.features.videoFidelity) {
        reply.code(503);
        return { success: false, error: 'Video fidelity is disabled' };
      }
      if (!config.ai.geminiApiKey) {
        reply.code(503);
        return { success: false, error: 'GEMINI_API_KEY is not configured on the server' };
      }

      const user = (request as AuthenticatedRequest).user!;

      const fields: Record<string, string> = {};
      let buffer: Buffer | null = null;
      let mimeType = '';
      let filename = 'clip.mp4';

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          buffer = await part.toBuffer();
          mimeType = part.mimetype;
          filename = part.filename || filename;
        } else {
          fields[part.fieldname] = String(part.value ?? '');
        }
      }

      if (!buffer || !mimeType) {
        reply.code(400);
        return { success: false, error: 'Video file is required' };
      }

      if (!ALLOWED_VIDEO_TYPES.has(mimeType)) {
        reply.code(400);
        return {
          success: false,
          error: `Unsupported video type: ${mimeType}. Use MP4, WebM, or MOV.`,
        };
      }

      const maxBytes = config.ai.videoMaxFileMb * 1024 * 1024;
      if (buffer.length > maxBytes) {
        reply.code(400);
        return {
          success: false,
          error: `File too large. Maximum size is ${config.ai.videoMaxFileMb}MB.`,
        };
      }

      const childId = parseInt(fields.child_id || '', 10);
      if (Number.isNaN(childId) || childId < 1) {
        reply.code(400);
        return { success: false, error: 'child_id is required' };
      }

      const okChild = await canAccessChild(user, childId);
      if (!okChild) {
        reply.code(403);
        return { success: false, error: 'Forbidden' };
      }

      const ai = await hasAIAccess(user.id);
      if (!ai.hasAccess) {
        reply.code(403);
        return {
          success: false,
          error: ai.reason || 'AI features require an eligible subscription (Pro / Premium / trial).',
        };
      }

      const quota = await checkTokenQuota(user.id, config.ai.videoMinTokenCharge);
      if (!quota.hasQuota) {
        reply.code(402);
        return {
          success: false,
          error: quota.reason || 'Insufficient AI tokens for video analysis.',
        };
      }

      let goalId: number | null = null;
      if (fields.goal_id) {
        const g = parseInt(fields.goal_id, 10);
        if (!Number.isNaN(g) && g > 0) {
          const goal = await prisma.goal.findFirst({
            where: { id: g, child_id: childId },
          });
          if (!goal) {
            reply.code(400);
            return { success: false, error: 'goal_id does not match this child' };
          }
          goalId = g;
        }
      }

      const abcContext = fields.abc_context?.trim() || null;
      const ext = path.extname(filename) || (mimeType === 'video/quicktime' ? '.mov' : '.mp4');
      const storageName = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;
      const storagePath = `videos/${storageName}`;

      await uploadObject({
        key: storagePath,
        body: buffer,
        contentType: mimeType,
      });

      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: { name: true },
      });

      let goalSummary: string | null = null;
      if (goalId) {
        const g = await prisma.goal.findUnique({
          where: { id: goalId },
          select: { title: true, description: true },
        });
        goalSummary = g ? `${g.title}${g.description ? ` — ${g.description}` : ''}` : null;
      }

      const job = await prisma.videoFidelityJob.create({
        data: {
          child_id: childId,
          user_id: user.id,
          goal_id: goalId,
          storage_path: storagePath,
          mime_type: mimeType,
          file_size: buffer.length,
          abc_context: abcContext,
          status: 'processing',
        },
      });

      try {
        const localFile = await resolveLocalFilePath(storagePath);
        try {
          const { report, tokensUsed } = await analyzeSessionVideo({
            filePath: localFile.path,
            mimeType,
            childName: child?.name || 'Child',
            abcContext,
            goalSummary,
          });

          await updateTokenUsage(user.id, Math.max(tokensUsed, 1));

          const updated = await prisma.videoFidelityJob.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              result_json: report as object,
              tokens_used: tokensUsed,
            },
          });

          return {
            success: true,
            data: updated,
          };
        } finally {
          await localFile.cleanup();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        logger.error({ err, jobId: job.id }, 'Video fidelity analysis failed');

        await prisma.videoFidelityJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error_message: message,
          },
        });

        reply.code(500);
        return {
          success: false,
          error: message,
        };
      }
    }
  );

  fastify.get(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { child_id } = request.query as { child_id?: string };
      const cid = child_id ? parseInt(child_id, 10) : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let where: any = {};

      if (cid !== null && !Number.isNaN(cid)) {
        const allowed = await canAccessChild(user, cid);
        if (!allowed) {
          reply.code(403);
          return { success: false, error: 'Forbidden' };
        }
        where = { child_id: cid };
      } else if (user.role === 'parent') {
        where = { child: { parent_id: user.id } };
      } else if (isAssignedStaff(user.role)) {
        const assigned = await prisma.therapistChild.findMany({
          where: { therapist_id: user.id },
          select: { child_id: true },
        });
        const ids = assigned.map((a) => a.child_id);
        if (ids.length === 0) {
          return { success: true, data: [] };
        }
        where = { child_id: { in: ids } };
      } else if (user.role !== 'admin') {
        reply.code(403);
        return { success: false, error: 'Forbidden' };
      }

      const list = await prisma.videoFidelityJob.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          child: { select: { id: true, name: true } },
          goal: { select: { id: true, title: true } },
        },
      });

      return { success: true, data: list };
    }
  );

  fastify.get(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const jobId = parseInt(id, 10);
      if (Number.isNaN(jobId)) {
        reply.code(400);
        return { success: false, error: 'Invalid id' };
      }

      const job = await prisma.videoFidelityJob.findUnique({
        where: { id: jobId },
        include: {
          child: { select: { id: true, name: true, parent_id: true } },
          goal: { select: { id: true, title: true } },
        },
      });

      if (!job) {
        reply.code(404);
        return { success: false, error: 'Not found' };
      }

      const allowed = await canAccessChild(user, job.child_id);
      if (!allowed) {
        reply.code(403);
        return { success: false, error: 'Forbidden' };
      }

      return { success: true, data: job };
    }
  );
}
