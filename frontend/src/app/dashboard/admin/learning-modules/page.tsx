'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, LearningModuleCMS } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { learningModules } from '@/lib/modules';

function prettyJson(value: any) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

type LangText = { en: string; id: string };

type QuizOption = { id: 'A' | 'B'; label: LangText };
type QuizQuestion = {
  id: string;
  question: LangText;
  options: QuizOption[];
  correctOptionId: 'A' | 'B';
};

type ModuleDraft = {
  key: string;
  order: number;
  is_active: boolean;
  required_plans: Array<'free' | 'pro' | 'premium' | 'therapist'>;
  prerequisites: string[];
  youtube_url: string;
  title: LangText;
  concept: LangText;
  bullets_en: string; // textarea lines
  bullets_id: string; // textarea lines
  quizEnabled: boolean;
  quiz: QuizQuestion[];
};

function csvToList(v: string) {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToCsv(arr?: string[]) {
  return (arr || []).join(',');
}

function bulletsToText(bullets?: string[]) {
  return (bullets || []).join('\n');
}

function textToBullets(v: string) {
  return v
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function rowToDraft(r: LearningModuleCMS): ModuleDraft {
  const content = (r.content_json || {}) as any;
  const title = (content.title || {}) as any;
  const concept = (content.concept || {}) as any;
  const bullets = (content.bullets || {}) as any;

  const quizObj = r.quiz_json ? (r.quiz_json as any) : null;
  const questionsRaw = Array.isArray(quizObj?.questions) ? quizObj.questions : [];
  const quiz: QuizQuestion[] = questionsRaw.map((q: any, idx: number) => ({
    id: String(q?.id || `q${idx + 1}`),
    question: { en: String(q?.question?.en || ''), id: String(q?.question?.id || '') },
    options: [
      {
        id: 'A',
        label: { en: String(q?.options?.find?.((o: any) => o?.id === 'A')?.label?.en || ''), id: String(q?.options?.find?.((o: any) => o?.id === 'A')?.label?.id || '') },
      },
      {
        id: 'B',
        label: { en: String(q?.options?.find?.((o: any) => o?.id === 'B')?.label?.en || ''), id: String(q?.options?.find?.((o: any) => o?.id === 'B')?.label?.id || '') },
      },
    ],
    correctOptionId: (q?.correctOptionId === 'B' ? 'B' : 'A') as 'A' | 'B',
  }));

  return {
    key: r.key,
    order: r.order,
    is_active: r.is_active,
    required_plans: (r.required_plans || []) as any,
    prerequisites: r.prerequisites || [],
    youtube_url: r.youtube_url || '',
    title: { en: String(title.en || ''), id: String(title.id || '') },
    concept: { en: String(concept.en || ''), id: String(concept.id || '') },
    bullets_en: bulletsToText(Array.isArray(bullets.en) ? bullets.en : []),
    bullets_id: bulletsToText(Array.isArray(bullets.id) ? bullets.id : []),
    quizEnabled: Boolean(r.quiz_json),
    quiz,
  };
}

function defaultDraft(): ModuleDraft {
  return {
    key: 'module-1',
    order: 1,
    is_active: true,
    required_plans: [],
    prerequisites: [],
    youtube_url: '',
    title: { en: '', id: '' },
    concept: { en: '', id: '' },
    bullets_en: '',
    bullets_id: '',
    quizEnabled: false,
    quiz: [],
  };
}

function draftToPayload(d: ModuleDraft) {
  const content_json = {
    title: d.title,
    concept: d.concept,
    bullets: {
      en: textToBullets(d.bullets_en),
      id: textToBullets(d.bullets_id),
    },
  };

  const quiz_json = d.quizEnabled
    ? {
        questions: d.quiz.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctOptionId: q.correctOptionId,
        })),
      }
    : null;

  return {
    key: d.key,
    order: d.order,
    is_active: d.is_active,
    required_plans: d.required_plans,
    prerequisites: d.prerequisites,
    youtube_url: d.youtube_url.trim() ? d.youtube_url.trim() : null,
    content_json,
    quiz_json,
  };
}

