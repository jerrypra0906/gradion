'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, ListChecks, Pause, Play, PlayCircle, Target } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { apiClient, ApiResponse, AbaProgramWeek } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';
import { planLanguageNotice, useAbaPlanLanguage } from '@/hooks/useAbaPlanLanguage';
import { moduleForProgram, moduleLengthLabel } from '@/lib/modules';
import { cn } from '@/lib/utils';

type GuidedActivity = {
  id: string;
  title: string;
  duration_seconds?: number;
  timer_seconds?: number;
  linked_program_id?: string;
  steps?: string[];
  video_url?: string | null;
  parent_records?: { expected_length?: number; hint?: string };
};

type TrialResult = '+' | 'p' | '-' | 'os';

type TrialEntry = {
  phase_or_target: string;
  result: TrialResult;
};

type TrialSetPayload = {
  phase_or_target: string;
  trial_count: number;
  trial_data: string;
};

/**
 * The four score buttons a parent taps eight-plus times per task.
 *
 * No traffic-light fills: a red card reading "wrong" about an autistic child's
 * attempt is a judgement nobody asked for, and it appears eight times a
 * session. The glyph and the word carry the meaning; the tints only separate
 * the buttons from each other. Red/amber/green stays where it belongs — on the
 * score that drives the progression gate.
 */
const RESULT_OPTIONS: {
  token: TrialResult;
  labelKey: 'abaGuidedResultPlus' | 'abaGuidedResultPrompted' | 'abaGuidedResultIncorrect' | 'abaGuidedResultOther';
  short: string;
  tone: string;
}[] = [
  {
    token: '+',
    labelKey: 'abaGuidedResultPlus',
    short: '+',
    tone: 'border-[#00C1B2]/40 bg-[#00C1B2]/8 text-[#00776C] hover:bg-[#00C1B2]/15 active:bg-[#00C1B2]/25',
  },
  {
    token: 'p',
    labelKey: 'abaGuidedResultPrompted',
    short: 'p',
    tone: 'border-[#1A2B4C]/25 bg-[#1A2B4C]/5 text-[#1A2B4C] hover:bg-[#1A2B4C]/10 active:bg-[#1A2B4C]/15',
  },
  {
    token: '-',
    labelKey: 'abaGuidedResultIncorrect',
    short: '−',
    tone: 'border-[#E5E8EB] bg-white text-[#1A2B4C] hover:bg-[#E5E8EB]/40 active:bg-[#E5E8EB]/70',
  },
  {
    token: 'os',
    labelKey: 'abaGuidedResultOther',
    short: 'os',
    tone: 'border-[#E5E8EB] bg-[#FDF8F1]/70 text-[#1A2B4C]/60 hover:bg-[#E5E8EB]/40 active:bg-[#E5E8EB]/70',
  },
];

/**
 * The phase a trial is recorded against. It is already in the plan — as the
 * program's first target, or after the colon in the activity title — so asking
 * the parent to type it on every trial opened a keyboard in the middle of the
 * product's most frequent interaction, with a child waiting.
 */
function defaultPhaseForActivity(activity: GuidedActivity, program: any): string {
  const target =
    Array.isArray(program?.targets) && program.targets.length
      ? String(program.targets[0]).trim()
      : '';
  if (target) return target;
  const title = String(activity?.title ?? '').trim();
  const afterColon = title.includes(':') ? title.slice(title.indexOf(':') + 1).trim() : '';
  return afterColon || title;
}

function youtubeEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shorts?.[1]) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`;
      const emb = u.pathname.match(/^\/embed\/([^/?#]+)/);
      if (emb?.[1]) return `https://www.youtube-nocookie.com/embed/${emb[1]}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function localizeGuidedStepDisplay(step: string, lang: string): string {
  if (lang !== 'id') return step;
  let s = String(step ?? '');
  s = s.replace(/^Prepare:\s*/i, 'Persiapan: ');
  if (s === 'Give the instruction once. Prompt if needed (p).') {
    return 'Beri instruksi sekali. Beri isyarat bila perlu (p).';
  }
  if (s === 'Mark each trial: + (independent), p (prompted), - (incorrect).') {
    return 'Tandai setiap trial: + (mandiri), p (dibantu), - (salah).';
  }
  return s;
}

