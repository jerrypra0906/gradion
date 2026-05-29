'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-700',
};

function formatDate(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

export default function CMSListPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [contents, setContents] = useState<CMSContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      setError('You do not have access to CMS management.');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchContents();
    }
  }, [user]);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<CMSContent[]>>('/cms/admin');
      if (response.data.success) {
        setContents(response.data.data || []);
      } else {
        setError(response.data.error || 'Failed to load CMS content');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load CMS content');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this content? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await apiClient.delete<ApiResponse>(`/cms/${id}`);
      setContents((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete content');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-gray-500">
          {error || 'Checking permissions...'}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CMS Content</h1>
            <p className="text-gray-600 mt-1">Manage static pages and announcements.</p>
          </div>
          <Link href="/dashboard/cms/new">
            <Button>Create Content</Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            Loading content...
          </div>
        ) : contents.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            No CMS content yet. Create your first page!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Publish Window
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {contents.map((content) => (
                  <tr key={content.id}>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{content.title}</div>
                      <div className="text-sm text-gray-500">
                        Updated {new Date(content.updated_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-sm text-gray-600">/{content.slug}</code>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyles[content.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {content.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div>From: {formatDate(content.publish_at)}</div>
                      <div>To: {formatDate(content.unpublish_at)}</div>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <Link href={`/dashboard/cms/${content.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={deletingId === content.id}
                        onClick={() => handleDelete(content.id)}
                      >
                        {deletingId === content.id ? 'Deleting...' : 'Delete'}
                      </Button>
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

