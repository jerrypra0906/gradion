import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Sign In',
  description: `Sign in to your ${siteName} account to track progress, collaborate with therapists and consultants, and use AI-assisted tools.`,
  openGraph: {
    title: `Sign In | ${siteName}`,
    description: `Sign in to your ${siteName} account.`,
    url: `${siteUrl}/login`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
