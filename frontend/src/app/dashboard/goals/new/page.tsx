'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Child, Goal } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function NewGoalPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [formData, setFormData] = useState({
    child_id: '',
    title: '',
    description: '',
    target_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isClinicalOrAdmin(user?.role)) {
      router.push('/dashboard');
      return;
    }
    fetchChildren();
  }, [user, router]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (response.data.success) {
        setChildren(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.child_id) {
      setError('Please select a child');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a goal title');
      return;
    }

    setSaving(true);

    try {
      const response = await apiClient.post<ApiResponse<Goal>>('/goals', {
        child_id: parseInt(formData.child_id),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        target_date: formData.target_date || undefined,
      });

      if (response.data.success) {
        router.push('/dashboard/goals');
      } else {
        setError(response.data.error || 'Failed to create goal');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create goal');
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

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Goal</h1>
          <p className="text-gray-600 mt-1">Set a therapy goal for a child</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Child *
            </label>
            <select
              value={formData.child_id}
              onChange={(e) => setFormData({ ...formData, child_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a child</option>
              {children.map((child) => (
                <option key={child.id} value={child.id.toString()}>
                  {child.name} {child.diagnosis ? `(${child.diagnosis})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Title *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Improve eye contact during conversations"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
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
              Target Date (Optional)
            </label>
            <Input
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Creating...' : 'Create Goal'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/goals')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

