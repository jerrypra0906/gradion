import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardSectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export function DashboardSectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  noPadding,
}: DashboardSectionCardProps) {
  const hasHeader = title || subtitle || action;

  return (
    <section
      className={cn(
        'rounded-2xl border border-[#E5E8EB] bg-white shadow-sm shadow-[#1A2B4C]/5',
        className,
      )}
    >
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-[#E5E8EB] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h3 className="font-montserrat text-lg font-bold text-[#1A2B4C]">{title}</h3>
            )}
            {subtitle && <p className="mt-1 text-sm text-[#1A2B4C]/60">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(!noPadding && 'px-6 py-5', bodyClassName)}>{children}</div>
    </section>
  );
}
