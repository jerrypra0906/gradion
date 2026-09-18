'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Shared site footer.
 *
 * It renders inside DashboardLayout too, so it followed the reader's language
 * nowhere and offered "Sign In" / "Register" to people who are already signed
 * in. Both are fixed here: the copy is translated, and the marketing columns
 * collapse to the support links once there is a session.
 */
export function Footer() {
  const { language } = useTranslation();
  const { user } = useAuthStore();
  const id = language === 'id';

  const productLinks = [
    { href: '/#features', label: id ? 'Fitur' : 'Features' },
    { href: '/#pricing', label: id ? 'Harga' : 'Pricing' },
    { href: '/resources', label: id ? 'Pusat Pengetahuan' : 'Knowledge Hub' },
  ];
  const companyLinks = [
    { href: '/#faq', label: id ? 'Tanya Jawab' : 'FAQ' },
    { href: '/login', label: id ? 'Masuk' : 'Sign In' },
    { href: '/register', label: id ? 'Daftar' : 'Register' },
  ];
  const supportLinks = [
    { href: '/cms/contact', label: id ? 'Hubungi Kami' : 'Contact Us' },
    { href: '/cms/privacy', label: id ? 'Kebijakan Privasi' : 'Privacy Policy' },
    { href: '/cms/terms', label: id ? 'Syarat Layanan' : 'Terms of Service' },
  ];

  const columns = user
    ? [{ title: id ? 'Bantuan' : 'Support', links: supportLinks }]
    : [
        { title: id ? 'Produk' : 'Product', links: productLinks },
        { title: id ? 'Perusahaan' : 'Company', links: companyLinks },
        { title: id ? 'Bantuan' : 'Support', links: supportLinks },
      ];

  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 gap-8 ${user ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}
        >
          <div>
            <div className="mb-4">
              <span className="text-lg font-bold text-white">Gradion</span>
            </div>
            <p className="text-sm text-gray-400">
              {id
                ? 'Recovery is possible — pendampingan ABA terstruktur, pelacakan perkembangan, dan sumber belajar untuk keluarga di Indonesia.'
                : 'Recovery is possible — structured ABA support, progress tracking, and resources for families in Indonesia.'}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} Gradion.{' '}
            {id ? 'Seluruh hak cipta dilindungi.' : 'All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
