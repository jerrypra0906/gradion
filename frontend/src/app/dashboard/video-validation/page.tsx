'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';

/**
 * Retired: the generic goal-based video upload was replaced by practice videos
 * recorded per program inside the weekly home program, reviewed by admins on
 * /dashboard/admin/video-validation. Old links redirect.
 */
export default function VideoValidationRedirectPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    router.replace(user.role === 'admin' ? '/dashboard/admin/video-validation' : '/dashboard/children');
  }, [user, router]);

  return (
    <DashboardLayout>
      <div className="px-4 py-8 text-sm text-gray-600">Redirecting…</div>
    </DashboardLayout>
  );
}
