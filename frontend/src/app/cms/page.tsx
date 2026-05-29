'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { siteName } from '@/lib/site';

export default function CMSListPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [contents, setContents] = useState<CMSContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<CMSContent[]>>('/cms?limit=50');
      if (response.data.success) {
        // Filter out Terms of Service, Privacy Policy, and Contact Us
        const filtered = (response.data.data || []).filter(
          (content) =>
            content.slug !== 'terms' &&
            content.slug !== 'privacy' &&
            content.slug !== 'contact'
        );
        setContents(filtered);
      } else {
        setError(response.data.error || 'Failed to load content');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const contentWrapper = (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Resources & Information</h1>
        <p className="text-gray-600">Browse our helpful guides and resources</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : contents.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          No content available at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {contents.map((content) => (
            <Link
              key={content.id}
              href={`/cms/${content.slug}`}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{content.title}</h2>
              {content.updated_at && (
                <p className="text-sm text-gray-500">
                  Updated {new Date(content.updated_at).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {isAuthenticated && user && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
        </div>
      )}
    </div>
  );

  if (isAuthenticated && user) {
    return <DashboardLayout>{contentWrapper}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                {siteName}
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {contentWrapper}
      </main>
    </div>
  );
}

