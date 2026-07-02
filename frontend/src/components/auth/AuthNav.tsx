import Link from 'next/link';
import { GradionLogo } from '@/components/landing/GradionLogo';

interface AuthNavProps {
  active?: 'login' | 'register';
}

export function AuthNav({ active }: AuthNavProps) {
  return (
    <header className="bg-white border-b border-gradion-grey">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-[4.5rem]">
          <Link
            href="/"
            className="flex items-center rounded-lg -ml-1 px-1 py-1 transition-opacity hover:opacity-85"
          >
            <GradionLogo size="xl" />
          </Link>

          <div className="flex items-center gap-3">
            {active !== 'login' && (
              <Link
                href="/login"
                className="text-sm font-medium text-gradion-navy/80 hover:text-gradion-navy px-3 py-2 transition-colors"
              >
                Masuk
              </Link>
            )}
            {active !== 'register' && (
              <Link
                href="/register"
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#00C1B2] text-white text-sm font-semibold hover:bg-[#00A896] shadow-md shadow-[#00C1B2]/20 transition-all"
              >
                Daftar Gratis
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
