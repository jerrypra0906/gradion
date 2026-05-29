# Google Search Console Setup Guide

## Overview

This guide will help you set up Google Search Console for LangkahKecil, submit your sitemap, and ensure your CMS articles are properly indexed by Google. This is essential for SEO and making your autism-related content discoverable in search results.

---

## Prerequisites

- Access to your domain: `langkahkecil.org`
- Google account (Gmail account)
- Access to your website's DNS settings (if needed for domain verification)

---

## Step 1: Create a Sitemap

A sitemap helps Google discover and index all your pages. We'll create a dynamic sitemap that includes all your CMS content.

### Option A: Create Sitemap API Endpoint (Recommended)

Create a sitemap endpoint in your backend that generates XML dynamically:

**File: `backend/src/routes/sitemap.ts`**

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function sitemapRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Generate sitemap.xml
  fastify.get('/sitemap.xml', async (request, reply) => {
    const baseUrl = process.env.FRONTEND_URL || 'https://langkahkecil.org';
    const now = new Date().toISOString();

    // Get all published CMS content
    const cmsContent = await prisma.cMSContent.findMany({
      where: {
        status: 'published',
        OR: [
          { publish_at: null },
          { publish_at: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { unpublish_at: null },
              { unpublish_at: { gt: new Date() } },
            ],
          },
        ],
      },
      select: {
        slug: true,
        updated_at: true,
      },
    });

    // Static pages
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'weekly' },
      { path: '/login', priority: '0.8', changefreq: 'monthly' },
      { path: '/register', priority: '0.8', changefreq: 'monthly' },
      { path: '/resources', priority: '0.9', changefreq: 'weekly' },
      { path: '/cms/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/cms/privacy', priority: '0.5', changefreq: 'yearly' },
      { path: '/cms/terms', priority: '0.5', changefreq: 'yearly' },
    ];

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static pages
    for (const page of staticPages) {
      const lastmod = page.path === '' ? now : new Date('2024-01-01').toISOString().split('T')[0];
      xml += `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add CMS content pages
    for (const content of cmsContent) {
      const lastmod = content.updated_at
        ? new Date(content.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      xml += `  <url>
    <loc>${baseUrl}/cms/${content.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    reply.type('application/xml');
    return xml;
  });
}
```

**Register the route in `backend/src/index.ts`:**

```typescript
import { sitemapRoutes } from './routes/sitemap.js';

// ... existing code ...

await server.register(sitemapRoutes, { prefix: '/api' });
```

### Option B: Static Sitemap File (Alternative)

If you prefer a static file, create `frontend/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://langkahkecil.org</loc>
    <lastmod>2024-12-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://langkahkecil.org/resources</loc>
    <lastmod>2024-12-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Add more URLs as needed -->
</urlset>
```

**Note:** You'll need to update this file manually when you add new CMS content.

---

## Step 2: Verify Your Domain in Google Search Console

### 2.1 Access Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account
3. Click **"Add Property"**

### 2.2 Add Your Property

You have two options:

**Option A: Domain Property (Recommended)**
- Select **"Domain"** property type
- Enter: `langkahkecil.org`
- Click **"Continue"**

**Option B: URL Prefix Property**
- Select **"URL prefix"** property type
- Enter: `https://langkahkecil.org`
- Click **"Continue"**

### 2.3 Verify Ownership

Google will provide several verification methods. Choose the easiest for you:

#### Method 1: HTML File Upload (Easiest)

1. Download the HTML verification file from Google
2. Upload it to your website's root directory:
   - For Vercel: Add to `frontend/public/` directory
   - File should be accessible at: `https://langkahkecil.org/google1234567890.html`
3. Click **"Verify"** in Google Search Console

#### Method 2: HTML Tag (Alternative)

1. Copy the HTML meta tag from Google
2. Add it to your `frontend/src/app/layout.tsx` in the `<head>` section:

```tsx
// In layout.tsx, add to metadata or head
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
```

3. Deploy the change
4. Click **"Verify"** in Google Search Console

#### Method 3: DNS Record (For Domain Property)

1. Add a TXT record to your domain's DNS:
   - **Type:** TXT
   - **Name:** @ (or root domain)
   - **Value:** (provided by Google)
2. Wait for DNS propagation (can take up to 48 hours)
3. Click **"Verify"** in Google Search Console

#### Method 4: Google Analytics (If Already Set Up)

If you already have Google Analytics installed:
1. Select **"Google Analytics"** verification method
2. Click **"Verify"**

---

## Step 3: Submit Your Sitemap

### 3.1 Access Sitemaps Section

1. In Google Search Console, click **"Sitemaps"** in the left sidebar
2. Or go directly to: `https://search.google.com/search-console/sitemaps`

### 3.2 Add Sitemap URL

1. In the **"Add a new sitemap"** field, enter:
   - **Recommended**: `https://langkahkecil.org/sitemap.xml` (root sitemap - preferred by Google)
   - Alternative: `https://langkahkecil.org/api/sitemap.xml` (API endpoint)
