'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';

export function ForgotPasswordPageContent() {
  const router = useRouter();
  const { forgotPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const message = await forgotPassword(email.trim());
      setSuccess(message);
      setTimeout(() => router.push('/login'), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengirim email reset kata sandi';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      active="login"
      title="Lupa kata sandi?"
      subtitle={
        <>
          Masukkan email Anda. Kami akan mengirim tautan reset yang berlaku selama{' '}
          <strong>1 jam</strong>.
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <AuthAlert variant="error">{error}</AuthAlert>}
        {success && (
          <AuthAlert variant="success">
            {success}
            <p className="mt-2 text-sm opacity-90">Mengalihkan ke halaman masuk...</p>
          </AuthAlert>
        )}

        <Input
          variant="brand"
          label="Alamat email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="anda@email.com"
          autoComplete="email"
          disabled={loading || !!success}
        />

        <Button type="submit" variant="brand" className="w-full" disabled={loading || !!success}>
          {loading ? 'Mengirim...' : success ? 'Email terkirim' : 'Kirim tautan reset'}
        </Button>

        <p className="text-center text-sm text-gradion-navy/55">
          Ingat kata sandi Anda?{' '}
          <Link href="/login" className="font-medium text-gradion-teal hover:text-gradion-teal-hover">
            Kembali ke masuk
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
