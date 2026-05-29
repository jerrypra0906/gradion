'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/store/authStore';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';

// Only import DOMPurify on client side
let DOMPurify: any;
if (typeof window !== 'undefined') {
  DOMPurify = require('isomorphic-dompurify');
}

const DEFAULT_CONTENT = {
  title: 'Contact Us',
  content: (
    <>
      <p className="text-gray-600 mb-8">
        Have questions about Gradion, need help with your account, or want to share
        feedback? We&apos;d love to hear from you.
      </p>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Email</h2>
          <p className="text-gray-600">
            Send us an email at{' '}
            <a
              href="mailto:support@gradion.org"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              support@gradion.org
            </a>{' '}
            and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Support Hours</h2>
          <p className="text-gray-600">
            Monday–Friday, 09:00–17:00 WIB. We aim to respond within 1–2 business days.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">For Therapists &amp; Clinics</h2>
          <p className="text-gray-600">
            If you&apos;re a therapist or clinic interested in using Gradion with your
            clients, please mention your clinic name and how many families you&apos;d like to
            onboard.
          </p>
        </div>
      </div>
    </>
  ),
};

export default function ContactPage() {
  const { isAuthenticated } = useAuthStore();
  const [cmsContent, setCmsContent] = useState<CMSContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [sanitizedHtml, setSanitizedHtml] = useState('');
  
  // Contact form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchCMSContent();
  }, []);

  const fetchCMSContent = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<CMSContent>>('/cms/contact').catch(() => null);
      if (response?.data.success && response.data.data) {
        const rawHtml = response.data.data.content_html || '';
        const cleanHtml = DOMPurify ? DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } }) : rawHtml;
        setCmsContent(response.data.data);
        setSanitizedHtml(cleanHtml);
      }
    } catch (err) {
      // CMS content not found or not published, use default
      console.log('Using default contact content');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);
    setFormLoading(true);

    try {
      const response = await apiClient.post('/contact', formData);
      if (response.data.success) {
        setFormSuccess(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
        });
      } else {
        setFormError(response.data.error || 'Failed to send message');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to send message. Please try again later.');
    } finally {
      setFormLoading(false);
    }
  };

  const displayTitle = cmsContent?.title || DEFAULT_CONTENT.title;
  const displayContent = cmsContent ? (
    <div
      className="prose prose-lg max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml || cmsContent.content_html }}
    />
  ) : (
    DEFAULT_CONTENT.content
  );

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
              {cmsContent?.updated_at && (
                <p className="text-gray-500 text-sm mb-8">
                  Last updated: {new Date(cmsContent.updated_at).toLocaleDateString()}
                </p>
              )}
              {displayContent}
              
              {/* Contact Form */}
              <div className="mt-12 pt-10 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
                
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                      <p className="font-medium">Message sent successfully!</p>
                      <p className="text-sm mt-1">
                        We&apos;ve received your message and will get back to you within 24-48 hours. You should also receive a confirmation email shortly.
                      </p>
                    </div>
                  )}

                  <div>
                    <Input
                      label="Your Name *"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <Input
                      label="Your Email *"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <Input
                      label="Subject *"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="How can we help you?"
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message * (minimum 10 characters)
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please describe your question or issue in detail..."
                      minLength={10}
                      maxLength={5000}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.message.length} / 5000 characters
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </form>
              </div>

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


