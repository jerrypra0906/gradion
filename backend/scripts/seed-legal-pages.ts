/**
 * Move the legal pages into the CMS so they can be edited and translated.
 *
 * /cms/privacy, /cms/terms and /cms/contact currently render hard-coded English
 * fallbacks when no CMS row exists, which means an Indonesian reader gets
 * English and an admin cannot change a word without a deploy. This copies that
 * exact published copy into cms_content as `source_lang: 'en'`; the translation
 * cache then produces Indonesian on first read, and the admin owns the text.
 *
 * Idempotent: rows that already exist are left alone.
 *
 *   docker compose exec backend npx tsx scripts/seed-legal-pages.ts
 *
 * The HTML below is copied verbatim from the frontend fallbacks
 * (frontend/src/app/cms/{privacy,terms,contact}/page.tsx). If you change it
 * there, re-run with --force to overwrite.
 */
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const FRONTEND_PAGES = path.resolve(process.cwd(), '../frontend/src/app/cms');

/** Pull the DEFAULT_CONTENT_HTML template literal out of a page component. */
function readFallbackHtml(slug: string): string | null {
  try {
    const src = readFileSync(path.join(FRONTEND_PAGES, slug, 'page.tsx'), 'utf8');
    const start = src.indexOf('const DEFAULT_CONTENT_HTML = `');
    if (start === -1) return null;
    const from = src.indexOf('`', start) + 1;
    const to = src.indexOf('`;', from);
    if (to === -1) return null;
    return src.slice(from, to).trim();
  } catch {
    return null;
  }
}

const PAGES: Array<{ slug: string; title: string }> = [
  { slug: 'privacy', title: 'Privacy Policy' },
  { slug: 'terms', title: 'Terms of Service' },
];

async function main() {
  const force = process.argv.includes('--force');
  let created = 0;
  let skipped = 0;

  for (const page of PAGES) {
    const existing = await prisma.cMSContent.findUnique({ where: { slug: page.slug } });
    if (existing && !force) {
      console.log(`skip   ${page.slug} (already in the CMS)`);
      skipped += 1;
      continue;
    }

    const html = readFallbackHtml(page.slug);
    if (!html) {
      console.log(`skip   ${page.slug} (no fallback HTML found in the frontend)`);
      skipped += 1;
      continue;
    }

    await prisma.cMSContent.upsert({
      where: { slug: page.slug },
      create: {
        slug: page.slug,
        title: page.title,
        content_html: html,
        status: 'published',
        publish_at: new Date(),
        source_lang: 'en',
      },
      update: {
        title: page.title,
        content_html: html,
        source_lang: 'en',
        // A fresh body invalidates any cached translation.
        content_i18n: undefined,
      },
    });
    console.log(`${existing ? 'update' : 'create'} ${page.slug} (${html.length} chars)`);
    created += 1;
  }

  console.log(`\n${created} written, ${skipped} skipped.`);
  console.log('Indonesian is produced on the first read of each page, then cached.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
