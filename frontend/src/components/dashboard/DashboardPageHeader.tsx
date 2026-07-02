import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function DashboardPageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: DashboardPageHeaderProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl bg-[#1A2B4C] px-6 py-7 sm:px-8 sm:py-8 text-white',
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#00C1B2]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[#00C1B2]/8 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#00C1B2]">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            Gradion
          </div>
          <h1 className="font-montserrat text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </section>
  );
}
