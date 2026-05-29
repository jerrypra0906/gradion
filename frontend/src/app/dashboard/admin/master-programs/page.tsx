'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';

type AbaMasterProgramRow = {
  id: string;
  language: 'en' | 'id' | string;
  canonical_key: string;
  name: string;
  domain?: string | null;
  rationale?: string | null;
  targets?: any;
  recommended_trials_per_day?: number | null;
  materials?: any;
  data_collection?: any;
  demo_video_url?: string | null;
  created_at: string;
  updated_at: string;
};

function jsonListToBullets(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [];
}

export default function AdminMasterProgramsPage() {
  const { user } = useAuthStore();
  const { t, language } = useTranslation();

  const [rows, setRows] = useState<AbaMasterProgramRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [langFilter, setLangFilter] = useState<'id' | 'en'>(language === 'en' ? 'en' : 'id');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLangFilter(language === 'en' ? 'en' : 'id');
  }, [language]);

  const canAccess = user?.role === 'admin';

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get<ApiResponse<{ rows: AbaMasterProgramRow[]; total: number }>>(
        `/admin/aba-master-programs?lang=${encodeURIComponent(langFilter)}&search=${encodeURIComponent(
          search.trim()
        )}&take=200`
      );
      if (!res.data.success) {
        setError(res.data.error || 'Failed to load master programs');
        return;
      }
      setRows(res.data.data?.rows || []);
      setTotal(res.data.data?.total || 0);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load master programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, langFilter]);

  const filteredCountLabel = useMemo(() => {
    if (loading) return '';
    const shown = rows.length;
    const base = `${shown}/${total}`;
    return total > 0 ? base : `${shown}`;
  }, [rows.length, total, loading]);

  if (!user) return null;

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="px-4 py-8">
          <p className="text-red-600">Access denied. Admin only.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0 max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ABA Master Program Library</h1>
            <div className="text-sm text-gray-600">
              {language === 'id'
                ? 'Daftar program “master” yang dipakai ulang saat membuat program mingguan.'
                : 'Reusable “master” programs captured from AI generations.'}{' '}
              {filteredCountLabel ? <span className="text-gray-500">({filteredCountLabel})</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value === 'en' ? 'en' : 'id')}
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
            <div className="w-64">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'id' ? 'Cari (nama, domain, alasan)…' : 'Search (name, domain, rationale)…'}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? t('loading') : language === 'id' ? 'Muat' : 'Load'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {rows.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-600">
              {language === 'id'
                ? 'Belum ada program master. Buat program mingguan dulu.'
                : 'No master programs yet. Generate a weekly program first.'}
            </div>
          ) : null}

          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const expanded = expandedId === r.id;
              const targets = jsonListToBullets(r.targets);
              const materials = jsonListToBullets(r.materials);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start justify-between gap-3"
                    onClick={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                      <div className="mt-0.5 text-xs text-gray-600">
                        <span className="font-mono">{r.id}</span>
                        {r.domain ? <span className="ml-2">· {r.domain}</span> : null}
                        {typeof r.recommended_trials_per_day === 'number' ? (
                          <span className="ml-2">· {r.recommended_trials_per_day} trials/day</span>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm shrink-0" aria-hidden>
                      {expanded ? '▾' : '▸'}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="px-4 pb-4 space-y-3 text-sm text-gray-800">
                      {r.rationale ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {language === 'id' ? 'Alasan' : 'Rationale'}
                          </div>
                          <div className="mt-1 text-sm text-gray-700">{r.rationale}</div>
                        </div>
                      ) : null}

                      {targets.length ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {language === 'id' ? 'Target' : 'Targets'}
                          </div>
                          <div className="mt-1 text-sm text-gray-700">{targets.join(' · ')}</div>
                        </div>
                      ) : null}

                      {materials.length ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {language === 'id' ? 'Alat' : 'Materials'}
                          </div>
                          <div className="mt-1 text-sm text-gray-700">{materials.join(' · ')}</div>
                        </div>
                      ) : null}

                      {r.demo_video_url ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {t('abaProgramVideoTitle')}
                          </div>
                          <a
                            href={r.demo_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-sm text-blue-700 underline break-all"
                          >
                            {r.demo_video_url}
                          </a>
                        </div>
                      ) : null}

                      <div className="text-xs text-gray-500">
                        {language === 'id' ? 'Diperbarui' : 'Updated'}:{' '}
                        {new Date(r.updated_at).toLocaleString()}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

