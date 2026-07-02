import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Child } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ChildCardProps {
  child: Child;
  ageLabel: string;
  diagnosisLabel: string;
  quotaLabel: string;
  sessionsLabel: string;
}

function getQuotaPercent(used: number, quota: number) {
  if (quota <= 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

function getQuotaBarColor(percent: number) {
  if (percent >= 90) return 'bg-[#FFB900]';
  if (percent >= 70) return 'bg-[#00C1B2]';
  return 'bg-[#00C1B2]';
}

export function ChildCard({
  child,
  ageLabel,
  diagnosisLabel,
  quotaLabel,
  sessionsLabel,
}: ChildCardProps) {
  const quotaPercent = getQuotaPercent(child.used_sessions, child.monthly_quota);
  const initial = child.name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/dashboard/children/${child.id}`}
      className="group block rounded-2xl border border-[#E5E8EB] bg-white p-5 sm:p-6 shadow-sm shadow-[#1A2B4C]/5 transition-all hover:border-[#00C1B2]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00C1B2]/10 font-montserrat text-lg font-bold text-[#00A896]"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-montserrat text-lg font-bold text-[#1A2B4C] transition-colors group-hover:text-[#00A896]">
              {child.name}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#1A2B4C]/10 bg-[#1A2B4C]/5 px-2.5 py-0.5 text-xs font-medium text-[#1A2B4C]/70">
                {child.diagnosis || diagnosisLabel}
              </span>
              <span className="text-xs text-[#1A2B4C]/50">{ageLabel}</span>
            </div>
          </div>
        </div>
        <ChevronRight
          className="mt-1 h-5 w-5 shrink-0 text-[#1A2B4C]/25 transition-colors group-hover:text-[#00C1B2]"
          aria-hidden
        />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-[#1A2B4C]/70">{quotaLabel}</span>
          <span className="font-semibold text-[#1A2B4C]">
            {child.used_sessions} / {child.monthly_quota} {sessionsLabel}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#E5E8EB]">
          <div
            className={cn('h-full rounded-full transition-all', getQuotaBarColor(quotaPercent))}
            style={{ width: `${quotaPercent}%` }}
            role="progressbar"
            aria-valuenow={quotaPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${quotaPercent}% ${quotaLabel}`}
          />
        </div>
      </div>
    </Link>
  );
}
