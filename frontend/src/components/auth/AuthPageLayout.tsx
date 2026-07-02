import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { AuthNav } from '@/components/auth/AuthNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface AuthPageLayoutProps {
  active: 'login' | 'register';
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  sideTitle?: string;
  sideHighlight?: string;
  sideDescription?: string;
}

export function AuthPageLayout({
  active,
  title,
  subtitle,
  children,
  sideTitle = 'Recovery is',
  sideHighlight = 'possible.',
  sideDescription = 'Platform ABA berintensitas tinggi untuk keluarga di Indonesia — pelacakan perilaku, kolaborasi terapis & konsultan, dan ringkasan perkembangan.',
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8F1]">
      <AuthNav active={active} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Brand panel */}
        <aside className="relative hidden lg:flex lg:w-[44%] xl:w-[42%] bg-[#1A2B4C] text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A2B4C] via-[#152238] to-[#1A2B4C]" />
          <div className="pointer-events-none absolute -top-24 right-0 w-96 h-96 rounded-full bg-[#00C1B2]/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-[#00C1B2]/8 blur-3xl" />

          <div className="relative flex flex-col justify-center px-12 xl:px-16 py-16">
            <div className="inline-flex items-center gap-2 w-fit px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[#00C1B2] text-xs font-semibold tracking-wide uppercase mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Platform ABA No. 1 di Indonesia
            </div>

            <h1 className="font-montserrat text-4xl xl:text-[2.75rem] font-bold tracking-tight leading-[1.08] mb-6">
              {sideTitle}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C1B2] to-[#00A896]">
                {sideHighlight}
              </span>
            </h1>

            <p className="text-lg text-white/70 leading-relaxed max-w-md">{sideDescription}</p>

            <ul className="mt-10 space-y-3 text-sm text-white/60">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C1B2]" />
                Pelacakan ABA terstruktur
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C1B2]" />
                Kolaborasi orang tua &amp; terapis
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C1B2]" />
                Insight perkembangan berbasis data
              </li>
            </ul>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl border border-gradion-grey shadow-sm shadow-gradion-navy/5 p-6 sm:p-8">
              <div className="mb-8">
                <h2 className="font-montserrat text-2xl sm:text-3xl font-bold text-gradion-navy tracking-tight">
                  {title}
                </h2>
                {subtitle && <div className="mt-2 text-sm text-gradion-navy/60">{subtitle}</div>}
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>

      <LandingFooter />
    </div>
  );
}
