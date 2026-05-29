'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Child } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslation } from '@/hooks/useTranslation';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sliderColorRedToGreen(value: number, min: number, max: number) {
  const t = (clamp(value, min, max) - min) / (max - min);
  // Hue 0 (red) -> 120 (green)
  const hue = lerp(0, 120, t);
  return `hsl(${hue} 80% 45%)`;
}

function sliderColorGreenToRed(value: number, min: number, max: number) {
  const t = (clamp(value, min, max) - min) / (max - min);
  // Hue 120 (green) -> 0 (red)
  const hue = lerp(120, 0, t);
  return `hsl(${hue} 80% 45%)`;
}

function rangeTrackStyle(value: number, min: number, max: number, color: string) {
  const pct = ((clamp(value, min, max) - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgb(229 231 235) ${pct}%, rgb(229 231 235) 100%)`,
    height: '8px',
    borderRadius: '9999px',
    appearance: 'none' as const,
  };
}

type ObsFormState = {
  tantrums_f: string;
  tantrums_s: string;
  self_abuse_f: string;
  self_abuse_s: string;
  aggression_f: string;
  aggression_s: string;
  self_stim_f: string;
  self_stim_s: string;
  other_major_1_f: string;
  other_major_1_s: string;
  other_major_2_f: string;
  other_major_2_s: string;
  leaves_work_area_f: string;
  leaves_work_area_s: string;
  hands_feet_restless_f: string;
  hands_feet_restless_s: string;
  attention_span_minutes: string;
  eye_contact_on_request_pct: string;
  eye_contact_name_called_pct: string;
  eye_contact_talking_listening_pct: string;
  looking_at_task_materials_pct: string;
  follows_simple_directives_with_gestures_pct: string;
  compliance_come_here_5ft_pct: string;
  compliance_come_from_across_room_pct: string;
  compliance_come_from_other_parts_house_pct: string;
  compliance_come_outside_close_confined_pct: string;
  compliance_come_outside_longer_distance_pct: string;
  compliance_sit_down_pct: string;
  compliance_stand_up_pct: string;
  compliance_hands_down_pct: string;
};

function createEmptyObs(): ObsFormState {
  return {
    tantrums_f: '',
    tantrums_s: '',
    self_abuse_f: '',
    self_abuse_s: '',
    aggression_f: '',
    aggression_s: '',
    self_stim_f: '',
    self_stim_s: '',
    other_major_1_f: '',
    other_major_1_s: '',
    other_major_2_f: '',
    other_major_2_s: '',
    leaves_work_area_f: '',
    leaves_work_area_s: '',
    hands_feet_restless_f: '',
    hands_feet_restless_s: '',
    attention_span_minutes: '',
    eye_contact_on_request_pct: '',
    eye_contact_name_called_pct: '',
    eye_contact_talking_listening_pct: '',
    looking_at_task_materials_pct: '',
    follows_simple_directives_with_gestures_pct: '',
    compliance_come_here_5ft_pct: '',
    compliance_come_from_across_room_pct: '',
    compliance_come_from_other_parts_house_pct: '',
    compliance_come_outside_close_confined_pct: '',
    compliance_come_outside_longer_distance_pct: '',
    compliance_sit_down_pct: '',
    compliance_stand_up_pct: '',
    compliance_hands_down_pct: '',
  };
}

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
  const [activeObsIndex, setActiveObsIndex] = useState(0);
  const [observations, setObservations] = useState<ObsFormState[]>([
    createEmptyObs(),
  ]);
  const [otherMajors, setOtherMajors] = useState<
    Array<{ otherMajor1: string; otherMajor2: string }>
  >([{ otherMajor1: '', otherMajor2: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requiredObsKeys: Array<keyof ObsFormState> = [
      'tantrums_f',
      'tantrums_s',
      'self_abuse_f',
      'self_abuse_s',
      'aggression_f',
      'aggression_s',
      'self_stim_f',
      'self_stim_s',
      'other_major_1_f',
      'other_major_1_s',
      'other_major_2_f',
      'other_major_2_s',
      'leaves_work_area_f',
      'leaves_work_area_s',
      'hands_feet_restless_f',
      'hands_feet_restless_s',
      'attention_span_minutes',
      'eye_contact_on_request_pct',
      'eye_contact_name_called_pct',
      'eye_contact_talking_listening_pct',
      'looking_at_task_materials_pct',
      'follows_simple_directives_with_gestures_pct',
      'compliance_come_here_5ft_pct',
      'compliance_come_from_across_room_pct',
      'compliance_come_from_other_parts_house_pct',
      'compliance_come_outside_close_confined_pct',
      'compliance_come_outside_longer_distance_pct',
      'compliance_sit_down_pct',
      'compliance_stand_up_pct',
      'compliance_hands_down_pct',
  ];

  const isObsComplete = (obs: ObsFormState) =>
    requiredObsKeys.every((k) => String(obs[k] ?? '').trim() !== '');

  const isAllObsComplete = useMemo(() => {
    return observations.every(isObsComplete);
  }, [observations]);

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

    const buildObsPayload = (obs: ObsFormState, idx: number) => {
      const labels = otherMajors[idx] || { otherMajor1: '', otherMajor2: '' };
      return {
        behaviors: {
          tantrums: { f: Number(obs.tantrums_f), s: Number(obs.tantrums_s) },
          self_abuse: { f: Number(obs.self_abuse_f), s: Number(obs.self_abuse_s) },
          aggression: { f: Number(obs.aggression_f), s: Number(obs.aggression_s) },
          self_stim: { f: Number(obs.self_stim_f), s: Number(obs.self_stim_s) },
          other_major_1: {
            label: labels.otherMajor1 || null,
            f: Number(obs.other_major_1_f),
            s: Number(obs.other_major_1_s),
          },
          other_major_2: {
            label: labels.otherMajor2 || null,
            f: Number(obs.other_major_2_f),
            s: Number(obs.other_major_2_s),
          },
          leaves_work_area: {
            f: Number(obs.leaves_work_area_f),
            s: Number(obs.leaves_work_area_s),
          },
          hands_feet_restless: {
            f: Number(obs.hands_feet_restless_f),
            s: Number(obs.hands_feet_restless_s),
          },
        },
        attention_span_minutes: Number(obs.attention_span_minutes),
        eye_contact: {
          on_request_pct: Number(obs.eye_contact_on_request_pct),
          name_called_pct: Number(obs.eye_contact_name_called_pct),
          talking_listening_pct: Number(obs.eye_contact_talking_listening_pct),
        },
        looking_at_task_materials_pct: Number(obs.looking_at_task_materials_pct),
        follows_simple_directives_with_gestures_pct: Number(
          obs.follows_simple_directives_with_gestures_pct
        ),
        compliance_pct: {
          come_here_5ft: Number(obs.compliance_come_here_5ft_pct),
          come_from_across_room: Number(obs.compliance_come_from_across_room_pct),
          come_from_other_parts_house: Number(obs.compliance_come_from_other_parts_house_pct),
          come_outside_close_confined: Number(obs.compliance_come_outside_close_confined_pct),
          come_outside_longer_distance: Number(obs.compliance_come_outside_longer_distance_pct),
          sit_down: Number(obs.compliance_sit_down_pct),
          stand_up: Number(obs.compliance_stand_up_pct),
          hands_down: Number(obs.compliance_hands_down_pct),
        },
      };
    };

    const initial_observation = {
      version: 1,
      completedAt: new Date().toISOString(),
      obs1: buildObsPayload(observations[0], 0),
      ...(observations[1] ? { obs2: buildObsPayload(observations[1], 1) } : {}),
      ...(observations[2] ? { obs3: buildObsPayload(observations[2], 2) } : {}),
      ...(observations[3] ? { obs4: buildObsPayload(observations[3], 3) } : {}),
    };

    try {
      const response = await apiClient.post<ApiResponse<Child>>('/children', {
        name: formData.name,
        birthdate: formData.birthdate,
        // Backend still stores this in `monthly_quota`; we're treating it as weekly hours target in the UI.
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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create child');
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
            {step === 1
              ? t('childCreateStep1Subtitle')
              : t('childCreateStep2Subtitle')}
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <form onSubmit={step === 1 ? handleNext : handleCreate} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('weeklyHoursTarget')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formData.weekly_hours_target}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weekly_hours_target: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {t('weeklyHoursTargetHelp')}
                  </p>
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
                        setObservations((p) => [...p, createEmptyObs()]);
                        setOtherMajors((p) => [...p, { otherMajor1: '', otherMajor2: '' }]);
                        setActiveObsIndex(observations.length);
                      }}
                    >
                      + Add OBS
                    </Button>
                  )}
                  <span className="text-xs text-gray-500">
                    {t('obsOptionalHelp')}
                  </span>
                </div>

                {(() => {
                  const obs = observations[activeObsIndex];
                  const majors = otherMajors[activeObsIndex] || { otherMajor1: '', otherMajor2: '' };
                  const setObs = (updater: (prev: ObsFormState) => ObsFormState) => {
                    setObservations((prev) =>
                      prev.map((o, idx) => (idx === activeObsIndex ? updater(o) : o))
                    );
                  };
                  const setMajors = (next: { otherMajor1: string; otherMajor2: string }) => {
                    setOtherMajors((prev) =>
                      prev.map((m, idx) => (idx === activeObsIndex ? next : m))
                    );
                  };

                  return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Behavior (F / S) — OBS {activeObsIndex + 1}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(
                        [
                          ['Tantrums', 'tantrums'],
                          ['Self-Abuse', 'self_abuse'],
                          ['Aggression', 'aggression'],
                          ['Self-stim', 'self_stim'],
                          ['Leaves Work Area/chair', 'leaves_work_area'],
                          ['Hands and Feet Restless', 'hands_feet_restless'],
                        ] as const
                      ).map(([label, key]) => (
                        <div key={key} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="text-sm font-medium text-gray-900 mb-3">{label}</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">F</label>
                              <input
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={
                                  String((obs as any)[`${key}_f`] ?? '').trim() === ''
                                    ? 1
                                    : Number((obs as any)[`${key}_f`])
                                }
                                onChange={(e) =>
                                  setObs((p) => ({ ...p, [`${key}_f`]: e.target.value } as any))
                                }
                                className="w-full"
                                style={rangeTrackStyle(
                                  String((obs as any)[`${key}_f`] ?? '').trim() === ''
                                    ? 1
                                    : Number((obs as any)[`${key}_f`]),
                                  1,
                                  5,
                                  sliderColorGreenToRed(
                                    String((obs as any)[`${key}_f`] ?? '').trim() === ''
                                      ? 1
                                      : Number((obs as any)[`${key}_f`]),
                                    1,
                                    5
                                  )
                                )}
                              />
                              <div className="mt-1 text-xs text-gray-600">
                                {String((obs as any)[`${key}_f`] ?? '').trim() === ''
                                  ? '—'
                                  : (obs as any)[`${key}_f`]}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">S</label>
                              <input
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={
                                  String((obs as any)[`${key}_s`] ?? '').trim() === ''
                                    ? 1
                                    : Number((obs as any)[`${key}_s`])
                                }
                                onChange={(e) =>
                                  setObs((p) => ({ ...p, [`${key}_s`]: e.target.value } as any))
                                }
                                className="w-full"
                                style={rangeTrackStyle(
                                  String((obs as any)[`${key}_s`] ?? '').trim() === ''
                                    ? 1
                                    : Number((obs as any)[`${key}_s`]),
                                  1,
                                  5,
                                  sliderColorGreenToRed(
                                    String((obs as any)[`${key}_s`] ?? '').trim() === ''
                                      ? 1
                                      : Number((obs as any)[`${key}_s`]),
                                    1,
                                    5
                                  )
                                )}
                              />
                              <div className="mt-1 text-xs text-gray-600">
                                {String((obs as any)[`${key}_s`] ?? '').trim() === ''
                                  ? '—'
                                  : (obs as any)[`${key}_s`]}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          Other Major Disruptive Behavior (Specify)
                        </div>
                        <input
                          type="text"
                          value={majors.otherMajor1}
                          onChange={(e) => setMajors({ ...majors, otherMajor1: e.target.value })}
                          placeholder="Specify behavior"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">F</label>
                            <input
                              type="range"
                              min={1}
                              max={5}
                              step={1}
                              value={String(obs.other_major_1_f ?? '').trim() === '' ? 1 : Number(obs.other_major_1_f)}
                              onChange={(e) =>
                                setObs((p) => ({ ...p, other_major_1_f: e.target.value }))
                              }
                              className="w-full"
                              style={rangeTrackStyle(
                                String(obs.other_major_1_f ?? '').trim() === '' ? 1 : Number(obs.other_major_1_f),
                                1,
                                5,
                                sliderColorGreenToRed(
                                  String(obs.other_major_1_f ?? '').trim() === '' ? 1 : Number(obs.other_major_1_f),
                                  1,
                                  5
                                )
                              )}
                            />
                            <div className="mt-1 text-xs text-gray-600">
                              {String(obs.other_major_1_f ?? '').trim() === '' ? '—' : obs.other_major_1_f}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">S</label>
                            <input
                              type="range"
                              min={1}
                              max={5}
                              step={1}
                              value={String(obs.other_major_1_s ?? '').trim() === '' ? 1 : Number(obs.other_major_1_s)}
                              onChange={(e) =>
                                setObs((p) => ({ ...p, other_major_1_s: e.target.value }))
                              }
                              className="w-full"
                              style={rangeTrackStyle(
                                String(obs.other_major_1_s ?? '').trim() === '' ? 1 : Number(obs.other_major_1_s),
                                1,
                                5,
                                sliderColorGreenToRed(
                                  String(obs.other_major_1_s ?? '').trim() === '' ? 1 : Number(obs.other_major_1_s),
                                  1,
                                  5
                                )
                              )}
                            />
                            <div className="mt-1 text-xs text-gray-600">
                              {String(obs.other_major_1_s ?? '').trim() === '' ? '—' : obs.other_major_1_s}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          Other Major Disruptive Behavior (Specify)
                        </div>
                        <input
                          type="text"
                          value={majors.otherMajor2}
                          onChange={(e) => setMajors({ ...majors, otherMajor2: e.target.value })}
                          placeholder="Specify behavior"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">F</label>
                            <input
                              type="range"
                              min={1}
                              max={5}
                              step={1}
                              value={String(obs.other_major_2_f ?? '').trim() === '' ? 1 : Number(obs.other_major_2_f)}
                              onChange={(e) =>
                                setObs((p) => ({ ...p, other_major_2_f: e.target.value }))
                              }
                              className="w-full"
                              style={rangeTrackStyle(
                                String(obs.other_major_2_f ?? '').trim() === '' ? 1 : Number(obs.other_major_2_f),
                                1,
                                5,
                                sliderColorGreenToRed(
                                  String(obs.other_major_2_f ?? '').trim() === '' ? 1 : Number(obs.other_major_2_f),
                                  1,
                                  5
                                )
                              )}
                            />
                            <div className="mt-1 text-xs text-gray-600">
                              {String(obs.other_major_2_f ?? '').trim() === '' ? '—' : obs.other_major_2_f}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">S</label>
                            <input
                              type="range"
                              min={1}
                              max={5}
                              step={1}
                              value={String(obs.other_major_2_s ?? '').trim() === '' ? 1 : Number(obs.other_major_2_s)}
                              onChange={(e) =>
                                setObs((p) => ({ ...p, other_major_2_s: e.target.value }))
                              }
                              className="w-full"
                              style={rangeTrackStyle(
                                String(obs.other_major_2_s ?? '').trim() === '' ? 1 : Number(obs.other_major_2_s),
                                1,
                                5,
                                sliderColorGreenToRed(
                                  String(obs.other_major_2_s ?? '').trim() === '' ? 1 : Number(obs.other_major_2_s),
                                  1,
                                  5
                                )
                              )}
                            />
                            <div className="mt-1 text-xs text-gray-600">
                              {String(obs.other_major_2_s ?? '').trim() === '' ? '—' : obs.other_major_2_s}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Attention & Eye Contact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Attention Span (Average Duration, minutes)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={obs.attention_span_minutes}
                          onChange={(e) =>
                            setObs((p) => ({ ...p, attention_span_minutes: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      {(
                        [
                          ['Eye-to-Face-Contact: looking on request (%)', 'eye_contact_on_request_pct'],
                          ['Eye-to-Face-Contact: name is called (%)', 'eye_contact_name_called_pct'],
                          ['Eye-to-Face-Contact: talking/listening (%)', 'eye_contact_talking_listening_pct'],
                          ['Looking at Task Materials (%)', 'looking_at_task_materials_pct'],
                          ['Follows Simple Directives with Gestures (%)', 'follows_simple_directives_with_gestures_pct'],
                        ] as const
                      ).map(([label, key]) => (
                        <div key={key} className="rounded-lg border border-gray-200 bg-white p-4">
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            {label}
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={(obs as any)[key]}
                            onChange={(e) => setObs((p) => ({ ...p, [key]: e.target.value } as any))}
                            className="w-full"
                            style={rangeTrackStyle(
                              String((obs as any)[key] ?? '').trim() === '' ? 0 : Number((obs as any)[key]),
                              0,
                              100,
                              sliderColorRedToGreen(
                                String((obs as any)[key] ?? '').trim() === '' ? 0 : Number((obs as any)[key]),
                                0,
                                100
                              )
                            )}
                          />
                          <div className="mt-1 text-xs text-gray-600">
                            {String((obs as any)[key] ?? '').trim() === '' ? '—' : `${(obs as any)[key]}%`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Compliance (%)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(
                        [
                          ['Come here from 5 feet away (%)', 'compliance_come_here_5ft_pct'],
                          ['Come from across room (%)', 'compliance_come_from_across_room_pct'],
                          ['Come from other parts of house (%)', 'compliance_come_from_other_parts_house_pct'],
                          ['Come when outside at close distance in confined area (%)', 'compliance_come_outside_close_confined_pct'],
                          ['Come outside at longer distance (%)', 'compliance_come_outside_longer_distance_pct'],
                          ['Sit down (%)', 'compliance_sit_down_pct'],
                          ['Stand up (%)', 'compliance_stand_up_pct'],
                          ['Hands down (%)', 'compliance_hands_down_pct'],
                        ] as const
                      ).map(([label, key]) => (
                        <div key={key} className="rounded-lg border border-gray-200 bg-white p-4">
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            {label}
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={String((obs as any)[key] ?? '').trim() === '' ? 0 : Number((obs as any)[key])}
                            onChange={(e) => setObs((p) => ({ ...p, [key]: e.target.value } as any))}
                            className="w-full"
                            style={rangeTrackStyle(
                              String((obs as any)[key] ?? '').trim() === '' ? 0 : Number((obs as any)[key]),
                              0,
                              100,
                              sliderColorRedToGreen(
                                String((obs as any)[key] ?? '').trim() === '' ? 0 : Number((obs as any)[key]),
                                0,
                                100
                              )
                            )}
                          />
                          <div className="mt-1 text-xs text-gray-600">
                            {String((obs as any)[key] ?? '').trim() === '' ? '—' : `${(obs as any)[key]}%`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                  );
                })()}
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
              <Button type="submit" disabled={loading || (step === 2 && !isAllObsComplete)}>
                {step === 1 ? t('next') : loading ? t('creating') : t('createChild')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

