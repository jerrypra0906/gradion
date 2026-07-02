import { CMSContent } from '@/lib/api';
import { siteName } from '@/lib/site';

export const LANDING_CMS_VERSION = 1;

export const LANDING_SECTION_SLUGS = [
  'landing-nav',
  'hero',
  'features',
  'why-different',
  'pricing',
  'moments-cta',
  'success-stories',
  'faq',
  'steps',
  'footer',
] as const;

export type LandingSectionSlug = (typeof LANDING_SECTION_SLUGS)[number];

export interface LandingNavLink {
  href: string;
  label: string;
}

export interface LandingNavContent {
  links: LandingNavLink[];
  loginLabel: string;
  registerLabel: string;
  mobileRegisterLabel: string;
}

export interface LandingTrustBadge {
  label: string;
  sub: string;
}

export interface LandingCta {
  label: string;
  href: string;
}

export interface HeroContent {
  badge: string;
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  primaryCta: LandingCta;
  secondaryCta: LandingCta;
  trustBadges: LandingTrustBadge[];
}

export interface FeatureItem {
  title: string;
  description: string;
}

export interface FeaturesContent {
  title: string;
  subtitle: string;
  features: FeatureItem[];
}

export interface ValueCard {
  title: string;
  description: string;
}

export interface FamilyValuesContent {
  title: string;
  subtitle: string;
  cards: ValueCard[];
}

export interface PricingPlanContent {
  id: string;
  subscriptionKey?: 'free' | 'pro' | 'premium' | 'therapist' | '';
  name: string;
  tagline: string;
  badge?: string;
  /** If null, pricing is resolved from subscription settings (if linked) */
  price: number | null;
  periodLabel: string;
  features: string[];
  ctaLabel: string;
  ctaLabelAuthenticated?: string;
  checkoutPlan?: string;
  highlighted?: boolean;
  style: 'light' | 'dark';
}

export interface PricingContent {
  title: string;
  subtitle: string;
  plans: PricingPlanContent[];
}

export interface MomentsCtaContent {
  title: string;
  body: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
}