function entriesToTrialSets(entries: TrialEntry[], fallbackPhase: string): TrialSetPayload[] {
  const groups: { phase: string; results: TrialResult[] }[] = [];
  for (const e of entries) {
    // Never drop a recorded trial for want of a label — a blank phase used to
    // discard the score silently, losing practice the parent had already done.
    const phase = e.phase_or_target.trim() || fallbackPhase.trim() || 'Latihan';
    const last = groups[groups.length - 1];
    if (last && last.phase === phase) {
      last.results.push(e.result);
    } else {
      groups.push({ phase, results: [e.result] });
    }
  }
  return groups.map((g) => ({
    phase_or_target: g.phase,
    trial_count: g.results.length,
    trial_data: g.results.join(' '),
  }));
}

/** Read one trial string ("+ + p os -") back into individual results. */
function parseTrialData(raw: unknown): TrialResult[] {
  const s = String(raw ?? '');
  const out: TrialResult[] = [];
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === '+') out.push('+');
    else if (c === 'p' || c === 'P') out.push('p');
    else if (c === '-' || c === '−' || c === '–') out.push('-');
    else if ((c === 'o' || c === 'O') && (s[i + 1] === 's' || s[i + 1] === 'S')) {
      out.push('os');
      i += 1;
    }
  }
  return out;
}

/**
 * Rehydrate an interrupted guided session from whatever was autosaved. Shape
 * matches what `finish` posts, so the same payload round-trips.
 */
function readSavedTrials(rawResults: unknown): {
  trials: Record<string, TrialEntry[]>;
  finished: Record<string, boolean>;
  phases: Record<string, string>;
} | null {
  const activities = (rawResults as { activities?: unknown })?.activities;
  if (!Array.isArray(activities)) return null;
  const trials: Record<string, TrialEntry[]> = {};
  const finished: Record<string, boolean> = {};
  const phases: Record<string, string> = {};
  for (const a of activities as any[]) {
    const id = a?.activity_id != null ? String(a.activity_id) : '';
    if (!id) continue;
    const entries: TrialEntry[] = [];
    for (const set of Array.isArray(a?.trial_sets) ? a.trial_sets : []) {
      const phase = String(set?.phase_or_target ?? '');
      if (phase && phases[id] === undefined) phases[id] = phase;
      for (const result of parseTrialData(set?.trial_data)) {
        entries.push({ phase_or_target: phase, result });
      }
    }
    trials[id] = entries;
    if (a?.finished === true) finished[id] = true;
  }
  return { trials, finished, phases };
}

