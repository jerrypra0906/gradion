'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const resendVerification = useAuthStore((state) => state.resendVerification);

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading'>('idle');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) return;

    const handleVerification = async () => {
      setStatus('verifying');
      try {
        const result = await verifyEmail(token);
        setMessage(result);
        setStatus('success');
        setTimeout(() => router.push('/login'), 2000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Verification failed.');
      }
    };

    handleVerification();
  }, [token, verifyEmail, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendStatus('loading');
    setMessage('');
    try {
      const result = await resendVerification(resendEmail);
      setMessage(result);
    } catch (error: any) {
      setMessage(error.message || 'Unable to resend verification email.');
    } finally {
      setResendStatus('idle');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Verify your email</h1>
          <p className="text-sm text-gray-600">
            We sent you a verification link. Please confirm your email before signing in.
          </p>
        </div>

        {status === 'verifying' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
            Verifying your email...
          </div>
        )}

        {message && (
          <div
            className={`px-4 py-3 rounded text-sm ${
              status === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        {!token && (
          <form onSubmit={handleResend} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              required
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button type="submit" className="w-full" disabled={resendStatus === 'loading'}>
              {resendStatus === 'loading' ? 'Sending...' : 'Resend verification email'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500">
          Ready to sign in?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            Go to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

