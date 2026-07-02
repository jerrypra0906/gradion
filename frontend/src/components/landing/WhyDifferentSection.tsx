import DOMPurify from 'isomorphic-dompurify';
import { CMSContent } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';
import { siteName } from '@/lib/site';

interface WhyDifferentSectionProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

const defaultPoints = [
  'Fokus ABA: logging perilaku, tujuan klinis, dan kolaborasi multi-peran',
  'Video validation & AI token wallet sesuai paket langganan',
  'Knowledge Hub & banner dinamis untuk komunikasi yang relevan',
  'Laporan dan insight agar orang tua dan klinisi memutuskan berbasis data',
  'Privasi dan keamanan data sebagai fondasi teknis',
];

export function WhyDifferentSection({ cmsContent, loading }: WhyDifferentSectionProps) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-8 text-center">
            Mengapa {siteName} berbeda?
          </h2>

          {loading && !cmsContent ? (
            <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
          ) : cmsContent?.content_html ? (
            <div
              className="prose prose-lg max-w-none cms-article"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(cmsContent.content_html),
              }}
            />
          ) : (
            <div className="bg-cream-50 rounded-2xl p-8 md:p-10 border border-cream-100">
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                {siteName} menggabungkan inti Langkah Kecil dengan mesin ABA yang lebih terstruktur,
                peran konsultan, validasi sesi berbasis AI, CMS untuk konten edukatif, dan analytics
                bagi admin — dirancang untuk pasar Indonesia.
              </p>
              <ul className="space-y-4">
                {defaultPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
