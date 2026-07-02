import Link from 'next/link';
import { CMSContent } from '@/lib/api';
import { parseLandingSection } from '@/lib/landingCms';
import { ArrowRight } from 'lucide-react';
import { GradionLogo } from '@/components/landing/GradionLogo';

interface LandingFooterProps {
  cmsContent?: CMSContent | null;
  loading?: boolean;
}

export function LandingFooter({ cmsContent = null, loading = false }: LandingFooterProps) {
  const content = parseLandingSection('footer', cmsContent);

  return (
    <footer className="bg-[#1A2B4C] text-gray-400 py-16 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 pb-14 border-b border-white/10">
          {loading ? (
            <div className="h-24 bg-white/5 animate-pulse rounded max-w-xl mx-auto" />
          ) : (
            <>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">{content.ctaTitle}</h2>
              <Link
                href={content.cta.href}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#00C1B2] text-white font-semibold hover:bg-[#00A896] transition-colors"
              >
                {content.cta.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="mb-4 inline-flex w-fit rounded-lg bg-white px-3.5 py-2.5">
              <GradionLogo size="xl" />
            </div>
            <p className="text-sm leading-relaxed">{content.tagline}</p>
          </div>

          {content.linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {group.title}
              </h4>
              <ul className="space-y-2 text-sm">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.href}`}>
                    <Link href={link.href} className="hover:text-[#00C1B2] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm">
          <p>{content.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
