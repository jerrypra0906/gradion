'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient, ApiResponse, CMSContent, CMSStatus } from '@/lib/api';
import DOMPurify from 'isomorphic-dompurify';
import { ImageUploadButton } from '@/components/cms/ImageUploadButton';

const STATUS_OPTIONS: CMSStatus[] = ['draft', 'scheduled', 'published', 'archived'];

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function EditCMSPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [content, setContent] = useState<CMSContent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    status: 'draft' as CMSStatus,
    publish_at: '',
    unpublish_at: '',
    banner_id: '',
    content_html: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchContent();
  }, [user, params.id]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<CMSContent>>(`/cms/admin/${params.id}`);
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setContent(data);
        setFormData({
          title: data.title,
          slug: data.slug,
          status: data.status,
          publish_at: toDateTimeLocal(data.publish_at),
          unpublish_at: toDateTimeLocal(data.unpublish_at),
          banner_id: data.banner_id ? String(data.banner_id) : '',
          content_html: data.content_html,
        });
      } else {
        setError(response.data.error || 'Content not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const insertImageAtCursor = (imageUrl: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // If no cursor position, just append
      setFormData((prev) => ({
        ...prev,
        content_html: prev.content_html + `\n<img src="${imageUrl}" alt="Uploaded image" class="max-w-full h-auto rounded-lg my-4" />\n`,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content_html;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const imageTag = `\n<img src="${imageUrl}" alt="Uploaded image" class="max-w-full h-auto rounded-lg my-4" />\n`;

    const newContent = before + imageTag + after;
    setFormData((prev) => ({
      ...prev,
      content_html: newContent,
    }));

    // Set cursor position after the inserted image tag
    setTimeout(() => {
      const newCursorPos = start + imageTag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setError('');
    setSaving(true);
    try {
      const payload: any = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        status: formData.status,
        content_html: formData.content_html,
      };
      payload.publish_at = formData.publish_at ? new Date(formData.publish_at).toISOString() : null;
      payload.unpublish_at = formData.unpublish_at ? new Date(formData.unpublish_at).toISOString() : null;
      payload.banner_id = formData.banner_id ? Number(formData.banner_id) : null;

      const response = await apiClient.put<ApiResponse<CMSContent>>(`/cms/${content.id}`, payload);
      if (response.data.success) {
        router.push('/dashboard/cms');
      } else {
        setError(response.data.error || 'Failed to update content');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update content');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-gray-500">Loading content...</div>
      </DashboardLayout>
    );
  }

  if (error || !content) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-red-600">{error || 'Content not found'}</div>
        <div className="text-center">
          <Button variant="outline" onClick={() => router.push('/dashboard/cms')}>
            Back to CMS
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
            <p className="text-sm text-blue-600 cursor-pointer" onClick={() => router.push('/dashboard/cms')}>
              ← Back to CMS
            </p>
            <h1 className="text-3xl font-bold text-gray-900">Edit CMS Content</h1>
            <p className="text-gray-600 mt-2">Updating: {content.title}</p>
          </div>
          <span className="text-sm text-gray-500">
            Last updated {new Date(content.updated_at).toLocaleString()}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Slug *</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value as CMSStatus }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Publish At</label>
              <Input
                type="datetime-local"
                value={formData.publish_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, publish_at: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Unpublish At</label>
              <Input
                type="datetime-local"
                value={formData.unpublish_at}
                min={formData.publish_at || undefined}
                onChange={(e) => setFormData((prev) => ({ ...prev, unpublish_at: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Banner ID (optional)</label>
            <Input
              type="number"
              value={formData.banner_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, banner_id: e.target.value }))}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Content (HTML)</label>
              <ImageUploadButton
                onImageUploaded={insertImageAtCursor}
                disabled={saving}
              />
            </div>
            <textarea
              ref={textareaRef}
              className="min-h-[320px] w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.content_html}
              onChange={(e) => setFormData((prev) => ({ ...prev, content_html: e.target.value }))}
            />
            <p className="mt-2 text-sm text-gray-500">
              Use the upload button to add images. Images will be inserted at the cursor position.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/cms')}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!formData.title.trim() || !formData.content_html.trim()}
            >
              Preview
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Update Content'}
            </Button>
          </div>
        </form>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Preview: {formData.title || 'Untitled'}</h2>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
              </div>
              <div className="overflow-y-auto p-6 bg-gray-50 flex-1">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
                  <div className="mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">{formData.title || 'Untitled'}</h1>
                    <p className="text-sm text-gray-500">Preview Mode</p>
                  </div>
                  <div
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(formData.content_html || '', { USE_PROFILES: { html: true } }),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

