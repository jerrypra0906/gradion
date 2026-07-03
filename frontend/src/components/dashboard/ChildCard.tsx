import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Child } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ChildCardProps {
  child: Child;
  ageLabel: string;
  diagnosisLabel: string;
  tokenLabel: string;
  tokenUsed: number;
  tokenLimit: number;
}

function getTokenPercent(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function getTokenBarColor(percent: number) {
  if (percent >= 90) return 'bg-[#FFB900]';
  return 'bg-[#00C1B2]';
}

function formatTokenCount(value: number) {
  return value.toLocaleString('id-ID');
}

export function ChildCard({
  child,
  ageLabel,
  diagnosisLabel,
  tokenLabel,
  tokenUsed,
  tokenLimit,
}: ChildCardProps) {
  const tokenPercent = getTokenPercent(tokenUsed, tokenLimit);
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
          <span className="font-medium text-[#1A2B4C]/70">{tokenLabel}</span>
          <span className="font-semibold text-[#1A2B4C]">
            {formatTokenCount(tokenUsed)} / {formatTokenCount(tokenLimit)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#E5E8EB]">
          <div
            className={cn('h-full rounded-full transition-all', getTokenBarColor(tokenPercent))}
            style={{ width: `${tokenPercent}%` }}
            role="progressbar"
            aria-valuenow={tokenPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${tokenPercent}% ${tokenLabel}`}
          />
        </div>
      </div>
    </Link>
  );
}
