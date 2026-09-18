import type { CMSContent } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { generateTranslationText } from './ai.service.js';

export type CmsLang = 'en' | 'id';

/** What a cached translation holds — the same two reader-facing fields. */
type TranslatedFields = { title: string; content_html: string };

export function normalizeCmsLang(value: unknown): CmsLang {
  return String(value ?? '').toLowerCase() === 'id' ? 'id' : 'en';
}

/**
 * Landing sections store JSON in `content_html`; CMS pages store real HTML.
 * The prompt differs, because JSON must keep its keys and structure exactly
 * while HTML must keep its tags and attributes.
 */
function looksLikeJson(value: string): boolean {
  const t = value.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

type BodyKind = 'json' | 'html' | 'text';

/** A title is a bare string; a page body is HTML; a landing section is JSON. */
function classifyBody(value: string): BodyKind {
  if (looksLikeJson(value)) return 'json';
  return /<[a-z][\s\S]*>/i.test(value) ? 'html' : 'text';
}

async function translateBody(
  body: string,
  to: CmsLang
): Promise<{ text: string; tokensUsed: number } | null> {
  const targetName = to === 'id' ? 'Bahasa Indonesia' : 'English';
  const kind = classifyBody(body);

  const system =
    kind === 'json'
      ? `You translate website copy between English and Bahasa Indonesia. The input is JSON. Return ONLY valid minified JSON with the EXACT same keys, nesting and array order. Translate only human-readable string values into ${targetName}. Never translate or alter: keys, URLs, hrefs, slugs, routes, icon names, colour codes, numbers, booleans, or the brand name "Gradion".`
      : kind === 'html'
        ? `You translate website copy between English and Bahasa Indonesia. The input is HTML. Return ONLY HTML with the EXACT same tags, attributes and structure. Translate only the visible text into ${targetName}. Never translate or alter: tag names, attribute names, class names, href/src values, or the brand name "Gradion".`
        : `You translate short website labels and page titles between English and Bahasa Indonesia. Return ONLY the translated text into ${targetName} — no quotes, no explanation, no punctuation that was not in the input. Keep the brand name "Gradion" unchanged.`;

  const user = `Translate into ${targetName}.

Rules:
- Translate EVERYTHING a reader sees, including headings, labels and button text.
- Keep the brand name "Gradion" and personal names unchanged.
- Keep the tagline "Recovery is possible" unchanged — it is a brand line.
- Do not add, remove or reorder anything.
- Output ONLY the translated ${kind === 'json' ? 'JSON' : kind === 'html' ? 'HTML' : 'text'}, with no commentary or code fences.

--- BEGIN ---
${body}
--- END ---`;

  // Landing sections run long (the FAQ and pricing blocks especially), and a
  // truncated translation would be unparseable JSON or broken HTML.
  const out = await generateTranslationText(system, user, {
    maxTokens: kind === 'text' ? 300 : 8000,
    temperature: 0.1,
  });
  if (!out) return null;

  let text = out.text.trim();
  // Models occasionally wrap output in a fence despite the instruction.
  const fenced = text.match(/^```(?:json|html)?\s*([\s\S]*?)\s*```$/);
  if (fenced) text = fenced[1].trim();

  if (kind === 'json' && !looksLikeJson(text)) {
    logger.warn({ to }, 'CMS translation did not return valid JSON — keeping the source');
    return null;
  }
  return { text, tokensUsed: out.tokensUsed };
}

/** Read a cached translation, if one is stored for this language. */
function readCache(row: CMSContent, to: CmsLang): TranslatedFields | null {
  const cache = row.content_i18n as Record<string, unknown> | null;
  const entry = cache && typeof cache === 'object' ? (cache[to] as TranslatedFields | undefined) : undefined;
  if (!entry || typeof entry.title !== 'string' || typeof entry.content_html !== 'string') return null;
  return entry;
}

function applyTranslation(row: CMSContent, fields: TranslatedFields): CMSContent {
  return { ...row, title: fields.title, content_html: fields.content_html };
}

/**
 * Serve a CMS row in the reader's language.
 *
 * Admins author in whichever language suits them; the other one is produced
 * once by machine translation and cached on the row, so the marketing site and
 * the CMS pages read natively in both. `translateMissing: false` keeps public
 * reads instant — the fill-in happens on a background pass.
 */
export async function localizeCmsRow(
  row: CMSContent,
  to: CmsLang,
  opts: { translateMissing?: boolean } = {}
): Promise<CMSContent> {
  const source = normalizeCmsLang(row.source_lang);
  if (source === to) return row;

  const cached = readCache(row, to);
  if (cached) return applyTranslation(row, cached);

  if (!opts.translateMissing || !config.features.ai) return row;

  try {
    const [title, body] = await Promise.all([
      translateBody(row.title, to),
      translateBody(row.content_html, to),
    ]);
    if (!body) return row;

    const fields: TranslatedFields = {
      title: title?.text ?? row.title,
      content_html: body.text,
    };
    const cache = (row.content_i18n as Record<string, unknown> | null) ?? {};
    await prisma.cMSContent.update({
      where: { id: row.id },
      data: { content_i18n: { ...cache, [to]: fields } as never },
    });
    logger.info({ slug: row.slug, to }, 'Cached CMS translation');
    return applyTranslation(row, fields);
  } catch (err) {
    logger.warn({ err, slug: row.slug, to }, 'Failed to translate CMS content');
    return row;
  }
}

export async function localizeCmsRows(
  rows: CMSContent[],
  to: CmsLang,
  opts: { translateMissing?: boolean } = {}
): Promise<CMSContent[]> {
  return Promise.all(rows.map((r) => localizeCmsRow(r, to, opts)));
}

/**
 * Fill in any missing translations, one row at a time.
 *
 * Public reads never wait on an AI call: they serve the cache when it is warm
 * and the source language otherwise. This is what warms it — fired after an
 * admin saves, and available as a scheduled sweep.
 */
export async function backfillCmsTranslations(
  opts: { slug?: string; limit?: number } = {}
): Promise<{ translated: number; skipped: number }> {
  if (!config.features.ai) return { translated: 0, skipped: 0 };

  const rows = await prisma.cMSContent.findMany({
    where: opts.slug ? { slug: opts.slug } : {},
    orderBy: { updated_at: 'desc' },
    take: opts.limit ?? 40,
  });

  let translated = 0;
  let skipped = 0;
  for (const row of rows) {
    const source = normalizeCmsLang(row.source_lang);
    const target: CmsLang = source === 'id' ? 'en' : 'id';
    if (readCache(row, target)) {
      skipped += 1;
      continue;
    }
    const before = row.content_html;
    const after = await localizeCmsRow(row, target, { translateMissing: true });
    if (after.content_html !== before) translated += 1;
    else skipped += 1;
  }
  return { translated, skipped };
}
