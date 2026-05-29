'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, Child, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';

export default function ChildrenPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (response.data.success) {
        setChildren(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch children');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('children')}</h1>
            <p className="mt-2 text-gray-600">
              {user.role === 'parent' ? t('manageYourChildren') : t('viewAssignedChildren')}
            </p>
          </div>
          {user.role === 'parent' && (
            <Link href="/dashboard/children/new">
              <Button>{t('addChild')}</Button>
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">{t('loading')}...</div>
        ) : children.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{t('noChildren')}</p>
            {user.role === 'parent' && (
              <Link href="/dashboard/children/new">
                <Button>{t('addYourFirstChild')}</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/dashboard/children/${child.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {child.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{child.name}</div>
                            <div className="text-sm text-gray-500">
                              {child.diagnosis || t('noDiagnosis')} • {t('age')}: {child.birthdate ? 
                                Math.floor((new Date().getTime() - new Date(child.birthdate).getTime()) / (1000 * 60 * 60 * 24 * 365))
                                : t('nA')} {t('years')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {child.used_sessions} / {child.monthly_quota}
                          </div>
                          <div className="text-sm text-gray-500">{t('activityLogs')}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

