import { Heart } from 'lucide-react';
import { siteName } from '@/lib/site';

export function SupportSection() {
  return (
    <section className="bg-navy-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Dapatkan dukungan yang Anda butuhkan
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Setiap keluarga memiliki perjalanan unik. {siteName} dirancang untuk memberikan
              alat, panduan, dan kolaborasi klinis agar Anda tidak sendirian dalam perjalanan
              perkembangan anak.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              <div className="absolute inset-0 rounded-full bg-teal-500/10" />
              <div className="absolute inset-4 rounded-full bg-teal-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-teal-500/30 flex items-center justify-center">
                    <Heart className="w-12 h-12 text-teal-400" />
                  </div>
                  <p className="text-teal-300 font-medium text-sm">Untuk setiap keluarga</p>
                </div>
              </div>
              <Heart className="absolute top-4 right-8 w-5 h-5 text-teal-400/60" />
              <Heart className="absolute bottom-12 left-4 w-4 h-4 text-teal-400/40" />
              <Heart className="absolute top-16 left-8 w-3 h-3 text-teal-400/50" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