export interface TestimonialsContent {
  title: string;
  testimonials: TestimonialItem[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  title: string;
  items: FaqItem[];
}

export interface StepItem {
  title: string;
  description: string;
}

export interface StepsContent {
  title: string;
  subtitle: string;
  steps: StepItem[];
  cta: LandingCta;
}

export interface FooterLinkGroup {
  title: string;
  links: LandingNavLink[];
}

export interface FooterContent {
  ctaTitle: string;
  cta: LandingCta;
  tagline: string;
  linkGroups: FooterLinkGroup[];
  copyright: string;
}

export type LandingSectionContentMap = {
  'landing-nav': LandingNavContent;
  hero: HeroContent;
  features: FeaturesContent;
  'why-different': FamilyValuesContent;
  pricing: PricingContent;
  'moments-cta': MomentsCtaContent;
  'success-stories': TestimonialsContent;
  faq: FaqContent;
  steps: StepsContent;
  footer: FooterContent;
};

export interface LandingSectionMeta {
  slug: LandingSectionSlug;
  title: string;
  description: string;
}

export const LANDING_SECTIONS: LandingSectionMeta[] = [
  {
    slug: 'landing-nav',
    title: 'Navigation',
    description: 'Top navigation links and auth buttons',
  },
  {
    slug: 'hero',
    title: 'Hero Section',
    description: 'Main headline, pitch, and call-to-action buttons',
  },
  {
    slug: 'features',
    title: 'Features Section',
    description: 'Feature grid title and feature cards',
  },
  {
    slug: 'why-different',
    title: 'Family Values Section',
    description: 'Why families choose Gradion — value cards',
  },
  {
    slug: 'pricing',
    title: 'Pricing Section',
    description: 'Pricing headings, plan types, prices, and feature bullets',
  },
  {
    slug: 'moments-cta',
    title: 'Moments CTA',
    description: 'Mid-page motivational callout',
  },
  {
    slug: 'success-stories',
    title: 'Testimonials',
    description: 'Quotes from families, therapists, and consultants',
  },
  {
    slug: 'faq',
    title: 'FAQ Section',
    description: 'Frequently asked questions and answers',
  },
  {
    slug: 'steps',
    title: 'Getting Started Steps',
    description: 'Three-step onboarding guide and CTA',
  },
  {
    slug: 'footer',
    title: 'Footer',
    description: 'Footer CTA, tagline, links, and copyright',
  },
];

export const LANDING_SECTION_DEFAULTS: LandingSectionContentMap = {
  'landing-nav': {
    links: [
      { href: '/#features', label: 'Fitur' },
      { href: '/#pricing', label: 'Harga' },
      { href: '/resources', label: 'Knowledge Hub' },
    ],
    loginLabel: 'Masuk',
    registerLabel: 'Daftar Gratis',
    mobileRegisterLabel: 'Daftar',
  },
  hero: {
    badge: 'Platform ABA No. 1 di Indonesia',
    headline: 'Recovery is',
    headlineHighlight: 'possible.',
    subtitle:
      'Platform ABA berintensitas tinggi untuk keluarga di Indonesia — pelacakan perilaku, kolaborasi terapis & konsultan, validasi sesi rumah dengan AI, dan ringkasan perkembangan.',
    primaryCta: { label: 'Mulai Gratis Sekarang', href: '/register' },
    secondaryCta: { label: 'Lihat Demo', href: '/#features' },
    trustBadges: [
      { label: 'Berbasis ABA', sub: 'Protokol klinis' },
      { label: 'Kolaborasi', sub: 'Orang tua & terapis' },
      { label: 'AI & Laporan', sub: 'Insight berbasis data' },
    ],
  },
  features: {
    title: 'Semua yang Anda butuhkan dalam satu platform',
    subtitle:
      'Platform lengkap untuk melacak dan mendukung perkembangan anak dengan autisme',
    features: [
      {
        title: 'Pelacakan ABA',
        description:
          'Catat perilaku, tujuan, dan sesi dengan protokol ABA yang jelas setiap hari.',
      },
      {
        title: 'Terapis & Komunitas',
        description:
          'Kolaborasi dengan terapis dan konsultan ABA dalam satu alur kerja terstruktur.',
      },
      {
        title: 'Ringkasan AI',
        description:
          'Insight perkembangan berbasis data dan ringkasan AI sesuai paket langganan.',
      },
      {
        title: 'Knowledge Hub',
        description:
          'Akses artikel edukatif dan sumber daya untuk mendukung perjalanan keluarga.',
      },
      {
        title: 'Layanan Lisensi',
        description:
          'Keamanan data, privasi anak, dan kontrol akses sebagai fondasi platform.',
      },
      {
        title: 'Jadwal & Pengingat',
        description:
          'Kelola sesi terapi, pengingat, dan aktivitas harian tanpa ketinggalan.',
      },
    ],
  },
  'why-different': {
    title: 'Bukan hanya Anda & buah hati',
    subtitle:
      'Gradion hadir untuk mendukung perjalanan keluarga dengan pendekatan ABA yang hangat dan terstruktur.',
    cards: [
      {
        title: 'Anda tidak sendirian',
        description:
          'Setiap keluarga memiliki perjalanan unik. Gradion memberikan alat dan dukungan agar Anda merasa didampingi di setiap langkah.',
      },
      {
        title: 'Setiap kemajuan berarti',
        description:
          'Rayakan momen kecil — dari sesi terapi rumah hingga pencapaian tujuan klinis yang terukur.',
      },
      {
        title: 'Kolaborasi yang bermakna',
        description:
          'Orang tua, terapis, dan konsultan ABA bekerja bersama dengan visibilitas kemajuan yang sama.',
      },
    ],
  },
  pricing: {
    title: 'Pilih paket yang tepat untuk Anda',
    subtitle: 'Mulai gratis, lalu tingkatkan saat Anda siap untuk fitur lengkap',
    plans: [
      {
        id: 'free',
        subscriptionKey: 'free',
        name: 'Gratis',
        tagline: 'Untuk memulai',
        price: 0,
        periodLabel: '',
        features: ['Pelacakan dasar', 'Kolaborasi terapis', 'Laporan dasar'],
        ctaLabel: 'Mulai Gratis',
        style: 'light',
        highlighted: false,
      },
      {
        id: 'pro',
        subscriptionKey: 'pro',
        name: 'Pro',
        tagline: 'Paling banyak dipilih',
        badge: 'Populer',
        price: null,
        periodLabel: '',
        features: [
          'Semua fitur Gratis',
          'AI Summary ({{monthlyTokenLimit}} token/bulan)',
          'Laporan lanjutan',
        ],
        ctaLabel: 'Pilih Paket',
        ctaLabelAuthenticated: 'Upgrade ke Pro',
        checkoutPlan: 'pro',
        style: 'dark',
        highlighted: true,
      },
      {
        id: 'premium',
        subscriptionKey: 'premium',
        name: 'Premium',
        tagline: 'Untuk kebutuhan lengkap',
        price: null,
        periodLabel: '',
        features: [
          'Semua fitur Pro',
          'AI Summary ({{monthlyTokenLimit}} token/bulan)',
          'Prioritas support',
        ],
        ctaLabel: 'Hubungi Kami',
        ctaLabelAuthenticated: 'Upgrade ke Premium',
        checkoutPlan: 'premium',
        style: 'dark',
        highlighted: false,
      },
    ],
  },
  'moments-cta': {
    title: 'Setiap momen kecil adalah kemenangan besar',
    body: 'Gradion membantu keluarga melacak, merayakan, dan memahami setiap langkah perkembangan anak — dengan data yang dapat dipertanggungjawabkan secara klinis.',
  },
  'success-stories': {
    title: 'Kisah dari keluarga nyata',
    testimonials: [
      {
        quote: `Dengan ${siteName}, saya bisa melihat perkembangan anak saya setiap hari. Sangat membantu untuk komunikasi dengan terapis.`,
        author: 'Ibu dari anak berusia 5 tahun',
      },
      {
        quote:
          'Platform ini memudahkan saya sebagai terapis untuk melihat apa yang dilakukan orang tua di rumah dan memberikan umpan balik.',
        author: 'Terapis di Jakarta',
      },
      {
        quote:
          'Validasi video dan ringkasan AI membantu kami memastikan terapi rumah berjalan sesuai protokol.',
        author: 'Konsultan ABA',
      },
    ],
  },
  faq: {
    title: 'Pertanyaan yang sering diajukan',
    items: [
      {
        question: `Apakah ${siteName} gratis?`,
        answer:
          'Ya, kami menyediakan paket gratis dengan fitur dasar. Anda juga bisa upgrade ke paket Pro atau Premium untuk fitur yang lebih lengkap termasuk AI Summary.',
      },
      {
        question: 'Bagaimana cara mengundang terapis?',
        answer:
          'Di dashboard, Anda dapat mengundang terapis dengan memasukkan email mereka. Terapis akan menerima email undangan dan dapat mendaftar untuk berkolaborasi dengan Anda.',
      },
      {
        question: 'Apakah data saya aman?',
        answer:
          'Ya, kami mengutamakan privasi dan keamanan data. Semua data dienkripsi dan hanya Anda serta terapis yang diundang yang dapat melihat informasi anak Anda.',
      },
      {
        question: `Bisakah saya menggunakan ${siteName} di mobile?`,
        answer:
          'Ya, platform dapat diakses melalui browser mobile dan dirancang responsif untuk pengalaman yang optimal di berbagai perangkat.',
      },
    ],
  },
  steps: {
    title: 'Mulai dalam 3 langkah mudah',
    subtitle: 'Dari pendaftaran hingga insight perkembangan — semuanya dalam satu platform.',
    steps: [
      {
        title: 'Daftar & buat profil anak',
        description: 'Mulai gratis dalam hitungan menit — tambahkan profil anak dan tujuan awal.',
      },
      {
        title: 'Catat sesi & kolaborasi',
        description: 'Log aktivitas ABA harian dan undang terapis untuk berkolaborasi.',
      },
      {
        title: 'Pantau kemajuan dengan AI',
        description:
          'Lihat laporan, validasi video, dan ringkasan AI untuk keputusan berbasis data.',
      },
    ],
    cta: { label: 'Mulai Sekarang', href: '/register' },
  },
  footer: {
    ctaTitle: 'Siap memulai perjalanan bersama Gradion?',
    cta: { label: 'Mulai Gratis Sekarang', href: '/register' },
    tagline: 'Recovery is possible — structured ABA support for families in Indonesia.',
    linkGroups: [
      {
        title: 'Program',
        links: [
          { href: '/#features', label: 'Fitur' },
          { href: '/#pricing', label: 'Harga' },
          { href: '/resources', label: 'Knowledge Hub' },
        ],
      },
      {
        title: 'Lebih',
        links: [
          { href: '/#faq', label: 'FAQ' },
          { href: '/cms/contact', label: 'Kontak' },
          { href: '/login', label: 'Masuk' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { href: '/cms/privacy', label: 'Kebijakan Privasi' },
          { href: '/cms/terms', label: 'Syarat Layanan' },
        ],
      },
    ],
    copyright: `© ${new Date().getFullYear()} Gradion. All rights reserved.`,
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep<T>(defaults: T, overrides: unknown): T {
  if (overrides === undefined || overrides === null) {
    return defaults;
  }

  if (Array.isArray(defaults)) {
    return (Array.isArray(overrides) ? overrides : defaults) as T;
  }

  if (isPlainObject(defaults) && isPlainObject(overrides)) {
    const result: Record<string, unknown> = { ...defaults };
    for (const key of Object.keys(overrides)) {
      const defaultValue = (defaults as Record<string, unknown>)[key];
      const overrideValue = overrides[key];
      if (defaultValue !== undefined) {
        result[key] = mergeDeep(defaultValue, overrideValue);
      } else {
        result[key] = overrideValue;
      }
    }
    return result as T;
  }

  return overrides as T;
}

type LegacyPricingPlan = {
  name?: string;
  tagline?: string;
  badge?: string;
  features?: string[];
  ctaLabel?: string;
  ctaLabelAuthenticated?: string;
};

function normalizePricingPlan(
  legacy: LegacyPricingPlan | undefined,
  fallback: PricingPlanContent
): PricingPlanContent {
  if (!legacy) return fallback;
  return {
    ...fallback,
    name: legacy.name ?? fallback.name,
    tagline: legacy.tagline ?? fallback.tagline,
    badge: legacy.badge ?? fallback.badge,
    features: Array.isArray(legacy.features) ? legacy.features : fallback.features,
    ctaLabel: legacy.ctaLabel ?? fallback.ctaLabel,
    ctaLabelAuthenticated: legacy.ctaLabelAuthenticated ?? fallback.ctaLabelAuthenticated,
  };
}

export function normalizePricingContent(data: unknown, defaults: PricingContent): PricingContent {
  if (!isPlainObject(data)) {
    return defaults;
  }

  const title = typeof data.title === 'string' ? data.title : defaults.title;
  const subtitle = typeof data.subtitle === 'string' ? data.subtitle : defaults.subtitle;

  if (Array.isArray(data.plans) && data.plans.length > 0) {
    const plans = data.plans
      .filter((plan): plan is Record<string, unknown> => isPlainObject(plan))
      .map((plan, index) => {
        const fallback = defaults.plans[index] ?? defaults.plans[defaults.plans.length - 1];
        const price =
          plan.price === null || plan.price === undefined
            ? fallback.price
            : typeof plan.price === 'number'
              ? plan.price
              : fallback.price;
        return {
          id: typeof plan.id === 'string' ? plan.id : fallback.id,
          subscriptionKey:
            plan.subscriptionKey === 'free' ||
            plan.subscriptionKey === 'pro' ||
            plan.subscriptionKey === 'premium' ||
            plan.subscriptionKey === 'therapist' ||
            plan.subscriptionKey === ''
              ? plan.subscriptionKey
              : fallback.subscriptionKey,
          name: typeof plan.name === 'string' ? plan.name : fallback.name,
          tagline: typeof plan.tagline === 'string' ? plan.tagline : fallback.tagline,
          badge: typeof plan.badge === 'string' ? plan.badge : fallback.badge,
          price,
          periodLabel:
            typeof plan.periodLabel === 'string' ? plan.periodLabel : fallback.periodLabel,
          features: Array.isArray(plan.features)
            ? plan.features.filter((item): item is string => typeof item === 'string')
            : fallback.features,
          ctaLabel: typeof plan.ctaLabel === 'string' ? plan.ctaLabel : fallback.ctaLabel,
          ctaLabelAuthenticated:
            typeof plan.ctaLabelAuthenticated === 'string'
              ? plan.ctaLabelAuthenticated
              : fallback.ctaLabelAuthenticated,
          checkoutPlan:
            typeof plan.checkoutPlan === 'string' ? plan.checkoutPlan : fallback.checkoutPlan,
          highlighted:
            typeof plan.highlighted === 'boolean' ? plan.highlighted : fallback.highlighted,
          style: plan.style === 'light' || plan.style === 'dark' ? plan.style : fallback.style,
        } satisfies PricingPlanContent;
      });

    return { title, subtitle, plans };
  }

  if ('free' in data || 'pro' in data || 'premium' in data) {
    const legacy = data as {
      free?: LegacyPricingPlan;
      pro?: LegacyPricingPlan;
      premium?: LegacyPricingPlan;
    };
    return {
      title,
      subtitle,
      plans: [
        normalizePricingPlan(legacy.free, defaults.plans[0]),
        normalizePricingPlan(legacy.pro, defaults.plans[1] ?? defaults.plans[0]),
        normalizePricingPlan(legacy.premium, defaults.plans[2] ?? defaults.plans[0]),
      ],
    };
  }

  return defaults;
}

export function serializeLandingSection<S extends LandingSectionSlug>(
  slug: S,
  data: LandingSectionContentMap[S]
): string {
  return JSON.stringify(
    {
      version: LANDING_CMS_VERSION,
      section: slug,
      data,
    },
    null,
    2
  );
}

export function parseLandingSection<S extends LandingSectionSlug>(
  slug: S,
  cms: CMSContent | null | undefined
): LandingSectionContentMap[S] {
  const defaults = LANDING_SECTION_DEFAULTS[slug];

  if (!cms?.content_html?.trim()) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(cms.content_html) as {
      version?: number;
      section?: string;
      data?: unknown;
    };

    if (parsed.version === LANDING_CMS_VERSION && parsed.section === slug && parsed.data) {
      if (slug === 'pricing') {
        return normalizePricingContent(parsed.data, defaults as PricingContent) as LandingSectionContentMap[S];
      }
      return mergeDeep(defaults, parsed.data);
    }
  } catch {
    // Legacy HTML content — fall back to component defaults
  }

  return defaults;
}

export function isLandingSectionSlug(slug: string): slug is LandingSectionSlug {
  return (LANDING_SECTION_SLUGS as readonly string[]).includes(slug);
}

export function applyTemplate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}
