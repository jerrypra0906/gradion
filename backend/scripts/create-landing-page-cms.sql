-- Landing Page CMS Content
-- Run this SQL script to create/update landing page CMS content

-- Hero Section
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Hero Section',
  'hero',
  '<p>Platform pelacakan perkembangan autisme yang dirancang khusus untuk keluarga Indonesia. Mulai perjalanan Anda hari ini dan rayakan setiap langkah kecil.</p>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET 
  content_html = EXCLUDED.content_html,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Vision and Mission Section
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Vision and Mission Section',
  'vision-mission',
  '<div class="max-w-4xl mx-auto text-left">
    <div class="grid md:grid-cols-2 gap-8">
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Visi</h3>
        <p class="text-gray-600">
          Menjadi platform terdepan di Indonesia untuk mendukung perkembangan anak dengan autisme melalui teknologi yang mudah digunakan dan kolaborasi yang efektif antara orang tua dan terapis.
        </p>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Misi</h3>
        <ul class="text-gray-600 space-y-2 list-disc list-inside">
          <li>Memberikan alat yang mudah digunakan untuk melacak perkembangan anak dengan autisme</li>
          <li>Memfasilitasi kolaborasi antara orang tua dan terapis dalam satu platform</li>
          <li>Menyediakan insights berbasis data untuk memahami kemajuan anak</li>
          <li>Mendukung keluarga Indonesia dengan konten dan dukungan dalam bahasa Indonesia</li>
        </ul>
      </div>
    </div>
  </div>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET 
  content_html = EXCLUDED.content_html,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Features Section
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Features Section',
  'features',
  '<p>Platform lengkap dengan fitur-fitur yang dirancang khusus untuk mendukung perkembangan anak dengan autisme. Dari pelacakan harian hingga kolaborasi dengan terapis, semuanya dalam satu tempat.</p>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET 
  content_html = EXCLUDED.content_html,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Why Different Section
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Why Different Section',
  'why-different',
  '<div class="prose prose-lg max-w-3xl mx-auto text-left">
    <p class="text-lg text-gray-600 mb-4">
      LangkahKecil dirancang khusus untuk memenuhi kebutuhan keluarga dengan anak autisme di Indonesia.
    </p>
    <ul class="list-disc list-inside space-y-3 text-gray-600">
      <li><strong>Kolaborasi Langsung:</strong> Orang tua dan terapis bekerja sama dalam satu platform yang terintegrasi</li>
      <li><strong>Pelacakan Terstruktur:</strong> Sistem pelacakan yang mudah digunakan dan terorganisir dengan baik</li>
      <li><strong>Laporan Visual:</strong> Grafik dan laporan yang membantu memahami kemajuan anak dari waktu ke waktu</li>
      <li><strong>Bahasa Indonesia:</strong> Interface dan konten dalam bahasa Indonesia untuk kemudahan penggunaan</li>
      <li><strong>Privasi Terjamin:</strong> Data Anda aman dan privasi terjamin dengan enkripsi tingkat enterprise</li>
      <li><strong>Dukungan Lokal:</strong> Tim support yang memahami konteks dan kebutuhan keluarga Indonesia</li>
    </ul>
  </div>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET 
  content_html = EXCLUDED.content_html,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Success Stories Section
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Success Stories Section',
  'success-stories',
  '<div class="max-w-4xl mx-auto">
    <p class="text-lg text-gray-600 mb-8 text-center">
      Lihat bagaimana keluarga menggunakan LangkahKecil untuk melacak dan merayakan kemajuan anak mereka.
    </p>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-gray-50 p-6 rounded-lg">
        <p class="text-gray-700 italic mb-4">
          &ldquo;Dengan LangkahKecil, saya bisa melihat perkembangan anak saya setiap hari. Sangat membantu untuk komunikasi dengan terapis. Sekarang saya bisa melacak semua aktivitas dan kemajuan dengan mudah.&rdquo;
        </p>
        <p class="text-sm text-gray-500">- Ibu Sarah, Jakarta</p>
        <p class="text-xs text-gray-400 mt-1">Anak berusia 5 tahun dengan ASD</p>
      </div>
      <div class="bg-gray-50 p-6 rounded-lg">
        <p class="text-gray-700 italic mb-4">
          &ldquo;Platform ini memudahkan saya sebagai terapis untuk melihat apa yang dilakukan orang tua di rumah dan memberikan umpan balik yang tepat waktu. Kolaborasi menjadi lebih efektif.&rdquo;
        </p>
        <p class="text-sm text-gray-500">- Dr. Budi, Terapis ABA di Jakarta</p>
        <p class="text-xs text-gray-400 mt-1">Menggunakan platform untuk 15+ anak</p>
      </div>
      <div class="bg-gray-50 p-6 rounded-lg">
        <p class="text-gray-700 italic mb-4">
          &ldquo;Laporan yang dihasilkan sangat membantu untuk rapat dengan dokter dan sekolah. Semua data terorganisir dengan baik dan mudah dibagikan.&rdquo;
        </p>
        <p class="text-sm text-gray-500">- Ibu Lisa, Bandung</p>
        <p class="text-xs text-gray-400 mt-1">Anak berusia 7 tahun</p>
      </div>
      <div class="bg-gray-50 p-6 rounded-lg">
        <p class="text-gray-700 italic mb-4">
          &ldquo;Saya suka fitur AI Summary yang memberikan insight tentang perkembangan anak. Membantu saya memahami pola dan kemajuan dengan lebih baik.&rdquo;
        </p>
        <p class="text-sm text-gray-500">- Bapak Andi, Surabaya</p>
        <p class="text-xs text-gray-400 mt-1">Pengguna Paket Premium</p>
      </div>
    </div>
  </div>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET 
  content_html = EXCLUDED.content_html,
  status = EXCLUDED.status,
  updated_at = NOW();

