'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Session } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

export default function ReviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [session, setSession] = useState<Session | null>(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'approved' | 'flagged'>('approved');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only parents can review sessions (admins can view but shouldn't review)
    if (user?.role !== 'parent') {
      console.log('Access denied to session review page - user role:', user?.role);
      router.push('/dashboard/logs');
      return;
    }
    fetchSession();
  }, [params.id, user, router]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Session>>(`/sessions/${params.id}`);
      if (response.data.success && response.data.data) {
        setSession(response.data.data);
        setComment(response.data.data.parent_comment || '');
        if (response.data.data.status === 'approved' || response.data.data.status === 'flagged') {
          setStatus(response.data.data.status);
        }
      } else {
        setError('Session not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load session');
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

    if (!session) return;

    setSaving(true);

    try {
      const response = await apiClient.post<ApiResponse<Session>>(
        `/sessions/${session.id}/review`,
        {
          comment: comment.trim(),
          status,
        }
      );

      if (response.data.success) {
        router.push('/dashboard/logs');
      } else {
        setError(response.data.error || 'Failed to review session');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to review session');
    } finally {
      setSaving(false);
    }
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

  if (error && !session) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard/logs')}>Back to Activity Logs</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Review Therapy Session</h1>
          <p className="text-gray-600 mt-1">
            Session by {session.therapist?.name || 'Therapist'} for {session.child?.name || 'Child'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">
                {new Date(session.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Created by: <span className="font-medium">{session.therapist?.name || 'Therapist'}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Duration: {session.duration_minutes} minutes</div>
            </div>
          </div>

          {session.goals_worked_on && session.goals_worked_on.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Goals Worked On:</p>
              <div className="flex flex-wrap gap-2">
                {session.goals_worked_on.map((goal, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-sm"
                  >
                    {goal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {session.notes && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Session Notes:</p>
              <p className="text-gray-600">{session.notes}</p>
            </div>
          )}

          {session.status && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Status:</p>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  session.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : session.status === 'flagged'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {session.status}
              </span>
            </div>
          )}

          {session.parent_comment && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium text-gray-900 mb-1">Previous Review Comment:</p>
              <p className="text-gray-700">{session.parent_comment}</p>
            </div>
          )}
        </div>

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
                <div className="text-xs mt-1">Session looks good</div>
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
              onClick={() => router.push('/dashboard/logs')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

