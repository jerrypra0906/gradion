import Link from 'next/link';
import { CMSContent } from '@/lib/api';
import { parseLandingSection } from '@/lib/landingCms';
import { GradionLogo } from '@/components/landing/GradionLogo';

interface LandingNavProps {
  cmsContent?: CMSContent | null;
  loading?: boolean;
}

export function LandingNav({ cmsContent, loading = false }: LandingNavProps) {
  const content = parseLandingSection('landing-nav', cmsContent);

  if (loading) {
    return (
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="bg-white border-b border-[#E5E8EB] h-16 md:h-[4.5rem]" />
      </header>
    );
  }

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="bg-white border-b border-[#E5E8EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-[4.5rem]">
            <Link
              href="/"
              className="flex items-center rounded-lg -ml-1 px-1 py-1 transition-opacity hover:opacity-85"
            >
              <GradionLogo size="xl" />
            </Link>

            {/* Desktop nav links intentionally hidden for landing page */}

            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-gradion-navy/80 hover:text-gradion-navy px-3 py-2 transition-colors"
              >
                {content.loginLabel}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#00C1B2] text-white text-sm font-semibold hover:bg-[#00A896] shadow-md shadow-[#00C1B2]/20 transition-all"
              >
                {content.registerLabel}
              </Link>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <Link href="/login" className="text-gradion-navy/80 text-sm font-medium px-2 py-2">
                {content.loginLabel}
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-full bg-[#00C1B2] text-white text-sm font-semibold hover:bg-[#00A896]"
              >
                {content.mobileRegisterLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
