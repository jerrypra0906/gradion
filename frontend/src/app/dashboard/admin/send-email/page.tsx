'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, User } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

type RecipientType = 'single' | 'multiple' | 'all' | 'parents' | 'therapists' | 'admins' | 'user_ids';

interface SendEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    total_recipients: number;
    successful: number;
    failed: number;
    recipients: string[];
  };
}

export default function AdminSendEmailPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [recipientType, setRecipientType] = useState<RecipientType>('single');
  const [singleEmail, setSingleEmail] = useState('');
  const [multipleEmails, setMultipleEmails] = useState('');
  const [userIds, setUserIds] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendEmailResponse | null>(null);
  const [error, setError] = useState('');

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Build the request body based on recipient type
      let to: string | string[] | 'all' | 'parents' | 'therapists' | 'admins';
      let user_ids: number[] | undefined;

      switch (recipientType) {
        case 'single':
          if (!singleEmail.trim()) {
            setError('Please enter an email address');
            setLoading(false);
            return;
          }
          to = singleEmail.trim();
          break;
        case 'multiple':
          const emails = multipleEmails
            .split('\n')
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
          if (emails.length === 0) {
            setError('Please enter at least one email address');
            setLoading(false);
            return;
          }
          to = emails;
          break;
        case 'all':
        case 'parents':
        case 'therapists':
        case 'admins':
          to = recipientType;
          break;
        case 'user_ids':
          const ids = userIds
            .split(',')
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id));
          if (ids.length === 0) {
            setError('Please enter at least one valid user ID');
            setLoading(false);
            return;
          }
          to = 'all'; // We'll use user_ids to filter
          user_ids = ids;
          break;
      }

      if (!subject.trim()) {
        setError('Please enter a subject');
        setLoading(false);
        return;
      }

      if (!htmlContent.trim()) {
        setError('Please enter email content');
        setLoading(false);
        return;
      }

      const response = await apiClient.post<ApiResponse<SendEmailResponse>>('/admin/send-email', {
        to,
        subject: subject.trim(),
        html: htmlContent.trim(),
        user_ids,
      });

      if (response.data.success) {
        setResult(response.data.data as SendEmailResponse);
        // Reset form on success
        setSingleEmail('');
        setMultipleEmails('');
        setUserIds('');
        setSubject('');
        setHtmlContent('');
      } else {
        setError(response.data.error || 'Failed to send email');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const getRecipientPreview = () => {
    switch (recipientType) {
      case 'single':
        return singleEmail ? `1 recipient: ${singleEmail}` : '1 recipient';
      case 'multiple':
        const emails = multipleEmails
          .split('\n')
          .map((e) => e.trim())
          .filter((e) => e.length > 0);
        return `${emails.length} recipients`;
      case 'all':
        return 'All verified users';
      case 'parents':
        return 'All verified parents';
      case 'therapists':
        return 'All verified therapists';
      case 'admins':
        return 'All verified admins';
      case 'user_ids':
        const ids = userIds
          .split(',')
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));
        return `${ids.length} specific user(s)`;
      default:
        return '';
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Send Email</h1>
          <p className="mt-2 text-gray-600">Send emails to registered users using your configured domain (e.g. @gradion.org)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient Selection */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipients</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Type</label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
              >
                <option value="single">Single Email Address</option>
                <option value="multiple">Multiple Email Addresses</option>
                <option value="all">All Users</option>
                <option value="parents">All Parents</option>
                <option value="therapists">All Therapists</option>
                <option value="admins">All Admins</option>
                <option value="user_ids">Specific User IDs</option>
              </select>
            </div>

            {recipientType === 'single' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
                />
              </div>
            )}

            {recipientType === 'multiple' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Addresses (one per line)
                </label>
                <textarea
                  value={multipleEmails}
                  onChange={(e) => setMultipleEmails(e.target.value)}
                  placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                  style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
                />
                <p className="mt-1 text-xs text-gray-500">Enter one email address per line</p>
              </div>
            )}

            {recipientType === 'user_ids' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User IDs (comma-separated)
                </label>
                <input
                  type="text"
                  value={userIds}
                  onChange={(e) => setUserIds(e.target.value)}
                  placeholder="1, 2, 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
                />
                <p className="mt-1 text-xs text-gray-500">Enter user IDs separated by commas (e.g., 1, 2, 3)</p>
              </div>
            )}

            {recipientType !== 'single' && recipientType !== 'multiple' && recipientType !== 'user_ids' && (
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Recipients:</strong> {getRecipientPreview()}
                </p>
                <p className="text-xs text-blue-600 mt-1">Only verified users will receive emails</p>
              </div>
            )}

            {recipientType === 'single' && singleEmail && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Recipient:</strong> {singleEmail}
                </p>
              </div>
            )}

            {recipientType === 'multiple' && multipleEmails && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Recipients:</strong> {getRecipientPreview()}
                </p>
              </div>
            )}

            {recipientType === 'user_ids' && userIds && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Recipients:</strong> {getRecipientPreview()}
                </p>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Details</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content *</label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<h1>Hello</h1><p>Your HTML email content here...</p>"
                rows={12}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter HTML content for your email. You can use HTML tags like &lt;h1&gt;, &lt;p&gt;, &lt;div&gt;, etc.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Success Message */}
          {result && result.success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-semibold">{result.message}</p>
              {result.data && (
                <div className="mt-2 text-sm">
                  <p>Total recipients: {result.data.total_recipients}</p>
                  <p>Successful: {result.data.successful}</p>
                  {result.data.failed > 0 && <p className="text-red-600">Failed: {result.data.failed}</p>}
                  {result.data.recipients.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View recipients ({result.data.recipients.length})
                      </summary>
                      <ul className="mt-2 list-disc list-inside text-xs">
                        {result.data.recipients.map((email, idx) => (
                          <li key={idx}>{email}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Email Templates</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Simple Template</h4>
              <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Title</h1>
  <p>Your content here</p>
</div>`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Professional Template</h4>
              <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
{`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #2563eb; margin-top: 0;">Title</h1>
    <p style="color: #374151; line-height: 1.6;">Your content here</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #6b7280; font-size: 12px;">Gradion Team</p>
  </div>
</div>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
