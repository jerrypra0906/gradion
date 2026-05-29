'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, LearningModuleProgress } from '@/lib/api';
import { learningModules } from '@/lib/modules';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

export default function ModulesPage() {
  const { t, language } = useTranslation();
  const [progress, setProgress] = useState<LearningModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ApiResponse<LearningModuleProgress[]>>('/modules/progress');
      if (res.data.success) setProgress(res.data.data || []);
      else setError(res.data.error || 'Failed to load modules');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const byKey = useMemo(() => {
    const m = new Map<string, LearningModuleProgress>();
    for (const p of progress) m.set(p.module_key, p);
    return m;
  }, [progress]);

  const isCompleted = (key: string) => {
    const p = byKey.get(key);
    return Boolean(p?.video_completed && p?.quiz_passed);
  };

  const isUnlocked = (order: number, key: string) => {
    if (order === 1) return true;
    const prev = learningModules.find((m) => m.order === order - 1);
    return prev ? isCompleted(prev.key) : false;
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('modules')}</h1>
          <p className="mt-2 text-gray-600">
            {language === 'id'
              ? 'Selesaikan tiap modul (tonton video + lulus kuis) untuk membuka modul berikutnya.'
              : 'Complete each module (watch video + pass quiz) to unlock the next.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">{t('loading')}...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningModules.map((m) => {
              const unlocked = isUnlocked(m.order, m.key);
              const completed = isCompleted(m.key);
              return (
                <div
                  key={m.key}
                  className={`rounded-lg border bg-white p-5 shadow-sm ${
                    unlocked ? 'border-gray-200' : 'border-gray-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-500">MODULE {m.order}</div>
                      <h2 className="mt-1 text-lg font-semibold text-gray-900">
                        {m.title[language]}
                      </h2>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                        {m.concept[language]}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          completed
                            ? 'bg-green-100 text-green-800'
                            : unlocked
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {completed
                          ? language === 'id'
                            ? 'Selesai'
                            : 'Completed'
                          : unlocked
                          ? language === 'id'
                            ? 'Terbuka'
                            : 'Unlocked'
                          : language === 'id'
                          ? 'Terkunci'
                          : 'Locked'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {completed
                        ? language === 'id'
                          ? 'Bisa dipelajari ulang kapan saja.'
                          : 'You can revisit anytime.'
                        : unlocked
                        ? language === 'id'
                          ? 'Langkah berikut: tonton & kerjakan kuis.'
                          : 'Next step: watch & quiz.'
                        : language === 'id'
                        ? 'Selesaikan modul sebelumnya.'
                        : 'Finish previous module.'}
                    </div>
                    {unlocked ? (
                      <Link href={`/dashboard/modules/${m.key}`}>
                        <Button size="sm">
                          {completed
                            ? language === 'id'
                              ? 'Ulas'
                              : 'Review'
                            : language === 'id'
                            ? 'Mulai'
                            : 'Start'}
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" disabled>
                        {language === 'id' ? 'Terkunci' : 'Locked'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

