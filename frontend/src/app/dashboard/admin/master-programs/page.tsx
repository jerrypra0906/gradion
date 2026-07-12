'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
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
  steps?: any;
  prompts?: any;
  mastery_criteria?: string | null;
  is_curated?: boolean;
  is_archived?: boolean;
  merged_into_id?: string | null;
  usage_count?: number;
  created_at: string;
  updated_at: string;
};

type StatusFilter = 'active' | 'curated' | 'archived';

function jsonListToBullets(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [];
}

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

type EditForm = {
  name: string;
  domain: string;
  rationale: string;
  targets: string;
  materials: string;
  trials: string;
  videoUrl: string;
  steps: string;
  prompts: string;
  masteryCriteria: string;
};

export default function AdminMasterProgramsPage() {
  const { user } = useAuthStore();
  const { t, language } = useTranslation();
  const isId = language === 'id';

  const [rows, setRows] = useState<AbaMasterProgramRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [langFilter, setLangFilter] = useState<'id' | 'en'>(language === 'en' ? 'en' : 'id');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Merge selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeKeepId, setMergeKeepId] = useState<string>('');
  const [mergeBusy, setMergeBusy] = useState(false);

  // Edit modal
  const [editRow, setEditRow] = useState<AbaMasterProgramRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const [archiveBusyId, setArchiveBusyId] = useState<string>('');
  const [translateBusyId, setTranslateBusyId] = useState<string>('');
  const [repairBusy, setRepairBusy] = useState(false);

  useEffect(() => {
    setLangFilter(language === 'en' ? 'en' : 'id');
  }, [language]);

  const canAccess = user?.role === 'admin';

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get<ApiResponse<{ rows: AbaMasterProgramRow[]; total: number }>>(
        `/admin/aba-master-programs?lang=${encodeURIComponent(langFilter)}&status=${statusFilter}&search=${encodeURIComponent(
          search.trim()
        )}&take=200`
      );
      if (!res.data.success) {
        setError(res.data.error || 'Failed to load master programs');
        return;
      }
      setRows(res.data.data?.rows || []);
      setTotal(res.data.data?.total || 0);
      setSelectedIds([]);
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
  }, [canAccess, langFilter, statusFilter]);

  const filteredCountLabel = useMemo(() => {
    if (loading) return '';
    const shown = rows.length;
    const base = `${shown}/${total}`;
    return total > 0 ? base : `${shown}`;
  }, [rows.length, total, loading]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const openEdit = (row: AbaMasterProgramRow) => {
    setEditRow(row);
    setEditError('');
    setEditForm({
      name: row.name || '',
      domain: row.domain || '',
      rationale: row.rationale || '',
      targets: jsonListToBullets(row.targets).join('\n'),
      materials: jsonListToBullets(row.materials).join('\n'),
      trials:
        typeof row.recommended_trials_per_day === 'number'
          ? String(row.recommended_trials_per_day)
          : '',
      videoUrl: row.demo_video_url || '',
      steps: jsonListToBullets(row.steps).join('\n'),
      prompts: jsonListToBullets(row.prompts).join('\n'),
      masteryCriteria: row.mastery_criteria || '',
    });
  };

  const saveEdit = async () => {
    if (!editRow || !editForm) return;
    const trialsNum = editForm.trials.trim() ? parseInt(editForm.trials.trim(), 10) : null;
    if (editForm.trials.trim() && (!Number.isFinite(trialsNum) || trialsNum! < 1 || trialsNum! > 100)) {
      setEditError(isId ? 'Jumlah trial harus angka 1–100.' : 'Trials per day must be a number from 1–100.');
      return;
    }
    try {
      setEditBusy(true);
      setEditError('');
      const res = await apiClient.patch<ApiResponse<{ row: AbaMasterProgramRow }>>(
        `/admin/aba-master-programs/${encodeURIComponent(editRow.id)}`,
        {
          name: editForm.name.trim(),
          domain: editForm.domain.trim() || null,
          rationale: editForm.rationale.trim() || null,
          targets: linesToList(editForm.targets),
          materials: linesToList(editForm.materials),
          recommended_trials_per_day: trialsNum,
          demo_video_url: editForm.videoUrl.trim() || null,
          steps: linesToList(editForm.steps),
          prompts: linesToList(editForm.prompts),
          mastery_criteria: editForm.masteryCriteria.trim() || null,
        }
      );
      if (!res.data.success) {
        setEditError(res.data.error || 'Failed to save');
        return;
      }
      setEditRow(null);
      setEditForm(null);
      setNotice(
        isId
          ? 'Tersimpan. Program ini sekarang “terkurasi”: AI akan meniru gayanya dan tidak akan menimpanya.'
          : 'Saved. This program is now “curated”: the AI will imitate its style and never overwrite it.'
      );
      void load();
    } catch (e: any) {
      setEditError(e.response?.data?.error || 'Failed to save');
    } finally {
      setEditBusy(false);
    }
  };

  const toggleArchive = async (row: AbaMasterProgramRow) => {
    const archiving = !row.is_archived;
    const confirmText = archiving
      ? isId
        ? `Arsipkan “${row.name}”? AI tidak akan memakai program ini lagi untuk program mingguan baru.`
        : `Archive “${row.name}”? The AI will stop using this program for new weekly plans.`
      : isId
        ? `Pulihkan “${row.name}”? AI boleh memakai program ini lagi.`
        : `Restore “${row.name}”? The AI may use this program again.`;
    if (!window.confirm(confirmText)) return;

    try {
      setArchiveBusyId(row.id);
      const res = await apiClient.post<ApiResponse<{ row: AbaMasterProgramRow }>>(
        `/admin/aba-master-programs/${encodeURIComponent(row.id)}/archive`,
        { archived: archiving }
      );
      if (!res.data.success) {
        setError(res.data.error || 'Failed to update');
        return;
      }
      setNotice(
        archiving
          ? isId
            ? 'Program diarsipkan.'
            : 'Program archived.'
          : isId
            ? 'Program dipulihkan.'
            : 'Program restored.'
      );
      void load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update');
    } finally {
      setArchiveBusyId('');
    }
  };

  // Create the counterpart of this program in the other language so weekly
  // plans in both languages can reuse it.
  const handleTranslate = async (row: AbaMasterProgramRow) => {
    const to = langFilter === 'id' ? 'en' : 'id';
    try {
      setTranslateBusyId(row.id);
      setError('');
      const res = await apiClient.post<
        ApiResponse<{ row: AbaMasterProgramRow; already_existed: boolean }>
      >(`/admin/aba-master-programs/${encodeURIComponent(row.id)}/translate`, { to });
      if (!res.data.success) {
        setError(res.data.error || 'Failed to translate');
        return;
      }
      const existed = res.data.data?.already_existed;
      setNotice(
        existed
          ? isId
            ? `Versi ${to === 'id' ? 'Bahasa Indonesia' : 'English'} untuk “${row.name}” sudah ada.`
            : `A ${to === 'id' ? 'Bahasa Indonesia' : 'English'} version of “${row.name}” already exists.`
          : isId
            ? `Versi ${to === 'id' ? 'Bahasa Indonesia' : 'English'} untuk “${row.name}” berhasil dibuat (terkurasi).`
            : `Created the ${to === 'id' ? 'Bahasa Indonesia' : 'English'} version of “${row.name}” (curated).`
      );
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to translate');
    } finally {
      setTranslateBusyId('');
    }
  };

  // Backfill missing masters from stored weekly plans and repair guided-flow
  // drift so parents can run every program card.
  const handleRepairPlans = async () => {
    try {
      setRepairBusy(true);
      setError('');
      const res = await apiClient.post<
        ApiResponse<{ weeks_scanned: number; masters_backfilled: number; plans_repaired: number }>
      >('/admin/aba-master-programs/repair-plans', {});
      if (!res.data.success || !res.data.data) {
        setError(res.data.error || 'Repair failed');
        return;
      }
      const d = res.data.data;
      setNotice(
        isId
          ? `Selesai: ${d.weeks_scanned} minggu diperiksa, ${d.plans_repaired} rencana diperbaiki, ${d.masters_backfilled} program ditambahkan ke pustaka.`
          : `Done: ${d.weeks_scanned} weeks scanned, ${d.plans_repaired} plans repaired, ${d.masters_backfilled} programs backfilled into the library.`
      );
      void load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Repair failed');
    } finally {
      setRepairBusy(false);
    }
  };

  const openMerge = () => {
    if (selectedIds.length < 2) return;
    setMergeKeepId(selectedIds[0]);
    setMergeOpen(true);
  };

  const doMerge = async () => {
    if (!mergeKeepId || selectedIds.length < 2) return;
    const mergeIds = selectedIds.filter((id) => id !== mergeKeepId);
    try {
      setMergeBusy(true);
      const res = await apiClient.post<ApiResponse<{ row: AbaMasterProgramRow }>>(
        '/admin/aba-master-programs/merge',
        { keep_id: mergeKeepId, merge_ids: mergeIds }
      );
      if (!res.data.success) {
        setError(res.data.error || 'Failed to merge');
        return;
      }
      setMergeOpen(false);
      setSelectedIds([]);
      setNotice(
        isId
          ? 'Digabungkan. Duplikat diarsipkan dan AI akan memakai program yang dipertahankan.'
          : 'Merged. Duplicates were archived and the AI will use the kept program.'
      );
      void load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to merge');
    } finally {
      setMergeBusy(false);
    }
  };

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

  const statusTabs: Array<{ key: StatusFilter; labelId: string; labelEn: string }> = [
    { key: 'active', labelId: 'Aktif', labelEn: 'Active' },
    { key: 'curated', labelId: 'Terkurasi', labelEn: 'Curated' },
    { key: 'archived', labelId: 'Arsip', labelEn: 'Archived' },
  ];

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0 max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ABA Master Program Library</h1>
          <p className="mt-1 text-sm text-gray-600">
            {isId
              ? 'Program yang dipakai ulang AI saat membuat program mingguan. Ubah program untuk mengajari AI gaya yang Anda mau, gabungkan duplikat, atau arsipkan yang tidak boleh dipakai.'
              : 'Programs the AI reuses when creating weekly plans. Edit a program to teach the AI the style you want, merge duplicates, or archive ones it should not use.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`px-3 py-1.5 text-sm rounded-md ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {isId ? tab.labelId : tab.labelEn}
              </button>
            ))}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void load();
                }}
                placeholder={isId ? 'Cari (nama, domain, alasan)…' : 'Search (name, domain, rationale)…'}
              />
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? t('loading') : isId ? 'Muat' : 'Load'}
            </Button>
            <Button onClick={() => void handleRepairPlans()} disabled={repairBusy}>
              {repairBusy
                ? isId
                  ? 'Memperbaiki…'
                  : 'Repairing…'
                : isId
                  ? 'Perbaiki rencana mingguan'
                  : 'Repair weekly plans'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="flex items-start justify-between rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <span>{notice}</span>
            <button type="button" className="ml-3 text-green-700" onClick={() => setNotice('')}>
              ✕
            </button>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
            <div className="text-sm text-blue-900">
              {isId
                ? `${selectedIds.length} program dipilih.`
                : `${selectedIds.length} program(s) selected.`}{' '}
              {selectedIds.length < 2
                ? isId
                  ? 'Pilih minimal 2 untuk menggabungkan duplikat.'
                  : 'Select at least 2 to merge duplicates.'
                : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                {isId ? 'Batal' : 'Clear'}
              </Button>
              <Button size="sm" onClick={openMerge} disabled={selectedIds.length < 2}>
                {isId ? 'Gabungkan duplikat…' : 'Merge duplicates…'}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {rows.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-600">
              {statusFilter === 'archived'
                ? isId
                  ? 'Tidak ada program yang diarsipkan.'
                  : 'No archived programs.'
                : isId
                  ? 'Belum ada program master. Buat program mingguan dulu.'
                  : 'No master programs yet. Generate a weekly program first.'}
            </div>
          ) : null}

          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const expanded = expandedId === r.id;
              const targets = jsonListToBullets(r.targets);
              const materials = jsonListToBullets(r.materials);
              const steps = jsonListToBullets(r.steps);
              const prompts = jsonListToBullets(r.prompts);
              const selected = selectedIds.includes(r.id);
              return (
                <li key={r.id} className={selected ? 'bg-blue-50/50' : undefined}>
                  <div className="flex items-start gap-2 px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                      checked={selected}
                      onChange={() => toggleSelected(r.id)}
                      aria-label={isId ? 'Pilih untuk digabung' : 'Select for merge'}
                    />
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left flex items-start justify-between gap-3"
                      onClick={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 flex flex-wrap items-center gap-1.5">
                          <span>{r.name}</span>
                          {r.is_curated ? (
                            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                              ✓ {isId ? 'Terkurasi' : 'Curated'}
                            </span>
                          ) : null}
                          {r.is_archived ? (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                              {isId ? 'Arsip' : 'Archived'}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-600">
                          {r.domain ? <span>{r.domain}</span> : null}
                          {typeof r.recommended_trials_per_day === 'number' ? (
                            <span className={r.domain ? 'ml-2' : undefined}>
                              · {r.recommended_trials_per_day} {isId ? 'trial/hari' : 'trials/day'}
                            </span>
                          ) : null}
                          {typeof r.usage_count === 'number' && r.usage_count > 0 ? (
                            <span className="ml-2">
                              · {isId ? `dipakai ${r.usage_count}×` : `used ${r.usage_count}×`}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm shrink-0" aria-hidden>
                        {expanded ? '▾' : '▸'}
                      </span>
                    </button>
                  </div>

                  {expanded ? (
                    <div className="px-4 pb-4 pl-10 space-y-3 text-sm text-gray-800">
                      {r.rationale ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {isId ? 'Alasan' : 'Rationale'}
                          </div>
                          <div className="mt-1 text-sm text-gray-700">{r.rationale}</div>
                        </div>
                      ) : null}

                      {targets.length ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {isId ? 'Target' : 'Targets'}
                          </div>
                          <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
                            {targets.map((tg, i) => (
                              <li key={i}>{tg}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {materials.length ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {isId ? 'Alat' : 'Materials'}
                          </div>
                          <div className="mt-1 text-sm text-gray-700">{materials.join(' · ')}</div>
                        </div>
                      ) : null}

                      {steps.length ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {isId ? 'Langkah' : 'Steps (Langkah)'}
                          </div>
                          <ol className="mt-1 list-decimal pl-5 text-sm text-gray-700">
                            {steps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      ) : null}

                      {prompts.length ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {isId ? 'Prompt (bantuan)' : 'Prompts'}
                          </div>
                          <ol className="mt-1 list-decimal pl-5 text-sm text-gray-700">
                            {prompts.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      ) : null}

                      {r.mastery_criteria ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            {isId ? 'Kriteria ketuntasan' : 'Mastery criteria'}
                          </div>
                          <div className="mt-1 text-sm text-gray-700">{r.mastery_criteria}</div>
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
                        <span className="font-mono">{r.id}</span> ·{' '}
                        {isId ? 'Diperbarui' : 'Updated'}: {new Date(r.updated_at).toLocaleString()}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          {isId ? 'Ubah' : 'Edit'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleArchive(r)}
                          disabled={archiveBusyId === r.id}
                        >
                          {archiveBusyId === r.id
                            ? '…'
                            : r.is_archived
                              ? isId
                                ? 'Pulihkan'
                                : 'Restore'
                              : isId
                                ? 'Arsipkan'
                                : 'Archive'}
                        </Button>
                        {!r.is_archived && !r.merged_into_id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleTranslate(r)}
                            disabled={translateBusyId === r.id}
                          >
                            {translateBusyId === r.id
                              ? isId
                                ? 'Menerjemahkan…'
                                : 'Translating…'
                              : langFilter === 'id'
                                ? isId
                                  ? 'Buat versi English'
                                  : 'Create English version'
                                : isId
                                  ? 'Buat versi Indonesia'
                                  : 'Create Indonesian version'}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="text-xs text-gray-500">
          {filteredCountLabel ? <span>({filteredCountLabel}) </span> : null}
          {isId
            ? 'Program yang Anda ubah atau pertahankan saat penggabungan menjadi “terkurasi”: AI meniru gayanya sebagai contoh dan tidak akan menimpanya.'
            : 'Programs you edit, or keep during a merge, become “curated”: the AI imitates them as exemplars and never overwrites them.'}
        </div>
      </div>

      {/* Edit modal */}
      {editRow && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isId ? 'Ubah program' : 'Edit program'}
              </h2>
              <p className="mt-0.5 text-xs text-gray-600">
                {isId
                  ? 'Perubahan Anda juga menjadi contoh bagi AI untuk program berikutnya.'
                  : 'Your changes also become an example the AI learns from for future programs.'}
              </p>
            </div>

            {editError ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {editError}
              </div>
            ) : null}

            <Input
              label={isId ? 'Nama program' : 'Program name'}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <Input
              label={
                isId ? 'Domain (mis. Komunikasi, Imitasi)' : 'Domain (e.g. Communication, Imitation)'
              }
              value={editForm.domain}
              onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
            />
            <Textarea
              label={isId ? 'Alasan (mengapa program ini)' : 'Rationale (why this program)'}
              value={editForm.rationale}
              onChange={(e) => setEditForm({ ...editForm, rationale: e.target.value })}
              className="min-h-[72px]"
            />
            <Textarea
              label={isId ? 'Target — satu per baris' : 'Targets — one per line'}
              value={editForm.targets}
              onChange={(e) => setEditForm({ ...editForm, targets: e.target.value })}
            />
            <Textarea
              label={isId ? 'Alat/bahan — satu per baris' : 'Materials — one per line'}
              value={editForm.materials}
              onChange={(e) => setEditForm({ ...editForm, materials: e.target.value })}
              className="min-h-[72px]"
            />
            <Textarea
              label={isId ? 'Langkah — satu per baris' : 'Steps (Langkah) — one per line'}
              value={editForm.steps}
              onChange={(e) => setEditForm({ ...editForm, steps: e.target.value })}
            />
            <Textarea
              label={
                isId
                  ? 'Prompt (bantuan, dari paling banyak ke mandiri) — satu per baris'
                  : 'Prompts (most-to-least help) — one per line'
              }
              value={editForm.prompts}
              onChange={(e) => setEditForm({ ...editForm, prompts: e.target.value })}
              className="min-h-[72px]"
            />
            <Input
              label={isId ? 'Kriteria ketuntasan' : 'Mastery criteria'}
              value={editForm.masteryCriteria}
              placeholder={
                isId
                  ? 'mis. 80% mandiri selama 3 hari berturut-turut'
                  : 'e.g. 80% independent across 3 consecutive days'
              }
              onChange={(e) => setEditForm({ ...editForm, masteryCriteria: e.target.value })}
            />
            <Input
              label={isId ? 'Trial per hari (angka)' : 'Trials per day (number)'}
              value={editForm.trials}
              inputMode="numeric"
              onChange={(e) => setEditForm({ ...editForm, trials: e.target.value })}
            />
            <Input
              label={isId ? 'Link video contoh (opsional)' : 'Demo video link (optional)'}
              value={editForm.videoUrl}
              placeholder="https://…"
              onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setEditRow(null);
                  setEditForm(null);
                }}
                disabled={editBusy}
              >
                {isId ? 'Batal' : 'Cancel'}
              </Button>
              <Button onClick={() => void saveEdit()} disabled={editBusy || !editForm.name.trim()}>
                {editBusy ? (isId ? 'Menyimpan…' : 'Saving…') : isId ? 'Simpan' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Merge modal */}
      {mergeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isId ? 'Gabungkan duplikat' : 'Merge duplicates'}
              </h2>
              <p className="mt-0.5 text-xs text-gray-600">
                {isId
                  ? 'Pilih satu program yang DIPERTAHANKAN. Sisanya diarsipkan, dan AI akan selalu memakai program yang dipertahankan.'
                  : 'Choose the ONE program to KEEP. The others are archived, and the AI will always use the kept one.'}
              </p>
            </div>

            <div className="space-y-2">
              {selectedRows.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer ${
                    mergeKeepId === r.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="merge-keep"
                    className="mt-0.5"
                    checked={mergeKeepId === r.id}
                    onChange={() => setMergeKeepId(r.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{r.name}</span>
                    <span className="block text-xs text-gray-600">
                      {r.domain || '—'}
                      {typeof r.usage_count === 'number' && r.usage_count > 0
                        ? ` · ${isId ? `dipakai ${r.usage_count}×` : `used ${r.usage_count}×`}`
                        : ''}
                      {r.is_curated ? ` · ${isId ? 'terkurasi' : 'curated'}` : ''}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setMergeOpen(false)} disabled={mergeBusy}>
                {isId ? 'Batal' : 'Cancel'}
              </Button>
              <Button onClick={() => void doMerge()} disabled={mergeBusy || !mergeKeepId}>
                {mergeBusy
                  ? isId
                    ? 'Menggabungkan…'
                    : 'Merging…'
                  : isId
                    ? `Gabungkan ${selectedRows.length} program`
                    : `Merge ${selectedRows.length} programs`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