2. Click **"Submit"**

> **💡 Tip**: Google Search Console typically prefers sitemaps at the root domain (`/sitemap.xml`) rather than in subdirectories. Use the root sitemap for best results.

### 3.3 Verify Sitemap Status

- **Status: Success** ✅ - Google successfully read your sitemap
- **Status: Couldn't fetch** ❌ - Check that the URL is accessible
- **Status: Has errors** ⚠️ - Review and fix any errors

**Common Issues:**
- **404 Error**: Make sure the sitemap URL is correct and accessible
- **Invalid XML**: Check that your sitemap XML is well-formed
- **Duplicate URLs**: Ensure each URL appears only once in the sitemap (this has been fixed in the code)
- **General HTTP Error**: Try using `/sitemap.xml` instead of `/api/sitemap.xml`, or check that the backend API is accessible
- **Too many URLs**: Google allows up to 50,000 URLs per sitemap

---

## Step 4: Request Indexing for Important Pages

### 4.1 Use URL Inspection Tool

1. In Google Search Console, click **"URL Inspection"** in the left sidebar
2. Enter a URL (e.g., `https://langkahkecil.org/resources`)
3. Click **"Test Live URL"**
4. If the page is not indexed, click **"Request Indexing"**

### 4.2 Priority Pages to Index

Request indexing for these important pages:
- `https://langkahkecil.org` (Homepage)
- `https://langkahkecil.org/resources` (Resources page)
- `https://langkahkecil.org/cms/contact`
- `https://langkahkecil.org/cms/privacy`
- `https://langkahkecil.org/cms/terms`
- Each new CMS article you publish

---

## Step 5: Monitor Indexing Status

### 5.1 Check Coverage Report

1. In the left sidebar, click **"Indexing"** to expand the section
2. Click **"Coverage"** (or **"Page indexing"** in some versions)
3. Review the coverage report:
   - **Valid** - Pages successfully indexed
   - **Valid with warnings** - Indexed but may have issues
   - **Excluded** - Pages not indexed (with reasons)
   - **Error** - Pages with indexing errors

> **Note**: If you don't see "Coverage" directly in the sidebar, look for it under the "Indexing" section. Google Search Console's interface may vary slightly, but the Coverage report is always accessible through the Indexing menu.

### 5.2 Common Issues and Fixes

**Issue: "Discovered - currently not indexed"**
- **Cause**: Google found the page but hasn't indexed it yet
- **Fix**: Use "Request Indexing" for important pages

**Issue: "Crawled - currently not indexed"**
- **Cause**: Google crawled but chose not to index (low quality, duplicate content)
- **Fix**: Improve content quality, ensure unique content

**Issue: "Duplicate without user-selected canonical"**
- **Cause**: Multiple URLs with same content
- **Fix**: Ensure canonical tags are set correctly

**Issue: "Page with redirect"**
- **Cause**: Page redirects to another URL
- **Fix**: This is usually fine, but check if redirect is intentional

---

## Step 6: Optimize for Better Indexing

### 6.1 Create robots.txt

Create `frontend/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/
Disallow: /_next/

Sitemap: https://langkahkecil.org/api/sitemap.xml
```

This tells search engines:
- ✅ Index public pages
- ❌ Don't index dashboard (requires login)
- ❌ Don't index API endpoints
- ✅ Use our sitemap

### 6.2 Ensure Proper Meta Tags

We've already added SEO meta tags to CMS pages. Verify they include:
- `<title>` - Unique for each page
- `<meta name="description">` - Compelling description
- `<meta name="keywords">` - Relevant keywords
- `<link rel="canonical">` - Canonical URL

### 6.3 Use Structured Data

