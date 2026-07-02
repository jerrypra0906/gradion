import { cn } from '@/lib/utils';

export interface FilterTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface DashboardFilterTabsProps<T extends string> {
  tabs: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function DashboardFilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: DashboardFilterTabsProps<T>) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/40 focus:ring-offset-2',
              active
                ? 'bg-[#00C1B2] text-white shadow-md shadow-[#00C1B2]/20'
                : 'bg-white text-[#1A2B4C]/70 border border-[#E5E8EB] hover:border-[#00C1B2]/30 hover:text-[#1A2B4C]',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-bold',
                  active ? 'bg-white/20 text-white' : 'bg-[#FDF8F1] text-[#1A2B4C]/60',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
