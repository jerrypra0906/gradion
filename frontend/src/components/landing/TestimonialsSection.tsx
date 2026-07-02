import { CMSContent } from '@/lib/api';
import { parseLandingSection } from '@/lib/landingCms';
import { Quote } from 'lucide-react';

interface TestimonialsSectionProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

export function TestimonialsSection({ cmsContent, loading }: TestimonialsSectionProps) {
  const content = parseLandingSection('success-stories', cmsContent);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-[#1A2B4C] mb-16 text-center">
          {content.title}
        </h2>

        {loading ? (
          <div className="h-64 bg-gray-100 animate-pulse rounded-xl max-w-4xl mx-auto" />
        ) : (
          <div
            className={`grid gap-8 ${
              content.testimonials.length === 1
                ? 'max-w-xl mx-auto'
                : content.testimonials.length === 2
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {content.testimonials.map((testimonial, index) => (
              <div
                key={`${testimonial.author}-${index}`}
                className="bg-slate-50 rounded-2xl p-8 border border-gray-100"
              >
                <Quote className="w-8 h-8 text-teal-400 mb-4" />
                <p className="text-gray-700 italic mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <p className="text-sm font-medium text-navy-900">— {testimonial.author}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
