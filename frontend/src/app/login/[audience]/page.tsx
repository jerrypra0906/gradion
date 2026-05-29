import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LoginPageContent } from '@/components/auth/LoginPageContent';
import { siteName, siteUrl } from '@/lib/site';

const VALID = ['admin', 'parent', 'consultant'] as const;
type AudienceParam = (typeof VALID)[number];

function isAudienceParam(x: string): x is AudienceParam {
  return (VALID as readonly string[]).includes(x);
}

export function generateMetadata({
  params,
}: {
  params: { audience: string };
}): Metadata {
  if (!isAudienceParam(params.audience)) {
    return { title: 'Sign In' };
  }

  const path = `/login/${params.audience}`;
  const descriptions: Record<AudienceParam, string> = {
    admin: `Administrator sign-in for ${siteName} — CMS, users, and analytics.`,
    parent: `Parent and family sign-in for ${siteName}.`,
    consultant: `Consultant and clinical sign-in for ${siteName} — sessions, goals, and collaboration.`,
  };

  const titles: Record<AudienceParam, string> = {
    admin: 'Admin sign in',
    parent: 'Parent sign in',
    consultant: 'Consultant sign in',
  };

  const t = params.audience;
  return {
    title: titles[t],
    description: descriptions[t],
    openGraph: {
      title: `${titles[t]} | ${siteName}`,
      description: descriptions[t],
      url: `${siteUrl}${path}`,
    },
    robots: { index: false, follow: true },
  };
}

export default function AudienceLoginPage({ params }: { params: { audience: string } }) {
  if (!isAudienceParam(params.audience)) {
    notFound();
  }

  return <LoginPageContent audience={params.audience} />;
}
