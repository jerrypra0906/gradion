'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';

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
      // Fetch CMS content that might be used for landing page sections
      const response = await apiClient.get<ApiResponse<CMSContent[]>>('/cms/admin');
      if (response.data.success) {
        // Filter for landing page related content (hero, features, etc.)
        const landingContent = (response.data.data || []).filter(
          (content) =>
            content.slug === 'hero' ||
            content.slug === 'features' ||
            content.slug === 'why-different' ||
            content.slug === 'success-stories' ||
            content.slug === 'faq'
        );
        setLandingPageContent(landingContent);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load landing page content');
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

  const landingPageSections = [
    { slug: 'hero', title: 'Hero Section', description: 'Main hero section with tagline and pitch' },
    { slug: 'features', title: 'Features Section', description: 'Features summary section' },
    { slug: 'why-different', title: 'Why Different Section', description: 'Why this tool is different' },
    { slug: 'success-stories', title: 'Success Stories', description: 'Success stories section' },
    { slug: 'faq', title: 'FAQ Section', description: 'Frequently asked questions' },
  ];

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Landing Page CMS</h1>
            <p className="text-gray-600 mt-1">Manage content for the public landing page sections.</p>
          </div>
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
            {landingPageSections.map((section) => {
              const existingContent = landingPageContent.find((c) => c.slug === section.slug);
              return (
                <div
                  key={section.slug}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                      {existingContent && (
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
                      )}
                    </div>
                    <div className="ml-4">
                      {existingContent ? (
                        <Link href={`/dashboard/cms/${existingContent.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/cms/new?slug=${section.slug}&title=${encodeURIComponent(section.title)}`}
                        >
                          <Button size="sm">Create</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">How to manage landing page content</h3>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>Each section can be managed as a CMS content item</li>
                <li>Use the slug: <code className="bg-blue-100 px-1 rounded">hero</code>, <code className="bg-blue-100 px-1 rounded">features</code>, <code className="bg-blue-100 px-1 rounded">why-different</code>, <code className="bg-blue-100 px-1 rounded">success-stories</code>, or <code className="bg-blue-100 px-1 rounded">faq</code></li>
                <li>Set status to &quot;published&quot; for the content to appear on the landing page</li>
                <li>The landing page will automatically fetch and display published content from these slugs</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