-- FAQ Section
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'FAQ Section',
  'faq',
  '<div class="prose prose-lg max-w-none space-y-4">
    <div class="bg-white p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Apakah LangkahKecil gratis?
      </h3>
      <p class="text-gray-600">
        Ya, kami menyediakan paket gratis dengan fitur dasar. Anda juga bisa upgrade ke paket Pro atau Premium untuk fitur yang lebih lengkap termasuk AI Summary, laporan lanjutan, dan prioritas support.
      </p>
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Bagaimana cara menggunakan LangkahKecil?
      </h3>
      <p class="text-gray-600">
        Cukup daftar dengan email Anda, buat profil anak, dan mulai melacak aktivitas harian. Anda juga bisa mengundang terapis untuk berkolaborasi dalam satu platform.
      </p>
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Apakah data saya aman?
      </h3>
      <p class="text-gray-600">
        Ya, keamanan data adalah prioritas utama kami. Semua data dienkripsi dan disimpan dengan standar keamanan tingkat enterprise. Kami juga mematuhi regulasi privasi data Indonesia.
      </p>
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Bisakah saya menggunakan LangkahKecil di mobile?
      </h3>
      <p class="text-gray-600">
        Ya, LangkahKecil dapat diakses melalui browser mobile dengan interface yang responsif. Kami juga sedang mengembangkan aplikasi mobile native yang akan segera hadir.
      </p>
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Bagaimana cara mengundang terapis?
      </h3>
      <p class="text-gray-600">
        Dari dashboard anak, Anda dapat mengundang terapis dengan memasukkan email mereka. Terapis akan menerima undangan dan dapat mendaftar untuk mulai berkolaborasi dengan Anda.
      </p>
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Apa itu AI Summary?
      </h3>
      <p class="text-gray-600">
        AI Summary adalah fitur yang menggunakan teknologi AI untuk menganalisis log aktivitas harian dan memberikan ringkasan serta insight tentang perkembangan anak. Fitur ini tersedia untuk pengguna Paket Pro dan Premium.
      </p>
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Bisakah saya mencetak laporan?
      </h3>
      <p class="text-gray-600">
        Ya, semua laporan dapat dicetak atau diekspor sebagai PDF. Laporan ini dapat digunakan untuk keperluan medis, sekolah, atau dokumentasi pribadi.
      </p>
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">
        Apakah ada batasan untuk paket gratis?
      </h3>
      <p class="text-gray-600">
        Paket gratis memberikan akses ke semua fitur dasar termasuk pelacakan aktivitas, kolaborasi dengan terapis, dan laporan dasar. Untuk fitur lanjutan seperti AI Summary dan laporan detail, Anda dapat upgrade ke paket berbayar.
      </p>
    </div>
  </div>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET 
  content_html = EXCLUDED.content_html,
  status = EXCLUDED.status,
  updated_at = NOW();
