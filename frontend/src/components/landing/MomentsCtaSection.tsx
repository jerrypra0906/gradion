import { CMSContent } from '@/lib/api';
import { parseLandingSection } from '@/lib/landingCms';
import { Heart } from 'lucide-react';

interface MomentsCtaSectionProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

export function MomentsCtaSection({ cmsContent, loading }: MomentsCtaSectionProps) {
  const content = parseLandingSection('moments-cta', cmsContent);

  return (
    <section className="bg-[#1A2B4C] text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            {loading ? (
              <>
                <div className="h-10 bg-white/10 animate-pulse rounded mb-4 max-w-lg" />
                <div className="h-24 bg-white/10 animate-pulse rounded" />
              </>
            ) : (
              <>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{content.title}</h2>
                <p className="text-white/70 text-lg leading-relaxed">{content.body}</p>
              </>
            )}
          </div>
          <div className="flex justify-center">
            <div className="relative w-56 h-56">
              <div className="absolute inset-0 rounded-full bg-[#00C1B2]/10" />
              <div className="absolute inset-6 rounded-full bg-[#00C1B2]/20 flex items-center justify-center">
                <Heart className="w-20 h-20 text-[#00C1B2]" />
              </div>
              <Heart className="absolute top-2 right-6 w-5 h-5 text-[#00C1B2]/50" />
              <Heart className="absolute bottom-8 left-2 w-4 h-4 text-[#00C1B2]/40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
