'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { InitialObservationForm } from '@/components/initialObservation/InitialObservationForm';
import { apiClient, ApiResponse, Child, InitialObservationTemplate } from '@/lib/api';
import {
  IOTemplateJson,
  ObsFlatFormState,
  buildInitialObservationPayload,
  createEmptyObsFromTemplate,
  defaultInitialObservationTemplate,
  ensureTemplateShape,
  missingRequiredFieldsForTemplate,
} from '@/lib/initialObservationTemplate';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

// v2: F/S sliders default to 0 — older drafts stored blank slider values and
// would resurrect the "filled-looking but empty" state, so they are ignored.
const DRAFT_VERSION = 'v2';

type ChildDraft = {
  step: 1 | 2;
  formData: {
    name: string;
    birthdate: string;
    weekly_hours_target: number;
    environment: string;
  };
  observations: ObsFlatFormState[];
  activeObsIndex: number;
  savedAt: number;
};

const emptyFormData = () => ({
  name: '',
  birthdate: '',
  weekly_hours_target: 3,
  environment: '',
});

const hasDraftContent = (
  formData: ChildDraft['formData'],
  step: 1 | 2,
  observations: ObsFlatFormState[],
) =>
  step === 2 ||
  formData.name.trim() !== '' ||
  formData.environment.trim() !== '' ||
  formData.birthdate !== '' ||
  observations.some((o) => Object.values(o).some((v) => String(v ?? '').trim() !== ''));

