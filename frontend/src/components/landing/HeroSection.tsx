import Link from 'next/link';
import { CMSContent } from '@/lib/api';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroIllustration } from '@/components/landing/HeroIllustration';
import { parseLandingSection } from '@/lib/landingCms';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  cmsContent: CMSContent | null;
  navCmsContent: CMSContent | null;
  loading: boolean;
}

export function HeroSection({ cmsContent, navCmsContent, loading }: HeroSectionProps) {
  const content = parseLandingSection('hero', cmsContent);

  if (loading) {
    return (
      <section className="relative bg-[#1A2B4C] text-white overflow-hidden min-h-[520px]">
        <LandingNav cmsContent={navCmsContent} loading />
      </section>
    );
  }

  return (
    <section className="relative bg-[#1A2B4C] text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A2B4C] via-[#152238] to-[#1A2B4C]" />
      <div className="pointer-events-none absolute -top-32 right-0 w-[520px] h-[520px] rounded-full bg-[#00C1B2]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-[#00C1B2]/8 blur-3xl" />

      <LandingNav cmsContent={navCmsContent} loading={false} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 md:pt-32 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[#00C1B2] text-xs font-semibold tracking-wide uppercase mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              {content.badge}
            </div>

            <h1 className="font-montserrat text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight mb-6 leading-[1.08]">
              {content.headline}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C1B2] to-[#00A896]">
                {content.headlineHighlight}
              </span>
            </h1>

            <p className="text-lg text-white/70 mb-8 leading-relaxed max-w-xl">{content.subtitle}</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={content.primaryCta.href}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#00C1B2] text-white font-semibold hover:bg-[#00A896] shadow-lg shadow-[#00C1B2]/25 transition-all hover:shadow-[#00C1B2]/35"
              >
                {content.primaryCta.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={content.secondaryCta.href}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-white/20 text-white/90 font-semibold hover:bg-white/[0.06] hover:border-white/30 transition-all"
              >
                {content.secondaryCta.label}
              </Link>
            </div>

            <div className="mt-10 pt-8 border-t border-white/[0.08] flex flex-wrap gap-8">
              {content.trustBadges.map((item) => (
                <div key={item.label}>
                  <div className="text-sm font-semibold text-white">{item.label}</div>
                  <div className="text-xs text-white/45 mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#00C1B2]/20 to-[#00C1B2]/5 blur-2xl scale-95" />
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8 md:p-10">
                <HeroIllustration />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
