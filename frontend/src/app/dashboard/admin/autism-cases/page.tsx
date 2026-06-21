'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';

type AutismCaseRow = {
  id: string;
  case_number: number | null;
  observation_text: string;
  observation_json?: unknown;
  initial_programs: string[] | unknown;
  plan_snapshot_json?: unknown;
  source: 'mock' | 'generated' | string;
  child_id?: number | null;
  language: string;
  created_at: string;
  updated_at: string;
  child?: { id: number; name: string } | null;
};

function jsonListToBullets(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [];
}

export default function AdminAutismCasesPage() {
  const { user } = useAuthStore();
  const { t, language } = useTranslation();

  const [rows, setRows] = useState<AutismCaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [sourceFilter, setSourceFilter] = useState<'all' | 'mock' | 'generated'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canAccess = user?.role === 'admin';

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get<ApiResponse<{ rows: AutismCaseRow[]; total: number }>>(
        `/admin/aba-autism-cases?source=${encodeURIComponent(sourceFilter)}&search=${encodeURIComponent(
          search.trim()
        )}&take=200`
      );
      if (!res.data.success) {
        setError(res.data.error || 'Failed to load autism cases');
        return;
      }
      setRows(res.data.data?.rows || []);
      setTotal(res.data.data?.total || 0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Failed to load autism cases');
    } finally {
      setLoading(false);
    }
  };

  const seedMockCases = async () => {
    try {
      setSeeding(true);
      setError('');
      setSuccessMsg('');
      const res = await apiClient.post<ApiResponse<{ inserted: number; updated: number }>>(
        '/admin/aba-autism-cases/seed-mock'
      );
      if (!res.data.success) {
        setError(res.data.error || 'Failed to seed mock cases');
        return;
      }
      const d = res.data.data;
      setSuccessMsg(
        language === 'id'
          ? `Mock cases dimuat: ${d?.inserted ?? 0} baru, ${d?.updated ?? 0} diperbarui.`
          : `Mock cases loaded: ${d?.inserted ?? 0} new, ${d?.updated ?? 0} updated.`
      );
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Failed to seed mock cases');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, sourceFilter]);

  const filteredCountLabel = useMemo(() => {
    if (loading) return '';
    const shown = rows.length;
    return total > 0 ? `${shown}/${total}` : `${shown}`;
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
            <h1 className="text-2xl font-bold text-gray-900">
              {language === 'id' ? 'Master Kasus Autism — Program Awal' : 'Master Autism Cases — Initial Programs'}
            </h1>
            <div className="text-sm text-gray-600">
              {language === 'id'
                ? 'Observasi awal dan program ABA referensi. Kasus mock dari sample + kasus baru dari AI setiap kali program dibuat.'
                : 'Initial observations paired with ABA programs. Mock reference cases plus AI-generated cases from new observations.'}{' '}
              {filteredCountLabel ? <span className="text-gray-500">({filteredCountLabel})</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              value={sourceFilter}
              onChange={(e) => {
                const v = e.target.value;
                setSourceFilter(v === 'mock' || v === 'generated' ? v : 'all');
              }}
            >
              <option value="all">{language === 'id' ? 'Semua sumber' : 'All sources'}</option>
              <option value="mock">{language === 'id' ? 'Mock (sample)' : 'Mock (sample)'}</option>
              <option value="generated">{language === 'id' ? 'Dari AI' : 'AI-generated'}</option>
            </select>
            <div className="w-64">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'id' ? 'Cari observasi…' : 'Search observations…'}
              />
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? t('loading') : language === 'id' ? 'Muat' : 'Load'}
            </Button>
            <Button variant="outline" onClick={() => void seedMockCases()} disabled={seeding}>
              {seeding
                ? t('loading')
                : language === 'id'
                  ? 'Muat 20 Mock Cases'
                  : 'Load 20 Mock Cases'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {successMsg && (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {successMsg}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {rows.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-600">
              {language === 'id'
                ? 'Belum ada kasus. Klik "Muat 20 Mock Cases" atau buat program mingguan dari observasi anak.'
                : 'No cases yet. Click "Load 20 Mock Cases" or generate a weekly program from a child observation.'}
            </div>
          ) : null}

          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const expanded = expandedId === r.id;
              const programs = jsonListToBullets(r.initial_programs);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start justify-between gap-3"
                    onClick={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {r.case_number != null
                            ? `Case ${r.case_number}`
                            : r.child?.name
                              ? r.child.name
                              : r.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            r.source === 'mock'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {r.source}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700 line-clamp-2">{r.observation_text}</div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {programs.length} {language === 'id' ? 'program' : 'programs'}
                        {r.child ? ` · Child #${r.child.id}` : ''}
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm shrink-0" aria-hidden>
                      {expanded ? '▾' : '▸'}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="px-4 pb-4 space-y-3 text-sm text-gray-800">
                      <div>
                        <div className="text-xs font-semibold text-gray-900">
                          {language === 'id' ? 'Observasi' : 'Observation'}
                        </div>
                        <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{r.observation_text}</div>
                      </div>

                      {programs.length ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {language === 'id' ? 'Program Awal' : 'Initial Programs'}
                          </div>
                          <ol className="mt-1 list-decimal list-inside space-y-1 text-sm text-gray-700">
                            {programs.map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ol>
                        </div>
                      ) : null}

                      <div className="text-xs text-gray-500">
                        <span className="font-mono">{r.id}</span>
                        {' · '}
                        {language === 'id' ? 'Diperbarui' : 'Updated'}: {new Date(r.updated_at).toLocaleString()}
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