We've added Schema.org Article markup with JSON-LD format. Verify it's working:
1. Use [Google's Rich Results Test](https://search.google.com/test/rich-results)
2. Enter a CMS page URL (e.g., `https://langkahkecil.org/cms/memahami-autisme-langkah-praktis-sehari-hari`)
3. Check for any errors or warnings

**What to look for:**
- ✅ **Valid** - No errors, page is eligible for rich results
- ⚠️ **Warnings** - Page is eligible but has minor issues (review and fix if possible)
- ❌ **Errors** - Page is not eligible for rich results (must fix)

**Common issues and fixes:**
- **Missing image**: We automatically extract images from content or use a default logo
- **Invalid date format**: Dates are formatted in ISO 8601 format
- **Publisher logo**: Included as ImageObject with proper dimensions

> **Note**: If Google Search Console shows "still processing data, please check again in a day or so" in the Indexing → Pages section, this is normal. Google can take 24-48 hours to process and display indexing data. The Rich Results Test will work immediately after deployment.

---

## Step 7: Monitor Rich Results and Performance

### 7.1 Check Rich Results Status

Google Search Console's interface has changed. To monitor your structured data:

**Option 1: Use Rich Results Test (Recommended)**
- Go directly to: [Google Rich Results Test](https://search.google.com/test/rich-results)
- Test individual URLs to see if structured data is detected
- This is the most reliable way to check your structured data

**Option 2: Check in Search Console**
- In Google Search Console, look for **"Enhancements"** in the left sidebar (if available)
- Or check **"Performance"** → Filter by **"Search appearance"** → Look for rich result types
- Note: Google has simplified Search Console, and some structured data reporting may be integrated into other sections

**Option 3: Use URL Inspection Tool**
1. Click **"URL Inspection"** in the left sidebar
2. Enter a CMS article URL
3. Click **"Test Live URL"**
4. Look for structured data information in the results

### 7.2 Performance Report

1. Click **"Performance"** in Google Search Console
2. Review:
   - **Total clicks** - How many clicks from Google search
   - **Total impressions** - How many times your pages appeared in search
   - **Average CTR** - Click-through rate
   - **Average position** - Average ranking position
3. Filter by **"Search appearance"** to see if rich results are appearing

### 7.2 Track Important Keywords

Monitor how your pages rank for:
- "autism progress tracker"
- "autism therapy Indonesia"
- "ASD tracking tool"
- "autism resources"
- Any specific topics covered in your CMS articles

---

## Step 8: Best Practices for CMS Articles

### 8.1 When Creating New Articles

1. **Use descriptive slugs**: 
   - ✅ Good: `understanding-autism-spectrum-disorder`
   - ❌ Bad: `article-1`, `post-123`

2. **Write compelling titles**:
   - ✅ Good: "Understanding Autism Spectrum Disorder: A Parent's Guide"
   - ❌ Bad: "Article about Autism"

3. **Include keywords naturally**:
   - Use terms like "autism", "ASD", "therapy", "child development"
   - Don't keyword stuff

4. **Add images with alt text**:
   - Use descriptive alt text for SEO
   - Example: `alt="Child with autism engaging in therapy activities"`

5. **Link internally**:
   - Link to other relevant CMS articles
   - Link to your resources page

### 8.2 Article Structure

Structure your articles with:
- **H1**: Main title (one per page)
- **H2**: Section headings
- **H3**: Subsections
- **Paragraphs**: Well-written, informative content
- **Lists**: Bullet points or numbered lists
- **Images**: Relevant images with alt text

### 8.3 Content Length

- **Minimum**: 300 words for basic articles
- **Recommended**: 800-1500 words for comprehensive articles
- **Long-form**: 2000+ words for in-depth guides

---

## Step 9: Regular Maintenance

### 9.1 Weekly Tasks

- Check Google Search Console for new errors
- Review performance metrics
- Request indexing for new CMS articles

### 9.2 Monthly Tasks

- Review and update sitemap if needed
- Check for broken links
- Update old articles with new information
- Analyze which articles perform best

### 9.3 Quarterly Tasks

- Review and optimize underperforming pages
- Update meta descriptions for better CTR
- Check for duplicate content issues
- Review and update robots.txt if needed

---

## Troubleshooting

### Problem: Sitemap Not Found

**Solution:**
1. Verify the sitemap URL is accessible: Visit `https://langkahkecil.org/api/sitemap.xml` in browser
2. Check that the route is registered in your backend
3. Ensure the endpoint returns `Content-Type: application/xml`

### Problem: Pages Not Being Indexed

**Solution:**
1. Check robots.txt - ensure pages aren't blocked
2. Verify pages are accessible without login
3. Use URL Inspection tool to check for specific errors
4. Request indexing manually for important pages
5. Ensure pages have unique, quality content

### Problem: Low Search Rankings

**Solution:**
1. Improve content quality and depth
2. Add more relevant keywords naturally
3. Get backlinks from reputable sites
4. Ensure fast page load times
5. Make content mobile-friendly
6. Update content regularly

### Problem: Duplicate Content Warnings

**Solution:**
1. Ensure canonical tags are set correctly
2. Remove duplicate pages if not needed
3. Use 301 redirects for old URLs
4. Consolidate similar content

---

## Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Google's SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)
- [Schema.org Documentation](https://schema.org/)

---

## Quick Checklist

- [ ] Create sitemap endpoint or file
- [ ] Verify domain in Google Search Console
- [ ] Submit sitemap URL
- [ ] Create robots.txt file
- [ ] Request indexing for homepage
- [ ] Request indexing for resources page
- [ ] Request indexing for important CMS articles
- [ ] Monitor coverage report weekly
- [ ] Check performance metrics monthly
- [ ] Update sitemap when adding new content

---

## Next Steps After Setup

1. **Wait for indexing**: It can take a few days to weeks for Google to index your pages
2. **Monitor regularly**: Check Google Search Console weekly
3. **Create quality content**: Focus on creating valuable, informative articles
4. **Be patient**: SEO takes time - results may take 3-6 months to show

---

*Last updated: December 2024*
