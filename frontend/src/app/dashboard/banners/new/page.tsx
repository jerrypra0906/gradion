'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient, ApiResponse, Banner, BannerAudience } from '@/lib/api';

const AUDIENCE_OPTIONS: BannerAudience[] = ['all', 'parents', 'therapists'];

export default function NewBannerPage() {
  const router = useRouter();
  const { user } = useAuthStore();
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

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
    setError('');

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = formData.image_url;

      // Upload image if a file is selected
      if (imageFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadResponse = await apiClient.post<ApiResponse<{ url: string; filename: string }>>(
          '/uploads/banner',
          formData,
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
        target_audience: formData.target_audience,
        is_active: formData.is_active,
        priority: Number(formData.priority) || 0,
      };
      if (imageUrl) payload.image_url = imageUrl;
      if (formData.start_date) payload.start_date = new Date(formData.start_date).toISOString();
      if (formData.end_date) payload.end_date = new Date(formData.end_date).toISOString();

      const response = await apiClient.post<ApiResponse<Banner>>('/banners', payload);
      if (response.data.success && response.data.data) {
        // Show success message with banner ID before redirecting
        const bannerId = response.data.data.id;
        alert(`Banner created successfully!\n\nBanner ID: ${bannerId}\n\nUse this ID in CMS content to link this banner to a page.`);
        router.push('/dashboard/banners');
      } else {
        setError(response.data.error || 'Failed to create banner');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create banner');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Banner</h1>
          <p className="text-gray-600 mt-2">Running banners appear on dashboards based on audience targeting.</p>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> After creating the banner, you&apos;ll receive a Banner ID that you can use in CMS content to link this banner to a page.
            </p>
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
                    Remove image
                  </button>
                </div>
              )}
              {!imageFile && formData.image_url && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-2">Current image:</p>
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
                Supported formats: JPEG, PNG, GIF, WebP. Max size: 10MB
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
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: Number(e.target.value) }))}
                min={0}
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
              {uploading ? 'Uploading image...' : saving ? 'Creating...' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

