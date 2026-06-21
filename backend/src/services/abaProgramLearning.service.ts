import { prisma } from '../lib/prisma.js';

type TrialStats = {
  independent: number;
  prompted: number;
  incorrect: number;
  total: number;
  accuracyPct: number;
};

function parseTrialString(raw: unknown): TrialStats {
  const s = String(raw ?? '');
  const tokens = s.split(/\s+/).filter(Boolean);
  let independent = 0;
  let prompted = 0;
  let incorrect = 0;
  for (const t of tokens) {
    if (t === '+') independent += 1;
    else if (t === 'p' || t === 'P') prompted += 1;
    else if (t === '-') incorrect += 1;
  }
  const total = independent + prompted + incorrect;
  const accuracyPct = total > 0 ? Math.round((independent / total) * 100) : 0;
  return { independent, prompted, incorrect, total, accuracyPct };
}

function summarizeTherapyNotes(notes: unknown): Record<string, unknown> {
  const n = notes as {
    rows?: Array<{
      program?: string;
      estimate_band?: string | null;
      trial_data?: string;
      remarks?: string;
    }>;
    summary?: string;
  } | null;

  const rows = Array.isArray(n?.rows) ? n.rows : [];
  const programSummaries = rows.map((r) => {
    const stats = parseTrialString(r.trial_data);
    return {
      program: r.program || 'unknown',
      estimate_band: r.estimate_band ?? null,
      accuracy_pct: stats.accuracyPct,
      prompted_rate_pct: stats.total > 0 ? Math.round((stats.prompted / stats.total) * 100) : 0,
      trial_count: stats.total,
      remarks: r.remarks || null,
    };
  });

  return {
    source: 'therapy_notes',
    program_summaries: programSummaries,
    summary: n?.summary || null,
  };
}

function summarizeGuidedResults(results: unknown): Record<string, unknown> {
  const r = results as {
    activities?: Array<{
      activity_id?: string;
      title?: string;
      trial_string?: string;
      linked_program_id?: string;
    }>;
  } | null;

  const acts = Array.isArray(r?.activities) ? r.activities : [];
  const activitySummaries = acts.map((a) => {
    const stats = parseTrialString(a.trial_string);
    return {
      activity_id: a.activity_id || null,
      title: a.title || null,
      linked_program_id: a.linked_program_id || null,
      accuracy_pct: stats.accuracyPct,
      prompted_rate_pct: stats.total > 0 ? Math.round((stats.prompted / stats.total) * 100) : 0,
      trial_count: stats.total,
    };
  });

  return {
    source: 'guided_results',
    activity_summaries: activitySummaries,
  };
}

export function computeLearningInsightFromWeek(input: {
  planJson?: unknown;
  therapyNotesJson?: unknown | null;
  guidedResultsJson?: unknown | null;
  mainstreamGoalMet?: boolean;
}): Record<string, unknown> {
  const plan = input.planJson as { programs?: Array<{ id?: string; name?: string }> } | null;
  const programs = Array.isArray(plan?.programs) ? plan.programs : [];

  let performance: Record<string, unknown>;
  if (input.therapyNotesJson) {
    performance = summarizeTherapyNotes(input.therapyNotesJson);
  } else if (input.guidedResultsJson) {
    performance = summarizeGuidedResults(input.guidedResultsJson);
  } else {
    performance = { source: 'none', note: 'No session results recorded for this week.' };
  }

  const recommendations: string[] = [];
  const perf = performance as Record<string, unknown>;
  const programSummaries = perf.program_summaries as
    | Array<{ program: string; accuracy_pct: number; prompted_rate_pct: number }>
    | undefined;
  const activitySummaries = perf.activity_summaries as
    | Array<{ title: string | null; accuracy_pct: number; prompted_rate_pct: number }>
    | undefined;

  if (Array.isArray(programSummaries)) {
    for (const s of programSummaries) {
      const label = s.program;
      if (s.accuracy_pct >= 80 && s.prompted_rate_pct <= 20) {
        recommendations.push(
          `${label}: strong performance (${s.accuracy_pct}% independent) — consider increasing difficulty or fading prompts.`
        );
      } else if (s.accuracy_pct >= 50) {
        recommendations.push(
          `${label}: moderate performance (${s.accuracy_pct}% independent) — maintain current target, reduce prompts gradually.`
        );
      } else if (s.accuracy_pct > 0) {
        recommendations.push(
          `${label}: low performance (${s.accuracy_pct}% independent) — simplify target, increase reinforcement, more prompting.`
        );
      }
    }
  }

  if (Array.isArray(activitySummaries)) {
    for (const s of activitySummaries) {
      const label = s.title || 'activity';
      if (s.accuracy_pct >= 80 && s.prompted_rate_pct <= 20) {
        recommendations.push(
          `${label}: strong performance (${s.accuracy_pct}% independent) — consider increasing difficulty or fading prompts.`
        );
      } else if (s.accuracy_pct >= 50) {
        recommendations.push(
          `${label}: moderate performance (${s.accuracy_pct}% independent) — maintain current target, reduce prompts gradually.`
        );
      } else if (s.accuracy_pct > 0) {
        recommendations.push(
          `${label}: low performance (${s.accuracy_pct}% independent) — simplify target, increase reinforcement, more prompting.`
        );
      }
    }
  }

  if (input.mainstreamGoalMet) {
    recommendations.push(
      'Mainstream readiness indicators met — consider reducing ABA intensity and focusing on generalization.'
    );
  }

  return {
    programs_in_plan: programs.map((p) => ({ id: p.id, name: p.name })),
    performance,
    recommendations,
    generated_at: new Date().toISOString(),
  };
}

