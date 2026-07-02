'use client';

import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCollapsibleSectionProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
}

export function DashboardCollapsibleSection({
  title,
  subtitle,
  action,
  defaultOpen = true,
  bodyClassName,
  children,
  className,
}: DashboardCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white shadow-sm shadow-[#1A2B4C]/5',
        className,
      )}
    >
      <div className="flex items-start gap-3 border-b border-[#E5E8EB] px-6 py-5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left transition-colors hover:opacity-90"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <div className="font-montserrat text-lg font-bold text-[#1A2B4C]">{title}</div>
            {subtitle && <p className="mt-1 text-sm text-[#1A2B4C]/60">{subtitle}</p>}
          </div>
          <ChevronDown
            className={cn(
              'mt-1 h-5 w-5 shrink-0 text-[#1A2B4C]/40 transition-transform duration-200',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {open && <div className={cn('px-6 py-5', bodyClassName)}>{children}</div>}
    </section>
  );
}
