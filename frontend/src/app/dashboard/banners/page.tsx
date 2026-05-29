'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Banner } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

const audienceLabel: Record<string, string> = {
  all: 'All Users',
  parents: 'Parents',
  therapists: 'Therapists',
};

export default function BannersPage() {
  const { user } = useAuthStore();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchBanners();
    }
  }, [user]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Banner[]>>('/banners/admin');
      if (response.data.success) {
        setBanners(response.data.data || []);
      } else {
        setError(response.data.error || 'Failed to load banners');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const formatRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return 'Always on';
    const startText = start ? new Date(start).toLocaleString() : 'Immediate';
    const endText = end ? new Date(end).toLocaleString() : 'No end';
    return `${startText} → ${endText}`;
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this banner?')) return;
    setDeletingId(id);
    try {
      await apiClient.delete<ApiResponse>(`/banners/${id}`);
      setBanners((prev) => prev.filter((banner) => banner.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete banner');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-gray-500">Admins only.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Running Banners</h1>
            <p className="text-gray-600 mt-1">
              Manage announcement banners shown across the platform.
            </p>
          </div>
          <Link href="/dashboard/banners/new">
            <Button>Create Banner</Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            Loading banners...
          </div>
        ) : banners.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            No banners yet. Create one to highlight new programs or alerts.
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{banner.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-mono font-medium text-purple-700">
                          ID: {banner.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(banner.id.toString());
                            alert('Banner ID copied to clipboard!');
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800 underline"
                          title="Copy Banner ID"
                        >
                          Copy
                        </button>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                        {audienceLabel[banner.target_audience]}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-600 whitespace-pre-line">{banner.content}</p>
                    {banner.image_url && (
                      <div className="mt-3">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm"
                          style={{ maxHeight: '200px' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            // Show fallback link if image fails to load
                            if (banner.image_url) {
                              const fallback = document.createElement('a');
                              fallback.href = banner.image_url;
                              fallback.target = '_blank';
                              fallback.rel = 'noopener noreferrer';
                              fallback.className = 'mt-2 inline-block text-sm text-blue-600 hover:text-blue-800';
                              fallback.textContent = 'View image →';
                              target.parentElement?.appendChild(fallback);
                            }
                          }}
                        />
                        <a
                          href={banner.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                        >
                          Open full size →
                        </a>
                      </div>
                    )}
                    <p className="mt-3 text-sm text-gray-500">
                      Display window: {formatRange(banner.start_date, banner.end_date)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Link href={`/dashboard/banners/${banner.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deletingId === banner.id}
                      onClick={() => handleDelete(banner.id)}
                    >
                      {deletingId === banner.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

