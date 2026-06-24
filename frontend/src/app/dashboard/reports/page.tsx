/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Child, ChildReportData } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
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
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Check, Copy } from 'lucide-react';

export default function ReportsPage() {
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
        <div className="py-16 text-center text-gray-500">Loading children...</div>
      </DashboardLayout>
    );
  }

  if (children.length === 0) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center">
          <p className="text-gray-500 mb-4">No children available yet.</p>
          {user.role === 'parent' && (
            <Link href="/dashboard/children/new">
              <Button>Add your first child</Button>
            </Link>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('reportsAndCharts')}</h1>
            <p className="text-gray-600 mt-1">
              {t('visualizeProgress')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
            >
              {children.map((child) => (
                <option key={child.id} value={child.id.toString()}>
                  {child.name}
                </option>
              ))}
            </select>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="flex items-center gap-2">
                <label htmlFor="startDate" className="text-sm text-gray-600 whitespace-nowrap">
                  {t('fromLabel')}:
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    if (newStart <= endDate) {
                      setStartDate(newStart);
                    }
                  }}
                  max={endDate}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 flex-1 sm:flex-none"
                  style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="endDate" className="text-sm text-gray-600 whitespace-nowrap">
                  {t('toLabel')}:
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    if (newEnd >= startDate) {
                      setEndDate(newEnd);
                    }
                  }}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 flex-1 sm:flex-none"
                  style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loadingReport ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            {t('generatingReport')}
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* AI Summary and Recommendations */}
            {canSeeAISummary && (
              <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">🤖</span>
                      {t('aiSummaryAndRecommendations')}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {aiSummary 
                        ? `${t('savedSummaryForRange')} ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                        : t('aiInsightsDescription')}
                    </p>
                  </div>
                  {!aiSummary && (
                    <Button
                      onClick={generateAISummary}
                      disabled={loadingAI}
                      className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3"
                      size="sm"
                    >
                      {loadingAI ? t('generatingReport') : t('generateAISummary')}
                    </Button>
                  )}
                </div>

                {aiError && (
                  <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                    {aiError}
                  </div>
                )}

                {loadingAI && (
                  <div className="py-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
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
                        className="text-sm gap-1.5"
                        onClick={() =>
                          copyToClipboard(
                            'all',
                            `${aiSummary.summary}\n\n---\n\n${aiSummary.recommendations}`
                          )
                        }
                      >
                        {copiedSection === 'all' ? (
                          <Check className="h-4 w-4 text-green-600" aria-hidden />
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

                    {/* Sections 1–2: analysis (markdown) */}
                    <div className="rounded-lg bg-white p-5 border border-purple-100">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span>📊</span>
                          {t('summaryLabel')}
                        </h3>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('summary', aiSummary.summary)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {copiedSection === 'summary' ? (
                            <Check className="h-3.5 w-3.5 text-green-600" aria-hidden />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {copiedSection === 'summary' ? t('copied') : t('copy')}
                        </button>
                      </div>
                      <div className="prose prose-sm prose-headings:scroll-mt-20 prose-h2:text-base prose-h3:text-sm prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 max-w-none text-gray-700">
                        <ReactMarkdown>{aiSummary.summary}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Section 3: ESDM JARs (markdown) */}
                    <div className="rounded-lg bg-white p-5 border border-blue-100">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <span>🎯</span>
                            {t('esdmActivityPrescription')}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('recommendationsLabel')} — 15 min joint activity routines
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard('rec', aiSummary.recommendations)
                          }
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 shrink-0"
                        >
                          {copiedSection === 'rec' ? (
                            <Check className="h-3.5 w-3.5 text-green-600" aria-hidden />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {copiedSection === 'rec' ? t('copied') : t('copy')}
                        </button>
                      </div>
                      <div className="prose prose-sm prose-headings:scroll-mt-20 prose-h2:text-base prose-h3:text-sm prose-p:text-gray-700 prose-li:text-gray-700 prose-ul:list-disc prose-ol:list-decimal prose-strong:text-gray-900 max-w-none text-gray-800">
                        <ReactMarkdown>{aiSummary.recommendations}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">{t('totalLogsLabel')}</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {report.totalLogs}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">{t('avgRatingLabel')}</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {report.avgRating?.toFixed(1) ?? 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">{ratingLabel}</p>
              </div>
            </div>

            {/* Logs Trend */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('activityTrend')}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t('logsPerDay')}
                    </p>
                </div>
              </div>
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
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  {t('noLogsInRange')}
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('topPracticedSkills')}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t('basedOnParentSubmissions')}
                    </p>
                </div>
              </div>
              {report.skillsFrequency.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={report.skillsFrequency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="skill" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#34D399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  {t('noSkillData')}
                </div>
              )}
            </div>

            {/* Goal Status */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('goalStatus')}
                </h3>
                <p className="text-sm text-gray-500">{t('currentGoalBreakdown')}</p>
              </div>
              {report.goalStatusCounts.some((item) => item.count > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={report.goalStatusCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  {t('noGoalsYet')}
                </div>
              )}
            </div>

            {/* Recent logs */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('recentParentLogs')}
                  </h3>
                  <p className="text-sm text-gray-500">{t('latestSubmissions')}</p>
                </div>
                <Link href="/dashboard/logs" className="text-sm text-blue-600 hover:text-blue-800">
                  {t('viewAllLogs')}
                </Link>
              </div>
              {report.recentLogs.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {report.recentLogs.map((log) => (
                    <div key={log.id} className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(log.log_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">{log.activities}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                          {log.skills_practiced.map((skill, idx) => (
                            <span
                              key={`${skill.name}-${idx}`}
                              className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 flex items-center gap-1"
                            >
                              {skill.name}
                              <span className="text-[11px] text-gray-500">({skill.rating}/5)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl">{['😞','😐','🙂','😊','😄'][log.rating - 1]}</p>
                        <p className="text-xs text-gray-500 capitalize">{log.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">{t('noRecentLogs')}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            {t('selectChildToGenerateReport')}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

