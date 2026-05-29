'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, Child, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function QuotaManagementPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newQuota, setNewQuota] = useState<number>(12);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchChildren();
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      // Get all children (admin can see all)
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (response.data.success && response.data.data) {
        setChildren(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (child: Child) => {
    setEditingId(child.id);
    setNewQuota(child.monthly_quota);
  };

  const handleCancel = () => {
    setEditingId(null);
    setNewQuota(12);
  };

  const handleSave = async (childId: number) => {
    try {
      setSaving(true);
      await apiClient.post('/subscriptions/quota', {
        child_id: childId,
        monthly_quota: newQuota,
      });
      await fetchChildren();
      setEditingId(null);
      alert('Quota updated successfully!');
    } catch (error: any) {
      console.error('Failed to update quota:', error);
      alert(error.response?.data?.error || 'Failed to update quota');
    } finally {
      setSaving(false);
    }
  };

  const handleResetQuotas = async () => {
    if (!confirm('Are you sure you want to reset all quotas? This will reset all subscription log quotas and child session quotas.')) {
      return;
    }
    try {
      setSaving(true);
      await apiClient.post('/subscriptions/reset-quotas');
      await fetchChildren();
      alert('All quotas have been reset successfully!');
    } catch (error: any) {
      console.error('Failed to reset quotas:', error);
      alert(error.response?.data?.error || 'Failed to reset quotas');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quota Management</h1>
            <p className="mt-2 text-gray-600">Manage session quotas for children</p>
          </div>
          <Button variant="danger" onClick={handleResetQuotas} disabled={saving}>
            {saving ? 'Resetting...' : 'Reset All Quotas'}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading children...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Child
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monthly Quota
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Used Sessions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {children.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No children found
                      </td>
                    </tr>
                  ) : (
                    children.map((child) => (
                      <tr key={child.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{child.name}</div>
                            {child.diagnosis && (
                              <div className="text-sm text-gray-500">{child.diagnosis}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {child.parent ? (
                            <div>
                              <div className="text-sm text-gray-900">{child.parent.name}</div>
                              <div className="text-sm text-gray-500">{child.parent.email}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingId === child.id ? (
                            <Input
                              type="number"
                              value={newQuota}
                              onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                              min="1"
                              className="w-24"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">{child.monthly_quota}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{child.used_sessions}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold ${
                              child.monthly_quota - child.used_sessions <= 0
                                ? 'text-red-600'
                                : child.monthly_quota - child.used_sessions <= 2
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {Math.max(0, child.monthly_quota - child.used_sessions)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                child.used_sessions >= child.monthly_quota
                                  ? 'bg-red-600'
                                  : child.used_sessions / child.monthly_quota >= 0.8
                                  ? 'bg-yellow-600'
                                  : 'bg-green-600'
                              }`}
                              style={{
                                width: `${Math.min((child.used_sessions / child.monthly_quota) * 100, 100) || 0}%`,
                              }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.round((child.used_sessions / child.monthly_quota) * 100) || 0}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editingId === child.id ? (
                            <div className="flex space-x-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSave(child.id)}
                                disabled={saving}
                              >
                                Save
                              </Button>
                              <Button variant="outline" size="sm" onClick={handleCancel}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleEdit(child)}>
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

