'use client';

import { Suspense } from 'react';
import { ResetPasswordPageContent } from '@/components/auth/ResetPasswordPageContent';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthPageLayout active="login" title="Atur ulang kata sandi" subtitle="Memuat...">
          <p className="text-sm text-gradion-navy/55 text-center py-8">Memuat...</p>
        </AuthPageLayout>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
