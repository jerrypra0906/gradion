import Link from 'next/link';
import { CMSContent } from '@/lib/api';
import { parseLandingSection } from '@/lib/landingCms';
import { ArrowRight } from 'lucide-react';

interface StepsSectionProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

export function StepsSection({ cmsContent, loading }: StepsSectionProps) {
  const content = parseLandingSection('steps', cmsContent);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A2B4C] mb-4">{content.title}</h2>
          {loading ? (
            <div className="h-8 bg-gray-100 animate-pulse rounded max-w-xl mx-auto" />
          ) : (
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">{content.subtitle}</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {content.steps.map((item, index) => (
            <div key={`${item.title}-${index}`} className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#00C1B2] text-white font-bold text-xl flex items-center justify-center mx-auto mb-5">
                {index + 1}
              </div>
              <h3 className="text-lg font-bold text-[#1A2B4C] mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href={content.cta.href}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#00C1B2] text-white font-semibold hover:bg-[#00A896] transition-colors"
          >
            {content.cta.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
