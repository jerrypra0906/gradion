'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import {
  apiClient,
  ApiResponse,
  AdminProgramVideoDetail,
  ProgramVideoReport,
  StepVerdict,
  TrialMatchVerdict,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { clock, parseTimestamp, scoreClass } from '@/lib/videoValidation';

const STEP_VERDICTS: { value: StepVerdict; label: string }[] = [
  { value: 'followed', label: 'Followed' },
  { value: 'partial', label: 'Partially' },
  { value: 'missed', label: 'Missed' },
  { value: 'not_observable', label: 'Not observable' },
];

const MATCH_VERDICTS: { value: TrialMatchVerdict; label: string }[] = [
  { value: 'matches', label: 'Matches the video' },
  { value: 'partially_matches', label: 'Partially matches' },
  { value: 'does_not_match', label: 'Does not match' },
  { value: 'not_applicable', label: 'Not applicable' },
];

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30';

function toList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampScore(v: string): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

export default function AdminVideoReviewPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const canAccess = user?.role === 'admin';
  const id = Number(params.id);

  const [detail, setDetail] = useState<AdminProgramVideoDetail | null>(null);
  const [report, setReport] = useState<ProgramVideoReport | null>(null);
  const [strengthsText, setStrengthsText] = useState('');
  const [improvementsText, setImprovementsText] = useState('');
  const [issuesText, setIssuesText] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await apiClient.get<ApiResponse<AdminProgramVideoDetail>>(
        `/program-videos/admin/videos/${id}`,
      );
      if (!res.data.success || !res.data.data) {
        setError(res.data.error || 'Failed to load video');
        return;
      }
      const d = res.data.data;
      setDetail(d);
      setReport(d.report);
      setStrengthsText(d.report.strengths.join('\n'));
      setImprovementsText(d.report.improvements.join('\n'));
      setIssuesText(d.report.video_quality.issues.join('\n'));
      setRejectReason(d.video.rejection_reason || '');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (canAccess && id) void load();
  }, [canAccess, id, load]);

  const processing = detail?.video.status === 'queued' || detail?.video.status === 'analyzing';

  // The AI works in the background; pick up its report when it lands.
  useEffect(() => {
    if (!processing) return;
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, [processing, load]);

  /** Jump the player to a moment the AI (or a trial tap) points at. */
  const seek = (seconds: number | null) => {
    const el = videoRef.current;
    if (!el || seconds === null) return;
    el.currentTime = Math.max(0, seconds);
    void el.play().catch(() => {});
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const TimeLink = ({ ts }: { ts: string | number | null | undefined }) => {
    const seconds = typeof ts === 'number' ? ts : parseTimestamp(ts ?? null);
    if (seconds === null) return null;
    return (
      <button
        type="button"
        onClick={() => seek(seconds)}
        disabled={!detail?.playback_url}
        className="inline-flex shrink-0 items-center gap-0.5 rounded bg-[#00C1B2]/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-[#00736C] hover:bg-[#00C1B2]/20 disabled:opacity-40"
        title="Jump to this moment"
      >
        <Play className="h-3 w-3" aria-hidden />
        {clock(seconds)}
      </button>
    );
  };

  const buildFinalReport = (): ProgramVideoReport | null =>
    report
      ? {
          ...report,
          strengths: toList(strengthsText),
          improvements: toList(improvementsText),
          video_quality: { ...report.video_quality, issues: toList(issuesText) },
        }
      : null;

  const submitReview = async (decision: 'approved' | 'rejected') => {
    const finalReport = buildFinalReport();
    if (!finalReport) return;
    if (decision === 'approved' && !finalReport.parent_feedback.trim()) {
      setError('Write the message to the parent before approving.');
      return;
    }
    if (decision === 'rejected' && !rejectReason.trim()) {
      setError('Give a reason — it is shown to the parent.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setMsg('');
      const res = await apiClient.post<ApiResponse<unknown>>(`/program-videos/admin/videos/${id}/review`, {
        decision,
        final_report: finalReport,
        feedback_text: finalReport.parent_feedback,
        rejection_reason: decision === 'rejected' ? rejectReason.trim() : null,
      });
      if (!res.data.success) {
        setError(res.data.error || 'Failed to save review');
        return;
      }
      setMsg(
        decision === 'approved'
          ? 'Approved — the feedback is now in the family’s Activity Logs and they have been emailed.'
          : 'Rejected — the parent will see your reason in Activity Logs.',
      );
      setRejectOpen(false);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const reanalyze = async () => {
    if (!window.confirm('Run the AI analysis again? Your unsaved edits on this page will be replaced.')) return;
    try {
      setSaving(true);
      setError('');
      const res = await apiClient.post<ApiResponse<unknown>>(`/program-videos/admin/videos/${id}/reanalyze`, {});
      if (!res.data.success) {
        setError(res.data.error || 'Failed to re-run analysis');
        return;
      }
      setMsg('AI analysis queued — this page refreshes when it finishes.');
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to re-run analysis');
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6">
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            Access denied. Admin only.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading || !detail || !report) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6">
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : (
            <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          )}
        </div>
      </DashboardLayout>
    );
  }

  const { video, guidance, trials, ai_report: aiReport } = detail;
  const reviewed = video.review_status !== 'pending';
  const disabled = saving || processing;

  const setScore = (key: 'prompting' | 'reinforcement', field: 'score' | 'notes', value: string) =>
    setReport((r) =>
      r ? { ...r, [key]: { ...r[key], [field]: field === 'score' ? clampScore(value) : value } } : r,
    );

  return (
    <DashboardLayout>
      <div className="space-y-5 px-4 py-6 sm:px-0">
        <Link
          href="/dashboard/admin/video-validation"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Video Validation
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {video.program_name} — {video.child.name}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {video.source === 'recording' ? 'Recorded in app' : 'Uploaded'} by {video.uploader.name} ·{' '}
              {new Date(video.created_at).toLocaleString()} · length {clock(video.duration_seconds)} · program
              period from {String(video.week_start).slice(0, 10)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {video.ai_score !== null && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scoreClass(video.ai_score)}`}>
                AI score {video.ai_score}
              </span>
            )}
            {reviewed && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  video.review_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {video.review_status === 'approved' ? 'Approved' : 'Rejected'}
                {video.reviewed_at ? ` · ${new Date(video.reviewed_at).toLocaleDateString()}` : ''}
              </span>
            )}
          </div>
        </div>

        {processing && (
          <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            The AI is analyzing this video. This page refreshes automatically when the report is ready.
          </div>
        )}
        {video.status === 'manual_review' && video.ai_error && (
          <div className="rounded border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
            <strong>No AI report — manual review.</strong> {video.ai_error}
          </div>
        )}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {msg && (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{msg}</div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: what happened — the video, the parent's taps, the guidance. */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="overflow-hidden rounded-lg bg-black shadow">
              {detail.playback_url ? (
                <video
                  ref={videoRef}
                  src={detail.playback_url}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center p-6 text-center text-sm text-gray-300">
                  {video.video_deleted_at
                    ? 'The video file was deleted after its retention period. The analysis and feedback are kept.'
                    : 'The video is not available yet.'}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="text-sm font-semibold text-gray-900">Trials the parent recorded</h2>
              {trials.length === 0 ? (
                <p className="mt-1 text-sm text-gray-500">No trials were recorded for this program.</p>
              ) : (
                <>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {trials.some((t) => t.offset_seconds !== null)
                      ? 'Tapped in the app while filming — click a time to see that moment.'
                      : 'Uploaded separately, so taps are not aligned to video time.'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {trials.map((t) => (
                      <span
                        key={t.index}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs"
                        title={t.phase_or_target}
                      >
                        <span className="text-gray-400">{t.index}.</span>
                        <span className="font-mono font-bold text-gray-900">{t.result}</span>
                        <TimeLink ts={t.offset_seconds} />
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {guidance && (
              <details className="rounded-lg bg-white p-4 shadow" open>
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                  Program guidance (what the parent was asked to do)
                </summary>
                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  {guidance.rationale && <p>{guidance.rationale}</p>}
                  {guidance.targets.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-900">Targets</div>
                      <div>{guidance.targets.join(' · ')}</div>
                    </div>
                  )}
                  {guidance.materials.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-900">Materials</div>
                      <div>{guidance.materials.join(' · ')}</div>
                    </div>
                  )}
                  {(guidance.steps.length > 0 || guidance.guided_activity_steps.length > 0) && (
                    <div>
                      <div className="text-xs font-semibold text-gray-900">Steps (Langkah)</div>
                      <ol className="list-decimal pl-5">
                        {(guidance.steps.length ? guidance.steps : guidance.guided_activity_steps).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {guidance.prompts.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-900">Prompts</div>
                      <ol className="list-decimal pl-5">
                        {guidance.prompts.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {guidance.mastery_criteria && (
                    <div>
                      <div className="text-xs font-semibold text-gray-900">Mastery criteria</div>
                      <div>{guidance.mastery_criteria}</div>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Right: the judgement — the AI's report, editable before it is shared. */}
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex flex-wrap items-end gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-700">Overall fidelity score (0–100)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={report.overall_score}
                    disabled={disabled}
                    onChange={(e) => setReport({ ...report, overall_score: clampScore(e.target.value) })}
                    className={`${inputCls} mt-1 w-28 text-lg font-bold`}
                  />
                </label>
                {aiReport && (
                  <div className="pb-2 text-xs text-gray-500">
                    AI said <strong>{aiReport.overall_score}</strong> ({aiReport.confidence} confidence)
                  </div>
                )}
                <label className="block">
                  <span className="text-xs font-semibold text-gray-700">Confidence</span>
                  <select
                    value={report.confidence}
                    disabled={disabled}
                    onChange={(e) =>
                      setReport({ ...report, confidence: e.target.value as ProgramVideoReport['confidence'] })
                    }
                    className={`${inputCls} mt-1`}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold text-gray-700">Clinical summary (admin only)</span>
                <textarea
                  rows={3}
                  value={report.summary}
                  disabled={disabled}
                  onChange={(e) => setReport({ ...report, summary: e.target.value })}
                  className={`${inputCls} mt-1`}
                />
              </label>

              <div className="mt-4 flex flex-wrap items-start gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={report.video_quality.usable}
                    disabled={disabled}
                    onChange={(e) =>
                      setReport({
                        ...report,
                        video_quality: { ...report.video_quality, usable: e.target.checked },
                      })
                    }
                  />
                  Video is usable for assessment
                </label>
                <label className="block min-w-[14rem] flex-1">
                  <span className="text-xs font-semibold text-gray-700">Video quality issues (one per line)</span>
                  <textarea
                    rows={2}
                    value={issuesText}
                    disabled={disabled}
                    onChange={(e) => setIssuesText(e.target.value)}
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="text-sm font-semibold text-gray-900">Guide steps</h2>
              {report.steps.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">No steps in the report.</p>
              )}
              <div className="mt-2 space-y-3">
                {report.steps.map((s, i) => {
                  const aiVerdict = aiReport?.steps.find((x) => x.step === s.step)?.verdict;
                  return (
                    <div key={i} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-900">
                          <span className="text-gray-400">{i + 1}.</span> {s.step}
                        </p>
                        <TimeLink ts={s.timestamp} />
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[10rem_7rem_1fr]">
                        <select
                          value={s.verdict}
                          disabled={disabled}
                          onChange={(e) => {
                            const steps = [...report.steps];
                            steps[i] = { ...s, verdict: e.target.value as StepVerdict };
                            setReport({ ...report, steps });
                          }}
                          className={inputCls}
                          aria-label="Verdict"
                        >
                          {STEP_VERDICTS.map((v) => (
                            <option key={v.value} value={v.value}>
                              {v.label}
                              {aiVerdict === v.value ? ' (AI)' : ''}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="MM:SS"
                          value={s.timestamp ?? ''}
                          disabled={disabled}
                          onChange={(e) => {
                            const steps = [...report.steps];
                            steps[i] = { ...s, timestamp: e.target.value || null };
                            setReport({ ...report, steps });
                          }}
                          className={inputCls}
                          aria-label="Timestamp"
                        />
                        <input
                          type="text"
                          placeholder="Note"
                          value={s.note}
                          disabled={disabled}
                          onChange={(e) => {
                            const steps = [...report.steps];
                            steps[i] = { ...s, note: e.target.value };
                            setReport({ ...report, steps });
                          }}
                          className={inputCls}
                          aria-label="Note"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(['prompting', 'reinforcement'] as const).map((key) => (
              <div key={key} className="rounded-lg bg-white p-4 shadow">
                <div className="flex items-end justify-between gap-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {key === 'prompting' ? 'Prompting' : 'Reinforcement'}
                  </h2>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    Score
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={report[key].score}
                      disabled={disabled}
                      onChange={(e) => setScore(key, 'score', e.target.value)}
                      className={`${inputCls} w-20`}
                    />
                    {aiReport && <span className="font-normal text-gray-500">AI {aiReport[key].score}</span>}
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={report[key].notes}
                  disabled={disabled}
                  onChange={(e) => setScore(key, 'notes', e.target.value)}
                  className={`${inputCls} mt-2`}
                  aria-label={`${key} notes`}
                />
                {report[key].events.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {report[key].events.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <TimeLink ts={ev.timestamp} />
                        <span>{ev.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <div className="rounded-lg bg-white p-4 shadow">
              <h2 className="text-sm font-semibold text-gray-900">Did the recorded trials match the video?</h2>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[14rem_1fr]">
                <select
                  value={report.trial_recording_match.verdict}
                  disabled={disabled}
                  onChange={(e) =>
                    setReport({
                      ...report,
                      trial_recording_match: {
                        ...report.trial_recording_match,
                        verdict: e.target.value as TrialMatchVerdict,
                      },
                    })
                  }
                  className={inputCls}
                >
                  {MATCH_VERDICTS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={report.trial_recording_match.notes}
                  disabled={disabled}
                  onChange={(e) =>
                    setReport({
                      ...report,
                      trial_recording_match: { ...report.trial_recording_match, notes: e.target.value },
                    })
                  }
                  className={inputCls}
                  placeholder="Notes"
                />
              </div>
            </div>

            <div className="rounded-lg border-2 border-[#00C1B2]/40 bg-[#00C1B2]/5 p-4 shadow">
              <h2 className="text-sm font-semibold text-gray-900">Shown to the parent</h2>
              <p className="text-xs text-gray-600">
                Appears in the family&apos;s Activity Logs under this program once approved.
              </p>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-gray-700">Message to the parent</span>
                <textarea
                  rows={5}
                  value={report.parent_feedback}
                  disabled={disabled}
                  onChange={(e) => setReport({ ...report, parent_feedback: e.target.value })}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-gray-700">What went well (one per line)</span>
                <textarea
                  rows={3}
                  value={strengthsText}
                  disabled={disabled}
                  onChange={(e) => setStrengthsText(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-gray-700">Try next time (one per line)</span>
                <textarea
                  rows={3}
                  value={improvementsText}
                  disabled={disabled}
                  onChange={(e) => setImprovementsText(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </label>
            </div>

            {rejectOpen && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <label className="block">
                  <span className="text-xs font-semibold text-red-900">
                    Reason for rejecting (shown to the parent)
                  </span>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Your child is out of frame for most of the video — please keep both of you in view next time."
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <div className="mt-2 flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => void submitReview('rejected')} disabled={disabled}>
                    Confirm reject
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="brand" onClick={() => void submitReview('approved')} disabled={disabled}>
                {reviewed && video.review_status === 'approved' ? 'Save & keep approved' : 'Approve & share with parent'}
              </Button>
              {!rejectOpen && (
                <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={disabled}>
                  Reject…
                </Button>
              )}
              {!video.video_deleted_at && (
                <Button variant="outline" onClick={() => void reanalyze()} disabled={disabled}>
                  Re-run AI
                </Button>
              )}
            </div>

            {detail.history.length > 0 && (
              <div className="rounded-lg bg-white p-4 shadow">
                <h2 className="text-sm font-semibold text-gray-900">Review history</h2>
                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  {detail.history.map((h) => (
                    <li key={h.id}>
                      {new Date(h.created_at).toLocaleString()} — {h.editor || 'Admin'} {h.decision}
                      {h.score_delta !== null && h.score_delta !== 0
                        ? ` (score ${h.score_delta > 0 ? '+' : ''}${h.score_delta} vs AI)`
                        : h.score_delta === 0
                          ? ' (agreed with AI score)'
                          : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
