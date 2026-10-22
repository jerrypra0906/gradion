/** Shared helpers for the admin video-validation pages. */

export function scoreClass(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-600';
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

/** Seconds → "M:SS". */
export function clock(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined) return '—';
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "MM:SS" / "M:SS" / "H:MM:SS" → seconds, or null when it isn't a time. */
export function parseTimestamp(value: string | null | undefined): number | null {
  const m = String(value ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return m[3] !== undefined
    ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
    : Number(m[1]) * 60 + Number(m[2]);
}
