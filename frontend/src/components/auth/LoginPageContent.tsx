'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Footer } from '@/components/layout/Footer';
import type { User } from '@/lib/api';

export type LoginAudience = 'generic' | 'admin' | 'parent' | 'consultant';

const ROLE_LABEL: Record<Exclude<LoginAudience, 'generic'>, string> = {
  admin: 'administrator',
  parent: 'parent',
  consultant: 'consultant or therapist',
};

function roleMatchesPortal(
  portal: Exclude<LoginAudience, 'generic'>,
  role: User['role'] | undefined
): boolean {
  if (!role) return false;
  if (portal === 'admin') return role === 'admin';
  if (portal === 'parent') return role === 'parent';
  /* consultant portal: clinical staff */
  return role === 'consultant' || role === 'therapist';
}

export interface LoginPageContentProps {
  audience?: LoginAudience;
}

export function LoginPageContent({ audience = 'generic' }: LoginPageContentProps) {
  const router = useRouter();
  const { login, logout } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const showGoogle = audience === 'generic' || audience === 'parent';
  const showRegister =
    audience === 'generic' || audience === 'parent';

  const heading =
    audience === 'admin'
      ? 'Admin sign in'
      : audience === 'parent'
        ? 'Parent sign in'
        : audience === 'consultant'
          ? 'Consultant sign in'
          : 'Sign in to Gradion';

  const subline =
    audience === 'admin'
      ? 'CMS, user management, analytics, and platform settings.'
      : audience === 'parent'
        ? 'Track progress, logs, and collaborate with your care team.'
        : audience === 'consultant'
          ? 'Sessions, goals, activity logs, and family collaboration.'
          : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const user = useAuthStore.getState().user;

      if (audience !== 'generic') {
        if (!roleMatchesPortal(audience, user?.role)) {
          logout();
          throw new Error(
            `This account is not a ${ROLE_LABEL[audience]}. Use the correct sign-in page or contact support.`
          );
        }
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{heading}</h2>
            {subline && (
              <p className="mt-2 text-center text-sm text-gray-600 max-w-md mx-auto">{subline}</p>
            )}
            {audience === 'generic' && (
              <p className="mt-2 text-center text-sm text-gray-600">
                Or{' '}
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  create a new account
                </Link>
              </p>
            )}
            {showRegister && audience === 'parent' && (
              <p className="mt-2 text-center text-sm text-gray-600">
                New parent?{' '}
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Register here
                </Link>
              </p>
            )}
            <nav
              className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-500"
              aria-label="Other sign-in pages"
            >
              {audience !== 'admin' && (
                <Link href="/login/admin" className="text-blue-600 hover:text-blue-500">
                  Admin
                </Link>
              )}
              {audience !== 'parent' && (
                <Link href="/login/parent" className="text-blue-600 hover:text-blue-500">
                  Parent
                </Link>
              )}
              {audience !== 'consultant' && (
                <Link href="/login/consultant" className="text-blue-600 hover:text-blue-500">
                  Consultant
                </Link>
              )}
              {audience !== 'generic' && (
                <Link href="/login" className="text-blue-600 hover:text-blue-500">
                  General sign in
                </Link>
              )}
            </nav>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
            )}
            <div className="space-y-4">
              <Input
                label="Email address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <div className="flex items-center justify-end">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>

            {showGoogle && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <GoogleAuthButton
                  onAuthenticated={() => {
                    const user = useAuthStore.getState().user;
                    if (audience === 'parent') {
                      if (!user || user.role !== 'parent') {
                        logout();
                        setError(
                          'This Google account is not a parent account. Use email and password, or the Admin / Consultant sign-in page.'
                        );
                        return;
                      }
                    }
                    router.push('/dashboard');
                  }}
                />
              </>
            )}

            <p className="text-center text-sm text-gray-500">
              Didn&apos;t receive verification email?{' '}
              <Link href="/verify-email" className="text-blue-600 hover:text-blue-500">
                Resend verification
              </Link>
            </p>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
