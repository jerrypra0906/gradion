import { VideoPlayer } from '@/components/landing/VideoPlayer';
import { siteName } from '@/lib/site';

export function VideoSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-6">
              Modernisasi pendampingan ABA
            </h2>
            <div className="space-y-6">
              {[
                {
                  step: '1',
                  title: 'Strukturkan pelacakan',
                  desc: 'Catat perilaku dan sesi dengan protokol ABA yang konsisten setiap hari.',
                },
                {
                  step: '2',
                  title: 'Tingkatkan pengalaman keluarga',
                  desc: 'Kolaborasi mulus antara orang tua, terapis, dan konsultan dalam satu platform.',
                },
                {
                  step: '3',
                  title: 'Kualitas data lebih baik',
                  desc: 'Analytics dan validasi video membantu keputusan berbasis bukti.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-600 font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900 mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-center mb-6 lg:hidden">
              <p className="text-gray-600">Lihat {siteName} dalam aksi</p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl ring-1 ring-gray-200">
              <VideoPlayer
                videoId={process.env.NEXT_PUBLIC_VIDEO_YOUTUBE_ID}
                platform="youtube"
                title="Gradion platform overview"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
