'use client';

import { useEffect, useRef } from 'react';

interface AdUnitProps {
  /**
   * AdSense ad slot ID (from AdSense dashboard)
   * Format: "PUBLISHER_ID/SLOT_NUMBER" (e.g., "6752375247246503/1234567890")
   * Or just "SLOT_NUMBER" if you want to use NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
   */
  adSlot: string;
  /**
   * Ad format (responsive is recommended)
   */
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  /**
   * Custom CSS class for styling
   */
  className?: string;
  /**
   * Ad dimensions for fixed-size ads
   * If not provided, uses responsive format
   */
  style?: {
    display?: 'block' | 'inline-block';
    width?: string;
    height?: string;
    minWidth?: string;
    minHeight?: string;
  };
  /**
   * Whether this ad is full-width responsive
   */
  fullWidthResponsive?: boolean;
}

/**
 * Google AdSense Ad Unit Component
 * 
 * Displays a single AdSense ad unit. Automatically initializes
 * the ad when component mounts and AdSense script is loaded.
 * 
 * Best practices:
 * - Use one ad per page initially
 * - Place ads above the fold for better revenue
 * - Don't place ads too close to navigation elements
 * - Maintain minimum spacing from ads (Google requirements)
 * 
 * @example
 * ```tsx
 * <AdUnit 
 *   adSlot="6752375247246503/1234567890"
 *   className="my-8"
 * />
 * ```
 */
export function AdUnit({
  adSlot,
  adFormat = 'auto',
  className = '',
  style,
  fullWidthResponsive = true,
}: AdUnitProps) {
  const adInitialized = useRef(false);

  useEffect(() => {
    if (adInitialized.current) return;

    const initializeAd = () => {
      try {
        if (typeof window !== 'undefined') {
          const adsbygoogle = (window as any).adsbygoogle;
          if (adsbygoogle && !adsbygoogle.loaded) {
            adsbygoogle.push({});
            adInitialized.current = true;
          }
        }
      } catch (err) {
        console.error('AdSense error:', err);
      }
    };

    // Try to initialize immediately if script is already loaded
    if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
      initializeAd();
    } else {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
          clearInterval(checkInterval);
          initializeAd();
        }
      }, 100);

      // Clear interval after 10 seconds to avoid infinite loop
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!adInitialized.current) {
          console.warn('AdSense script not loaded after 10 seconds');
        }
      }, 10000);
    }
  }, []);

  if (!adSlot) {
    return null;
  }

  // Get Publisher ID from environment variable or from adSlot
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || '';
  let adClient = '';
  let slotNumber = '';

  // Parse adSlot: format can be "PUBLISHER_ID/SLOT_NUMBER" or just "SLOT_NUMBER"
  if (adSlot.includes('/')) {
    const parts = adSlot.split('/');
    const pubIdWithoutPrefix = parts[0];
    // Add "ca-pub-" prefix if not present
    adClient = pubIdWithoutPrefix.startsWith('ca-pub-')
      ? pubIdWithoutPrefix
      : `ca-pub-${pubIdWithoutPrefix}`;
    slotNumber = parts[1];
  } else {
    // If only slot number is provided, use Publisher ID from env var
    if (publisherId) {
      adClient = publisherId.startsWith('ca-pub-')
        ? publisherId
        : `ca-pub-${publisherId.replace(/^ca-pub-/, '')}`;
      slotNumber = adSlot;
    } else {
      console.error('AdSense Publisher ID not found. Please set NEXT_PUBLIC_ADSENSE_PUBLISHER_ID.');
      return null;
    }
  }

  const defaultStyle: React.CSSProperties = {
    display: 'block',
    ...style,
  };

  return (
    <div className={`ads-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={defaultStyle}
        data-ad-client={adClient}
        data-ad-slot={slotNumber}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  );
}
