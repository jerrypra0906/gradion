'use client';

import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { AssessmentReportView } from '@/components/aba/AssessmentReportView';
import { WeeklyProgramView } from '@/components/aba/WeeklyProgramView';
import { apiClient, ApiResponse, AiReviewStatus } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type AssessmentItem = {
  child_id: number;
  child_name: string;
  parent_name: string | null;
  review_status: AiReviewStatus;
  reviewed_at: string | null;
  report_en: string | null;
  report_id: string | null;
  created_at: string;
};

type WeekItem = {
  week_id: number;
  child_id: number;
  child_name: string | null;
  week_start: string;
  lifecycle_status: string;
  review_status: AiReviewStatus;
  reviewed_at: string | null;
  plan_json: unknown;
  updated_at: string;
};

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const statusBadge = (status: AiReviewStatus) => {
  const map: Record<AiReviewStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>{status}</span>
  );
};

const planLanguage = (plan: unknown): 'en' | 'id' =>
  plan && typeof plan === 'object' && (plan as any).language === 'en' ? 'en' : 'id';

export default function AiContentReviewPage() {
  const { user } = useAuthStore();
  const canAccess = user?.role === 'admin';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [weeks, setWeeks] = useState<WeekItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Which item is expanded for review.
  const [openAssessment, setOpenAssessment] = useState<number | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  // Which item is in edit mode + its edit buffers.
  const [editAssessmentId, setEditAssessmentId] = useState<number | null>(null);
  const [assessmentDraft, setAssessmentDraft] = useState<{ en: string; id: string }>({ en: '', id: '' });
  const [editWeekId, setEditWeekId] = useState<number | null>(null);
  const [weekDraft, setWeekDraft] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await apiClient.get<ApiResponse<{ assessments: AssessmentItem[]; weeks: WeekItem[] }>>(
        `/admin/ai-content?status=${statusFilter}`
      );
      if (res.data.success && res.data.data) {
        setAssessments(res.data.data.assessments);
        setWeeks(res.data.data.weeks);
      } else {
        setError(res.data.error || 'Failed to load');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Failed to load AI content');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [canAccess, load]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  };

  // ---- Assessment actions ----
  const reviewAssessment = async (childId: number, decision: 'approved' | 'rejected') => {
    try {
      await apiClient.post(`/admin/ai-content/assessment/${childId}/review`, { decision });
      flash(`Assessment ${decision}.`);
      await load();
    } catch {
      setError('Failed to update assessment review status.');
    }
  };

  const saveAssessment = async (childId: number) => {
    try {
      await apiClient.put(`/admin/ai-content/assessment/${childId}`, {
        report_en: assessmentDraft.en,
        report_id: assessmentDraft.id,
      });
      flash('Assessment content saved.');
      setEditAssessmentId(null);
      await load();
    } catch {
      setError('Failed to save assessment content.');
    }
  };

  const deleteAssessment = async (childId: number) => {
    if (!confirm('Delete (clear) this assessment report? It will reset to pending.')) return;
    try {
      await apiClient.delete(`/admin/ai-content/assessment/${childId}`);
      flash('Assessment cleared.');
      await load();
    } catch {
      setError('Failed to delete assessment.');
    }
  };

  // ---- Week actions ----
  const reviewWeek = async (weekId: number, decision: 'approved' | 'rejected') => {
    try {
      await apiClient.post(`/admin/ai-content/week/${weekId}/review`, { decision });
      flash(`Weekly program ${decision}.`);
      await load();
    } catch {
      setError('Failed to update week review status.');
    }
  };

  const saveWeek = async (weekId: number) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(weekDraft);
    } catch {
      setError('Plan JSON is not valid JSON.');
      return;
    }
    try {
      await apiClient.put(`/admin/ai-content/week/${weekId}`, { plan_json: parsed });
      flash('Weekly plan saved.');
      setEditWeekId(null);
      await load();
    } catch {
      setError('Failed to save weekly plan.');
    }
  };

  const deleteWeek = async (weekId: number) => {
    if (!confirm('Delete this weekly program entirely?')) return;
    try {
      await apiClient.delete(`/admin/ai-content/week/${weekId}`);
      flash('Weekly program deleted.');
      await load();
    } catch {
      setError('Failed to delete week.');
    }
  };

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Access denied. Admin only.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Content Review</h1>
          <p className="mt-2 text-gray-600">
            Review AI-generated content exactly as parents will see it, then edit, approve, or
            reject before it becomes visible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        )}
        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{msg}</div>
        )}

        {/* Assessment reports */}
        <section className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Assessment Reports ({assessments.length})
          </h2>
          {assessments.length === 0 ? (
            <p className="text-sm text-gray-500">No assessment reports for this filter.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {assessments.map((a) => {
                const open = openAssessment === a.child_id;
                const editing = editAssessmentId === a.child_id;
                return (
                  <li key={a.child_id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">
                          {a.child_name}{' '}
                          <span className="text-xs text-gray-500">
                            (child #{a.child_id}{a.parent_name ? ` · ${a.parent_name}` : ''})
                          </span>
                        </div>
                        <div className="mt-1">{statusBadge(a.review_status)}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOpenAssessment(open ? null : a.child_id);
                            setEditAssessmentId(null);
                          }}
                        >
                          {open ? 'Close' : 'Review'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => reviewAssessment(a.child_id, 'approved')}
                          disabled={a.review_status === 'approved'}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => reviewAssessment(a.child_id, 'rejected')}
                          disabled={a.review_status === 'rejected'}
                        >
                          Reject
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => deleteAssessment(a.child_id)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-3 space-y-4">
                        {/* Parent-style rendered preview */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                          {a.report_id && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-1">
                                Bahasa Indonesia — as the parent sees it
                              </div>
                              <div className="rounded border border-blue-100 bg-white p-3">
                                <AssessmentReportView markdown={a.report_id} />
                              </div>
                            </div>
                          )}
                          {a.report_en && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 mb-1">
                                English — as the parent sees it
                              </div>
                              <div className="rounded border border-blue-100 bg-white p-3">
                                <AssessmentReportView markdown={a.report_en} />
                              </div>
                            </div>
                          )}
                          {!a.report_id && !a.report_en && (
                            <div className="text-sm text-gray-500">No report content.</div>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (editing) {
                              setEditAssessmentId(null);
                            } else {
                              setEditAssessmentId(a.child_id);
                              setAssessmentDraft({ en: a.report_en || '', id: a.report_id || '' });
                            }
                          }}
                        >
                          {editing ? 'Hide editor' : 'Edit / add content'}
                        </Button>

                        {editing && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Report (Bahasa Indonesia) — Markdown
                              </label>
                              <textarea
                                value={assessmentDraft.id}
                                onChange={(e) => setAssessmentDraft((prev) => ({ ...prev, id: e.target.value }))}
                                rows={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Report (English) — Markdown
                              </label>
                              <textarea
                                value={assessmentDraft.en}
                                onChange={(e) => setAssessmentDraft((prev) => ({ ...prev, en: e.target.value }))}
                                rows={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                              />
                            </div>
                            <Button type="button" size="sm" onClick={() => saveAssessment(a.child_id)}>
                              Save content
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Weekly programs */}
        <section className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Weekly ABA Programs ({weeks.length})
          </h2>
          {weeks.length === 0 ? (
            <p className="text-sm text-gray-500">No weekly programs for this filter.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {weeks.map((w) => {
                const open = openWeek === w.week_id;
                const editing = editWeekId === w.week_id;
                return (
                  <li key={w.week_id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">
                          {w.child_name || `child #${w.child_id}`}{' '}
                          <span className="text-xs text-gray-500">
                            (week {String(w.week_start).slice(0, 10)} · #{w.week_id})
                          </span>
                        </div>
                        <div className="mt-1">{statusBadge(w.review_status)}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOpenWeek(open ? null : w.week_id);
                            setEditWeekId(null);
                          }}
                        >
                          {open ? 'Close' : 'Review'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => reviewWeek(w.week_id, 'approved')}
                          disabled={w.review_status === 'approved'}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => reviewWeek(w.week_id, 'rejected')}
                          disabled={w.review_status === 'rejected'}
                        >
                          Reject
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => deleteWeek(w.week_id)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-3 space-y-4">
                        {/* Parent-style rendered preview */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <WeeklyProgramView plan={w.plan_json} language={planLanguage(w.plan_json)} />
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (editing) {
                              setEditWeekId(null);
                            } else {
                              setEditWeekId(w.week_id);
                              setWeekDraft(JSON.stringify(w.plan_json ?? {}, null, 2));
                            }
                          }}
                        >
                          {editing ? 'Hide JSON editor' : 'Edit / add (JSON)'}
                        </Button>

                        {editing && (
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-600">
                              Plan JSON (edit to add / change / remove programs)
                            </label>
                            <textarea
                              value={weekDraft}
                              onChange={(e) => setWeekDraft(e.target.value)}
                              rows={18}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                            />
                            <Button type="button" size="sm" onClick={() => saveWeek(w.week_id)}>
                              Save plan
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
