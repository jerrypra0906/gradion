import type { User } from './api';

/** Therapist or consultant — clinical staff using child/session workflows */
export function isClinicalStaff(role: User['role'] | undefined): boolean {
  return role === 'therapist' || role === 'consultant';
}

export function isClinicalOrAdmin(role: User['role'] | undefined): boolean {
  return role === 'admin' || isClinicalStaff(role);
}