export function NewChildPageContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, language } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState(emptyFormData());
  const [template, setTemplate] = useState<IOTemplateJson>(defaultInitialObservationTemplate());
  const [templateLoading, setTemplateLoading] = useState(true);
  const [activeObsIndex, setActiveObsIndex] = useState(0);
  const [observations, setObservations] = useState<ObsFlatFormState[]>([
    createEmptyObsFromTemplate(defaultInitialObservationTemplate()),
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  // The submit button sits at the bottom of a long checklist; bring the
  // validation message into view so the parent immediately sees what's missing.
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const draftKey = user ? `gradion-child-draft-${DRAFT_VERSION}:${user.id}` : null;
  const [hydrated, setHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftRestoredRef = useRef(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<ChildDraft>;
        if (draft && typeof draft === 'object') {
          const restoredForm = { ...emptyFormData(), ...(draft.formData || {}) };
          const restoredObs =
            Array.isArray(draft.observations) && draft.observations.length > 0
              ? draft.observations
              : null;
          const restoredStep = draft.step === 2 ? 2 : 1;

          if (draft.formData) setFormData(restoredForm);
          if (restoredObs) setObservations(restoredObs);
          setStep(restoredStep);
          if (typeof draft.activeObsIndex === 'number') setActiveObsIndex(draft.activeObsIndex);
          if (typeof draft.savedAt === 'number') setDraftSavedAt(draft.savedAt);

          if (hasDraftContent(restoredForm, restoredStep, restoredObs || [])) {
            draftRestoredRef.current = true;
            setDraftRestored(true);
          }
        }
      }
    } catch {
      // Ignore malformed draft
    } finally {
      setHydrated(true);
    }
  }, [draftKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setTemplateLoading(true);
        const res = await apiClient.get<ApiResponse<InitialObservationTemplate>>(
          '/children/initial-observation-template/active',
        );
        if (cancelled) return;
        if (res.data.success && res.data.data?.template_json) {
          const next = ensureTemplateShape(res.data.data.template_json);
          setTemplate(next);
          if (!draftRestoredRef.current) {
            setObservations([createEmptyObsFromTemplate(next)]);
          }
        }
      } catch {
        // Fall back to built-in default template
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !draftKey) return;
    try {
      if (!hasDraftContent(formData, step, observations)) {
        localStorage.removeItem(draftKey);
        setDraftSavedAt(null);
        return;
      }
      const savedAt = Date.now();
      const draft: ChildDraft = { step, formData, observations, activeObsIndex, savedAt };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setDraftSavedAt(savedAt);
    } catch {
      // Ignore storage errors
    }
  }, [hydrated, draftKey, step, formData, observations, activeObsIndex]);

  const clearDraft = () => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  };

  const handleSaveDraftAndExit = () => {
    if (draftKey) {
      try {
        const draft: ChildDraft = {
          step,
          formData,
          observations,
          activeObsIndex,
          savedAt: Date.now(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // ignore
      }
    }
    router.push('/dashboard/children');
  };

  const handleDiscardDraft = () => {
    clearDraft();
    draftRestoredRef.current = false;
    setDraftRestored(false);
    setDraftSavedAt(null);
    setStep(1);
    setFormData(emptyFormData());
    setObservations([createEmptyObsFromTemplate(template)]);
    setActiveObsIndex(0);
    setError('');
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError(
        language === 'id'
          ? 'Nama anak wajib diisi sebelum melanjutkan.'
          : "Child's name is mandatory before continuing.",
      );
      return;
    }
    setStep(2);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Re-entry guard: `loading` state updates asynchronously, so a fast double
    // click can pass it twice — the ref blocks the second click synchronously.
    if (loading || submittingRef.current) return;
    setError('');

    if (!formData.name.trim()) {
      setError(
        language === 'id' ? 'Nama anak wajib diisi.' : "Child's name is mandatory.",
      );
      setStep(1);
      return;
    }

    // Point the parent at exactly which mandatory fields are still missing,
    // instead of silently disabling the button.
    const lang: 'en' | 'id' = language === 'id' ? 'id' : 'en';
    const missingByObs = observations
      .map((obs, idx) => ({ idx, missing: missingRequiredFieldsForTemplate(template, obs, lang) }))
      .filter((entry) => entry.missing.length > 0);
    if (missingByObs.length > 0) {
      const details = missingByObs
        .map((entry) => `OBS ${entry.idx + 1}: ${entry.missing.join(', ')}`)
        .join(' — ');
      setError(
        lang === 'id'
          ? `Mohon lengkapi kolom wajib berikut terlebih dahulu untuk melanjutkan. ${details}`
          : `Please fill in the following mandatory fields first to proceed. ${details}`,
      );
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    const initial_observation = buildInitialObservationPayload(template, observations);

    try {
      const response = await apiClient.post<ApiResponse<Child>>('/children', {
        name: formData.name,
        birthdate: formData.birthdate,
        monthly_quota: formData.weekly_hours_target,
        environment: formData.environment,
        lang: language,
        initial_observation,
      });
      if (response.data.success && response.data.data?.id) {
        clearDraft();
        router.push(`/dashboard/children/${response.data.data.id}`);
      } else {
        setError(response.data.error || 'Failed to create child');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const apiError = e.response?.data?.error || e.response?.data?.message;
      setError(apiError || e.message || 'Failed to create child');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'parent' && user.role !== 'admin')) {
    return null;
  }

  const stepSubtitle =
    step === 1 ? t('childCreateStep1Subtitle') : t('childCreateStep2Subtitle');

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <DashboardPageHeader
          icon={UserPlus}
          title={t('addChild')}
          subtitle={stepSubtitle}
          action={
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-1 py-1">
              {([1, 2] as const).map((s) => (
                <span
                  key={s}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                    step === s ? 'bg-[#00C1B2] text-white' : 'text-white/60',
                  )}
                >
                  {language === 'id' ? `Langkah ${s}` : `Step ${s}`}
                </span>
              ))}
            </div>
          }
        />

        {/* Step progress */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E5E8EB]">
            <div
              className="h-full rounded-full bg-[#00C1B2] transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
          <span className="shrink-0 text-sm font-medium text-[#1A2B4C]/60">
            {step}/2
          </span>
        </div>

        {draftRestored && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 px-4 py-3 text-sm text-[#1A2B4C] sm:flex-row sm:items-center sm:justify-between">
            <span>
              {language === 'id'
                ? 'Draf tersimpan dipulihkan. Anda dapat melanjutkan dari tempat terakhir.'
                : 'Resumed your saved draft. You can continue where you left off.'}
            </span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="shrink-0 font-semibold text-[#00A896] hover:text-[#00C1B2] transition-colors"
            >
              {language === 'id' ? 'Mulai dari awal' : 'Start over'}
            </button>
          </div>
        )}

        <DashboardSectionCard
          title={step === 1 ? t('childCreateStep1Subtitle') : t('childCreateStep2Subtitle')}
          subtitle={
            step === 1
              ? language === 'id'
                ? 'Informasi dasar anak sebelum observasi awal'
                : 'Basic child details before the initial observation'
              : language === 'id'
                ? 'Lengkapi checklist observasi untuk program ABA'
                : 'Complete the observation checklist for the ABA program'
          }
        >
          <form onSubmit={step === 1 ? handleNext : handleCreate} className="space-y-6">
            {error && (
              <div
                ref={errorRef}
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {step === 1 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <p className="sm:col-span-2 -mb-1 text-xs text-[#1A2B4C]/60">
                  <span className="font-semibold text-red-500">*</span>{' '}
                  {language === 'id'
                    ? 'wajib diisi · kolom lain bertanda (Opsional)'
                    : 'mandatory · other fields are marked (Optional)'}
                </p>
                <div className="sm:col-span-2">
                  <Input
                    variant="brand"
                    label={
                      <>
                        {t('childName')}
                        <span className="ml-0.5 font-semibold text-red-500">*</span>
                      </>
                    }
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('enterChildName')}
                  />
                </div>

                <Input
                  variant="brand"
                  label={
                    <>
                      {t('birthdate')}
                      <span className="ml-1.5 text-xs font-normal text-[#1A2B4C]/45">
                        {language === 'id' ? '(Opsional)' : '(Optional)'}
                      </span>
                    </>
                  }
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                />

                <div>
                  <Input
                    variant="brand"
                    label={
                      <>
                        {t('weeklyHoursTarget')}
                        <span className="ml-0.5 font-semibold text-red-500">*</span>
                      </>
                    }
                    type="number"
                    min={1}
                    max={40}
                    value={formData.weekly_hours_target}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weekly_hours_target: parseInt(e.target.value, 10) || 1,
                      })
                    }
                  />
                  <p className="mt-1.5 text-sm text-[#1A2B4C]/55">{t('weeklyHoursTargetHelp')}</p>
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    variant="brand"
                    label={
                      <>
                        {t('environment')}
                        <span className="ml-1.5 text-xs font-normal text-[#1A2B4C]/45">
                          {language === 'id' ? '(Opsional)' : '(Optional)'}
                        </span>
                      </>
                    }
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    placeholder={t('environmentPlaceholder')}
                  />
                </div>
              </div>
            ) : (
              <>
                {templateLoading && (
                  <div className="h-24 animate-pulse rounded-xl bg-[#E5E8EB]/60" />
                )}

                <div className="rounded-xl border border-[#00C1B2]/20 bg-[#00C1B2]/5 px-4 py-4 text-sm text-[#1A2B4C]/80">
                  <div className="mb-2 font-montserrat font-bold text-[#1A2B4C]">
                    {t('howToFillChecklistTitle')}
                  </div>
                  <ul className="list-disc space-y-1.5 pl-5">
                    <li>
                      <strong>Frekuensi</strong>: {t('checklistHowToFrequency')}
                    </li>
                    <li>
                      <strong>Severity</strong>: {t('checklistHowToSeverity')}
                    </li>
                    <li>
                      <strong>%</strong>: {t('checklistHowToPercent')}
                    </li>
                    <li>
                      <strong>{t('attentionSpan')}</strong>: {t('checklistHowToAttention')}
                    </li>
                  </ul>
                </div>

                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {observations.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveObsIndex(idx)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/40',
                          idx === activeObsIndex
                            ? 'border-[#00C1B2] bg-[#00C1B2] text-white shadow-md shadow-[#00C1B2]/20'
                            : 'border-[#E5E8EB] bg-white text-[#1A2B4C]/70 hover:border-[#00C1B2]/30',
                        )}
                      >
                        OBS {idx + 1}
                      </button>
                    ))}
                    {observations.length < 4 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setObservations((p) => [...p, createEmptyObsFromTemplate(template)]);
                          setActiveObsIndex(observations.length);
                        }}
                      >
                        + Add OBS
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-[#1A2B4C]/50">{t('obsOptionalHelp')}</p>
                </div>

                {!templateLoading && (
                  <InitialObservationForm
                    template={template}
                    language={language === 'en' ? 'en' : 'id'}
                    obs={observations[activeObsIndex] || createEmptyObsFromTemplate(template)}
                    onChange={(next) => {
                      setObservations((prev) =>
                        prev.map((o, idx) => (idx === activeObsIndex ? next : o)),
                      );
                    }}
                    obsIndex={activeObsIndex}
                  />
                )}
              </>
            )}

            <div className="flex flex-col gap-4 border-t border-[#E5E8EB] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#1A2B4C]/50">
                {draftSavedAt
                  ? language === 'id'
                    ? `Draf disimpan otomatis ${new Date(draftSavedAt).toLocaleTimeString()}`
                    : `Draft auto-saved at ${new Date(draftSavedAt).toLocaleTimeString()}`
                  : language === 'id'
                    ? 'Perubahan disimpan otomatis sebagai draf.'
                    : 'Changes are auto-saved as a draft.'}
              </p>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (step === 1) router.back();
                    else setStep(1);
                  }}
                  disabled={loading}
                >
                  {step === 1 ? t('cancel') : t('back')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraftAndExit}
                  disabled={loading}
                >
                  {language === 'id' ? 'Simpan draf & keluar' : 'Save draft & exit'}
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={loading || (step === 2 && templateLoading)}
                >
                  {step === 1 ? t('next') : loading ? t('creating') : t('createChild')}
                </Button>
              </div>
            </div>
          </form>
        </DashboardSectionCard>
      </div>
    </DashboardLayout>
  );
}
