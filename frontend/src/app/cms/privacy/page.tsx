'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/store/authStore';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';

// Only import DOMPurify on client side
let DOMPurify: any;
if (typeof window !== 'undefined') {
  DOMPurify = require('isomorphic-dompurify');
}

const DEFAULT_CONTENT_HTML = `
<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2>
  <p>
    Gradion ("we," "our," or "us") is committed to protecting your privacy.
    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use
    our platform and services.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Personal Information</h3>
  <p>We may collect the following personal information:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Name, email address, and phone number</li>
    <li>Child's name, birthdate, and diagnosis information (for parents)</li>
    <li>Professional credentials and clinic information (for therapists)</li>
    <li>Payment and billing information</li>
  </ul>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Usage Data</h3>
  <p>
    We automatically collect information about how you interact with our platform, including session logs,
    progress tracking data, and device information.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
  <p>We use the information we collect to:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Provide, maintain, and improve our services</li>
    <li>Process transactions and manage subscriptions</li>
    <li>Enable communication between parents and therapists</li>
    <li>Generate progress reports and analytics</li>
    <li>Send important updates and notifications</li>
    <li>Comply with legal obligations</li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
  <p>
    We implement industry-standard security measures to protect your data, including encryption in transit
    and at rest, secure authentication, and regular security audits. However, no method of transmission over
    the internet is 100% secure.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Data Sharing and Disclosure</h2>
  <p>We do not sell your personal information. We may share your information only in the following cases:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>With therapists linked to your child's account (with your consent)</li>
    <li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li>
    <li>When required by law or to protect our rights and safety</li>
    <li>In connection with a business transfer (merger, acquisition, etc.)</li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights</h2>
  <p>You have the right to:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Access and review your personal information</li>
    <li>Request corrections to inaccurate data</li>
    <li>Request deletion of your account and data</li>
    <li>Opt-out of certain communications</li>
    <li>Export your data in a portable format</li>
  </ul>
  <p class="mt-4">
    To exercise these rights, please contact us at
    <a href="mailto:support@gradion.org" class="text-blue-600 hover:text-blue-500 font-medium">
      support@gradion.org
    </a>.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Children's Privacy</h2>
  <p>
    Our platform is designed to help parents track their children's progress. All child-related data is
    collected and managed by parents or legal guardians. We do not knowingly collect information directly
    from children without parental consent.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Changes to This Policy</h2>
  <p>
    We may update this Privacy Policy from time to time. We will notify you of any material changes by
    posting the new policy on this page and updating the "Last updated" date.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Contact Us</h2>
  <p>
    If you have questions about this Privacy Policy, please contact us at
    <a href="mailto:support@gradion.org" class="text-blue-600 hover:text-blue-500 font-medium">
      support@gradion.org
    </a>.
  </p>
</section>
`;

export default function PrivacyPolicyPage() {
  const { isAuthenticated } = useAuthStore();
  const [cmsContent, setCmsContent] = useState<CMSContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [sanitizedHtml, setSanitizedHtml] = useState('');

  useEffect(() => {
    fetchCMSContent();
  }, []);

  const fetchCMSContent = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<CMSContent>>('/cms/privacy').catch(() => null);
      if (response?.data.success && response.data.data) {
        const rawHtml = response.data.data.content_html || '';
        const cleanHtml = DOMPurify ? DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } }) : rawHtml;
        setCmsContent(response.data.data);
        setSanitizedHtml(cleanHtml);
      } else {
        // Use default content HTML
        const cleanHtml = DOMPurify ? DOMPurify.sanitize(DEFAULT_CONTENT_HTML, { USE_PROFILES: { html: true } }) : DEFAULT_CONTENT_HTML;
        setSanitizedHtml(cleanHtml);
      }
    } catch (err) {
      // CMS content not found or not published, use default
      console.log('Using default privacy policy content');
      const cleanHtml = DOMPurify ? DOMPurify.sanitize(DEFAULT_CONTENT_HTML, { USE_PROFILES: { html: true } }) : DEFAULT_CONTENT_HTML;
      setSanitizedHtml(cleanHtml);
    } finally {
      setLoading(false);
    }
  };

  const displayTitle = cmsContent?.title || 'Privacy Policy';
  const displayDate = cmsContent?.updated_at
    ? new Date(cmsContent.updated_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                Gradion
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

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 md:p-10">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {displayTitle}
              </h1>
              <p className="text-gray-500 text-sm mb-8">Last updated: {displayDate}</p>

              <div
                className="prose prose-lg max-w-none text-gray-700 space-y-6"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
              <div className="mt-10">
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

