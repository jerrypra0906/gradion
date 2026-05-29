'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, AbaProgramWeek } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

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

const RESULT_OPTIONS: { token: TrialResult; labelKey: 'abaGuidedResultPlus' | 'abaGuidedResultPrompted' | 'abaGuidedResultIncorrect' | 'abaGuidedResultOther'; short: string; tone: string }[] = [
  { token: '+', labelKey: 'abaGuidedResultPlus', short: '+', tone: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' },
  { token: 'p', labelKey: 'abaGuidedResultPrompted', short: 'p', tone: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100' },
  { token: '-', labelKey: 'abaGuidedResultIncorrect', short: '−', tone: 'border-red-300 bg-red-50 text-red-900 hover:bg-red-100' },
  { token: 'os', labelKey: 'abaGuidedResultOther', short: 'os', tone: 'border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100' },
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

export default function AbaGuidedSessionPage() {
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
    return activities.filter((a) => String(a.linked_program_id || '') === programId);
  }, [activities, programId]);

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
        <div className="px-4 py-10 text-center text-gray-600">{t('loading')}…</div>
      </DashboardLayout>
    );
  }

  if (error || !week || !sessionId) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6">
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || 'Missing session'}
          </div>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push(`/dashboard/children/${childId}`)}>
              ← {t('back')}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!current) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 space-y-3">
          <div className="text-sm text-gray-700">
            {language === 'id'
              ? programId
                ? 'Program ini belum punya aktivitas terpandu.'
                : 'Tidak ada aktivitas terpandu pada rencana minggu ini.'
              : programId
                ? 'This program has no guided activities yet.'
                : 'No guided activities were included in this weekly plan.'}
          </div>
          <Button variant="outline" onClick={() => router.push(`/dashboard/children/${childId}`)}>
            ← {t('back')}
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

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0 max-w-3xl mx-auto space-y-4 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/children/${childId}`)}>
            ← {t('back')}
          </Button>
          <div className="text-xs text-gray-500">
            {idx + 1}/{filteredActivities.length}
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">{current.title}</h1>
              {current.linked_program_id && (
                <p className="mt-1 text-xs text-gray-500 truncate">Program ID: {current.linked_program_id}</p>
              )}
            </div>
            <div className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900 tabular-nums">
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-900">{t('abaProgramVideoTitle')}</div>
            {videoEmbed ? (
              <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-black/5">
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
                className="mt-2 inline-block text-sm text-blue-700 underline break-all"
              >
                {rawVideoUrl}
              </a>
            ) : (
              <div className="mt-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                <p>{t('abaProgramVideoPlaceholder')}</p>
                <a
                  href={ytSearchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-blue-700 underline"
                >
                  {t('abaProgramVideoOpenYouTube')}
                </a>
              </div>
            )}
          </div>

          {current.steps && current.steps.length > 0 && (
            <>
              <h2 className="mt-5 text-sm font-semibold text-gray-900">{t('abaGuidedStepsHeading')}</h2>
              <ol className="mt-2 list-decimal pl-5 space-y-2 text-sm text-gray-800">
                {current.steps.map((s, i) => (
                  <li key={i}>{localizeGuidedStepDisplay(s, language)}</li>
                ))}
              </ol>
            </>
          )}

          <div className="mt-6 border-t border-gray-100 pt-5">
            {trialsComplete ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">
                  {currentEntries.length} {t('abaGuidedTrialsRecorded')}
                  {currentEntries.length < expectedTrials && (
                    <span className="text-gray-500 font-normal">
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
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800"
                      >
                        <span className="text-gray-500">{i + 1}.</span>
                        <span className="max-w-[8rem] truncate">{e.phase_or_target}</span>
                        <span className="font-mono font-bold">{e.result}</span>
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
              <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {t('abaGuidedTrialStep')} {trialNumber} {t('abaGuidedTrialOf')} {expectedTrials}
                  </p>
                  <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${(currentEntries.length / expectedTrials) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phase-target" className="block text-sm font-medium text-gray-900 mb-1.5">
                    {t('abaGuidedPhaseTarget')}
                  </label>
                  <input
                    id="phase-target"
                    type="text"
                    autoComplete="off"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400"
                    value={draftPhase}
                    onChange={(e) => {
                      setDraftPhase(e.target.value);
                      setTrialStepError('');
                    }}
                    placeholder={t('abaGuidedPhasePlaceholder')}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">{t('abaGuidedPickResult')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {RESULT_OPTIONS.map((opt) => {
                      const selected = draftResult === opt.token;
                      return (
                        <button
                          key={opt.token}
                          type="button"
                          aria-pressed={selected}
                          className={`rounded-xl border-2 px-3 py-5 text-center transition touch-manipulation ${
                            selected
                              ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-1'
                              : opt.tone
                          }`}
                          onClick={() => {
                            setDraftResult(opt.token);
                            setTrialStepError('');
                          }}
                        >
                          <span className="block text-2xl font-bold leading-none">{opt.short}</span>
                          <span className="mt-1 block text-xs font-medium leading-tight">{t(opt.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {trialStepError && <p className="text-sm text-red-600">{trialStepError}</p>}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={markTrialsFinished}>
                    {t('abaGuidedTrialFinish')}
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={handleNextTrial}
                    disabled={!draftPhase.trim() || !draftResult}
                  >
                    {t('abaGuidedTrialNext')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:flex-wrap gap-2 sm:justify-end">
            {idx > 0 && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIdx((i) => Math.max(0, i - 1))}>
                {language === 'id' ? 'Sebelumnya' : 'Previous'}
              </Button>
            )}
            {!isLast && trialsComplete && (
              <Button className="w-full sm:w-auto" onClick={() => setIdx((i) => i + 1)}>
                {language === 'id' ? 'Tugas berikutnya' : 'Next task'}
              </Button>
            )}
            {isLast && trialsComplete && (
              <Button className="w-full sm:w-auto" onClick={finish} disabled={submitting}>
                {submitting ? t('loading') : language === 'id' ? 'Kirim hasil' : 'Submit results'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
