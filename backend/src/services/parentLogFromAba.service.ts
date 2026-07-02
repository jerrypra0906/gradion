import type {
  Child,
  ChildAbaProgramSession,
  ChildAbaProgramWeek,
  ParentLog,
  Role,
  User,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

const DEFAULT_ACTIVITY_SECONDS = 600;
const MIN_LOG_DURATION_HOURS = 0.25;

type SkillEntry = { name: string; rating: number; target?: string; trial_data?: string; domain?: string };

function mondayWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diff);
  return monday;
}

function nextMonday(d: Date): Date {
  const start = mondayWeekStart(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

function activityDurationSeconds(activity: any): number {
  const dur = Number(activity?.duration_seconds);
  if (Number.isFinite(dur) && dur > 0) return dur;
  const timer = Number(activity?.timer_seconds);
  if (Number.isFinite(timer) && timer > 0) return timer;
  return DEFAULT_ACTIVITY_SECONDS;
}

function buildActivityIndex(plan: any): Map<string, any> {
  const map = new Map<string, any>();
  const flow = Array.isArray(plan?.daily_guided_flow) ? plan.daily_guided_flow : [];
  for (const row of flow) {
    for (const act of row?.activities || []) {
      if (act?.id != null) map.set(String(act.id), act);
    }
  }
  return map;
}

function buildProgramIndex(plan: any): Map<string, any> {
  const map = new Map<string, any>();
  for (const p of plan?.programs || []) {
    if (p?.id != null) map.set(String(p.id), p);
  }
  return map;
}

function trialStringFromSets(trialSets: any[]): string {
  const parts: string[] = [];
  for (const set of trialSets || []) {
    const data = String(set?.trial_data || '').trim();
    if (data) parts.push(data);
  }
  return parts.join(' ');
}

function parseTitleParts(title: string): { programName: string; target?: string } {
  const parts = title.split(':');
  if (parts.length >= 2) {
    return {
      programName: parts[0].trim(),
      target: parts.slice(1).join(':').trim() || undefined,
    };
  }
  return { programName: title.trim() };
}

function resolveGuidedActivityDisplay(
  activityResult: any,
  plan: any
): { name: string; target?: string; domain?: string; trial_data: string } {
  const activityIndex = buildActivityIndex(plan);
  const programIndex = buildProgramIndex(plan);

  const actId = activityResult?.activity_id ? String(activityResult.activity_id) : '';
  const linkedId = activityResult?.linked_program_id ? String(activityResult.linked_program_id) : '';
  const act = actId ? activityIndex.get(actId) : null;
  const prog = linkedId ? programIndex.get(linkedId) : null;
  const trial_data = trialStringFromSets(activityResult?.trial_sets);
  const phaseTarget = activityResult?.trial_sets?.[0]?.phase_or_target
    ? String(activityResult.trial_sets[0].phase_or_target)
    : undefined;

  if (prog?.name) {
    return {
      name: String(prog.name),
      domain: prog.domain ? String(prog.domain) : undefined,
      target: phaseTarget,
      trial_data,
    };
  }

  if (act?.title) {
    const parsed = parseTitleParts(String(act.title));
    let domain = prog?.domain ? String(prog.domain) : undefined;
    if (!domain && Array.isArray(plan?.programs)) {
      const byName = plan.programs.find(
        (p: any) => p?.name && String(p.name).toLowerCase() === parsed.programName.toLowerCase()
      );
      if (byName?.domain) domain = String(byName.domain);
    }
    return {
      name: parsed.programName,
      domain,
      target: phaseTarget || parsed.target,
      trial_data,
    };
  }

  return {
    name: linkedId && !linkedId.startsWith('mp_') ? linkedId : 'Home program',
    target: phaseTarget,
    trial_data,
  };
}

function formatAccuracyLabel(stats: { independent: number; total: number }, language: 'en' | 'id'): string {
  if (stats.total <= 0) return '';
  return language === 'id'
    ? `${stats.independent}/${stats.total} mandiri`
    : `${stats.independent}/${stats.total} independent`;
}

function trialStatsFromData(trialData: string) {
  const tokens = trialData.split(/\s+/).filter(Boolean);
  const independent = tokens.filter((t) => t === '+').length;
  return { independent, total: tokens.length };
}

function buildActivitiesSummaryHuman(session: ChildAbaProgramSession, plan: any, language: 'en' | 'id'): string {
  const prefix =
    language === 'id'
      ? session.mode === 'upload'
        ? 'Sesi program ABA (unggah catatan)'
        : 'Sesi program ABA terpandu'
      : session.mode === 'upload'
        ? 'ABA program session (uploaded notes)'
        : 'ABA guided program session';

  if (session.mode === 'guided') {
    const activities = Array.isArray((session.guided_results_json as any)?.activities)
      ? (session.guided_results_json as any).activities
      : [];
    const parts = activities.map((a: any) => {
      const display = resolveGuidedActivityDisplay(a, plan);
      const stats = trialStatsFromData(display.trial_data);
      const acc = formatAccuracyLabel(stats, language);
      if (display.target && acc) return `${display.name} — ${display.target} (${acc})`;
      if (acc) return `${display.name} (${acc})`;
      return display.name;
    });
    return parts.length ? `${prefix}: ${parts.join('; ')}` : prefix;
  }

  const ocr = session.ocr_parsed_json as any;
  if (typeof ocr?.summary === 'string' && ocr.summary.trim()) {
    return `${prefix}: ${ocr.summary.trim()}`;
  }

  const rows = Array.isArray(ocr?.rows) ? ocr.rows : [];
  const parts = rows.map((r: any) => {
    const label = r?.program ? String(r.program) : 'Program';
    const trialData = r?.trial_data ? String(r.trial_data) : '';
    const stats = trialStatsFromData(trialData);
    const acc = formatAccuracyLabel(stats, language);
    return acc ? `${label} (${acc})` : label;
  });
  return parts.length ? `${prefix}: ${parts.join('; ')}` : prefix;
}

function trialAccuracyRating(trialData: string): number {
  const tokens = trialData.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 4;
  const plus = tokens.filter((t) => t === '+').length;
  const pct = plus / tokens.length;
  if (pct >= 0.8) return 5;
  if (pct >= 0.6) return 4;
  if (pct >= 0.4) return 3;
  if (pct >= 0.2) return 2;
  return 1;
}

export function sumExecutedProgramDurationSeconds(
  session: Pick<ChildAbaProgramSession, 'mode' | 'guided_results_json' | 'ocr_parsed_json' | 'started_at' | 'completed_at'>,
  plan: unknown
): number {
  const planJson = plan as any;

  if (session.mode === 'guided') {
    const index = buildActivityIndex(planJson);
    const programIndex = buildProgramIndex(planJson);
    const activities = Array.isArray((session.guided_results_json as any)?.activities)
      ? (session.guided_results_json as any).activities
      : [];

    let total = 0;
    const programFallback = new Set<string>();

    for (const a of activities) {
      const actId = a?.activity_id ? String(a.activity_id) : '';
      const linked = a?.linked_program_id ? String(a.linked_program_id) : '';
      const act = actId ? index.get(actId) : null;

      if (act) {
        total += activityDurationSeconds(act);
        continue;
      }

      if (linked && !programFallback.has(linked)) {
        programFallback.add(linked);
        const prog = programIndex.get(linked);
        const trials = Number(prog?.recommended_trials_per_day);
        const estSeconds = Number.isFinite(trials) && trials > 0 ? trials * 45 : DEFAULT_ACTIVITY_SECONDS;
        total += estSeconds;
      }
    }

    if (total > 0) return total;
  }

  if (session.mode === 'upload') {
    const programIndex = buildProgramIndex(planJson);
    const matches = Array.isArray((session.ocr_parsed_json as any)?.matched_program_ids)
      ? (session.ocr_parsed_json as any).matched_program_ids
      : [];

    let total = 0;
    for (const m of matches) {
      if (Number(m?.confidence ?? 0) < 0.5) continue;
      const pid = m?.program_id ? String(m.program_id) : '';
      if (!pid) continue;
      const prog = programIndex.get(pid);
      const trials = Number(prog?.recommended_trials_per_day);
      total += Number.isFinite(trials) && trials > 0 ? trials * 45 : DEFAULT_ACTIVITY_SECONDS;
    }

    if (total > 0) return total;
  }

  if (session.completed_at && session.started_at) {
    const elapsed = (session.completed_at.getTime() - session.started_at.getTime()) / 1000;
    if (elapsed > 60) return Math.min(elapsed, 3 * 3600);
  }

  return DEFAULT_ACTIVITY_SECONDS;
}

export function secondsToDurationHours(seconds: number): number {
  const hours = seconds / 3600;
  return Math.max(MIN_LOG_DURATION_HOURS, Math.round(hours * 100) / 100);
}

function buildSkillsFromGuided(session: ChildAbaProgramSession, plan: any): SkillEntry[] {
  const activities = Array.isArray((session.guided_results_json as any)?.activities)
    ? (session.guided_results_json as any).activities
    : [];
  const skills: SkillEntry[] = [];

  for (const a of activities) {
    const display = resolveGuidedActivityDisplay(a, plan);
    skills.push({
      name: display.name,
      domain: display.domain,
      target: display.target,
      trial_data: display.trial_data,
      rating: trialAccuracyRating(display.trial_data),
    });
  }

  return skills.length ? skills : [{ name: 'ABA home program', rating: 4 }];
}

function buildSkillsFromUpload(session: ChildAbaProgramSession, plan: any): SkillEntry[] {
  const programIndex = buildProgramIndex(plan);
  const ocr = session.ocr_parsed_json as any;
  const skills: SkillEntry[] = [];

  const rows = Array.isArray(ocr?.rows) ? ocr.rows : [];
  for (const row of rows) {
    const label = row?.program ? String(row.program) : 'ABA program';
    const trialData = String(row?.trial_data || '');
    skills.push({
      name: label,
      trial_data: trialData,
      rating: trialAccuracyRating(trialData),
    });
  }

  if (!skills.length) {
    const matches = Array.isArray(ocr?.matched_program_ids) ? ocr.matched_program_ids : [];
    for (const m of matches) {
      if (Number(m?.confidence ?? 0) < 0.5) continue;
      const pid = m?.program_id ? String(m.program_id) : '';
      const prog = pid ? programIndex.get(pid) : null;
      skills.push({ name: prog?.name ? String(prog.name) : 'ABA program', rating: 4 });
    }
  }

  return skills.length ? skills : [{ name: 'ABA home program', rating: 4 }];
}

function averageRating(skills: SkillEntry[]): number {
  if (!skills.length) return 4;
  const total = skills.reduce((sum, s) => sum + s.rating, 0);
  return Math.round(total / skills.length);
}

function buildAbaLogPayload(session: ChildAbaProgramSession, plan: any) {
  const planLang: 'en' | 'id' = plan?.language === 'id' ? 'id' : 'en';
  const skills =
    session.mode === 'guided'
      ? buildSkillsFromGuided(session, plan)
      : buildSkillsFromUpload(session, plan);
  const durationSeconds = sumExecutedProgramDurationSeconds(session, plan);
  return {
    skills_practiced: skills,
    activities: buildActivitiesSummaryHuman(session, plan, planLang),
    duration_hours: secondsToDurationHours(durationSeconds),
    rating: averageRating(skills),
  };
}

export async function computeWeeklyExecutedHours(childId: number, refDate = new Date()): Promise<number> {
  const weekStart = mondayWeekStart(refDate);
  const weekEnd = nextMonday(refDate);

  const sessions = await prisma.childAbaProgramSession.findMany({
    where: {
      status: 'completed',
      completed_at: { gte: weekStart, lt: weekEnd },
      week: { child_id: childId },
    },
    include: { week: true },
  });

  let totalSeconds = 0;
  for (const session of sessions) {
    totalSeconds += sumExecutedProgramDurationSeconds(session, session.week.plan_json);
  }

  return Math.round((totalSeconds / 3600) * 100) / 100;
}

export async function createParentLogFromAbaSession(input: {
  sessionId: number;
  child: Child;
  user: Pick<User, 'id' | 'role'>;
  week: ChildAbaProgramWeek;
  session: ChildAbaProgramSession;
}): Promise<ParentLog | null> {
  const { session, week, child, user } = input;

  if (session.status !== 'completed') return null;

  const existing = await prisma.parentLog.findFirst({
    where: { aba_session_id: session.id },
  });
  if (existing) return existing;

  const plan = week.plan_json as any;
  const payload = buildAbaLogPayload(session, plan);
  const logDate = session.completed_at ?? new Date();

  try {
    const log = await prisma.parentLog.create({
      data: {
        parent_id: child.parent_id,
        child_id: child.id,
        creator_id: user.id,
        creator_role: user.role as Role,
        log_date: logDate,
        skills_practiced: payload.skills_practiced,
        activities: payload.activities,
        duration_hours: payload.duration_hours,
        rating: payload.rating,
        behavior_notes: null,
        status: 'pending',
        aba_session_id: session.id,
      },
    });

    logger.info(
      { childId: child.id, sessionId: session.id, parentLogId: log.id, durationHours: payload.duration_hours },
      'Created activity log from ABA session'
    );

    return log;
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const dup = await prisma.parentLog.findFirst({ where: { aba_session_id: session.id } });
      return dup;
    }
    logger.error({ err: error, sessionId: session.id }, 'Failed to create parent log from ABA session');
    throw error;
  }
}

export async function repairAbaParentLogsForChild(childId: number): Promise<number> {
  const logs = await prisma.parentLog.findMany({
    where: { child_id: childId, aba_session_id: { not: null } },
    include: {
      abaSession: { include: { week: true } },
    },
  });

  let repaired = 0;
  for (const log of logs) {
    if (!log.abaSession || !log.abaSession.week) continue;
    const payload = buildAbaLogPayload(log.abaSession, log.abaSession.week.plan_json);
    await prisma.parentLog.update({
      where: { id: log.id },
      data: {
        skills_practiced: payload.skills_practiced,
        activities: payload.activities,
        duration_hours: payload.duration_hours,
        rating: payload.rating,
      },
    });
    repaired += 1;
  }
  return repaired;
}

export async function syncMissingParentLogsForChild(childId: number): Promise<number> {
  const sessions = await prisma.childAbaProgramSession.findMany({
    where: {
      status: 'completed',
      week: { child_id: childId },
      parentLog: null,
    },
    orderBy: { completed_at: 'desc' },
    take: 30,
    include: {
      week: { include: { child: true } },
      user: { select: { id: true, role: true } },
    },
  });

  let created = 0;
  for (const session of sessions) {
    const log = await createParentLogFromAbaSession({
      sessionId: session.id,
      session,
      week: session.week,
      child: session.week.child,
      user: session.user,
    });
    if (log) created += 1;
  }

  await repairAbaParentLogsForChild(childId);
  return created;
}

export async function syncParentLogForCompletedSession(sessionId: number): Promise<ParentLog | null> {
  const session = await prisma.childAbaProgramSession.findUnique({
    where: { id: sessionId },
    include: {
      week: { include: { child: true } },
      user: { select: { id: true, role: true } },
    },
  });

  if (!session || session.status !== 'completed') return null;

  return createParentLogFromAbaSession({
    sessionId,
    session,
    week: session.week,
    child: session.week.child,
    user: session.user,
  });
}
