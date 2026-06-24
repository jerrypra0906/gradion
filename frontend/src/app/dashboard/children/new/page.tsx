'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InitialObservationForm } from '@/components/initialObservation/InitialObservationForm';
import { apiClient, ApiResponse, Child, InitialObservationTemplate } from '@/lib/api';
import {
  IOTemplateJson,
  ObsFlatFormState,
  buildInitialObservationPayload,
  createEmptyObsFromTemplate,
  defaultInitialObservationTemplate,
  ensureTemplateShape,
  isObsCompleteForTemplate,
} from '@/lib/initialObservationTemplate';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslation } from '@/hooks/useTranslation';

// Persisted draft so a parent can leave (or switch language, which reloads the
// page) and resume the add-child flow where they left off.
const DRAFT_VERSION = 'v1';

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

// A draft is only worth saving / offering to resume once the parent has made
// real progress — otherwise a pristine form would needlessly show the
// "resumed draft" banner on the next visit.
const hasDraftContent = (
  formData: ChildDraft['formData'],
  step: 1 | 2,
  observations: ObsFlatFormState[]
) =>
  step === 2 ||
  formData.name.trim() !== '' ||
  formData.environment.trim() !== '' ||
  formData.birthdate !== '' ||
  observations.some((o) => Object.values(o).some((v) => String(v ?? '').trim() !== ''));

export default function NewChildPage() {
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

  // Draft lifecycle state.
  const draftKey = user ? `gradion-child-draft-${DRAFT_VERSION}:${user.id}` : null;
  const [hydrated, setHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftRestoredRef = useRef(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  // Restore any saved draft before the template loads, so we don't clobber it.
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

          // Preserve restored observations from the template-load effect, and only
          // surface the resume banner when the draft actually has content.
          if (hasDraftContent(restoredForm, restoredStep, restoredObs || [])) {
            draftRestoredRef.current = true;
            setDraftRestored(true);
          }
        }
      }
    } catch {
      // Ignore malformed draft; fall back to a fresh form.
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
          '/children/initial-observation-template/active'
        );
        if (cancelled) return;
        if (res.data.success && res.data.data?.template_json) {
          const next = ensureTemplateShape(res.data.data.template_json);
          setTemplate(next);
          // Only seed empty observations when there is no restored draft to preserve.
          if (!draftRestoredRef.current) {
            setObservations([createEmptyObsFromTemplate(next)]);
          }
        }
      } catch {
        // Fall back to built-in default template.
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save the draft on every change once we've hydrated from storage.
  useEffect(() => {
    if (!hydrated || !draftKey) return;
    try {
      // Don't persist a pristine form — keep storage clean and avoid a spurious
      // resume banner next time.
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
      // Ignore storage quota / serialization errors.
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

  const isAllObsComplete = useMemo(
    () => observations.every((obs) => isObsCompleteForTemplate(template, obs)),
    [observations, template]
  );

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError("Child's name is required");
      return;
    }
    setStep(2);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isAllObsComplete) {
      setError('Please complete the Initial Observation Checklist before creating the child.');
      return;
    }
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
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to create child');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'parent' && user.role !== 'admin')) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('addChild')}</h1>
          <p className="mt-2 text-gray-600">
            {step === 1 ? t('childCreateStep1Subtitle') : t('childCreateStep2Subtitle')}
          </p>
        </div>

        {draftRestored && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>
              {language === 'id'
                ? 'Draf tersimpan dipulihkan. Anda dapat melanjutkan dari tempat terakhir.'
                : 'Resumed your saved draft. You can continue where you left off.'}
            </span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="ml-4 shrink-0 font-medium underline hover:no-underline"
            >
              {language === 'id' ? 'Mulai dari awal' : 'Start over'}
            </button>
          </div>
        )}

        <div className="bg-white shadow sm:rounded-lg">
          <form onSubmit={step === 1 ? handleNext : handleCreate} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
            )}

            {step === 1 ? (
              <>
                <Input
                  label={t('childName')}
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('enterChildName')}
                />

                <Input
                  label={t('birthdate')}
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('weeklyHoursTarget')}</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formData.weekly_hours_target}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weekly_hours_target: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">{t('weeklyHoursTargetHelp')}</p>
                </div>

                <Textarea
                  label={t('environment')}
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  placeholder={t('environmentPlaceholder')}
                />
              </>
            ) : (
              <>
                {templateLoading ? (
                  <div className="text-sm text-gray-600">{t('loading')}</div>
                ) : null}

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <div className="font-medium text-gray-900 mb-1">{t('howToFillChecklistTitle')}</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>F (Frequency)</strong>: {t('checklistHowToFrequency')}
                    </li>
                    <li>
                      <strong>S (Severity)</strong>: {t('checklistHowToSeverity')}
                    </li>
                    <li>
                      <strong>%</strong>: {t('checklistHowToPercent')}
                    </li>
                    <li>
                      <strong>{t('attentionSpan')}</strong>: {t('checklistHowToAttention')}
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {observations.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveObsIndex(idx)}
                      className={`rounded-full px-3 py-1 text-sm border ${
                        idx === activeObsIndex
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
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
                  <span className="text-xs text-gray-500">{t('obsOptionalHelp')}</span>
                </div>

                <InitialObservationForm
                  template={template}
                  language={language === 'en' ? 'en' : 'id'}
                  obs={observations[activeObsIndex] || createEmptyObsFromTemplate(template)}
                  onChange={(next) => {
                    setObservations((prev) =>
                      prev.map((o, idx) => (idx === activeObsIndex ? next : o))
                    );
                  }}
                  obsIndex={activeObsIndex}
                />
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {draftSavedAt
                  ? language === 'id'
                    ? `Draf disimpan otomatis ${new Date(draftSavedAt).toLocaleTimeString()}`
                    : `Draft auto-saved at ${new Date(draftSavedAt).toLocaleTimeString()}`
                  : language === 'id'
                    ? 'Perubahan disimpan otomatis sebagai draf.'
                    : 'Changes are auto-saved as a draft.'}
              </p>
              <div className="flex justify-end space-x-4">
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
                <Button type="button" variant="outline" onClick={handleSaveDraftAndExit} disabled={loading}>
                  {language === 'id' ? 'Simpan draf & keluar' : 'Save draft & exit'}
                </Button>
                <Button type="submit" disabled={loading || (step === 2 && (!isAllObsComplete || templateLoading))}>
                  {step === 1 ? t('next') : loading ? t('creating') : t('createChild')}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
