import { CMSContent } from '@/lib/api';
import { parseLandingSection } from '@/lib/landingCms';
import { Heart, Sparkles, Users } from 'lucide-react';

interface FamilyValueSectionProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

const cardStyles = [
  { icon: Heart, bg: 'bg-rose-50', iconColor: 'text-rose-500 bg-rose-100' },
  { icon: Sparkles, bg: 'bg-amber-50', iconColor: 'text-amber-600 bg-amber-100' },
  { icon: Users, bg: 'bg-sky-50', iconColor: 'text-sky-600 bg-sky-100' },
];

export function FamilyValueSection({ cmsContent, loading }: FamilyValueSectionProps) {
  const content = parseLandingSection('why-different', cmsContent);

  return (
    <section className="py-20 bg-[#FDF8F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A2B4C] mb-4">{content.title}</h2>
          <p className="text-gray-600 text-lg">{content.subtitle}</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 bg-white/60 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {content.cards.map((card, index) => {
              const style = cardStyles[index % cardStyles.length];
              const Icon = style.icon;
              return (
                <div key={`${card.title}-${index}`} className={`${style.bg} rounded-3xl p-8`}>
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${style.iconColor}`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A2B4C] mb-3">{card.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
