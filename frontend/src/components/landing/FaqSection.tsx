'use client';

import { useState } from 'react';
import { CMSContent } from '@/lib/api';
import { parseLandingSection } from '@/lib/landingCms';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqSectionProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

export function FaqSection({ cmsContent, loading }: FaqSectionProps) {
  const content = parseLandingSection('faq', cmsContent);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 bg-[#FDF8F1]" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-[#1A2B4C] mb-12 text-center">
          {content.title}
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white h-16 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {content.items.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={`${faq.question}-${index}`}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-navy-900">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed">{faq.answer}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
