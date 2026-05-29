import { NextResponse } from 'next/server';

/**
 * API route for /api/ads
 * Serves ads.txt content for Google AdSense verification
 * Accessible at /ads.txt via rewrite or directly at /api/ads
 */
export async function GET() {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

  // If Publisher ID is set, generate ads.txt dynamically
  if (publisherId) {
    // Remove "ca-" prefix if present (AdSense Publisher ID format)
    const pubId = publisherId.replace(/^ca-pub-/, 'pub-');
    
    const adsTxtContent = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;

    return new NextResponse(adsTxtContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  // If Publisher ID is not set, return placeholder with instructions
  const placeholderContent = `# Google AdSense ads.txt file
# This file authorizes Google to serve ads on your site
# 
# To fix "ads.txt not found" error:
# 1. Get your Publisher ID from AdSense dashboard (Account → Account information)
# 2. Set NEXT_PUBLIC_ADSENSE_PUBLISHER_ID environment variable in Vercel
# 3. Format: google.com, pub-XXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
#
# Example:
# google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
#
# After setting the environment variable, redeploy your site.
`;

  return new NextResponse(placeholderContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
