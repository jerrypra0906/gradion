import Image from 'next/image';

import { cn } from '@/lib/utils';

import { stitchLogo } from '@/lib/stitch-design';

interface GradionLogoProps {
  className?: string;
  /** Dark background — icon + white wordmark (crisp, from Stitch asset) */
  onDark?: boolean;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Display heights; PNG assets are 3× for retina */
const heights = { sm: 36, md: 44, lg: 52, xl: 60 } as const;
const fullAspect = 321 / 124;
const iconAspect = 235 / 261;

export function GradionLogo({
  className,
  onDark = false,
  showTagline = false,
  size = 'md',
}: GradionLogoProps) {
  const height = heights[size];

  if (onDark) {
    const iconHeight = height;
    const iconWidth = Math.round(iconHeight * iconAspect);

    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex items-center gap-2.5">
          <Image
            src={stitchLogo.iconDark}
            alt=""
            width={iconWidth * 3}
            height={iconHeight * 3}
            unoptimized
            className="flex-shrink-0"
            style={{ width: iconWidth, height: iconHeight }}
            priority
            aria-hidden
          />
          <span
            className="font-bold lowercase text-white tracking-[-0.03em] leading-none"
            style={{ fontSize: height * 0.72 }}
          >
            gradion
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] mt-1.5 font-medium text-white/50">
            Recovery is possible
          </span>
        )}
      </div>
    );
  }

  const width = Math.round(height * fullAspect);

  return (
    <div className={cn('flex flex-col', className)}>
      <Image
        src={stitchLogo.light}
        alt="Gradion"
        width={width * 3}
        height={height * 3}
        unoptimized
        className="block"
        style={{ width, height }}
        priority
      />
      {showTagline && (
        <span className="text-[10px] mt-1.5 font-medium text-gradion-navy/60">
          Recovery is possible
        </span>
      )}
    </div>
  );
}
