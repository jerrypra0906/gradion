'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Check, Copy, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { apiClient, ApiResponse, Child, ChildReportData, ParentLog } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { ActivityLogEntryBody } from '@/components/dashboard/ActivityLogEntryBody';
import { getCreatorBadgeClass } from '@/components/dashboard/dashboardBadges';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import ReactMarkdown from 'react-markdown';

const SKILLS_CHART_LABEL_MAX = 34;

function truncateChartLabel(label: string, max = SKILLS_CHART_LABEL_MAX) {
  if (label.length <= max) {
    return label;
  }
  return `${label.slice(0, max - 1)}…`;
}

function skillsChartYAxisWidth(labels: string[]) {
  const longest = labels.reduce(
    (maxLen, label) => Math.max(maxLen, truncateChartLabel(label).length),
    0
  );
  return Math.min(Math.max(longest * 6.2 + 20, 110), 240);
}

export function ReportsPageContent() {
  const { user } = useAuthStore();
  const { t, language } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  
  // Date range state - default to last 30 days
  const getDefaultEndDate = () => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date.toISOString().split('T')[0];
  };
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 29); // 30 days including today
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [report, setReport] = useState<ChildReportData | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState<{ summary: string; recommendations: string } | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [planConfig, setPlanConfig] = useState<any>(null);

  const skillsChartConfig = useMemo(() => {
    if (!report?.skillsFrequency.length) {
      return { height: 280, yAxisWidth: 140 };
    }
    const labels = report.skillsFrequency.map((item) => item.skill);
    return {
      height: Math.max(220, report.skillsFrequency.length * 52 + 48),
      yAxisWidth: skillsChartYAxisWidth(labels),
    };
  }, [report?.skillsFrequency]);

  useEffect(() => {
    fetchChildren();
    if (user?.role === 'parent') {
      fetchSubscription();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChildId) {
      fetchReport(selectedChildId, startDate, endDate);
      setAiSummary(null); // Reset AI summary when report changes
    }
  }, [selectedChildId, startDate, endDate]);

  const fetchChildren = async () => {
    try {
      setLoadingChildren(true);
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (response.data.success) {
        const childList = response.data.data || [];
        setChildren(childList);
        if (!selectedChildId && childList.length > 0) {
          setSelectedChildId(childList[0].id.toString());
        }
      } else {
        setError(response.data.error || 'Failed to load children');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load children');
    } finally {
      setLoadingChildren(false);
    }
  };

  const fetchReport = async (childId: string, start: string, end: string) => {
    try {
      setLoadingReport(true);
      setError('');
      // Convert dates to ISO datetime strings for backend
      // Start date: beginning of the day (00:00:00)
      const startDateObj = new Date(start);
      startDateObj.setHours(0, 0, 0, 0);
      const startDateTime = startDateObj.toISOString();
      
      // End date: end of the day (23:59:59.999)
      const endDateObj = new Date(end);
      endDateObj.setHours(23, 59, 59, 999);
      const endDateTime = endDateObj.toISOString();
      
      const response = await apiClient.get<ApiResponse<ChildReportData>>(
        `/reports/child/${childId}?startDate=${encodeURIComponent(startDateTime)}&endDate=${encodeURIComponent(endDateTime)}&lang=${language}`
      );
      if (response.data.success && response.data.data) {
        setReport(response.data.data);
        // If the report includes a saved AI summary, display it automatically
        if (response.data.data.aiSummary) {
          console.log('[Reports] Found saved AI summary:', {
            childId: selectedChildId,
            dateRange: `${startDate} to ${endDate}`,
            userRole: user?.role,
            hasSummary: !!response.data.data.aiSummary.summary,
            hasRecommendations: !!response.data.data.aiSummary.recommendations,
            createdAt: response.data.data.aiSummary.createdAt,
          });
          setAiSummary({
            summary: response.data.data.aiSummary.summary,
            recommendations: response.data.data.aiSummary.recommendations,
          });
        } else {
          console.log('[Reports] No saved AI summary found:', {
            childId: selectedChildId,
            dateRange: `${startDate} to ${endDate}`,
            userRole: user?.role,
          });
          // Clear AI summary if no saved one exists
          setAiSummary(null);
        }
      } else {
        setReport(null);
        setError(response.data.error || 'No report data available');
      }
    } catch (err: any) {
      setReport(null);
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoadingReport(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await apiClient.get<ApiResponse<{ subscription: any; aiWallet: any; planConfig: any }>>('/subscriptions/me');
      if (response.data.success && response.data.data) {
        setSubscription(response.data.data.subscription);
        setPlanConfig(response.data.data.planConfig);
      }
    } catch (err: any) {
      console.error('Failed to fetch subscription:', err);
    }
  };

  const generateAISummary = async () => {
    if (!selectedChildId || !report) return;

    try {
      setLoadingAI(true);
      setAiError('');
      // Convert dates to ISO datetime strings for backend
      // Start date: beginning of the day (00:00:00)
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      const startDateTime = startDateObj.toISOString();
      
      // End date: end of the day (23:59:59.999)
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      const endDateTime = endDateObj.toISOString();
      
      const response = await apiClient.post<ApiResponse<{ summary: string; recommendations: string; tokensUsed: number }>>(
        `/reports/child/${selectedChildId}/ai-summary?startDate=${encodeURIComponent(startDateTime)}&endDate=${encodeURIComponent(endDateTime)}&lang=${language}`
      );
      if (response.data.success && response.data.data) {
        setAiSummary({
          summary: response.data.data.summary,
          recommendations: response.data.data.recommendations,
        });
      } else {
        setAiError(response.data.error || 'Failed to generate AI summary');
      }
    } catch (err: any) {
      setAiError(err.response?.data?.error || 'Failed to generate AI summary');
    } finally {
      setLoadingAI(false);
    }
  };

  const copyToClipboard = async (sectionKey: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionKey);
      window.setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      setAiError('Could not copy to clipboard');
    }
  };

  const canSeeAISummary = useMemo(() => {
    // Parents do not see the AI Summary & Recommendations section on Reports.
    if (user?.role === 'parent') {
      return false;
    }
    if (isClinicalOrAdmin(user?.role)) {
      return true;
    }
    return false;
  }, [user?.role]);


  const ratingLabel = useMemo(() => {
    if (!report?.avgRating) return 'N/A';
    if (report.avgRating >= 4.5) return 'Excellent';
    if (report.avgRating >= 3.5) return 'Great';
    if (report.avgRating >= 2.5) return 'Average';
    return 'Needs Attention';
  }, [report]);

  if (!user) return null;

  if (loadingChildren) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div className="h-32 animate-pulse rounded-2xl bg-[#1A2B4C]/10" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#E5E8EB] bg-white" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (children.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <DashboardPageHeader
            icon={BarChart3}
            title={t('reportsAndCharts')}
            subtitle={t('visualizeProgress')}
          />
          <DashboardSectionCard>
            <div className="py-10 text-center">
              <p className="mb-4 text-[#1A2B4C]/60">No children available yet.</p>
              {user.role === 'parent' && (
                <Link href="/dashboard/children/new">
                  <Button variant="brand" className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden />
                    Add your first child
                  </Button>
                </Link>
              )}
            </div>
          </DashboardSectionCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <DashboardPageHeader
          icon={BarChart3}
          title={t('reportsAndCharts')}
          subtitle={t('visualizeProgress')}
        />

        <DashboardSectionCard title="Filter laporan">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-xs">
              <label htmlFor="childSelect" className="mb-1.5 block text-sm font-medium text-[#1A2B4C]/70">
                Anak
              </label>
              <select
                id="childSelect"
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full rounded-xl border border-[#E5E8EB] px-4 py-2.5 text-[#1A2B4C] focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30"
                style={{ WebkitTextFillColor: '#1A2B4C', color: '#1A2B4C' }}
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id.toString()}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label htmlFor="startDate" className="mb-1.5 block text-sm font-medium text-[#1A2B4C]/70">
                  {t('fromLabel')}
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    if (newStart <= endDate) setStartDate(newStart);
                  }}
                  max={endDate}
                  className="w-full rounded-xl border border-[#E5E8EB] px-3 py-2.5 text-[#1A2B4C] focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30 sm:w-auto"
                  style={{ WebkitTextFillColor: '#1A2B4C', color: '#1A2B4C' }}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="mb-1.5 block text-sm font-medium text-[#1A2B4C]/70">
                  {t('toLabel')}
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    if (newEnd >= startDate) setEndDate(newEnd);
                  }}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-xl border border-[#E5E8EB] px-3 py-2.5 text-[#1A2B4C] focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30 sm:w-auto"
                  style={{ WebkitTextFillColor: '#1A2B4C', color: '#1A2B4C' }}
                />
              </div>
            </div>
          </div>
        </DashboardSectionCard>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loadingReport ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-[#E5E8EB] bg-white" />
            ))}
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* AI Summary and Recommendations */}
            {canSeeAISummary && (
              <DashboardSectionCard
                className="border-[#00C1B2]/20 bg-gradient-to-br from-[#00C1B2]/5 to-[#1A2B4C]/5"
                title={
                  <span className="flex items-center gap-2">
                    <span aria-hidden>🤖</span>
                    {t('aiSummaryAndRecommendations')}
                  </span>
                }
                subtitle={
                  aiSummary
                    ? `${t('savedSummaryForRange')} ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                    : t('aiInsightsDescription')
                }
                action={
                  !aiSummary ? (
                    <Button
                      onClick={generateAISummary}
                      disabled={loadingAI}
                      variant="brand"
                      size="sm"
                    >
                      {loadingAI ? t('generatingReport') : t('generateAISummary')}
                    </Button>
                  ) : undefined
                }
              >
                {aiError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {aiError}
                  </div>
                )}

                {loadingAI && (
                  <div className="py-8 text-center text-[#1A2B4C]/60">
                    <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[#00C1B2]" />
                    <p>{t('analyzingData')}</p>
                  </div>
                )}

                {aiSummary && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-sm"
                        onClick={() =>
                          copyToClipboard(
                            'all',
                            `${aiSummary.summary}\n\n---\n\n${aiSummary.recommendations}`,
                          )
                        }
                      >
                        {copiedSection === 'all' ? (
                          <Check className="h-4 w-4 text-[#00A896]" aria-hidden />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden />
                        )}
                        {copiedSection === 'all' ? t('copied') : t('copyAll')}
                      </Button>
                      <Button
                        onClick={() => {
                          setAiSummary(null);
                          setAiError('');
                        }}
                        variant="outline"
                        className="text-sm"
                      >
                        {t('regenerate')}
                      </Button>
                    </div>

                    <div className="rounded-xl border border-[#E5E8EB] bg-white p-5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <h3 className="flex items-center gap-2 font-montserrat text-lg font-bold text-[#1A2B4C]">
                          <span aria-hidden>📊</span>
                          {t('summaryLabel')}
                        </h3>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('summary', aiSummary.summary)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E8EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1A2B4C]/70 hover:bg-[#FDF8F1]"
                        >
                          {copiedSection === 'summary' ? (
                            <Check className="h-3.5 w-3.5 text-[#00A896]" aria-hidden />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {copiedSection === 'summary' ? t('copied') : t('copy')}
                        </button>
                      </div>
                      <div className="prose prose-sm max-w-none text-[#1A2B4C]/80">
                        <ReactMarkdown>{aiSummary.summary}</ReactMarkdown>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#00C1B2]/20 bg-white p-5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="flex items-center gap-2 font-montserrat text-lg font-bold text-[#1A2B4C]">
                            <span aria-hidden>🎯</span>
                            {t('esdmActivityPrescription')}
                          </h3>
                          <p className="mt-1 text-xs text-[#1A2B4C]/55">
                            {t('recommendationsLabel')} — 15 min joint activity routines
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('rec', aiSummary.recommendations)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E5E8EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1A2B4C]/70 hover:bg-[#FDF8F1]"
                        >
                          {copiedSection === 'rec' ? (
                            <Check className="h-3.5 w-3.5 text-[#00A896]" aria-hidden />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {copiedSection === 'rec' ? t('copied') : t('copy')}
                        </button>
                      </div>
                      <div className="prose prose-sm max-w-none text-[#1A2B4C]/80">
                        <ReactMarkdown>{aiSummary.recommendations}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </DashboardSectionCard>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <DashboardStatCard
                value={report.totalLogs}
                label={t('totalLogsLabel')}
                icon={BarChart3}
                accent="teal"
              />
              <DashboardStatCard
                value={report.avgRating?.toFixed(1) ?? 'N/A'}
                label={`${t('avgRatingLabel')} · ${ratingLabel}`}
                icon={BarChart3}
                accent="gold"
              />
            </div>

            <DashboardSectionCard title={t('activityTrend')} subtitle={t('logsPerDay')}>
              {report.logsByDate.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={report.logsByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#00C1B2"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-[#1A2B4C]/55">{t('noLogsInRange')}</div>
              )}
            </DashboardSectionCard>

            <DashboardSectionCard
              title={t('topPracticedSkills')}
              subtitle={t('basedOnParentSubmissions')}
            >
              {report.skillsFrequency.length > 0 ? (
                <ResponsiveContainer width="100%" height={skillsChartConfig.height}>
                  <BarChart
                    layout="vertical"
                    data={report.skillsFrequency}
                    margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: '#1A2B4C', fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      width={skillsChartConfig.yAxisWidth}
                      tick={{ fill: '#1A2B4C', fontSize: 11 }}
                      tickFormatter={(value) => truncateChartLabel(String(value))}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, t('skillsFrequency')]}
                      labelFormatter={(label) => String(label)}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: '#E5E8EB',
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="count" fill="#00C1B2" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-[#1A2B4C]/55">{t('noSkillData')}</div>
              )}
            </DashboardSectionCard>

            <DashboardSectionCard title={t('goalStatus')} subtitle={t('currentGoalBreakdown')}>
              {report.goalStatusCounts.some((item) => item.count > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={report.goalStatusCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FFB900" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-[#1A2B4C]/55">{t('noGoalsYet')}</div>
              )}
            </DashboardSectionCard>

            <DashboardSectionCard
              title={t('recentParentLogs')}
              subtitle={t('latestSubmissions')}
              action={
                <Link
                  href="/dashboard/logs"
                  className="text-sm font-semibold text-[#00C1B2] hover:text-[#00A896] transition-colors"
                >
                  {t('viewAllLogs')}
                </Link>
              }
            >
              {report.recentLogs.length > 0 ? (
                <div className="space-y-3">
                  {report.recentLogs.map((log) => (
                    <Link
                      key={log.id}
                      href={`/dashboard/logs/${log.id}/review`}
                      className="block rounded-xl border border-[#E5E8EB] bg-white p-4 transition-all hover:border-[#00C1B2]/30 hover:shadow-md"
                    >
                      <div className="min-w-0">
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
                        <ActivityLogEntryBody
                          log={log as ParentLog}
                          language={language}
                          compact
                        />
                        {log.therapist_comment && (
                          <div className="mt-2 rounded-lg border border-[#00C1B2]/20 bg-[#00C1B2]/5 p-2">
                            <p className="text-xs font-medium text-[#00A896]">Review Comment:</p>
                            <p className="text-sm text-[#1A2B4C]/80">{log.therapist_comment}</p>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#1A2B4C]/55">{t('noRecentLogs')}</div>
              )}
            </DashboardSectionCard>
          </div>
        ) : (
          <DashboardSectionCard>
            <div className="py-10 text-center text-[#1A2B4C]/60">
              {t('selectChildToGenerateReport')}
            </div>
          </DashboardSectionCard>
        )}
      </div>
    </DashboardLayout>
  );
}

