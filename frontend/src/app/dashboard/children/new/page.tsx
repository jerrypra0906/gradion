'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function NewChildPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, language } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    name: '',
    birthdate: '',
    weekly_hours_target: 3,
    environment: '',
  });
  const [template, setTemplate] = useState<IOTemplateJson>(defaultInitialObservationTemplate());
  const [templateLoading, setTemplateLoading] = useState(true);
  const [activeObsIndex, setActiveObsIndex] = useState(0);
  const [observations, setObservations] = useState<ObsFlatFormState[]>([
    createEmptyObsFromTemplate(defaultInitialObservationTemplate()),
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          setObservations([createEmptyObsFromTemplate(next)]);
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
              <Button type="submit" disabled={loading || (step === 2 && (!isAllObsComplete || templateLoading))}>
                {step === 1 ? t('next') : loading ? t('creating') : t('createChild')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
