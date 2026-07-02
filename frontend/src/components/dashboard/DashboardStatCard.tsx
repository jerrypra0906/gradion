import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStatCardProps {
  value: number | string;
  label: string;
  icon: LucideIcon;
  href?: string;
  accent?: 'teal' | 'gold' | 'navy';
  className?: string;
}

const accentStyles = {
  teal: {
    iconBg: 'bg-[#00C1B2]/10',
    icon: 'text-[#00C1B2]',
    value: 'text-[#1A2B4C]',
  },
  gold: {
    iconBg: 'bg-[#FFB900]/15',
    icon: 'text-[#FFB900]',
    value: 'text-[#FFB900]',
  },
  navy: {
    iconBg: 'bg-[#1A2B4C]/8',
    icon: 'text-[#1A2B4C]',
    value: 'text-[#1A2B4C]',
  },
} as const;

export function DashboardStatCard({
  value,
  label,
  icon: Icon,
  href,
  accent = 'teal',
  className,
}: DashboardStatCardProps) {
  const styles = accentStyles[accent];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('rounded-xl p-3', styles.iconBg)}>
          <Icon className={cn('w-5 h-5', styles.icon)} aria-hidden />
        </div>
        {href && (
          <ChevronRight
            className="w-5 h-5 text-[#1A2B4C]/25 group-hover:text-[#00C1B2] transition-colors flex-shrink-0 mt-1"
            aria-hidden
          />
        )}
      </div>
      <p className={cn('mt-4 font-montserrat text-3xl font-bold tracking-tight', styles.value)}>
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-[#1A2B4C]/60">{label}</p>
    </>
  );

  const cardClass = cn(
    'group rounded-2xl border border-[#E5E8EB] bg-white p-6 shadow-sm shadow-[#1A2B4C]/5 transition-all',
    href && 'hover:border-[#00C1B2]/40 hover:shadow-md cursor-pointer',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cn('block', cardClass)}>
        {content}
      </Link>
    );
  }

  return <div className={cardClass}>{content}</div>;
}
