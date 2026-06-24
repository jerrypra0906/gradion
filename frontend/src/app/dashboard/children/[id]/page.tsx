'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  apiClient,
  Child,
  ParentLog,
  ApiResponse,
  AbaProgramWeek,
  AbaProgramSession,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@/hooks/useTranslation';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sliderColorRedToGreen(value: number, min: number, max: number) {
  const t = (clamp(value, min, max) - min) / (max - min);
  const hue = lerp(0, 120, t);
  return `hsl(${hue} 80% 45%)`;
}

function sliderColorGreenToRed(value: number, min: number, max: number) {
  const t = (clamp(value, min, max) - min) / (max - min);
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

function mondayWeekStartYmd(d: Date) {
  const day = d.getDay(); // 0 Sun
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dayNum = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function CollapsibleSection(props: {
  heading: ReactNode;
  description?: ReactNode;
  defaultOpen?: boolean;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const { heading, description, defaultOpen = true, bodyClassName = 'px-6 py-5', children } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white shadow sm:rounded-lg mb-6 overflow-hidden">
      <button
        type="button"
        className="w-full px-6 py-4 flex items-start justify-between gap-3 text-left hover:bg-gray-50 border-b border-gray-200"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="text-left w-full">{heading}</div>
          {description ? <div className="mt-1 text-sm text-gray-600">{description}</div> : null}
        </div>
        <span className="text-gray-500 text-xl leading-none shrink-0 select-none" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? <div className={bodyClassName}>{children}</div> : null}
    </div>
  );
}

export default function ChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, language } = useTranslation();
  const [child, setChild] = useState<Child | null>(null);
  const [activityLogs, setActivityLogs] = useState<ParentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');
  const [generatingAssessment, setGeneratingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [abaWeeks, setAbaWeeks] = useState<AbaProgramWeek[]>([]);
  const [abaLoading, setAbaLoading] = useState(false);
  const [abaError, setAbaError] = useState('');
  const [abaGenerating, setAbaGenerating] = useState(false);
  const [abaModalOpen, setAbaModalOpen] = useState(false);
  const [abaUploading, setAbaUploading] = useState(false);
  const [abaActiveWeek, setAbaActiveWeek] = useState<AbaProgramWeek | null>(null);
  const [abaSessionId, setAbaSessionId] = useState<number | null>(null);
  const [abaChosenMode, setAbaChosenMode] = useState<'guided' | 'upload' | null>(null);
  const [abaExpandedProgramId, setAbaExpandedProgramId] = useState<string | null>(null);
  const [abaTranslating, setAbaTranslating] = useState(false);
  const abaLocaleSyncInFlightRef = useRef(false);
  const [abaStartProgramId, setAbaStartProgramId] = useState<string | null>(null);

  const currentWeekStart = useMemo(() => mondayWeekStartYmd(new Date()), []);
  const nextWeekStart = useMemo(() => addDaysYmd(currentWeekStart, 7), [currentWeekStart]);
  const currentWeekRow = useMemo(
    () => abaWeeks.find((w) => w.week_start.slice(0, 10) === currentWeekStart) || null,
    [abaWeeks, currentWeekStart]
  );
  const lastCompleted = useMemo(
    () => abaWeeks.find((w) => w.status === 'completed') || null,
    [abaWeeks]
  );
  const canPlanNextWeek =
    Boolean(lastCompleted) &&
    !abaWeeks.some((w) => w.week_start.slice(0, 10) === nextWeekStart) &&
    !lastCompleted?.mainstream_goal_met;

  // Auto-translate assessment when the selected language version is missing
  useEffect(() => {
    if (!child) return;
    if (generatingAssessment) return;

    const hasEn = Boolean(child.initial_assessment_report);
    const hasId = Boolean(child.initial_assessment_report_id);

    if (language === 'id' && hasEn && !hasId) {
      handleAssessmentAction('translate');
      return;
    }

    if (language === 'en' && hasId && !hasEn) {
      handleAssessmentAction('translate');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, child?.id, child?.initial_assessment_report, child?.initial_assessment_report_id]);

  // Keep weekly ABA plan language aligned with the global language selector (no per-section button)
  useEffect(() => {
    if (abaGenerating || abaLoading) return;
    if (!currentWeekRow) return;
    if (abaLocaleSyncInFlightRef.current) return;

    const planJson: any = currentWeekRow.plan_json;
    const planLang: string | undefined = planJson?.language;
    const hasPrograms = Array.isArray(planJson?.programs);
    if (!hasPrograms) return;

    const target: 'en' | 'id' = language === 'id' ? 'id' : 'en';
    if (planLang === target) return;
    // Older rows may omit `language`; assume English source and fill Indonesian when needed.
    if (!planLang && target !== 'id') return;

    void (async () => {
      abaLocaleSyncInFlightRef.current = true;
      try {
        await handleTranslateAbaWeek(currentWeekRow, target);
      } finally {
        abaLocaleSyncInFlightRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, currentWeekRow?.id, (currentWeekRow?.plan_json as any)?.language, abaGenerating, abaLoading]);

  useEffect(() => {
    if (user && params.id) {
      fetchChild();
      fetchActivityLogs();
      fetchAbaWeeks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id]);

  // Refresh activity logs when navigating back to this page
  useEffect(() => {
    const handleFocus = () => {
      if (user && params.id) {
        fetchActivityLogs();
        fetchAbaWeeks();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, params.id]);

  const fetchChild = async () => {
    try {
      const response = await apiClient.get<ApiResponse<Child>>(`/children/${params.id}`);
      if (response.data.success) {
        setChild(response.data.data!);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch child');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await apiClient.get<ApiResponse<ParentLog[]>>(
        `/parent-logs?child_id=${params.id}`
      );
      console.log('Fetched activity logs for child:', {
        childId: params.id,
        response: response.data,
        logs: response.data.data,
        firstLogCreator: response.data.data?.[0]?.creator,
        firstLogCreatorRole: response.data.data?.[0]?.creator_role,
      });
      if (response.data.success) {
        setActivityLogs(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    }
  };

  const fetchAbaWeeks = async () => {
    try {
      setAbaLoading(true);
      setAbaError('');
      const response = await apiClient.get<ApiResponse<{ weeks: AbaProgramWeek[] }>>(
        `/aba-program/children/${params.id}/weeks`
      );
      if (response.data.success) {
        setAbaWeeks(response.data.data?.weeks || []);
      } else {
        setAbaError(response.data.error || 'Failed to load program');
      }
    } catch (err: any) {
      setAbaError(err.response?.data?.error || 'Failed to load program');
    } finally {
      setAbaLoading(false);
    }
  };

  const handleGenerateAbaWeek = async (weekStartYmd: string) => {
    try {
      setAbaGenerating(true);
      setAbaError('');
      const response = await apiClient.post<ApiResponse<{ week: AbaProgramWeek }>>(
        `/aba-program/children/${params.id}/weeks/generate`,
        { week_start: weekStartYmd, lang: language === 'id' ? 'id' : 'en' }
      );
      if (response.data.success) {
        await fetchAbaWeeks();
      } else {
        setAbaError(response.data.error || 'Failed to generate program');
      }
    } catch (err: any) {
      setAbaError(err.response?.data?.error || 'Failed to generate program');
    } finally {
      setAbaGenerating(false);
    }
  };

  const handleTranslateAbaWeek = async (week: AbaProgramWeek, to: 'id' | 'en') => {
    try {
      setAbaTranslating(true);
      setAbaError('');
      const resp = await apiClient.post<ApiResponse<{ week: AbaProgramWeek }>>(
        `/aba-program/children/${params.id}/weeks/${week.id}/translate`,
        { to }
      );
      if (!resp.data.success) {
        setAbaError(resp.data.error || 'Failed to translate program');
        return;
      }
      await fetchAbaWeeks();
    } catch (err: any) {
      setAbaError(err.response?.data?.error || 'Failed to translate program');
    } finally {
      setAbaTranslating(false);
    }
  };

  const resetAbaModal = () => {
    setAbaModalOpen(false);
    setAbaActiveWeek(null);
    setAbaSessionId(null);
    setAbaChosenMode(null);
    setAbaUploading(false);
    setAbaStartProgramId(null);
  };

  const openAbaStartModal = (week: AbaProgramWeek, programId?: string | null) => {
    setAbaActiveWeek(week);
    setAbaSessionId(null);
    setAbaChosenMode(null);
    setAbaStartProgramId(programId || null);
    setAbaModalOpen(true);
  };

  const createAbaSession = async (week: AbaProgramWeek, mode: 'guided' | 'upload') => {
    const response = await apiClient.post<ApiResponse<{ session: AbaProgramSession }>>(
      `/aba-program/children/${params.id}/weeks/${week.id}/sessions`,
      { mode }
    );
    if (!response.data.success || !response.data.data?.session) {
      throw new Error(response.data.error || 'Failed to start session');
    }
    return response.data.data.session;
  };

  const handleChooseAbaMode = async (mode: 'guided' | 'upload') => {
    if (!child || !abaActiveWeek) return;
    try {
      setAbaError('');
      setAbaChosenMode(mode);
      const session = await createAbaSession(abaActiveWeek, mode);
      setAbaSessionId(session.id);
      if (mode === 'guided') {
        resetAbaModal();
        router.push(
          `/dashboard/children/${child.id}/aba-program?weekId=${abaActiveWeek.id}&sessionId=${session.id}${
            abaStartProgramId ? `&programId=${encodeURIComponent(abaStartProgramId)}` : ''
          }`
        );
      }
    } catch (err: any) {
      setAbaError(err.message || err.response?.data?.error || 'Failed to start session');
    }
  };

  const handleUploadTherapyNotes = async (file: File) => {
    if (!child || !abaActiveWeek || !abaSessionId) return;
    try {
      setAbaUploading(true);
      setAbaError('');
      const fd = new FormData();
      fd.append('file', file);
      const response = await apiClient.post<
        ApiResponse<{ session: AbaProgramSession; ocr: unknown; tokens_used: number }>
      >(
        `/aba-program/children/${child.id}/weeks/${abaActiveWeek.id}/sessions/${abaSessionId}/upload-ocr`,
        fd
      );
      if (!response.data.success) {
        setAbaError(response.data.error || 'Upload failed');
        return;
      }
      await fetchAbaWeeks();
      resetAbaModal();
    } catch (err: any) {
      setAbaError(err.response?.data?.error || 'Upload failed');
    } finally {
      setAbaUploading(false);
    }
  };

  const handleLinkTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkMessage('');
    if (!linkEmail) {
      setLinkMessage('Please enter therapist email');
      return;
    }

    try {
      setLinking(true);
      const response = await apiClient.post<ApiResponse<{ message?: string }>>(
        `/children/${params.id}/link-therapist`,
        { therapist_email: linkEmail }
      );

      if (response.data.success) {
        setLinkMessage(response.data.data?.message || t('therapistLinkedOrInvitedSuccess'));
        setLinkEmail('');
        // Refresh child to show updated therapists
        await fetchChild();
      } else {
        setLinkMessage(response.data.error || 'Failed to link therapist');
      }
    } catch (err: any) {
      setLinkMessage(err.response?.data?.error || 'Failed to link therapist');
    } finally {
      setLinking(false);
    }
  };

  const handleAssessmentAction = async (mode: 'generate' | 'translate') => {
    try {
      setGeneratingAssessment(true);
      setAssessmentError('');
      const response = await apiClient.post<ApiResponse<{ child: Child }>>(
        `/children/${params.id}/initial-assessment?lang=${language}&mode=${mode}`,
        {}
      );
      if (response.data.success && response.data.data?.child) {
        setChild(response.data.data.child);
      } else {
        setAssessmentError(response.data.error || 'Failed to generate assessment');
      }
    } catch (err: any) {
      setAssessmentError(err.response?.data?.error || 'Failed to generate assessment');
    } finally {
      setGeneratingAssessment(false);
    }
  };

  const sanitizeAssessmentMd = (md: string) => {
    // Some generated reports may include a "Prepared by ..." line. Hide it in the UI.
    const lines = md.split('\n');
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^prepared by\b/i.test(trimmed)) return false;
      if (/^disiapkan oleh\b/i.test(trimmed)) return false;
      return true;
    });
    return filtered.join('\n').trim();
  };

  const renderPrettyAssessment = (md: string) => (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h2 className="text-xl font-semibold text-gray-900" {...props} />,
          h2: (props) => <h3 className="text-lg font-semibold text-gray-900" {...props} />,
          h3: (props) => <h4 className="text-base font-semibold text-gray-900" {...props} />,
          p: (props) => <p className="text-sm text-gray-700 leading-6" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="border-l-4 border-blue-200 bg-blue-50 px-4 py-3 text-sm text-gray-700 rounded"
              {...props}
            />
          ),
          hr: () => <div className="my-4 h-px w-full bg-gray-200" />,
          strong: (props) => <strong className="font-semibold text-gray-900" {...props} />,
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" {...props} />
            </div>
          ),
          th: (props) => <th className="text-left text-xs text-gray-600 p-2" {...props} />,
          td: (props) => <td className="text-sm text-gray-700 p-2 align-top" {...props} />,
          ul: (props) => <ul className="list-disc pl-5 text-sm text-gray-700" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5 text-sm text-gray-700" {...props} />,
          li: (props) => <li className="my-1" {...props} />,
        }}
      >
        {sanitizeAssessmentMd(md)}
      </ReactMarkdown>
    </div>
  );

  const renderChecklist = (initialObservation: any) => {
    const obs1 = initialObservation?.obs1;
    if (!obs1) return null;

    const behaviors = obs1.behaviors || {};
    const rows: Array<{ label: string; f?: number; s?: number }> = [
      { label: t('checklistTantrums'), ...(behaviors.tantrums || {}) },
      { label: t('checklistSelfAbuse'), ...(behaviors.self_abuse || {}) },
      { label: t('checklistAggression'), ...(behaviors.aggression || {}) },
      { label: t('checklistSelfStim'), ...(behaviors.self_stim || {}) },
      {
        label: `${t('checklistOtherMajorDisruptive')}: ${behaviors.other_major_1?.label || '—'}`,
        ...(behaviors.other_major_1 || {}),
      },
      {
        label: `${t('checklistOtherMajorDisruptive')}: ${behaviors.other_major_2?.label || '—'}`,
        ...(behaviors.other_major_2 || {}),
      },
      { label: t('checklistLeavesWorkArea'), ...(behaviors.leaves_work_area || {}) },
      { label: t('checklistHandsFeetRestless'), ...(behaviors.hands_feet_restless || {}) },
    ];

    const eye = obs1.eye_contact || {};
    const compliance = obs1.compliance_pct || {};

    const pctRow = (label: string, value: any) => {
      const has = Number.isFinite(value);
      const v = has ? clamp(Number(value), 0, 100) : 0;
      const color = sliderColorRedToGreen(v, 0, 100);
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-700">{label}</div>
            <div className="text-sm font-semibold text-gray-900">{has ? `${v}%` : '—'}</div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            disabled
            value={v}
            className="w-full cursor-default"
            style={rangeTrackStyle(v, 0, 100, color)}
          />
        </div>
      );
    };

    const fsCell = (value: any) => {
      const has = Number.isFinite(value);
      const v = has ? clamp(Number(value), 1, 5) : 1;
      const color = sliderColorGreenToRed(v, 1, 5);
      return (
        <div className="min-w-[72px]">
          <div className="text-sm text-gray-900">{has ? v : '—'}</div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            disabled
            value={v}
            className="w-full cursor-default"
            style={rangeTrackStyle(v, 1, 5, color)}
          />
        </div>
      );
    };

    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('checklistBehaviorObs1')}</h3>
            <p className="text-xs text-gray-600">{t('checklistFsHint')}</p>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-[520px] w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">{t('checklistBehaviorCol')}</th>
                  <th className="py-2 pr-4 w-20">{t('checklistFrequencyCol')}</th>
                  <th className="py-2 pr-4 w-20">{t('checklistSeverityCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td className="py-2 pr-4 text-gray-900">{r.label}</td>
                    <td className="py-2 pr-4">{fsCell(r.f)}</td>
                    <td className="py-2 pr-4">{fsCell(r.s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">{t('checklistAttentionTitle')}</div>
            <div className="text-sm text-gray-700">
              {t('checklistAttentionSpanAvg')}: {' '}
              <span className="font-semibold text-gray-900">
                {obs1.attention_span_minutes ?? '—'} {language === 'id' ? 'menit' : 'min'}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">{t('checklistEyeContactTitle')}</div>
            <div className="space-y-2">
              {pctRow(t('checklistLookingOnRequest'), eye.on_request_pct)}
              {pctRow(t('checklistLookingNameCalled'), eye.name_called_pct)}
              {pctRow(t('checklistLookingTalkingListening'), eye.talking_listening_pct)}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">{t('checklistEngagementTitle')}</div>
            <div className="space-y-2">
              {pctRow(t('checklistLookingAtTaskMaterials'), obs1.looking_at_task_materials_pct)}
              {pctRow(t('checklistFollowsSimpleDirectives'), obs1.follows_simple_directives_with_gestures_pct)}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">{t('checklistComplianceTitle')}</div>
            <div className="space-y-2">
              {pctRow(t('checklistComeHere5ft'), compliance.come_here_5ft)}
              {pctRow(t('checklistComeAcrossRoom'), compliance.come_from_across_room)}
              {pctRow(t('checklistComeOtherPartsHouse'), compliance.come_from_other_parts_house)}
              {pctRow(t('checklistComeOutsideClose'), compliance.come_outside_close_confined)}
              {pctRow(t('checklistComeOutsideLonger'), compliance.come_outside_longer_distance)}
              {pctRow(t('checklistSitDown'), compliance.sit_down)}
              {pctRow(t('checklistStandUp'), compliance.stand_up)}
              {pctRow(t('checklistHandsDown'), compliance.hands_down)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            {t('loading')}...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !child) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Child not found'}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const quotaPercentage = (child.used_sessions / child.monthly_quota) * 100;
  const assessmentForLanguage =
    language === 'id' ? child.initial_assessment_report_id : child.initial_assessment_report;
  const englishAssessment = child.initial_assessment_report;
  // Parents only see AI content after an admin approves it.
  const isParentViewer = user.role === 'parent';
  const assessmentPending = isParentViewer && Boolean(child.has_pending_assessment);

  // (moved above) current week memo + ABA auto-translate effect

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            ← {t('back')}
          </Button>
        </div>

        <CollapsibleSection
          heading={<span className="text-3xl font-bold text-gray-900">{child.name}</span>}
          bodyClassName="px-6 py-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('birthdate')}</h3>
              <p className="mt-1 text-lg text-gray-900">
                {child.birthdate ? new Date(child.birthdate).toLocaleDateString() : t('nA')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">{t('weeklyHoursTarget')}</h3>
              <p className="mt-1 text-lg text-gray-900">
                {child.monthly_quota} {language === 'id' ? 'jam/minggu' : 'hours/week'}
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    quotaPercentage >= 100
                      ? 'bg-red-600'
                      : quotaPercentage >= 80
                      ? 'bg-yellow-600'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
            {child.environment && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">{t('parentNotes')}</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-1">{t('environment')}</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{child.environment}</div>
                  </div>
                </div>
              </div>
            )}
            {child.parent && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Parent</h3>
                <p className="mt-1 text-lg text-gray-900">{child.parent.name}</p>
                <p className="text-sm text-gray-500">{child.parent.email}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Initial Observation Checklist */}
        {child.initial_observation && (
          <CollapsibleSection
            heading={
              <span className="text-xl font-bold text-gray-900">{t('initialObservationChecklist')}</span>
            }
            description={t('initialObservationCapturedSubtitle')}
            bodyClassName="px-6 py-4"
          >
              {renderChecklist(child.initial_observation)}

              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{t('aiInitialAssessment')}</h3>
                    <p className="text-xs text-gray-600">
                      {t('aiAssessmentSubtitle')}
                    </p>
                  </div>
                  {/* No manual regenerate: auto-translate when switching to ID.
                      Keep a manual generate only when no report exists at all. */}
                  {!assessmentForLanguage && !assessmentPending && (
                    <div className="flex items-center gap-2">
                      {language === 'id' && englishAssessment ? (
                        <div className="text-xs font-medium text-gray-700">
                          {generatingAssessment ? t('translating') : t('translating')}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAssessmentAction('generate')}
                          disabled={generatingAssessment}
                        >
                          {generatingAssessment ? `${t('loading')}...` : t('generate')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {assessmentError && (
                  <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {assessmentError}
                  </div>
                )}

                {assessmentPending && (
                  <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {language === 'id'
                      ? 'Laporan AI sedang menunggu peninjauan admin. Laporan akan terlihat setelah disetujui.'
                      : 'This AI report is awaiting admin review. It will appear once approved.'}
                  </div>
                )}

                {assessmentForLanguage && (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-white p-4">
                    {renderPrettyAssessment(assessmentForLanguage)}
                  </div>
                )}
              </div>
          </CollapsibleSection>
        )}

        {/* Weekly ABA Program */}
        <CollapsibleSection
          heading={<span className="text-xl font-bold text-gray-900">{t('abaProgramTitle')}</span>}
          description={t('abaProgramSubtitle')}
          bodyClassName="px-6 py-4 space-y-4"
        >
            {abaError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {abaError}
              </div>
            )}

            {!assessmentForLanguage && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t('abaProgramNeedAssessment')}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">{t('abaProgramWeekOf')}:</span>{' '}
                <span className="font-mono">{currentWeekStart}</span>
                {abaLoading && <span className="ml-2 text-xs text-gray-500">({t('loading')}…)</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleGenerateAbaWeek(currentWeekStart)}
                  disabled={abaGenerating || !assessmentForLanguage}
                >
                  {abaGenerating ? t('abaProgramGenerating') : t('abaProgramGenerate')}
                </Button>
                {canPlanNextWeek && (
                  <Button size="sm" variant="outline" onClick={() => handleGenerateAbaWeek(nextWeekStart)}>
                    {t('abaProgramNextWeek')}
                  </Button>
                )}
              </div>
            </div>

            {currentWeekRow?.mainstream_goal_met && (
              <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                {t('abaProgramMainstreamNote')}
              </div>
            )}

            {!currentWeekRow && (
              <p className="text-sm text-gray-600">{t('abaProgramNoWeekYet')}</p>
            )}

            {currentWeekRow && isParentViewer && currentWeekRow.review_status !== 'approved' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {language === 'id'
                  ? 'Program mingguan ini sedang menunggu peninjauan admin. Program akan terlihat setelah disetujui.'
                  : 'This weekly program is awaiting admin review. It will appear once approved.'}
              </div>
            )}

            {currentWeekRow && !(isParentViewer && currentWeekRow.review_status !== 'approved') && (
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {t('status')}:{' '}
                      <span className="font-mono text-gray-800">{currentWeekRow.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => openAbaStartModal(currentWeekRow)}>
                      {t('abaProgramStart')}
                    </Button>
                  </div>
                </div>

                {Array.isArray((currentWeekRow.plan_json as any)?.programs) && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">
                      {language === 'id' ? 'Program' : 'Programs'}
                    </div>
                    <ul className="space-y-2">
                      {(() => {
                        const sessions = currentWeekRow.sessions || [];
                        const counts = new Map<string, number>();

                        for (const s of sessions) {
                          if (s.status !== 'completed') continue;

                          const guided: any = s.guided_results_json;
                          const guidedActs = Array.isArray(guided?.activities) ? guided.activities : [];
                          for (const a of guidedActs) {
                            const pid = a?.linked_program_id ? String(a.linked_program_id) : '';
                            if (!pid) continue;
                            counts.set(pid, (counts.get(pid) || 0) + 1);
                          }

                          const ocr: any = s.ocr_parsed_json;
                          const matches = Array.isArray(ocr?.matched_program_ids)
                            ? ocr.matched_program_ids
                            : [];
                          for (const m of matches) {
                            const pid = m?.program_id ? String(m.program_id) : '';
                            const conf = Number(m?.confidence ?? 0);
                            if (!pid || conf < 0.5) continue;
                            counts.set(pid, (counts.get(pid) || 0) + 1);
                          }
                        }

                        return (currentWeekRow.plan_json as any).programs.map((p: any) => {
                          const pid = String(p.id);
                          const expanded = abaExpandedProgramId === pid;
                          const executed = counts.get(pid) || 0;
                          const demoUrl =
                            typeof p.demo_video_url === 'string' && p.demo_video_url.trim()
                              ? p.demo_video_url.trim()
                              : '';
                          return (
                            <li key={pid} className="rounded-md border border-gray-200 bg-white">
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start justify-between gap-3"
                                onClick={() =>
                                  setAbaExpandedProgramId((cur) => (cur === pid ? null : pid))
                                }
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                                  {p.domain && (
                                    <div className="mt-0.5 text-xs text-gray-600">{p.domain}</div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <div className="text-xs font-medium text-gray-700">
                                    {language === 'id' ? 'Dilakukan' : 'Executed'}: {executed}
                                  </div>
                                  <span className="text-gray-400 text-sm" aria-hidden>
                                    {expanded ? '▾' : '▸'}
                                  </span>
                                </div>
                              </button>
                              {expanded && (
                                <div className="px-3 pb-3 text-sm text-gray-700 space-y-3 border-t border-gray-100">
                                  {p.rationale && (
                                    <div className="text-xs text-gray-700 pt-2">{p.rationale}</div>
                                  )}
                                  {Array.isArray(p.targets) && p.targets.length > 0 && (
                                    <div className="text-xs">
                                      <div className="font-semibold text-gray-900">
                                        {language === 'id' ? 'Target' : 'Targets'}
                                      </div>
                                      <div className="mt-1 text-gray-700">
                                        {(p.targets as string[]).join(' · ')}
                                      </div>
                                    </div>
                                  )}
                                  {Array.isArray(p.materials) && p.materials.length > 0 && (
                                    <div className="text-xs">
                                      <div className="font-semibold text-gray-900">
                                        {language === 'id' ? 'Alat' : 'Materials'}
                                      </div>
                                      <div className="mt-1 text-gray-700">
                                        {(p.materials as string[]).join(' · ')}
                                      </div>
                                    </div>
                                  )}
                                  {demoUrl ? (
                                    <div className="text-xs space-y-1">
                                      <div className="font-semibold text-gray-900">
                                        {t('abaProgramVideoTitle')}
                                      </div>
                                      <a
                                        href={demoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-700 underline break-all"
                                      >
                                        {demoUrl}
                                      </a>
                                    </div>
                                  ) : null}
                                  <Button size="sm" onClick={() => openAbaStartModal(currentWeekRow, pid)}>
                                    {t('abaProgramStartThisTask')}
                                  </Button>
                                </div>
                              )}
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  </div>
                )}
              </div>
            )}
        </CollapsibleSection>

        {abaModalOpen && abaActiveWeek && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('abaProgramStart')}</h3>
                  <p className="mt-1 text-sm text-gray-600">{t('abaProgramChooseMode')}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-800"
                  onClick={resetAbaModal}
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => handleChooseAbaMode('guided')}
                  className="rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50"
                >
                  <div className="text-sm font-semibold text-gray-900">{t('abaProgramModeGuided')}</div>
                  <div className="mt-1 text-xs text-gray-600">{t('abaProgramModeGuidedHint')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChooseAbaMode('upload')}
                  className="rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50"
                >
                  <div className="text-sm font-semibold text-gray-900">{t('abaProgramModeUpload')}</div>
                  <div className="mt-1 text-xs text-gray-600">{t('abaProgramModeUploadHint')}</div>
                </button>
              </div>

              {abaChosenMode === 'upload' && abaSessionId && (
                <div className="mt-4 space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <a
                    className="text-sm font-medium text-blue-800 underline"
                    href="/therapy-notes-mr-andrew.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('abaProgramDownloadPdf')}
                  </a>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('abaProgramUploadPhoto')}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={abaUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadTherapyNotes(f);
                      }}
                    />
                    {abaUploading && (
                      <div className="mt-2 text-xs text-blue-900">{t('abaProgramUploading')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Logs */}
        <CollapsibleSection
          heading={<span className="text-xl font-bold text-gray-900">{t('activityLogHistory')}</span>}
          bodyClassName="px-6 py-4"
        >
            {(user.role === 'parent' || user.role === 'therapist' || user.role === 'admin') && (
              <div className="flex justify-end mb-4">
                <Link href={`/dashboard/logs/new?childId=${child.id}`}>
                  <Button size="sm">{t('newActivityLog')}</Button>
                </Link>
              </div>
            )}
            {activityLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('noActivityLogsYet')}</p>
            ) : (
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <Link
                    key={log.id}
                    href={`/dashboard/logs/${log.id}/review`}
                    className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={(e) => {
                      console.log('Activity log clicked:', log.id, log);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="font-medium text-gray-900">
                            {new Date(log.log_date).toLocaleDateString()}
                          </p>
                          <span className="text-xs text-gray-500">
                            ·{' '}
                            {(log.duration_hours ?? 3) % 1 === 0
                              ? (log.duration_hours ?? 3)
                              : Number((log.duration_hours ?? 3).toFixed(2))}{' '}
                            h
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.status === 'approved' ? 'bg-green-100 text-green-800' :
                            log.status === 'flagged' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {t('createdByLabel')}: <span className="font-medium">
                            {log.creator?.name || (log.creator_role === 'parent' ? 'Parent' : log.creator_role === 'therapist' ? 'Therapist' : 'Unknown')}
                          </span>
                          {log.creator_role && (
                            <span className="text-xs text-gray-500 ml-1">({log.creator_role})</span>
                          )}
                        </p>
                        {log.skills_practiced && log.skills_practiced.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Skills Practiced:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {log.skills_practiced.map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                >
                                  {skill.name} ({skill.rating}/5)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.activities && (
                          <p className="text-sm text-gray-600 mt-2">{log.activities}</p>
                        )}
                        {log.therapist_comment && (
                          <div className="mt-2 p-2 bg-blue-50 rounded">
                            <p className="text-xs font-medium text-blue-900">Review Comment:</p>
                            <p className="text-sm text-blue-800">{log.therapist_comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </CollapsibleSection>
      </div>
    </DashboardLayout>
  );
}

