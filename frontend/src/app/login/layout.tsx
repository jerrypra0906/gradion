import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Masuk',
  description: `Masuk ke akun ${siteName} Anda untuk melacak perkembangan, berkolaborasi dengan terapis, dan menggunakan fitur berbasis AI.`,
  openGraph: {
    title: `Masuk | ${siteName}`,
    description: `Masuk ke akun ${siteName} Anda.`,
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
