import Link from 'next/link';
import { siteName } from '@/lib/site';

export function CtaSection() {
  return (
    <section className="bg-navy-900 text-white py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Bantu dunia mendapatkan pendampingan yang lebih baik
        </h2>
        <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
          Bergabung dengan keluarga yang sudah menggunakan {siteName} untuk melacak dan merayakan
          setiap kemajuan anak mereka.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-teal-500 text-navy-900 font-semibold hover:bg-teal-400 transition-colors"
          >
            Mulai Gratis Sekarang
          </Link>
          <Link
            href="/cms/contact"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            Hubungi Kami
          </Link>
        </div>
      </div>
    </section>
  );
}
