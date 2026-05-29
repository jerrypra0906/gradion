'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Session, Child } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function NewSessionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [formData, setFormData] = useState({
    child_id: parseInt(searchParams?.get('childId') || '0', 10),
    date: new Date().toISOString().split('T')[0],
    duration_minutes: 60,
    goals_worked_on: [''],
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);

  useEffect(() => {
    if (user && isClinicalOrAdmin(user.role)) {
      fetchChildren();
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (response.data.success) {
        setChildren(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch children:', err);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...formData.goals_worked_on];
    newGoals[index] = value;
    setFormData({ ...formData, goals_worked_on: newGoals });
  };

  const addGoal = () => {
    setFormData({
      ...formData,
      goals_worked_on: [...formData.goals_worked_on, ''],
    });
  };

  const removeGoal = (index: number) => {
    const newGoals = formData.goals_worked_on.filter((_, i) => i !== index);
    setFormData({ ...formData, goals_worked_on: newGoals });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const goals = formData.goals_worked_on.filter((goal) => goal.trim() !== '');
    if (goals.length === 0) {
      setError('Please add at least one goal');
      return;
    }

    if (!formData.child_id) {
      setError('Please select a child');
      return;
    }

    setLoading(true);

    const requestData = {
        child_id: formData.child_id,
        date: formData.date,
        duration_minutes: formData.duration_minutes,
        goals_worked_on: goals,
        notes: formData.notes || undefined,
    };

    console.log('Submitting session creation request:', requestData);

    try {
      const response = await apiClient.post<ApiResponse<Session>>('/sessions', requestData);
      console.log('Session creation response:', response.data);

      if (response.data.success) {
        // If we came from a child page, redirect back there
        const childId = searchParams?.get('childId');
        if (childId) {
          router.push(`/dashboard/children/${childId}`);
        } else {
        router.push('/dashboard/sessions');
        }
      } else {
        const errorMsg = response.data.error || 'Failed to create session';
        console.error('Session creation failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Session creation error:', {
        error: err,
        message: err.message,
        response: err.response,
        responseData: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        request: err.request,
      });
      
      let errorMessage = 'Failed to create session';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isClinicalOrAdmin(user.role)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Record New Session</h1>
          <p className="text-gray-600 mt-1">Record therapy session details and progress</p>
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
              {loadingChildren ? (
                <p className="text-gray-500">Loading children...</p>
              ) : (
                <select
                  required
                  value={formData.child_id}
                  onChange={(e) =>
                    setFormData({ ...formData, child_id: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Select a child</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} ({child.used_sessions}/{child.monthly_quota} sessions)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Input
              label="Date *"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />

            <Input
              label="Duration (minutes) *"
              type="number"
              required
              min="1"
              value={formData.duration_minutes}
              onChange={(e) =>
                setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })
              }
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goals Worked On *
              </label>
              {formData.goals_worked_on.map((goal, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => handleGoalChange(index, e.target.value)}
                    placeholder="e.g., eye contact, communication"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.goals_worked_on.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeGoal(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addGoal}>
                + Add Goal
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Session notes and observations..."
              />
            </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : 'Save Session'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/sessions')}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">Loading...</div>
        </div>
      </DashboardLayout>
    }>
      <NewSessionPageContent />
    </Suspense>
  );
}

