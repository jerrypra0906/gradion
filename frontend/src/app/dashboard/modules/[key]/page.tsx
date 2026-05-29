'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, LearningModuleProgress } from '@/lib/api';
import { LearningModule, learningModules, youtubeIdFromUrl } from '@/lib/modules';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeIframeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if (window.YT?.Player) return resolve();
    const existing = document.querySelector('script[data-youtube-iframe-api="true"]');
    if (existing) {
      const i = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(i);
          resolve();
        }
      }, 200);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.dataset.youtubeIframeApi = 'true';
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useTranslation();
  const key = String(params.key || '');

  const mod = useMemo<LearningModule | undefined>(
    () => learningModules.find((m) => m.key === key),
    [key]
  );

  const [progressRows, setProgressRows] = useState<LearningModuleProgress[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [videoCompletedLocal, setVideoCompletedLocal] = useState(false);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | ''>>({});
  const [quizError, setQuizError] = useState('');

  const playerRef = useRef<any>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, LearningModuleProgress>();
    for (const p of progressRows) m.set(p.module_key, p);
    return m;
  }, [progressRows]);

  const progress = byKey.get(key);
  const videoCompleted = Boolean(progress?.video_completed || videoCompletedLocal);
  const quizPassed = Boolean(progress?.quiz_passed);
  const fullyCompleted = videoCompleted && quizPassed;

  const fetchProgress = async () => {
    const res = await apiClient.get<ApiResponse<LearningModuleProgress[]>>('/modules/progress');
    if (res.data.success) setProgressRows(res.data.data || []);
  };

  useEffect(() => {
    fetchProgress().catch(() => {});
  }, []);

  useEffect(() => {
    if (!mod?.youtubeUrl) return;
    const vid = youtubeIdFromUrl(mod.youtubeUrl);
    if (!vid) return;
    (async () => {
      await loadYouTubeIframeApi();
      if (!playerHostRef.current) return;
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        height: '390',
        width: '640',
        videoId: vid,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          // Captions (if provided by the video)
          cc_load_policy: 1,
          cc_lang_pref: language === 'id' ? 'id' : 'en',
          hl: language === 'id' ? 'id' : 'en',
          // Limit ways out of Gradion
          fs: 0,
        },
        events: {
          onStateChange: (ev: any) => {
            // 0 = ended
            if (ev?.data === 0) {
              setVideoCompletedLocal(true);
              upsertProgress({ video_completed: true }).catch(() => {});
            }
          },
        },
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod?.youtubeUrl, language]);

  const upsertProgress = async (patch: Partial<LearningModuleProgress> & { module_key?: string }) => {
    if (!mod) return;
    try {
      setSaving(true);
      setError('');
      const res = await apiClient.post<ApiResponse<LearningModuleProgress>>('/modules/progress', {
        module_key: mod.key,
        ...(patch.video_completed !== undefined ? { video_completed: patch.video_completed } : {}),
        ...(patch.quiz_passed !== undefined ? { quiz_passed: patch.quiz_passed } : {}),
        ...(patch.quiz_answers !== undefined ? { quiz_answers: patch.quiz_answers } : {}),
      });
      if (res.data.success && res.data.data) {
        await fetchProgress();
      } else {
        setError(res.data.error || 'Failed to save progress');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const submitQuiz = async () => {
    if (!mod) return;
    setQuizError('');

    if (!videoCompleted) {
      setQuizError(
        language === 'id'
          ? 'Silakan tonton video sampai selesai sebelum mengerjakan kuis.'
          : 'Please watch the video until the end before taking the quiz.'
      );
      return;
    }

    // Require all questions answered
    for (const q of mod.quiz) {
      if (!answers[q.id]) {
        setQuizError(
          language === 'id'
            ? 'Silakan jawab semua pertanyaan kuis.'
            : 'Please answer all quiz questions.'
        );
        return;
      }
    }

    const allCorrect = mod.quiz.every((q) => answers[q.id] === q.correctOptionId);
    if (!allCorrect) {
      setQuizError(
        language === 'id'
          ? 'Ada jawaban yang belum tepat. Silakan coba lagi.'
          : 'Some answers are incorrect. Please try again.'
      );
      return;
    }

    await upsertProgress({ quiz_passed: true, quiz_answers: answers as any });
  };

  if (!mod) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {language === 'id' ? 'Modul tidak ditemukan' : 'Module not found'}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const next = learningModules.find((m) => m.order === mod.order + 1);

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            ← {t('back')}
          </Button>
          <Link href="/dashboard/modules">
            <Button variant="outline" size="sm">
              {t('modules')}
            </Button>
          </Link>
        </div>

        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="text-xs font-semibold text-gray-500">MODULE {mod.order}</div>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{mod.title[language]}</h1>
            <p className="mt-2 text-gray-600">{mod.concept[language]}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">
                {language === 'id' ? 'Poin penting' : 'Key points'}
              </div>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                {mod.bullets[language].map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>

            {mod.youtubeUrl && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {language === 'id' ? 'Video' : 'Video'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {language === 'id'
                        ? 'Tonton sampai selesai untuk membuka kuis.'
                        : 'Watch until the end to unlock the quiz.'}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      videoCompleted ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
                    {videoCompleted
                      ? language === 'id'
                        ? 'Selesai'
                        : 'Completed'
                      : language === 'id'
                      ? 'Belum selesai'
                      : 'Not completed'}
                  </div>
                </div>
                <div className="p-4">
                  <div className="relative">
                    <div ref={playerHostRef} />
                    {/* Block the top-right YouTube overlay controls (share/watch/copy) */}
                    <div
                      className="absolute top-0 right-0 h-16 w-44"
                      style={{ pointerEvents: 'auto' }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {language === 'id'
                      ? 'Subtitle: Bahasa Indonesia (jika tersedia).'
                      : 'Subtitle: English (if available).'}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {language === 'id' ? 'Kuis' : 'Quiz'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {language === 'id'
                      ? 'Jawab semua pertanyaan dengan benar.'
                      : 'Answer all questions correctly.'}
                  </div>
                </div>
                <div
                  className={`text-xs font-semibold ${
                    quizPassed ? 'text-green-700' : 'text-gray-600'
                  }`}
                >
                  {quizPassed
                    ? language === 'id'
                      ? 'Lulus'
                      : 'Passed'
                    : language === 'id'
                    ? 'Belum lulus'
                    : 'Not passed'}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {mod.quiz.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    {language === 'id' ? 'Kuis segera hadir.' : 'Quiz coming soon.'}
                  </div>
                ) : (
                  <>
                    {mod.quiz.map((q, idx) => (
                      <div key={q.id} className="rounded border border-gray-200 p-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {idx + 1}. {q.question[language]}
                        </div>
                        <div className="mt-3 space-y-2">
                          {q.options.map((opt) => (
                            <label
                              key={opt.id}
                              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt.id}
                                checked={(answers[q.id] || '') === opt.id}
                                onChange={() =>
                                  setAnswers((a) => ({ ...a, [q.id]: opt.id }))
                                }
                                disabled={quizPassed}
                              />
                              <span>
                                <span className="font-semibold">{opt.id})</span> {opt.label[language]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    {quizError && (
                      <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {quizError}
                      </div>
                    )}
                    {error && (
                      <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    {!quizPassed && (
                      <div className="flex justify-end">
                        <Button onClick={submitQuiz} disabled={saving}>
                          {saving
                            ? `${t('loading')}...`
                            : language === 'id'
                            ? 'Kirim kuis'
                            : 'Submit quiz'}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {fullyCompleted && next && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-green-900">
                    {language === 'id' ? 'Modul selesai' : 'Module completed'}
                  </div>
                  <div className="text-xs text-green-800">
                    {language === 'id'
                      ? `Modul berikutnya terbuka: ${next.title[language]}`
                      : `Next module unlocked: ${next.title[language]}`}
                  </div>
                </div>
                <Link href={`/dashboard/modules/${next.key}`}>
                  <Button>{language === 'id' ? 'Lanjut ke berikutnya' : 'Go to next'}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

