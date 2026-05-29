import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Article',
  description: `${siteName} article — resources about autism, ABA, therapy, and supporting children with ASD.`,
  openGraph: {
    title: `Content | ${siteName}`,
    description: `Articles and resources on ${siteName}.`,
    url: siteUrl,
    siteName,
    images: [
      {
        url: `${siteUrl}/gradion-logo.svg`,
        width: 1200,
        height: 630,
        alt: `${siteName} article`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Content | ${siteName}`,
    description: `Articles and resources on ${siteName}.`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CMSArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
