'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { ResponsiveAd } from '@/components/ads';
import { siteUrl, siteName } from '@/lib/site';

export default function CMSPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [content, setContent] = useState<CMSContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sanitizedHtml, setSanitizedHtml] = useState('');

  useEffect(() => {
    if (params.slug) {
      fetchContent();
    }
  }, [params.slug]);

  // Update document head for SEO
  useEffect(() => {
    if (content) {
      // Extract plain text from HTML for description
      const tmp = document.createElement('div');
      tmp.innerHTML = content.content_html;
      const plainText = (tmp.textContent || tmp.innerText || '').substring(0, 160).replace(/\s+/g, ' ').trim() + '...';
      
      // Update title
      document.title = `${content.title} | ${siteName}`;
      
      // Update or create meta tags
      const updateMetaTag = (name: string, content: string, isProperty = false) => {
        const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let meta = document.querySelector(selector) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          if (isProperty) {
            meta.setAttribute('property', name);
          } else {
            meta.setAttribute('name', name);
          }
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      updateMetaTag('description', plainText);
      updateMetaTag('keywords', 'autism, ASD, autism spectrum disorder, therapy, child development, autism resources, Indonesia');
      updateMetaTag('og:title', `${content.title} | ${siteName}`, true);
      updateMetaTag('og:description', plainText, true);
      updateMetaTag('og:type', 'article', true);
      updateMetaTag('og:url', `${siteUrl}/cms/${content.slug}`, true);
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', `${content.title} | ${siteName}`);
      updateMetaTag('twitter:description', plainText);

      // Update canonical link
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', `${siteUrl}/cms/${content.slug}`);
    }
  }, [content]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get<ApiResponse<CMSContent>>(`/cms/${params.slug}`);
      if (response.data.success && response.data.data) {
        const rawHtml = response.data.data.content_html || '';
        
        // Only sanitize on client-side to avoid server-side DOMPurify issues
        let cleanHtml = rawHtml;
        if (typeof window !== 'undefined') {
          const DOMPurify = (await import('isomorphic-dompurify')).default;
          cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
        }
        
        setContent(response.data.data);
        setSanitizedHtml(cleanHtml);
      } else {
        setError('Content not found');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Content not found');
      } else {
        setError(err.response?.data?.error || 'Failed to load content');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && user && <DashboardLayout><div className="text-center py-12">Loading...</div></DashboardLayout>}
        {!isAuthenticated && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center py-12">Loading...</div>
          </div>
        )}
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && user ? (
          <DashboardLayout>
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h2 className="text-xl font-semibold text-red-900 mb-2">Content Not Found</h2>
                <p className="text-red-700 mb-4">{error || 'The requested content could not be found.'}</p>
                <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
              </div>
            </div>
          </DashboardLayout>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold text-red-900 mb-2">Content Not Found</h2>
              <p className="text-red-700 mb-4">{error || 'The requested content could not be found.'}</p>
              <Link href="/">
                <Button>Go to Home</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Generate structured data for JSON-LD (render in HTML, not useEffect)
  const generateStructuredData = () => {
    if (!content) return null;

    try {
      // Extract plain text from HTML for description (strip HTML tags)
      const plainText = (content.content_html || '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 160) + '...';

      // Extract image from content HTML if available
      const imgMatch = (content.content_html || '').match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      let imageUrl = `${siteUrl}/gradion-logo.svg`; // Default logo from public folder

      if (imgMatch && imgMatch[1]) {
        const src = imgMatch[1];
        if (src.startsWith('http://') || src.startsWith('https://')) {
          imageUrl = src;
        } else if (src.startsWith('/')) {
          imageUrl = `${siteUrl}${src}`;
        } else {
          imageUrl = `${siteUrl}/${src}`;
        }
      }

      // Format dates properly (ISO 8601)
      const formatDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) {
          return new Date().toISOString();
        }
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            return new Date().toISOString();
          }
          return date.toISOString();
        } catch {
          return new Date().toISOString();
        }
      };

      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: content.title || 'Article',
        description: plainText,
        url: `${siteUrl}/cms/${content.slug || ''}`,
        datePublished: formatDate(content.created_at),
        dateModified: formatDate(content.updated_at),
        image: [imageUrl],
        author: {
          '@type': 'Person',
          name: `${siteName} Team`,
        },
        publisher: {
          '@type': 'Organization',
          name: siteName,
          url: siteUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${siteUrl}/gradion-logo.svg`,
            width: 600,
            height: 60
          }
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${siteUrl}/cms/${content.slug || ''}`,
        }
      };

      return structuredData;
    } catch (error) {
      console.error('Error generating structured data:', error);
      return null;
    }
  };

  const contentWrapper = (
    <>
      {/* Add structured data directly in HTML for Google crawler */}
      {content && (() => {
        const structuredData = generateStructuredData();
        return structuredData ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData)
            }}
          />
        ) : null;
      })()}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <article itemScope itemType="https://schema.org/Article" className="bg-white rounded-lg shadow-sm p-6 md:p-10 lg:p-12">
          {/* Article Header */}
          <header className="mb-8 pb-6 border-b border-gray-200">
            <h1 itemProp="headline" className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              {content?.title || 'Content'}
            </h1>
            {content?.updated_at && (
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <time itemProp="dateModified" dateTime={content.updated_at}>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Terakhir diperbarui: {new Date(content.updated_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </time>
              </div>
            )}
          </header>
          
          {/* Ad: Top of article (only on public pages) */}
          {!isAuthenticated && process.env.NEXT_PUBLIC_ADSENSE_SLOT_CMS_CONTENT && (
            <ResponsiveAd
              adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_CMS_CONTENT}
              placement="header"
              className="mb-8"
            />
          )}
          
          {content && (
            <div
              itemProp="articleBody"
              className="cms-article"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml || content.content_html || '' }}
            />
          )}
          
          {/* Ad: Bottom of article (only on public pages) */}
          {!isAuthenticated && process.env.NEXT_PUBLIC_ADSENSE_SLOT_CMS_CONTENT && (
            <ResponsiveAd
              adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_CMS_CONTENT}
              placement="footer"
              className="mt-8"
            />
          )}
          
          {isAuthenticated && user && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          )}
        </article>
      </div>
    </>
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

