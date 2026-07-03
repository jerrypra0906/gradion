'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface SubscriptionPlan {
  weeks: number;
  aiAccess: boolean;
  monthlyTokenLimit: number;
  price: number;
}

interface SubscriptionPlans {
  free: SubscriptionPlan;
  pro: SubscriptionPlan;
  premium: SubscriptionPlan;
  therapist: SubscriptionPlan;
}

interface PlanConfig {
  id: number;
  plan_type: 'free' | 'pro' | 'premium' | 'therapist';
  name: string;
  description: string | null;
  weeks: number;
  ai_access: boolean;
  monthly_token_limit: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SubscriptionPlansPage() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<SubscriptionPlans | null>(null);
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlanConfig>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPlans();
      fetchPlanConfigs();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      const response = await apiClient.get<ApiResponse<SubscriptionPlans>>('/subscriptions/plans');
      if (response.data.success && response.data.data) {
        setPlans(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanConfigs = async () => {
    try {
      const response = await apiClient.get<ApiResponse<PlanConfig[]>>('/subscriptions/plans/configs');
      if (response.data.success && response.data.data) {
        setPlanConfigs(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch plan configs:', error);
    }
  };

  const handleEdit = (planType: string) => {
    const config = planConfigs.find((c) => c.plan_type === planType);
    if (config) {
      setEditingPlan(planType);
      setEditForm({
        name: config.name,
        description: config.description || '',
        weeks: config.weeks,
        ai_access: config.ai_access,
        monthly_token_limit: config.monthly_token_limit,
        price: config.price,
        is_active: config.is_active,
      });
    }
  };

  const handleSave = async (planType: string) => {
    try {
      setSaving(true);
      const response = await apiClient.put<ApiResponse<PlanConfig>>(
        `/subscriptions/plans/${planType}`,
        editForm
      );

      if (response.data.success) {
        await fetchPlanConfigs();
        await fetchPlans();
        setEditingPlan(null);
        setEditForm({});
        alert(response.data.message || 'Plan updated successfully!');
      }
    } catch (error: any) {
      console.error('Failed to update plan:', error);
      alert(error.response?.data?.error || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingPlan(null);
    setEditForm({});
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">Loading subscription plans...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!plans) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12 text-red-600">Failed to load subscription plans</div>
        </div>
      </DashboardLayout>
    );
  }

  const planEntries = Object.entries(plans) as Array<[keyof SubscriptionPlans, SubscriptionPlan]>;

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="mt-2 text-gray-600">
            Manage subscription plan configurations. Monthly token limits apply to all active and
            trial users on each plan and sync to their wallets when saved.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planEntries.map(([planType, plan]) => {
            const config = planConfigs.find((c) => c.plan_type === planType);
            const isEditing = editingPlan === planType;

            return (
              <div
                key={planType}
                className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                  planType === 'premium'
                    ? 'ring-2 ring-purple-500'
                    : planType === 'pro'
                    ? 'ring-2 ring-blue-500'
                    : planType === 'therapist'
                    ? 'ring-2 ring-indigo-500'
                    : ''
                }`}
              >
                <div
                  className={`px-6 py-4 ${
                    planType === 'premium'
                      ? 'bg-purple-600'
                      : planType === 'pro'
                      ? 'bg-blue-600'
                      : planType === 'therapist'
                      ? 'bg-indigo-600'
                      : 'bg-gray-600'
                  } text-white`}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-white/20 border border-white/30 rounded px-2 py-1 text-white placeholder-white/70"
                      placeholder="Plan name"
                    />
                  ) : (
                    <h3 className="text-2xl font-bold capitalize">
                      {config?.name || planType}
                    </h3>
                  )}
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.price || 0}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })
                      }
                      className="w-full mt-2 bg-white/20 border border-white/30 rounded px-2 py-1 text-white placeholder-white/70"
                      placeholder="Price"
                    />
                  ) : (
                    <>
                      <div className="text-3xl font-bold mt-2">{formatPrice(plan.price)}</div>
                      {plan.price > 0 && <div className="text-sm opacity-90 mt-1">per month</div>}
                    </>
                  )}
                </div>

                <div className="px-6 py-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weeks
                        </label>
                        <input
                          type="number"
                          value={editForm.weeks || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              weeks: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          min="1"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Number of weeks for subscription period
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editForm.ai_access || false}
                            onChange={(e) => setEditForm({ ...editForm, ai_access: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">AI Access</span>
                        </label>
                      </div>

                      {editForm.ai_access && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monthly Token Limit
                          </label>
                          <input
                            type="number"
                            value={editForm.monthly_token_limit || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                monthly_token_limit: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            min="0"
                          />
                        </div>
                      )}

                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editForm.is_active !== false}
                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">Active</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600">Subscription Period</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {plan.weeks} {plan.weeks === 1 ? 'Week' : 'Weeks'}
                        </div>
                        <div className="text-xs text-gray-500">access period</div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="text-sm text-gray-600 mb-2">AI Features</div>
                        {plan.aiAccess ? (
                          <div className="space-y-2">
                            <div className="flex items-center text-green-600">
                              <svg
                                className="w-5 h-5 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span className="font-semibold">AI Access Enabled</span>
                            </div>
                            <div className="text-sm text-gray-700 ml-7">
                              {plan.monthlyTokenLimit.toLocaleString()} tokens/month
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span>No AI Access</span>
                          </div>
                        )}
                      </div>

                      {config?.description && (
                        <div className="border-t pt-4">
                          <div className="text-xs text-gray-500">{config.description}</div>
                        </div>
                      )}

                      <div className="border-t pt-4">
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Plan Type: {planType}</div>
                          <div>Status: {config?.is_active ? 'Active' : 'Inactive'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t">
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <Button
                        variant="primary"
                        className="flex-1"
                        size="sm"
                        onClick={() => handleSave(planType)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        size="sm"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      size="sm"
                      onClick={() => handleEdit(planType)}
                    >
                      Edit Plan
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <Link href="/dashboard/admin/users">
            <Button variant="outline">← Back to User Management</Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