export async function getClinicalReviewContextForChild(childId: number, take = 8) {
  const [logs, sessions] = await Promise.all([
    prisma.parentLog.findMany({
      where: {
        child_id: childId,
        therapist_comment: { not: null },
        status: { in: ['approved', 'flagged'] },
      },
      orderBy: { log_date: 'desc' },
      take,
      select: {
        id: true,
        status: true,
        therapist_comment: true,
        log_date: true,
        creator_role: true,
        skills_practiced: true,
      },
    }),
    prisma.session.findMany({
      where: {
        child_id: childId,
        parent_comment: { not: null },
        status: { in: ['approved', 'flagged'] },
      },
      orderBy: { date: 'desc' },
      take,
      select: {
        id: true,
        status: true,
        parent_comment: true,
        date: true,
        notes: true,
        goals_worked_on: true,
      },
    }),
  ]);

  const parent_log_reviews = logs
    .filter((l) => l.therapist_comment && l.therapist_comment.trim())
    .map((l) => ({
      id: l.id,
      status: l.status,
      comment: l.therapist_comment!.trim(),
      log_date: l.log_date,
      creator_role: l.creator_role,
      skills_practiced: l.skills_practiced,
    }));

  const session_reviews = sessions
    .filter((s) => s.parent_comment && s.parent_comment.trim())
    .map((s) => ({
      id: s.id,
      status: s.status,
      comment: s.parent_comment!.trim(),
      session_date: s.date,
      notes: s.notes,
      goals_worked_on: s.goals_worked_on,
    }));

  const flagged = [
    ...parent_log_reviews.filter((r) => r.status === 'flagged'),
    ...session_reviews.filter((r) => r.status === 'flagged'),
  ];

  return {
    parent_log_reviews,
    session_reviews,
    flagged_reviews: flagged,
    summary:
      flagged.length > 0
        ? `${flagged.length} flagged review(s) — prioritize addressing concerns in the next weekly plan.`
        : parent_log_reviews.length + session_reviews.length > 0
          ? 'Recent clinical/parent reviews available — incorporate feedback into program adjustments.'
          : 'No reviewed logs or sessions yet.',
  };
}

export async function getEnhancedLearningContextForChild(childId: number, take = 4) {
  const [insights, clinicalReviews] = await Promise.all([
    getLearningContextForChild(childId, take),
    getClinicalReviewContextForChild(childId, 8),
  ]);

  return {
    weekly_insights: insights,
    clinical_reviews: clinicalReviews,
  };
}

export async function recordLearningInsightForWeek(weekId: number) {
  const week = await prisma.childAbaProgramWeek.findUnique({
    where: { id: weekId },
    include: {
      sessions: {
        where: { status: 'completed' },
        orderBy: { completed_at: 'desc' },
        take: 5,
      },
    },
  });
  if (!week) return null;

  const guidedSession = week.sessions.find((s) => s.mode === 'guided' && s.guided_results_json);
  const insight = computeLearningInsightFromWeek({
    planJson: week.plan_json,
    therapyNotesJson: week.therapy_notes_json,
    guidedResultsJson: guidedSession?.guided_results_json,
    mainstreamGoalMet: week.mainstream_goal_met,
  });

  const existing = await prisma.abaProgramLearningInsight.findFirst({
    where: { week_id: weekId },
    orderBy: { created_at: 'desc' },
  });

  if (existing) {
    return prisma.abaProgramLearningInsight.update({
      where: { id: existing.id },
      data: { insight_json: insight as object },
    });
  }

  return prisma.abaProgramLearningInsight.create({
    data: {
      child_id: week.child_id,
      week_id: weekId,
      insight_json: insight as object,
    },
  });
}

export async function getLearningContextForChild(childId: number, take = 4) {
  const insights = await prisma.abaProgramLearningInsight.findMany({
    where: { child_id: childId },
    orderBy: { created_at: 'desc' },
    take,
    include: {
      week: { select: { week_start: true, mainstream_goal_met: true } },
    },
  });

  return insights.map((i) => ({
    week_start: i.week?.week_start ?? null,
    mainstream_goal_met: i.week?.mainstream_goal_met ?? false,
    insight: i.insight_json,
    recorded_at: i.created_at,
  }));
}

export async function getPreviousWeekSessionContext(prevWeekId: number) {
  const week = await prisma.childAbaProgramWeek.findUnique({
    where: { id: prevWeekId },
    include: {
      sessions: {
        where: { status: 'completed' },
        orderBy: { completed_at: 'desc' },
        take: 3,
      },
    },
  });
  if (!week) return null;

  const guided = week.sessions.find((s) => s.guided_results_json);
  return {
    week_start: week.week_start,
    therapy_notes_json: week.therapy_notes_json,
    guided_results_json: guided?.guided_results_json ?? null,
    plan_programs: (week.plan_json as { programs?: unknown })?.programs ?? null,
    mainstream_goal_met: week.mainstream_goal_met,
  };
}
