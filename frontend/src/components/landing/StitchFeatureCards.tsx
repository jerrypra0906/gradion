import DOMPurify from 'isomorphic-dompurify';
import { CMSContent } from '@/lib/api';

interface StitchFeatureCardsProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

const stitchCards = [
  {
    number: '01',
    title: 'Easy Logging',
    subtitle: 'Pelacakan ABA',
    description:
      'Simplify ABA therapy logging and progress monitoring at home for children with autism.',
    bg: 'bg-emerald-50',
    accent: 'text-emerald-600',
    ring: 'ring-emerald-100',
  },
  {
    number: '02',
    title: 'Track Progress',
    subtitle: 'Laporan Kemajuan',
    description:
      'Visualize development with intuitive charts, AI summaries, and insightful reports.',
    bg: 'bg-sky-50',
    accent: 'text-sky-600',
    ring: 'ring-sky-100',
  },
  {
    number: '03',
    title: 'Expert Resources',
    subtitle: 'Terapis & Konsultan',
    description:
      'Collaborate with therapists and ABA consultants in one structured clinical workflow.',
    bg: 'bg-violet-50',
    accent: 'text-violet-600',
    ring: 'ring-violet-100',
  },
];

export function StitchFeatureCards({ cmsContent, loading }: StitchFeatureCardsProps) {
  return (
    <section className="py-12 md:py-16 bg-white -mt-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading && !cmsContent ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : cmsContent?.content_html ? (
          <div
            className="prose prose-lg max-w-4xl mx-auto cms-article"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(cmsContent.content_html),
            }}
          />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {stitchCards.map((card) => (
              <div
                key={card.number}
                className={`${card.bg} rounded-3xl p-8 ring-1 ${card.ring} relative`}
              >
                <span
                  className={`absolute top-6 right-6 text-sm font-bold ${card.accent} opacity-60`}
                >
                  {card.number}
                </span>
                <div
                  className={`w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 ${card.accent}`}
                >
                  <span className="text-2xl font-bold">{card.number}</span>
                </div>
                <h3 className="text-lg font-bold text-navy-900 mb-1">{card.title}</h3>
                <p className={`text-sm font-semibold ${card.accent} mb-3`}>{card.subtitle}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
