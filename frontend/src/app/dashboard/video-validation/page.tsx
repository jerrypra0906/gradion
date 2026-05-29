'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Child, Goal, VideoFidelityJob } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

export default function VideoValidationPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [jobs, setJobs] = useState<VideoFidelityJob[]>([]);
  const [childId, setChildId] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [abcNotes, setAbcNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = async () => {
    try {
      const res = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (res.data.success && res.data.data) {
        setChildrenList(res.data.data);
        if (res.data.data.length === 1) {
          setChildId(String(res.data.data[0].id));
        }
      }
    } catch {
      setError('Failed to load children');
    }
  };

  const loadGoals = async (cid: number) => {
    try {
      const res = await apiClient.get<ApiResponse<Goal[]>>(`/goals?child_id=${cid}`);
      if (res.data.success && res.data.data) {
        setGoals(res.data.data.filter((g) => g.status === 'active'));
      }
    } catch {
      setGoals([]);
    }
  };

  const loadJobs = async () => {
    try {
      const res = await apiClient.get<ApiResponse<VideoFidelityJob[]>>('/video-fidelity');
      if (res.data.success && res.data.data) {
        setJobs(res.data.data);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadChildren(), loadJobs()]);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!childId) {
      setGoals([]);
      setGoalId('');
      return;
    }
    loadGoals(parseInt(childId, 10));
  }, [childId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!childId || !file) {
      setError('Select a child and video file.');
      return;
    }
    const fd = new FormData();
    fd.append('child_id', childId);
    fd.append('video', file);
    if (goalId) fd.append('goal_id', goalId);
    if (abcNotes.trim()) fd.append('abc_context', abcNotes.trim());

    setSubmitting(true);
    try {
      const res = await apiClient.post<ApiResponse<VideoFidelityJob>>('/video-fidelity', fd);
      if (res.data.success && res.data.data) {
        setFile(null);
        await loadJobs();
      } else {
        setError(res.data.error || 'Upload failed');
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('videoValidationTitle')}</h1>
        <p className="mt-2 text-gray-600 text-sm">{t('videoValidationSubtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-8 bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('selectChildForVideo')}
            </label>
            <select
              required
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
              disabled={loading}
            >
              <option value="">{loading ? t('loading') : '—'}</option>
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('optionalGoalForVideo')}
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
            >
              <option value="">—</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('abcProtocolNotes')}
            </label>
            <p className="text-xs text-gray-500 mb-1">{t('abcProtocolHint')}</p>
            <textarea
              value={abcNotes}
              onChange={(e) => setAbcNotes(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('uploadVideoFile')}
            </label>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting || !childId} className="w-full sm:w-auto">
            {submitting ? t('analyzingVideo') : t('runFidelityAnalysis')}
          </Button>
        </form>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">{t('recentVideoAnalyses')}</h2>
          {jobs.length === 0 ? (
            <p className="mt-2 text-gray-500 text-sm">{t('noVideoAnalysesYet')}</p>
          ) : (
            <ul className="mt-4 space-y-6">
              {jobs.map((job) => (
                <li key={job.id} className="bg-white shadow rounded-lg p-4 border border-gray-100">
                  <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-600">
                    <span>
                      {job.child?.name || `Child #${job.child_id}`}
                      {job.goal?.title ? ` · ${job.goal.title}` : ''}
                    </span>
                    <span>{new Date(job.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        job.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : job.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {job.status}
                    </span>
                    {job.tokens_used != null && (
                      <span className="ml-2 text-xs text-gray-500">tokens: {job.tokens_used}</span>
                    )}
                  </div>
                  {job.status === 'failed' && job.error_message && (
                    <p className="mt-2 text-sm text-red-600">
                      {t('videoAnalysisFailed')}: {job.error_message}
                    </p>
                  )}
                  {job.status === 'completed' && job.result_json && (
                    <div className="mt-4 space-y-4 text-sm text-gray-800">
                      <div>
                        <span className="font-medium">{t('overallFidelityScore')}: </span>
                        {job.result_json.overall_fidelity_score}
                      </div>
                      <p className="text-gray-700">{job.result_json.summary}</p>
                      <div>
                        <h3 className="font-medium text-gray-900">{t('promptFidelitySection')}</h3>
                        <p className="text-gray-600">
                          {t('overallFidelityScore')}: {job.result_json.prompt_fidelity.score} —{' '}
                          {job.result_json.prompt_fidelity.notes}
                        </p>
                        <ul className="list-disc ml-5 mt-1 space-y-1">
                          {job.result_json.prompt_fidelity.observations.map((o, i) => (
                            <li key={i}>
                              <span className="text-gray-500">[{o.timestamp}]</span> {o.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{t('reinforcerTimingSection')}</h3>
                        <p className="text-gray-600">
                          {t('overallFidelityScore')}: {job.result_json.reinforcer_timing.score} —{' '}
                          {job.result_json.reinforcer_timing.notes}
                        </p>
                        <ul className="list-disc ml-5 mt-1 space-y-1">
                          {job.result_json.reinforcer_timing.events.map((ev, i) => (
                            <li key={i}>
                              <span className="text-gray-500">[{ev.timestamp}]</span> {ev.assessment}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{t('improvementsSection')}</h3>
                        <ul className="list-disc ml-5">
                          {job.result_json.improvements.map((im, i) => (
                            <li key={i}>{im}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
