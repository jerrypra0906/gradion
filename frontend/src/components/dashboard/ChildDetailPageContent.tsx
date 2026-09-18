'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  Gauge,
  Pencil,
  Plus,
  Sparkles,
  User,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { DashboardCollapsibleSection } from '@/components/dashboard/DashboardCollapsibleSection';
import { ActivityLogEntryBody } from '@/components/dashboard/ActivityLogEntryBody';
import { getCreatorBadgeClass, getLogStatusBadgeClass } from '@/components/dashboard/dashboardBadges';
import {
  apiClient,
  Child,
  ParentLog,
  ApiResponse,
  AbaProgramWeek,
  AbaProgramSession,
} from '@/lib/api';
import {
  FREQUENCY_CHOICES,
  SEVERITY_CHOICES,
  describeFrequency,
  describePercent,
  describeSeverity,
  labelForChoice,
} from '@/lib/initialObservationTemplate';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}





function ymdOf(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
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

function formatChildAgeYears(birthdate: string | undefined) {
  if (!birthdate) return null;
  return Math.floor(
    (Date.now() - new Date(birthdate).getTime()) / (1000 * 60 * 60 * 24 * 365),
  );
}


/**
 * Practice time as a parent says it — "50 menit dari 3 jam minggu ini" — not
 * "0.83/3h". The stat cards were reading like a developer console.
 */
function humanHours(h: number, language: string): string {
  const mins = Math.round(h * 60);
  if (mins < 60) return language === 'id' ? `${mins} menit` : `${mins} min`;
  const whole = Math.floor(mins / 60);
  const rest = mins % 60;
  const hourWord = language === 'id' ? 'jam' : whole === 1 ? 'hour' : 'hours';
  if (rest === 0) return `${whole} ${hourWord}`;
  return language === 'id' ? `${whole} jam ${rest} menit` : `${whole}h ${rest}m`;
}

/** "2026-06-29" → "29 Jun". Parents do not read ISO dates. */
function humanYmd(ymd: string | null, language: string): string {
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function quotaBarColor(percentage: number) {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-[#FFB900]';
  return 'bg-[#00C1B2]';
}

export function ChildDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Dashboard's "Weekly home program (ABA)" action deep-links here to start it.
  const startProgramParam = searchParams.get('startProgram');
  const autoStartProgram = startProgramParam === '1' || startProgramParam === 'print';
  /** The dashboard's "Pakai lembar cetak" link goes straight to the paper path. */
  const autoStartPrint = startProgramParam === 'print';
  const autoStartHandledRef = useRef(false);
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
  const [maintenanceMenuOpen, setMaintenanceMenuOpen] = useState(false);
  const [confirmNewProgram, setConfirmNewProgram] = useState(false);
  const [showGateRule, setShowGateRule] = useState(false);
  const [abaExpandedProgramId, setAbaExpandedProgramId] = useState<string | null>(null);
  const [abaTranslating, setAbaTranslating] = useState(false);
  const abaLocaleSyncInFlightRef = useRef(false);
  const abaAutoGenAttemptedRef = useRef(false);
  const [abaStartProgramId, setAbaStartProgramId] = useState<string | null>(null);
  const [expandedPrevWeekId, setExpandedPrevWeekId] = useState<number | null>(null);
  // Behavior (OBS 1) editing — only while no assessment/ABA program exists yet.
  const [editingBehaviors, setEditingBehaviors] = useState(false);
  const [behaviorDraft, setBehaviorDraft] = useState<
    Record<string, { f: number; s: number; label?: string | null }>
  >({});
  const [behaviorSaving, setBehaviorSaving] = useState(false);
  const [behaviorError, setBehaviorError] = useState('');
  const [behaviorSaved, setBehaviorSaved] = useState(false);
  // Delete / deactivate / reactivate
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  // Weekly hours target editing (parent owner or admin)
  const [targetEditOpen, setTargetEditOpen] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetBusy, setTargetBusy] = useState(false);
  const [targetError, setTargetError] = useState('');

  const todayYmd = useMemo(() => ymdOf(new Date()), []);
  // A program runs 7 days from the day it was generated and stays visible
  // until the parent generates the next one. The newest week is "current".
  const currentWeekRow = useMemo(() => abaWeeks[0] || null, [abaWeeks]);
  const currentWeekStartYmd = currentWeekRow
    ? String(currentWeekRow.week_start).slice(0, 10)
    : null;
  const currentWeekEndYmd = currentWeekStartYmd ? addDaysYmd(currentWeekStartYmd, 6) : null;
  const currentWeekExpired = Boolean(currentWeekEndYmd && todayYmd > currentWeekEndYmd);
  // The current program stays active until a NEW one is generated, even past
  // its period end. Generating a new program is gated on recorded practice
  // (computed server-side): avg >= 75% with every program run >= 3x, or
  // avg < 75% with every program run >= 6x (old programs then carry over).
  const progressGate = currentWeekRow?.program_progress || null;
  const isAdminViewer = user?.role === 'admin';
  const canGenerateNewProgram =
    !currentWeekRow || isAdminViewer || Boolean(progressGate?.can_generate_new);
  const newProgramIsSameDay = Boolean(currentWeekRow) && currentWeekStartYmd === todayYmd;
  const previousWeeks = useMemo(() => abaWeeks.slice(1), [abaWeeks]);

  /**
   * A guided session left in progress with trials already recorded, and where
   * it stopped — so an interrupted session is something to pick up rather than
   * something that silently vanished.
   */
  const resumableSession = useMemo(() => {
    const sessions = currentWeekRow?.sessions || [];
    const open = sessions
      .filter((s) => s.mode === 'guided' && s.status === 'in_progress')
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
    if (!open) return null;
    const activities = (open.guided_results_json as { activities?: any[] } | null)?.activities;
    if (!Array.isArray(activities)) return null;
    const total = activities.length;
    let taskIdx = -1;
    let trials = 0;
    activities.forEach((a, i) => {
      const count = (Array.isArray(a?.trial_sets) ? a.trial_sets : []).reduce(
        (sum: number, s: any) => sum + (Number(s?.trial_count) || 0),
        0,
      );
      if (count > 0 || a?.finished) {
        taskIdx = i;
        if (count > 0) trials = count;
      }
    });
    if (taskIdx < 0) return null;
    const label =
      language === 'id'
        ? `Tugas ${taskIdx + 1}/${total}, trial ${trials}`
        : `Task ${taskIdx + 1}/${total}, trial ${trials}`;
    return { session: open, label };
  }, [currentWeekRow, language]);

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
        fetchChild();
        fetchActivityLogs();
        fetchAbaWeeks();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, params.id]);

  // Backfill: assessment may exist (incl. pending admin review) but the first ABA week was never created.
  useEffect(() => {
    if (!child || !user || loading || abaLoading || abaGenerating) return;
    if (abaWeeks.length > 0) return;

    const localizedAssessment =
      language === 'id' ? child.initial_assessment_report_id : child.initial_assessment_report;
    const hasAssessmentForAba =
      Boolean(localizedAssessment) || Boolean(child.has_pending_assessment);
    if (!hasAssessmentForAba) return;
    if (abaAutoGenAttemptedRef.current) return;

    abaAutoGenAttemptedRef.current = true;
    void handleGenerateAbaWeek(todayYmd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    child?.id,
    child?.has_pending_assessment,
    child?.initial_assessment_report,
    child?.initial_assessment_report_id,
    abaWeeks.length,
    abaLoading,
    abaGenerating,
    loading,
    todayYmd,
    language,
    user?.id,
  ]);

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
        `/aba-program/children/${params.id}/weeks?lang=${language === 'id' ? 'id' : 'en'}`
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

  // Arriving from the dashboard's weekly-program action: open the "start
  // program" chooser once the week has loaded, then drop the flag from the URL
  // so a refresh or back-navigation doesn't reopen it.
  useEffect(() => {
    if (!autoStartProgram || autoStartHandledRef.current) return;
    // `child` is required to start a session; the weeks request often wins the
    // race, and without this the auto-start silently no-opped and left the
    // parent sitting on the child page.
    if (abaLoading || !currentWeekRow || !child) return;
    const isRunnable =
      user?.role !== 'parent' || currentWeekRow.review_status === 'approved';
    if (!isRunnable) return;

    autoStartHandledRef.current = true;
    if (autoStartPrint) openAbaPrintFlow(currentWeekRow);
    else openAbaStartModal(currentWeekRow);
    // Drop the flag from the URL without a Next.js navigation — router.replace
    // re-fetches the route and tears down the modal state we just set.
    try {
      window.history.replaceState({}, '', `/dashboard/children/${params.id}`);
    } catch {
      // Non-fatal: the flag just stays in the URL.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartProgram, abaLoading, currentWeekRow?.id, child?.id]);

  /**
   * "Mulai program" used to open a modal asking how to run it — two neutral
   * cards, no default, the previous answer forgotten — every single day, when
   * the answer is the same one the family gave yesterday. Go straight into the
   * guided session; the printed sheet stays reachable as a quiet link, and
   * whichever path the parent used last becomes the default.
   */
  const openAbaStartModal = (week: AbaProgramWeek, programId?: string | null) => {
    let remembered: 'guided' | 'upload' = 'guided';
    try {
      if (window.localStorage.getItem(`gradion-aba-mode:${params.id}`) === 'upload') {
        remembered = 'upload';
      }
    } catch {
      // Blocked storage — guided is the right default anyway.
    }
    setAbaActiveWeek(week);
    setAbaSessionId(null);
    setAbaChosenMode(null);
    setAbaStartProgramId(programId || null);
    if (remembered === 'upload') {
      setAbaModalOpen(true);
      void handleChooseAbaMode('upload', week, programId || null);
      return;
    }
    void handleChooseAbaMode('guided', week, programId || null);
  };

  /** Explicitly asking for the printed sheet, from the quiet link. */
  const openAbaPrintFlow = (week: AbaProgramWeek, programId?: string | null) => {
    setAbaActiveWeek(week);
    setAbaSessionId(null);
    setAbaChosenMode(null);
    setAbaStartProgramId(programId || null);
    setAbaModalOpen(true);
    void handleChooseAbaMode('upload', week, programId || null);
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

  const handleChooseAbaMode = async (
    mode: 'guided' | 'upload',
    week?: AbaProgramWeek | null,
    programId?: string | null,
  ) => {
    // The week/programId are passed in when starting straight from a button:
    // the matching state setters have not committed yet at that point.
    const activeWeek = week ?? abaActiveWeek;
    const activeProgramId = programId !== undefined ? programId : abaStartProgramId;
    if (!child || !activeWeek) return;
    try {
      setAbaError('');
      setAbaChosenMode(mode);
      const session = await createAbaSession(activeWeek, mode);
      setAbaSessionId(session.id);
      try {
        window.localStorage.setItem(`gradion-aba-mode:${params.id}`, mode);
      } catch {
        // Non-fatal: the default just stays "guided" next time.
      }
      if (mode === 'guided') {
        resetAbaModal();
        router.push(
          `/dashboard/children/${child.id}/aba-program?weekId=${activeWeek.id}&sessionId=${session.id}${
            activeProgramId ? `&programId=${encodeURIComponent(activeProgramId)}` : ''
          }`
        );
      }
    } catch (err: any) {
      setAbaError(err.message || err.response?.data?.error || 'Failed to start session');
      setAbaModalOpen(true);
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
      await fetchChild();
      await fetchActivityLogs();
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
        // First time: when the assessment is generated and the child has no
        // weekly ABA program yet, also generate this week's program so the
        // family gets both at once. Best-effort — failures surface in the ABA
        // section and don't undo the assessment.
        if (mode === 'generate' && abaWeeks.length === 0) {
          await handleGenerateAbaWeek(todayYmd);
        }
      } else {
        setAssessmentError(response.data.error || 'Failed to generate assessment');
      }
    } catch (err: any) {
      setAssessmentError(err.response?.data?.error || 'Failed to generate assessment');
    } finally {
      setGeneratingAssessment(false);
    }
  };

  const BEHAVIOR_EDIT_ROWS: Array<{ key: string; label: string; hasLabel?: boolean }> = [
    { key: 'tantrums', label: t('checklistTantrums') },
    { key: 'self_abuse', label: t('checklistSelfAbuse') },
    { key: 'aggression', label: t('checklistAggression') },
    { key: 'self_stim', label: t('checklistSelfStim') },
    { key: 'other_major_1', label: `${t('checklistOtherMajorDisruptive')} 1`, hasLabel: true },
    { key: 'other_major_2', label: `${t('checklistOtherMajorDisruptive')} 2`, hasLabel: true },
    { key: 'leaves_work_area', label: t('checklistLeavesWorkArea') },
    { key: 'hands_feet_restless', label: t('checklistHandsFeetRestless') },
  ];

  const startEditBehaviors = () => {
    const behaviors = (child?.initial_observation as any)?.obs1?.behaviors || {};
    const draft: Record<string, { f: number; s: number; label?: string | null }> = {};
    for (const row of BEHAVIOR_EDIT_ROWS) {
      const entry = behaviors[row.key] || {};
      draft[row.key] = {
        f: Number.isFinite(entry.f) ? clamp(Number(entry.f), 0, 5) : 0,
        s: Number.isFinite(entry.s) ? clamp(Number(entry.s), 0, 5) : 0,
        ...(row.hasLabel ? { label: entry.label ?? null } : {}),
      };
    }
    setBehaviorDraft(draft);
    setBehaviorError('');
    setBehaviorSaved(false);
    setEditingBehaviors(true);
  };

  const handleSaveBehaviors = async () => {
    if (!child || behaviorSaving) return;
    try {
      setBehaviorSaving(true);
      setBehaviorError('');
      const response = await apiClient.put<ApiResponse<Child>>(
        `/children/${child.id}/initial-observation/behaviors`,
        { behaviors: behaviorDraft }
      );
      if (response.data.success && response.data.data) {
        setChild(response.data.data);
        setEditingBehaviors(false);
        setBehaviorSaved(true);
      } else {
        setBehaviorError(response.data.error || 'Failed to save behaviors');
      }
    } catch (err: any) {
      setBehaviorError(err.response?.data?.error || 'Failed to save behaviors');
    } finally {
      setBehaviorSaving(false);
    }
  };

  const canEditHoursTarget =
    !!child &&
    (user?.role === 'admin' || (user?.role === 'parent' && child.parent_id === user.id));

  const openTargetEdit = () => {
    if (!child) return;
    setTargetValue(String(child.monthly_quota));
    setTargetError('');
    setTargetEditOpen(true);
  };

  const handleSaveHoursTarget = async () => {
    if (!child || targetBusy) return;
    const n = parseInt(targetValue.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      setTargetError(
        language === 'id'
          ? 'Masukkan angka antara 1 dan 100.'
          : 'Enter a number between 1 and 100.'
      );
      return;
    }
    try {
      setTargetBusy(true);
      setTargetError('');
      const response = await apiClient.put<ApiResponse<Child>>(`/children/${child.id}`, {
        monthly_quota: n,
      });
      if (!response.data.success) {
        setTargetError(response.data.error || 'Failed to save');
        return;
      }
      setTargetEditOpen(false);
      // Re-fetch: the PUT response lacks computed fields like weekly_hours_executed.
      await fetchChild();
    } catch (err: any) {
      setTargetError(err.response?.data?.error || 'Failed to save');
    } finally {
      setTargetBusy(false);
    }
  };

  const handleDeleteChild = async () => {
    if (!child || deleteBusy) return;
    try {
      setDeleteBusy(true);
      setDeleteError('');
      const response = await apiClient.delete<ApiResponse<unknown>>(`/children/${child.id}`);
      if (response.data.success) {
        if (user?.role === 'admin') {
          setDeleteConfirmOpen(false);
          await fetchChild();
        } else {
          router.push('/dashboard/children');
        }
      } else {
        setDeleteError(response.data.error || 'Failed to delete child');
      }
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Failed to delete child');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleReactivateChild = async () => {
    if (!child || deleteBusy) return;
    try {
      setDeleteBusy(true);
      setDeleteError('');
      const response = await apiClient.post<ApiResponse<Child>>(
        `/children/${child.id}/reactivate`,
        {}
      );
      if (response.data.success) {
        await fetchChild();
      } else {
        setDeleteError(response.data.error || 'Failed to reactivate child');
      }
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Failed to reactivate child');
    } finally {
      setDeleteBusy(false);
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
          h1: (props) => <h2 className="text-xl font-bold text-[#1A2B4C]" {...props} />,
          h2: (props) => <h3 className="text-lg font-bold text-[#1A2B4C]" {...props} />,
          h3: (props) => <h4 className="text-base font-bold text-[#1A2B4C]" {...props} />,
          p: (props) => <p className="text-sm leading-6 text-[#1A2B4C]/80" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="rounded-xl border-l-4 border-[#00C1B2]/40 bg-[#00C1B2]/5 px-4 py-3 text-sm text-[#1A2B4C]/80"
              {...props}
            />
          ),
          hr: () => <div className="my-4 h-px w-full bg-[#E5E8EB]" />,
          strong: (props) => <strong className="font-semibold text-[#1A2B4C]" {...props} />,
          table: (props) => (
            <div className="overflow-x-auto rounded-xl border border-[#E5E8EB]">
              <table className="w-full text-sm" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="bg-[#FDF8F1] p-2 text-left text-xs font-semibold text-[#1A2B4C]/70" {...props} />
          ),
          td: (props) => <td className="border-t border-[#E5E8EB] p-2 align-top text-sm text-[#1A2B4C]/80" {...props} />,
          ul: (props) => <ul className="list-disc pl-5 text-sm text-[#1A2B4C]/80" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5 text-sm text-[#1A2B4C]/80" {...props} />,
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
        // Spread first: the stored entry carries its own `label` (the parent's
        // free text or null) which must not blank out the row title.
        ...(behaviors.other_major_1 || {}),
        label: `${t('checklistOtherMajorDisruptive')} 1: ${behaviors.other_major_1?.label || '—'}`,
      },
      {
        ...(behaviors.other_major_2 || {}),
        label: `${t('checklistOtherMajorDisruptive')} 2: ${behaviors.other_major_2?.label || '—'}`,
      },
      { label: t('checklistLeavesWorkArea'), ...(behaviors.leaves_work_area || {}) },
      { label: t('checklistHandsFeetRestless'), ...(behaviors.hands_feet_restless || {}) },
    ];

    const eye = obs1.eye_contact || {};
    const compliance = obs1.compliance_pct || {};

    // Read back what the parent chose, not the number it is stored as. A
    // disabled slider showing "2" is the old form's shape, not an answer.
    const pctRow = (label: string, value: any) => {
      const has = Number.isFinite(value);
      const described = has ? describePercent(value, language === 'id' ? 'id' : 'en') : null;
      return (
        <div className="flex items-baseline justify-between gap-4 py-1.5">
          <div className="text-sm text-[#1A2B4C]/80">{label}</div>
          <div className="shrink-0 text-right text-sm font-semibold text-[#1A2B4C]">
            {described ?? (language === 'id' ? 'Belum diisi' : 'Not answered')}
          </div>
        </div>
      );
    };

    const fsCell = (value: any, kind: 'f' | 's') => {
      const has = Number.isFinite(value);
      const lang = language === 'id' ? 'id' : 'en';
      const described = has
        ? kind === 'f'
          ? describeFrequency(value, lang)
          : describeSeverity(value, lang)
        : null;
      return (
        <div className="text-sm font-medium text-[#1A2B4C]">
          {described ?? (language === 'id' ? 'Belum diisi' : 'Not answered')}
        </div>
      );
    };

    return (
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E8EB] bg-[#FDF8F1]/50 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-[#1A2B4C]">{t('checklistBehaviorObs1')}</h3>
              <p className="text-xs text-[#1A2B4C]/60">{t('checklistFsHint')}</p>
            </div>
            {canEditBehaviors && !editingBehaviors && (
              <Button size="sm" variant="outline" onClick={startEditBehaviors}>
                {language === 'id' ? 'Ubah nilai' : 'Edit values'}
              </Button>
            )}
          </div>

          {behaviorSaved && !editingBehaviors && (
            <div className="mx-4 mt-3 rounded-xl border border-[#00C1B2]/25 bg-[#00C1B2]/10 px-3 py-2 text-sm text-[#1A2B4C]">
              {language === 'id' ? 'Nilai perilaku berhasil disimpan.' : 'Behavior values saved.'}
            </div>
          )}

          {editingBehaviors ? (
            <div className="space-y-3 p-4">
              {behaviorError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {behaviorError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BEHAVIOR_EDIT_ROWS.map((row) => {
                  const entry = behaviorDraft[row.key] || { f: 0, s: 0 };
                  return (
                    <div key={row.key} className="rounded-xl border border-[#00C1B2]/25 bg-[#00C1B2]/5 p-3">
                      <div className="mb-2 text-sm font-medium text-[#1A2B4C]">{row.label}</div>
                      {row.hasLabel && (
                        <input
                          type="text"
                          value={entry.label ?? ''}
                          placeholder={language === 'id' ? 'Isi perilaku…' : 'Specify behavior…'}
                          onChange={(e) =>
                            setBehaviorDraft((prev) => ({
                              ...prev,
                              [row.key]: { ...entry, label: e.target.value || null },
                            }))
                          }
                          className="mb-2 w-full rounded-lg border border-[#E5E8EB] bg-white px-3 py-1.5 text-sm text-[#1A2B4C] placeholder:text-[#1A2B4C]/35 focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30"
                        />
                      )}
                      {/*
                        Editing offers the same anchored answers the parent gave
                        when they filled the observation — not the 0–5 sliders
                        those answers replaced.
                      */}
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#1A2B4C]/55">
                            {language === 'id' ? 'Seberapa sering?' : 'How often?'}
                          </div>
                          <div className="space-y-1.5">
                            {FREQUENCY_CHOICES.map((choice) => {
                              const selected = String(entry.f) === choice.value;
                              return (
                                <button
                                  key={choice.value}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() =>
                                    setBehaviorDraft((prev) => ({
                                      ...prev,
                                      [row.key]: {
                                        ...entry,
                                        f: Number(choice.value),
                                        ...(choice.value === '0' ? { s: 0 } : {}),
                                      },
                                    }))
                                  }
                                  className={cn(
                                    'flex min-h-[44px] w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/50',
                                    selected
                                      ? 'border-[#00C1B2] bg-[#00C1B2]/10 font-semibold text-[#00736C]'
                                      : 'border-[#E5E8EB] bg-white text-[#1A2B4C] hover:border-[#00C1B2]/40',
                                  )}
                                >
                                  {labelForChoice(choice, language === 'id' ? 'id' : 'en')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {entry.f > 0 && (
                          <div>
                            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#1A2B4C]/55">
                              {language === 'id' ? 'Seberapa berat?' : 'How hard is it?'}
                            </div>
                            <div className="space-y-1.5">
                              {SEVERITY_CHOICES.map((choice) => {
                                const selected = String(entry.s) === choice.value;
                                return (
                                  <button
                                    key={choice.value}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() =>
                                      setBehaviorDraft((prev) => ({
                                        ...prev,
                                        [row.key]: { ...entry, s: Number(choice.value) },
                                      }))
                                    }
                                    className={cn(
                                      'flex min-h-[44px] w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition',
                                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/50',
                                      selected
                                        ? 'border-[#00C1B2] bg-[#00C1B2]/10 font-semibold text-[#00736C]'
                                        : 'border-[#E5E8EB] bg-white text-[#1A2B4C] hover:border-[#00C1B2]/40',
                                    )}
                                  >
                                    {labelForChoice(choice, language === 'id' ? 'id' : 'en')}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={behaviorSaving}
                  onClick={() => {
                    setEditingBehaviors(false);
                    setBehaviorError('');
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button size="sm" variant="brand" disabled={behaviorSaving} onClick={handleSaveBehaviors}>
                  {behaviorSaving
                    ? language === 'id'
                      ? 'Menyimpan…'
                      : 'Saving…'
                    : language === 'id'
                      ? 'Simpan nilai'
                      : 'Save values'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label} className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-3">
                  <div className="mb-2 text-sm font-medium text-[#1A2B4C]">{r.label}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 text-xs text-[#1A2B4C]/60">{t('checklistFrequencyCol')}</div>
                      {fsCell(r.f, 'f')}
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-[#1A2B4C]/60">{t('checklistSeverityCol')}</div>
                      {fsCell(r.s, 's')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-4">
            <div className="mb-2 text-sm font-bold text-[#1A2B4C]">{t('checklistAttentionTitle')}</div>
            <div className="text-sm text-[#1A2B4C]/80">
              {t('checklistAttentionSpanAvg')}:{' '}
              <span className="font-semibold text-[#1A2B4C]">
                {obs1.attention_span_minutes ?? '—'} {language === 'id' ? 'menit' : 'min'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-4">
            <div className="mb-2 text-sm font-bold text-[#1A2B4C]">{t('checklistEyeContactTitle')}</div>
            <div className="space-y-2">
              {pctRow(t('checklistLookingOnRequest'), eye.on_request_pct)}
              {pctRow(t('checklistLookingNameCalled'), eye.name_called_pct)}
              {pctRow(t('checklistLookingTalkingListening'), eye.talking_listening_pct)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-4">
            <div className="mb-2 text-sm font-bold text-[#1A2B4C]">{t('checklistEngagementTitle')}</div>
            <div className="space-y-2">
              {pctRow(t('checklistLookingAtTaskMaterials'), obs1.looking_at_task_materials_pct)}
              {pctRow(t('checklistFollowsSimpleDirectives'), obs1.follows_simple_directives_with_gestures_pct)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/40 p-4">
            <div className="mb-2 text-sm font-bold text-[#1A2B4C]">{t('checklistComplianceTitle')}</div>
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
        <div className="space-y-8">
          <div className="h-32 animate-pulse rounded-2xl bg-[#E5E8EB]/60" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#E5E8EB]/60" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !child) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Child not found'}
        </div>
      </DashboardLayout>
    );
  }

  const weeklyHoursExecuted = child?.weekly_hours_executed ?? 0;
  const quotaPercentage = child ? (weeklyHoursExecuted / child.monthly_quota) * 100 : 0;
  const ageYears = formatChildAgeYears(child.birthdate);
  const headerSubtitle = [
    ageYears !== null
      ? `${ageYears} ${language === 'id' ? 'tahun' : 'years old'}`
      : null,
    child.birthdate ? new Date(child.birthdate).toLocaleDateString() : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const assessmentForLanguage =
    language === 'id' ? child.initial_assessment_report_id : child.initial_assessment_report;
  const hasAssessmentForAba =
    Boolean(assessmentForLanguage) || Boolean(child.has_pending_assessment);
  const englishAssessment = child.initial_assessment_report;
  // AI content is hidden until approved. Admins get the same gated view as
  // parents here — they review content in the AI Content Review page.
  const isGatedViewer = user.role === 'parent' || user.role === 'admin';
  /** Operational metering and state codes are for staff, not for families. */
  const isParentOnlyViewer = user.role === 'parent';
  // Set when generation was skipped because the account lost AI access (lapsed
  // subscription, exhausted tokens, feature disabled). Computed live by the API,
  // so it clears itself as soon as the account is renewed. API reasons come back
  // in English; translate the known ones so the page stays Indonesian-first.
  const aiBlockedReason = (() => {
    if (!child.ai_availability || child.ai_availability.available !== false) return null;
    const raw = child.ai_availability.reason || '';
    if (language !== 'id') {
      return raw || 'AI features require an active subscription.';
    }
    if (/free trial has ended/i.test(raw)) {
      return 'Masa uji coba gratis Anda telah berakhir. Tingkatkan ke paket Pro atau Premium untuk melanjutkan fitur AI.';
    }
    if (/subscription has expired/i.test(raw)) {
      return 'Masa langganan Anda telah berakhir.';
    }
    if (/no subscription found/i.test(raw)) {
      return 'Belum ada langganan aktif pada akun ini.';
    }
    if (/does not include AI/i.test(raw)) {
      return 'Paket langganan Anda saat ini belum termasuk fitur AI.';
    }
    if (/insufficient tokens/i.test(raw)) {
      return 'Token AI Anda tidak mencukupi untuk membuat laporan bulan ini.';
    }
    if (/AI features are currently disabled/i.test(raw)) {
      return 'Fitur AI sedang dinonaktifkan sementara.';
    }
    return raw || 'Fitur AI memerlukan langganan aktif.';
  })();
  const assessmentPending = isGatedViewer && Boolean(child.has_pending_assessment);
  // Behavior (OBS 1) stays editable until APPROVED AI content exists —
  // empty or still-pending assessments/programs don't lock it.
  const hasApprovedAssessment = Boolean(
    (child.initial_assessment_report || child.initial_assessment_report_id) &&
      child.assessment_review_status === 'approved',
  );
  const hasApprovedAbaWeek = abaWeeks.some((w) => w.review_status === 'approved');
  const canEditBehaviors =
    (user.role === 'parent' || user.role === 'admin') &&
    !hasApprovedAssessment &&
    !hasApprovedAbaWeek &&
    Boolean((child.initial_observation as any)?.obs1);
  const isChildInactive = child.is_active === false;
  const canDeleteChild =
    (user.role === 'parent' || user.role === 'admin') && !isChildInactive;

  // (moved above) current week memo + ABA auto-translate effect

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <DashboardPageHeader
          icon={User}
          title={child.name}
          subtitle={headerSubtitle || t('manageYourChildren')}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t('back')}
              </Button>
              {(user.role === 'parent' || user.role === 'therapist' || user.role === 'admin') && (
                <Link href={`/dashboard/logs/new?childId=${child.id}`}>
                  <Button variant="brand" size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" aria-hidden />
                    {t('newActivityLog')}
                  </Button>
                </Link>
              )}
            </div>
          }
        />

        {isChildInactive && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#FFB900]/40 bg-[#FFB900]/10 px-4 py-3 text-sm text-[#1A2B4C] sm:flex-row sm:items-center sm:justify-between">
            <span>
              {language === 'id'
                ? 'Profil anak ini nonaktif (dihapus oleh orang tua atau admin). Orang tua tidak lagi melihat profil ini.'
                : 'This child profile is deactivated (deleted by the parent or an admin). The parent no longer sees it.'}
              {child.deactivated_at
                ? ` · ${new Date(child.deactivated_at).toLocaleString()}`
                : ''}
            </span>
            {user.role === 'admin' && (
              <Button size="sm" variant="brand" disabled={deleteBusy} onClick={handleReactivateChild}>
                {deleteBusy
                  ? language === 'id'
                    ? 'Memproses…'
                    : 'Working…'
                  : language === 'id'
                    ? 'Aktifkan kembali'
                    : 'Reactivate'}
              </Button>
            )}
          </div>
        )}

        {deleteError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        )}

        {/*
          Four stat cards with nothing actionable in them — including an AI
          token meter a paying parent can neither read nor act on — became one
          sentence. Token metering is admin billing data and lives in Children
          Oversight; it is not a number to put in front of a family.
        */}
        <div
          className={cn(
            'grid grid-cols-1 gap-4',
            isParentOnlyViewer ? 'sm:grid-cols-1' : 'sm:grid-cols-2',
          )}
        >
          <DashboardStatCard
            value={humanHours(weeklyHoursExecuted, language)}
            label={
              language === 'id'
                ? `dari ${child.monthly_quota} jam minggu ini`
                : `of ${child.monthly_quota} hours this week`
            }
            icon={Gauge}
            accent="teal"
            action={
              canEditHoursTarget ? (
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[#1A2B4C]/40 hover:bg-[#1A2B4C]/5 hover:text-[#005E58] transition-colors"
                  onClick={openTargetEdit}
                  aria-label={
                    language === 'id' ? 'Ubah target jam mingguan' : 'Edit weekly hours target'
                  }
                  title={language === 'id' ? 'Ubah target jam mingguan' : 'Edit weekly hours target'}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              ) : undefined
            }
          />
          {!isParentOnlyViewer && (
            <DashboardStatCard
              value={(child.ai_tokens_used ?? 0).toLocaleString('id-ID')}
              label={language === 'id' ? 'Token AI anak ini' : 'AI tokens (this child)'}
              icon={Sparkles}
              accent="teal"
            />
          )}
        </div>

        <div className="rounded-2xl border border-[#E5E8EB] bg-white px-6 py-5 shadow-sm shadow-[#1A2B4C]/5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#1A2B4C]/70">
              {language === 'id' ? 'Progres jam mingguan' : 'Weekly hours progress'}
            </span>
            <span className="text-sm font-bold text-[#1A2B4C]">
              {humanHours(weeklyHoursExecuted, language)} / {child.monthly_quota}
              {language === 'id' ? ' jam' : 'h'} ({Math.round(quotaPercentage)}%)
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#E5E8EB]">
            <div
              className={cn('h-full rounded-full transition-all', quotaBarColor(quotaPercentage))}
              style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/*
          Submitting the observation drops the parent here while two AI
          generations of 60–120s and a human review run behind the page, and
          nothing said so. Name the three waits in sequence, say roughly how
          long, and say they can close the app.
        */}
        {isGatedViewer && !hasApprovedAbaWeek && hasAssessmentForAba && !aiBlockedReason && (
          <div className="rounded-2xl border border-[#00C1B2]/25 bg-[#00C1B2]/5 p-5">
            <h3 className="font-montserrat text-sm font-bold text-[#1A2B4C]">
              {language === 'id'
                ? `Sedang menyiapkan program ${child.name}`
                : `Preparing ${child.name}'s program`}
            </h3>
            <ol className="mt-3 space-y-2.5">
              {([
                {
                  done: Boolean(assessmentForLanguage) || assessmentPending,
                  title:
                    language === 'id' ? 'Menulis laporan asesmen' : 'Writing the assessment report',
                  wait: language === 'id' ? 'sekitar 1–2 menit' : 'about 1–2 minutes',
                },
                {
                  done: Boolean(currentWeekRow),
                  title:
                    language === 'id'
                      ? 'Menyusun program rumah mingguan'
                      : 'Building the weekly home program',
                  wait: language === 'id' ? 'sekitar 1–2 menit' : 'about 1–2 minutes',
                },
                {
                  done: false,
                  title:
                    language === 'id'
                      ? 'Diperiksa tim klinis Gradion'
                      : 'Checked by the Gradion clinical team',
                  wait: language === 'id' ? 'biasanya 1–2 hari kerja' : 'usually 1–2 working days',
                },
              ] as const).map((stage, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      stage.done
                        ? 'bg-[#00736C] text-white'
                        : 'border border-[#00C1B2]/40 text-[#00736C]',
                    )}
                    aria-hidden
                  >
                    {stage.done ? '✓' : i + 1}
                  </span>
                  <span className={stage.done ? 'text-[#1A2B4C]/55 line-through' : 'text-[#1A2B4C]'}>
                    {stage.title}
                    <span className="ml-1.5 text-xs font-normal text-[#1A2B4C]/50">
                      · {stage.wait}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-[#1A2B4C]/65">
              {language === 'id'
                ? 'Anda boleh menutup aplikasi — kami kirim email begitu program siap dijalankan.'
                : 'You can close the app — we will email you as soon as the program is ready to run.'}
            </p>
          </div>
        )}

        {(child.environment || (child.parent && user.role !== 'parent')) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {child.environment && (
              <div className="rounded-2xl border border-[#E5E8EB] bg-white p-5 shadow-sm shadow-[#1A2B4C]/5">
                <h3 className="font-montserrat text-sm font-bold text-[#1A2B4C]">{t('environment')}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A2B4C]/75">
                  {child.environment}
                </p>
              </div>
            )}
            {child.parent && user.role !== 'parent' && (
              <div className="rounded-2xl border border-[#E5E8EB] bg-white p-5 shadow-sm shadow-[#1A2B4C]/5">
                <h3 className="font-montserrat text-sm font-bold text-[#1A2B4C]">Parent</h3>
                <p className="mt-2 text-sm font-semibold text-[#1A2B4C]">{child.parent.name}</p>
                <p className="text-sm text-[#1A2B4C]/60">{child.parent.email}</p>
              </div>
            )}
          </div>
        )}

        {child.initial_observation && (
          <DashboardCollapsibleSection
            title={t('initialObservationChecklist')}
            subtitle={t('initialObservationCapturedSubtitle')}
          >
              {renderChecklist(child.initial_observation)}

              <div className="mt-6 rounded-xl border border-[#00C1B2]/20 bg-[#00C1B2]/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-[#00C1B2]/15 p-2">
                      <Sparkles className="h-4 w-4 text-[#00C1B2]" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1A2B4C]">{t('aiInitialAssessment')}</h3>
                      <p className="text-xs text-[#1A2B4C]/60">{t('aiAssessmentSubtitle')}</p>
                    </div>
                  </div>
                  {!assessmentForLanguage && !assessmentPending && aiBlockedReason === null && (
                    <div className="flex items-center gap-2">
                      {language === 'id' && englishAssessment ? (
                        <div className="text-xs font-medium text-[#1A2B4C]/70">
                          {generatingAssessment ? t('translating') : t('translating')}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="brand"
                          onClick={() => handleAssessmentAction('generate')}
                          disabled={generatingAssessment}
                        >
                          {generatingAssessment ? `${t('loading')}...` : t('generate')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {aiBlockedReason && (
                  <div className="mt-3 rounded-xl border border-[#FFB900]/40 bg-[#FFB900]/10 px-4 py-3 text-sm text-[#1A2B4C]">
                    <div className="font-semibold">
                      {language === 'id'
                        ? 'Laporan asesmen & program mingguan belum dapat dibuat'
                        : 'The assessment report and weekly program could not be created yet'}
                    </div>
                    <p className="mt-1 text-[#1A2B4C]/80">{aiBlockedReason}</p>
                    <p className="mt-1 text-[#1A2B4C]/70">
                      {language === 'id'
                        ? 'Data observasi awal ananda sudah tersimpan dengan aman. Setelah langganan aktif kembali, laporan dan program akan dibuat otomatis.'
                        : "Your child's initial observation is saved safely. Once the subscription is active again, the report and program are generated automatically."}
                    </p>
                    {user.role === 'parent' && (
                      <Link href="/dashboard/checkout" className="mt-3 inline-block">
                        <Button size="sm" variant="brand">
                          {language === 'id' ? 'Lihat paket langganan' : 'View subscription plans'}
                        </Button>
                      </Link>
                    )}
                  </div>
                )}

                {assessmentError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {assessmentError}
                  </div>
                )}

                {assessmentPending && (
                  <div className="mt-4 rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 px-3 py-2 text-sm text-[#1A2B4C]">
                    {language === 'id'
                      ? 'Laporan AI sedang menunggu peninjauan admin. Laporan akan terlihat setelah disetujui.'
                      : 'This AI report is awaiting admin review. It will appear once approved.'}
                    {user?.role === 'admin' && (
                      <>
                        {' '}
                        <Link
                          href="/dashboard/admin/ai-content-review"
                          className="font-semibold text-[#1A2B4C] underline hover:text-[#00736C]"
                        >
                          {language === 'id' ? 'Tinjau sekarang →' : 'Review it now →'}
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {assessmentForLanguage && (
                  <div className="mt-4 rounded-xl border border-[#E5E8EB] bg-white p-4">
                    {renderPrettyAssessment(assessmentForLanguage)}
                  </div>
                )}
              </div>
          </DashboardCollapsibleSection>
        )}

        <DashboardCollapsibleSection
          title={t('abaProgramTitle')}
          subtitle={t('abaProgramSubtitle')}
          bodyClassName="space-y-4"
        >
            {abaError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {abaError}
              </div>
            )}

            {abaTranslating && (
              <div className="flex items-center gap-3 rounded-xl border border-[#00C1B2]/25 bg-[#00C1B2]/10 px-3 py-2 text-sm text-[#1A2B4C]">
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#00C1B2] border-t-transparent"
                  aria-hidden
                />
                {language === 'id'
                  ? 'Menerjemahkan program mingguan… Terjemahan pertama butuh ±20–30 detik; setelah itu pergantian bahasa langsung.'
                  : 'Translating the weekly program… The first translation takes ~20–30 seconds; after that, switching languages is instant.'}
              </div>
            )}

            {!hasAssessmentForAba && (
              <div className="rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 px-3 py-2 text-sm text-[#1A2B4C]">
                {aiBlockedReason
                  ? language === 'id'
                    ? 'Program mingguan dibuat otomatis setelah laporan asesmen tersedia. Lihat keterangan pada bagian Laporan Asesmen di atas.'
                    : 'The weekly program is generated automatically once the assessment report exists. See the note in the Assessment Report section above.'
                  : t('abaProgramNeedAssessment')}
              </div>
            )}

            {hasAssessmentForAba && assessmentPending && !currentWeekRow && (
              <div className="rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 px-3 py-2 text-sm text-[#1A2B4C]">
                {language === 'id'
                  ? 'Laporan asesmen sedang ditinjau admin. Program mingguan akan dibuat otomatis dan terlihat setelah disetujui.'
                  : 'The assessment is awaiting admin review. The weekly program is being created automatically and will appear once approved.'}
                {user?.role === 'admin' && (
                  <>
                    {' '}
                    <Link
                      href="/dashboard/admin/ai-content-review"
                      className="font-semibold text-[#1A2B4C] underline hover:text-[#00736C]"
                    >
                      {language === 'id' ? 'Tinjau sekarang →' : 'Review it now →'}
                    </Link>
                  </>
                )}
              </div>
            )}

            {/*
              "Segarkan program ini" and "Buat program baru" used to sit above
              the parent's own action, the second of them styled as the page's
              primary — one tap from a tired parent, spending AI tokens and
              queueing a plan for clinician review. They are maintenance, so
              they live behind a menu now, and regenerating states its
              consequence before it runs.
            */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#1A2B4C]/80">
                <span className="font-semibold text-[#1A2B4C]">
                  {language === 'id' ? 'Periode program' : 'Program period'}:
                </span>{' '}
                <span>
                  {currentWeekRow
                    ? `${humanYmd(currentWeekStartYmd, language)} – ${humanYmd(currentWeekEndYmd, language)}`
                    : humanYmd(todayYmd, language)}
                </span>
                {currentWeekRow && currentWeekExpired && (
                  <span className="ml-2 rounded-full border border-[#FFB900]/40 bg-[#FFB900]/15 px-2 py-0.5 text-xs font-medium text-[#8A6100]">
                    {language === 'id'
                      ? 'Boleh terus dilatih sampai program berikutnya siap'
                      : 'Keep practising until the next program is ready'}
                  </span>
                )}
                {abaLoading && <span className="ml-2 text-xs text-[#1A2B4C]/50">({t('loading')}…)</span>}
              </div>
              {(currentWeekRow || hasAssessmentForAba) && (
                <div className="relative">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    aria-expanded={maintenanceMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setMaintenanceMenuOpen((v) => !v)}
                    disabled={abaGenerating}
                  >
                    {abaGenerating
                      ? t('abaProgramGenerating')
                      : language === 'id'
                        ? 'Pengaturan program'
                        : 'Program settings'}
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </Button>
                  {maintenanceMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-hidden
                        tabIndex={-1}
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setMaintenanceMenuOpen(false)}
                      />
                      <div
                        role="menu"
                        className="absolute right-0 z-40 mt-1 w-72 overflow-hidden rounded-xl border border-[#E5E8EB] bg-white py-1 shadow-lg"
                      >
                        {currentWeekRow && (
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-4 py-2.5 text-left text-sm text-[#1A2B4C] hover:bg-[#FDF8F1] disabled:opacity-40"
                            disabled={!hasAssessmentForAba}
                            onClick={() => {
                              setMaintenanceMenuOpen(false);
                              void handleGenerateAbaWeek(currentWeekStartYmd as string);
                            }}
                          >
                            {language === 'id' ? 'Segarkan program ini' : 'Refresh this program'}
                          </button>
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          className="block w-full px-4 py-2.5 text-left text-sm text-[#1A2B4C] hover:bg-[#FDF8F1] disabled:opacity-40"
                          disabled={
                            !hasAssessmentForAba ||
                            (Boolean(currentWeekRow) && (!canGenerateNewProgram || newProgramIsSameDay))
                          }
                          onClick={() => {
                            setMaintenanceMenuOpen(false);
                            setConfirmNewProgram(true);
                          }}
                        >
                          {language === 'id' ? 'Buat program baru' : 'Generate new program'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {confirmNewProgram && (
              <div className="rounded-xl border border-[#FFB900]/40 bg-[#FFB900]/10 p-4 text-sm text-[#1A2B4C]">
                <p className="font-semibold">
                  {language === 'id' ? 'Buat program baru sekarang?' : 'Generate a new program now?'}
                </p>
                <p className="mt-1 leading-relaxed text-[#1A2B4C]/80">
                  {language === 'id'
                    ? 'Program yang sekarang akan diganti, dan program baru harus ditinjau tim Gradion dulu sebelum bisa dijalankan. Biasanya butuh 1–2 hari kerja.'
                    : 'This replaces the current program, and the new one must be reviewed by the Gradion team before it can be used. That usually takes 1–2 working days.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={abaGenerating}
                    onClick={() => {
                      setConfirmNewProgram(false);
                      void handleGenerateAbaWeek(todayYmd);
                    }}
                  >
                    {language === 'id' ? 'Ya, buat program baru' : 'Yes, generate it'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmNewProgram(false)}>
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            )}

            {currentWeekRow &&
              currentWeekRow.generated_by === 'auto_progress_gate' &&
              currentWeekRow.review_status !== 'approved' && (
                <div className="rounded-xl border border-[#00C1B2]/30 bg-gradient-to-r from-[#00C1B2]/15 to-[#FFB900]/10 px-4 py-3 text-sm text-[#1A2B4C]">
                  <span className="mr-1.5" aria-hidden>
                    🎉
                  </span>
                  {language === 'id'
                    ? 'Selamat! Target latihan tercapai — program tahap berikutnya sudah dibuat OTOMATIS dan sedang ditinjau tim Gradion. Program baru akan muncul di sini begitu disetujui.'
                    : 'Congratulations! The practice targets were achieved — the next-stage program was generated AUTOMATICALLY and is being reviewed by the Gradion team. It will appear here once approved.'}
                </div>
              )}

            {/*
              This used to be four thresholds in sixty words of grey prose,
              with the child's actual position buried at the end — the parent
              had to do the subtraction themselves, in the one place they came
              to find out how it is going. Lead with the answer, name the
              program that is holding things up, put the rule behind "kenapa?".
            */}
            {currentWeekRow && progressGate && !progressGate.can_generate_new && !newProgramIsSameDay && (() => {
              const remaining = Math.max(
                0,
                progressGate.required_executions - progressGate.min_executions,
              );
              const blocking =
                progressGate.per_program
                  ?.slice()
                  .sort((a, b) => a.executions - b.executions)[0]?.program_name ?? null;
              const consolidating =
                progressGate.avg_score_pct !== null && progressGate.avg_score_pct < 75;
              return (
                <div className="rounded-xl border border-[#00C1B2]/25 bg-[#00C1B2]/5 px-4 py-3 text-sm text-[#1A2B4C]">
                  <p className="font-montserrat text-xl font-bold">
                    {language === 'id'
                      ? `${remaining} sesi lagi`
                      : `${remaining} more ${remaining === 1 ? 'session' : 'sessions'}`}
                  </p>
                  <p className="mt-1 leading-relaxed text-[#1A2B4C]/80">
                    {language === 'id'
                      ? `${blocking ? `${blocking} perlu` : 'Program ini perlu'} ${remaining} sesi lagi. Setelah itu Gradion menyiapkan tahap berikutnya untuk ${child.name} secara otomatis.`
                      : `${blocking ? `${blocking} needs` : 'This program needs'} ${remaining} more ${remaining === 1 ? 'session' : 'sessions'}. After that Gradion prepares the next stage for ${child.name} automatically.`}
                  </p>
                  {consolidating && (
                    <p className="mt-1 leading-relaxed text-[#1A2B4C]/70">
                      {language === 'id'
                        ? `Rata-rata skor saat ini ${progressGate.avg_score_pct}%, jadi tahap berikutnya akan memantapkan program yang sekarang sambil menambah yang baru — bukan mengulang dari awal.`
                        : `The average score is ${progressGate.avg_score_pct}%, so the next stage will consolidate the current programs and add to them — it is not a restart.`}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowGateRule((v) => !v)}
                    className="mt-1 inline-flex min-h-[44px] items-center rounded px-1 text-xs font-semibold text-[#00736C] underline underline-offset-2 hover:text-[#005E58] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
                    aria-expanded={showGateRule}
                  >
                    {language === 'id' ? 'Kenapa segitu?' : 'Why that many?'}
                  </button>
                  {showGateRule && (
                    <p className="mt-2 text-xs leading-relaxed text-[#1A2B4C]/65">
                      {language === 'id'
                        ? `Tahap berikutnya dibuat otomatis saat rata-rata skor ≥75% dan setiap program sudah dijalankan minimal 3×. Kalau rata-rata masih di bawah 75%, tahap berikutnya dibuat setelah setiap program dijalankan 6×, dan program lama dibawa lagi. Saat ini${
                            progressGate.avg_score_pct !== null
                              ? ` rata-rata skor ${progressGate.avg_score_pct}%,`
                              : ''
                          } program paling jarang baru ${progressGate.min_executions}× dari ${progressGate.required_executions}×.`
                        : `The next stage is generated automatically once the average score is 75% or more and every program has been run at least 3 times. If the average is still below 75%, it is generated once every program has been run 6 times, carrying the current programs over. Right now${
                            progressGate.avg_score_pct !== null
                              ? ` the average score is ${progressGate.avg_score_pct}%,`
                              : ''
                          } and the least-practised program has ${progressGate.min_executions} of ${progressGate.required_executions} runs.`}
                      {isAdminViewer && (
                        <span className="ml-1 text-[#1A2B4C]/50">
                          {language === 'id'
                            ? '(Sebagai admin, Anda tetap bisa membuat program baru.)'
                            : '(As an admin you can still generate a new program.)'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              );
            })()}

            {currentWeekRow?.mainstream_goal_met && (
              <div className="rounded-xl border border-[#00C1B2]/25 bg-[#00C1B2]/10 px-3 py-2 text-sm text-[#1A2B4C]">
                {t('abaProgramMainstreamNote')}
              </div>
            )}

            {!currentWeekRow && (
              <p className="text-sm text-[#1A2B4C]/60">{t('abaProgramNoWeekYet')}</p>
            )}

            {currentWeekRow && isGatedViewer && currentWeekRow.review_status !== 'approved' && (
              <div className="rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 p-4 text-sm text-[#1A2B4C]">
                {language === 'id'
                  ? 'Program mingguan ini sedang menunggu peninjauan admin. Program akan terlihat setelah disetujui.'
                  : 'This weekly program is awaiting admin review. It will appear once approved.'}
                {user?.role === 'admin' && (
                  <>
                    {' '}
                    <Link
                      href="/dashboard/admin/ai-content-review"
                      className="font-semibold text-[#1A2B4C] underline hover:text-[#00736C]"
                    >
                      {language === 'id' ? 'Tinjau sekarang →' : 'Review it now →'}
                    </Link>
                  </>
                )}
              </div>
            )}

            {currentWeekRow && !(isGatedViewer && currentWeekRow.review_status !== 'approved') && (
              <div className="space-y-3 rounded-xl border border-[#E5E8EB] bg-[#FDF8F1]/30 p-4">
                {/* A monospace `active` state chip told the parent nothing they could act on. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {isParentOnlyViewer ? (
                    <span />
                  ) : (
                    <div className="text-sm font-semibold text-[#1A2B4C]">
                      {t('status')}:{' '}
                      <span className="rounded-full border border-[#00C1B2]/25 bg-[#00C1B2]/10 px-2 py-0.5 font-mono text-xs text-[#00736C]">
                        {currentWeekRow.status}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                    {/* The most likely session is the interrupted one. Offer it back. */}
                    {resumableSession ? (
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() =>
                          router.push(
                            `/dashboard/children/${child.id}/aba-program?weekId=${currentWeekRow.id}&sessionId=${resumableSession.session.id}`,
                          )
                        }
                      >
                        {language === 'id'
                          ? `Lanjutkan sesi — ${resumableSession.label}`
                          : `Resume session — ${resumableSession.label}`}
                      </Button>
                    ) : (
                      <Button size="sm" variant="brand" onClick={() => openAbaStartModal(currentWeekRow)}>
                        {language === 'id' ? 'Mulai latihan hari ini' : "Start today's practice"}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => openAbaPrintFlow(currentWeekRow)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded px-2 text-xs font-medium text-[#1A2B4C]/60 underline underline-offset-2 hover:text-[#00736C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
                    >
                      {language === 'id' ? 'Pakai lembar cetak' : 'Use the printed sheet'}
                    </button>
                  </div>
                </div>

                {Array.isArray((currentWeekRow.plan_json as any)?.programs) && (
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-[#1A2B4C]">
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
                          const prog = progressGate?.per_program?.find(
                            (x) => x.program_id === pid
                          );
                          const executed = prog ? prog.executions : counts.get(pid) || 0;
                          const scorePct = prog?.score_pct ?? null;
                          const requiredRuns = progressGate?.required_executions ?? 6;
                          const remainingRuns = Math.max(0, requiredRuns - executed);
                          const demoUrl =
                            typeof p.demo_video_url === 'string' && p.demo_video_url.trim()
                              ? p.demo_video_url.trim()
                              : '';
                          return (
                            <li key={pid} className="overflow-hidden rounded-xl border border-[#E5E8EB] bg-white">
                              <button
                                type="button"
                                className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-[#FDF8F1]/60"
                                onClick={() =>
                                  setAbaExpandedProgramId((cur) => (cur === pid ? null : pid))
                                }
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-[#1A2B4C]">{p.name}</div>
                                  {p.domain && (
                                    <div className="mt-0.5 text-xs text-[#1A2B4C]/60">{p.domain}</div>
                                  )}
                                </div>
                                {/*
                                  "Sesi" and "Sisa", so the parent can see which
                                  program is holding the child back without doing
                                  the subtraction. The score sits inside, where
                                  someone who wants it will look.
                                */}
                                <div className="flex shrink-0 items-center gap-3">
                                  <div className="text-right">
                                    <div className="text-xs text-[#1A2B4C]/55">
                                      {executed} {language === 'id' ? 'dari' : 'of'} {requiredRuns}
                                    </div>
                                    <div className="text-xs font-bold text-[#1A2B4C]">
                                      {remainingRuns > 0
                                        ? language === 'id'
                                          ? `${remainingRuns} sesi lagi`
                                          : `${remainingRuns} to go`
                                        : language === 'id'
                                          ? 'Target tercapai'
                                          : 'Target met'}
                                    </div>
                                  </div>
                                  <span className="text-sm text-[#1A2B4C]/40" aria-hidden>
                                    {expanded ? '▾' : '▸'}
                                  </span>
                                </div>
                              </button>
                              {expanded && (
                                <div className="space-y-3 border-t border-[#E5E8EB] px-3 pb-3 text-sm text-[#1A2B4C]/80">
                                  {scorePct !== null && (
                                    <div className="pt-2 text-xs">
                                      <span className="font-semibold text-[#1A2B4C]">
                                        {language === 'id' ? 'Skor' : 'Score'}
                                      </span>{' '}
                                      <span className={scorePct >= 75 ? 'text-[#00736C]' : 'text-[#8A6100]'}>
                                        {scorePct}% {language === 'id' ? 'mandiri' : 'independent'}
                                      </span>
                                    </div>
                                  )}
                                  {p.rationale && (
                                    <div className="pt-2 text-xs">{p.rationale}</div>
                                  )}
                                  {Array.isArray(p.targets) && p.targets.length > 0 && (
                                    <div className="text-xs">
                                      <div className="font-semibold text-[#1A2B4C]">
                                        {language === 'id' ? 'Target' : 'Targets'}
                                      </div>
                                      <div className="mt-1">{(p.targets as string[]).join(' · ')}</div>
                                    </div>
                                  )}
                                  {Array.isArray(p.materials) && p.materials.length > 0 && (
                                    <div className="text-xs">
                                      <div className="font-semibold text-[#1A2B4C]">
                                        {language === 'id' ? 'Alat' : 'Materials'}
                                      </div>
                                      <div className="mt-1">{(p.materials as string[]).join(' · ')}</div>
                                    </div>
                                  )}
                                  {Array.isArray(p.steps) && p.steps.length > 0 && (
                                    <div className="text-xs">
                                      <div className="font-semibold text-[#1A2B4C]">
                                        {language === 'id' ? 'Langkah' : 'Steps (Langkah)'}
                                      </div>
                                      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                                        {(p.steps as string[]).map((s, i) => (
                                          <li key={i}>{s}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                  {Array.isArray(p.prompts) && p.prompts.length > 0 && (
                                    <div className="text-xs">
                                      <div className="font-semibold text-[#1A2B4C]">
                                        {language === 'id' ? 'Prompt (bantuan)' : 'Prompts'}
                                      </div>
                                      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                                        {(p.prompts as string[]).map((s, i) => (
                                          <li key={i}>{s}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                  {typeof p.mastery_criteria === 'string' && p.mastery_criteria.trim() && (
                                    <div className="text-xs">
                                      <div className="font-semibold text-[#1A2B4C]">
                                        {language === 'id' ? 'Kriteria ketuntasan' : 'Mastery criteria'}
                                      </div>
                                      <div className="mt-1">{p.mastery_criteria}</div>
                                    </div>
                                  )}
                                  {demoUrl ? (
                                    <div className="space-y-1 text-xs">
                                      <div className="font-semibold text-[#1A2B4C]">
                                        {t('abaProgramVideoTitle')}
                                      </div>
                                      <a
                                        href={demoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="break-all text-[#00736C] underline hover:text-[#005E58]"
                                      >
                                        {demoUrl}
                                      </a>
                                    </div>
                                  ) : null}
                                  <Button size="sm" variant="brand" onClick={() => openAbaStartModal(currentWeekRow, pid)}>
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

            {previousWeeks.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-[#1A2B4C]">
                  {language === 'id' ? 'Program sebelumnya' : 'Previous programs'}
                </div>
                {previousWeeks.map((w) => {
                  const start = String(w.week_start).slice(0, 10);
                  const end = addDaysYmd(start, 6);
                  const gated = isGatedViewer && w.review_status !== 'approved';
                  const expanded = expandedPrevWeekId === w.id;
                  const programs = Array.isArray((w.plan_json as any)?.programs)
                    ? ((w.plan_json as any).programs as any[])
                    : [];
                  return (
                    <div key={w.id} className="rounded-xl border border-[#E5E8EB] bg-white">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        onClick={() => setExpandedPrevWeekId(expanded ? null : w.id)}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-mono text-[#1A2B4C]">
                            {start} → {end}
                          </span>
                          <span className="rounded-full border border-[#E5E8EB] bg-[#FDF8F1] px-2 py-0.5 font-mono text-xs text-[#1A2B4C]/70">
                            {w.status}
                          </span>
                          {gated && (
                            <span className="rounded-full border border-[#FFB900]/40 bg-[#FFB900]/15 px-2 py-0.5 text-xs font-medium text-[#8A6100]">
                              {language === 'id' ? 'menunggu peninjauan' : 'awaiting review'}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-[#1A2B4C]/40" aria-hidden>
                          {expanded ? '▾' : '▸'}
                        </span>
                      </button>
                      {expanded && (
                        <div className="border-t border-[#E5E8EB] px-4 py-3">
                          {gated ? (
                            <p className="text-sm text-[#1A2B4C]/60">
                              {language === 'id'
                                ? 'Program ini belum disetujui admin, jadi isinya belum bisa ditampilkan.'
                                : 'This program has not been approved by an admin yet, so its content cannot be shown.'}
                            </p>
                          ) : programs.length === 0 ? (
                            <p className="text-sm text-[#1A2B4C]/60">—</p>
                          ) : (
                            <ul className="space-y-2">
                              {programs.map((p: any, idx: number) => (
                                <li
                                  key={p?.id != null ? String(p.id) : idx}
                                  className="rounded-lg border border-[#E5E8EB] p-3 text-sm text-[#1A2B4C]"
                                >
                                  <div className="font-semibold">
                                    {String(p?.name ?? '')}
                                    {p?.domain ? (
                                      <span className="font-normal text-[#1A2B4C]/60"> · {String(p.domain)}</span>
                                    ) : null}
                                  </div>
                                  {Array.isArray(p?.targets) && p.targets.length > 0 && (
                                    <div className="mt-1 text-xs text-[#1A2B4C]/70">
                                      {(p.targets as string[]).join(' · ')}
                                    </div>
                                  )}
                                  {Number.isFinite(Number(p?.recommended_trials_per_day)) && (
                                    <div className="mt-1 text-xs text-[#1A2B4C]/50">
                                      {Number(p.recommended_trials_per_day)}{' '}
                                      {language === 'id' ? 'trial/hari' : 'trials/day'}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </DashboardCollapsibleSection>

        {abaModalOpen && abaActiveWeek && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2B4C]/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-[#E5E8EB] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-montserrat text-lg font-bold text-[#1A2B4C]">
                    {t('abaProgramModeUpload')}
                  </h3>
                  <p className="mt-1 text-sm text-[#1A2B4C]/60">{t('abaProgramModeUploadHint')}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm text-[#1A2B4C]/50 transition-colors hover:bg-[#E5E8EB] hover:text-[#1A2B4C]"
                  onClick={resetAbaModal}
                >
                  ✕
                </button>
              </div>

              {abaError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {abaError}
                </div>
              )}

              {/* Switching back: guided becomes the default again next time. */}
              <button
                type="button"
                onClick={() => {
                  const week = abaActiveWeek;
                  const pid = abaStartProgramId;
                  resetAbaModal();
                  if (week) void handleChooseAbaMode('guided', week, pid);
                }}
                className="mt-4 rounded text-xs font-medium text-[#00736C] underline underline-offset-2 hover:text-[#005E58] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B2]/40"
              >
                {language === 'id'
                  ? '← Pakai panduan di website saja'
                  : '← Use the guided session instead'}
              </button>

              {abaChosenMode === 'upload' && abaSessionId && (
                <div className="mt-4 space-y-3 rounded-xl border border-[#00C1B2]/20 bg-[#00C1B2]/5 p-4">
                  <a
                    className="text-sm font-medium text-[#00736C] underline hover:text-[#005E58]"
                    href="/therapy-notes-mr-andrew.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('abaProgramDownloadPdf')}
                  </a>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#1A2B4C]/70">
                      {t('abaProgramUploadPhoto')}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={abaUploading}
                      className="text-sm text-[#1A2B4C]"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadTherapyNotes(f);
                      }}
                    />
                    {abaUploading && (
                      <div className="mt-2 text-xs text-[#00736C]">{t('abaProgramUploading')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DashboardCollapsibleSection title={t('activityLogHistory')}>
            {activityLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#1A2B4C]/50">{t('noActivityLogsYet')}</p>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <Link
                    key={log.id}
                    href={`/dashboard/logs/${log.id}/review`}
                    className="block rounded-xl border border-[#E5E8EB] bg-white p-4 transition-all hover:border-[#00C1B2]/30 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#1A2B4C]">
                            {new Date(log.log_date).toLocaleDateString()}
                          </p>
                          <span className="text-xs text-[#1A2B4C]/50">
                            ·{' '}
                            {(log.duration_hours ?? 3) % 1 === 0
                              ? (log.duration_hours ?? 3)
                              : Number((log.duration_hours ?? 3).toFixed(2))}{' '}
                            h
                          </span>
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', getLogStatusBadgeClass(log.status))}>
                            {log.status}
                          </span>
                          {log.aba_session_id && (
                            <span className="rounded-full border border-[#1A2B4C]/15 bg-[#1A2B4C]/5 px-2.5 py-0.5 text-xs font-semibold text-[#1A2B4C]/70">
                              {language === 'id' ? 'Program ABA' : 'ABA Program'}
                            </span>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-[#1A2B4C]/70">
                          {t('createdByLabel')}:{' '}
                          <span className="font-medium text-[#1A2B4C]">
                            {log.creator?.name ||
                              (log.creator_role === 'parent'
                                ? 'Parent'
                                : log.creator_role === 'therapist'
                                  ? 'Therapist'
                                  : 'Unknown')}
                          </span>
                          {log.creator_role && (
                            <span
                              className={cn(
                                'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                                getCreatorBadgeClass(log.creator_role),
                              )}
                            >
                              {log.creator_role}
                            </span>
                          )}
                        </p>
                        <ActivityLogEntryBody log={log} language={language} />
                        {log.therapist_comment && (
                          <div className="mt-2 rounded-lg border border-[#00C1B2]/20 bg-[#00C1B2]/5 p-2">
                            <p className="text-xs font-medium text-[#00736C]">Review Comment:</p>
                            <p className="text-sm text-[#1A2B4C]/80">{log.therapist_comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </DashboardCollapsibleSection>

        {canDeleteChild && (
          <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm shadow-[#1A2B4C]/5">
            <h3 className="font-montserrat text-sm font-bold text-red-600">
              {language === 'id' ? 'Hapus profil anak' : 'Delete child profile'}
            </h3>
            <p className="mt-1 text-sm text-[#1A2B4C]/65">
              {user.role === 'admin'
                ? language === 'id'
                  ? 'Profil akan ditandai nonaktif dan hilang dari tampilan orang tua. Admin dapat mengaktifkannya kembali kapan saja.'
                  : 'The profile will be flagged as deactivated and disappear from the parent’s view. An admin can reactivate it at any time.'
                : language === 'id'
                  ? 'Profil anak akan dihapus dari akun Anda. Hubungi admin jika suatu saat Anda ingin memulihkannya.'
                  : 'The child profile will be removed from your account. Contact an admin if you ever need it restored.'}
            </p>
            {!deleteConfirmOpen ? (
              <div className="mt-4">
                <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                  {user.role === 'admin'
                    ? language === 'id'
                      ? 'Nonaktifkan anak'
                      : 'Deactivate child'
                    : language === 'id'
                      ? 'Hapus anak'
                      : 'Delete child'}
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {language === 'id'
                    ? `Yakin ingin menghapus profil ${child.name}? Tindakan ini menyembunyikan seluruh data anak dari tampilan Anda.`
                    : `Are you sure you want to delete ${child.name}'s profile? This hides all of the child's data from your view.`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="danger" size="sm" disabled={deleteBusy} onClick={handleDeleteChild}>
                    {deleteBusy
                      ? language === 'id'
                        ? 'Menghapus…'
                        : 'Deleting…'
                      : language === 'id'
                        ? 'Ya, hapus'
                        : 'Yes, delete'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleteBusy}
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {targetEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1A2B4C]">{t('weeklyHoursTarget')}</h2>
              <p className="mt-0.5 text-xs text-[#1A2B4C]/60">
                {language === 'id'
                  ? 'Berapa jam latihan di rumah yang ditargetkan per minggu untuk anak ini.'
                  : 'How many hours of home practice you aim for each week for this child.'}
              </p>
            </div>

            {targetError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {targetError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/40"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveHoursTarget();
                }}
                autoFocus
              />
              <span className="text-sm text-[#1A2B4C]/70">
                {language === 'id' ? 'jam / minggu' : 'hours / week'}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTargetEditOpen(false)}
                disabled={targetBusy}
              >
                {t('cancel')}
              </Button>
              <Button size="sm" onClick={() => void handleSaveHoursTarget()} disabled={targetBusy}>
                {targetBusy
                  ? language === 'id'
                    ? 'Menyimpan…'
                    : 'Saving…'
                  : language === 'id'
                    ? 'Simpan'
                    : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

