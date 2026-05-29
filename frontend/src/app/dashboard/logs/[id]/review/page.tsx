'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, ParentLog } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';

export default function ReviewLogPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [log, setLog] = useState<ParentLog | null>(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'approved' | 'flagged'>('approved');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Allow parents, therapists, and admins to view logs
    if (!user || (!isClinicalOrAdmin(user.role) && user.role !== 'parent')) {
      router.push('/dashboard');
      return;
    }
    fetchLog();
  }, [params.id, user, router]);

  const fetchLog = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<ParentLog>>(`/parent-logs/${params.id}`);
      if (response.data.success && response.data.data) {
        setLog(response.data.data);
        setComment(response.data.data.therapist_comment || '');
        if (response.data.data.status === 'approved' || response.data.data.status === 'flagged') {
          setStatus(response.data.data.status);
        }
      } else {
        setError('Log not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load log');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!comment.trim()) {
      setError('Please provide a comment');
      return;
    }

    if (!log) return;

    setSaving(true);

    try {
      const response = await apiClient.post<ApiResponse<ParentLog>>(
        `/parent-logs/${log.id}/review`,
        {
          comment: comment.trim(),
          status,
        }
      );

      if (response.data.success) {
        router.push('/dashboard/logs');
      } else {
        setError(response.data.error || 'Failed to review log');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to review log');
    } finally {
      setSaving(false);
    }
  };

  const getRatingEmoji = (rating: number) => {
    const emojis = ['😞', '😐', '🙂', '😊', '😄'];
    return emojis[rating - 1] || '😐';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !log) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard/logs')}>Back to Logs</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!log) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isClinicalOrAdmin(user.role) ? 'Review Activity Log' : 'Activity Log Details'}
          </h1>
          <p className="text-gray-600 mt-1">
            {log.child?.name ? `Log for ${log.child.name}` : 'Activity Log'}
            {log.creator && (
              <span className="ml-2">
                • Created by {log.creator.name} ({log.creator_role})
              </span>
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">
                {new Date(log.log_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Duration:{' '}
                <span className="font-medium">
                  {(log.duration_hours ?? 3) % 1 === 0
                    ? (log.duration_hours ?? 3)
                    : Number((log.duration_hours ?? 3).toFixed(2))}{' '}
                  hours
                </span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Created by: <span className="font-medium">
                  {log.creator?.name || (log.creator_role === 'parent' ? 'Parent' : log.creator_role === 'therapist' ? 'Therapist' : 'Unknown')}
                </span>
                {log.creator_role && (
                  <span className="text-xs text-gray-500 ml-1">({log.creator_role})</span>
                )}
              </p>
              {log.status && (
                <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                  log.status === 'approved' ? 'bg-green-100 text-green-800' :
                  log.status === 'flagged' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {log.status}
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl mb-1">{getRatingEmoji(log.rating)}</div>
              <div className="text-sm text-gray-500">Rating: {log.rating}/5</div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Skills Practiced:</p>
            <div className="flex flex-wrap gap-2">
              {log.skills_practiced.map((skill, idx) => (
                <span
                  key={`${skill.name}-${idx}`}
                  className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-sm flex items-center gap-1"
                >
                  {skill.name}
                  <span className="text-xs text-blue-600">({skill.rating}/5)</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Activities:</p>
            <p className="text-gray-600">{log.activities}</p>
          </div>

          {log.behavior_notes && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Behavior Notes:</p>
              <p className="text-gray-600">{log.behavior_notes}</p>
            </div>
          )}

          {log.ai_summary && (
            <div className="mb-4 p-3 bg-purple-50 rounded">
              <p className="text-sm font-medium text-purple-900 mb-1">AI Summary:</p>
              <p className="text-purple-800">{log.ai_summary}</p>
            </div>
          )}
        </div>

        {/* Show review form only if user can review this log */}
        {(isClinicalOrAdmin(user.role) && log.creator_role === 'parent') ||
        ((user.role === 'parent' || user.role === 'admin') && log.creator_role === 'therapist') ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Status *
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStatus('approved')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    status === 'approved'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  <div className="font-medium">✓ Approve</div>
                  <div className="text-xs mt-1">Log looks good</div>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('flagged')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    status === 'flagged'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                  }`}
                >
                  <div className="font-medium">⚠ Flag</div>
                  <div className="text-xs mt-1">Needs attention</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Comment * (Provide feedback or notes)
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add your review comment, feedback, or recommendations..."
                required
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Submit Review'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {log.therapist_comment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">Review Comment:</p>
                <p className="text-blue-800">{log.therapist_comment}</p>
              </div>
            )}
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

