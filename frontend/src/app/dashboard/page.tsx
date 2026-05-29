'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, Child, Session, ParentLog, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { isClinicalOrAdmin, isClinicalStaff } from '@/lib/roles';

export default function DashboardPage() {
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
    try {
      setLoading(true);
      const promises: Promise<any>[] = [
        apiClient.get<ApiResponse<Child[]>>('/children'),
      ];

      if (isClinicalOrAdmin(user?.role)) {
        promises.push(apiClient.get<ApiResponse<Session[]>>('/sessions'));
        promises.push(apiClient.get<ApiResponse<ParentLog[]>>('/parent-logs?status=pending'));
      } else if (user?.role === 'parent') {
        promises.push(apiClient.get<ApiResponse<ParentLog[]>>('/parent-logs'));
      }

      const results = await Promise.all(promises);

      if (results[0].data.success) {
        setChildren(results[0].data.data || []);
      }
      if (isClinicalOrAdmin(user?.role)) {
        if (results[1]?.data.success && results[1].data.data) {
          setSessions(results[1].data.data.slice(0, 5));
        }
        if (results[2]?.data.success && results[2].data.data) {
          setPendingLogs(results[2].data.data || []);
        }
      } else if (user?.role === 'parent') {
        if (results[1]?.data.success && results[1].data.data) {
          setLogs(results[1].data.data || []);
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
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('dashboard')}</h1>
            <p className="mt-2 text-gray-600">
              {t('welcomeBack')}, {user.name}!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShowTour}
            >
              {/* Hardcode label to avoid missing translation key type error */}
              Lihat tur lagi
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">{t('loading')}...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Stats Cards */}
            <Link href="/dashboard/children" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">{children.length}</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {user.role === 'parent' ? t('myChildren') : t('children')}
                      </dt>
                    </dl>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {user.role === 'parent' && (
              <Link href="/dashboard/logs" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {t('activityLogs')}
                        </dt>
                      </dl>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {isClinicalStaff(user.role) && (
              <>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {t('recentSessions')}
                          </dt>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="text-2xl font-bold text-yellow-600">{pendingLogs.length}</div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {t('pendingLogs')}
                          </dt>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Quick Actions */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('quickActions')}</h3>
                <div className="space-y-2">
                  {user.role === 'parent' && (
                    <>
                      <Link href="/dashboard/logs/new">
                        <Button className="w-full" size="sm">{t('newActivityLog')}</Button>
                      </Link>
                      <Link href="/dashboard/children/new">
                        <Button className="w-full" size="sm" variant="outline">{t('addChild')}</Button>
                      </Link>
                    </>
                  )}
                  {isClinicalStaff(user.role) && (
                    <>
                      <Link href="/dashboard/logs/new">
                        <Button className="w-full" size="sm">{t('recordSession')}</Button>
                      </Link>
                      {pendingLogs.length > 0 && (
                        <Link href="/dashboard/logs?status=pending">
                          <Button className="w-full" size="sm" variant="outline">
                            {t('reviewLogs')} ({pendingLogs.length})
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Module */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{t('modules')}</h3>
                <Link href="/dashboard/modules">
                  <Button variant="outline" size="sm">{t('viewAll')}</Button>
                </Link>
              </div>
              <p className="mt-2 text-sm text-gray-600">{t('modulesDashboardBlurb')}</p>
            </div>
          </div>
        </div>

        {/* Recent Children */}
        {children.length > 0 && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {user.role === 'parent' ? t('myChildren') : t('children')}
                </h3>
                <div className="space-y-4">
                  {children.slice(0, 5).map((child) => (
                    <Link
                      key={child.id}
                      href={`/dashboard/children/${child.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">{child.name}</h4>
                          <p className="text-sm text-gray-500">
                            {t('quotaLabel')}: {child.used_sessions}/{child.monthly_quota} {t('sessionsLabel')}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {child.diagnosis || t('noDiagnosis')}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {children.length > 5 && (
                  <div className="mt-4">
                    <Link href="/dashboard/children">
                      <Button variant="outline" size="sm">{t('viewAll')}</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {showTour && user && (
        <DashboardTour role={user.role} onFinish={handleFinishTour} />
      )}
    </DashboardLayout>
  );
}

