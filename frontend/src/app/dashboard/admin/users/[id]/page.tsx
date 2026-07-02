'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, getApiErrorMessage, User, Subscription, AITokenWallet } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface UserWithSubscription extends User {
  subscription?: Subscription | null;
  aiTokenWallet?: AITokenWallet | null;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const userId = parseInt(params.id as string);
  const [userData, setUserData] = useState<UserWithSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planType, setPlanType] = useState<string>('free');
  const [status, setStatus] = useState<string>('active');
  const [monthlyLogQuota, setMonthlyLogQuota] = useState<number>(30);
  const [endDate, setEndDate] = useState<string>('');
  const [planConfigs, setPlanConfigs] = useState<Record<string, { weeks: number }>>({});
  const [selectedRole, setSelectedRole] = useState<User['role']>('parent');
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin' && userId) {
      fetchPlanConfigs();
      fetchUser();
    }
  }, [user, userId]);

  const fetchPlanConfigs = async () => {
    try {
      const response = await apiClient.get<ApiResponse<Record<string, { weeks: number; aiAccess: boolean; monthlyTokenLimit: number; price: number }>>>('/subscriptions/plans');
      if (response.data.success && response.data.data) {
        const configs: Record<string, { weeks: number }> = {};
        const data = response.data.data;
        Object.keys(data).forEach((key) => {
          configs[key] = { weeks: data[key].weeks };
        });
        setPlanConfigs(configs);
      }
    } catch (error) {
      console.error('Failed to fetch plan configs:', error);
    }
  };

  // Calculate end date based on plan type and current date
  const calculateEndDate = (plan: string, startDate: Date = new Date()): string => {
    const config = planConfigs[plan];
    if (!config) {
      // Default to 4 weeks if config not loaded yet
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 4 * 7);
      return endDate.toISOString().split('T')[0];
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + config.weeks * 7);
    return endDate.toISOString().split('T')[0];
  };

  // Update end date when plan type changes (only if we have plan configs loaded)
  useEffect(() => {
    if (Object.keys(planConfigs).length > 0 && !userData?.subscription) {
      // Only auto-calculate for new subscriptions
      // For existing subscriptions, end date is set from fetchUser
      const calculatedEndDate = calculateEndDate(planType);
      setEndDate(calculatedEndDate);
    }
  }, [planType, planConfigs]);

  // Recalculate end date when plan type changes for existing subscriptions
  const handlePlanTypeChange = (newPlanType: string) => {
    setPlanType(newPlanType);
    if (Object.keys(planConfigs).length > 0) {
      // Always recalculate from current date when plan type changes
      const calculatedEndDate = calculateEndDate(newPlanType);
      setEndDate(calculatedEndDate);
    }
  };

  const fetchSubscription = async () => {
    try {
      const subResponse = await apiClient.get<ApiResponse<{
        subscription: Subscription | null;
        aiWallet: AITokenWallet | null;
        planConfig: unknown;
      }>>(`/subscriptions/user/${userId}`);

      if (subResponse.data.success && subResponse.data.data) {
        const sub = subResponse.data.data.subscription;
        const aiWallet = subResponse.data.data.aiWallet;

        setUserData((prev) =>
          prev
            ? {
                ...prev,
                subscription: sub,
                aiTokenWallet: aiWallet,
              }
            : prev
        );

        if (sub) {
          setPlanType(sub.plan_type);
          setStatus(sub.status);
          setMonthlyLogQuota(sub.monthly_log_quota || 30);
          if (Object.keys(planConfigs).length > 0) {
            setEndDate(calculateEndDate(sub.plan_type));
          } else if (sub.end_date) {
            setEndDate(sub.end_date.split('T')[0]);
          }
        }
      }
    } catch {
      // Subscription not found is okay - user might not have one
    }
  };

  const fetchUser = async () => {
    try {
      setLoading(true);

      const userResponse = await apiClient.get<ApiResponse<UserWithSubscription>>(
        `/admin/users/${userId}`
      );

      if (userResponse.data.success && userResponse.data.data) {
        const loadedUser = userResponse.data.data;

        setUserData((prev) => ({
          ...loadedUser,
          subscription: prev?.subscription ?? loadedUser.subscription ?? null,
          aiTokenWallet: prev?.aiTokenWallet ?? loadedUser.aiTokenWallet ?? null,
        }));
        setSelectedRole(loadedUser.role);

        const subscription = loadedUser.subscription;
        if (subscription) {
          setPlanType(subscription.plan_type);
          setStatus(subscription.status);
          setMonthlyLogQuota(subscription.monthly_log_quota || 30);
          if (Object.keys(planConfigs).length > 0) {
            setEndDate(calculateEndDate(subscription.plan_type));
          } else if (subscription.end_date) {
            setEndDate(subscription.end_date.split('T')[0]);
          }
        } else if (Object.keys(planConfigs).length > 0) {
          setEndDate(calculateEndDate(planType));
        }
      }

      await fetchSubscription();
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!userData || selectedRole === userData.role) return;

    try {
      setSavingRole(true);
      const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${userId}`, {
        role: selectedRole,
      });
      if (response.data.success && response.data.data) {
        const updatedRole = response.data.data.role;
        setUserData((prev) => (prev ? { ...prev, role: updatedRole } : prev));
        setSelectedRole(updatedRole);
        alert('User role updated successfully!');
      } else {
        alert(response.data.error || 'Failed to update role');
      }
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, 'Failed to update role'));
    } finally {
      setSavingRole(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Ensure end date is calculated
      let finalEndDate = endDate;
      if (!finalEndDate) {
        finalEndDate = calculateEndDate(planType);
        setEndDate(finalEndDate);
      }

      // Convert date string (YYYY-MM-DD) to datetime string (ISO 8601)
      // Add time component to make it a valid datetime
      const endDateDatetime = finalEndDate 
        ? new Date(finalEndDate + 'T23:59:59.999Z').toISOString()
        : null;

      if (!endDateDatetime) {
        alert('End date is required');
        setSaving(false);
        return;
      }

      if (userData?.subscription) {
        // Update existing subscription
        // Note: monthly_log_quota is not stored in DB, it's computed from plan config
        await apiClient.put(`/subscriptions/${userData.subscription.id}`, {
          plan_type: planType,
          status: status,
          end_date: endDateDatetime, // Always send end date (mandatory) as datetime string
        });
      } else {
        // Create new subscription
        await apiClient.post('/subscriptions', {
          user_id: userId,
          plan_type: planType,
          status: status,
          end_date: endDateDatetime, // Always send end date (mandatory) as datetime string
        });
      }
      await fetchSubscription();
      alert('Subscription updated successfully!');
    } catch (error: any) {
      console.error('Failed to update subscription:', error);
      alert(error.response?.data?.error || 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">Loading user details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userData) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12 text-red-600">User not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <Button variant="outline" onClick={() => router.push('/dashboard/admin/users')}>
            ← Back to Users
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Manage User: {userData.name}</h1>
          <p className="mt-2 text-gray-600">{userData.email}</p>
          <p className="mt-1 text-sm text-gray-500">
            Saved role:{' '}
            <span className="font-medium capitalize text-gray-800">{userData.role}</span>
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as User['role'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="parent">Parent</option>
                <option value="therapist">Therapist</option>
                <option value="consultant">Consultant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button
              onClick={handleSaveRole}
              disabled={savingRole || selectedRole === userData.role}
              variant="outline"
            >
              {savingRole ? 'Saving role...' : 'Save Role'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subscription Management */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Management</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                <select
                  value={planType}
                  onChange={(e) => handlePlanTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                  <option value="therapist">Therapist</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Log Quota
                </label>
                <Input
                  type="number"
                  value={monthlyLogQuota}
                  onChange={(e) => setMonthlyLogQuota(parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="bg-gray-50"
                  readOnly
                />
                <p className="mt-1 text-xs text-gray-500">
                  Automatically calculated based on plan type ({planConfigs[planType]?.weeks || 'N/A'} weeks from today)
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Subscription'}
              </Button>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h2>
            <div className="space-y-4">
              {userData.subscription && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Subscription</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-semibold capitalize">{userData.subscription.plan_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-semibold capitalize">{userData.subscription.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Logs Used:</span>
                      <span className="font-semibold">
                        {userData.subscription.used_logs_this_month} /{' '}
                        {userData.subscription.monthly_log_quota}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-semibold">
                        {new Date(userData.subscription.start_date).toLocaleDateString()}
                      </span>
                    </div>
                    {userData.subscription.end_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span className="font-semibold">
                          {new Date(userData.subscription.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {userData.aiTokenWallet && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">AI Token Wallet</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tokens Used:</span>
                      <span className="font-semibold">
                        {userData.aiTokenWallet.current_token_usage.toLocaleString()} /{' '}
                        {userData.aiTokenWallet.monthly_token_limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Renewal Date:</span>
                      <span className="font-semibold">
                        {new Date(userData.aiTokenWallet.renewal_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full ${
                          userData.aiTokenWallet.current_token_usage >=
                          userData.aiTokenWallet.monthly_token_limit
                            ? 'bg-red-600'
                            : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${
                            Math.min(
                              (userData.aiTokenWallet.current_token_usage /
                                userData.aiTokenWallet.monthly_token_limit) *
                                100,
                              100
                            ) || 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

