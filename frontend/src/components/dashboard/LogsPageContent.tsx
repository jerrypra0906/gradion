'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { ActivityLogEntryBody } from '@/components/dashboard/ActivityLogEntryBody';
import { getCreatorBadgeClass, getLogStatusBadgeClass } from '@/components/dashboard/dashboardBadges';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient, ApiResponse, Child, ParentLog } from '@/lib/api';
import { isClinicalStaff } from '@/lib/roles';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export function LogsPageContent() {
  const { user } = useAuthStore();
  const { t, language } = useTranslation();
  const [logs, setLogs] = useState<ParentLog[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [childFilterId, setChildFilterId] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchLogs();
      fetchChildren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, childFilterId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = childFilterId !== 'all' ? `?child_id=${encodeURIComponent(childFilterId)}` : '';
      const response = await apiClient.get<ApiResponse<ParentLog[]>>(`/parent-logs${params}`);
      if (response.data.success) {
        setLogs(response.data.data || []);
      } else {
        setError(response.data.error || 'Failed to load logs');
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      const resp = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (resp.data.success) {
        setChildren(resp.data.data || []);
      }
    } catch {
      // Non-blocking: logs list can still work without this dropdown.
    }
  };

  if (!user) return null;

  const pageTitle = user.role === 'parent' ? t('myLogs') : t('activityLogs');
  const pageSubtitle =
    user.role === 'parent'
      ? 'Lihat semua catatan aktivitas anak Anda'
      : isClinicalStaff(user.role)
        ? 'Lihat catatan aktivitas untuk anak yang ditugaskan'
        : 'Lihat semua catatan aktivitas';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <DashboardPageHeader
          icon={ClipboardList}
          title={pageTitle}
          subtitle={pageSubtitle}
        />

        <DashboardSectionCard
          title={language === 'id' ? 'Filter' : 'Filter'}
          subtitle={language === 'id' ? 'Tampilkan log untuk semua anak atau anak tertentu.' : 'Show logs for all children or a specific child.'}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#1A2B4C]/60">
                {language === 'id' ? 'Anak' : 'Child'}
              </label>
              <select
                className="h-11 w-full rounded-xl border border-[#E5E8EB] bg-white px-3 text-sm font-medium text-[#1A2B4C] outline-none transition focus:border-[#00C1B2]/60 focus:ring-2 focus:ring-[#00C1B2]/15"
                value={childFilterId}
                onChange={(e) => setChildFilterId(e.target.value)}
              >
                <option value="all">{language === 'id' ? 'Semua anak' : 'All children'}</option>
                {children.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={fetchLogs}>
                {language === 'id' ? 'Terapkan' : 'Apply'}
              </Button>
            </div>
          </div>
        </DashboardSectionCard>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-[#E5E8EB] bg-white"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <DashboardSectionCard>
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00C1B2]/10">
                <ClipboardList className="h-7 w-7 text-[#00C1B2]" aria-hidden />
              </div>
              <p className="font-medium text-[#1A2B4C]">
                {childFilterId === 'all'
                  ? language === 'id'
                    ? 'Belum ada catatan aktivitas.'
                    : 'No activity logs yet.'
                  : language === 'id'
                    ? 'Belum ada catatan untuk anak ini.'
                    : 'No logs for this child.'}
              </p>
            </div>
          </DashboardSectionCard>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <DashboardSectionCard key={log.id} noPadding>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {log.child && (
                          <Link
                            href={`/dashboard/children/${log.child.id}`}
                            className="font-montserrat text-lg font-bold text-[#1A2B4C] hover:text-[#00A896] transition-colors"
                          >
                            {log.child.name}
                          </Link>
                        )}
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                            getLogStatusBadgeClass(log.status),
                          )}
                        >
                          {log.status}
                        </span>
                        {log.aba_session_id && (
                          <span className="rounded-full border border-[#1A2B4C]/15 bg-[#1A2B4C]/5 px-2.5 py-1 text-xs font-semibold text-[#1A2B4C]/70">
                            Program ABA
                          </span>
                        )}
                        {log.creator && (
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-medium',
                              getCreatorBadgeClass(log.creator.role),
                            )}
                          >
                            {log.creator.role}: {log.creator.name}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-[#1A2B4C]/55">
                        {new Date(log.log_date).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="mt-1 text-sm text-[#1A2B4C]/55">
                        Durasi:{' '}
                        <span className="font-semibold text-[#1A2B4C]">
                          {(log.duration_hours ?? 3) % 1 === 0
                            ? (log.duration_hours ?? 3)
                            : Number((log.duration_hours ?? 3).toFixed(2))}{' '}
                          jam
                        </span>
                      </p>

                      <ActivityLogEntryBody
                        log={log}
                        language={language === 'id' ? 'id' : 'en'}
                        compact
                      />

                      {log.rating && !log.aba_session_id && (
                        <p className="mt-3 text-sm font-semibold text-[#1A2B4C]">
                          Overall Rating:{' '}
                          <span className="text-[#00C1B2]">{log.rating}/5</span>
                        </p>
                      )}

                      {log.behavior_notes && (
                        <div className="mt-4">
                          <p className="mb-1 text-sm font-semibold text-[#1A2B4C]">Behavior Notes</p>
                          <p className="whitespace-pre-line text-sm text-[#1A2B4C]/70">
                            {log.behavior_notes}
                          </p>
                        </div>
                      )}

                      {log.ai_summary && (
                        <div className="mt-4 rounded-xl border border-[#1A2B4C]/10 bg-[#1A2B4C]/5 p-4">
                          <p className="mb-1 text-sm font-semibold text-[#1A2B4C]">AI Summary</p>
                          <p className="whitespace-pre-line text-sm text-[#1A2B4C]/75">
                            {log.ai_summary}
                          </p>
                        </div>
                      )}

                      {log.therapist_comment && (
                        <div className="mt-4 rounded-xl border border-[#00C1B2]/20 bg-[#00C1B2]/5 p-4">
                          <p className="mb-1 text-sm font-semibold text-[#1A2B4C]">
                            Therapist Comment
                          </p>
                          <p className="whitespace-pre-line text-sm text-[#1A2B4C]/75">
                            {log.therapist_comment}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Link href={`/dashboard/logs/${log.id}/review`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {log.child && (
                        <Link href={`/dashboard/children/${log.child.id}`}>
                          <Button variant="outline" size="sm">
                            View Child
                          </Button>
                        </Link>
                      )}
                      {log.status === 'pending' && log.creator_id === user?.id && (
                        <Link href={`/dashboard/logs/${log.id}/edit`}>
                          <Button variant="brand" size="sm">
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </DashboardSectionCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
