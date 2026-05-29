import { NextResponse } from 'next/server';

/** Avoid static analysis / prerender errors: this route proxies the backend at runtime only. */
export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/sitemap.xml`, {
      headers: {
        Accept: 'application/xml',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const xml = await response.text();

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Failed to fetch sitemap from backend:', error);
    
    // Return a basic sitemap even if backend fails
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://gradion.org</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new NextResponse(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}
