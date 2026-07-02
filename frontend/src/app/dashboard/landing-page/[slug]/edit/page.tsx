'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  getDefaultLandingSectionContent,
  LandingSectionEditor,
} from '@/components/dashboard/LandingSectionEditor';
import { apiClient, ApiResponse, CMSContent, CMSStatus } from '@/lib/api';
import {
  isLandingSectionSlug,
  LANDING_SECTIONS,
  LandingSectionContentMap,
  LandingSectionSlug,
  parseLandingSection,
  serializeLandingSection,
} from '@/lib/landingCms';

const STATUS_OPTIONS: CMSStatus[] = ['draft', 'scheduled', 'published', 'archived'];

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function LandingSectionEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const slugParam = params.slug as string;
  const slug = isLandingSectionSlug(slugParam) ? slugParam : null;
  const sectionMeta = slug ? LANDING_SECTIONS.find((section) => section.slug === slug) : null;

  const [cmsRecord, setCmsRecord] = useState<CMSContent | null>(null);
  const [sectionData, setSectionData] = useState<LandingSectionContentMap[LandingSectionSlug] | null>(
    null
  );
  const [status, setStatus] = useState<CMSStatus>('draft');
  const [publishAt, setPublishAt] = useState('');
  const [unpublishAt, setUnpublishAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    if (!slug || !sectionMeta) {
      setLoading(false);
      return;
    }
    loadSection();
  }, [user, slug, sectionMeta, router]);

  const loadSection = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get<ApiResponse<CMSContent[]>>('/cms/admin');
      const existing = response.data.data?.find((item) => item.slug === slug) || null;
      setCmsRecord(existing);

      if (existing) {
        setSectionData(parseLandingSection(slug, existing));
        setStatus(existing.status);
        setPublishAt(toDateTimeLocal(existing.publish_at));
        setUnpublishAt(toDateTimeLocal(existing.unpublish_at));
      } else {
        setSectionData(getDefaultLandingSectionContent(slug));
        setStatus('draft');
        setPublishAt('');
        setUnpublishAt('');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to load section';
      setError(message);
      if (slug) {
        setSectionData(getDefaultLandingSectionContent(slug));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    if (!slug) return;
    setSectionData(getDefaultLandingSectionContent(slug));
    setSuccess('Loaded current default landing page copy into the editor.');
  };

  const handleSave = async () => {
    if (!slug || !sectionMeta || !sectionData) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        title: sectionMeta.title,
        slug,
        status,
        content_html: serializeLandingSection(slug, sectionData as LandingSectionContentMap[typeof slug]),
        publish_at: publishAt ? new Date(publishAt).toISOString() : null,
        unpublish_at: unpublishAt ? new Date(unpublishAt).toISOString() : null,
      };

      if (cmsRecord) {
        await apiClient.put<ApiResponse<CMSContent>>(`/cms/${cmsRecord.id}`, payload);
      } else {
        const response = await apiClient.post<ApiResponse<CMSContent>>('/cms/', payload);
        if (response.data.data) {
          setCmsRecord(response.data.data);
        }
      }

      setSuccess(
        status === 'published'
          ? 'Section saved and published. Changes will appear on the landing page.'
          : 'Section saved as draft. Set status to published to show it on the landing page.'
      );
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to save section';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!slug || !sectionMeta) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 text-center text-red-600">Unknown landing page section.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0 max-w-4xl">
        <div className="mb-6">
          <Link
            href="/dashboard/landing-page"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Landing Page CMS
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">{sectionMeta.title}</h1>
          <p className="text-gray-600 mt-1">{sectionMeta.description}</p>
          <p className="text-xs text-gray-500 mt-2">
            Slug: <code className="bg-gray-100 px-1 rounded">{slug}</code>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            {success}
          </div>
        )}

        {loading || !sectionData ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-500">
            Loading section...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Publishing</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CMSStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publish at</label>
                  <Input
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unpublish at</label>
                  <Input
                    type="datetime-local"
                    value={unpublishAt}
                    onChange={(e) => setUnpublishAt(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Section content</h2>
                <Button type="button" variant="outline" size="sm" onClick={handleResetDefaults}>
                  Reset to defaults
                </Button>
              </div>
              <LandingSectionEditor
                slug={slug}
                value={sectionData as LandingSectionContentMap[typeof slug]}
                onChange={setSectionData}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save section'}
              </Button>
              <Link href="/">
                <Button type="button" variant="outline">
                  Preview landing page
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
