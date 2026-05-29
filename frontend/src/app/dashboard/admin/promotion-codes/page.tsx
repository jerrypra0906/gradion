'use client';

import { useEffect, useState } from 'react';
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
}

export default function PromotionCodesPage() {
  const { user } = useAuthStore();
  const [promotionCodes, setPromotionCodes] = useState<PromotionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPromotionCodes();
    }
  }, [user, filterActive]);

  const fetchPromotionCodes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterActive !== undefined) {
        params.append('is_active', filterActive);
      }
      const response = await apiClient.get<ApiResponse<PromotionCode[]>>(
        `/promotion-codes?${params.toString()}`
      );
      if (response.data.success && response.data.data) {
        setPromotionCodes(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch promotion codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this promotion code?')) {
      return;
    }

    try {
      await apiClient.delete(`/promotion-codes/${id}`);
      fetchPromotionCodes();
    } catch (error) {
      console.error('Failed to delete promotion code:', error);
      alert('Failed to delete promotion code');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">Inactive</span>;
    }
    if (code.is_expired) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Expired</span>;
    }
    if (code.is_valid) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Active</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Not Started</span>;
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

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Promotion Codes</h1>
            <p className="text-gray-600 mt-1">Manage discount codes for subscriptions</p>
          </div>
          <Link href="/dashboard/admin/promotion-codes/new">
            <Button>Create Promotion Code</Button>
          </Link>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilterActive(undefined)}
            className={`px-4 py-2 rounded text-sm font-medium ${
              filterActive === undefined
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterActive('true')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              filterActive === 'true'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterActive('false')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              filterActive === 'false'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactive
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading promotion codes...</p>
          </div>
        ) : promotionCodes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">No promotion codes found</p>
            <Link href="/dashboard/admin/promotion-codes/new">
              <Button>Create Your First Promotion Code</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promotionCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{code.code}</div>
                      {code.description && (
                        <div className="text-sm text-gray-500">{code.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatDiscount(code)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(code.start_date)}</div>
                      <div className="text-sm text-gray-500">to {formatDate(code.end_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {code.used_count} / {code.quota === 0 ? '∞' : code.quota}
                      </div>
                      {code.remaining_quota !== null && (
                        <div className="text-sm text-gray-500">
                          {code.remaining_quota} remaining
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(code)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{code.creator.name}</div>
                      <div className="text-sm text-gray-500">{code.creator.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/admin/promotion-codes/${code.id}`}>
                          <button className="text-blue-600 hover:text-blue-900">View</button>
                        </Link>
                        <Link href={`/dashboard/admin/promotion-codes/${code.id}/edit`}>
                          <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                        </Link>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

