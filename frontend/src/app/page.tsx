import { Metadata } from 'next';
import { HomePageContent } from '@/components/landing/HomePageContent';

// Server-side metadata for SEO
export const metadata: Metadata = {
  title: 'Gradion — Platform ABA & Pendampingan Autisme untuk Keluarga Indonesia',
  description:
    'Gradion (evolusi Langkah Kecil) mendukung anak dengan Autism Spectrum Disorder (ASD) melalui pelacakan aktivitas berbasis ABA, kolaborasi terapis/konsultan, ringkasan AI, dan Knowledge Hub. Recovery is possible.',
  keywords: [
    'Gradion',
    'gradion',
    // Indonesian keywords
    'langkah kecil',
    'langkahkecil',
    'autisme',
    'autism',
    'ASD',
    'autism spectrum disorder',
    'pelacakan autisme',
    'perkembangan autisme',
    'anak autisme',
    'terapi autisme',
    'platform autisme indonesia',
    'aplikasi autisme',
    // English keywords
    'autism progress tracker',
    'progress tracker',
    'therapy tracking',
    'autism therapy',
    'child development',
    'therapist collaboration',
    'autism support',
    'parent resources',
    'autism tools',
    'Indonesia',
    'autism Indonesia',
  ],
  openGraph: {
    title: 'Gradion — Platform ABA & Pendampingan Autisme',
    description:
      'Pelacakan perkembangan berbasis ABA, kolaborasi klinis, dan sumber daya untuk keluarga di Indonesia.',
    type: 'website',
    locale: 'id_ID',
    alternateLocale: ['en_US'],
    url: 'https://gradion.org',
    siteName: 'Gradion',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gradion — Platform ABA & Pendampingan Autisme',
    description:
      'Pelacakan perkembangan berbasis ABA, kolaborasi klinis, dan sumber daya untuk keluarga di Indonesia.',
  },
  alternates: {
    canonical: 'https://gradion.org',
  },
};

export default function Home() {
  return <HomePageContent />;
}
