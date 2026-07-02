'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { BannerStrip } from '@/components/BannerStrip';
import { Footer } from './Footer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { GradionLogo } from '@/components/landing/GradionLogo';
import { useTranslation } from '@/hooks/useTranslation';
import { getAuthToken, type BannerAudience } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/lib/translations';

interface DashboardLayoutProps {
  children: ReactNode;
}

type AdminMenuItem = {
  href: string;
  label: string;
};

type AdminMenuGroup = {
  title: string;
  items: AdminMenuItem[];
};

function buildAdminMenuGroups(t: (key: TranslationKey) => string): AdminMenuGroup[] {
  return [
    {
      title: t('adminMenuUsersBilling'),
      items: [
        { href: '/dashboard/admin/analytics', label: t('analytics') },
        { href: '/dashboard/admin/users', label: t('users') },
        { href: '/dashboard/admin/quota', label: t('quota') },
        { href: '/dashboard/admin/subscriptions/plans', label: t('plans') },
        { href: '/dashboard/admin/promotion-codes', label: t('promoCodes') },
        { href: '/dashboard/sessions', label: t('sessions') },
      ],
    },
    {
      title: t('adminMenuContent'),
      items: [
        { href: '/dashboard/cms', label: t('cms') },
        { href: '/dashboard/landing-page', label: t('landingPage') },
        { href: '/dashboard/banners', label: t('banners') },
        { href: '/dashboard/goals', label: t('goals') },
        { href: '/dashboard/video-validation', label: t('videoValidation') },
        { href: '/dashboard/modules', label: t('modules') },
      ],
    },
    {
      title: t('adminMenuAba'),
      items: [
        { href: '/dashboard/admin/initial-observation-template', label: t('adminMenuInitialObservation') },
        { href: '/dashboard/admin/learning-modules', label: t('adminMenuModulesCms') },
        { href: '/dashboard/admin/master-programs', label: t('adminMenuMasterPrograms') },
        { href: '/dashboard/admin/autism-cases', label: t('adminMenuAutismCases') },
      ],
    },
    {
      title: t('adminMenuTools'),
      items: [
        { href: '/dashboard/admin/ai-content-review', label: t('adminMenuAiReview') },
        { href: '/dashboard/admin/send-email', label: t('adminMenuSendEmail') },
      ],
    },
  ];
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, fetchCurrentUser } = useAuthStore();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';
  const adminMenuGroups = buildAdminMenuGroups(t);

  useEffect(() => {
    if (!adminMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAdminMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [adminMenuOpen]);

  const isAdminPathActive = (href: string) => {
    if (href === '/dashboard/admin/subscriptions/plans') {
      return pathname.startsWith('/dashboard/admin/subscriptions');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isAnyAdminPathActive = adminMenuGroups.some((group) =>
    group.items.some((item) => isAdminPathActive(item.href)),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      const token = getAuthToken();
      if (token) {
        fetchCurrentUser();
      } else {
        router.push('/');
      }
    }
  }, [isAuthenticated, router, fetchCurrentUser]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-[#FFB900]/15 text-[#1A2B4C] border border-[#FFB900]/30';
      case 'therapist':
        return 'bg-[#00C1B2]/10 text-[#00A896] border border-[#00C1B2]/25';
      case 'consultant':
        return 'bg-[#1A2B4C]/8 text-[#1A2B4C] border border-[#1A2B4C]/15';
      case 'parent':
        return 'bg-[#00C1B2]/10 text-[#00A896] border border-[#00C1B2]/25';
      default:
        return 'bg-[#E5E8EB] text-[#1A2B4C]/70 border border-[#E5E8EB]';
    }
  };

  const bannerAudience: BannerAudience =
    user.role === 'parent'
      ? 'parents'
      : user.role === 'therapist' || user.role === 'consultant'
        ? 'therapists'
        : 'all';

  const showClinicalNav =
    user.role === 'parent' ||
    user.role === 'therapist' ||
    user.role === 'consultant' ||
    user.role === 'admin';

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const desktopLinkClass = (href: string) =>
    cn(
      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
      isActive(href)
        ? 'border-[#00C1B2] text-[#1A2B4C]'
        : 'border-transparent text-[#1A2B4C]/55 hover:border-[#E5E8EB] hover:text-[#1A2B4C]',
    );

  const mobileLinkClass = (href: string) =>
    cn(
      'block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors',
      isActive(href)
        ? 'bg-[#00C1B2]/10 border-[#00C1B2] text-[#1A2B4C]'
        : 'border-transparent text-[#1A2B4C]/70 hover:bg-[#FDF8F1] hover:border-[#E5E8EB]',
    );

  return (
    <div className="min-h-screen bg-[#FDF8F1] flex flex-col">
      <nav className="bg-white border-b border-[#E5E8EB] shadow-sm shadow-[#1A2B4C]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-[4.25rem]">
            <div className="flex items-center min-w-0">
              <Link href="/dashboard" className="flex-shrink-0 rounded-lg -ml-1 px-1 py-1 transition-opacity hover:opacity-85">
                <GradionLogo size="md" />
              </Link>
              {/* Desktop menu */}
              <div className="hidden md:ml-8 md:flex md:space-x-8">
                <Link href="/dashboard" className={desktopLinkClass('/dashboard')}>
                  {t('dashboard')}
                </Link>
                <Link href="/dashboard/children" className={desktopLinkClass('/dashboard/children')}>
                  {t('children')}
                </Link>
                {showClinicalNav && (
                  <Link href="/dashboard/logs" className={desktopLinkClass('/dashboard/logs')}>
                    {user.role === 'parent' ? t('myLogs') : t('activityLogs')}
                  </Link>
                )}
                {showClinicalNav && (
                  <Link href="/dashboard/reports" className={desktopLinkClass('/dashboard/reports')}>
                    {t('reports')}
                  </Link>
                )}
                {showClinicalNav && user.role !== 'parent' && !isAdmin && (
                  <Link href="/dashboard/goals" className={desktopLinkClass('/dashboard/goals')}>
                    {t('goals')}
                  </Link>
                )}
                {showClinicalNav && user.role !== 'parent' && !isAdmin && (
                  <Link
                    href="/dashboard/video-validation"
                    className={desktopLinkClass('/dashboard/video-validation')}
                  >
                    {t('videoValidation')}
                  </Link>
                )}
                {user.role !== 'parent' && !isAdmin && (
                  <Link href="/dashboard/modules" className={desktopLinkClass('/dashboard/modules')}>
                    {t('modules')}
                  </Link>
                )}
                <Link href="/dashboard/profile" className={desktopLinkClass('/dashboard/profile')}>
                  {t('profile')}
                </Link>
                {isAdmin && (
                  <div className="relative" ref={adminMenuRef}>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={adminMenuOpen}
                      className={cn(
                        'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
                        isAnyAdminPathActive
                          ? 'border-[#00C1B2] text-[#1A2B4C]'
                          : 'border-transparent text-[#1A2B4C]/55 hover:border-[#E5E8EB] hover:text-[#1A2B4C]',
                      )}
                      onClick={() => setAdminMenuOpen((open) => !open)}
                    >
                      {t('admin')}
                      <svg
                        className={cn('ml-1 h-4 w-4 transition-transform', adminMenuOpen && 'rotate-180')}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {adminMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 z-30 mt-2 w-[min(42rem,calc(100vw-2rem))] rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-xl shadow-[#1A2B4C]/10"
                      >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {adminMenuGroups.map((group) => (
                            <div key={group.title}>
                              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-[#1A2B4C]/45">
                                {group.title}
                              </p>
                              <div className="space-y-0.5">
                                {group.items.map((item) => (
                                  <Link
                                    key={item.href}
                                    href={item.href}
                                    role="menuitem"
                                    className={cn(
                                      'block rounded-lg px-3 py-2 text-sm transition-colors',
                                      isAdminPathActive(item.href)
                                        ? 'bg-[#00C1B2]/10 font-semibold text-[#00A896]'
                                        : 'text-[#1A2B4C]/80 hover:bg-[#FDF8F1] hover:text-[#00A896]',
                                    )}
                                    onClick={() => setAdminMenuOpen(false)}
                                  >
                                    {item.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right side user info + desktop logout */}
            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
              <span className="text-sm text-[#1A2B4C]/80 max-w-[160px] truncate" title={user.name}>
                {user.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                {t('logout')}
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden space-x-2">
              <LanguageSwitcher />
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-[#1A2B4C]/55 hover:text-[#1A2B4C] hover:bg-[#FDF8F1] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#00C1B2]/40"
                aria-controls="mobile-menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  // X icon
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  // Hamburger icon
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E8EB]" id="mobile-menu">
            <div className="pt-2 pb-3 space-y-1">
              <Link href="/dashboard" className={mobileLinkClass('/dashboard')} onClick={() => setMobileMenuOpen(false)}>
                {t('dashboard')}
              </Link>
              <Link
                href="/dashboard/children"
                className={mobileLinkClass('/dashboard/children')}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('children')}
              </Link>
              {showClinicalNav && (
                <Link
                  href="/dashboard/logs"
                  className={mobileLinkClass('/dashboard/logs')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {user.role === 'parent' ? t('myLogs') : t('activityLogs')}
                </Link>
              )}
              {showClinicalNav && (
                <Link
                  href="/dashboard/reports"
                  className={mobileLinkClass('/dashboard/reports')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('reports')}
                </Link>
              )}
              {showClinicalNav && user.role !== 'parent' && (
                <Link
                  href="/dashboard/goals"
                  className={mobileLinkClass('/dashboard/goals')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('goals')}
                </Link>
              )}
              {showClinicalNav && user.role !== 'parent' && (
                <Link
                  href="/dashboard/video-validation"
                  className={mobileLinkClass('/dashboard/video-validation')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('videoValidation')}
                </Link>
              )}
              {user.role !== 'parent' && (
                <Link
                  href="/dashboard/modules"
                  className={mobileLinkClass('/dashboard/modules')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('modules')}
                </Link>
              )}
              <Link
                href="/dashboard/profile"
                className={mobileLinkClass('/dashboard/profile')}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('profile')}
              </Link>
              {user.role === 'admin' && (
                <>
                  {adminMenuGroups.map((group) => (
                    <div key={group.title}>
                      <p className="pl-3 pr-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1A2B4C]/45">
                        {group.title}
                      </p>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={mobileLinkClass(item.href)}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="pt-4 pb-3 border-t border-[#E5E8EB]">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-[#1A2B4C]">{user.name}</div>
                  <div className="text-sm font-medium text-[#1A2B4C]/55">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  className="block w-full text-left px-4 py-2 text-base font-medium text-[#1A2B4C]/80 hover:bg-[#FDF8F1] transition-colors"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <BannerStrip audience={bannerAudience} />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}

