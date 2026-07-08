import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/** JWT storage key; legacy LangkahKecil key is read for one-time migration */
export const AUTH_TOKEN_KEY = 'gradion_token';
const LEGACY_AUTH_TOKEN_KEY = 'langkahkecil_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)
  );
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // Remove Content-Type header for FormData (let browser set it with boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    // Log request details for debugging
    console.log('[API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      hasAuth: !!config.headers.Authorization,
      isFormData: config.data instanceof FormData,
    });
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API Response]', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error: AxiosError) => {
    console.error('[API Response Error]', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code,
      request: error.request,
    });
    
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
        localStorage.removeItem('langkahkecil_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as { error?: string; message?: string } | undefined;
    return apiError?.error || apiError?.message || error.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'therapist' | 'consultant' | 'parent';
  points?: number;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AITokenWalletSummary {
  monthly_token_limit: number;
  current_token_usage: number;
  tokens_remaining: number;
  plan_type?: string;
  subscription_status?: string;
  plan_monthly_token_limit?: number;
}

export interface AITokenOperationEstimate {
  preCheck: number;
  label: string;
}

export interface AITokenInfo {
  wallet: AITokenWalletSummary & Record<string, unknown>;
  planConfig: {
    planType: string;
    status: string;
    monthlyTokenLimit: number;
    aiAccess: boolean;
    isTrial: boolean;
  };
  operationEstimates: {
    initialAssessment: AITokenOperationEstimate;
    weeklyAbaProgram: AITokenOperationEstimate;
    weeklyProgramTranslate: AITokenOperationEstimate;
    therapyNotesOcr: AITokenOperationEstimate;
  };
}

export interface Child {
  id: number;
  parent_id: number;
  name: string;
  birthdate?: string;
  diagnosis?: string;
  monthly_quota: number;
  used_sessions: number;
  /** Sum of executed ABA program durations for the current calendar week (hours). */
  weekly_hours_executed?: number;
  created_at: string;
  behaviors?: string | null;
  concerns?: string | null;
  environment?: string | null;
  initial_observation?: any | null;
  initial_assessment_report?: string | null;
  initial_assessment_report_id?: string | null;
  assessment_review_status?: AiReviewStatus;
  has_pending_assessment?: boolean;
  /** Soft delete: false = deactivated (visible to admin only). */
  is_active?: boolean;
  deactivated_at?: string | null;
  /** Total AI tokens consumed for this child (from the usage ledger). */
  ai_tokens_used?: number;
  parent?: {
    id: number;
    name: string;
    email: string;
  };
  therapists?: {
    id: number;
    name: string;
    email: string;
  }[];
}

export type AbaProgramWeekStatus = 'draft' | 'active' | 'completed';
export type AbaProgramSessionMode = 'guided' | 'upload';
export type AbaProgramSessionStatus = 'in_progress' | 'completed' | 'cancelled';
export type AiReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AbaProgramProgress {
  program_id: string;
  program_name: string;
  executions: number;
  trials: number;
  score_pct: number | null;
}

export interface AbaWeekProgramProgress {
  per_program: AbaProgramProgress[];
  avg_score_pct: number | null;
  min_executions: number;
  required_executions: number;
  can_generate_new: boolean;
  mode: 'advance' | 'reinforce';
}

export interface AbaProgramWeek {
  id: number;
  child_id: number;
  week_start: string;
  status: AbaProgramWeekStatus;
  review_status?: AiReviewStatus;
  plan_json: unknown;
  therapy_notes_json?: unknown | null;
  mainstream_goal_met: boolean;
  created_at: string;
  updated_at: string;
  sessions?: AbaProgramSession[];
  program_progress?: AbaWeekProgramProgress | null;
}

export interface AbaProgramSession {
  id: number;
  week_id: number;
  user_id: number;
  mode: AbaProgramSessionMode;
  status: AbaProgramSessionStatus;
  upload_image_url?: string | null;
  upload_mime?: string | null;
  ocr_parsed_json?: unknown | null;
  guided_results_json?: unknown | null;
  started_at: string;
  completed_at?: string | null;
}

export interface Session {
  id: number;
  therapist_id: number;
  child_id: number;
  date: string;
  duration_minutes: number;
  goals_worked_on: string[];
  notes?: string;
  status?: 'pending' | 'approved' | 'flagged';
  parent_comment?: string;
  child?: {
    id: number;
    name: string;
  };
  therapist?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface SkillRating {
  name: string;
  rating: number;
  target?: string;
  trial_data?: string;
  domain?: string;
}

export interface ParentLog {
  id: number;
  parent_id: number;
  child_id: number;
  creator_id: number;
  creator_role: 'parent' | 'therapist' | 'consultant' | 'admin';
  log_date: string;
  skills_practiced: SkillRating[];
  activities: string;
  /** Duration of the logged activity in hours (default 3 on the server) */
  duration_hours?: number;
  rating: number;
  behavior_notes?: string;
  ai_summary?: string;
  therapist_comment?: string;
  status: 'pending' | 'approved' | 'flagged';
  aba_session_id?: number | null;
  created_at: string;
  updated_at: string;
  child?: {
    id: number;
    name: string;
  };
  parent?: {
    id: number;
    name: string;
    email: string;
  };
  creator?: {
    id: number;
    name: string;
    email: string;
    role: 'parent' | 'therapist' | 'admin';
  };
}

export interface Goal {
  id: number;
  child_id: number;
  therapist_id: number;
  title: string;
  description?: string;
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress_notes?: string;
  created_at: string;
  updated_at: string;
  child?: {
    id: number;
    name: string;
  };
  therapist?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface VideoFidelityReportJson {
  overall_fidelity_score: number;
  summary: string;
  prompt_fidelity: {
    score: number;
    notes: string;
    observations: Array<{ timestamp: string; detail: string }>;
  };
  reinforcer_timing: {
    score: number;
    notes: string;
    events: Array<{ timestamp: string; assessment: string }>;
  };
  improvements: string[];
}

export interface VideoFidelityJob {
  id: number;
  child_id: number;
  user_id: number;
  goal_id: number | null;
  storage_path: string;
  mime_type: string;
  file_size: number;
  abc_context: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_json: VideoFidelityReportJson | null;
  error_message: string | null;
  tokens_used: number | null;
  created_at: string;
  updated_at: string;
  child?: { id: number; name: string };
  goal?: { id: number; title: string } | null;
}

export type CMSStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface CMSContent {
  id: number;
  title: string;
  slug: string;
  content_html: string;
  status: CMSStatus;
  publish_at?: string | null;
  unpublish_at?: string | null;
  banner_id?: number | null;
  created_at: string;
  updated_at: string;
}

export type BannerAudience = 'parents' | 'therapists' | 'all';

export interface Banner {
  id: number;
  title: string;
  content: string;
  image_url?: string | null;
  target_audience: BannerAudience;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ChildReportData {
  aiSummary?: {
    summary: string;
    recommendations: string;
    createdAt: string;
  } | null;
  child: {
    id: number;
    name: string;
    parent?: {
      id: number;
      name: string;
      email: string;
    };
  };
  rangeDays: number;
  totalLogs: number;
  totalSessions: number;
  avgRating: number | null;
  logsByDate: {
    date: string;
    count: number;
    avgRating: number;
  }[];
  skillsFrequency: {
    skill: string;
    count: number;
  }[];
  sessionsByWeek: {
    week_start: string;
    count: number;
  }[];
  goalStatusCounts: {
    status: Goal['status'];
    count: number;
  }[];
  recentLogs: Array<
    Pick<
      ParentLog,
      | 'id'
      | 'log_date'
      | 'rating'
      | 'skills_practiced'
      | 'activities'
      | 'therapist_comment'
      | 'duration_hours'
      | 'aba_session_id'
      | 'creator_role'
      | 'creator'
    >
  >;
  lastLogDate?: string | null;
}

export interface LearningModuleProgress {
  id: number;
  user_id: number;
  module_key: string;
  video_completed: boolean;
  quiz_passed: boolean;
  quiz_answers?: any | null;
  created_at: string;
  updated_at: string;
}

export interface InitialObservationTemplate {
  id: number;
  key: string;
  version: number;
  template_json: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningModuleCMS {
  id: number;
  key: string;
  order: number;
  is_active: boolean;
  required_plans: Array<'free' | 'pro' | 'premium' | 'therapist'>;
  prerequisites: string[];
  youtube_url?: string | null;
  content_json: any;
  quiz_json?: any | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_type: 'free' | 'pro' | 'premium' | 'therapist';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  start_date: string;
  end_date?: string | null;
  monthly_log_quota: number;
  used_logs_this_month: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface AITokenWallet {
  id: number;
  user_id: number;
  plan_type: 'free' | 'pro' | 'premium' | 'therapist';
  monthly_token_limit: number;
  current_token_usage: number;
  renewal_date: string;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDetail {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>;
}

export interface AdminAnalytics {
  overview: {
    total_users: number;
    total_children: number;
    total_sessions: number;
    total_logs: number;
    total_subscriptions: number;
    daily_active_users: number;
    monthly_active_users: number;
  };
  aba_adoption: {
    active_children: number;
    children_ran: number;
    children_not_ran: number;
  };
  activity: {
    recent_logs: number;
    recent_sessions: number;
    log_submissions: Array<{ date: string; count: number }>;
  };
  subscriptions: {
    breakdown: Array<{ plan_type: string; status: string; count: number }>;
    funnel: {
      trial: number;
      active_paid: number;
      conversion_rate: number;
    };
  };
  ai_usage: {
    total_tokens_used: number;
    total_token_limit: number;
    avg_tokens_per_user: number;
    estimated_cost_usd: string;
    users_near_quota: Array<{
      user: User;
      current_usage: number;
      monthly_limit: number;
      usage_percentage: number;
    }>;
    top_users: Array<{
      user: User;
      tokens_used: number;
      monthly_limit: number;
    }>;
  };
  growth: {
    users: {
      this_month: number;
      last_month: number;
      growth_percentage: number;
    };
    logs: {
      this_month: number;
      last_month: number;
      growth_percentage: number;
    };
  };
}

