'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, ListChecks, PlayCircle, Target } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { apiClient, ApiResponse, AbaProgramWeek } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';
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

const RESULT_OPTIONS: {
  token: TrialResult;
  labelKey: 'abaGuidedResultPlus' | 'abaGuidedResultPrompted' | 'abaGuidedResultIncorrect' | 'abaGuidedResultOther';
  short: string;
  tone: string;
  selectedTone: string;
}[] = [
  {
    token: '+',
    labelKey: 'abaGuidedResultPlus',
    short: '+',
    tone: 'border-[#00C1B2]/30 bg-[#00C1B2]/5 text-[#00A896] hover:bg-[#00C1B2]/10',
    selectedTone: 'border-[#00C1B2] bg-[#00C1B2]/15 ring-2 ring-[#00C1B2]/40',
  },
  {
    token: 'p',
    labelKey: 'abaGuidedResultPrompted',
    short: 'p',
    tone: 'border-[#FFB900]/35 bg-[#FFB900]/10 text-[#1A2B4C] hover:bg-[#FFB900]/15',
    selectedTone: 'border-[#FFB900] bg-[#FFB900]/20 ring-2 ring-[#FFB900]/40',
  },
  {
    token: '-',
    labelKey: 'abaGuidedResultIncorrect',
    short: '−',
    tone: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
    selectedTone: 'border-red-400 bg-red-50 ring-2 ring-red-300/50',
  },
  {
    token: 'os',
    labelKey: 'abaGuidedResultOther',
    short: 'os',
    tone: 'border-[#E5E8EB] bg-[#FDF8F1]/60 text-[#1A2B4C]/70 hover:bg-[#E5E8EB]/50',
    selectedTone: 'border-[#1A2B4C]/30 bg-[#1A2B4C]/5 ring-2 ring-[#1A2B4C]/15',
  },
];

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

function entriesToTrialSets(entries: TrialEntry[]): TrialSetPayload[] {
  const groups: { phase: string; results: TrialResult[] }[] = [];
  for (const e of entries) {
    const phase = e.phase_or_target.trim();
    if (!phase) continue;
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
  const [draftPhase, setDraftPhase] = useState('');
  const [draftResult, setDraftResult] = useState<TrialResult | null>(null);
  const [trialStepError, setTrialStepError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
          `/aba-program/children/${childId}/weeks`
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
      } catch (e: any) {
        setError(e.response?.data?.error || 'Failed to load week');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, childId, weekId]);

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

  const currentEntries = current?.id ? trialsByActivity[current.id] || [] : [];
  const trialsComplete =
    !!current?.id &&
    (trialsFinishedByActivity[current.id] || currentEntries.length >= expectedTrials);
  const trialNumber = Math.min(currentEntries.length + 1, expectedTrials);

  useEffect(() => {
    if (!current?.id) return;
    setRemaining(timerSeconds);
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [idx, current?.id, timerSeconds]);

  useEffect(() => {
    if (!current?.id) return;
    setDraftPhase('');
    setDraftResult(null);
    setTrialStepError('');
    const entries = trialsByActivity[current.id] || [];
    const last = entries[entries.length - 1];
    if (last?.phase_or_target) setDraftPhase(last.phase_or_target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

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

  const saveCurrentTrial = (): boolean => {
    const phase = draftPhase.trim();
    if (!phase) {
      setTrialStepError(t('abaGuidedEnterPhase'));
      return false;
    }
    if (!draftResult) {
      setTrialStepError(t('abaGuidedSelectResult'));
      return false;
    }
    setTrialsByActivity((prev) => {
      const next = [...(prev[current.id] || []), { phase_or_target: phase, result: draftResult }];
      if (next.length >= expectedTrials) {
        setTrialsFinishedByActivity((f) => ({ ...f, [current.id]: true }));
      }
      return { ...prev, [current.id]: next };
    });
    setDraftResult(null);
    setTrialStepError('');
    return true;
  };

  const markTrialsFinished = () => {
    if (draftPhase.trim() && draftResult) saveCurrentTrial();
    setTrialsFinishedByActivity((prev) => ({ ...prev, [current.id]: true }));
    setDraftResult(null);
    setTrialStepError('');
  };

  const handleNextTrial = () => {
    saveCurrentTrial();
  };

  const finish = async () => {
    try {
      setSubmitting(true);
      setError('');
      const payload = {
        activities: filteredActivities.map((a) => ({
          activity_id: a.id,
          linked_program_id: a.linked_program_id || null,
          trial_sets: entriesToTrialSets(trialsByActivity[a.id] || []),
        })),
      };
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
  const linkedId = current.linked_program_id ? String(current.linked_program_id) : '';
  const linkedProgram = linkedId ? programById.get(linkedId) || null : null;
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
      <div className="mx-auto max-w-3xl space-y-6 pb-28">
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
                    idx === 0 ? 'bg-[#00C1B2] text-white' : 'text-white/60',
                  )}
                >
                  {language === 'id' ? 'Tugas' : 'Task'} {idx + 1}/{filteredActivities.length}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00C1B2]/30 bg-[#00C1B2]/20 px-3 py-1.5 text-sm font-bold tabular-nums text-white">
                <Clock className="h-4 w-4 text-[#00C1B2]" aria-hidden />
                {timerDisplay}
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

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
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
              className="break-all text-sm font-medium text-[#00A896] underline hover:text-[#00C1B2]"
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
                className="mt-2 inline-block text-sm font-semibold text-[#00A896] underline hover:text-[#00C1B2]"
              >
                {t('abaProgramVideoOpenYouTube')}
              </a>
            </div>
          )}
        </DashboardSectionCard>

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

        <DashboardSectionCard
          title={language === 'id' ? 'Catat trial' : 'Record trials'}
          subtitle={
            trialsComplete
              ? `${currentEntries.length} ${t('abaGuidedTrialsRecorded')}`
              : `${t('abaGuidedTrialStep')} ${trialNumber} ${t('abaGuidedTrialOf')} ${expectedTrials}`
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
                      <span className="font-mono font-bold text-[#00A896]">{e.result}</span>
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
              <Input
                id="phase-target"
                variant="brand"
                label={t('abaGuidedPhaseTarget')}
                type="text"
                autoComplete="off"
                value={draftPhase}
                onChange={(e) => {
                  setDraftPhase(e.target.value);
                  setTrialStepError('');
                }}
                placeholder={t('abaGuidedPhasePlaceholder')}
              />

              <div>
                <p className="mb-2 text-sm font-medium text-[#1A2B4C]">{t('abaGuidedPickResult')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {RESULT_OPTIONS.map((opt) => {
                    const selected = draftResult === opt.token;
                    return (
                      <button
                        key={opt.token}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          'rounded-xl border-2 px-3 py-5 text-center transition touch-manipulation',
                          selected ? opt.selectedTone : opt.tone,
                        )}
                        onClick={() => {
                          setDraftResult(opt.token);
                          setTrialStepError('');
                        }}
                      >
                        <span className="block text-2xl font-bold leading-none">{opt.short}</span>
                        <span className="mt-1 block text-xs font-medium leading-tight">
                          {t(opt.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {trialStepError && (
                <p className="text-sm text-red-600" role="alert">
                  {trialStepError}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={markTrialsFinished}>
                  {t('abaGuidedTrialFinish')}
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  className="w-full sm:w-auto"
                  onClick={handleNextTrial}
                  disabled={!draftPhase.trim() || !draftResult}
                >
                  {t('abaGuidedTrialNext')}
                </Button>
              </div>
            </div>
          )}
        </DashboardSectionCard>

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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
