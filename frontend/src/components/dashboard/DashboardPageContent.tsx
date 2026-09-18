'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  Gauge,
  Plus,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { getRoleBadgeClass } from '@/components/dashboard/dashboardBadges';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient, Child, Session, ParentLog, ApiResponse } from '@/lib/api';
import { isClinicalOrAdmin, isClinicalStaff } from '@/lib/roles';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

/** Per-child weekly program scores + practice hours, for the dashboard. */
type AbaDashboardChild = {
  child_id: number;
  child_name: string;
  hours_target: number;
  hours_executed: number;
  week: { id: number; week_start: string; review_status: string } | null;
  awaiting_review: boolean;
  programs: Array<{
    program_id: string;
    program_name: string;
    executions: number;
    trials: number;
    score_pct: number | null;
  }>;
  avg_score_pct: number | null;
  /** Rough length of one day's guided practice. */
  session_minutes: number | null;
  /** Sessions left before the next-stage program is generated. */
  sessions_to_gate: number | null;
  blocking_program_name: string | null;
  gate_mode: 'advance' | 'reinforce' | null;
  /** Mon…Sun: which days this week already have a completed session. */
  practice_days: boolean[] | null;
};

const DAY_LABELS = {
  id: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
} as const;

/** Green ≥75% (ready to advance), amber ≥50%, red below — matches the gate. */
function scoreTone(score: number) {
  if (score >= 75) return 'bg-[#00C1B2]/15 text-[#00776C]';
  if (score >= 50) return 'bg-[#FFB900]/20 text-[#8A6100]';
  return 'bg-red-100 text-red-700';
}

/** "3" not "3.00", but keeps a meaningful fraction like 2.5. */
function formatHours(h: number) {
  if (!Number.isFinite(h)) return '0';
  return h % 1 === 0 ? String(h) : String(Number(h.toFixed(2)));
}

function hoursBarColor(pct: number) {
  if (pct >= 100) return 'bg-[#00C1B2]';
  if (pct >= 60) return 'bg-[#FFB900]';
  return 'bg-red-400';
}

