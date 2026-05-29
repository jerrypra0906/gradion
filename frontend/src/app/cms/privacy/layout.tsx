import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: `Privacy Policy — ${siteName}`,
  description: `${siteName} privacy policy — how we collect, use, and protect your information for our ABA and autism support platform.`,
  keywords: ['Gradion', 'privacy policy', 'data protection', 'autism platform'],
  openGraph: {
    title: `Privacy Policy | ${siteName}`,
    description: `How ${siteName} protects your privacy and data.`,
    type: 'website',
    locale: 'id_ID',
    alternateLocale: ['en_US'],
    url: `${siteUrl}/cms/privacy`,
    siteName,
    images: [
      {
        url: `${siteUrl}/gradion-logo.svg`,
        width: 1200,
        height: 630,
        alt: `${siteName} privacy`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Privacy Policy | ${siteName}`,
    description: `How ${siteName} protects your data.`,
    images: [`${siteUrl}/gradion-logo.svg`],
  },
  alternates: {
    canonical: `${siteUrl}/cms/privacy`,
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

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
