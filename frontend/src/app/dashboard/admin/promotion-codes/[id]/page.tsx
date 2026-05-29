'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface PromotionCode {
  id: number;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  quota: number;
  used_count: number;
  remaining_quota: number | null;
  is_active: boolean;
  is_expired: boolean;
  is_valid: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator: {
    id: number;
    name: string;
    email: string;
  };
  usages: Array<{
    id: number;
    user_id: number;
    subscription_request_id: number | null;
    discount_amount: number;
    used_at: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
}

export default function PromotionCodeDetailPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [promotionCode, setPromotionCode] = useState<PromotionCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPromotionCode();
    }
  }, [user, id]);

  const fetchPromotionCode = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<PromotionCode>>(`/promotion-codes/${id}`);
      if (response.data.success && response.data.data) {
        setPromotionCode(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch promotion code:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDiscount = (code: PromotionCode) => {
    if (code.discount_type === 'percentage') {
      return `${code.discount_value}%`;
    }
    return `Rp ${code.discount_value.toLocaleString('id-ID')}`;
  };

  const getStatusBadge = (code: PromotionCode) => {
    if (!code.is_active) {
      return <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded">Inactive</span>;
    }
    if (code.is_expired) {
      return <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded">Expired</span>;
    }
    if (code.is_valid) {
      return <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded">Active</span>;
    }
    return <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded">Not Started</span>;
  };

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-red-600">Access denied. Admin only.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">Loading promotion code...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!promotionCode) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-red-600">Promotion code not found</p>
          <Link href="/dashboard/admin/promotion-codes">
            <Button className="mt-4">Back to Promotion Codes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <Link href="/dashboard/admin/promotion-codes" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Promotion Codes
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Promotion Code Details</h1>
              <p className="text-gray-600 mt-1">View usage statistics and details</p>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(promotionCode)}
              <Link href={`/dashboard/admin/promotion-codes/${id}/edit`}>
                <Button>Edit</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Code Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Code</dt>
                <dd className="mt-1 text-lg font-mono font-bold text-blue-600">{promotionCode.code}</dd>
              </div>
              {promotionCode.description && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{promotionCode.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Discount</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">{formatDiscount(promotionCode)}</dd>
                <dd className="text-sm text-gray-500 capitalize">{promotionCode.discount_type} discount</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Validity Period</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(promotionCode.start_date)} - {formatDate(promotionCode.end_date)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Usage Quota</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {promotionCode.quota === 0 ? (
                    <span className="font-semibold">Unlimited</span>
                  ) : (
                    <>
                      {promotionCode.used_count} / {promotionCode.quota} used
                      {promotionCode.remaining_quota !== null && (
                        <span className="text-gray-500 ml-2">
                          ({promotionCode.remaining_quota} remaining)
                        </span>
                      )}
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created By</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {promotionCode.creator.name} ({promotionCode.creator.email})
                </dd>
                <dd className="text-xs text-gray-500">{formatDate(promotionCode.created_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Usage Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Uses</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900">{promotionCode.used_count}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Discount Given</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">
                  Rp{' '}
                  {promotionCode.usages
                    .reduce((sum, usage) => sum + usage.discount_amount, 0)
                    .toLocaleString('id-ID')}
                </dd>
              </div>
              {promotionCode.quota > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Remaining Quota</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">
                    {promotionCode.remaining_quota || 0}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Usage History */}
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Usage History</h2>
          </div>
          {promotionCode.usages.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No usage history yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Used At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {promotionCode.usages.map((usage) => (
                    <tr key={usage.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{usage.user.name}</div>
                        <div className="text-sm text-gray-500">{usage.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Rp {usage.discount_amount.toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(usage.used_at)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

