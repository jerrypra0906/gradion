'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { apiClient, ApiResponse, CMSContent } from '@/lib/api';
import { StructuredData } from '@/components/landing/StructuredData';
import { ResponsiveAd } from '@/components/ads';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGridSection } from '@/components/landing/FeatureGridSection';
import { FamilyValueSection } from '@/components/landing/FamilyValueSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { MomentsCtaSection } from '@/components/landing/MomentsCtaSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { StepsSection } from '@/components/landing/StepsSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LANDING_SECTION_SLUGS, LandingSectionSlug } from '@/lib/landingCms';

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

type LandingCmsState = Record<LandingSectionSlug, CMSContent | null>;

const emptyLandingCms = (): LandingCmsState =>
  Object.fromEntries(LANDING_SECTION_SLUGS.map((slug) => [slug, null])) as LandingCmsState;

export function HomePageContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [plans, setPlans] = useState<AvailablePlans | null>(null);
  const [cmsContent, setCmsContent] = useState<LandingCmsState>(emptyLandingCms);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingCMS, setLoadingCMS] = useState(true);

  useEffect(() => {
    fetchPlans();
    fetchCMSContent();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await apiClient.get<ApiResponse<AvailablePlans>>('/subscriptions/plans');
      if (response.data.success && response.data.data) {
        setPlans(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchCMSContent = async () => {
    try {
      setLoadingCMS(true);
      const results = await Promise.all(
        LANDING_SECTION_SLUGS.map((slug) =>
          apiClient.get<ApiResponse<CMSContent>>(`/cms/${slug}`).catch(() => null)
        )
      );

      const content = emptyLandingCms();
      results.forEach((response, index) => {
        if (response?.data.success && response.data.data) {
          const slug = LANDING_SECTION_SLUGS[index];
          content[slug] = response.data.data;
        }
      });

      setCmsContent(content);
    } catch (err) {
      console.error('Failed to fetch CMS content:', err);
    } finally {
      setLoadingCMS(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <StructuredData />
      <div className="min-h-screen flex flex-col">
        <HeroSection
          cmsContent={cmsContent.hero}
          navCmsContent={cmsContent['landing-nav']}
          loading={loadingCMS}
        />
        <FeatureGridSection cmsContent={cmsContent.features} loading={loadingCMS} />
        <FamilyValueSection cmsContent={cmsContent['why-different']} loading={loadingCMS} />
        <PricingSection
          plans={plans}
          loading={loadingPlans}
          isAuthenticated={isAuthenticated}
          cmsContent={cmsContent.pricing}
        />
        <MomentsCtaSection cmsContent={cmsContent['moments-cta']} loading={loadingCMS} />
        <TestimonialsSection cmsContent={cmsContent['success-stories']} loading={loadingCMS} />
        <FaqSection cmsContent={cmsContent.faq} loading={loadingCMS} />
        <StepsSection cmsContent={cmsContent.steps} loading={loadingCMS} />

        {!isAuthenticated && process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <ResponsiveAd
              adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOMEPAGE}
              placement="inline"
            />
          </div>
        )}

        <LandingFooter cmsContent={cmsContent.footer} loading={loadingCMS} />
      </div>
    </>
  );
}
