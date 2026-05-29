'use client';

import Script from 'next/script';

interface AdSenseScriptProps {
  publisherId: string;
}

/**
 * Google AdSense Script Component
 * Loads the AdSense script once per page load
 * 
 * Usage: Add to root layout or pages where ads are displayed
 * 
 * @param publisherId - Your AdSense Publisher ID (e.g., "ca-pub-1234567890123456")
 */
export function AdSenseScript({ publisherId }: AdSenseScriptProps) {
  if (!publisherId) {
    return null;
  }

  return (
    <>
      <Script
        id="adsbygoogle-init"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
      />
    </>
  );
}
