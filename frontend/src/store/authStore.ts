import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse, ApiResponse, apiClient, AUTH_TOKEN_KEY } from '@/lib/api';

const LEGACY_AUTH_TOKEN_KEY = 'langkahkecil_token';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: 'admin' | 'therapist' | 'parent',
    phone_number: string,
    referral_code?: string
  ) => Promise<string>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<string>;
  resendVerification: (email: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', {
            email,
            password,
          });

          if (response.data.success && response.data.data) {
            const { token, user } = response.data.data;
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
            set({
              user,
              token,
              isAuthenticated: true,
            });
          } else {
            throw new Error(response.data.error || 'Login failed');
          }
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Login failed');
        }
      },

      register: async (
        name: string,
        email: string,
        password: string,
        role: 'admin' | 'therapist' | 'parent',
        phone_number: string,
        referral_code?: string
      ) => {
        try {
          const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/register', {
            name,
            email,
            password,
            role,
            phone_number,
            referral_code,
          });

          if (response.data.success && response.data.data) {
            return response.data.data.message || 'Registration successful. Please verify your email.';
          }
          throw new Error(response.data.error || 'Registration failed');
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Registration failed');
        }
      },

      logout: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      fetchCurrentUser: async () => {
        try {
          const response = await apiClient.get<ApiResponse<User>>('/auth/me');
          if (response.data.success && response.data.data) {
            set({
              user: response.data.data,
              isAuthenticated: true,
            });
          }
        } catch (error) {
          get().logout();
        }
      },

      loginWithGoogle: async (credential: string) => {
        try {
          const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/google', {
            credential,
          });

          if (response.data.success && response.data.data) {
            const { token, user } = response.data.data;
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
            set({
              user,
              token,
              isAuthenticated: true,
            });
          } else {
            throw new Error(response.data.error || 'Google login failed');
          }
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Google login failed');
        }
      },

      verifyEmail: async (token: string) => {
        try {
          const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/verify-email', {
            token,
          });

          if (response.data.success && response.data.data) {
            return response.data.data.message || 'Email verified successfully.';
          }
          throw new Error(response.data.error || 'Verification failed');
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Verification failed');
        }
      },

      resendVerification: async (email: string) => {
        try {
          const response = await apiClient.post<ApiResponse<{ message: string }>>(
            '/auth/resend-verification',
            { email }
          );

          if (response.data.success && response.data.data) {
            return response.data.data.message || 'Verification email sent.';
          }
          throw new Error(response.data.error || 'Unable to resend verification email');
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Unable to resend verification email');
        }
      },

      forgotPassword: async (email: string) => {
        try {
          const response = await apiClient.post<ApiResponse<{ message: string }>>(
            '/auth/forgot-password',
            { email }
          );

          if (response.data.success && response.data.data) {
            return response.data.data.message || 'If an account exists, a password reset link has been sent.';
          }
          throw new Error(response.data.error || 'Unable to process password reset request');
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Unable to process password reset request');
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        try {
          const response = await apiClient.post<ApiResponse<{ message: string }>>(
            '/auth/reset-password',
            { token, newPassword }
          );

          if (response.data.success && response.data.data) {
            return response.data.data.message || 'Password reset successfully.';
          }
          throw new Error(response.data.error || 'Unable to reset password');
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Unable to reset password');
        }
      },
    }),
    {
      name: 'gradion-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

