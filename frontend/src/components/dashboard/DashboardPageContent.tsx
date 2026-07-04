'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  Compass,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient, Child, Session, ParentLog, ApiResponse } from '@/lib/api';
import { isClinicalOrAdmin, isClinicalStaff } from '@/lib/roles';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'admin':
      return 'bg-[#FFB900]/15 text-[#1A2B4C] border-[#FFB900]/30';
    case 'therapist':
      return 'bg-[#00C1B2]/10 text-[#00A896] border-[#00C1B2]/25';
    case 'consultant':
      return 'bg-[#1A2B4C]/8 text-[#1A2B4C] border-[#1A2B4C]/15';
    case 'parent':
      return 'bg-[#00C1B2]/10 text-[#00A896] border-[#00C1B2]/25';
    default:
      return 'bg-[#E5E8EB] text-[#1A2B4C]/70 border-[#E5E8EB]';
  }
}

export function DashboardPageContent() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<ParentLog[]>([]);
  const [pendingLogs, setPendingLogs] = useState<ParentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } else if (user.role === 'parent') {
        promises.push(apiClient.get<ApiResponse<ParentLog[]>>('/parent-logs'));
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
      } else if (user.role === 'parent') {
        if (results[1]?.data.success && results[1].data.data) {
          setLogs((results[1].data.data as ParentLog[]) || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const handleShowTour = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('lk_has_seen_dashboard_tour');
      } catch {
        // ignore
      }
    }
    setShowTour(true);
  };

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
        {/* Welcome banner */}
        <section className="relative overflow-hidden rounded-2xl bg-[#1A2B4C] px-6 py-7 sm:px-8 sm:py-9 text-white">
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#00C1B2]/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[#00C1B2]/8 blur-2xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#00C1B2]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {t('dashboard')}
              </div>
              <h1 className="font-montserrat text-2xl font-bold tracking-tight sm:text-3xl">
                {t('welcomeBack')}, {user.name}!
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                Recovery is possible — lacak perkembangan, kolaborasi dengan tim klinis, dan
                akses modul pembelajaran ABA.
              </p>
              <span
                className={cn(
                  'mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize',
                  getRoleBadgeClass(user.role),
                )}
              >
                {user.role}
              </span>
            </div>

            <button
              type="button"
              onClick={handleShowTour}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/50 focus:ring-offset-2 focus:ring-offset-[#1A2B4C]"
            >
              <Compass className="h-4 w-4" aria-hidden />
              Lihat tur lagi
            </button>
          </div>
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
                    value={logs.length}
                    label={t('activityLogs')}
                    icon={ClipboardList}
                    href="/dashboard/logs"
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
                      <Link href="/dashboard/logs/new" className="block">
                        <Button variant="brand" className="w-full justify-center gap-2">
                          <Plus className="h-4 w-4" aria-hidden />
                          {t('newActivityLog')}
                        </Button>
                      </Link>
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
                    <h4 className="font-semibold text-[#1A2B4C] group-hover:text-[#00A896] transition-colors">
                      {child.name}
                    </h4>
                    <p className="mt-0.5 text-sm text-[#1A2B4C]/55">
                      {t('quotaLabel')}: {child.used_sessions}/{child.monthly_quota}{' '}
                      {t('sessionsLabel')}
                    </p>
                    {user.role !== 'parent' && child.parent && (
                      <p className="mt-0.5 truncate text-xs text-[#1A2B4C]/50">
                        <span className="font-medium text-[#00A896]">Parent:</span>{' '}
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
