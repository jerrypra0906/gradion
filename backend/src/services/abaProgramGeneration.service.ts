import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  checkTokenQuota,
  hasAIAccess,
  updateTokenUsage,
} from './ai.service.js';
import { generateWeeklyAbaPlanJson } from './abaProgram.service.js';
import { listMasterPrograms, syncWeeklyPlanToMasterPrograms } from './abaMasterProgram.service.js';
import {
  buildObservationText,
  findSimilarAutismCases,
  syncAutismCaseFromWeeklyPlan,
} from './abaAutismCase.service.js';
import {
  getEnhancedLearningContextForChild,
  getPreviousWeekSessionContext,
} from './abaProgramLearning.service.js';

export function mondayWeekStartYmd(d: Date = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dayNum = String(monday.getDate()).padStart(2, '0');
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

  const estimated = 1400;
  const quota = await checkTokenQuota(input.userId, estimated);
  if (!quota.hasQuota) {
    return { ok: false, error: quota.reason || 'Insufficient AI tokens', code: 403 };
  }

  const masterPrograms = await listMasterPrograms({ language: input.lang, take: 120 });

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

  await updateTokenUsage(input.userId, ai.tokensUsed);

  const plan = await syncWeeklyPlanToMasterPrograms({
    planJson: ai.json as any,
    language: input.lang,
  });
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
      weekStartYmd: mondayWeekStartYmd(),
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
