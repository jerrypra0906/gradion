'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/layout/Footer';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';
import DOMPurify from 'isomorphic-dompurify';
import { VideoPlayer } from '@/components/landing/VideoPlayer';
import { StructuredData } from '@/components/landing/StructuredData';
import { ResponsiveAd } from '@/components/ads';
import { siteName } from '@/lib/site';

interface AvailablePlan {
  weeks: number;
  aiAccess: boolean;
  monthlyTokenLimit: number;
  price: number;
}

interface AvailablePlans {
  free: AvailablePlan;
  pro: AvailablePlan;
  premium: AvailablePlan;
  therapist?: AvailablePlan;
}

export function HomePageContent() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [plans, setPlans] = useState<AvailablePlans | null>(null);
  const [cmsContent, setCmsContent] = useState<{
    hero: CMSContent | null;
    'vision-mission': CMSContent | null;
    features: CMSContent | null;
    'why-different': CMSContent | null;
    'success-stories': CMSContent | null;
    faq: CMSContent | null;
  }>({
    hero: null,
    'vision-mission': null,
    features: null,
    'why-different': null,
    'success-stories': null,
    faq: null,
  });
  const [resources, setResources] = useState<CMSContent[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingCMS, setLoadingCMS] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);

  useEffect(() => {
    fetchPlans();
    fetchCMSContent();
    fetchResources();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await apiClient.get<ApiResponse<AvailablePlans>>('/subscriptions/plans');
      if (response.data.success && response.data.data) {
        setPlans(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchCMSContent = async () => {
    try {
      setLoadingCMS(true);
      // Fetch all landing page CMS content
      const slugs = ['hero', 'vision-mission', 'features', 'why-different', 'success-stories', 'faq'];
      const promises = slugs.map((slug) =>
        apiClient.get<ApiResponse<CMSContent>>(`/cms/${slug}`).catch(() => null)
      );

      const results = await Promise.all(promises);
      const content: typeof cmsContent = {
        hero: null,
        'vision-mission': null,
        features: null,
        'why-different': null,
        'success-stories': null,
        faq: null,
      };

      results.forEach((response, index) => {
        if (response?.data.success && response.data.data) {
          const slug = slugs[index] as keyof typeof content;
          content[slug] = response.data.data;
        }
      });

      setCmsContent(content);
    } catch (err) {
      console.error('Failed to fetch CMS content:', err);
    } finally {
      setLoadingCMS(false);
    }
  };

  const fetchResources = async () => {
    try {
      setLoadingResources(true);
      const response = await apiClient.get<ApiResponse<CMSContent[]>>('/cms/resources');
      if (response.data.success && response.data.data) {
        setResources(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatWeeks = (weeks: number) => {
    if (weeks === 1) return '1 minggu';
    if (weeks === 4) return '1 bulan';
    if (weeks === 12) return '3 bulan';
    if (weeks === 52) return '1 tahun';
    return `${weeks} minggu`;
  };

  return (
    <>
      <StructuredData />
      <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-blue-600">{siteName}</span>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/resources" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                Knowledge Hub
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Button
                    onClick={() => {
                      logout();
                      router.push('/');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Daftar Gratis</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              {siteName}
              <span className="block text-blue-600 mt-2">Recovery is possible</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Platform ABA berintensitas tinggi untuk keluarga di Indonesia: pelacakan perilaku, kolaborasi
              terapis &amp; konsultan, validasi sesi rumah dengan AI, Knowledge Hub, dan ringkasan perkembangan.
            </p>
            {loadingCMS && !cmsContent.hero ? (
              <div className="h-64 bg-gray-200 animate-pulse rounded-lg max-w-4xl mx-auto mb-8"></div>
            ) : cmsContent.hero?.content_html ? (
              <div
                className="prose prose-lg max-w-4xl mx-auto mb-8"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(cmsContent.hero.content_html),
                }}
              />
            ) : null}
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Mulai Gratis
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ad: After Hero Section (only for non-authenticated users) */}
      {!isAuthenticated && process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ResponsiveAd
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE}
            placement="header"
          />
        </div>
      )}

      {/* Vision and Mission Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Visi & Misi
            </h2>
            {loadingCMS && !cmsContent['vision-mission'] ? (
              <div className="h-64 bg-gray-200 animate-pulse rounded-lg max-w-4xl mx-auto"></div>
            ) : cmsContent['vision-mission']?.content_html ? (
              <div
                className="prose prose-lg max-w-4xl mx-auto"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(cmsContent['vision-mission'].content_html),
                }}
              />
            ) : (
              <div className="max-w-4xl mx-auto text-left">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Visi</h3>
                    <p className="text-gray-600">
                      Menjadi platform ABA dan pendampingan autisme terdepan di Indonesia—menghubungkan orang tua,
                      terapis, dan konsultan dengan alat yang terstruktur dan dapat dipertanggungjawabkan secara klinis.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Misi</h3>
                    <ul className="text-gray-600 space-y-2 list-disc list-inside">
                      <li>Menyediakan mesin pelacakan berbasis ABA (termasuk logging ABC) yang jelas dan konsisten</li>
                      <li>Memfasilitasi kolaborasi orang tua, terapis, dan konsultan ABA dalam satu alur kerja</li>
                      <li>Membantu kualitas terapi rumah melalui validasi video berbasis AI dan umpan balik yang dapat ditindaklanjuti</li>
                      <li>Menyediakan Knowledge Hub dan analytics agar keluarga mendapat keyakinan dan transparansi data</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Lihat {siteName} dalam aksi
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Pelajari bagaimana {siteName} membantu keluarga menerapkan ABA di rumah, berkolaborasi dengan klinisi,
              dan memahami kemajuan anak secara berkelanjutan.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <VideoPlayer 
              videoId={process.env.NEXT_PUBLIC_VIDEO_YOUTUBE_ID}
              platform="youtube"
              title="Gradion platform overview"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Fitur Utama
            </h2>
            {loadingCMS && !cmsContent.features ? (
              <div className="h-32 bg-gray-200 animate-pulse rounded-lg max-w-3xl mx-auto"></div>
            ) : cmsContent.features?.content_html ? (
              <div
                className="prose prose-lg max-w-3xl mx-auto"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(cmsContent.features.content_html),
                }}
              />
            ) : (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Platform lengkap untuk melacak perkembangan anak dengan autisme
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Pelacakan ABA &amp; aktivitas
              </h3>
              <p className="text-gray-600">
                Catat perilaku, tujuan, dan sesi dengan struktur yang mendukung protokol ABA—mudah digunakan oleh orang
                tua dan terapis.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Terapis &amp; konsultan
              </h3>
              <p className="text-gray-600">
                Kolaborasi dengan terapis dan konsultan ABA: tujuan klinis, tinjauan log, dan visibilitas kemajuan
                dalam satu platform.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI, laporan &amp; Knowledge Hub
              </h3>
              <p className="text-gray-600">
                Ringkasan berbasis AI (sesuai paket), validasi video untuk fidelity terapi rumah, dan sumber belajar
                dari CMS—agar Anda melihat pola dan kemajuan dengan jelas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ad: After Features Section (only for non-authenticated users) */}
      {!isAuthenticated && process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ResponsiveAd
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE}
            placement="inline"
          />
        </div>
      )}

      {/* Why Different Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Mengapa {siteName} berbeda?
            </h2>
            {loadingCMS && !cmsContent['why-different'] ? (
              <div className="h-32 bg-gray-200 animate-pulse rounded-lg max-w-3xl mx-auto"></div>
            ) : cmsContent['why-different']?.content_html ? (
              <div
                className="prose prose-lg max-w-3xl mx-auto"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(cmsContent['why-different'].content_html),
                }}
              />
            ) : (
              <div className="prose prose-lg max-w-3xl mx-auto text-left">
                <p className="text-lg text-gray-600 mb-4">
                  {siteName} menggabungkan inti Langkah Kecil dengan mesin ABA yang lebih terstruktur, peran konsultan,
                  validasi sesi berbasis AI, CMS untuk konten edukatif, dan analytics bagi admin—dirancang untuk pasar
                  Indonesia.
                </p>
                <ul className="list-disc list-inside space-y-3 text-gray-600">
                  <li>Fokus ABA: logging perilaku, tujuan klinis, dan kolaborasi multi-peran</li>
                  <li>Video validation &amp; AI token wallet sesuai paket langganan</li>
                  <li>Knowledge Hub &amp; banner dinamis untuk komunikasi yang relevan</li>
                  <li>Laporan dan insight agar orang tua dan klinisi memutuskan berbasis data</li>
                  <li>Privasi dan keamanan data sebagai fondasi teknis</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pilih Paket yang Tepat untuk Anda
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Mulai dengan paket gratis, atau tingkatkan untuk fitur premium
            </p>
          </div>

          {loadingPlans ? (
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-8 rounded-lg shadow-sm">
                  <div className="h-64 bg-gray-200 animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          ) : plans ? (
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white p-8 rounded-lg shadow-sm border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Gratis</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">Rp 0</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">Pelacakan dasar</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">Kolaborasi dengan terapis</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">Laporan dasar</span>
                  </li>
                </ul>
                {!isAuthenticated && (
                  <Link href="/register" className="block">
                    <Button variant="outline" className="w-full">
                      Mulai Gratis
                    </Button>
                  </Link>
                )}
              </div>

              {/* Pro Plan */}
              <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-blue-500 relative">
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-sm font-semibold rounded-bl-lg">
                  Populer
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plans.pro.price)}
                  </span>
                  <span className="text-gray-600"> / {formatWeeks(plans.pro.weeks)}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">Semua fitur Gratis</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">
                      AI Summary ({plans.pro.monthlyTokenLimit.toLocaleString('id-ID')} token/bulan)
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">Laporan lanjutan</span>
                  </li>
                </ul>
                {!isAuthenticated ? (
                  <Link href="/register" className="block">
                    <Button className="w-full">Daftar Sekarang</Button>
                  </Link>
                ) : (
                  <Link href={`/dashboard/checkout?plan=pro`} className="block">
                    <Button className="w-full">Upgrade ke Pro</Button>
                  </Link>
                )}
              </div>

              {/* Premium Plan */}
              <div className="bg-white p-8 rounded-lg shadow-sm border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plans.premium.price)}
                  </span>
                  <span className="text-gray-600"> / {formatWeeks(plans.premium.weeks)}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">Semua fitur Pro</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">
                      AI Summary ({plans.premium.monthlyTokenLimit.toLocaleString('id-ID')}{' '}
                      token/bulan)
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">Prioritas support</span>
                  </li>
                </ul>
                {!isAuthenticated ? (
                  <Link href="/register" className="block">
                    <Button variant="outline" className="w-full">
                      Daftar Sekarang
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/dashboard/checkout?plan=premium`} className="block">
                    <Button variant="outline" className="w-full">
                      Upgrade ke Premium
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Kisah Sukses
            </h2>
            {loadingCMS && !cmsContent['success-stories'] ? (
              <div className="h-64 bg-gray-200 animate-pulse rounded-lg max-w-4xl mx-auto"></div>
            ) : cmsContent['success-stories']?.content_html ? (
              <div
                className="prose prose-lg max-w-4xl mx-auto"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(cmsContent['success-stories'].content_html),
                }}
              />
            ) : (
              <div className="max-w-4xl mx-auto">
                <p className="text-lg text-gray-600 mb-8 text-center">
                  Lihat bagaimana keluarga menggunakan {siteName} untuk melacak dan merayakan kemajuan anak mereka.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-gray-700 italic mb-4">
                      &ldquo;Dengan {siteName}, saya bisa melihat perkembangan anak saya setiap hari. Sangat membantu untuk komunikasi dengan terapis.&rdquo;
                    </p>
                    <p className="text-sm text-gray-500">- Ibu dari anak berusia 5 tahun</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-gray-700 italic mb-4">
                      &ldquo;Platform ini memudahkan saya sebagai terapis untuk melihat apa yang dilakukan orang tua di rumah dan memberikan umpan balik.&rdquo;
                    </p>
                    <p className="text-sm text-gray-500">- Terapis di Jakarta</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>
          {loadingCMS && !cmsContent.faq ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-8 bg-gray-200 animate-pulse rounded mb-4"></div>
                  <div className="h-24 bg-gray-200 animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          ) : cmsContent.faq?.content_html ? (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(cmsContent.faq.content_html),
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Apakah {siteName} gratis?
                </h3>
                <p className="text-gray-600">
                  Ya, kami menyediakan paket gratis dengan fitur dasar. Anda juga bisa upgrade ke paket Pro atau Premium untuk fitur yang lebih lengkap termasuk AI Summary.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Bagaimana cara mengundang terapis?
                </h3>
                <p className="text-gray-600">
                  Di dashboard, Anda dapat mengundang terapis dengan memasukkan email mereka. Terapis akan menerima email undangan dan dapat mendaftar untuk berkolaborasi dengan Anda.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Apakah data saya aman?
                </h3>
                <p className="text-gray-600">
                  Ya, kami mengutamakan privasi dan keamanan data. Semua data dienkripsi dan hanya Anda serta terapis yang diundang yang dapat melihat informasi anak Anda.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Bisakah saya menggunakan {siteName} di mobile?
                </h3>
                <p className="text-gray-600">
                  Ya, {siteName} dapat diakses melalui browser mobile dan dirancang responsif untuk pengalaman yang optimal di berbagai perangkat.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap Memulai Perjalanan Anda?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Bergabung dengan keluarga yang sudah menggunakan {siteName} untuk melacak dan merayakan setiap kemajuan
            anak mereka
          </p>
          {!isAuthenticated && (
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Mulai Gratis Sekarang
              </Button>
            </Link>
          )}
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
}