export function DashboardPageContent() {
  const { user } = useAuthStore();
  const { t, language } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pendingLogs, setPendingLogs] = useState<ParentLog[]>([]);
  const [abaSummary, setAbaSummary] = useState<AbaDashboardChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // The tour no longer owns the only button above the fold. It runs once for a
  // new account, and after that lives behind Profile → "Lihat tur lagi", which
  // links back here with ?tour=1.
  useEffect(() => {
    if (!user) return;
    try {
      const replay = new URLSearchParams(window.location.search).get('tour') === '1';
      if (replay) {
        window.localStorage.removeItem('lk_has_seen_dashboard_tour');
        window.history.replaceState(null, '', window.location.pathname);
        setShowTour(true);
        return;
      }
      if (!window.localStorage.getItem('lk_has_seen_dashboard_tour')) setShowTour(true);
    } catch {
      // Private mode / blocked storage — simply skip the tour.
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const promises: Promise<{ data: ApiResponse<unknown> }>[] = [
        apiClient.get<ApiResponse<Child[]>>('/children'),
      ];

      if (isClinicalOrAdmin(user.role)) {
        promises.push(apiClient.get<ApiResponse<Session[]>>('/sessions'));
        promises.push(apiClient.get<ApiResponse<ParentLog[]>>('/parent-logs?status=pending'));
      }

      const results = await Promise.all(promises);

      if (results[0].data.success) {
        setChildren((results[0].data.data as Child[]) || []);
      }
      if (isClinicalOrAdmin(user.role)) {
        if (results[1]?.data.success && results[1].data.data) {
          setSessions((results[1].data.data as Session[]).slice(0, 5));
        }
        if (results[2]?.data.success && results[2].data.data) {
          setPendingLogs((results[2].data.data as ParentLog[]) || []);
        }
      }
      // Weekly program scores + practice hours for each child (one request).
      try {
        const summary = await apiClient.get<ApiResponse<{ children: AbaDashboardChild[] }>>(
          '/aba-program/summary',
        );
        if (summary.data.success) {
          setAbaSummary(summary.data.data?.children || []);
        }
      } catch {
        // Non-fatal: the section simply stays empty.
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only children actually running a program count toward the headline hours —
  // otherwise children without a plan inflate the target with hours nobody owes.
  const practising = abaSummary.filter((r) => r.week !== null || r.awaiting_review);
  const totalHoursTarget = practising.reduce((sum, r) => sum + r.hours_target, 0);
  const totalHoursExecuted = practising.reduce((sum, r) => sum + r.hours_executed, 0);
  // "Weekly home program" should actually start the program, not just browse:
  // when exactly one child has a runnable program, deep-link to that child and
  // open the start chooser. Otherwise the parent has to pick a child first.
  const runnable = abaSummary.filter((r) => r.week !== null && r.programs.length > 0);
  // Straight to the weekly program, not the child's file. Landing on the child
  // page meant opening with stats, the observation checklist and the activity
  // log while the session tried to start behind them.
  const weeklyProgramHref =
    runnable.length === 1
      ? `/dashboard/children/${runnable[0].child_id}/program`
      : runnable.length > 1
        ? '/dashboard/children'
        : children.length === 1
          ? `/dashboard/children/${children[0].id}`
          : '/dashboard/children';
  /** The one thing a parent opened the app to do, when there is exactly one. */
  const todaysChild = runnable.length === 1 ? runnable[0] : null;

  if (!user) return null;

  const handleFinishTour = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('lk_has_seen_dashboard_tour', 'true');
      } catch {
        // ignore
      }
    }
    setShowTour(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/*
          A parent on a 390px phone gets one screen before they scroll. It used
          to hold a badge, a greeting, a marketing line, a role chip and a
          button that replayed the product tour — while the thing they opened
          the app to do started ~610px down. Greeting is one line now, and
          today's practice is the first card.
        */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="font-montserrat text-xl font-bold tracking-tight text-[#1A2B4C] sm:text-2xl">
              {t('welcomeBack')}, {user.name}
            </h1>
            {user.role !== 'parent' && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize',
                  getRoleBadgeClass(user.role),
                )}
              >
                {user.role}
              </span>
            )}
          </div>

          {!loading && user.role === 'parent' && todaysChild && (
            <div className="rounded-2xl border border-[#00C1B2]/30 bg-[#1A2B4C] px-5 py-5 text-white shadow-sm sm:px-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#00C1B2]">
                {language === 'id' ? 'Latihan hari ini' : "Today's practice"}
              </div>
              <div className="mt-1 font-montserrat text-2xl font-bold">{todaysChild.child_name}</div>
              <div className="mt-1 text-sm text-white/70">
                {todaysChild.programs.length} {language === 'id' ? 'program' : 'programs'}
                {todaysChild.session_minutes
                  ? ` · ${language === 'id' ? 'sekitar' : 'about'} ${todaysChild.session_minutes} ${
                      language === 'id' ? 'menit' : 'min'
                    }`
                  : ''}
              </div>
              {/* On navy, full-strength teal with dark ink — the brightest thing here. */}
              <Link href={weeklyProgramHref} className="mt-4 block">
                <Button variant="brandOnDark" className="w-full justify-center gap-2">
                  <Target className="h-4 w-4" aria-hidden />
                  {language === 'id' ? 'Mulai latihan' : 'Start practice'}
                </Button>
              </Link>
              {/* The paper path stays one tap away, not behind a daily question. */}
              <Link
                href={`/dashboard/children/${todaysChild.child_id}/program?print=1`}
                className="mt-2 block text-center text-xs font-medium text-white/70 underline underline-offset-2 hover:text-white"
              >
                {language === 'id' ? 'Pakai lembar cetak' : 'Use the printed sheet'}
              </Link>
            </div>
          )}

          {/*
            "Did we practise today?" is the question a parent actually opens the
            app with, and a total in hours cannot answer it. One row per day.
          */}
          {!loading && user.role === 'parent' && todaysChild?.practice_days && (
            <div className="rounded-2xl border border-[#E5E8EB] bg-white p-5 shadow-sm">
              <p className="text-sm text-[#1A2B4C]">
                {language === 'id' ? 'Minggu ini kamu latihan ' : 'This week you practised '}
                <strong>
                  {todaysChild.practice_days.filter(Boolean).length}{' '}
                  {language === 'id' ? 'dari 7 hari' : 'of 7 days'}
                </strong>
                .
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {todaysChild.practice_days.map((done, i) => (
                  <div key={i} className="min-w-0">
                    <div className="mb-1 text-center text-[10px] font-medium text-[#1A2B4C]/45">
                      {DAY_LABELS[language === 'id' ? 'id' : 'en'][i]}
                    </div>
                    <div
                      className={cn(
                        'h-2.5 rounded-full',
                        done ? 'bg-[#00C1B2]' : 'border border-dashed border-[#E5E8EB] bg-[#E5E8EB]/40',
                      )}
                      title={done ? (language === 'id' ? 'Sudah latihan' : 'Practised') : ''}
                    />
                  </div>
                ))}
              </div>
              {typeof todaysChild.sessions_to_gate === 'number' &&
                todaysChild.sessions_to_gate > 0 && (
                  <p className="mt-3 text-sm leading-relaxed text-[#1A2B4C]/70">
                    {language === 'id'
                      ? `${todaysChild.sessions_to_gate} sesi lagi${
                          todaysChild.blocking_program_name
                            ? ` untuk ${todaysChild.blocking_program_name}`
                            : ''
                        }, lalu ${todaysChild.child_name} naik tahap.`
                      : `${todaysChild.sessions_to_gate} more sessions${
                          todaysChild.blocking_program_name
                            ? ` for ${todaysChild.blocking_program_name}`
                            : ''
                        }, then ${todaysChild.child_name} moves up a stage.`}
                  </p>
                )}
            </div>
          )}
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-[#E5E8EB] bg-white"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Quick actions + modules */}
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E5E8EB] bg-white p-6 shadow-sm shadow-[#1A2B4C]/5">
                <h3 className="font-montserrat text-lg font-bold text-[#1A2B4C]">
                  {t('quickActions')}
                </h3>
                <p className="mt-1 text-sm text-[#1A2B4C]/60">
                  Tindakan cepat untuk melanjutkan pekerjaan hari ini.
                </p>
                <div className="mt-5 space-y-3">
                  {user.role === 'parent' && (
                    <>
                      {/* Already the hero card when there is exactly one child running a program. */}
                      {!todaysChild && (
                        <Link href={weeklyProgramHref} className="block">
                          <Button variant="brand" className="w-full justify-center gap-2">
                            <Target className="h-4 w-4" aria-hidden />
                            {t('abaProgramTitle')}
                          </Button>
                        </Link>
                      )}
                      <Link href="/dashboard/children/new" className="block">
                        <Button variant="outline" className="w-full justify-center gap-2">
                          <Users className="h-4 w-4" aria-hidden />
                          {t('addChild')}
                        </Button>
                      </Link>
                    </>
                  )}
                  {isClinicalStaff(user.role) && (
                    <>
                      <Link href="/dashboard/logs/new" className="block">
                        <Button variant="brand" className="w-full justify-center gap-2">
                          <Plus className="h-4 w-4" aria-hidden />
                          {t('recordSession')}
                        </Button>
                      </Link>
                      {pendingLogs.length > 0 && (
                        <Link href="/dashboard/logs?status=pending" className="block">
                          <Button variant="outline" className="w-full justify-center gap-2">
                            <ClipboardList className="h-4 w-4" aria-hidden />
                            {t('reviewLogs')} ({pendingLogs.length})
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                  {user.role === 'admin' && (
                    <Link href="/dashboard/admin/analytics" className="block">
                      <Button variant="brand" className="w-full justify-center gap-2">
                        <Sparkles className="h-4 w-4" aria-hidden />
                        {t('analytics')}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E8EB] bg-white p-6 shadow-sm shadow-[#1A2B4C]/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-[#00C1B2]/10 p-3">
                      <BookOpen className="h-6 w-6 text-[#00C1B2]" aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-montserrat text-lg font-bold text-[#1A2B4C]">
                        {t('modules')}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#1A2B4C]/60">
                        {t('modulesDashboardBlurb')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <Link href="/dashboard/modules">
                    <Button variant="outline" size="sm">
                      {t('viewAll')}
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
            {/* Stats */}
            <section>
              <h2 className="sr-only">Ringkasan</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DashboardStatCard
                  value={children.length}
                  label={user.role === 'parent' ? t('myChildren') : t('children')}
                  icon={Users}
                  href="/dashboard/children"
                />

                {user.role === 'parent' && (
                  <DashboardStatCard
                    value={`${formatHours(totalHoursExecuted)}/${totalHoursTarget}h`}
                    label={language === 'id' ? 'Jam latihan minggu ini' : 'Practice hours this week'}
                    icon={Gauge}
                    accent="gold"
                    href="/dashboard/children"
                  />
                )}

                {isClinicalStaff(user.role) && (
                  <>
                    <DashboardStatCard
                      value={sessions.length}
                      label={t('recentSessions')}
                      icon={Calendar}
                      accent="navy"
                    />
                    <DashboardStatCard
                      value={pendingLogs.length}
                      label={t('pendingLogs')}
                      icon={ClipboardList}
                      accent="gold"
                      href={pendingLogs.length > 0 ? '/dashboard/logs?status=pending' : undefined}
                    />
                  </>
                )}
              </div>
            </section>

            {/* Weekly home program (ABA): per-program scores + hours vs target */}
            {abaSummary.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-montserrat text-lg font-bold text-[#1A2B4C]">
                    {t('abaProgramTitle')}
                  </h2>
                  <Link
                    href="/dashboard/children"
                    className="text-sm font-semibold text-[#00736C] hover:text-[#005E58]"
                  >
                    {t('viewAll')}
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {abaSummary.map((row) => {
                    const pct =
                      row.hours_target > 0
                        ? Math.round((row.hours_executed / row.hours_target) * 100)
                        : 0;
                    return (
                      <div
                        key={row.child_id}
                        className="rounded-2xl border border-[#E5E8EB] bg-white p-5 shadow-sm shadow-[#1A2B4C]/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/dashboard/children/${row.child_id}`}
                            className="font-montserrat text-base font-bold text-[#1A2B4C] hover:text-[#00736C]"
                          >
                            {row.child_name}
                          </Link>
                          {row.avg_score_pct !== null && (
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                scoreTone(row.avg_score_pct),
                              )}
                            >
                              {language === 'id' ? 'Rata-rata' : 'Average'} {row.avg_score_pct}%
                            </span>
                          )}
                        </div>

                        {/* Hours target vs reality */}
                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="text-[#1A2B4C]/70">
                              {language === 'id'
                                ? 'Jam latihan vs target'
                                : 'Practice hours vs target'}
                            </span>
                            <span className="font-semibold text-[#1A2B4C]">
                              {formatHours(row.hours_executed)} / {row.hours_target}h ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#E5E8EB]">
                            <div
                              className={cn('h-full rounded-full transition-all', hoursBarColor(pct))}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                        </div>

                        {/* Per-program scores */}
                        <div className="mt-4">
                          {row.awaiting_review ? (
                            <p className="rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 px-3 py-2 text-xs text-[#1A2B4C]">
                              {language === 'id'
                                ? 'Program mingguan sedang ditinjau admin.'
                                : 'The weekly program is awaiting admin review.'}
                            </p>
                          ) : row.programs.length === 0 ? (
                            <p className="text-xs text-[#1A2B4C]/55">
                              {language === 'id'
                                ? 'Belum ada program mingguan.'
                                : 'No weekly program yet.'}
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {row.programs.map((p) => (
                                <li
                                  key={p.program_id}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-[#1A2B4C]">
                                      {p.program_name}
                                    </div>
                                    <div className="text-xs text-[#1A2B4C]/55">
                                      {language === 'id' ? 'Dijalankan' : 'Practised'} {p.executions}×
                                      {p.trials > 0
                                        ? ` · ${p.trials} ${language === 'id' ? 'trial' : 'trials'}`
                                        : ''}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                      p.score_pct === null
                                        ? 'bg-[#E5E8EB] text-[#1A2B4C]/60'
                                        : scoreTone(p.score_pct),
                                    )}
                                  >
                                    {p.score_pct === null
                                      ? language === 'id'
                                        ? 'Belum'
                                        : 'Not yet'
                                      : `${p.score_pct}%`}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Recent children */}
        {!loading && children.length > 0 && (
          <section className="rounded-2xl border border-[#E5E8EB] bg-white shadow-sm shadow-[#1A2B4C]/5">
            <div className="flex items-center justify-between gap-4 border-b border-[#E5E8EB] px-6 py-5">
              <h3 className="font-montserrat text-lg font-bold text-[#1A2B4C]">
                {user.role === 'parent' ? t('myChildren') : t('children')}
              </h3>
              {children.length > 5 && (
                <Link href="/dashboard/children">
                  <Button variant="outline" size="sm">
                    {t('viewAll')}
                  </Button>
                </Link>
              )}
            </div>
            <div className="divide-y divide-[#E5E8EB]">
              {children.slice(0, 5).map((child) => (
                <Link
                  key={child.id}
                  href={`/dashboard/children/${child.id}`}
                  className="group flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-[#FDF8F1]"
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-[#1A2B4C] group-hover:text-[#00736C] transition-colors">
                      {child.name}
                    </h4>
                    <p className="mt-0.5 text-sm text-[#1A2B4C]/55">
                      {t('quotaLabel')}: {child.used_sessions}/{child.monthly_quota}{' '}
                      {t('sessionsLabel')}
                    </p>
                    {user.role !== 'parent' && child.parent && (
                      <p className="mt-0.5 truncate text-xs text-[#1A2B4C]/50">
                        <span className="font-medium text-[#00736C]">Parent:</span>{' '}
                        {child.parent.name}
                        {child.parent.email ? ` · ${child.parent.email}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="hidden shrink-0 text-sm text-[#1A2B4C]/45 sm:block">
                    {child.diagnosis || t('noDiagnosis')}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {showTour && <DashboardTour role={user.role} onFinish={handleFinishTour} />}
    </DashboardLayout>
  );
}
