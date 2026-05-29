import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: `Terms of Service — ${siteName}`,
  description: `${siteName} terms — accounts, subscriptions, acceptable use, and payments for our ABA platform.`,
  keywords: ['Gradion', 'terms of service', 'user agreement', 'ABA platform'],
  openGraph: {
    title: `Terms of Service | ${siteName}`,
    description: `Terms and conditions for using ${siteName}.`,
    type: 'website',
    locale: 'id_ID',
    alternateLocale: ['en_US'],
    url: `${siteUrl}/cms/terms`,
    siteName,
    images: [
      {
        url: `${siteUrl}/gradion-logo.svg`,
        width: 1200,
        height: 630,
        alt: `${siteName} terms`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Terms of Service | ${siteName}`,
    description: `Terms for using ${siteName}.`,
    images: [`${siteUrl}/gradion-logo.svg`],
  },
  alternates: {
    canonical: `${siteUrl}/cms/terms`,
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

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