export function AbaProgramPageContent() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuthStore();
  const { t, language } = useTranslation();

  const childId = Number(params.id);
  const weekId = Number(search.get('weekId') || '');
  const sessionId = Number(search.get('sessionId') || '');
  const programId = (search.get('programId') || '').trim();

  const [week, setWeek] = useState<AbaProgramWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [trialsByActivity, setTrialsByActivity] = useState<Record<string, TrialEntry[]>>({});
  const [trialsFinishedByActivity, setTrialsFinishedByActivity] = useState<Record<string, boolean>>({});
  /** Phase per activity, seeded from the plan; editable once, not per trial. */
  const [phaseByActivity, setPhaseByActivity] = useState<Record<string, string>>({});
  const [editingPhase, setEditingPhase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const autosaveArmedRef = useRef(false);
  /** Bumped to re-read the week after its plan is translated. */
  const [reloadToken, setReloadToken] = useState(0);
  /** Latest `recordTrial`, so the key handler is bound once but never stale. */
  const keyScoreRef = useRef<((token: TrialResult) => void) | null>(null);

  const activities: GuidedActivity[] = useMemo(() => {
    const plan: any = week?.plan_json;
    const flow = plan?.daily_guided_flow;
    if (!Array.isArray(flow)) return [];
    for (const day of flow) {
      const acts = day?.activities;
      if (Array.isArray(acts) && acts.length > 0) return acts;
    }
    const flat: GuidedActivity[] = [];
    for (const day of flow) {
      const acts = day?.activities;
      if (Array.isArray(acts)) flat.push(...acts);
    }
    return flat;
  }, [week]);

  const filteredActivities = useMemo(() => {
    if (!programId) return activities;
    // A specific program's activities may live on any day of the week, so
    // search the whole flow — not just the first day — and dedupe by id.
    const plan: any = week?.plan_json;
    const flow = Array.isArray(plan?.daily_guided_flow) ? plan.daily_guided_flow : [];
    const matches: GuidedActivity[] = [];
    const seen = new Set<string>();
    for (const day of flow) {
      const acts = Array.isArray(day?.activities) ? day.activities : [];
      for (const a of acts) {
        if (String(a?.linked_program_id || '') !== programId) continue;
        const key = a?.id != null ? String(a.id) : `${matches.length}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push(a);
      }
    }
    return matches;
  }, [activities, programId, week]);

  const programDemoVideoById = useMemo(() => {
    const m = new Map<string, string>();
    const progs = (week?.plan_json as any)?.programs;
    if (!Array.isArray(progs)) return m;
    for (const p of progs) {
      const id = p?.id != null ? String(p.id) : '';
      const u = p?.demo_video_url;
      if (id && typeof u === 'string' && u.trim().length) m.set(id, u.trim());
    }
    return m;
  }, [week]);

  // Full program records, so the session shows the same explanation
  // (name, rationale, targets, materials) as the child-page program cards.
  const programById = useMemo(() => {
    const m = new Map<string, any>();
    const progs = (week?.plan_json as any)?.programs;
    if (!Array.isArray(progs)) return m;
    for (const p of progs) {
      if (p?.id != null) m.set(String(p.id), p);
    }
    return m;
  }, [week]);

  useEffect(() => {
    if (!user || !childId || !weekId) return;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiClient.get<ApiResponse<{ weeks: AbaProgramWeek[] }>>(
          `/aba-program/children/${childId}/weeks?lang=${language === 'id' ? 'id' : 'en'}`
        );
        if (!res.data.success) {
          setError(res.data.error || 'Failed to load week');
          return;
        }
        const w = res.data.data?.weeks?.find((x) => x.id === weekId) || null;
        if (!w) {
          setError('Week not found');
          return;
        }
        setWeek(w);

        // Pick up where an interrupted session left off.
        const session = w.sessions?.find((s) => s.id === sessionId) || null;
        const saved = readSavedTrials(session?.guided_results_json);
        if (saved) {
          setTrialsByActivity(saved.trials);
          setTrialsFinishedByActivity(saved.finished);
          setPhaseByActivity(saved.phases);
          setResumed(Object.values(saved.trials).some((list) => list.length > 0));
        }
      } catch (e: any) {
        setError(e.response?.data?.error || 'Failed to load week');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, childId, weekId, language, reloadToken]);

  const current = filteredActivities[idx];
  const expectedTrials = Math.max(
    1,
    Math.min(
      50,
      typeof current?.parent_records?.expected_length === 'number'
        ? current.parent_records.expected_length
        : 10
    )
  );
  const timerSeconds = Math.max(30, Number(current?.timer_seconds || current?.duration_seconds || 300));
  const tickRef = useRef<number | null>(null);
  // Pause is read inside the interval via a ref so toggling it never restarts
  // the countdown; the state twin drives the button UI.
  const [timerPaused, setTimerPaused] = useState(false);
  const timerPausedRef = useRef(false);

  const toggleTimerPaused = () => {
    timerPausedRef.current = !timerPausedRef.current;
    setTimerPaused(timerPausedRef.current);
  };

  const currentEntries = current?.id ? trialsByActivity[current.id] || [] : [];
  // Completion is the explicit flag only — `recordTrial` raises it when the
  // expected count is reached. Deriving it from the count as well made
  // "Lanjutkan trial" a dead button on a finished task, and blocked a parent
  // who wanted to record a few extra trials.
  const trialsComplete = !!current?.id && Boolean(trialsFinishedByActivity[current.id]);
  const trialNumber = Math.min(currentEntries.length + 1, expectedTrials);

  useEffect(() => {
    if (!current?.id) return;
    setRemaining(timerSeconds);
    timerPausedRef.current = false;
    setTimerPaused(false);
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      if (timerPausedRef.current) return;
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [idx, current?.id, timerSeconds]);

  // Seed the phase for a task from the plan the first time it is opened.
  useEffect(() => {
    if (!current?.id) return;
    setEditingPhase(false);
    setPhaseByActivity((prev) => {
      if (prev[current.id] !== undefined) return prev;
      const linked = current.linked_program_id ? String(current.linked_program_id) : '';
      const program = linked ? programById.get(linked) : null;
      return { ...prev, [current.id]: defaultPhaseForActivity(current, program) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const planLanguage = useAbaPlanLanguage({
    childId,
    week,
    language,
    paused: loading,
    onTranslated: () => setReloadToken((n) => n + 1),
  });

  // Autosave every scored trial, so an interrupted session is resumable rather
  // than lost. Debounced because a parent taps through trials quickly.
  useEffect(() => {
    if (!week || !sessionId || loading) return;
    if (!autosaveArmedRef.current) {
      // Don't write back the state we just rehydrated.
      autosaveArmedRef.current = true;
      return;
    }
    const handle = window.setTimeout(() => {
      const results = {
        activities: filteredActivities.map((a) => ({
          activity_id: a.id,
          linked_program_id: a.linked_program_id || null,
          finished: Boolean(trialsFinishedByActivity[a.id]),
          trial_sets: entriesToTrialSets(
            trialsByActivity[a.id] || [],
            phaseByActivity[a.id] ?? String(a.title ?? ''),
          ),
        })),
      };
      void apiClient
        .post(
          `/aba-program/children/${childId}/weeks/${week.id}/sessions/${sessionId}/save-guided-progress`,
          { results },
        )
        .then(() => setSavedAt(Date.now()))
        .catch(() => {
          // Non-fatal: the results are still in hand and submitted at the end.
        });
    }, 800);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialsByActivity, trialsFinishedByActivity, loading]);

  // Desktop only: scoring a trial from the keyboard. Mobile keeps no keyboard
  // anywhere in the daily loop, which is the whole point of finding 01.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (window.matchMedia('(pointer: coarse)').matches) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const token = { '1': '+', '2': 'p', '3': '-', '0': 'os' }[e.key] as TrialResult | undefined;
      if (!token) return;
      e.preventDefault();
      keyScoreRef.current?.(token);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!user) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-32 animate-pulse rounded-2xl bg-[#E5E8EB]/60" />
          <div className="h-64 animate-pulse rounded-2xl bg-[#E5E8EB]/60" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !week || !sessionId) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || 'Missing session'}
          </div>
          <Button variant="outline" onClick={() => router.push(`/dashboard/children/${childId}`)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            {t('back')}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!current) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 px-4 py-3 text-sm text-[#1A2B4C]">
            {language === 'id'
              ? programId
                ? 'Program ini belum punya aktivitas terpandu.'
                : 'Tidak ada aktivitas terpandu pada rencana minggu ini.'
              : programId
                ? 'This program has no guided activities yet.'
                : 'No guided activities were included in this weekly plan.'}
          </div>
          <Button variant="outline" onClick={() => router.push(`/dashboard/children/${childId}`)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            {t('back')}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentPhase = phaseByActivity[current.id] ?? '';

  /**
   * One tap per trial: the score is recorded and the counter moves on. Scoring
   * used to leave the parent with two more undifferentiated buttons ("Selesai
   * trial" / "Trial berikutnya") for a decision they had already made.
   */
  const recordTrial = (token: TrialResult) => {
    setTrialsByActivity((prev) => {
      const next = [...(prev[current.id] || []), { phase_or_target: currentPhase, result: token }];
      if (next.length >= expectedTrials) {
        setTrialsFinishedByActivity((f) => ({ ...f, [current.id]: true }));
      }
      return { ...prev, [current.id]: next };
    });
  };

  keyScoreRef.current = trialsComplete || editingPhase ? null : recordTrial;

  /** Mis-taps during a session with a distressed child are certain. */
  const undoLastTrial = () => {
    setTrialsByActivity((prev) => {
      const entries = prev[current.id] || [];
      if (entries.length === 0) return prev;
      return { ...prev, [current.id]: entries.slice(0, -1) };
    });
    setTrialsFinishedByActivity((prev) => ({ ...prev, [current.id]: false }));
  };

  const markTrialsFinished = () => {
    setTrialsFinishedByActivity((prev) => ({ ...prev, [current.id]: true }));
  };

  const buildResultsPayload = () => ({
    activities: filteredActivities.map((a) => ({
      activity_id: a.id,
      linked_program_id: a.linked_program_id || null,
      finished: Boolean(trialsFinishedByActivity[a.id]),
      trial_sets: entriesToTrialSets(
        trialsByActivity[a.id] || [],
        phaseByActivity[a.id] ?? String(a.title ?? ''),
      ),
    })),
  });

  const finish = async () => {
    try {
      setSubmitting(true);
      setError('');
      const payload = buildResultsPayload();
      const res = await apiClient.post(
        `/aba-program/children/${childId}/weeks/${week.id}/sessions/${sessionId}/complete-guided`,
        { results: payload }
      );
      if (!(res.data as any).success) {
        setError((res.data as any).error || 'Failed to submit');
        return;
      }
      router.push(`/dashboard/children/${childId}`);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const isLast = idx >= filteredActivities.length - 1;
  const anyTrialsRecorded = filteredActivities.some(
    (a) => (trialsByActivity[a.id] || []).length > 0,
  );
  const linkedId = current.linked_program_id ? String(current.linked_program_id) : '';
  const linkedProgram = linkedId ? programById.get(linkedId) || null : null;
  const sessionModule = moduleForProgram(linkedProgram);
  const rawVideoUrl = (() => {
    const act = String(current.video_url || '').trim();
    if (act) return act;
    if (linkedId) return programDemoVideoById.get(linkedId) || '';
    return '';
  })();
  const videoEmbed = rawVideoUrl ? youtubeEmbedSrc(rawVideoUrl) : null;
  const ytSearchHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${current.title} ABA parent tutorial`
  )}`;

  const timerDisplay = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const trialProgressPct = expectedTrials > 0 ? (currentEntries.length / expectedTrials) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 pb-28 lg:max-w-6xl">
        <DashboardPageHeader
          icon={Target}
          title={current.title}
          subtitle={
            linkedProgram
              ? `${String(linkedProgram.name ?? '')}${
                  linkedProgram.domain ? ` · ${String(linkedProgram.domain)}` : ''
                }`
              : language === 'id'
                ? 'Sesi terpandu program ABA'
                : 'Guided ABA program session'
          }
          action={
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-1 py-1">
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    idx === 0 ? 'bg-[#00C1B2] text-[#06302D]' : 'text-white/60',
                  )}
                >
                  {language === 'id' ? 'Tugas' : 'Task'} {idx + 1}/{filteredActivities.length}
                </span>
              </div>
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm font-bold tabular-nums text-white',
                  timerPaused
                    ? 'border-[#FFB900]/40 bg-[#FFB900]/25'
                    : 'border-[#00C1B2]/30 bg-[#00C1B2]/20',
                )}
              >
                <Clock className={cn('h-4 w-4', timerPaused ? 'text-[#FFB900]' : 'text-[#00C1B2]')} aria-hidden />
                <span className={timerPaused ? 'opacity-70' : undefined}>{timerDisplay}</span>
                <button
                  type="button"
                  onClick={toggleTimerPaused}
                  aria-label={
                    timerPaused
                      ? language === 'id'
                        ? 'Lanjutkan timer'
                        : 'Resume timer'
                      : language === 'id'
                        ? 'Jeda timer'
                        : 'Pause timer'
                  }
                  className="group -my-2 ml-0.5 flex h-11 w-11 items-center justify-center rounded-full"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white/30">
                    {timerPaused ? (
                      <Play className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Pause className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </span>
                </button>
                {timerPaused && (
                  <span className="pr-1 text-[11px] font-semibold uppercase tracking-wide text-[#FFB900]">
                    {language === 'id' ? 'Jeda' : 'Paused'}
                  </span>
                )}
              </div>
            </div>
          }
        />

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push(`/dashboard/children/${childId}`)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('back')}
          </Button>
          <span className="text-sm font-medium text-[#1A2B4C]/50">
            {idx + 1} / {filteredActivities.length}
          </span>
        </div>

        {/*
          Desktop is a sit-down surface, so the extra width goes to context on
          the left and a scoring rail on the right that does not move between
          trials. On mobile this is still one column, in the same order.
        */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
          <div className="space-y-6">

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Never show the other language without saying why. */}
        {planLanguage.untranslated && (
          <div className="rounded-xl border border-[#FFB900]/35 bg-[#FFB900]/10 px-4 py-3 text-sm text-[#1A2B4C]">
            {planLanguageNotice(planLanguage.reason, language)}
          </div>
        )}

        {resumed && (
          <div className="rounded-xl border border-[#00C1B2]/30 bg-[#00C1B2]/8 px-4 py-3 text-sm text-[#1A2B4C]">
            {language === 'id'
              ? 'Sesi dilanjutkan — trial yang sudah dicatat masih tersimpan.'
              : 'Session resumed — the trials you already recorded are still here.'}
          </div>
        )}

        {linkedProgram &&
          (linkedProgram.rationale ||
            (Array.isArray(linkedProgram.targets) && linkedProgram.targets.length > 0) ||
            (Array.isArray(linkedProgram.materials) && linkedProgram.materials.length > 0) ||
            (Array.isArray(linkedProgram.steps) && linkedProgram.steps.length > 0) ||
            (Array.isArray(linkedProgram.prompts) && linkedProgram.prompts.length > 0) ||
            (typeof linkedProgram.mastery_criteria === 'string' &&
              linkedProgram.mastery_criteria.trim())) && (
            <DashboardSectionCard
              title={
                <span className="inline-flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#00C1B2]" aria-hidden />
                  {language === 'id' ? 'Tentang program ini' : 'About this program'}
                </span>
              }
            >
              <div className="space-y-3 text-sm text-[#1A2B4C]/85">
                {linkedProgram.rationale ? (
                  <p className="text-sm leading-relaxed">{String(linkedProgram.rationale)}</p>
                ) : null}
                {Array.isArray(linkedProgram.targets) && linkedProgram.targets.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold text-[#1A2B4C]">
                      {language === 'id' ? 'Target' : 'Targets'}
                    </div>
                    <div className="mt-1">{(linkedProgram.targets as string[]).join(' · ')}</div>
                  </div>
                )}
                {Array.isArray(linkedProgram.materials) && linkedProgram.materials.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold text-[#1A2B4C]">
                      {language === 'id' ? 'Alat' : 'Materials'}
                    </div>
                    <div className="mt-1">{(linkedProgram.materials as string[]).join(' · ')}</div>
                  </div>
                )}
                {Array.isArray(linkedProgram.steps) && linkedProgram.steps.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold text-[#1A2B4C]">
                      {language === 'id' ? 'Langkah' : 'Steps (Langkah)'}
                    </div>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                      {(linkedProgram.steps as string[]).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {Array.isArray(linkedProgram.prompts) && linkedProgram.prompts.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold text-[#1A2B4C]">
                      {language === 'id' ? 'Prompt (bantuan)' : 'Prompts'}
                    </div>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                      {(linkedProgram.prompts as string[]).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {typeof linkedProgram.mastery_criteria === 'string' &&
                  linkedProgram.mastery_criteria.trim() && (
                    <div className="text-xs">
                      <div className="font-semibold text-[#1A2B4C]">
                        {language === 'id' ? 'Kriteria ketuntasan' : 'Mastery criteria'}
                      </div>
                      <div className="mt-1">{linkedProgram.mastery_criteria}</div>
                    </div>
                  )}
              </div>
            </DashboardSectionCard>
          )}

        <DashboardSectionCard
          title={
            <span className="inline-flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-[#00C1B2]" aria-hidden />
              {t('abaProgramVideoTitle')}
            </span>
          }
        >
          {videoEmbed ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#E5E8EB] bg-[#1A2B4C]">
              <iframe
                title={t('abaProgramVideoTitle')}
                className="h-full w-full"
                src={videoEmbed}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : rawVideoUrl ? (
            <a
              href={rawVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium text-[#00736C] underline hover:text-[#005E58]"
            >
              {rawVideoUrl}
            </a>
          ) : (
            <div className="rounded-xl border border-dashed border-[#00C1B2]/25 bg-[#00C1B2]/5 px-4 py-4 text-sm text-[#1A2B4C]/80">
              <p>{t('abaProgramVideoPlaceholder')}</p>
              <a
                href={ytSearchHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-[#00736C] underline hover:text-[#005E58]"
              >
                {t('abaProgramVideoOpenYouTube')}
              </a>
            </div>
          )}
        </DashboardSectionCard>

        {/*
          Learning at the point of need: the one module matching the program
          about to be run, with its length stated, instead of a locked
          curriculum sitting in a separate corner of the app.
        */}
        {sessionModule && (
          <Link
            href={`/dashboard/modules/${sessionModule.key}`}
            className="block rounded-xl border border-[#E5E8EB] bg-white px-4 py-3 transition-colors hover:border-[#00C1B2]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#1A2B4C]/50">
                  {language === 'id' ? 'Bacaan singkat untuk sesi ini' : 'Quick read for this session'}
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-[#1A2B4C]">
                  {language === 'id' ? sessionModule.title.id : sessionModule.title.en}
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-[#00736C]">
                {moduleLengthLabel(sessionModule, language)} ›
              </span>
            </div>
          </Link>
        )}

        {current.steps && current.steps.length > 0 && (
          <DashboardSectionCard
            title={
              <span className="inline-flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-[#00C1B2]" aria-hidden />
                {t('abaGuidedStepsHeading')}
              </span>
            }
          >
            <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-[#1A2B4C]/85">
              {current.steps.map((s, i) => (
                <li key={i}>{localizeGuidedStepDisplay(s, language)}</li>
              ))}
            </ol>
          </DashboardSectionCard>
        )}

          </div>

          <div className="mt-6 lg:mt-0 lg:sticky lg:top-6">
        <DashboardSectionCard
          title={language === 'id' ? 'Catat trial' : 'Record trials'}
          subtitle={
            (trialsComplete
              ? `${currentEntries.length} ${t('abaGuidedTrialsRecorded')}`
              : `${t('abaGuidedTrialStep')} ${trialNumber} ${t('abaGuidedTrialOf')} ${expectedTrials}`) +
            (savedAt ? (language === 'id' ? ' · Tersimpan' : ' · Saved') : '')
          }
        >
          {!trialsComplete && (
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#1A2B4C]/60">
                <span>{language === 'id' ? 'Progres trial' : 'Trial progress'}</span>
                <span>{Math.round(trialProgressPct)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E5E8EB]">
                <div
                  className="h-full rounded-full bg-[#00C1B2] transition-all duration-300"
                  style={{ width: `${trialProgressPct}%` }}
                />
              </div>
            </div>
          )}

          {trialsComplete ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#1A2B4C]">
                {currentEntries.length} {t('abaGuidedTrialsRecorded')}
                {currentEntries.length < expectedTrials && (
                  <span className="font-normal text-[#1A2B4C]/50">
                    {' '}
                    ({language === 'id' ? 'dihentikan lebih awal' : 'stopped early'})
                  </span>
                )}
              </p>
              {currentEntries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentEntries.map((e, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E5E8EB] bg-[#FDF8F1]/60 px-2.5 py-1 text-xs font-medium text-[#1A2B4C]"
                    >
                      <span className="text-[#1A2B4C]/50">{i + 1}.</span>
                      <span className="max-w-[8rem] truncate">{e.phase_or_target}</span>
                      <span className="font-mono font-bold text-[#00736C]">{e.result}</span>
                    </span>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTrialsFinishedByActivity((prev) => ({ ...prev, [current.id]: false }));
                }}
              >
                {language === 'id' ? 'Lanjutkan trial' : 'Continue trials'}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Phase comes from the plan. Shown, not asked for. */}
              {editingPhase ? (
                <div className="space-y-2">
                  <Input
                    id="phase-target"
                    variant="brand"
                    label={t('abaGuidedPhaseTarget')}
                    type="text"
                    autoComplete="off"
                    autoFocus
                    value={currentPhase}
                    onChange={(e) =>
                      setPhaseByActivity((prev) => ({ ...prev, [current.id]: e.target.value }))
                    }
                    placeholder={t('abaGuidedPhasePlaceholder')}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingPhase(false)}
                  >
                    {language === 'id' ? 'Selesai' : 'Done'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="text-[#1A2B4C]/55">{t('abaGuidedPhaseTarget')}:</span>
                  <span className="font-semibold text-[#1A2B4C]">
                    {currentPhase || (language === 'id' ? 'Latihan' : 'Practice')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingPhase(true)}
                    className="inline-flex min-h-[44px] items-center rounded px-1 text-xs font-semibold text-[#00736C] underline underline-offset-2 hover:text-[#005E58] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
                  >
                    {language === 'id' ? 'Ubah' : 'Change'}
                  </button>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium text-[#1A2B4C]">{t('abaGuidedPickResult')}</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-2">
                  {RESULT_OPTIONS.map((opt) => (
                    <button
                      key={opt.token}
                      type="button"
                      className={cn(
                        'min-h-[76px] rounded-xl border-2 px-3 py-5 text-center transition touch-manipulation',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/50',
                        opt.tone,
                      )}
                      onClick={() => recordTrial(opt.token)}
                    >
                      <span className="block text-2xl font-bold leading-none">{opt.short}</span>
                      <span className="mt-1 block text-xs font-medium leading-tight">
                        {t(opt.labelKey)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/*
                A visible log of what was recorded, and the promise that closing
                the page loses nothing — stated in the interface rather than
                left for the parent to assume.
              */}
              <div className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#1A2B4C]/55">
                    {language === 'id' ? 'Trial sesi ini' : 'Trials this session'}
                  </span>
                  <span className="text-xs text-[#1A2B4C]/55">
                    {currentEntries.length} {language === 'id' ? 'tercatat' : 'recorded'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: expectedTrials }).map((_, i) => {
                    const e = currentEntries[i];
                    return (
                      <span
                        key={i}
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold',
                          e
                            ? i === currentEntries.length - 1
                              ? 'border-[#00C1B2] bg-[#00C1B2]/15 text-[#00736C]'
                              : 'border-[#E5E8EB] bg-white text-[#1A2B4C]'
                            : 'border-dashed border-[#E5E8EB] text-[#1A2B4C]/30',
                        )}
                        title={e ? `${i + 1}. ${e.phase_or_target}` : undefined}
                      >
                        {e ? (e.result === '-' ? '−' : e.result) : i + 1}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#1A2B4C]/55">
                  {language === 'id'
                    ? 'Setiap trial tersimpan saat kamu mengetuk. Tutup halaman kapan saja — sesi bisa dilanjutkan.'
                    : 'Every trial is saved as you tap. Close the page any time — the session can be resumed.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] w-full sm:w-auto"
                  onClick={undoLastTrial}
                  disabled={currentEntries.length === 0}
                >
                  {language === 'id' ? 'Batalkan trial terakhir' : 'Undo last trial'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] w-full text-[#1A2B4C]/60 sm:w-auto"
                  onClick={markTrialsFinished}
                >
                  {t('abaGuidedTrialFinish')}
                </Button>
              </div>

              <p className="hidden rounded-lg bg-[#FDF8F1]/70 px-3 py-2 text-xs text-[#1A2B4C]/55 lg:block">
                {language === 'id'
                  ? 'Tombol 1 · 2 · 3 · 0 di keyboard juga bisa.'
                  : 'Keys 1 · 2 · 3 · 0 work too.'}
              </p>
            </div>
          )}
        </DashboardSectionCard>

          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E8EB] bg-[#FDF8F1]/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {idx > 0 && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
              >
                {language === 'id' ? 'Sebelumnya' : 'Previous'}
              </Button>
            )}
            {!isLast && trialsComplete && (
              <Button variant="brand" className="w-full sm:w-auto" onClick={() => setIdx((i) => i + 1)}>
                {language === 'id' ? 'Tugas berikutnya' : 'Next task'}
              </Button>
            )}
            {isLast && trialsComplete && (
              <Button variant="brand" className="w-full sm:w-auto" onClick={finish} disabled={submitting}>
                {submitting ? t('loading') : language === 'id' ? 'Kirim hasil' : 'Submit results'}
              </Button>
            )}
            {/*
              A session that has to be abandoned — a meltdown, a phone that
              locked — should end with the practice counted, not discarded.
            */}
            {!(isLast && trialsComplete) && anyTrialsRecorded && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={finish}
                disabled={submitting}
              >
                {submitting
                  ? t('loading')
                  : language === 'id'
                    ? 'Akhiri sesi & simpan hasil'
                    : 'End session & keep results'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
