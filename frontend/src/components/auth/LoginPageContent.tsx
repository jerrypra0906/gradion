'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { PasswordField } from '@/components/auth/PasswordField';

export function LoginPageContent() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      active="login"
      title="Masuk ke Gradion"
      subtitle={
        <>
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold text-gradion-teal hover:text-gradion-teal-hover">
            Daftar gratis
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <AuthAlert variant="error">{error}</AuthAlert>}

        <Input
          variant="brand"
          label="Alamat email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="anda@email.com"
          autoComplete="email"
        />

        <div className="space-y-2">
          <PasswordField
            label="Kata sandi"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-gradion-teal hover:text-gradion-teal-hover"
            >
              Lupa kata sandi?
            </Link>
          </div>
        </div>

        <Button type="submit" variant="brand" className="w-full" disabled={loading}>
          {loading ? 'Sedang masuk...' : 'Masuk'}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gradion-grey" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gradion-navy/50">atau lanjutkan dengan</span>
          </div>
        </div>

        <GoogleAuthButton onAuthenticated={() => router.push('/dashboard')} />

        <p className="text-center text-sm text-gradion-navy/55">
          Belum menerima email verifikasi?{' '}
          <Link href="/verify-email" className="font-medium text-gradion-teal hover:text-gradion-teal-hover">
            Kirim ulang
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
