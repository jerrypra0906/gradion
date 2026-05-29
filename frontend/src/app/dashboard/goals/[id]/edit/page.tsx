'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Goal } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function EditGoalPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_date: '',
    status: 'active' as 'active' | 'completed' | 'paused' | 'cancelled',
    progress_notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isClinicalOrAdmin(user?.role)) {
      router.push('/dashboard');
      return;
    }
    fetchGoal();
  }, [params.id, user, router]);

  const fetchGoal = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Goal>>(`/goals/${params.id}`);
      if (response.data.success && response.data.data) {
        const goalData = response.data.data;
        setGoal(goalData);
        setFormData({
          title: goalData.title,
          description: goalData.description || '',
          target_date: goalData.target_date
            ? new Date(goalData.target_date).toISOString().split('T')[0]
            : '',
          status: goalData.status,
          progress_notes: goalData.progress_notes || '',
        });
      } else {
        setError('Goal not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load goal');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Please enter a goal title');
      return;
    }

    if (!goal) return;

    setSaving(true);

    try {
      const response = await apiClient.put<ApiResponse<Goal>>(`/goals/${goal.id}`, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        target_date: formData.target_date || undefined,
        status: formData.status,
        progress_notes: formData.progress_notes.trim() || undefined,
      });

      if (response.data.success) {
        router.push(`/dashboard/goals/${goal.id}`);
      } else {
        setError(response.data.error || 'Failed to update goal');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update goal');
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

  if (error && !goal) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard/goals')}>Back to Goals</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!goal) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Goal</h1>
          <p className="text-gray-600 mt-1">
            Goal for {goal.child?.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Title *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide more details about this goal..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Date
            </label>
            <Input
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as 'active' | 'completed' | 'paused' | 'cancelled',
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Progress Notes
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
              value={formData.progress_notes}
              onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
              placeholder="Add progress notes, observations, or updates..."
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Update Goal'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/goals/${goal.id}`)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

