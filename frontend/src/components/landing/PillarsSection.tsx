import DOMPurify from 'isomorphic-dompurify';
import { CMSContent } from '@/lib/api';
import { Activity, Brain, Users } from 'lucide-react';
import { siteName } from '@/lib/site';

interface PillarsSectionProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

const defaultPillars = [
  {
    icon: Activity,
    title: 'Pelacakan ABA terstruktur',
    description:
      'Catat perilaku, tujuan, dan sesi dengan protokol ABA yang jelas — mudah digunakan oleh orang tua dan terapis.',
    bullets: ['Logging ABC & aktivitas harian', 'Tujuan klinis terukur', 'Laporan perkembangan otomatis'],
    accent: 'bg-teal-50 border-teal-200',
    iconBg: 'bg-teal-100 text-teal-600',
  },
  {
    icon: Users,
    title: 'Kolaborasi multi-peran',
    description:
      'Orang tua, terapis, dan konsultan ABA bekerja dalam satu alur kerja dengan visibilitas kemajuan yang sama.',
    bullets: ['Undang terapis via email', 'Tinjauan log bersama', 'Sinkronisasi tujuan klinis'],
    accent: 'bg-orange-50 border-orange-200',
    iconBg: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Brain,
    title: 'AI & validasi video',
    description:
      'Validasi fidelity terapi rumah berbasis AI dan ringkasan perkembangan sesuai paket langganan Anda.',
    bullets: ['Validasi sesi video', 'Ringkasan AI berbasis data', 'Knowledge Hub edukatif'],
    accent: 'bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-600',
  },
];

export function PillarsSection({ cmsContent, loading }: PillarsSectionProps) {
  return (
    <section className="py-20 bg-white" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4">
            Bangun terapi ABA ke dalam rutinitas harian
          </h2>
          <p className="text-lg text-gray-600">
            {siteName} menghubungkan keluarga, klinisi, dan data dalam satu platform yang
            terstruktur dan dapat dipertanggungjawabkan secara klinis.
          </p>
        </div>

        {loading && !cmsContent ? (
          <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
        ) : cmsContent?.content_html ? (
          <div
            className="prose prose-lg max-w-4xl mx-auto cms-article"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(cmsContent.content_html),
            }}
          />
        ) : (
          <div className="space-y-12">
            {defaultPillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className={`grid md:grid-cols-2 gap-8 items-center ${index % 2 === 1 ? 'md:direction-rtl' : ''}`}
                >
                  <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                    <div className={`inline-flex p-3 rounded-xl ${pillar.iconBg} mb-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-navy-900 mb-3">{pillar.title}</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">{pillar.description}</p>
                    <ul className="space-y-2">
                      {pillar.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-gray-700">
                          <span className="text-teal-500 mt-1">✓</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`rounded-2xl border-2 p-8 ${pillar.accent} ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                    <div className="aspect-video rounded-xl bg-white/60 flex items-center justify-center">
                      <Icon className="w-16 h-16 opacity-20" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
