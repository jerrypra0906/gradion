'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { PasswordField } from '@/components/auth/PasswordField';

function validatePassword(pwd: string): string | undefined {
  if (pwd.length < 6) {
    return 'Kata sandi minimal 6 karakter';
  }
  return undefined;
}

export function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuthStore();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Tautan reset tidak valid. Silakan minta reset kata sandi baru.');
    }
  }, [searchParams]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordErrors((prev) => ({
      ...prev,
      password: validatePassword(value),
      confirmPassword:
        confirmPassword && value !== confirmPassword ? 'Kata sandi tidak cocok' : undefined,
    }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setPasswordErrors((prev) => ({
      ...prev,
      confirmPassword: value !== password ? 'Kata sandi tidak cocok' : undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setPasswordErrors({ password: passwordError });
      return;
    }

    if (password !== confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Kata sandi tidak cocok' });
      return;
    }

    if (!token) {
      setError('Tautan reset tidak valid. Silakan minta reset kata sandi baru.');
      return;
    }

    setLoading(true);

    try {
      const message = await resetPassword(token, password);
      setSuccess(message);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengubah kata sandi';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      active="login"
      title="Atur ulang kata sandi"
      subtitle="Masukkan kata sandi baru Anda. Tautan ini berlaku selama 1 jam."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <AuthAlert variant="error">{error}</AuthAlert>}
        {success && (
          <AuthAlert variant="success">
            {success}
            <p className="mt-2 text-sm opacity-90">Mengalihkan ke halaman masuk...</p>
          </AuthAlert>
        )}

        <PasswordField
          label="Kata sandi baru"
          value={password}
          onChange={handlePasswordChange}
          error={passwordErrors.password}
          required
          autoComplete="new-password"
          id="new-password"
        />

        <PasswordField
          label="Konfirmasi kata sandi baru"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          error={passwordErrors.confirmPassword}
          required
          autoComplete="new-password"
          id="confirm-new-password"
        />

        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={loading || !!success || !token}
        >
          {loading ? 'Menyimpan...' : success ? 'Kata sandi diperbarui' : 'Simpan kata sandi baru'}
        </Button>

        <p className="text-center text-sm text-gradion-navy/55">
          Tautan kedaluwarsa?{' '}
          <Link
            href="/forgot-password"
            className="font-medium text-gradion-teal hover:text-gradion-teal-hover"
          >
            Minta tautan baru
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
