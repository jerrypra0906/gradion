'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { CMSContent } from '@/lib/api';
import {
  applyTemplate,
  parseLandingSection,
  PricingPlanContent,
} from '@/lib/landingCms';

interface AvailablePlan {
  weeks: number;
  aiAccess: boolean;
  monthlyTokenLimit: number;
  price: number;
}

interface AvailablePlans {
  free: AvailablePlan;
  pro: AvailablePlan;
  premium: AvailablePlan;
  therapist?: AvailablePlan;
}

interface PricingSectionProps {
  plans: AvailablePlans | null;
  loading: boolean;
  isAuthenticated: boolean;
  cmsContent: CMSContent | null;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}

function formatWeeks(weeks: number) {
  if (weeks === 1) return '1 minggu';
  if (weeks === 4) return '1 bulan';
  if (weeks === 12) return '3 bulan';
  if (weeks === 52) return '1 tahun';
  return `${weeks} minggu`;
}

function gridClassForPlanCount(count: number) {
  if (count <= 1) return 'md:grid-cols-1';
  if (count === 2) return 'md:grid-cols-2';
  if (count === 4) return 'md:grid-cols-2 lg:grid-cols-4';
  return 'md:grid-cols-3';
}

function resolvePlanDisplay(
  plan: PricingPlanContent,
  apiPlans: AvailablePlans | null
): { price: number; period: string; tokenLimit?: number } {
  const subscriptionKey = plan.subscriptionKey;
  const linkedPlan =
    subscriptionKey && apiPlans && subscriptionKey in apiPlans
      ? apiPlans[subscriptionKey as keyof AvailablePlans]
      : null;

  const price =
    plan.price !== null && plan.price !== undefined
      ? plan.price
      : linkedPlan && subscriptionKey !== 'free'
        ? linkedPlan.price
        : 0;

  const period = plan.periodLabel || (linkedPlan ? formatWeeks(linkedPlan.weeks) : '');

  return {
    price,
    period,
    tokenLimit: linkedPlan?.monthlyTokenLimit,
  };
}

export function PricingSection({
  plans,
  loading,
  isAuthenticated,
  cmsContent,
}: PricingSectionProps) {
  const content = parseLandingSection('pricing', cmsContent);

  const renderFeatures = (plan: PricingPlanContent, tokenLimit?: number) =>
    plan.features.map((feature) => {
      const label = tokenLimit
        ? applyTemplate(feature, { monthlyTokenLimit: tokenLimit.toLocaleString('id-ID') })
        : feature;
      return (
        <li key={`${plan.id}-${label}`} className="flex items-start gap-2 text-sm">
          <Check className="w-4 h-4 text-[#00C1B2] mt-0.5 flex-shrink-0" />
          {label}
        </li>
      );
    });

  return (
    <section className="py-20 bg-white" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A2B4C] mb-4">{content.title}</h2>
          <p className="text-lg text-gray-600">{content.subtitle}</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-3xl h-96 animate-pulse" />
            ))}
          </div>
        ) : content.plans.length > 0 ? (
          <div
            className={`grid gap-6 max-w-6xl mx-auto items-stretch ${gridClassForPlanCount(content.plans.length)}`}
          >
            {content.plans.map((plan) => {
              const display = resolvePlanDisplay(plan, plans);
              const isLight = plan.style === 'light';
              const isHighlighted = !!plan.highlighted;
              const checkoutHref = plan.checkoutPlan
                ? `/dashboard/checkout?plan=${plan.checkoutPlan}`
                : '/register';

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 flex flex-col ${
                    isLight
                      ? 'bg-[#FDF8F1] border border-[#F5EFE6] text-[#1A2B4C]'
                      : 'bg-[#1A2B4C] text-white border border-white/10'
                  } ${isHighlighted ? 'relative shadow-xl md:-mt-2 md:mb-2' : ''}`}
                >
                  {plan.badge ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00C1B2] text-white text-xs font-bold px-4 py-1 rounded-full">
                      {plan.badge}
                    </div>
                  ) : null}

                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className={`text-sm mb-4 ${isLight ? 'text-gray-500' : 'text-white/60'}`}>
                    {plan.tagline}
                  </p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold">{formatPrice(display.price)}</span>
                    {display.period ? (
                      <span className={`text-sm ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                        {' '}
                        / {display.period}
                      </span>
                    ) : null}
                  </div>

                  <ul
                    className={`space-y-3 mb-8 flex-1 ${
                      isLight ? 'text-gray-600' : 'text-white/80'
                    }`}
                  >
                    {renderFeatures(plan, display.tokenLimit)}
                  </ul>

                  {!isAuthenticated ? (
                    <Link
                      href="/register"
                      className={`block w-full text-center py-3 rounded-full font-semibold transition-colors ${
                        isLight
                          ? 'border-2 border-[#1A2B4C] text-[#1A2B4C] hover:bg-[#1A2B4C] hover:text-white'
                          : isHighlighted
                            ? 'bg-[#00C1B2] text-white hover:bg-[#00A896]'
                            : 'border border-white/40 text-white hover:bg-white/10'
                      }`}
                    >
                      {plan.ctaLabel}
                    </Link>
                  ) : plan.checkoutPlan ? (
                    <Link
                      href={checkoutHref}
                      className={`block w-full text-center py-3 rounded-full font-semibold transition-colors ${
                        isHighlighted
                          ? 'bg-[#00C1B2] text-white hover:bg-[#00A896]'
                          : 'border border-white/40 text-white hover:bg-white/10'
                      }`}
                    >
                      {plan.ctaLabelAuthenticated || plan.ctaLabel}
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
