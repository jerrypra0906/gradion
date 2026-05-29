import { legacyAlternateName, siteUrl } from '@/lib/site';

export function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Gradion',
    alternateName: legacyAlternateName,
    url: siteUrl,
    logo: `${siteUrl}/gradion-logo.svg`,
    description:
      'Gradion supports families in Indonesia with structured ABA workflows, AI-assisted session validation, clinical collaboration, CMS-driven Knowledge Hub, and analytics for children with Autism Spectrum Disorder (ASD).',
    sameAs: [
      // Add your social media links here when available
      // e.g. `https://facebook.com/gradion`
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['Indonesian', 'English'],
    },
    areaServed: {
      '@type': 'Country',
      name: 'Indonesia',
    },
  };

  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Gradion',
    url: siteUrl,
    description:
      'Platform ABA, validasi video berbasis AI, Knowledge Hub, dan analytics untuk anak dengan Autism Spectrum Disorder (ASD) di Indonesia.',
    inLanguage: ['id-ID', 'en-US'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/cms?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
    </>
  );
}
