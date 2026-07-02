'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, User, Subscription, AITokenWallet, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface UserWithSubscription extends User {
  subscription?: Subscription | null;
  aiTokenWallet?: AITokenWallet | null;
  _count?: {
    children: number;
    parentLogs: number;
    sessions: number;
  };
}

export default function AdminUsersPage() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers();
    }
  }, [user, page, searchTerm, roleFilter, pathname]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);

      const response = await apiClient.get<ApiResponse<UserWithSubscription[]>>(
        `/admin/users?${params.toString()}`
      );
      if (response.data.success && response.data.data) {
        setUsers(response.data.data);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.total_pages);
          setTotal(response.data.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'therapist':
        return 'bg-blue-100 text-blue-800';
      case 'consultant':
        return 'bg-indigo-100 text-indigo-800';
      case 'parent':
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getPlanColor = (planType?: string) => {
    switch (planType) {
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'pro':
        return 'bg-blue-100 text-blue-800';
      case 'therapist':
        return 'bg-indigo-100 text-indigo-800';
      case 'free':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-2 text-gray-600">Manage users and their subscriptions</p>
          </div>
          <Link href="/dashboard/admin/users/new">
            <Button>Create User</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="parent">Parent</option>
                <option value="therapist">Therapist</option>
                <option value="consultant">Consultant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading users...</div>
        ) : (
          <>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscription
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Log Quota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AI Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stats
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{userItem.name}</div>
                            <div className="text-sm text-gray-500">{userItem.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(
                              userItem.role
                            )}`}
                          >
                            {userItem.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {userItem.subscription ? (
                            <div>
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanColor(
                                  userItem.subscription.plan_type
                                )}`}
                              >
                                {userItem.subscription.plan_type}
                              </span>
                              <div className="mt-1">
                                <span
                                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                    userItem.subscription.status
                                  )}`}
                                >
                                  {userItem.subscription.status}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No subscription</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {userItem.subscription ? (
                            <div className="text-sm">
                              <div className="text-gray-900">
                                {userItem.subscription.used_logs_this_month} /{' '}
                                {userItem.subscription.monthly_log_quota}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className={`h-2 rounded-full ${
                                    userItem.subscription.used_logs_this_month >=
                                    userItem.subscription.monthly_log_quota
                                      ? 'bg-red-600'
                                      : userItem.subscription.used_logs_this_month /
                                          userItem.subscription.monthly_log_quota >=
                                        0.8
                                      ? 'bg-yellow-600'
                                      : 'bg-green-600'
                                  }`}
                                  style={{
                                    width: `${
                                      Math.min(
                                        (userItem.subscription.used_logs_this_month /
                                          userItem.subscription.monthly_log_quota) *
                                          100,
                                        100
                                      ) || 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {userItem.aiTokenWallet ? (
                            <div className="text-sm">
                              <div className="text-gray-900">
                                {userItem.aiTokenWallet.current_token_usage.toLocaleString()} /{' '}
                                {userItem.aiTokenWallet.monthly_token_limit.toLocaleString()}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className={`h-2 rounded-full ${
                                    userItem.aiTokenWallet.current_token_usage >=
                                    userItem.aiTokenWallet.monthly_token_limit
                                      ? 'bg-red-600'
                                      : userItem.aiTokenWallet.current_token_usage /
                                          userItem.aiTokenWallet.monthly_token_limit >=
                                        0.8
                                      ? 'bg-yellow-600'
                                      : 'bg-blue-600'
                                  }`}
                                  style={{
                                    width: `${
                                      Math.min(
                                        (userItem.aiTokenWallet.current_token_usage /
                                          userItem.aiTokenWallet.monthly_token_limit) *
                                          100,
                                        100
                                      ) || 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userItem._count && (
                            <div>
                              <div>Children: {userItem._count.children}</div>
                              <div>Logs: {userItem._count.parentLogs}</div>
                              {userItem.role === 'therapist' && (
                                <div>Sessions: {userItem._count.sessions}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/dashboard/admin/users/${userItem.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {page} of {totalPages} (Total: {total} users)
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

