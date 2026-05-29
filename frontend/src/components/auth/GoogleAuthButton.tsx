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
    '240575427402-su5e6dfpmpv3oqmu1d5au323a8vtskvg.apps.googleusercontent.com';

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
      setError('You must agree to the Privacy Policy to sign in with Google.');
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="google-privacy-agreement" className="text-gray-700 cursor-pointer">
              I have read and agree to the{' '}
              <Link
                href="/cms/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500 font-medium underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
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

