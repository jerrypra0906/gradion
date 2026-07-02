'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Copy, Sparkles, User } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { getRoleBadgeClass } from '@/components/dashboard/dashboardBadges';
import { Input } from '@/components/ui/Input';

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

import { Button } from '@/components/ui/Button';
import { apiClient, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export function ProfilePageContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();
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
    const status = subscriptionData.subscription.status;
    if (status !== 'active' && status !== 'trial') return false;
    if (!subscriptionData.subscription.end_date) return true;
    return new Date(subscriptionData.subscription.end_date) > new Date();
  };

  const isOnTrial = () => subscriptionData?.subscription.status === 'trial';

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
        <div className="space-y-8">
          <div className="h-32 animate-pulse rounded-2xl bg-[#1A2B4C]/10" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-[#E5E8EB] bg-white" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (isClinicalOrAdmin(user.role)) {
    if (error || !userProfile) {
      return (
        <DashboardLayout>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-red-700">
            {error || 'Failed to load profile'}
          </div>
        </DashboardLayout>
      );
    }
  } else if (error || !subscriptionData) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-red-700">
          {error || 'Failed to load profile'}
        </div>
      </DashboardLayout>
    );
  }

  const active = subscriptionData ? isSubscriptionActive() : false;
  const daysRemaining = subscriptionData ? getDaysRemaining() : null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <DashboardPageHeader
          icon={User}
          title={t('profile')}
          subtitle="Kelola informasi akun, langganan, dan reward Anda"
          action={
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize',
                getRoleBadgeClass(user.role),
              )}
            >
              {user.role}
            </span>
          }
        />

        <DashboardSectionCard
          title="Account Information"
          action={
            !isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            ) : undefined
          }
        >
          {isEditing ? (
            <div className="space-y-4">
              <Input variant="brand" label="Name" type="text" value={user.name} disabled />
              <p className="-mt-2 text-xs text-[#1A2B4C]/50">Name cannot be changed</p>
              <Input
                variant="brand"
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <Input
                variant="brand"
                label="Phone Number"
                type="tel"
                value={editForm.phone_number}
                onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                placeholder="+62 812 3456 7890"
              />
              <div className="flex gap-2 pt-2">
                <Button variant="brand" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    if (userProfile) {
                      setEditForm({
                        email: userProfile.email,
                        phone_number: userProfile.phone_number || '',
                      });
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">Name</dt>
                <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">Email</dt>
                <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">
                  {userProfile?.email || user.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">Phone Number</dt>
                <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">
                  {userProfile?.phone_number || 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">Role</dt>
                <dd className="mt-1 text-sm font-semibold capitalize text-[#1A2B4C]">
                  {user.role}
                </dd>
              </div>
            </dl>
          )}
        </DashboardSectionCard>

        <DashboardSectionCard title="Referral & Rewards">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-[#1A2B4C]/55">Referral Code</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-[#00C1B2]">
                  {userProfile?.referral_code || 'Generating...'}
                </span>
                {userProfile?.referral_code && (
                  <button
                    type="button"
                    onClick={copyReferralCode}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#00C1B2] hover:text-[#00A896]"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy
                  </button>
                )}
              </dd>
              <p className="mt-2 text-xs text-[#1A2B4C]/50">
                Share this code with friends! You&apos;ll earn 1,000 points when they register.
              </p>
            </div>
            <div>
              <dt className="text-sm font-medium text-[#1A2B4C]/55">Points Balance</dt>
              <dd className="mt-1 flex items-baseline gap-2">
                <span className="font-montserrat text-3xl font-bold text-[#FFB900]">
                  {userProfile?.points?.toLocaleString('id-ID') || '0'}
                </span>
                <span className="text-sm text-[#1A2B4C]/55">points</span>
              </dd>
              <p className="mt-2 text-xs text-[#1A2B4C]/50">
                1 point = 1 Rupiah. Points can be used for subscription discounts.
              </p>
            </div>
          </dl>
        </DashboardSectionCard>

        {!isClinicalOrAdmin(user.role) && subscriptionData && (
          <DashboardSectionCard
            title="Subscription"
            action={
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-semibold',
                  active
                    ? isOnTrial()
                      ? 'bg-[#FFB900]/15 text-[#1A2B4C] border border-[#FFB900]/40'
                      : 'bg-[#00C1B2]/10 text-[#00A896] border border-[#00C1B2]/25'
                    : 'bg-red-50 text-red-700 border border-red-200',
                )}
              >
                {active ? (isOnTrial() ? 'Free Trial' : 'Active') : 'Expired'}
              </span>
            }
          >
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">Plan Type</dt>
                <dd className="mt-1 text-sm font-semibold capitalize text-[#1A2B4C]">
                  {isOnTrial()
                    ? `Free trial (${subscriptionData.planConfig.weeks} weeks)`
                    : subscriptionData.subscription.plan_type}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">Subscription Period</dt>
                <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">
                  {subscriptionData.planConfig.weeks}{' '}
                  {subscriptionData.planConfig.weeks === 1 ? 'Week' : 'Weeks'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">Start Date</dt>
                <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">
                  {formatDate(subscriptionData.subscription.start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">End Date</dt>
                <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">
                  {formatDate(subscriptionData.subscription.end_date)}
                </dd>
              </div>
              {daysRemaining !== null && (
                <div>
                  <dt className="text-sm font-medium text-[#1A2B4C]/55">Days Remaining</dt>
                  <dd
                    className={cn(
                      'mt-1 text-sm font-semibold',
                      daysRemaining <= 7
                        ? 'text-red-600'
                        : daysRemaining <= 30
                          ? 'text-[#FFB900]'
                          : 'text-[#00A896]',
                    )}
                  >
                    {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-[#1A2B4C]/55">Status</dt>
                <dd className="mt-1 text-sm font-semibold capitalize text-[#1A2B4C]">
                  {subscriptionData.subscription.status}
                </dd>
              </div>
            </dl>

            {isOnTrial() && active && (
              <div className="mt-6 rounded-xl border border-[#00C1B2]/25 bg-[#00C1B2]/5 p-4">
                <h4 className="text-sm font-semibold text-[#1A2B4C]">Free trial — AI included</h4>
                <p className="mt-2 text-sm text-[#1A2B4C]/70">
                  You can use AI to generate Initial Observation reports and Weekly Home Programs
                  (ABA) during your {subscriptionData.planConfig.weeks}-week trial.
                  {daysRemaining !== null && daysRemaining > 0
                    ? ` ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining.`
                    : ''}
                </p>
              </div>
            )}

            {!active && (
              <div className="mt-6 rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 p-4">
                <h4 className="text-sm font-semibold text-[#1A2B4C]">Subscription Expired</h4>
                <p className="mt-2 text-sm text-[#1A2B4C]/70">
                  Your subscription has expired. You can still view your data, but you cannot create
                  or edit logs, children, or goals. Please contact an administrator to renew your
                  subscription.
                </p>
              </div>
            )}
          </DashboardSectionCard>
        )}

        {!isClinicalOrAdmin(user.role) &&
          subscriptionData &&
          subscriptionData.aiWallet &&
          (subscriptionData.planConfig.aiAccess || isOnTrial()) && (
            <DashboardSectionCard
              title="AI Token Wallet"
              subtitle="Penggunaan token AI bulan ini"
            >
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-[#1A2B4C]/55">Monthly Limit</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">
                    {subscriptionData.aiWallet.monthly_token_limit.toLocaleString()} tokens
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-[#1A2B4C]/55">Current Usage</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">
                    {subscriptionData.aiWallet.current_token_usage.toLocaleString()} tokens
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-[#1A2B4C]/55">Tokens Remaining</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#00A896]">
                    {(
                      subscriptionData.aiWallet.monthly_token_limit -
                      subscriptionData.aiWallet.current_token_usage
                    ).toLocaleString()}{' '}
                    tokens
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-[#1A2B4C]/55">Renewal Date</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#1A2B4C]">
                    {formatDate(subscriptionData.aiWallet.renewal_date)}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#E5E8EB]">
                <div
                  className="h-full rounded-full bg-[#00C1B2] transition-all"
                  style={{
                    width: `${Math.min(
                      (subscriptionData.aiWallet.current_token_usage /
                        subscriptionData.aiWallet.monthly_token_limit) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </DashboardSectionCard>
          )}

        {!isClinicalOrAdmin(user.role) && subscriptionData && (
          <DashboardSectionCard
            title="Available Plans"
            subtitle="Choose a subscription plan that fits your needs. You can apply promotion codes during checkout."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {availablePlans &&
                (['free', 'pro', 'premium'] as const).map((planType) => {
                  const plan = availablePlans[planType];
                  if (!plan) return null;
                  const isCurrent = subscriptionData.subscription.plan_type === planType;
                  const isUpgrade =
                    planType === 'pro' || planType === 'premium';
                  const canUpgrade = !isCurrent && isUpgrade;

                  const headerBg =
                    planType === 'premium'
                      ? 'bg-[#1A2B4C]'
                      : planType === 'pro'
                        ? 'bg-[#00C1B2]'
                        : 'bg-[#1A2B4C]/80';

                  return (
                    <div
                      key={planType}
                      className={cn(
                        'overflow-hidden rounded-2xl border-2',
                        isCurrent
                          ? 'border-[#00C1B2] bg-[#00C1B2]/5 shadow-md shadow-[#00C1B2]/10'
                          : 'border-[#E5E8EB] bg-white',
                      )}
                    >
                      <div className={cn('px-4 py-4 text-white', headerBg)}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-montserrat text-lg font-bold capitalize">{planType}</h4>
                          {isCurrent && (
                            <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-semibold">
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
                            <div className="text-sm font-medium text-[#1A2B4C]/70">
                              Subscription Period
                            </div>
                            <div className="font-montserrat text-lg font-bold text-[#1A2B4C]">
                              {plan.weeks} {plan.weeks === 1 ? 'Week' : 'Weeks'}
                            </div>
                          </div>

                          <div className="border-t border-[#E5E8EB] pt-3">
                            <div className="mb-2 text-sm font-medium text-[#1A2B4C]/70">Features</div>
                            <ul className="space-y-2 text-sm text-[#1A2B4C]/70">
                              <li className="flex items-start gap-2">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00C1B2]" aria-hidden />
                                <span>Full access to create and edit logs</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00C1B2]" aria-hidden />
                                <span>Manage children and goals</span>
                              </li>
                              <li className="flex items-start gap-2">
                                {plan.aiAccess ? (
                                  <>
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00C1B2]" aria-hidden />
                                    <span>
                                      AI Features ({plan.monthlyTokenLimit.toLocaleString()} tokens/month)
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[#1A2B4C]/45">No AI Features</span>
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
                                variant={canUpgrade ? 'brand' : 'outline'}
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

            <div className="mt-6 flex gap-3 rounded-xl border border-[#00C1B2]/20 bg-[#00C1B2]/5 p-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#00C1B2]" aria-hidden />
              <div>
                <h4 className="text-sm font-semibold text-[#1A2B4C]">How to Subscribe</h4>
                <p className="mt-2 text-sm text-[#1A2B4C]/70">
                  Click &quot;Request Upgrade&quot; or &quot;Request Plan&quot; to submit your subscription
                  request. An administrator will review and activate your subscription. For immediate
                  activation, please contact support directly.
                </p>
              </div>
            </div>
          </DashboardSectionCard>
        )}
      </div>
    </DashboardLayout>
  );
}

