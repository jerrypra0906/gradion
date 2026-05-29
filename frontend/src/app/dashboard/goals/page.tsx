'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Goal, Child } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function GoalsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChildren();
    fetchGoals();
  }, [selectedChild, statusFilter]);

  const fetchChildren = async () => {
    if (user?.role !== 'parent') return;
    try {
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (response.data.success) {
        setChildren(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch children:', err);
    }
  };

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedChild) params.append('child_id', selectedChild);
      if (statusFilter) params.append('status', statusFilter);

      const response = await apiClient.get<ApiResponse<Goal[]>>(
        `/goals${params.toString() ? `?${params.toString()}` : ''}`
      );

      if (response.data.success) {
        setGoals(response.data.data || []);
      } else {
        setError(response.data.error || 'Failed to load goals');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load goals');
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
    if (!dateString) return 'No target date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && goals.length === 0) {
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
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Goals & Programs</h1>
            <p className="mt-2 text-gray-600">
              {user?.role === 'parent'
                ? 'Track your child&apos;s therapy goals'
                : 'Manage therapy goals and programs'}
            </p>
          </div>
          {isClinicalOrAdmin(user?.role) && (
            <Link href="/dashboard/goals/new">
              <Button>Create Goal</Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          {user?.role === 'parent' && children.length > 0 && (
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Children</option>
              {children.map((child) => (
                <option key={child.id} value={child.id.toString()}>
                  {child.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {goals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-500 mb-4">No goals found</p>
            {isClinicalOrAdmin(user?.role) && (
              <Link href="/dashboard/goals/new">
                <Button>Create Your First Goal</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <Link
                key={goal.id}
                href={`/dashboard/goals/${goal.id}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          goal.status
                        )}`}
                      >
                        {goal.status}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-gray-600 mb-3">{goal.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>
                        Child: <span className="font-medium text-gray-700">{goal.child?.name}</span>
                      </span>
                      {user?.role === 'parent' && (
                        <span>
                          Therapist:{' '}
                          <span className="font-medium text-gray-700">
                            {goal.therapist?.name}
                          </span>
                        </span>
                      )}
                      <span>Target: {formatDate(goal.target_date)}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className="text-2xl">
                      {goal.status === 'completed' ? '✓' : goal.status === 'paused' ? '⏸' : '→'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

