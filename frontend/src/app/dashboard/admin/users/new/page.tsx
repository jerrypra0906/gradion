'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, getApiErrorMessage, User } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';

type UserRole = User['role'];

export default function NewAdminUserPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'parent' as UserRole,
    phone_number: '',
    is_email_verified: true,
  });

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setSaving(true);
      const response = await apiClient.post<ApiResponse<User>>('/admin/users', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        ...(formData.phone_number.trim()
          ? { phone_number: formData.phone_number.trim() }
          : {}),
        is_email_verified: formData.is_email_verified,
      });

      if (response.data.success && response.data.data) {
        router.push(`/dashboard/admin/users/${response.data.data.id}`);
        return;
      }
      setError(response.data.error || 'Failed to create user');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create user'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <Link
            href="/dashboard/admin/users"
            className="text-sm font-semibold text-[#00C1B2] hover:text-[#00A896] transition-colors"
          >
            ← Back to Users
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-[#1A2B4C]">{t('createUser')}</h1>
          <p className="mt-2 text-[#1A2B4C]/65">Add a new account for a parent, therapist, consultant, or admin.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl rounded-2xl border border-[#E5E8EB] bg-white p-6 shadow-sm"
        >
          <div className="space-y-5">
            <Input
              label="Full name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              minLength={2}
              variant="brand"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
              variant="brand"
            />
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
              variant="brand"
            />
            <Input
              label="Phone number (optional)"
              value={formData.phone_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
              variant="brand"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A2B4C]">{t('userRole')}</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))
                }
                className="w-full rounded-lg border border-[#E5E8EB] px-4 py-2.5 text-[#1A2B4C] focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30"
              >
                <option value="parent">Parent</option>
                <option value="therapist">Therapist</option>
                <option value="consultant">Consultant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#1A2B4C]/80">
              <input
                type="checkbox"
                checked={formData.is_email_verified}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, is_email_verified: e.target.checked }))
                }
                className="rounded border-[#E5E8EB] text-[#00C1B2] focus:ring-[#00C1B2]/30"
              />
              {t('emailVerified')}
            </label>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : t('createUser')}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/admin/users')}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
