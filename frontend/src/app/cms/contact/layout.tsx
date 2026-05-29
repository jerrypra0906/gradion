import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: `Contact — ${siteName}`,
  description: `Contact ${siteName} for account help, partnerships, or feedback. Support hours Monday–Friday, 09:00–17:00 WIB.`,
  keywords: ['Gradion', 'contact', 'support', 'ABA platform Indonesia', 'autism platform'],
  openGraph: {
    title: `Contact | ${siteName}`,
    description: `Contact ${siteName} for support or partnerships.`,
    type: 'website',
    locale: 'id_ID',
    alternateLocale: ['en_US'],
    url: `${siteUrl}/cms/contact`,
    siteName,
    images: [
      {
        url: `${siteUrl}/gradion-logo.svg`,
        width: 1200,
        height: 630,
        alt: `Contact ${siteName}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Contact | ${siteName}`,
    description: `Contact ${siteName}.`,
    images: [`${siteUrl}/gradion-logo.svg`],
  },
  alternates: {
    canonical: `${siteUrl}/cms/contact`,
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

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
