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
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
  <p>
    By accessing and using Gradion ("the Service"), you accept and agree to be bound by the terms
    and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
  <p>
    Gradion is a platform designed to help parents and therapists track and manage autism progress. The
    Service includes features such as progress logging, therapist collaboration, goal management, and AI-powered
    insights.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Account Creation</h3>
  <p>
    To use certain features of the Service, you must register for an account. You agree to provide accurate,
    current, and complete information during registration and to update such information to keep it accurate,
    current, and complete.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Account Security</h3>
  <p>
    You are responsible for maintaining the confidentiality of your account credentials and for all activities
    that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Account Types</h3>
  <p>The Service supports different account types:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>
      <strong>Parent Accounts:</strong> For parents or legal guardians tracking their child's progress
    </li>
    <li>
      <strong>Therapist Accounts:</strong> For licensed therapists providing services to families
    </li>
    <li>
      <strong>Admin Accounts:</strong> For platform administrators (by invitation only)
    </li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Subscription and Payment</h2>
  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Subscription Plans</h3>
  <p>
    The Service offers various subscription plans with different features and pricing. Details of current plans
    are available on our pricing page.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Payment Terms</h3>
  <p>
    Subscription fees are charged in advance for the selected billing period. All fees are non-refundable except
    as required by law or as explicitly stated in our refund policy.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Cancellation</h3>
  <p>
    You may cancel your subscription at any time. Cancellation will take effect at the end of your current
    billing period. You will continue to have access to paid features until the end of the period for which you
    have already paid.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">4.4 Price Changes</h3>
  <p>
    We reserve the right to modify subscription prices. Price changes will be communicated to you in advance
    and will apply to subsequent billing periods.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. User Conduct</h2>
  <p>You agree not to:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Use the Service for any illegal or unauthorized purpose</li>
    <li>Violate any laws in your jurisdiction</li>
    <li>Transmit any viruses, malware, or harmful code</li>
    <li>Attempt to gain unauthorized access to the Service or its related systems</li>
    <li>Interfere with or disrupt the Service or servers connected to the Service</li>
    <li>Use automated systems to access the Service without permission</li>
    <li>Share your account credentials with others</li>
    <li>Impersonate any person or entity</li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Content and Data</h2>
  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">6.1 Your Content</h3>
  <p>
    You retain ownership of all content and data you upload to the Service. By using the Service, you grant us a
    license to use, store, and process your content solely for the purpose of providing and improving the Service.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">6.2 Data Accuracy</h3>
  <p>
    You are responsible for the accuracy and completeness of all data you enter into the Service. We are not
    liable for any errors or omissions in your data.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">6.3 Data Backup</h3>
  <p>
    While we implement backup and recovery procedures, you are responsible for maintaining your own backups of
    important data.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
  <p>
    The Service, including its original content, features, and functionality, is owned by Gradion and
    protected by international copyright, trademark, and other intellectual property laws. You may not reproduce,
    distribute, modify, or create derivative works of the Service without our express written permission.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Privacy</h2>
  <p>
    Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy to
    understand how we collect, use, and protect your information.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Disclaimers</h2>
  <p>
    The Service is provided "as is" and "as available" without warranties of any kind, either express or
    implied. We do not warrant that the Service will be uninterrupted, secure, or error-free. The Service is not
    a substitute for professional medical advice, diagnosis, or treatment.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Limitation of Liability</h2>
  <p>
    To the maximum extent permitted by law, Gradion shall not be liable for any indirect, incidental,
    special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or
    indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the
    Service.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Indemnification</h2>
  <p>
    You agree to indemnify and hold harmless Gradion, its officers, directors, employees, and agents from
    any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of or related to
    your use of the Service, violation of these Terms, or infringement of any rights of another.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Termination</h2>
  <p>
    We may terminate or suspend your account and access to the Service immediately, without prior notice, for any
    reason, including breach of these Terms. Upon termination, your right to use the Service will cease
    immediately.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Changes to Terms</h2>
  <p>
    We reserve the right to modify these Terms at any time. We will notify you of any material changes by
    posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service
    after such changes constitutes acceptance of the new Terms.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Governing Law</h2>
  <p>
    These Terms shall be governed by and construed in accordance with the laws of Indonesia, without regard to
    its conflict of law provisions.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">15. Contact Information</h2>
  <p>
    If you have any questions about these Terms of Service, please contact us at
    <a href="mailto:support@gradion.org" class="text-blue-600 hover:text-blue-500 font-medium">
      support@gradion.org
    </a>.
  </p>
</section>
`;

export default function TermsOfServicePage() {
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
      const response = await apiClient.get<ApiResponse<CMSContent>>('/cms/terms').catch(() => null);
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
      console.log('Using default terms of service content');
      const cleanHtml = DOMPurify ? DOMPurify.sanitize(DEFAULT_CONTENT_HTML, { USE_PROFILES: { html: true } }) : DEFAULT_CONTENT_HTML;
      setSanitizedHtml(cleanHtml);
    } finally {
      setLoading(false);
    }
  };

  const displayTitle = cmsContent?.title || 'Terms of Service';
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
