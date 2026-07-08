'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, AdminAnalytics, AnalyticsDetail, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type DetailRequest = { metric: string; params?: Record<string, string> };

/** A clickable analytics number that opens the drill-down modal. */
function Metric({
  value,
  onClick,
  className,
}: {
  value: number | string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer underline decoration-dotted underline-offset-4 hover:text-blue-700 hover:decoration-solid text-left ${className || 'font-semibold'}`}
      title="Click for details"
    >
      {value}
    </button>
  );
}

export default function AdminAnalyticsPage() {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<AnalyticsDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<AdminAnalytics>>('/admin/analytics');
      if (response.data.success && response.data.data) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (req: DetailRequest) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError('');
      setDetail(null);
      const params = new URLSearchParams({ metric: req.metric, ...(req.params || {}) });
      const res = await apiClient.get<ApiResponse<AnalyticsDetail>>(
        `/admin/analytics/detail?${params.toString()}`
      );
      if (res.data.success && res.data.data) {
        setDetail(res.data.data);
      } else {
        setDetailError(res.data.error || 'Failed to load details');
      }
    } catch (e: any) {
      setDetailError(e.response?.data?.error || 'Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12 text-red-600">Failed to load analytics</div>
        </div>
      </DashboardLayout>
    );
  }

  const abaAdoption = analytics.aba_adoption;

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Analytics</h1>
          <p className="mt-2 text-gray-600">
            Platform overview and insights — click any number for the detail behind it.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <Metric
                value={analytics.overview.total_users}
                onClick={() => openDetail({ metric: 'total_users' })}
                className="text-2xl font-bold text-gray-900"
              />
              <div className="text-sm font-medium text-gray-500">Total Users</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <Metric
                value={analytics.overview.total_children}
                onClick={() => openDetail({ metric: 'total_children' })}
                className="text-2xl font-bold text-gray-900"
              />
              <div className="text-sm font-medium text-gray-500">Total Children</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <Metric
                value={analytics.overview.daily_active_users}
                onClick={() => openDetail({ metric: 'daily_active_users' })}
                className="text-2xl font-bold text-gray-900"
              />
              <div className="text-sm font-medium text-gray-500">Daily Active Users</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <Metric
                value={analytics.overview.monthly_active_users}
                onClick={() => openDetail({ metric: 'monthly_active_users' })}
                className="text-2xl font-bold text-gray-900"
              />
              <div className="text-sm font-medium text-gray-500">Monthly Active Users</div>
            </div>
          </div>
        </div>

        {/* Weekly home program (ABA) adoption */}
        {abaAdoption && (
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Weekly Home Program (ABA)
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Active children who have completed at least one weekly-program session.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-4">
                  <Metric
                    value={abaAdoption.children_ran}
                    onClick={() => openDetail({ metric: 'aba_ran' })}
                    className="text-2xl font-bold text-green-700"
                  />
                  <div className="text-sm font-medium text-gray-500">Have run the program</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <Metric
                    value={abaAdoption.children_not_ran}
                    onClick={() => openDetail({ metric: 'aba_not_ran' })}
                    className="text-2xl font-bold text-amber-600"
                  />
                  <div className="text-sm font-medium text-gray-500">Not yet</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <Metric
                    value={abaAdoption.active_children}
                    onClick={() => openDetail({ metric: 'total_children' })}
                    className="text-2xl font-bold text-gray-900"
                  />
                  <div className="text-sm font-medium text-gray-500">Active children</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Stats */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Logs (Last 7 days)</span>
                  <Metric
                    value={analytics.activity.recent_logs}
                    onClick={() => openDetail({ metric: 'recent_logs' })}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessions (Last 7 days)</span>
                  <Metric
                    value={analytics.activity.recent_sessions}
                    onClick={() => openDetail({ metric: 'recent_sessions' })}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Logs</span>
                  <Metric
                    value={analytics.overview.total_logs}
                    onClick={() => openDetail({ metric: 'total_logs' })}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sessions</span>
                  <Metric
                    value={analytics.overview.total_sessions}
                    onClick={() => openDetail({ metric: 'total_sessions' })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Growth</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Users This Month</span>
                  <Metric
                    value={analytics.growth.users.this_month}
                    onClick={() => openDetail({ metric: 'users_this_month' })}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Users Last Month</span>
                  <Metric
                    value={analytics.growth.users.last_month}
                    onClick={() => openDetail({ metric: 'users_last_month' })}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">User Growth</span>
                  <Metric
                    value={`${analytics.growth.users.growth_percentage >= 0 ? '+' : ''}${analytics.growth.users.growth_percentage.toFixed(1)}%`}
                    onClick={() => openDetail({ metric: 'users_this_month' })}
                    className={`font-semibold ${analytics.growth.users.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Log Growth</span>
                  <Metric
                    value={`${analytics.growth.logs.growth_percentage >= 0 ? '+' : ''}${analytics.growth.logs.growth_percentage.toFixed(1)}%`}
                    onClick={() => openDetail({ metric: 'logs_this_month' })}
                    className={`font-semibold ${analytics.growth.logs.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
          <div className="p-5">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subscriptions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Subscription Funnel</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Trial Users</span>
                    <Metric
                      value={analytics.subscriptions.funnel.trial}
                      onClick={() => openDetail({ metric: 'trial_subscriptions' })}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span>Active Paid</span>
                    <Metric
                      value={analytics.subscriptions.funnel.active_paid}
                      onClick={() => openDetail({ metric: 'active_paid_subscriptions' })}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span>Conversion Rate</span>
                    <Metric
                      value={`${analytics.subscriptions.funnel.conversion_rate.toFixed(1)}%`}
                      onClick={() => openDetail({ metric: 'active_paid_subscriptions' })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Plan Breakdown</div>
                <div className="space-y-2">
                  {analytics.subscriptions.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="capitalize">
                        {item.plan_type} ({item.status})
                      </span>
                      <Metric
                        value={item.count}
                        onClick={() =>
                          openDetail({
                            metric: 'subscription_breakdown',
                            params: { plan: item.plan_type, status: item.status },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Usage */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
          <div className="p-5">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI Token Usage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tokens Used</span>
                  <Metric
                    value={analytics.ai_usage.total_tokens_used.toLocaleString()}
                    onClick={() => openDetail({ metric: 'tokens_used' })}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Token Limit</span>
                  <Metric
                    value={analytics.ai_usage.total_token_limit.toLocaleString()}
                    onClick={() => openDetail({ metric: 'token_wallets' })}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Tokens/User</span>
                  <Metric
                    value={analytics.ai_usage.avg_tokens_per_user.toLocaleString()}
                    onClick={() => openDetail({ metric: 'token_wallets' })}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Cost (USD)</span>
                  <Metric
                    value={`$${analytics.ai_usage.estimated_cost_usd}`}
                    onClick={() => openDetail({ metric: 'tokens_used' })}
                  />
                </div>
              </div>
            </div>

            {analytics.ai_usage.users_near_quota.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Users Near Quota (80%+)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Limit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.ai_usage.users_near_quota.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-sm">{item.user.name} ({item.user.email})</td>
                          <td className="px-3 py-2 text-sm">{item.current_usage.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm">{item.monthly_limit.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className={item.usage_percentage >= 100 ? 'text-red-600 font-semibold' : ''}>
                              {item.usage_percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {analytics.ai_usage.top_users.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Top AI Users</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tokens Used</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monthly Limit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.ai_usage.top_users.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-sm">{item.user.name} ({item.user.email})</td>
                          <td className="px-3 py-2 text-sm">{item.tokens_used.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm">{item.monthly_limit.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail drill-down modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {detail?.title || (detailLoading ? 'Loading…' : 'Details')}
              </h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                onClick={() => setDetailOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto px-5 py-4">
              {detailLoading ? (
                <div className="py-10 text-center text-sm text-gray-500">Loading details…</div>
              ) : detailError ? (
                <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {detailError}
                </div>
              ) : detail && detail.rows.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">No records.</div>
              ) : detail ? (
                <>
                  <div className="mb-2 text-xs text-gray-500">
                    {detail.rows.length} record{detail.rows.length === 1 ? '' : 's'}
                    {detail.rows.length >= 200 ? ' (showing the most recent 200)' : ''}
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {detail.columns.map((c) => (
                          <th
                            key={c.key}
                            className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500"
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {detail.rows.map((row, i) => (
                        <tr key={i}>
                          {detail.columns.map((c) => (
                            <td key={c.key} className="px-3 py-2 text-sm text-gray-800">
                              {row[c.key] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
