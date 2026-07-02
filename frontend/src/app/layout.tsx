import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { AdSenseScript } from '@/components/ads';
import { siteUrl, siteName } from '@/lib/site';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['600', '700', '800'],
});
const defaultTitle = 'Gradion — Platform ABA & Pendampingan Autisme untuk Keluarga Indonesia';
const defaultDescription =
  'Gradion (evolusi Langkah Kecil) mendukung anak dengan ASD melalui mesin ABA terstruktur, kolaborasi terapis & konsultan, validasi video berbasis AI, Knowledge Hub, dan analytics. Recovery is possible.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    'Gradion',
    'gradion',
    // Indonesian keywords (primary)
    'langkah kecil',
    'langkahkecil',
    'autisme',
    'pelacakan autisme',
    'perkembangan autisme',
    'anak autisme',
    'terapi autisme',
    'platform autisme indonesia',
    'aplikasi autisme',
    'terapi anak autisme',
    'ABA',
    'applied behavior analysis',
    'konsultan ABA',
    'validasi video AI',
    'Knowledge Hub autisme',
    // English keywords
    'autism',
    'ASD',
    'autism spectrum disorder',
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
  authors: [{ name: 'Gradion Team' }],
  creator: 'Gradion',
  publisher: 'Gradion',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    alternateLocale: ['en_US'],
    url: siteUrl,
    siteName: siteName,
    title: 'Gradion — Platform ABA & Pendampingan Autisme',
    description:
      'Pelacakan berbasis ABA, kolaborasi klinis, validasi sesi dengan AI, dan Knowledge Hub untuk keluarga di Indonesia.',
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    creator: '@gradion',
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
  alternates: {
    canonical: siteUrl,
    languages: {
      'en-US': siteUrl,
      'id-ID': `${siteUrl}/id`,
    },
  },
  verification: {
    // Add your verification codes here when available from:
    // - Google Search Console: https://search.google.com/search-console
    // - Yandex Webmaster: https://webmaster.yandex.com
    // - Yahoo Site Explorer: https://siteexplorer.search.yahoo.com
    // Example format:
    // google: 'abc123def456',
    // yandex: 'abc123def456',
    // yahoo: 'abc123def456',
  },
  category: 'Health & Wellness',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const adSensePublisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

  return (
    <html lang="en">
      <body className={`${inter.className} ${montserrat.variable}`}>
        {/* Google Analytics */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        
        {/* Google AdSense */}
        {adSensePublisherId && (
          <AdSenseScript publisherId={adSensePublisherId} />
        )}
        
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

