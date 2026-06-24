'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { BannerStrip } from '@/components/BannerStrip';
import { Footer } from './Footer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import { getAuthToken, type BannerAudience } from '@/lib/api';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, fetchCurrentUser } = useAuthStore();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = getAuthToken();
      if (token) {
        fetchCurrentUser();
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, router, fetchCurrentUser]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'therapist':
        return 'bg-blue-100 text-blue-800';
      case 'consultant':
        return 'bg-indigo-100 text-indigo-800';
      case 'parent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    `${
      isActive(href)
        ? 'border-blue-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`;

  const mobileLinkClass = (href: string) =>
    `${
      isActive(href)
        ? 'bg-blue-50 border-blue-500 text-blue-700'
        : 'border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-200'
    } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0">
                <span className="text-xl font-bold text-blue-700 tracking-tight">Gradion</span>
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
                {showClinicalNav && user.role !== 'parent' && (
                  <Link href="/dashboard/goals" className={desktopLinkClass('/dashboard/goals')}>
                    {t('goals')}
                  </Link>
                )}
                {showClinicalNav && user.role !== 'parent' && (
                  <Link
                    href="/dashboard/video-validation"
                    className={desktopLinkClass('/dashboard/video-validation')}
                  >
                    {t('videoValidation')}
                  </Link>
                )}
                {user.role !== 'parent' && (
                  <Link href="/dashboard/modules" className={desktopLinkClass('/dashboard/modules')}>
                    {t('modules')}
                  </Link>
                )}
                <Link href="/dashboard/profile" className={desktopLinkClass('/dashboard/profile')}>
                  {t('profile')}
                </Link>
                {user.role === 'admin' && (
                  <div className="relative">
                    <button
                      type="button"
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        pathname.startsWith('/dashboard/admin')
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                      onClick={() => setAdminMenuOpen((open) => !open)}
                    >
                      {t('admin')}
                      <svg
                        className="ml-1 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {adminMenuOpen && (
                      <div className="absolute z-20 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1 text-sm text-gray-700">
                          <Link
                            href="/dashboard/admin/analytics"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            {t('analytics')}
                          </Link>
                          <Link
                            href="/dashboard/admin/users"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            {t('users')}
                          </Link>
                          <Link
                            href="/dashboard/admin/quota"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            {t('quota')}
                          </Link>
                          <Link
                            href="/dashboard/admin/subscriptions/plans"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            {t('plans')}
                          </Link>
                          <Link
                            href="/dashboard/admin/promotion-codes"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            {t('promoCodes')}
                          </Link>
                          <Link
                            href="/dashboard/cms"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            {t('cms')}
                          </Link>
                          <Link
                            href="/dashboard/landing-page"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            {t('landingPage')}
                          </Link>
                          <Link
                            href="/dashboard/banners"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            {t('banners')}
                          </Link>
                          <Link
                            href="/dashboard/admin/initial-observation-template"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            Initial Observation CMS
                          </Link>
                          <Link
                            href="/dashboard/admin/learning-modules"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            Modules CMS
                          </Link>
                          <Link
                            href="/dashboard/admin/master-programs"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            ABA Master Programs
                          </Link>
                          <Link
                            href="/dashboard/admin/autism-cases"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            Autism Cases (Initial Programs)
                          </Link>
                          <Link
                            href="/dashboard/admin/ai-content-review"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            AI Content Review
                          </Link>
                          <Link
                            href="/dashboard/admin/send-email"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setAdminMenuOpen(false)}
                          >
                            Send Email
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {user.role === 'admin' && (
                  <Link href="/dashboard/sessions" className={desktopLinkClass('/dashboard/sessions')}>
                    {t('sessions')}
                  </Link>
                )}
              </div>
            </div>

            {/* Right side user info + desktop logout */}
            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
              <span className="text-sm text-gray-700 max-w-[160px] truncate" title={user.name}>
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
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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
          <div className="md:hidden border-t border-gray-200" id="mobile-menu">
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
                  <Link
                    href="/dashboard/admin/analytics"
                    className={mobileLinkClass('/dashboard/admin/analytics')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('analytics')}
                  </Link>
                  <Link
                    href="/dashboard/admin/users"
                    className={mobileLinkClass('/dashboard/admin/users')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('users')}
                  </Link>
                  <Link
                    href="/dashboard/admin/quota"
                    className={mobileLinkClass('/dashboard/admin/quota')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('quota')}
                  </Link>
                  <Link
                    href="/dashboard/admin/subscriptions/plans"
                    className={mobileLinkClass('/dashboard/admin/subscriptions')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('plans')}
                  </Link>
                  <Link
                    href="/dashboard/admin/promotion-codes"
                    className={mobileLinkClass('/dashboard/admin/promotion-codes')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('promoCodes')}
                  </Link>
                  <Link
                    href="/dashboard/cms"
                    className={mobileLinkClass('/dashboard/cms')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('cms')}
                  </Link>
                  <Link
                    href="/dashboard/landing-page"
                    className={mobileLinkClass('/dashboard/landing-page')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('landingPage')}
                  </Link>
                  <Link
                    href="/dashboard/banners"
                    className={mobileLinkClass('/dashboard/banners')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('banners')}
                  </Link>
                  <Link
                    href="/dashboard/admin/initial-observation-template"
                    className={mobileLinkClass('/dashboard/admin/initial-observation-template')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Initial Observation CMS
                  </Link>
                  <Link
                    href="/dashboard/admin/learning-modules"
                    className={mobileLinkClass('/dashboard/admin/learning-modules')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Modules CMS
                  </Link>
                  <Link
                    href="/dashboard/admin/master-programs"
                    className={mobileLinkClass('/dashboard/admin/master-programs')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ABA Master Programs
                  </Link>
                  <Link
                    href="/dashboard/admin/autism-cases"
                    className={mobileLinkClass('/dashboard/admin/autism-cases')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Autism Cases
                  </Link>
                  <Link
                    href="/dashboard/admin/ai-content-review"
                    className={mobileLinkClass('/dashboard/admin/ai-content-review')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    AI Content Review
                  </Link>
                  <Link
                    href="/dashboard/admin/send-email"
                    className={mobileLinkClass('/dashboard/admin/send-email')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Send Email
                  </Link>
                </>
              )}
              {user.role === 'admin' && (
                <Link
                  href="/dashboard/sessions"
                  className={mobileLinkClass('/dashboard/sessions')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('sessions')}
                </Link>
              )}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.name}</div>
                  <div className="text-sm font-medium text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
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

