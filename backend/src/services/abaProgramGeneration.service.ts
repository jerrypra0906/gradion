import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { AI_TOKEN_COST_ESTIMATES } from '../lib/aiTokenCosts.js';
import { logger } from '../utils/logger.js';
import {
  checkTokenQuota,
  hasAIAccess,
  updateTokenUsage,
} from './ai.service.js';
import { generateWeeklyAbaPlanJson, reconcileGuidedFlow } from './abaProgram.service.js';
import {
  getCurationLearningExamples,
  listMasterPrograms,
  syncWeeklyPlanToMasterPrograms,
} from './abaMasterProgram.service.js';
import {
  buildObservationText,
  findSimilarAutismCases,
  syncAutismCaseFromWeeklyPlan,
} from './abaAutismCase.service.js';
import {
  getEnhancedLearningContextForChild,
  getPreviousWeekSessionContext,
} from './abaProgramLearning.service.js';
import { computeWeekProgramProgress } from './abaProgramProgress.service.js';
import { notifyAdminsOfPendingAiContent } from './reviewNotification.service.js';

/** Programs run for 7 days from the day they are generated (not calendar weeks). */
export function todayYmd(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type GenerateAbaWeekResult =
  | { ok: true; weekId: number; tokensUsed: number; skipped?: false }
  | { ok: false; error: string; code?: number; skipped?: boolean };

/**
 * Generate (or refresh) a weekly ABA plan for a child.
 * Used by the ABA API route and auto-chained after initial assessment creation.
 */
export async function generateAbaWeekForChild(input: {
  childId: number;
  userId: number;
  weekStartYmd: string;
  lang: 'en' | 'id';
  /** Admins may start a new program before the progress thresholds are met. */
  bypassProgressGate?: boolean;
}): Promise<GenerateAbaWeekResult> {
  if (!config.features.ai) {
    return { ok: false, error: 'AI features are disabled', code: 503 };
  }

  const weekStart = parseYmd(input.weekStartYmd);
  if (!weekStart) {
    return { ok: false, error: 'Invalid week_start', code: 400 };
  }

  const access = await hasAIAccess(input.userId);
  if (!access.hasAccess) {
    return { ok: false, error: access.reason || 'AI access denied', code: 403 };
  }

  const child = await prisma.child.findUnique({ where: { id: input.childId } });
  if (!child) {
    return { ok: false, error: 'Child not found', code: 404 };
  }

  const assessmentMd =
    input.lang === 'id'
      ? child.initial_assessment_report_id || child.initial_assessment_report
      : child.initial_assessment_report || child.initial_assessment_report_id;

  if (!assessmentMd) {
    return {
      ok: false,
      error:
        'Initial assessment is missing. Generate the Initial Assessment on the child page first.',
      code: 400,
    };
  }

  // Starting a NEW program (a later week_start than the latest one) is gated on
  // recorded practice: avg score >= 75% with every program run >= 3 times, or
  // avg < 75% with every program run >= 6 times — in which case the old
  // programs carry over into the new plan. Refreshing the current program
  // (same week_start) is never gated.
  let carryOverPrograms: unknown | null = null;
  const latestWeek = await prisma.childAbaProgramWeek.findFirst({
    where: { child_id: input.childId },
    orderBy: { week_start: 'desc' },
    include: { sessions: { orderBy: { started_at: 'desc' }, take: 50 } },
  });
  if (latestWeek && weekStart.getTime() > new Date(latestWeek.week_start).getTime()) {
    const progress = computeWeekProgramProgress(latestWeek);
    if (progress) {
      if (!progress.can_generate_new && !input.bypassProgressGate) {
        const msg =
          input.lang === 'id'
            ? `Belum bisa membuat program baru. Setiap program perlu dijalankan minimal ${progress.required_executions}× ` +
              `(saat ini program yang paling jarang baru ${progress.min_executions}×${
                progress.avg_score_pct !== null ? `, rata-rata skor ${progress.avg_score_pct}%` : ''
              }). Lanjutkan latihan program saat ini dulu.`
            : `Not ready for a new program yet. Every program needs at least ${progress.required_executions} recorded runs ` +
              `(the least-practiced one has ${progress.min_executions}${
                progress.avg_score_pct !== null ? `; average score ${progress.avg_score_pct}%` : ''
              }). Keep practicing the current program first.`;
        return { ok: false, error: msg, code: 409 };
      }
      if (progress.mode === 'reinforce') {
        carryOverPrograms = (latestWeek.plan_json as { programs?: unknown[] } | null)?.programs ?? null;
      }
    }
  }

  const prevWeek = await prisma.childAbaProgramWeek.findFirst({
    where: { child_id: input.childId, week_start: { lt: weekStart }, status: 'completed' },
    orderBy: { week_start: 'desc' },
  });

  const priorWeekCount = await prisma.childAbaProgramWeek.count({
    where: { child_id: input.childId, status: 'completed' },
  });
  const isFirstProgram = priorWeekCount === 0;

  const prevSessionContext = prevWeek ? await getPreviousWeekSessionContext(prevWeek.id) : null;
  const learningInsights = await getEnhancedLearningContextForChild(input.childId, 4);

  const observationText = buildObservationText({
    initialObservation: child.initial_observation,
    assessmentMarkdown: assessmentMd,
    diagnosis: child.diagnosis,
    childName: child.name,
  });

  const similarCases = await findSimilarAutismCases({
    observationText,
    take: 5,
  });

  const goals = await prisma.goal.findMany({
    where: { child_id: input.childId, status: 'active' },
    select: { title: true, description: true, target_date: true },
    take: 10,
  });

  const estimated = AI_TOKEN_COST_ESTIMATES.weeklyAbaProgram.preCheck;
  const quota = await checkTokenQuota(input.userId, estimated);
  if (!quota.hasQuota) {
    return { ok: false, error: quota.reason || 'Insufficient AI tokens', code: 403 };
  }

  const [masterPrograms, curationExamples] = await Promise.all([
    listMasterPrograms({ language: input.lang, take: 120 }),
    getCurationLearningExamples({ language: input.lang, take: 6 }),
  ]);

  const ai = await generateWeeklyAbaPlanJson({
    language: input.lang,
    weekStartYmd: input.weekStartYmd,
    childName: child.name,
    diagnosis: child.diagnosis,
    assessmentMarkdown: assessmentMd,
    initialObservationJson: child.initial_observation,
    previousTherapyNotesJson:
      prevSessionContext?.therapy_notes_json ?? prevWeek?.therapy_notes_json ?? null,
    previousGuidedResultsJson: prevSessionContext?.guided_results_json ?? null,
    learningInsights,
    similarAutismCases: similarCases,
    masterPrograms,
    curationExamples,
    carryOverPrograms,
    isFirstProgram,
    statedGoals: goals,
    clinicalReviewComments: learningInsights?.clinical_reviews ?? null,
  });

  if (!ai) {
    return {
      ok: false,
      error: 'Failed to generate program. Configure GEMINI_API_KEY (preferred) or OPENAI_API_KEY.',
      code: 500,
    };
  }

  await updateTokenUsage(input.userId, ai.tokensUsed, {
    childId: input.childId,
    feature: 'weekly_program',
  });

  const syncedPlan = await syncWeeklyPlanToMasterPrograms({
    planJson: ai.json as any,
    language: input.lang,
  });
  // Sync can remap program ids; make sure every program keeps runnable
  // guided activities before the plan is stored.
  const { plan } = reconcileGuidedFlow(syncedPlan);
  const mainstream = Boolean(plan?.mainstream_goal_met);

  await syncAutismCaseFromWeeklyPlan({
    childId: input.childId,
    childName: child.name,
    language: input.lang,
    initialObservation: child.initial_observation,
    assessmentMarkdown: assessmentMd,
    diagnosis: child.diagnosis,
    planJson: plan,
    isFirstProgram,
  });

  const week = await prisma.childAbaProgramWeek.upsert({
    where: { child_id_week_start: { child_id: input.childId, week_start: weekStart } },
    create: {
      child_id: input.childId,
      week_start: weekStart,
      status: 'active',
      plan_json: plan as any,
      mainstream_goal_met: mainstream,
      review_status: 'pending',
    },
    update: {
      status: 'active',
      plan_json: plan as any,
      mainstream_goal_met: mainstream,
      review_status: 'pending',
      reviewed_at: null,
      reviewed_by: null,
    },
  });

  // Let admins know there's a new weekly program awaiting review (best-effort).
  void notifyAdminsOfPendingAiContent({
    kind: 'weekly_program',
    childId: input.childId,
    childName: child.name,
  });

  return { ok: true, weekId: week.id, tokensUsed: ai.tokensUsed };
}

/**
 * Best-effort: create the first weekly ABA plan when an assessment exists but no weeks yet.
 */
export async function ensureFirstAbaWeekForChild(input: {
  childId: number;
  userId: number;
  lang: 'en' | 'id';
}) {
  try {
    const existing = await prisma.childAbaProgramWeek.count({
      where: { child_id: input.childId },
    });
    if (existing > 0) {
      return { ok: true as const, skipped: true as const };
    }

    const result = await generateAbaWeekForChild({
      childId: input.childId,
      userId: input.userId,
      weekStartYmd: todayYmd(),
      lang: input.lang,
    });

    if (!result.ok) {
      logger.warn(
        { childId: input.childId, error: result.error, code: result.code },
        'Failed to auto-generate first ABA week after assessment',
      );
      return result;
    }

    logger.info(
      { childId: input.childId, weekId: result.weekId, tokensUsed: result.tokensUsed },
      'Auto-generated first ABA week after assessment',
    );
    return result;
  } catch (error: unknown) {
    logger.warn(
      { childId: input.childId, err: error },
      'Unexpected error auto-generating first ABA week',
    );
    return { ok: false as const, error: 'Failed to auto-generate first ABA week', code: 500 };
  }
}
