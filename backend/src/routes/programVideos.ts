import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { createReadStream, promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { formatErrorMessage } from '../utils/errorResponse.js';
import {
  createPlaybackUrl,
  createUploadTarget,
  deleteObject,
  localFilePath,
  privateMediaBackend,
  saveLocalStream,
  statObject,
  verifyStreamToken,
} from '../lib/privateMedia.js';
import {
  emptyReport,
  extractProgramTrials,
  kickProgramVideoWorker,
  loadProgramGuidance,
  normalizeReport,
} from '../services/programVideoAnalysis.service.js';
import { notifyParentOfVideoFeedback } from '../services/reviewNotification.service.js';

/** Base MIME types we accept, with the file extension used for storage. */
const ALLOWED_TYPES: Record<string, string> = {
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
};

/** "video/webm;codecs=vp9,opus" → "video/webm". */
function baseMime(mime: string): string {
  return String(mime || '').split(';')[0].trim().toLowerCase();
}

function maxBytes(): number {
  return config.programVideos.maxFileMb * 1024 * 1024;
}

const DELETABLE_BY_PARENT = new Set(['awaiting_upload', 'uploaded']);
const REVIEWABLE = new Set(['analyzed', 'manual_review']);

const initSchema = z.object({
  session_id: z.number().int().positive(),
  program_id: z.string().min(1).max(100),
  activity_id: z.string().max(100).nullable().optional(),
  source: z.enum(['recording', 'upload']),
  mime_type: z.string().min(1).max(120),
  file_size: z.number().int().positive(),
  duration_seconds: z.number().int().nonnegative().nullable().optional(),
  recording_started_at: z.number().int().positive().nullable().optional(),
});

const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  final_report: z.unknown(),
  feedback_text: z.string().max(5000).nullable().optional(),
  rejection_reason: z.string().max(2000).nullable().optional(),
});

function parentVideoDto(v: {
  id: number;
  program_id: string;
  activity_id: string | null;
  program_name: string;
  source: string;
  status: string;
  review_status: string;
  duration_seconds: number | null;
  file_size: number;
  created_at: Date;
}) {
  return {
    id: v.id,
    program_id: v.program_id,
    activity_id: v.activity_id,
    program_name: v.program_name,
    source: v.source,
    status: v.status,
    review_status: v.review_status,
    duration_seconds: v.duration_seconds,
    file_size: v.file_size,
    created_at: v.created_at,
  };
}

