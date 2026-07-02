'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';
import { LANDING_SECTIONS, LANDING_SECTION_SLUGS } from '@/lib/landingCms';

export default function LandingPageCMS() {
  const { user } = useAuthStore();
  const [landingPageContent, setLandingPageContent] = useState<CMSContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }
    fetchLandingPageContent();
  }, [user]);

  const fetchLandingPageContent = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<CMSContent[]>>('/cms/admin');
      if (response.data.success) {
        const slugs = new Set<string>(LANDING_SECTION_SLUGS);
        const landingContent = (response.data.data || []).filter((content) => slugs.has(content.slug));
        setLandingPageContent(landingContent);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to load landing page content';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-gray-500">Access denied</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Landing Page CMS</h1>
            <p className="text-gray-600 mt-1">
              Edit every section of the public landing page. Published sections appear on the homepage.
            </p>
          </div>
          <Link href="/" target="_blank">
            <Button variant="outline">Preview landing page</Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            Loading landing page content...
          </div>
        ) : (
          <div className="space-y-4">
            {LANDING_SECTIONS.map((section) => {
              const existingContent = landingPageContent.find((c) => c.slug === section.slug);
              return (
                <div
                  key={section.slug}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Slug: <code className="bg-gray-100 px-1 rounded">{section.slug}</code>
                      </p>
                      {existingContent ? (
                        <div className="mt-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              existingContent.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : existingContent.status === 'draft'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {existingContent.status}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            Updated {new Date(existingContent.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">
                          Not saved yet — homepage uses built-in default copy until you publish this section.
                        </p>
                      )}
                    </div>
                    <div className="ml-4 shrink-0">
                      <Link href={`/dashboard/landing-page/${section.slug}/edit`}>
                        <Button size="sm">{existingContent ? 'Edit' : 'Set up'}</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">How it works</h3>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>Each block below maps to a section on the public landing page.</li>
                <li>Use <strong>Edit</strong> to change headlines, body text, links, FAQs, testimonials, and more.</li>
                <li>Set status to <strong>published</strong> when you are ready for changes to go live.</li>
                <li>Pricing amounts still come from subscription settings; you can edit plan names, bullets, and CTA labels here.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
