'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface Subscription {
  id: number;
  plan_type: 'free' | 'pro' | 'premium' | 'therapist';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface AITokenWallet {
  id: number;
  plan_type: 'free' | 'pro' | 'premium' | 'therapist';
  monthly_token_limit: number;
  current_token_usage: number;
  renewal_date: string;
}

interface PlanConfig {
  weeks: number;
  aiAccess: boolean;
  monthlyTokenLimit: number;
  price: number;
}

interface SubscriptionData {
  subscription: Subscription;
  aiWallet: AITokenWallet | null;
  planConfig: PlanConfig;
}

interface AvailablePlan {
  weeks: number;
  aiAccess: boolean;
  monthlyTokenLimit: number;
  price: number;
}

interface AvailablePlans {
  free: AvailablePlan;
  pro: AvailablePlan;
  premium: AvailablePlan;
  therapist?: AvailablePlan;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  referral_code: string | null;
  points: number;
  role: string;
  created_at: string;
  is_email_verified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [availablePlans, setAvailablePlans] = useState<AvailablePlans | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestingPlan, setRequestingPlan] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    phone_number: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      // Only fetch subscription data for parents (not clinical staff/admin)
      if (!isClinicalOrAdmin(user.role)) {
        fetchSubscription();
        fetchAvailablePlans();
        fetchProfile();
      } else {
        // For admin/therapists/consultants, just fetch profile and set loading to false when done
        fetchProfile().finally(() => {
          setLoading(false);
        });
      }
    }

    // Check for payment status in URL params (only for parents)
    if (user && !isClinicalOrAdmin(user.role)) {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      if (paymentStatus) {
        if (paymentStatus === 'success') {
          alert('Payment successful! Your subscription is being activated.');
          fetchSubscription();
        } else if (paymentStatus === 'error') {
          alert('Payment failed. Please try again or contact support.');
        } else if (paymentStatus === 'pending') {
          alert('Payment is pending. Your subscription will be activated once payment is confirmed.');
        }
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard/profile');
      }
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<SubscriptionData>>('/subscriptions/me');
      if (response.data.success && response.data.data) {
        setSubscriptionData(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      const response = await apiClient.get<ApiResponse<AvailablePlans>>('/subscriptions/plans');
      if (response.data.success && response.data.data) {
        setAvailablePlans(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch available plans:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get<ApiResponse<UserProfile>>('/profile/me');
      if (response.data.success && response.data.data) {
        setUserProfile(response.data.data);
        setEditForm({
          email: response.data.data.email,
          phone_number: response.data.data.phone_number || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError(err.response?.data?.error || 'Failed to fetch profile');
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put<ApiResponse<UserProfile>>('/profile/me', {
        email: editForm.email,
        phone_number: editForm.phone_number || null,
      });

      if (response.data.success && response.data.data) {
        setUserProfile(response.data.data);
        setIsEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const copyReferralCode = () => {
    if (userProfile?.referral_code) {
      navigator.clipboard.writeText(userProfile.referral_code);
      alert('Referral code copied to clipboard!');
    }
  };

  const handleRequestSubscription = async (planType: string) => {
    // Redirect to checkout page instead of directly processing
    router.push(`/dashboard/checkout?plan=${planType}`);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isSubscriptionActive = () => {
    if (!subscriptionData) return false;
    if (subscriptionData.subscription.status !== 'active') return false;
    if (!subscriptionData.subscription.end_date) return true;
    return new Date(subscriptionData.subscription.end_date) > new Date();
  };

  const getDaysRemaining = () => {
    if (!subscriptionData?.subscription?.end_date) return null;
    const endDate = new Date(subscriptionData.subscription.end_date);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!user) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">Loading profile...</div>
        </div>
      </DashboardLayout>
    );
  }

  // For clinical staff, subscription data is not required
  if (isClinicalOrAdmin(user.role)) {
    if (loading) {
      return (
        <DashboardLayout>
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">Loading profile...</div>
          </div>
        </DashboardLayout>
      );
    }

    if (error || !userProfile) {
      return (
        <DashboardLayout>
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12 text-red-600">
              {error || 'Failed to load profile'}
            </div>
          </div>
        </DashboardLayout>
      );
    }
  } else {
    // For non-therapists, subscription data is required
    if (error || !subscriptionData) {
      return (
        <DashboardLayout>
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12 text-red-600">
              {error || 'Failed to load profile'}
            </div>
          </div>
        </DashboardLayout>
      );
    }
  }

  const active = subscriptionData ? isSubscriptionActive() : false;
  const daysRemaining = subscriptionData ? getDaysRemaining() : null;

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">View your account information and subscription</p>
        </div>

        {/* User Information */}
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={user.name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <p className="mt-1 text-xs text-gray-500">Name cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    placeholder="+62 812 3456 7890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    if (userProfile) {
                      setEditForm({
                        email: userProfile.email,
                        phone_number: userProfile.phone_number || '',
                      });
                    }
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userProfile?.email || user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userProfile?.phone_number || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{user.role}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* Referral Code & Points */}
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Referral & Rewards</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Referral Code</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="text-lg font-mono font-bold text-blue-600">
                    {userProfile?.referral_code || 'Generating...'}
                  </span>
                  {userProfile?.referral_code && (
                    <button
                      onClick={copyReferralCode}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Copy
                    </button>
                  )}
                </dd>
                <p className="mt-2 text-xs text-gray-500">
                  Share this code with friends! You&apos;ll earn 1,000 points when they register.
                </p>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Points Balance</dt>
                <dd className="mt-1">
                  <span className="text-2xl font-bold text-green-600">
                    {userProfile?.points?.toLocaleString('id-ID') || '0'}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">points</span>
                </dd>
                <p className="mt-2 text-xs text-gray-500">
                  1 point = 1 Rupiah. Points can be used for subscription discounts.
                </p>
              </div>
            </dl>
          </div>
        </div>

        {/* Subscription Information - Hidden for clinical staff */}
        {!isClinicalOrAdmin(user.role) && subscriptionData && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Subscription</h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {active ? 'Active' : 'Expired'}
                </span>
              </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Plan Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {subscriptionData?.subscription.plan_type}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Subscription Period</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {subscriptionData?.planConfig.weeks} {subscriptionData?.planConfig.weeks === 1 ? 'Week' : 'Weeks'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(subscriptionData?.subscription.start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">End Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(subscriptionData?.subscription.end_date)}
                </dd>
              </div>
              {daysRemaining !== null && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Days Remaining</dt>
                  <dd className={`mt-1 text-sm font-semibold ${
                    daysRemaining <= 7 ? 'text-red-600' : daysRemaining <= 30 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {subscriptionData?.subscription.status}
                </dd>
              </div>
            </dl>

            {!active && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Subscription Expired
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Your subscription has expired. You can still view your data, but you cannot
                        create or edit logs, children, or goals. Please contact an administrator to
                        renew your subscription.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* AI Token Wallet - Hidden for clinical staff */}
        {!isClinicalOrAdmin(user.role) && subscriptionData && subscriptionData.aiWallet && subscriptionData.planConfig.aiAccess && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI Token Wallet</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Monthly Limit</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {subscriptionData.aiWallet.monthly_token_limit.toLocaleString()} tokens
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Current Usage</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {subscriptionData.aiWallet.current_token_usage.toLocaleString()} tokens
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tokens Remaining</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {(
                      subscriptionData.aiWallet.monthly_token_limit -
                      subscriptionData.aiWallet.current_token_usage
                    ).toLocaleString()}{' '}
                    tokens
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Renewal Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(subscriptionData.aiWallet.renewal_date)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(
                        (subscriptionData.aiWallet.current_token_usage /
                          subscriptionData.aiWallet.monthly_token_limit) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Plans - Hidden for clinical staff */}
        {!isClinicalOrAdmin(user.role) && subscriptionData && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose a subscription plan that fits your needs. You can apply promotion codes during checkout.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {availablePlans &&
                (['free', 'pro', 'premium'] as const).map((planType) => {
                  const plan = availablePlans[planType];
                  if (!plan) return null;
                  const isCurrent = subscriptionData.subscription.plan_type === planType;
                  const isUpgrade =
                    planType === 'pro' || planType === 'premium';
                  const canUpgrade = !isCurrent && isUpgrade;

                  return (
                    <div
                      key={planType}
                      className={`border-2 rounded-lg overflow-hidden ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50'
                          : planType === 'premium'
                          ? 'border-purple-500 bg-purple-50'
                          : planType === 'pro'
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div
                        className={`px-4 py-3 ${
                          planType === 'premium'
                            ? 'bg-purple-600'
                            : planType === 'pro'
                            ? 'bg-blue-600'
                            : 'bg-gray-600'
                        } text-white`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-bold capitalize">{planType}</h4>
                          {isCurrent && (
                            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                              Current Plan
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="text-2xl font-bold">
                            {formatPrice(plan.price)}
                          </div>
                          {plan.price > 0 && (
                            <div className="text-xs opacity-90">per subscription</div>
                          )}
                        </div>
                      </div>

                      <div className="px-4 py-4">
                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              Subscription Period
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {plan.weeks} {plan.weeks === 1 ? 'Week' : 'Weeks'}
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Features
                            </div>
                            <ul className="space-y-2 text-sm text-gray-600">
                              <li className="flex items-start">
                                <svg
                                  className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
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
                                <span>Full access to create and edit logs</span>
                              </li>
                              <li className="flex items-start">
                                <svg
                                  className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
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
                                <span>Manage children and goals</span>
                              </li>
                              <li className="flex items-start">
                                {plan.aiAccess ? (
                                  <>
                                    <svg
                                      className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
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
                                    <span>
                                      AI Features ({plan.monthlyTokenLimit.toLocaleString()} tokens/month)
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5"
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
                                    <span className="text-gray-400">No AI Features</span>
                                  </>
                                )}
                              </li>
                            </ul>
                          </div>

                          <div className="pt-3">
                            {isCurrent ? (
                              <Button variant="outline" className="w-full" disabled>
                                Current Plan
                              </Button>
                            ) : (
                              <Button
                                variant={canUpgrade ? 'primary' : 'outline'}
                                className="w-full"
                                onClick={() => handleRequestSubscription(planType)}
                                disabled={requestingPlan === planType}
                              >
                                {requestingPlan === planType
                                  ? 'Requesting...'
                                  : canUpgrade
                                  ? 'Request Upgrade'
                                  : 'Request Plan'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    How to Subscribe
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Click &quot;Request Upgrade&quot; or &quot;Request Plan&quot; to submit your subscription request.
                      An administrator will review and activate your subscription. For immediate
                      activation, please contact support directly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}

