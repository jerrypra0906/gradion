// Common types for the application

export type Role = 'admin' | 'therapist' | 'consultant' | 'parent';

export type BannerAudience = 'parents' | 'therapists' | 'all';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

