'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient, ApiResponse, Banner, BannerAudience } from '@/lib/api';

const AUDIENCE_OPTIONS: BannerAudience[] = ['all', 'parents', 'therapists'];

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const [banner, setBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    target_audience: 'all' as BannerAudience,
    is_active: true,
    start_date: '',
    end_date: '',
    priority: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchBanner();
  }, [user, params.id]);

  const fetchBanner = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Banner>>(`/banners/admin/${params.id}`);
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setBanner(data);
        setFormData({
          title: data.title,
          content: data.content,
          image_url: data.image_url || '',
          target_audience: data.target_audience,
          is_active: data.is_active,
          start_date: toDateTimeLocal(data.start_date),
          end_date: toDateTimeLocal(data.end_date),
          priority: data.priority,
        });
      } else {
        setError(response.data.error || 'Banner not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load banner');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }
      setImageFile(file);
      setError('');
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banner) return;
    setError('');
    setSaving(true);
    try {
      let imageUrl = formData.image_url;

      // Upload image if a new file is selected
      if (imageFile) {
        setUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', imageFile);

        const uploadResponse = await apiClient.post<ApiResponse<{ url: string; filename: string }>>(
          '/uploads/banner',
          formDataUpload,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        if (uploadResponse.data.success && uploadResponse.data.data) {
          // The URL from backend is already a full URL if using Supabase Storage,
          // or a relative path if using local filesystem
          imageUrl = uploadResponse.data.data.url;
          
          // If it's a relative path (starts with /), construct full URL
          if (imageUrl.startsWith('/')) {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
            const baseUrl = apiBaseUrl.endsWith('/api') 
              ? apiBaseUrl.slice(0, -4) 
              : apiBaseUrl.replace(/\/api$/, '');
            imageUrl = `${baseUrl}${imageUrl}`;
          }
          // If it's already a full URL (from Supabase Storage), use it as-is
        } else {
          throw new Error(uploadResponse.data.error || 'Failed to upload image');
        }
        setUploading(false);
      }

      const payload: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        image_url: imageUrl || null,
        target_audience: formData.target_audience,
        is_active: formData.is_active,
        priority: Number(formData.priority) || 0,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      };

      const response = await apiClient.put<ApiResponse<Banner>>(`/banners/${banner.id}`, payload);
      if (response.data.success) {
        router.push('/dashboard/banners');
      } else {
        setError(response.data.error || 'Failed to update banner');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update banner');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-gray-500">Loading banner...</div>
      </DashboardLayout>
    );
  }

  if (error || !banner) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-red-600">{error || 'Banner not found'}</div>
        <div className="text-center">
          <Button variant="outline" onClick={() => router.push('/dashboard/banners')}>
            Back to Banners
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/banners')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Banners
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Edit Banner</h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-gray-600">Last updated {new Date(banner.updated_at).toLocaleString()}</p>
            </div>
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900 mb-1">Banner ID</p>
                  <p className="text-xs text-purple-700">
                    Use this ID in CMS content to link this banner to a page.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white border border-purple-300 rounded px-3 py-2 text-lg font-mono font-bold text-purple-900">
                    {banner.id}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(banner.id.toString());
                      alert('Banner ID copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Content *</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={5}
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Banner Image</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">New image preview:</p>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs max-h-48 rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove new image
                    </button>
                  </div>
                )}
                {!imageFile && formData.image_url && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Current image:</p>
                    <img
                      src={formData.image_url}
                      alt="Current"
                      className="max-w-xs max-h-48 rounded-lg border border-gray-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Supported formats: JPEG, PNG, GIF, WebP. Max size: 10MB. Leave empty to keep current image.
                </p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Audience</label>
              <select
                value={formData.target_audience}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, target_audience: e.target.value as BannerAudience }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {AUDIENCE_OPTIONS.map((audience) => (
                  <option key={audience} value={audience}>
                    {audience.charAt(0).toUpperCase() + audience.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Active
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
              <Input
                type="number"
                value={formData.priority}
                min={0}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: Number(e.target.value) }))}
              />
              <p className="text-xs text-gray-500 mt-1">Higher number shows first</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
              <Input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
              <Input
                type="datetime-local"
                min={formData.start_date || undefined}
                value={formData.end_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/banners')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {uploading ? 'Uploading image...' : saving ? 'Saving...' : 'Update Banner'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

