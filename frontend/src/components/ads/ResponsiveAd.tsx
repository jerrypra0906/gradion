'use client';

import { AdUnit } from './AdUnit';

interface ResponsiveAdProps {
  /**
   * AdSense ad slot ID
   */
  adSlot: string;
  /**
   * Ad placement location for styling
   */
  placement?: 'sidebar' | 'content' | 'footer' | 'header' | 'inline';
  /**
   * Custom CSS class
   */
  className?: string;
}

/**
 * Responsive Ad Component with Common Sizes
 * 
 * Pre-configured responsive ad component that works well
 * on both desktop and mobile devices.
 * 
 * Recommended placements:
 * - Sidebar: 300x250 or 300x600 (skyscraper)
 * - Content: 728x90 (leaderboard) or 300x250 (rectangle)
 * - Inline: 300x250 (medium rectangle)
 * - Footer: 728x90 (leaderboard)
 */
export function ResponsiveAd({ 
  adSlot, 
  placement = 'content',
  className = '' 
}: ResponsiveAdProps) {
  // Determine styling based on placement
  const placementStyles = {
    sidebar: 'max-w-[300px] mx-auto',
    content: 'max-w-full my-8',
    footer: 'max-w-full my-8',
    header: 'max-w-full mb-8',
    inline: 'max-w-full my-6',
  };

  const wrapperClassName = `${placementStyles[placement]} ${className}`;

  return (
    <div className={wrapperClassName}>
      <AdUnit
        adSlot={adSlot}
        adFormat="auto"
        fullWidthResponsive={true}
        className="text-center"
      />
    </div>
  );
}
