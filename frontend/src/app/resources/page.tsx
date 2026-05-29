'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/layout/Footer';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';
import DOMPurify from 'isomorphic-dompurify';
import { useAuthStore } from '@/store/authStore';
import { ResponsiveAd } from '@/components/ads';
import { siteUrl, siteName } from '@/lib/site';

export default function ResourcesPage() {
  const { isAuthenticated } = useAuthStore();
  const [resources, setResources] = useState<CMSContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      // Fetch all published CMS content, excluding landing page sections and legal pages
      const excludeSlugs = ['hero', 'vision-mission', 'features', 'why-different', 'success-stories', 'faq', 'contact', 'privacy', 'terms'];
      const response = await apiClient.get<ApiResponse<CMSContent[]>>('/cms?limit=50');
      
      if (response.data.success && response.data.data) {
        // Filter out landing page sections and legal pages
        const filtered = response.data.data.filter(
          (item) => !excludeSlugs.includes(item.slug)
        );
        setResources(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Knowledge Hub — ${siteName}`,
    description:
      'Articles and guides about autism, ABA-aligned practice, therapy, and supporting children with ASD.',
    url: `${siteUrl}/resources`,
    inLanguage: ['id-ID', 'en-US'],
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/gradion-logo.svg`,
      },
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: resources.length,
      itemListElement: resources.map((resource, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Article',
          name: resource.title,
          url: `${siteUrl}/cms/${resource.slug}`,
        },
      })),
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Structured Data for SEO */}
      <Script
        id="resources-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                {siteName}
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Knowledge Hub</h1>
          <p className="text-xl text-gray-600">
            Educational articles and guides — ABA, therapy, and supporting your child&apos;s development
          </p>
        </div>

        {/* Ad: Above resources grid */}
        {process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES && (
          <ResponsiveAd
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES}
            placement="header"
            className="mb-8"
          />
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading resources...</p>
          </div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {resources.map((resource, index) => (
              <div key={resource.id}>
              <Link
                href={`/cms/${resource.slug}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group block"
              >
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {resource.title}
                  </h2>
                  {resource.updated_at && (
                    <p className="text-sm text-gray-500 mb-4">
                      Updated {new Date(resource.updated_at).toLocaleDateString()}
                    </p>
                  )}
                  <div className="text-gray-600 line-clamp-4">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          resource.content_html.substring(0, 200) + '...',
                          { USE_PROFILES: { html: true } }
                        ),
                      }}
                    />
                  </div>
                  <div className="mt-4 text-blue-600 font-medium group-hover:underline">
                    Read more →
                  </div>
                </div>
              </Link>
                
                {/* Ad: Show after every 6 articles (2 rows of 3) */}
                {(index + 1) % 6 === 0 && process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES && (
                  <div className="col-span-full mt-8">
                    <ResponsiveAd
                      adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES}
                      placement="inline"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">No resources available yet. Check back soon!</p>
          </div>
        )}

        {/* Ad: Before footer */}
        {process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES && (
          <ResponsiveAd
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESOURCES}
            placement="footer"
            className="mt-12"
          />
        )}

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
