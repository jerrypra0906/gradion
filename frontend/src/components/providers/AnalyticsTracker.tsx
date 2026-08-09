'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { installGlobalErrorCapture, trackPageView } from '@/lib/analytics';

/**
 * Records every page view with time-on-page and captures uncaught errors.
 * Renders nothing; mounted once from AppProviders so it covers the whole app,
 * including signed-out pages (landing, login, register).
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    installGlobalErrorCapture();
  }, []);

  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);

  return null;
}
