import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Knowledge Hub & CMS content',
  description: `Browse guides and articles published on ${siteName} — ABA-aligned resources for families and professionals.`,
  openGraph: {
    title: `Resources & Information | ${siteName}`,
    description: `Browse guides and resources on ${siteName}.`,
    url: `${siteUrl}/cms`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
