'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Target } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { apiClient, ApiResponse, AbaProgramSession, AbaProgramWeek, Child } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { planLanguageNotice, useAbaPlanLanguage } from '@/hooks/useAbaPlanLanguage';
import { cn } from '@/lib/utils';

/** "2026-06-29" → "29 Jun". Parents do not read ISO dates. */
function humanYmd(ymd: string | null, language: string): string {
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * "Program Rumah Mingguan (ABA)" as its own page.
 *
 * The dashboard's daily action used to land on the child detail page, which
 * opens with stats, the environment note, the whole initial-observation
 * checklist and the activity log — and then tried to start a session behind
 * all of it. A parent with fifteen minutes and a child waiting got the file,
 * not the practice. This page carries only the week's program and the one
 * button that runs it.
 */
export function WeeklyProgramPageContent() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuthStore();
  const { t, language } = useTranslation();

  const childId = String(params.id);
  const wantsPrint = search.get('print') === '1';

  const [child, setChild] = useState<Child | null>(null);
  const [weeks, setWeeks] = useState<AbaProgramWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [showGateRule, setShowGateRule] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printSessionId, setPrintSessionId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const printHandledRef = useRef(false);
  /** Bumped to re-read the week after its plan is translated. */
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError('');
        // Both are needed before anything can start, so wait for both rather
        // than racing them — the old flow silently no-opped when the child
        // record arrived after the weeks did.
        const [childRes, weekRes] = await Promise.all([
          apiClient.get<ApiResponse<Child>>(`/children/${childId}`),
          apiClient.get<ApiResponse<{ weeks: AbaProgramWeek[] }>>(
            `/aba-program/children/${childId}/weeks?lang=${language === 'id' ? 'id' : 'en'}`,
          ),
        ]);
        if (cancelled) return;
        if (childRes.data.success && childRes.data.data) setChild(childRes.data.data);
        if (weekRes.data.success) setWeeks(weekRes.data.data?.weeks || []);
        else setError(weekRes.data.error || 'Failed to load program');
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        if (!cancelled) setError(e.response?.data?.error || 'Failed to load program');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, childId, language, reloadToken]);

  const week = useMemo(() => weeks[0] || null, [weeks]);
  const isGatedViewer = user?.role === 'parent' || user?.role === 'admin';
  const awaitingReview = Boolean(week && isGatedViewer && week.review_status !== 'approved');
  const progressGate = week?.program_progress || null;

  const weekStartYmd = week ? String(week.week_start).slice(0, 10) : null;
  const weekEndYmd = weekStartYmd ? addDaysYmd(weekStartYmd, 6) : null;

  /** A session left in progress, and where it stopped. */
  const resumable = useMemo(() => {
    const open = (week?.sessions || [])
      .filter((s) => s.mode === 'guided' && s.status === 'in_progress')
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
    // Any open session is resumable, including one with nothing recorded yet —
    // otherwise every tap here opens another session and leaves the last one
    // stranded. The position is only added to the label once it is known.
    if (!open) return null;
    const activities = (open.guided_results_json as { activities?: any[] } | null)?.activities;
    let taskIdx = -1;
    let trials = 0;
    if (Array.isArray(activities)) {
      activities.forEach((a, i) => {
        const count = (Array.isArray(a?.trial_sets) ? a.trial_sets : []).reduce(
          (sum: number, s: any) => sum + (Number(s?.trial_count) || 0),
          0,
        );
        if (count > 0 || a?.finished) {
          taskIdx = i;
          if (count > 0) trials = count;
        }
      });
    }
    if (taskIdx < 0) {
      return { session: open, label: language === 'id' ? 'lanjutkan' : 'continue', bare: true };
    }
    const total = Array.isArray(activities) ? activities.length : 0;
    const label =
      language === 'id'
        ? `Tugas ${taskIdx + 1}/${total}, trial ${trials}`
        : `Task ${taskIdx + 1}/${total}, trial ${trials}`;
    return { session: open, label, bare: false };
  }, [week, language]);

  const planLanguage = useAbaPlanLanguage({
    childId,
    week,
    language,
    paused: loading,
    onTranslated: () => setReloadToken((n) => n + 1),
  });

  const createSession = useCallback(
    async (mode: 'guided' | 'upload') => {
      if (!week) return null;
      const res = await apiClient.post<ApiResponse<{ session: AbaProgramSession }>>(
        `/aba-program/children/${childId}/weeks/${week.id}/sessions`,
        { mode },
      );
      if (!res.data.success || !res.data.data?.session) {
        throw new Error(res.data.error || 'Failed to start session');
      }
      try {
        window.localStorage.setItem(`gradion-aba-mode:${childId}`, mode);
      } catch {
        // Blocked storage — guided stays the default next time.
      }
      return res.data.data.session;
    },
    [week, childId],
  );

  const startGuided = useCallback(async () => {
    if (!week || starting) return;
    // Resuming is what a parent almost always means when a session is open.
    if (resumable) {
      router.push(
        `/dashboard/children/${childId}/aba-program?weekId=${week.id}&sessionId=${resumable.session.id}`,
      );
      return;
    }
    try {
      setStarting(true);
      setError('');
      const session = await createSession('guided');
      if (session) {
        router.push(
          `/dashboard/children/${childId}/aba-program?weekId=${week.id}&sessionId=${session.id}`,
        );
      }
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || e.message || 'Failed to start session');
      setStarting(false);
    }
  }, [week, starting, resumable, createSession, router, childId]);

  const startPrint = useCallback(async () => {
    if (!week || starting) return;
    try {
      setStarting(true);
      setError('');
      setPrintOpen(true);
      const session = await createSession('upload');
      if (session) setPrintSessionId(session.id);
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || e.message || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  }, [week, starting, createSession]);

  // Arriving from the dashboard's "Pakai lembar cetak" link.
  useEffect(() => {
    if (!wantsPrint || printHandledRef.current) return;
    if (loading || !week || awaitingReview) return;
    printHandledRef.current = true;
    void startPrint();
  }, [wantsPrint, loading, week, awaitingReview, startPrint]);

  const handleUpload = async (file: File) => {
    if (!week || !printSessionId) return;
    try {
      setUploading(true);
      setError('');
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post<ApiResponse<unknown>>(
        `/aba-program/children/${childId}/weeks/${week.id}/sessions/${printSessionId}/upload-ocr`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (!res.data.success) {
        setError(res.data.error || 'Failed to read the form');
        return;
      }
      router.push(`/dashboard/children/${childId}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to read the form');
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-32 animate-pulse rounded-2xl bg-[#E5E8EB]/60" />
          <div className="h-56 animate-pulse rounded-2xl bg-[#E5E8EB]/60" />
        </div>
      </DashboardLayout>
    );
  }

  const programs: any[] = Array.isArray((week?.plan_json as any)?.programs)
    ? (week!.plan_json as any).programs
    : [];
  const requiredRuns = progressGate?.required_executions ?? 6;
  const remainingToGate = progressGate
    ? Math.max(0, progressGate.required_executions - progressGate.min_executions)
    : null;
  const blockingProgram =
    progressGate?.per_program?.slice().sort((a, b) => a.executions - b.executions)[0]
      ?.program_name ?? null;
  const consolidating = progressGate?.avg_score_pct !== null && (progressGate?.avg_score_pct ?? 0) < 75;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 lg:max-w-5xl">
        <DashboardPageHeader
          icon={Target}
          title={child?.name || t('abaProgramTitle')}
          subtitle={
            week && weekStartYmd
              ? `${t('abaProgramTitle')} · ${humanYmd(weekStartYmd, language)} – ${humanYmd(weekEndYmd, language)}`
              : t('abaProgramTitle')
          }
        />

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('dashboard')}
          </Button>
          <Link
            href={`/dashboard/children/${childId}`}
            className="inline-flex min-h-[44px] items-center rounded px-2 text-sm font-medium text-[#00736C] underline underline-offset-2 hover:text-[#005E58] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
          >
            {language === 'id' ? 'Lihat detail anak' : 'See child details'} ›
          </Link>
        </div>

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

        {!week && (
          <div className="rounded-2xl border border-[#E5E8EB] bg-white p-6 text-sm text-[#1A2B4C]/70">
            {t('abaProgramNoWeekYet')}{' '}
            <Link
              href={`/dashboard/children/${childId}`}
              className="font-semibold text-[#00736C] underline"
            >
              {language === 'id' ? 'Buka halaman anak' : 'Open the child page'}
            </Link>
          </div>
        )}

        {awaitingReview && (
          <div className="rounded-2xl border border-[#FFB900]/30 bg-[#FFB900]/10 p-5 text-sm text-[#1A2B4C]">
            {language === 'id'
              ? 'Program mingguan ini sedang diperiksa tim klinis Gradion. Program akan bisa dijalankan begitu disetujui — kami kirim email saat siap.'
              : 'This weekly program is being checked by the Gradion clinical team. It can be run once approved — we will email you when it is ready.'}
          </div>
        )}

        {week && !awaitingReview && (
          <>
            {/* The one button this page exists for. */}
            <div className="rounded-2xl border border-[#00C1B2]/30 bg-[#1A2B4C] px-5 py-6 text-white sm:px-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#00C1B2]">
                {language === 'id' ? 'Latihan hari ini' : "Today's practice"}
              </div>
              <div className="mt-1 font-montserrat text-2xl font-bold">
                {child?.name || t('abaProgramTitle')}
              </div>
              <div className="mt-1 text-sm text-white/70">
                {programs.length} {language === 'id' ? 'program' : 'programs'}
              </div>
              <Button
                variant="brandOnDark"
                className="mt-4 w-full justify-center gap-2"
                onClick={startGuided}
                disabled={starting}
              >
                <Target className="h-4 w-4" aria-hidden />
                {starting
                  ? t('loading')
                  : resumable
                    ? resumable.bare
                      ? language === 'id'
                        ? 'Lanjutkan sesi'
                        : 'Resume session'
                      : language === 'id'
                        ? `Lanjutkan sesi — ${resumable.label}`
                        : `Resume session — ${resumable.label}`
                    : language === 'id'
                      ? 'Mulai latihan hari ini'
                      : "Start today's practice"}
              </Button>
              <button
                type="button"
                onClick={startPrint}
                disabled={starting}
                className="mt-2 block w-full rounded py-2 text-center text-xs font-medium text-white/70 underline underline-offset-2 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/50"
              >
                {language === 'id' ? 'Pakai lembar cetak' : 'Use the printed sheet'}
              </button>
            </div>

            {printOpen && (
              <div className="space-y-3 rounded-2xl border border-[#00C1B2]/25 bg-[#00C1B2]/5 p-5">
                <div className="text-sm font-bold text-[#1A2B4C]">
                  {t('abaProgramModeUpload')}
                </div>
                <a
                  className="block text-sm font-medium text-[#00736C] underline hover:text-[#005E58]"
                  href="/therapy-notes-mr-andrew.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('abaProgramDownloadPdf')}
                </a>
                {printSessionId && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#1A2B4C]/70">
                      {t('abaProgramUploadPhoto')}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      className="text-sm text-[#1A2B4C]"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUpload(f);
                      }}
                    />
                    {uploading && (
                      <div className="mt-2 text-xs text-[#00736C]">{t('abaProgramUploading')}</div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPrintOpen(false)}
                  className="inline-flex min-h-[44px] items-center rounded px-1 text-xs font-medium text-[#1A2B4C]/60 underline underline-offset-2 hover:text-[#00736C]"
                >
                  {language === 'id' ? '← Kembali ke panduan di website' : '← Back to the guided session'}
                </button>
              </div>
            )}

            {/* The gate, answer first. */}
            {progressGate && remainingToGate !== null && remainingToGate > 0 && (
              <div className="rounded-2xl border border-[#00C1B2]/25 bg-[#00C1B2]/5 p-5 text-sm text-[#1A2B4C]">
                <p className="font-montserrat text-xl font-bold">
                  {language === 'id'
                    ? `${remainingToGate} sesi lagi`
                    : `${remainingToGate} more ${remainingToGate === 1 ? 'session' : 'sessions'}`}
                </p>
                <p className="mt-1 leading-relaxed text-[#1A2B4C]/80">
                  {language === 'id'
                    ? `${blockingProgram ? `${blockingProgram} perlu` : 'Program ini perlu'} ${remainingToGate} sesi lagi. Setelah itu Gradion menyiapkan tahap berikutnya untuk ${child?.name ?? 'ananda'} secara otomatis.`
                    : `${blockingProgram ? `${blockingProgram} needs` : 'This program needs'} ${remainingToGate} more ${remainingToGate === 1 ? 'session' : 'sessions'}. After that Gradion prepares the next stage for ${child?.name ?? 'your child'} automatically.`}
                </p>
                {consolidating && progressGate.avg_score_pct !== null && (
                  <p className="mt-1 leading-relaxed text-[#1A2B4C]/70">
                    {language === 'id'
                      ? `Rata-rata skor saat ini ${progressGate.avg_score_pct}%, jadi tahap berikutnya akan memantapkan program yang sekarang sambil menambah yang baru — bukan mengulang dari awal.`
                      : `The average score is ${progressGate.avg_score_pct}%, so the next stage will consolidate the current programs and add to them — it is not a restart.`}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowGateRule((v) => !v)}
                  aria-expanded={showGateRule}
                  className="mt-2 inline-flex min-h-[44px] items-center rounded px-1 text-xs font-semibold text-[#00736C] underline underline-offset-2 hover:text-[#005E58] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
                >
                  {language === 'id' ? 'Kenapa segitu?' : 'Why that many?'}
                </button>
                {showGateRule && (
                  <p className="mt-1 text-xs leading-relaxed text-[#1A2B4C]/65">
                    {language === 'id'
                      ? `Tahap berikutnya dibuat otomatis saat rata-rata skor ≥75% dan setiap program sudah dijalankan minimal 3×. Kalau rata-rata masih di bawah 75%, tahap berikutnya dibuat setelah setiap program dijalankan 6×, dan program lama dibawa lagi.`
                      : `The next stage is generated automatically once the average score is 75% or more and every program has been run at least 3 times. If the average is still below 75%, it is generated once every program has been run 6 times, carrying the current programs over.`}
                  </p>
                )}
              </div>
            )}

            {/* The week's programs, with sessions left rather than raw counts. */}
            {programs.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white">
                <div className="border-b border-[#E5E8EB] bg-[#FDF8F1]/50 px-5 py-3">
                  <h2 className="font-montserrat text-sm font-bold text-[#1A2B4C]">
                    {language === 'id' ? 'Program minggu ini' : "This week's programs"}
                  </h2>
                </div>
                <ul className="divide-y divide-[#E5E8EB]">
                  {programs.map((p: any) => {
                    const pid = String(p.id);
                    const prog = progressGate?.per_program?.find((x) => x.program_id === pid);
                    const executed = prog?.executions ?? 0;
                    const remaining = Math.max(0, requiredRuns - executed);
                    return (
                      <li
                        key={pid}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1A2B4C]">{String(p.name ?? '')}</div>
                          {Array.isArray(p.targets) && p.targets.length > 0 && (
                            <div className="mt-0.5 truncate text-xs text-[#1A2B4C]/60">
                              {(p.targets as string[]).join(' · ')}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-[#1A2B4C]/55">
                            {executed} {language === 'id' ? 'dari' : 'of'} {requiredRuns}
                          </div>
                          <div
                            className={cn(
                              'text-xs font-bold',
                              remaining > 0 ? 'text-[#1A2B4C]' : 'text-[#00736C]',
                            )}
                          >
                            {remaining > 0
                              ? language === 'id'
                                ? `${remaining} sesi lagi`
                                : `${remaining} to go`
                              : language === 'id'
                                ? 'Target tercapai'
                                : 'Target met'}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
