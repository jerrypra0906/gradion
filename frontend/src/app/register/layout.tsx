import type { Metadata } from 'next';
import { siteUrl, siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Daftar',
  description: `Buat akun ${siteName} gratis — dukungan ABA terstruktur, kolaborasi, dan Knowledge Hub. Mulai dengan paket gratis kapan saja.`,
  openGraph: {
    title: `Daftar | ${siteName}`,
    description: `Buat akun ${siteName} gratis untuk memulai.`,
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
