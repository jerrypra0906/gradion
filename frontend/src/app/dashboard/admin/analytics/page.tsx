'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, AdminAnalytics, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function AdminAnalyticsPage() {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Analytics</h1>
          <p className="mt-2 text-gray-600">Platform overview and insights</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-gray-900">{analytics.overview.total_users}</div>
              <div className="text-sm font-medium text-gray-500">Total Users</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-gray-900">{analytics.overview.total_children}</div>
              <div className="text-sm font-medium text-gray-500">Total Children</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-gray-900">{analytics.overview.daily_active_users}</div>
              <div className="text-sm font-medium text-gray-500">Daily Active Users</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-gray-900">{analytics.overview.monthly_active_users}</div>
              <div className="text-sm font-medium text-gray-500">Monthly Active Users</div>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Logs (Last 7 days)</span>
                  <span className="font-semibold">{analytics.activity.recent_logs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessions (Last 7 days)</span>
                  <span className="font-semibold">{analytics.activity.recent_sessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Logs</span>
                  <span className="font-semibold">{analytics.overview.total_logs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sessions</span>
                  <span className="font-semibold">{analytics.overview.total_sessions}</span>
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
                  <span className="font-semibold">{analytics.growth.users.this_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Users Last Month</span>
                  <span className="font-semibold">{analytics.growth.users.last_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">User Growth</span>
                  <span className={`font-semibold ${analytics.growth.users.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.growth.users.growth_percentage >= 0 ? '+' : ''}
                    {analytics.growth.users.growth_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Log Growth</span>
                  <span className={`font-semibold ${analytics.growth.logs.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.growth.logs.growth_percentage >= 0 ? '+' : ''}
                    {analytics.growth.logs.growth_percentage.toFixed(1)}%
                  </span>
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
                    <span className="font-semibold">{analytics.subscriptions.funnel.trial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Paid</span>
                    <span className="font-semibold">{analytics.subscriptions.funnel.active_paid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversion Rate</span>
                    <span className="font-semibold">{analytics.subscriptions.funnel.conversion_rate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Plan Breakdown</div>
                <div className="space-y-2">
                  {analytics.subscriptions.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="capitalize">{item.plan_type} ({item.status})</span>
                      <span className="font-semibold">{item.count}</span>
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
                  <span className="font-semibold">{analytics.ai_usage.total_tokens_used.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Token Limit</span>
                  <span className="font-semibold">{analytics.ai_usage.total_token_limit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Tokens/User</span>
                  <span className="font-semibold">{analytics.ai_usage.avg_tokens_per_user.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Cost (USD)</span>
                  <span className="font-semibold">${analytics.ai_usage.estimated_cost_usd}</span>
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
    </DashboardLayout>
  );
}

