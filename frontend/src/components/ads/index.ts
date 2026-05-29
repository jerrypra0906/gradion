/**
 * Google AdSense Components
 * 
 * These components help integrate Google AdSense into your Next.js application.
 * 
 * Setup Instructions:
 * 1. Sign up for Google AdSense at https://www.google.com/adsense
 * 2. Get your Publisher ID (format: ca-pub-XXXXXXXXXXXXXX)
 * 3. Create ad units in AdSense dashboard and get ad slot IDs
 * 4. Add NEXT_PUBLIC_ADSENSE_PUBLISHER_ID to your .env.local
 * 5. Add AdSenseScript to your root layout
 * 6. Place AdUnit or ResponsiveAd components where you want ads
 * 
 * Important Notes:
 * - Don't click your own ads (violates AdSense policy)
 * - Maintain minimum spacing between ads and content
 * - Don't place ads in dashboard/authenticated areas (better UX)
 * - Wait for AdSense approval before expecting revenue
 */

export { AdSenseScript } from './AdSenseScript';
export { AdUnit } from './AdUnit';
export { ResponsiveAd } from './ResponsiveAd';
