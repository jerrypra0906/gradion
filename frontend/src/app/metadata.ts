import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export function generateHomeMetadata(): Metadata {
  const title = `${siteName} — ABA & autism support platform`;
  const description =
    'Structured ABA workflows, therapist & consultant collaboration, AI session validation, and Knowledge Hub for families in Indonesia. Recovery is possible.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName,
      images: [
        {
          url: `${siteUrl}/gradion-logo.svg`,
          width: 1200,
          height: 630,
          alt: `${siteName} — ABA & autism support`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/gradion-logo.svg`],
    },
    alternates: {
      canonical: siteUrl,
    },
  };
}
