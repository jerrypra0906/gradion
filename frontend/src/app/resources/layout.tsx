import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: `Knowledge Hub — ${siteName}`,
  description: `Educational resources and articles (Knowledge Hub) about autism, ABA, therapy techniques, and supporting your child with ASD — ${siteName}.`,
  keywords: [
    'Gradion',
    'Knowledge Hub',
    'sumber daya autisme',
    'artikel autisme',
    'ABA',
    'autism resources',
    'autism articles',
    'Indonesia',
  ],
  openGraph: {
    title: `Knowledge Hub | ${siteName}`,
    description:
      'Articles and guides about autism, ABA-aligned practice, and child development for families and clinicians.',
    type: 'website',
    locale: 'id_ID',
    alternateLocale: ['en_US'],
    url: `${siteUrl}/resources`,
    siteName,
    images: [
      {
        url: `${siteUrl}/gradion-logo.svg`,
        width: 1200,
        height: 630,
        alt: `${siteName} Knowledge Hub`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Knowledge Hub | ${siteName}`,
    description: 'Articles and guides about autism, ABA, and family support.',
    images: [`${siteUrl}/gradion-logo.svg`],
  },
  alternates: {
    canonical: `${siteUrl}/resources`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
