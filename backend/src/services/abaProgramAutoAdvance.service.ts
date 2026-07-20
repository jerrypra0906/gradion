import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { EmailService, getEmailDeliveryStatus } from './email.service.js';
import { computeWeekProgramProgress } from './abaProgramProgress.service.js';
import { generateAbaWeekForChild, todayYmd } from './abaProgramGeneration.service.js';

export const AUTO_PROGRESS_GATE = 'auto_progress_gate';

/**
 * Children with an auto-advance generation currently in flight. Generation
 * takes 60-90s, so two sessions completing back-to-back must not both start
 * one (single-process guard; the week upsert stays the cross-process backstop).
 */
const inFlight = new Set<number>();

/**
 * Called after a practice session is recorded: when the completed week's
 * progress gate is achieved (avg >= 75% with every program run >= 3x, or
 * avg < 75% with every program run >= 6x), the NEXT weekly program is
 * generated automatically — the parent no longer has to click anything —
 * and the parent gets a celebration email. Best-effort: never throws.
 */
export async function maybeAutoAdvanceProgram(input: {
  childId: number;
  completedWeekId: number;
}): Promise<void> {
  const { childId, completedWeekId } = input;
  if (inFlight.has(childId)) return;

  try {
    const latestWeek = await prisma.childAbaProgramWeek.findFirst({
      where: { child_id: childId },
      orderBy: { week_start: 'desc' },
      include: { sessions: { orderBy: { started_at: 'desc' }, take: 50 } },
    });
    // Only advance from the newest program; if a newer one already exists the
    // parent is practicing an old week and there is nothing to do.
    if (!latestWeek || latestWeek.id !== completedWeekId) return;

    const progress = computeWeekProgramProgress(latestWeek);
    if (!progress?.can_generate_new) return;

    // The new program starts today; if the current one also started today
    // (an unusually intense practice day), wait for tomorrow's session so we
    // never overwrite the active plan.
    const start = todayYmd();
    const latestStartYmd = new Date(latestWeek.week_start).toISOString().slice(0, 10);
    if (start <= latestStartYmd) return;

    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: { parent: { select: { id: true, name: true, email: true } } },
    });
    if (!child) return;

    const planLang =
      (latestWeek.plan_json as { language?: string } | null)?.language === 'en' ? 'en' : 'id';

    inFlight.add(childId);
    logger.info(
      { childId, weekId: latestWeek.id, avgScore: progress.avg_score_pct, mode: progress.mode },
      'Progress gate achieved — auto-generating next weekly program'
    );

    try {
      const result = await generateAbaWeekForChild({
        childId,
        userId: child.parent_id,
        weekStartYmd: start,
        lang: planLang,
        generatedBy: AUTO_PROGRESS_GATE,
      });

      if (!result.ok) {
        logger.warn(
          { childId, error: result.error, code: result.code },
          'Auto-advance generation failed'
        );
        return;
      }

      logger.info(
        { childId, weekId: result.weekId, tokensUsed: result.tokensUsed },
        'Auto-generated next weekly program after progress gate'
      );

      await notifyParentProgressAchieved({
        parentEmail: child.parent?.email ?? null,
        parentName: child.parent?.name ?? null,
        childId,
        childName: child.name,
        avgScorePct: progress.avg_score_pct,
        mode: progress.mode,
      });
    } finally {
      inFlight.delete(childId);
    }
  } catch (err) {
    inFlight.delete(childId);
    logger.warn({ err, childId }, 'maybeAutoAdvanceProgram failed');
  }
}

/**
 * Celebration email: the family hit the practice targets and the next program
 * was generated automatically (pending admin review). Best-effort.
 */
async function notifyParentProgressAchieved(input: {
  parentEmail: string | null;
  parentName: string | null;
  childId: number;
  childName: string;
  avgScorePct: number | null;
  mode: 'advance' | 'reinforce';
}): Promise<void> {
  try {
    if (!getEmailDeliveryStatus().configured) return;
    if (!input.parentEmail || !input.parentEmail.trim()) return;

    const childUrl = `${config.frontendUrl}/dashboard/children/${input.childId}`;
    const scoreLine =
      input.avgScorePct !== null
        ? `<p style="font-size: 28px; font-weight: bold; color: #00A896; margin: 8px 0;">Rata-rata skor: ${input.avgScorePct}%</p>`
        : '';
    const modeLine =
      input.mode === 'advance'
        ? 'Karena hasilnya sangat baik, program baru berisi tantangan tahap berikutnya.'
        : 'Program lama akan dilanjutkan dengan tambahan latihan baru agar semakin lancar.';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00A896;">🎉 Selamat, ${input.parentName || 'Ayah/Bunda'}!</h2>
        <p><strong>${input.childName}</strong> telah mencapai target latihan minggu ini. Kerja keras Anda dan ananda membuahkan hasil — teruskan!</p>
        ${scoreLine}
        <div style="background-color: #e6f7f5; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00C1B2;">
          <p style="margin: 0;"><strong>Program tahap berikutnya sudah dibuat secara otomatis</strong> dan sedang ditinjau oleh tim Gradion. ${modeLine}</p>
          <p style="margin: 8px 0 0;">Program baru akan muncul di halaman ananda begitu disetujui — tidak ada yang perlu Anda lakukan.</p>
        </div>
        <p>
          <a href="${childUrl}"
             style="background-color: #00C1B2; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 8px 0;">
            Lihat halaman ananda
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Recovery is possible 💚 — Email otomatis dari Gradion.
        </p>
      </div>
    `;

    const emailService = new EmailService();
    await emailService.sendEmail({
      to: input.parentEmail,
      subject: `🎉 Target tercapai! Program baru untuk ${input.childName} sedang disiapkan`,
      html,
    });

    logger.info({ childId: input.childId }, 'Sent parent progress-achieved email');
  } catch (err) {
    logger.warn({ err, childId: input.childId }, 'Failed to send progress-achieved email');
  }
}
