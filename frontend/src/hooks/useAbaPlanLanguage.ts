'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient, ApiResponse, AbaProgramWeek } from '@/lib/api';

/**
 * Keep a weekly ABA plan in the language the parent is reading.
 *
 * The plan is stored in whichever language it was generated in; translations
 * live in `plan_json_i18n` and are produced once by the `/translate` endpoint.
 * Reconciling that used to happen only on the child detail page, so a parent
 * reading Indonesian who opened the weekly program or the guided session
 * directly saw English program names, targets and steps — the UI chrome was
 * translated, the content was not.
 *
 * The API serves a cached translation for free on read; this fills the gap when
 * no translation exists yet, once per week row, and then refetches.
 *
 * Returns the outcome so a page can say why the content is in another language
 * — translating costs AI tokens, and an exhausted quota otherwise leaves the
 * parent reading English with no explanation at all.
 */
export function useAbaPlanLanguage(input: {
  childId: string | number | null | undefined;
  week: AbaProgramWeek | null | undefined;
  language: string;
  /** Re-read the week after a translation is produced. */
  onTranslated: () => void | Promise<void>;
  /** Skip while something else is already mutating the plan. */
  paused?: boolean;
}) {
  const { childId, week, language, onTranslated, paused } = input;
  const inFlightRef = useRef(false);
  const attemptedRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<{
    /** The plan is not in the reader's language and could not be translated. */
    untranslated: boolean;
    translating: boolean;
    reason: string | null;
  }>({ untranslated: false, translating: false, reason: null });

  useEffect(() => {
    if (paused || !childId || !week || inFlightRef.current) return;

    const plan = week.plan_json as { language?: string; programs?: unknown[] } | null;
    if (!plan || !Array.isArray(plan.programs)) return;

    const target: 'en' | 'id' = language === 'id' ? 'id' : 'en';
    const planLang = plan.language;
    if (planLang === target) return;
    // Rows predating the language field are English; only fill Indonesian.
    if (!planLang && target !== 'id') return;

    // One attempt per week per target — a failing translation must not loop.
    const key = `${week.id}:${target}`;
    if (attemptedRef.current.has(key)) return;
    attemptedRef.current.add(key);

    void (async () => {
      inFlightRef.current = true;
      setStatus({ untranslated: false, translating: true, reason: null });
      try {
        const res = await apiClient.post<ApiResponse<{ week: AbaProgramWeek }>>(
          `/aba-program/children/${childId}/weeks/${week.id}/translate`,
          { to: target },
        );
        if (res.data.success) {
          setStatus({ untranslated: false, translating: false, reason: null });
          await onTranslated();
        } else {
          setStatus({ untranslated: true, translating: false, reason: res.data.error || null });
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        setStatus({ untranslated: true, translating: false, reason: e.response?.data?.error || null });
      } finally {
        inFlightRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, week?.id, (week?.plan_json as { language?: string } | null)?.language, language, paused]);

  return status;
}

/** Parent-facing wording for why a plan is still in the other language. */
export function planLanguageNotice(
  reason: string | null,
  language: string,
): string {
  const id = language === 'id';
  const quota = reason ? /insufficient tokens/i.test(reason) : false;
  const base = id
    ? 'Program ini masih ditampilkan dalam bahasa Inggris.'
    : 'This program is still shown in Indonesian.';
  if (quota) {
    return id
      ? `${base} Kuota AI untuk menerjemahkan sedang habis — hubungi tim Gradion untuk menambah kuota.`
      : `${base} The AI quota needed to translate it is used up — contact the Gradion team to top it up.`;
  }
  return id
    ? `${base} Terjemahan otomatis belum tersedia saat ini.`
    : `${base} An automatic translation is not available right now.`;
}
