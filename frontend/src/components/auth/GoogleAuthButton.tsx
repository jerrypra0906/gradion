'use client';

import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

interface GoogleAuthButtonProps {
  onAuthenticated?: () => void;
  requirePrivacyAgreement?: boolean;
  agreedToPrivacy?: boolean;
  onPrivacyAgreementChange?: (agreed: boolean) => void;
}

export function GoogleAuthButton({ 
  onAuthenticated, 
  requirePrivacyAgreement = false,
  agreedToPrivacy = false,
  onPrivacyAgreementChange
}: GoogleAuthButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [showPrivacyError, setShowPrivacyError] = useState(false);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '716619312677-upn6u3mi723ridd90qugdhhubc026jod.apps.googleusercontent.com';

  if (!clientId) {
    return null;
  }

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Unable to sign in with Google. Please try again.');
      return;
    }

    // Check privacy agreement if required
    if (requirePrivacyAgreement && !agreedToPrivacy) {
      setShowPrivacyError(true);
      setError('Anda harus menyetujui Kebijakan Privasi untuk masuk dengan Google.');
      return;
    }

    try {
      await loginWithGoogle(credentialResponse.credential);
      setError(null);
      setShowPrivacyError(false);
      onAuthenticated?.();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  const handleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  return (
    <div className="space-y-3">
      {requirePrivacyAgreement && (
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="google-privacy-agreement"
              type="checkbox"
              checked={agreedToPrivacy}
              onChange={(e) => {
                onPrivacyAgreementChange?.(e.target.checked);
                setShowPrivacyError(false);
                setError(null);
              }}
              className="h-4 w-4 rounded border-gradion-grey text-gradion-teal focus:ring-gradion-teal"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="google-privacy-agreement" className="text-gradion-navy/70 cursor-pointer text-sm">
              Saya telah membaca dan menyetujui{' '}
              <Link
                href="/cms/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gradion-teal hover:text-gradion-teal-hover underline"
                onClick={(e) => e.stopPropagation()}
              >
                Kebijakan Privasi
              </Link>
            </label>
          </div>
        </div>
      )}
      <div className={requirePrivacyAgreement && !agreedToPrivacy ? 'opacity-50 pointer-events-none' : ''}>
        <GoogleLogin 
          onSuccess={handleSuccess} 
          onError={handleError}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

