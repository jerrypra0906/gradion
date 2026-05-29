import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';

export async function sitemapRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Generate sitemap.xml
  fastify.get('/sitemap.xml', async (_request, reply) => {
    fastify.log.info('Sitemap request received');
    try {
      const baseUrl = config.frontendUrl || 'https://gradion.org';
      const now = new Date().toISOString().split('T')[0];

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
        orderBy: {
          updated_at: 'desc',
        },
      });

      // Static pages with their priorities and change frequencies
      // Note: Exclude /cms/contact, /cms/privacy, /cms/terms from static pages
      // since they are also in CMS content and will be included there
      // Note: /login is excluded because it has index:false in metadata
      const staticPages = [
        { path: '', priority: '1.0', changefreq: 'weekly' },
        { path: '/register', priority: '0.9', changefreq: 'monthly' },
        { path: '/cms', priority: '0.8', changefreq: 'weekly' },
        { path: '/resources', priority: '0.9', changefreq: 'weekly' },
      ];

      // Static CMS pages that should use specific priorities (if they exist in CMS)
      const staticCmsSlugs = ['contact', 'privacy', 'terms'];
      const staticCmsPriorities: Record<string, { priority: string; changefreq: string }> = {
        contact: { priority: '0.7', changefreq: 'monthly' },
        privacy: { priority: '0.5', changefreq: 'yearly' },
        terms: { priority: '0.5', changefreq: 'yearly' },
      };

      // Build XML
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

      // Add static pages (excluding CMS pages that are in the database)
      for (const page of staticPages) {
        const lastmod = now; // Use current date for all pages for better freshness
        xml += `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
      }

      // Add CMS content pages (with deduplication)
      // Use a Set to track URLs we've already added
      const addedUrls = new Set<string>();
      
      for (const content of cmsContent) {
        const url = `${baseUrl}/cms/${content.slug}`;
        
        // Skip if already added
        if (addedUrls.has(url)) {
          continue;
        }
        
        addedUrls.add(url);
        
        const lastmod = content.updated_at
          ? new Date(content.updated_at).toISOString().split('T')[0]
          : now;
        
        // Use custom priority/changefreq for static CMS pages, otherwise default
        const isStaticCms = staticCmsSlugs.includes(content.slug);
        const priority = isStaticCms ? staticCmsPriorities[content.slug].priority : '0.8';
        const changefreq = isStaticCms ? staticCmsPriorities[content.slug].changefreq : 'weekly';
        
        xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;
      }

      xml += `</urlset>`;

      reply.type('application/xml');
      reply.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      return xml;
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to generate sitemap');
      reply.code(500);
      return `<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>Failed to generate sitemap</message>
</error>`;
    }
  });
}