export default function AdminLearningModulesPage() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<LearningModuleCMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => rows.find((r) => r.id === editingId) || null, [rows, editingId]);

  const [draft, setDraft] = useState<ModuleDraft>(defaultDraft());

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get<ApiResponse<LearningModuleCMS[]>>('/admin/learning-modules');
      if (res.data.success) setRows(res.data.data || []);
      else setError(res.data.error || 'Failed to load modules');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') fetchAll();
  }, [user]);

  useEffect(() => {
    if (!editing) return;
    setDraft(rowToDraft(editing));
  }, [editingId, editing]);

  const startCreate = () => {
    setEditingId(null);
    setDraft(defaultDraft());
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      if (editing) {
        const res = await apiClient.put<ApiResponse<LearningModuleCMS>>(
          `/admin/learning-modules/${editing.id}`,
          draftToPayload(draft)
        );
        if (!res.data.success) setError(res.data.error || 'Failed to save');
      } else {
        const res = await apiClient.post<ApiResponse<LearningModuleCMS>>(
          '/admin/learning-modules',
          draftToPayload(draft)
        );
        if (!res.data.success) setError(res.data.error || 'Failed to create');
      }
      setEditingId(null);
      await fetchAll();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const importDefaults = async () => {
    setError('');
    setSaving(true);
    try {
      // Import the current hardcoded module definitions into DB.
      // We keep keys stable so existing progress continues working.
      for (const m of learningModules) {
        const content_json = {
          title: m.title,
          concept: m.concept,
          bullets: m.bullets,
        };
        const quiz_json =
          m.quiz && m.quiz.length
            ? {
                questions: m.quiz.map((q) => ({
                  id: q.id,
                  question: q.question,
                  options: q.options,
                  correctOptionId: q.correctOptionId,
                })),
              }
            : null;

        // Default: active, accessible to all plans, prerequisites follow the current lock rule (previous module)
        const prerequisites = m.order > 1 ? [`module-${m.order - 1}`] : [];

        // Try create; if key exists, ignore.
        try {
          await apiClient.post('/admin/learning-modules', {
            key: m.key,
            order: m.order,
            is_active: true,
            required_plans: [],
            prerequisites,
            youtube_url: m.youtubeUrl || null,
            content_json,
            quiz_json,
          });
        } catch {
          // Ignore duplicates; admin can edit after import.
        }
      }
      await fetchAll();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to import defaults');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm('Delete this module?')) return;
    setError('');
    try {
      await apiClient.delete(`/admin/learning-modules/${id}`);
      await fetchAll();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete');
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h1 className="text-3xl font-bold text-gray-900">Modules CMS</h1>
          <p className="mt-1 text-gray-600 text-sm">
            Add/update modules, order, prerequisites, quiz, and subscription gating.
          </p>
        </div>
          <div className="flex flex-wrap items-center gap-2">
            {rows.length === 0 && (
              <Button onClick={importDefaults} disabled={saving}>
                {saving ? 'Importing…' : 'Import current defaults'}
              </Button>
            )}
            <Button variant="outline" onClick={startCreate} disabled={saving}>
              New module
            </Button>
            <Button variant="outline" onClick={fetchAll} disabled={loading || saving}>
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white overflow-x-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Modules</div>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-gray-600">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">
                No modules yet. Click <span className="font-semibold">Import current defaults</span>.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Key</th>
                    <th className="px-4 py-3 text-left">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-gray-700">{r.order}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.key}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(r.id)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => deleteRow(r.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">
                {editing ? 'Edit module' : 'Create module'}
              </div>
              {editing && (
                <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                  Close
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Key" value={draft.key} onChange={(e) => setDraft((p) => ({ ...p, key: e.target.value }))} />
              <Input
                label="Order"
                type="number"
                value={String(draft.order)}
                onChange={(e) => setDraft((p) => ({ ...p, order: parseInt(e.target.value || '1', 10) }))}
              />
              <div className="flex items-end gap-2">
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => setDraft((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded border border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Accessible plans</div>
                <div className="text-xs text-gray-600 mb-2">
                  If none selected, it’s accessible for all plans.
                </div>
                {(['free', 'pro', 'premium', 'therapist'] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={draft.required_plans.includes(p)}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          required_plans: e.target.checked
                            ? [...prev.required_plans, p]
                            : prev.required_plans.filter((x) => x !== p),
                        }))
                      }
                    />
                    {p}
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <Input
                  label="Prerequisites (module keys, comma-separated)"
                  value={listToCsv(draft.prerequisites)}
                  onChange={(e) => setDraft((p) => ({ ...p, prerequisites: csvToList(e.target.value) }))}
                />
                <Input
                  label="YouTube URL (optional)"
                  value={draft.youtube_url}
                  onChange={(e) => setDraft((p) => ({ ...p, youtube_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Title (EN)"
                value={draft.title.en}
                onChange={(e) => setDraft((p) => ({ ...p, title: { ...p.title, en: e.target.value } }))}
              />
              <Input
                label="Title (ID)"
                value={draft.title.id}
                onChange={(e) => setDraft((p) => ({ ...p, title: { ...p.title, id: e.target.value } }))}
              />
              <Input
                label="Concept (EN)"
                value={draft.concept.en}
                onChange={(e) => setDraft((p) => ({ ...p, concept: { ...p.concept, en: e.target.value } }))}
              />
              <Input
                label="Concept (ID)"
                value={draft.concept.id}
                onChange={(e) => setDraft((p) => ({ ...p, concept: { ...p.concept, id: e.target.value } }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="Key points (EN) — one per line"
                value={draft.bullets_en}
                onChange={(e) => setDraft((p) => ({ ...p, bullets_en: e.target.value }))}
                rows={8}
              />
              <Textarea
                label="Key points (ID) — one per line"
                value={draft.bullets_id}
                onChange={(e) => setDraft((p) => ({ ...p, bullets_id: e.target.value }))}
                rows={8}
              />
            </div>

            <div className="rounded border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Quiz</div>
                  <div className="text-xs text-gray-600">Optional. Supports A/B choices (current app behavior).</div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={draft.quizEnabled}
                    onChange={(e) => setDraft((p) => ({ ...p, quizEnabled: e.target.checked }))}
                  />
                  Enable quiz
                </label>
              </div>

              {draft.quizEnabled && (
                <div className="space-y-3">
                  {draft.quiz.map((q, qi) => (
                    <div key={q.id} className="rounded border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-gray-900">Question {qi + 1}</div>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDraft((p) => ({ ...p, quiz: p.quiz.filter((_, i) => i !== qi) }))}
                        >
                          Remove
                        </Button>
                      </div>
                      <Input
                        label="Question ID"
                        value={q.id}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            quiz: p.quiz.map((x, i) => (i === qi ? { ...x, id: e.target.value } : x)),
                          }))
                        }
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Question (EN)"
                          value={q.question.en}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              quiz: p.quiz.map((x, i) =>
                                i === qi ? { ...x, question: { ...x.question, en: e.target.value } } : x
                              ),
                            }))
                          }
                        />
                        <Input
                          label="Question (ID)"
                          value={q.question.id}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              quiz: p.quiz.map((x, i) =>
                                i === qi ? { ...x, question: { ...x.question, id: e.target.value } } : x
                              ),
                            }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Option A (EN)"
                          value={q.options[0]?.label.en || ''}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              quiz: p.quiz.map((x, i) =>
                                i !== qi
                                  ? x
                                  : {
                                      ...x,
                                      options: [
                                        { id: 'A', label: { ...x.options[0].label, en: e.target.value } },
                                        x.options[1],
                                      ],
                                    }
                              ),
                            }))
                          }
                        />
                        <Input
                          label="Option A (ID)"
                          value={q.options[0]?.label.id || ''}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              quiz: p.quiz.map((x, i) =>
                                i !== qi
                                  ? x
                                  : {
                                      ...x,
                                      options: [
                                        { id: 'A', label: { ...x.options[0].label, id: e.target.value } },
                                        x.options[1],
                                      ],
                                    }
                              ),
                            }))
                          }
                        />
                        <Input
                          label="Option B (EN)"
                          value={q.options[1]?.label.en || ''}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              quiz: p.quiz.map((x, i) =>
                                i !== qi
                                  ? x
                                  : {
                                      ...x,
                                      options: [
                                        x.options[0],
                                        { id: 'B', label: { ...x.options[1].label, en: e.target.value } },
                                      ],
                                    }
                              ),
                            }))
                          }
                        />
                        <Input
                          label="Option B (ID)"
                          value={q.options[1]?.label.id || ''}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              quiz: p.quiz.map((x, i) =>
                                i !== qi
                                  ? x
                                  : {
                                      ...x,
                                      options: [
                                        x.options[0],
                                        { id: 'B', label: { ...x.options[1].label, id: e.target.value } },
                                      ],
                                    }
                              ),
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-700">Correct answer</div>
                        <select
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                          value={q.correctOptionId}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              quiz: p.quiz.map((x, i) =>
                                i === qi ? { ...x, correctOptionId: (e.target.value as any) } : x
                              ),
                            }))
                          }
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          quiz: [
                            ...p.quiz,
                            {
                              id: `q${p.quiz.length + 1}`,
                              question: { en: '', id: '' },
                              options: [
                                { id: 'A', label: { en: '', id: '' } },
                                { id: 'B', label: { en: '', id: '' } },
                              ],
                              correctOptionId: 'A',
                            },
                          ],
                        }))
                      }
                    >
                      + Add question
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save module'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

