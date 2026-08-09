'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { ReactNode, Suspense } from 'react';
import { AnalyticsTracker } from '@/components/providers/AnalyticsTracker';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '716619312677-upn6u3mi723ridd90qugdhhubc026jod.apps.googleusercontent.com';

  // Suspense keeps the tracker's navigation hooks from blocking static rendering.
  const analytics = (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );

  if (!clientId) {
    return (
      <>
        {analytics}
        {children}
      </>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {analytics}
      {children}
    </GoogleOAuthProvider>
  );
}