export async function programVideosRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  const staffOrParent = [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')];
  const adminOnly = [authenticate, requireRole('admin')];

  // ---------------------------------------------------------------------------
  // Parent: consent + limits
  // ---------------------------------------------------------------------------

  fastify.get('/me', { preHandler: staffOrParent }, async (request) => {
    const user = (request as AuthenticatedRequest).user!;
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { video_consent_at: true },
    });
    return {
      success: true,
      data: {
        consented: Boolean(row?.video_consent_at),
        consented_at: row?.video_consent_at ?? null,
        max_file_mb: config.programVideos.maxFileMb,
        max_duration_seconds: config.programVideos.maxDurationSeconds,
      },
    };
  });

  fastify.post('/consent', { preHandler: staffOrParent }, async (request) => {
    const user = (request as AuthenticatedRequest).user!;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { video_consent_at: new Date() },
      select: { video_consent_at: true },
    });
    return { success: true, data: { consented: true, consented_at: updated.video_consent_at } };
  });

  // ---------------------------------------------------------------------------
  // Parent: videos in a practice session
  // ---------------------------------------------------------------------------

  fastify.get('/session/:sessionId', { preHandler: staffOrParent }, async (request, reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const sessionId = parseInt((request.params as any).sessionId, 10);
    if (Number.isNaN(sessionId)) {
      reply.code(400);
      return { success: false, error: 'Invalid session id' };
    }
    const session = await prisma.childAbaProgramSession.findUnique({ where: { id: sessionId } });
    if (!session || (session.user_id !== user.id && user.role !== 'admin')) {
      reply.code(404);
      return { success: false, error: 'Session not found' };
    }
    const videos = await prisma.abaProgramVideo.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
    });
    return { success: true, data: { videos: videos.map(parentVideoDto) } };
  });

  /** Register a video and get where to upload it. Re-recording replaces the previous one. */
  fastify.post('/', { preHandler: staffOrParent }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user!;
      const parsed = initSchema.safeParse(request.body || {});
      if (!parsed.success) {
        reply.code(400);
        return { success: false, error: formatErrorMessage(parsed.error, 'Invalid input') };
      }
      const body = parsed.data;

      const consent = await prisma.user.findUnique({
        where: { id: user.id },
        select: { video_consent_at: true },
      });
      if (!consent?.video_consent_at) {
        reply.code(412);
        return { success: false, error: 'Video consent is required first', code: 'consent_required' };
      }

      const session = await prisma.childAbaProgramSession.findUnique({
        where: { id: body.session_id },
        include: { week: { select: { id: true, child_id: true, plan_json: true } } },
      });
      if (!session || session.user_id !== user.id) {
        reply.code(404);
        return { success: false, error: 'Session not found' };
      }
      if (session.mode !== 'guided') {
        reply.code(400);
        return { success: false, error: 'Videos can only be added to a guided practice session' };
      }
      if (session.status !== 'in_progress') {
        reply.code(409);
        return { success: false, error: 'This practice session has already been submitted' };
      }

      const programs = (session.week.plan_json as { programs?: any[] } | null)?.programs;
      const program = Array.isArray(programs)
        ? programs.find((p) => String(p?.id) === body.program_id)
        : null;
      if (!program) {
        reply.code(400);
        return { success: false, error: 'Program not found in this weekly plan' };
      }

      const mime = baseMime(body.mime_type);
      const ext = ALLOWED_TYPES[mime];
      if (!ext) {
        reply.code(400);
        return { success: false, error: 'Unsupported video type. Use MP4, WebM or MOV.' };
      }
      if (body.file_size > maxBytes()) {
        reply.code(413);
        return {
          success: false,
          error: `Video is too large (max ${config.programVideos.maxFileMb} MB).`,
        };
      }
      if (
        body.duration_seconds != null &&
        body.duration_seconds > config.programVideos.maxDurationSeconds
      ) {
        reply.code(400);
        return {
          success: false,
          error: `Video is too long (max ${Math.round(config.programVideos.maxDurationSeconds / 60)} minutes).`,
        };
      }

      // One video per program per practice run: a new one replaces a not-yet-submitted one.
      const existing = await prisma.abaProgramVideo.findUnique({
        where: { session_id_program_id: { session_id: session.id, program_id: body.program_id } },
      });
      if (existing) {
        if (!DELETABLE_BY_PARENT.has(existing.status)) {
          reply.code(409);
          return { success: false, error: 'A video for this program is already being processed' };
        }
        await deleteObject(existing.storage_key).catch((err) =>
          logger.warn({ err, videoId: existing.id }, 'Failed to delete replaced practice video'),
        );
        await prisma.abaProgramVideo.delete({ where: { id: existing.id } });
      }

      const safeProgram = body.program_id.replace(/[^a-zA-Z0-9_-]/g, '');
      const key = `program-videos/${session.week.child_id}/${session.id}-${safeProgram}-${randomUUID()}.${ext}`;

      const video = await prisma.abaProgramVideo.create({
        data: {
          child_id: session.week.child_id,
          week_id: session.week.id,
          session_id: session.id,
          program_id: body.program_id,
          activity_id: body.activity_id ?? null,
          program_name: String(program.name ?? 'Program').slice(0, 200),
          uploader_id: user.id,
          source: body.source,
          storage_backend: privateMediaBackend(),
          storage_key: key,
          mime_type: mime,
          file_size: body.file_size,
          duration_seconds: body.duration_seconds ?? null,
          recording_started_at: body.recording_started_at ? new Date(body.recording_started_at) : null,
        },
      });

      const target = await createUploadTarget({
        key,
        contentType: mime,
        contentLength: body.file_size,
      });

      return {
        success: true,
        data: {
          video: parentVideoDto(video),
          upload:
            target.kind === 's3'
              ? { kind: 's3', method: target.method, url: target.url, headers: target.headers }
              : { kind: 'local', method: 'POST', path: `/program-videos/${video.id}/file` },
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to start practice video upload');
      reply.code(500);
      return { success: false, error: formatErrorMessage(error, 'Failed to start upload') };
    }
  });

  /** Local-storage upload path (no S3 bucket configured): stream the file to disk. */
  fastify.post('/:id/file', { preHandler: staffOrParent }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user!;
      const id = parseInt((request.params as any).id, 10);
      const video = Number.isNaN(id) ? null : await prisma.abaProgramVideo.findUnique({ where: { id } });
      if (!video || video.uploader_id !== user.id) {
        reply.code(404);
        return { success: false, error: 'Video not found' };
      }
      if (video.storage_backend !== 'local' || video.status !== 'awaiting_upload') {
        reply.code(409);
        return { success: false, error: 'This video is not waiting for a local upload' };
      }

      const data = await request.file({ limits: { fileSize: maxBytes() } });
      if (!data) {
        reply.code(400);
        return { success: false, error: 'No file uploaded' };
      }
      await saveLocalStream(video.storage_key, data.file, maxBytes());
      if (data.file.truncated) {
        await deleteObject(video.storage_key).catch(() => {});
        reply.code(413);
        return { success: false, error: `Video is too large (max ${config.programVideos.maxFileMb} MB).` };
      }
      return { success: true, data: { stored: true } };
    } catch (error) {
      logger.error({ err: error }, 'Failed to store practice video locally');
      reply.code(500);
      return { success: false, error: formatErrorMessage(error, 'Failed to upload video') };
    }
  });

  /** Confirm the file landed. Queues analysis now if the session was already submitted. */
  fastify.post('/:id/complete', { preHandler: staffOrParent }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user!;
      const id = parseInt((request.params as any).id, 10);
      const video = Number.isNaN(id)
        ? null
        : await prisma.abaProgramVideo.findUnique({ where: { id }, include: { session: true } });
      if (!video || video.uploader_id !== user.id) {
        reply.code(404);
        return { success: false, error: 'Video not found' };
      }
      if (video.status !== 'awaiting_upload') {
        return { success: true, data: { video: parentVideoDto(video) } };
      }

      const stat = await statObject(video.storage_key);
      if (!stat.exists || !stat.size) {
        reply.code(409);
        return { success: false, error: 'The upload did not finish. Please try again.' };
      }

      const nextStatus = video.session.status === 'completed' ? 'queued' : 'uploaded';
      const updated = await prisma.abaProgramVideo.update({
        where: { id: video.id },
        data: { status: nextStatus, file_size: stat.size },
      });
      if (nextStatus === 'queued') kickProgramVideoWorker();

      return { success: true, data: { video: parentVideoDto(updated) } };
    } catch (error) {
      logger.error({ err: error }, 'Failed to confirm practice video upload');
      reply.code(500);
      return { success: false, error: formatErrorMessage(error, 'Failed to confirm upload') };
    }
  });

  /** Parent removes a video before the session is submitted. */
  fastify.delete('/:id', { preHandler: staffOrParent }, async (request, reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const id = parseInt((request.params as any).id, 10);
    const video = Number.isNaN(id)
      ? null
      : await prisma.abaProgramVideo.findUnique({ where: { id }, include: { session: true } });
    if (!video || video.uploader_id !== user.id) {
      reply.code(404);
      return { success: false, error: 'Video not found' };
    }
    if (!DELETABLE_BY_PARENT.has(video.status) || video.session.status !== 'in_progress') {
      reply.code(409);
      return { success: false, error: 'This video has already been submitted for review' };
    }
    await deleteObject(video.storage_key).catch((err) =>
      logger.warn({ err, videoId: video.id }, 'Failed to delete practice video file'),
    );
    await prisma.abaProgramVideo.delete({ where: { id: video.id } });
    return { success: true, data: { deleted: true } };
  });

  // ---------------------------------------------------------------------------
  // Playback for local storage (S3 uses presigned URLs instead). A <video>
  // element cannot send the Authorization header, so access is a short-lived
  // signed token in the URL. Supports Range requests so seeking works.
  // ---------------------------------------------------------------------------

  fastify.get('/stream/:id', async (request, reply) => {
    const id = parseInt((request.params as any).id, 10);
    const token = String((request.query as any)?.token || '');
    if (Number.isNaN(id) || !token || !verifyStreamToken(token, id)) {
      reply.code(403);
      return { success: false, error: 'Invalid or expired link' };
    }
    const video = await prisma.abaProgramVideo.findUnique({ where: { id } });
    if (!video || video.storage_backend !== 'local' || video.video_deleted_at) {
      reply.code(404);
      return { success: false, error: 'Video not found' };
    }

    const filePath = localFilePath(video.storage_key);
    let total: number;
    try {
      total = (await fs.stat(filePath)).size;
    } catch {
      reply.code(404);
      return { success: false, error: 'Video file missing' };
    }

    reply.header('Accept-Ranges', 'bytes');
    reply.header('Content-Type', video.mime_type);
    reply.header('Cache-Control', 'private, no-store');

    const range = request.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      let start = 0;
      let end = total - 1;
      if (m && m[1]) {
        start = parseInt(m[1], 10);
        if (m[2]) end = parseInt(m[2], 10);
      } else if (m && m[2]) {
        start = Math.max(0, total - parseInt(m[2], 10)); // suffix range: last N bytes
      }
      end = Math.min(end, total - 1);
      if (!m || Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
        reply.code(416).header('Content-Range', `bytes */${total}`);
        return reply.send();
      }
      reply.code(206);
      reply.header('Content-Range', `bytes ${start}-${end}/${total}`);
      reply.header('Content-Length', end - start + 1);
      return reply.send(createReadStream(filePath, { start, end }));
    }

    reply.header('Content-Length', total);
    return reply.send(createReadStream(filePath));
  });

  // ---------------------------------------------------------------------------
  // Admin: video validation
  // ---------------------------------------------------------------------------

  fastify.get('/admin/videos', { preHandler: adminOnly }, async (request) => {
    const q = (request.query || {}) as { review_status?: string };
    const filter =
      q.review_status === 'approved' || q.review_status === 'rejected' || q.review_status === 'all'
        ? q.review_status
        : 'pending';

    const where =
      filter === 'all'
        ? { status: { in: ['queued', 'analyzing', 'analyzed', 'manual_review'] as any } }
        : filter === 'pending'
          ? {
              review_status: 'pending' as const,
              status: { in: ['queued', 'analyzing', 'analyzed', 'manual_review'] as any },
            }
          : { review_status: filter as 'approved' | 'rejected' };

    const [videos, counts, agreementRows] = await Promise.all([
      prisma.abaProgramVideo.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 200,
        include: {
          child: { select: { id: true, name: true } },
          uploader: { select: { id: true, name: true } },
        },
      }),
      prisma.abaProgramVideo.groupBy({
        by: ['review_status', 'status'],
        _count: { _all: true },
      }),
      prisma.abaProgramVideoReviewEdit.findMany({
        where: {
          score_delta: { not: null },
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { score_delta: true },
      }),
    ]);

    const countOf = (pred: (r: (typeof counts)[number]) => boolean) =>
      counts.filter(pred).reduce((sum, r) => sum + r._count._all, 0);
    const deltas = agreementRows.map((r) => Math.abs(r.score_delta ?? 0));

    return {
      success: true,
      data: {
        videos: videos.map((v) => ({
          id: v.id,
          child: v.child,
          uploader: v.uploader,
          program_id: v.program_id,
          program_name: v.program_name,
          source: v.source,
          status: v.status,
          review_status: v.review_status,
          ai_score: v.ai_score,
          final_score: v.final_score,
          ai_error: v.ai_error,
          duration_seconds: v.duration_seconds,
          created_at: v.created_at,
          analyzed_at: v.analyzed_at,
          reviewed_at: v.reviewed_at,
          video_deleted_at: v.video_deleted_at,
        })),
        stats: {
          awaiting_review: countOf(
            (r) => r.review_status === 'pending' && (r.status === 'analyzed' || r.status === 'manual_review'),
          ),
          processing: countOf((r) => r.status === 'queued' || r.status === 'analyzing'),
          approved: countOf((r) => r.review_status === 'approved'),
          rejected: countOf((r) => r.review_status === 'rejected'),
          agreement_30d: {
            reviews: deltas.length,
            mean_abs_score_gap: deltas.length
              ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10
              : null,
            within_10_points_pct: deltas.length
              ? Math.round((deltas.filter((d) => d <= 10).length / deltas.length) * 100)
              : null,
          },
        },
      },
    };
  });

  fastify.get('/admin/videos/:id', { preHandler: adminOnly }, async (request, reply) => {
    const id = parseInt((request.params as any).id, 10);
    const video = Number.isNaN(id)
      ? null
      : await prisma.abaProgramVideo.findUnique({
          where: { id },
          include: {
            child: { select: { id: true, name: true } },
            uploader: { select: { id: true, name: true, email: true } },
            week: { select: { id: true, week_start: true, plan_json: true } },
            session: { select: { id: true, started_at: true, completed_at: true, guided_results_json: true } },
            reviewEdits: {
              orderBy: { created_at: 'desc' },
              take: 20,
              include: { editor: { select: { name: true } } },
            },
          },
        });
    if (!video) {
      reply.code(404);
      return { success: false, error: 'Video not found' };
    }

    const guidance = await loadProgramGuidance(video.week.plan_json, video.program_id);
    const startMs = video.recording_started_at?.getTime() ?? null;
    const aligned = video.source === 'recording' && startMs !== null;
    const trials = extractProgramTrials(video.session.guided_results_json, video.program_id).map(
      (t, i) => ({
        index: i + 1,
        result: t.result,
        phase_or_target: t.phase_or_target,
        offset_seconds: aligned && t.at !== null ? Math.round((t.at - startMs!) / 1000) : null,
      }),
    );

    const fallbackSteps = guidance?.steps.length ? guidance.steps : guidance?.guided_activity_steps ?? [];
    const report = normalizeReport(
      video.final_report_json ?? video.ai_report_json ?? emptyReport(fallbackSteps),
    );

    const playable = !video.video_deleted_at && video.status !== 'awaiting_upload';
    const playbackUrl = playable
      ? await createPlaybackUrl({
          videoId: video.id,
          key: video.storage_key,
          backend: video.storage_backend,
        }).catch((err) => {
          logger.warn({ err, videoId: video.id }, 'Failed to create playback URL');
          return null;
        })
      : null;

    return {
      success: true,
      data: {
        video: {
          id: video.id,
          child: video.child,
          uploader: video.uploader,
          program_id: video.program_id,
          program_name: video.program_name,
          source: video.source,
          mime_type: video.mime_type,
          file_size: video.file_size,
          duration_seconds: video.duration_seconds,
          status: video.status,
          review_status: video.review_status,
          ai_score: video.ai_score,
          ai_model: video.ai_model,
          ai_error: video.ai_error,
          final_score: video.final_score,
          feedback_text: video.feedback_text,
          rejection_reason: video.rejection_reason,
          created_at: video.created_at,
          analyzed_at: video.analyzed_at,
          reviewed_at: video.reviewed_at,
          video_deleted_at: video.video_deleted_at,
          week_start: video.week.week_start,
          session_started_at: video.session.started_at,
          session_completed_at: video.session.completed_at,
        },
        guidance,
        trials,
        ai_report: video.ai_report_json ? normalizeReport(video.ai_report_json) : null,
        report,
        playback_url: playbackUrl,
        history: video.reviewEdits.map((e) => ({
          id: e.id,
          editor: e.editor?.name ?? null,
          decision: e.decision,
          score_delta: e.score_delta,
          created_at: e.created_at,
        })),
      },
    };
  });

  fastify.post('/admin/videos/:id/review', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user!;
      const id = parseInt((request.params as any).id, 10);
      const parsed = reviewSchema.safeParse(request.body || {});
      if (Number.isNaN(id) || !parsed.success) {
        reply.code(400);
        return {
          success: false,
          error: parsed.success ? 'Invalid id' : formatErrorMessage(parsed.error, 'Invalid input'),
        };
      }
      const body = parsed.data;

      const video = await prisma.abaProgramVideo.findUnique({
        where: { id },
        include: { week: { select: { plan_json: true } } },
      });
      if (!video) {
        reply.code(404);
        return { success: false, error: 'Video not found' };
      }
      if (!REVIEWABLE.has(video.status)) {
        reply.code(409);
        return { success: false, error: 'This video is still being processed' };
      }

      const finalReport = normalizeReport(body.final_report);
      const feedback = (body.feedback_text ?? finalReport.parent_feedback ?? '').trim();
      const rejectionReason = (body.rejection_reason ?? '').trim();
      if (body.decision === 'approved' && !feedback) {
        reply.code(400);
        return { success: false, error: 'Feedback for the parent is required to approve' };
      }
      if (body.decision === 'rejected' && !rejectionReason) {
        reply.code(400);
        return { success: false, error: 'A reason is required to reject' };
      }

      const firstApproval = body.decision === 'approved' && video.review_status !== 'approved';
      const language =
        (video.week.plan_json as { language?: string } | null)?.language === 'en' ? 'en' : 'id';

      const updated = await prisma.$transaction(async (tx) => {
        const v = await tx.abaProgramVideo.update({
          where: { id },
          data: {
            review_status: body.decision,
            final_report_json: finalReport as any,
            final_score: finalReport.overall_score,
            feedback_text: body.decision === 'approved' ? feedback : null,
            rejection_reason: body.decision === 'rejected' ? rejectionReason : null,
            reviewed_by: user.id,
            reviewed_at: new Date(),
          },
        });
        // Every review is a learning signal — agreement counts as much as a correction.
        await tx.abaProgramVideoReviewEdit.create({
          data: {
            video_id: id,
            program_id: video.program_id,
            program_name: video.program_name,
            language,
            editor_id: user.id,
            decision: body.decision,
            ai_json: { score: video.ai_score, report: video.ai_report_json ?? null } as any,
            admin_json: {
              score: finalReport.overall_score,
              report: finalReport,
              feedback_text: body.decision === 'approved' ? feedback : null,
              rejection_reason: body.decision === 'rejected' ? rejectionReason : null,
            } as any,
            score_delta:
              video.ai_score !== null ? finalReport.overall_score - video.ai_score : null,
          },
        });
        return v;
      });

      if (firstApproval) {
        void notifyParentOfVideoFeedback({ childId: video.child_id, programName: video.program_name });
      }

      return { success: true, data: { video: { id: updated.id, review_status: updated.review_status } } };
    } catch (error) {
      logger.error({ err: error }, 'Failed to review practice video');
      reply.code(500);
      return { success: false, error: formatErrorMessage(error, 'Failed to save review') };
    }
  });

  /** Re-run the AI (e.g. after a failure). Not billed to the family again. */
  fastify.post('/admin/videos/:id/reanalyze', { preHandler: adminOnly }, async (request, reply) => {
    const id = parseInt((request.params as any).id, 10);
    const video = Number.isNaN(id) ? null : await prisma.abaProgramVideo.findUnique({ where: { id } });
    if (!video) {
      reply.code(404);
      return { success: false, error: 'Video not found' };
    }
    if (video.video_deleted_at) {
      reply.code(409);
      return { success: false, error: 'The video file has already been deleted' };
    }
    if (!REVIEWABLE.has(video.status)) {
      reply.code(409);
      return { success: false, error: 'This video is still being processed' };
    }
    await prisma.abaProgramVideo.update({
      where: { id },
      data: { status: 'queued', ai_error: null },
    });
    kickProgramVideoWorker();
    return { success: true, data: { queued: true } };
  });
}
