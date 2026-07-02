import { prisma } from './dist/lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

const LANDING_CMS_VERSION = 1;

function serializeSection(slug: string, data: unknown) {
  return JSON.stringify({ version: LANDING_CMS_VERSION, section: slug, data }, null, 2);
}

const landingPageSections = [
  {
    slug: 'landing-nav',
    title: 'Navigation',
    data: {
      links: [
        { href: '/#features', label: 'Fitur' },
        { href: '/#pricing', label: 'Harga' },
        { href: '/resources', label: 'Knowledge Hub' },
      ],
      loginLabel: 'Masuk',
      registerLabel: 'Daftar Gratis',
      mobileRegisterLabel: 'Daftar',
    },
  },
  {
    slug: 'hero',
    title: 'Hero Section',
    data: {
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
  },
  {
    slug: 'features',
    title: 'Features Section',
    data: {
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
  },
  {
    slug: 'why-different',
    title: 'Family Values Section',
    data: {
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
  },
  {
    slug: 'pricing',
    title: 'Pricing Section',
    data: {
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
          price: 0,
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
          price: 0,
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
  },
  {
    slug: 'moments-cta',
    title: 'Moments CTA',
    data: {
      title: 'Setiap momen kecil adalah kemenangan besar',
      body: 'Gradion membantu keluarga melacak, merayakan, dan memahami setiap langkah perkembangan anak — dengan data yang dapat dipertanggungjawabkan secara klinis.',
    },
  },
  {
    slug: 'success-stories',
    title: 'Testimonials',
    data: {
      title: 'Kisah dari keluarga nyata',
      testimonials: [
        {
          quote:
            'Dengan Gradion, saya bisa melihat perkembangan anak saya setiap hari. Sangat membantu untuk komunikasi dengan terapis.',
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
  },
  {
    slug: 'faq',
    title: 'FAQ Section',
    data: {
      title: 'Pertanyaan yang sering diajukan',
      items: [
        {
          question: 'Apakah Gradion gratis?',
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
          question: 'Bisakah saya menggunakan Gradion di mobile?',
          answer:
            'Ya, platform dapat diakses melalui browser mobile dan dirancang responsif untuk pengalaman yang optimal di berbagai perangkat.',
        },
      ],
    },
  },
  {
    slug: 'steps',
    title: 'Getting Started Steps',
    data: {
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
  },
  {
    slug: 'footer',
    title: 'Footer',
    data: {
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
  },
];

async function main() {
  console.log('Seeding landing page CMS content...');

  for (const section of landingPageSections) {
    try {
      const content_html = serializeSection(section.slug, section.data);
      const existing = await prisma.cMSContent.findUnique({
        where: { slug: section.slug },
      });

      if (existing) {
        await prisma.cMSContent.update({
          where: { slug: section.slug },
          data: {
            title: section.title,
            content_html,
            status: 'published',
            updated_at: new Date(),
          },
        });
        console.log(`✓ Updated: ${section.title} (${section.slug})`);
      } else {
        await prisma.cMSContent.create({
          data: {
            slug: section.slug,
            title: section.title,
            content_html,
            status: 'published',
            updated_at: new Date(),
          },
        });
        console.log(`✓ Created: ${section.title} (${section.slug})`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${section.slug}:`, error);
    }
  }

  console.log('\nLanding page CMS content seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
