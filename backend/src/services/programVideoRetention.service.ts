import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { deleteObject } from '../lib/privateMedia.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Delete practice-video FILES past retention: N days after an admin approved
 * or rejected them, or M days after upload if never reviewed. The database
 * row — AI analysis, admin edits, parent feedback — is kept; only the bytes go.
 */
export async function purgeExpiredProgramVideos(
  now: Date = new Date(),
): Promise<{ deleted: number; failed: number }> {
  const reviewedCutoff = new Date(now.getTime() - config.programVideos.retentionDays * DAY_MS);
  const unreviewedCutoff = new Date(now.getTime() - config.programVideos.unreviewedDays * DAY_MS);

  const due = await prisma.abaProgramVideo.findMany({
    where: {
      video_deleted_at: null,
      // Never pull a file out from under an analysis in progress.
      status: { not: 'analyzing' },
      OR: [
        { review_status: { in: ['approved', 'rejected'] }, reviewed_at: { lt: reviewedCutoff } },
        { review_status: 'pending', created_at: { lt: unreviewedCutoff } },
      ],
    },
    select: { id: true, storage_key: true },
    take: 500,
  });

  let deleted = 0;
  let failed = 0;
  for (const video of due) {
    try {
      await deleteObject(video.storage_key);
      await prisma.abaProgramVideo.update({
        where: { id: video.id },
        data: { video_deleted_at: now },
      });
      deleted += 1;
    } catch (err) {
      failed += 1;
      logger.error({ err, videoId: video.id }, 'Failed to delete expired practice video');
    }
  }

  if (deleted || failed) {
    logger.info({ deleted, failed }, 'Practice video retention run');
  }
  return { deleted, failed };
}
