import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { apiClient, ApiResponse } from '@/lib/api';

export interface BiometricCredential {
  id: number;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
}

/** Remembers the last account that signed in, so the login page can offer biometrics. */
const LAST_EMAIL_KEY = 'gradion-biometric-last-email';

export function rememberBiometricEmail(email: string) {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    // Storage disabled — biometric sign-in still works by typing the email.
  }
}

export function getRememberedBiometricEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * True when this browser/device can do built-in biometrics (Face ID, Touch ID,
 * fingerprint, Windows Hello). Requires HTTPS (or localhost).
 */
export async function biometricIsAvailable(): Promise<boolean> {
  try {
    if (!browserSupportsWebAuthn()) return false;
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/** A human-friendly device name, e.g. "iPhone · Safari". */
export function describeCurrentDevice(): string {
  if (typeof navigator === 'undefined') return 'Perangkat ini';
  const ua = navigator.userAgent;
  const platform = /iPhone/i.test(ua)
    ? 'iPhone'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua)
        ? 'Android'
        : /Macintosh/i.test(ua)
          ? 'Mac'
          : /Windows/i.test(ua)
            ? 'Windows'
            : 'Perangkat ini';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua) && !/Edg\//i.test(ua)
      ? 'Chrome'
      : /Safari\//i.test(ua) && !/Chrome\//i.test(ua)
        ? 'Safari'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : '';
  return browser ? `${platform} · ${browser}` : platform;
}

function apiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string } }; name?: string; message?: string };
  // The browser throws when the user cancels or the device times out.
  if (e?.name === 'NotAllowedError') {
    return 'Biometrik dibatalkan atau waktu habis. Silakan coba lagi.';
  }
  if (e?.name === 'InvalidStateError') {
    return 'Perangkat ini sudah terdaftar untuk akun Anda.';
  }
  return e?.response?.data?.error || e?.message || fallback;
}

/** Register the current device as a passkey for the signed-in user. */
export async function registerBiometric(deviceLabel?: string): Promise<BiometricCredential> {
  try {
    const optionsRes = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      '/auth/webauthn/register/options',
      {}
    );
    if (!optionsRes.data.success || !optionsRes.data.data) {
      throw new Error(optionsRes.data.error || 'Gagal memulai pendaftaran biometrik');
    }

    const attestation = await startRegistration({ optionsJSON: optionsRes.data.data as any });

    const verifyRes = await apiClient.post<ApiResponse<BiometricCredential>>(
      '/auth/webauthn/register/verify',
      { response: attestation, device_label: deviceLabel || describeCurrentDevice() }
    );
    if (!verifyRes.data.success || !verifyRes.data.data) {
      throw new Error(verifyRes.data.error || 'Gagal memverifikasi perangkat');
    }
    return verifyRes.data.data;
  } catch (err) {
    throw new Error(apiError(err, 'Gagal mengaktifkan login biometrik'));
  }
}

export interface BiometricLoginResult {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'therapist' | 'consultant' | 'parent';
    is_email_verified: boolean;
  };
}

/** Sign in with a registered passkey. Email is optional. */
export async function loginWithBiometric(email?: string): Promise<BiometricLoginResult> {
  try {
    const optionsRes = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      '/auth/webauthn/login/options',
      { email: email || undefined }
    );
    if (!optionsRes.data.success || !optionsRes.data.data) {
      throw new Error(optionsRes.data.error || 'Gagal memulai login biometrik');
    }

    const assertion = await startAuthentication({ optionsJSON: optionsRes.data.data as any });

    const verifyRes = await apiClient.post<ApiResponse<BiometricLoginResult>>(
      '/auth/webauthn/login/verify',
      { response: assertion }
    );
    if (!verifyRes.data.success || !verifyRes.data.data) {
      throw new Error(verifyRes.data.error || 'Login biometrik gagal');
    }
    return verifyRes.data.data;
  } catch (err) {
    throw new Error(apiError(err, 'Login biometrik gagal'));
  }
}

export async function listBiometricCredentials(): Promise<BiometricCredential[]> {
  const res = await apiClient.get<ApiResponse<BiometricCredential[]>>(
    '/auth/webauthn/credentials'
  );
  return res.data.success ? res.data.data || [] : [];
}

export async function removeBiometricCredential(id: number): Promise<void> {
  const res = await apiClient.delete<ApiResponse<unknown>>(`/auth/webauthn/credentials/${id}`);
  if (!res.data.success) {
    throw new Error(res.data.error || 'Gagal menghapus perangkat');
  }
}
