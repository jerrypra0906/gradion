'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Goal } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGoal();
  }, [params.id]);

  const fetchGoal = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Goal>>(`/goals/${params.id}`);
      if (response.data.success && response.data.data) {
        setGoal(response.data.data);
      } else {
        setError('Goal not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load goal');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No target date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  if (error || !goal) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Goal not found'}</p>
          <Button onClick={() => router.push('/dashboard/goals')}>Back to Goals</Button>
        </div>
      </DashboardLayout>
    );
  }

  const canEdit = isClinicalOrAdmin(user?.role);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link href="/dashboard/goals" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
              ← Back to Goals
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{goal.title}</h1>
          </div>
          {canEdit && (
            <Link href={`/dashboard/goals/${goal.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(goal.status)}`}>
              {goal.status}
            </span>
            <span className="text-sm text-gray-500">
              Created {new Date(goal.created_at).toLocaleDateString()}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Child</h3>
            <p className="text-gray-900">{goal.child?.name}</p>
          </div>

          {user?.role === 'parent' && goal.therapist && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Therapist</h3>
              <p className="text-gray-900">{goal.therapist.name}</p>
              <p className="text-sm text-gray-500">{goal.therapist.email}</p>
            </div>
          )}

          {goal.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{goal.description}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Target Date</h3>
            <p className="text-gray-900">{formatDate(goal.target_date)}</p>
          </div>

          {goal.progress_notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Progress Notes</h3>
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{goal.progress_notes}</p>
              </div>
            </div>
          )}

          {!goal.progress_notes && canEdit && (
            <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
              <p className="text-sm text-gray-500">No progress notes yet</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

