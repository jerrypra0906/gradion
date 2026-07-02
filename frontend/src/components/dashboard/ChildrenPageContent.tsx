'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Gauge, Plus, UserPlus, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { ChildCard } from '@/components/dashboard/ChildCard';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient, Child, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

function formatChildAge(
  birthdate: string | undefined,
  ageLabel: string,
  naLabel: string,
  yearsLabel: string,
) {
  if (!birthdate) return `${ageLabel}: ${naLabel}`;
  const years = Math.floor(
    (Date.now() - new Date(birthdate).getTime()) / (1000 * 60 * 60 * 24 * 365),
  );
  return `${ageLabel}: ${years} ${yearsLabel}`;
}

export function ChildrenPageContent() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (response.data.success) {
        setChildren(response.data.data || []);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(message || 'Failed to fetch children');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const totalSessionsUsed = children.reduce((sum, c) => sum + c.used_sessions, 0);
  const totalQuota = children.reduce((sum, c) => sum + c.monthly_quota, 0);
  const canAddChild = user.role === 'parent';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <DashboardPageHeader
          icon={Users}
          title={t('children')}
          subtitle={
            user.role === 'parent' ? t('manageYourChildren') : t('viewAssignedChildren')
          }
          action={
            canAddChild ? (
              <Link href="/dashboard/children/new">
                <Button variant="brand" className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('addChild')}
                </Button>
              </Link>
            ) : undefined
          }
        />

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-[#E5E8EB] bg-white"
              />
            ))}
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E8EB] bg-white px-6 py-14 text-center shadow-sm shadow-[#1A2B4C]/5">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00C1B2]/10">
              <UserPlus className="h-8 w-8 text-[#00C1B2]" aria-hidden />
            </div>
            <h2 className="font-montserrat text-xl font-bold text-[#1A2B4C]">{t('noChildren')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#1A2B4C]/60">
              {user.role === 'parent'
                ? 'Tambahkan profil anak untuk mulai melacak perkembangan dan sesi ABA.'
                : 'Belum ada anak yang ditugaskan ke akun Anda.'}
            </p>
            {canAddChild && (
              <div className="mt-6">
                <Link href="/dashboard/children/new">
                  <Button variant="brand" className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden />
                    {t('addYourFirstChild')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <section>
              <h2 className="sr-only">Ringkasan</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DashboardStatCard
                  value={children.length}
                  label={user.role === 'parent' ? t('myChildren') : t('children')}
                  icon={Users}
                  accent="teal"
                />
                <DashboardStatCard
                  value={totalSessionsUsed}
                  label={t('usedSessions')}
                  icon={Activity}
                  accent="navy"
                />
                <DashboardStatCard
                  value={totalQuota > 0 ? `${Math.round((totalSessionsUsed / totalQuota) * 100)}%` : '0%'}
                  label={t('quotaLabel')}
                  icon={Gauge}
                  accent="gold"
                />
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-montserrat text-lg font-bold text-[#1A2B4C]">
                  {user.role === 'parent' ? t('myChildren') : t('children')}
                </h2>
                <span className="text-sm text-[#1A2B4C]/55">
                  {children.length} {children.length === 1 ? 'anak' : 'anak'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {children.map((child) => (
                  <ChildCard
                    key={child.id}
                    child={child}
                    ageLabel={formatChildAge(child.birthdate, t('age'), t('nA'), t('years'))}
                    diagnosisLabel={t('noDiagnosis')}
                    quotaLabel={t('quotaLabel')}
                    sessionsLabel={t('sessionsLabel')}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
