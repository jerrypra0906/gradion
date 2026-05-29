import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Create Account',
  description: `Create your free ${siteName} account — structured ABA support, collaboration, and Knowledge Hub. Start with a free plan and upgrade anytime.`,
  openGraph: {
    title: `Create Account | ${siteName}`,
    description: `Create your free ${siteName} account to get started.`,
    url: `${siteUrl}/register`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
