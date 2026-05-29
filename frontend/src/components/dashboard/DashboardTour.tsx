'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { User } from '@/lib/api';

type Role = User['role'];

interface DashboardTourProps {
  role: Role;
  onFinish: () => void;
}

interface TourStep {
  id: number;
  title: string;
  description: string;
  bullets?: string[];
}

function getSteps(role: Role): TourStep[] {
  const commonFirst: TourStep = {
    id: 0,
    title: 'Selamat datang di Gradion 👋',
    description:
      'Ini adalah tur singkat agar Anda paham area utama di dashboard dan bisa langsung memaksimalkan Gradion.',
    bullets: [
      'Lihat ringkasan anak & aktivitas di Dashboard',
      'Akses cepat ke fitur penting (anak, log, sesi, goals)',
    ],
  };

  const parentSteps: TourStep[] = [
    {
      id: 1,
      title: 'Ringkasan Anak & Activity Logs',
      description:
        'Di bagian atas dashboard, Anda bisa melihat jumlah anak yang terdaftar dan jumlah Activity Log yang sudah dibuat.',
      bullets: [
        'Kartu \"My Children\" menampilkan jumlah anak yang Anda kelola',
        'Kartu \"Activity Logs\" menunjukkan berapa banyak log aktivitas yang sudah tercatat',
      ],
    },
    {
      id: 2,
      title: 'Quick Actions untuk Orang Tua',
      description:
        'Gunakan tombol di bagian Quick Actions untuk membuat log baru atau menambah anak dengan cepat.',
      bullets: [
        '\"New Activity Log\" untuk mencatat aktivitas harian anak',
        '\"Add Child\" untuk menambahkan data anak baru',
      ],
    },
    {
      id: 3,
      title: 'Resources & Detail Anak',
      description:
        'Di bagian bawah, Anda bisa menemukan artikel pendukung serta daftar anak dengan ringkasan kuota sesi.',
      bullets: [
        'Bagian \"Resources\" berisi artikel yang relevan untuk orang tua',
        'Klik nama anak di daftar untuk melihat detail dan log terkait anak tersebut',
      ],
    },
    {
      id: 4,
      title: 'Laporan & Insight AI',
      description:
        'Di menu \"Reports\", Anda dapat melihat rangkuman perkembangan anak, termasuk insight berbasis AI untuk membantu memahami pola kemajuan.',
      bullets: [
        'Gunakan menu Reports untuk melihat ringkasan log dan progres',
        'Insight AI membantu melihat tren dan area yang perlu lebih banyak perhatian',
      ],
    },
  ];

  const therapistSteps: TourStep[] = [
    {
      id: 1,
      title: 'Ringkasan Sesi & Pending Logs',
      description:
        'Di bagian atas dashboard, Anda bisa melihat jumlah sesi terbaru dan log orang tua yang menunggu review.',
      bullets: [
        'Kartu \"Recent Sessions\" menunjukkan jumlah sesi yang baru dibuat',
        'Kartu \"Pending Logs\" menunjukkan log yang perlu Anda review',
      ],
    },
    {
      id: 2,
      title: 'Quick Actions untuk Terapis',
      description:
        'Gunakan Quick Actions untuk mencatat sesi baru atau langsung masuk ke halaman review log.',
      bullets: [
        '\"Record Session\" untuk mencatat sesi terapi baru',
        '\"Review Logs\" untuk melihat dan memberi komentar pada log orang tua',
      ],
    },
    {
      id: 3,
      title: 'Resources & Daftar Anak',
      description:
        'Anda juga dapat mengakses artikel pendukung dan daftar anak yang Anda tangani dari dashboard.',
      bullets: [
        'Bagian \"Resources\" berisi artikel yang dapat membantu Anda dan keluarga',
        'Klik nama anak di daftar untuk melihat detail dan riwayat log',
      ],
    },
    {
      id: 4,
      title: 'Reports & Analitik AI',
      description:
        'Melalui menu \"Reports\", Anda bisa melihat laporan agregat dan insight AI untuk mendukung evaluasi terapi dan komunikasi dengan orang tua.',
      bullets: [
        'Reports menampilkan rangkuman sesi dan log dalam periode tertentu',
        'Insight AI dapat membantu mengidentifikasi pola perkembangan dan tantangan anak',
      ],
    },
  ];

  const adminSteps: TourStep[] = [
    {
      id: 1,
      title: 'Ringkasan Data Utama',
      description:
        'Dashboard menampilkan ringkasan cepat jumlah anak, sesi, dan log yang membantu Anda memantau aktivitas platform.',
      bullets: [
        'Gunakan kartu-kartu di bagian atas untuk melihat angka penting secara sekilas',
      ],
    },
    {
      id: 2,
      title: 'Akses ke Konten & Analitik',
      description:
        'Dari dashboard, Anda dapat melompat ke halaman lain seperti CMS, laporan, dan pengaturan admin.',
      bullets: [
        'Gunakan menu di sidebar untuk berpindah ke modul lain',
        'Resources dan daftar anak membantu melihat bagaimana platform digunakan',
      ],
    },
    {
      id: 3,
      title: 'Kolaborasi & Dukungan',
      description:
        'Pastikan orang tua dan terapis mengetahui fitur utama seperti Activity Logs, Sessions, dan Goals agar platform dimanfaatkan maksimal.',
    },
  ];

  if (role === 'parent') return [commonFirst, ...parentSteps];
  if (role === 'therapist' || role === 'consultant') return [commonFirst, ...therapistSteps];
  return [commonFirst, ...adminSteps];
}

export function DashboardTour({ role, onFinish }: DashboardTourProps) {
  const router = useRouter();
  const steps = getSteps(role);
  const [stepIndex, setStepIndex] = useState(0);

  const current = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const isReportsStep = current.id === 4;

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  const handleOpenReports = () => {
    router.push('/dashboard/reports');
    onFinish();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => {
        // Clicking the backdrop should dismiss the tour (prevents \"dashboard locked\" feeling).
        if (e.target === e.currentTarget) onFinish();
      }}
    >
      <div className="w-full max-w-xl mx-4 mb-6 sm:mb-0">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-7 border border-blue-100">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                Gradion Tour
              </p>
              <h2 className="mt-1 text-lg sm:text-xl font-bold text-gray-900">
                {current.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="ml-4 text-xs sm:text-sm text-gray-400 hover:text-gray-600"
            >
              Lewati
            </button>
          </div>

          <p className="text-sm sm:text-base text-gray-700 mb-3">
            {current.description}
          </p>

          {current.bullets && (
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-600 mb-4">
              {current.bullets.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}

          {isReportsStep && (
            <div className="mb-4 pt-2 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenReports}
                className="w-full sm:w-auto"
              >
                Buka Reports Sekarang →
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-1">
              {steps.map((step, idx) => (
                <span
                  key={step.id}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === stepIndex ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={isFirst}
              >
                Sebelumnya
              </Button>
              <Button type="button" size="sm" onClick={handleNext}>
                {isLast ? 'Selesai' : 'Lanjut'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

