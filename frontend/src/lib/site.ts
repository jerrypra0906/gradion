/** Public branding and URLs for Gradion (see docs/PRD Gradion.docx). */

export const defaultSiteUrl = 'https://gradion.org';

export const siteUrl =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) || defaultSiteUrl;

export const siteName = process.env.NEXT_PUBLIC_APP_NAME || 'Gradion';

/** Support contact shown in marketing / legal pages */
export const supportEmail = 'support@gradion.org';

/** Former product name — SEO / structured data only */
export const legacyAlternateName = 'Langkah Kecil';
