import { AUTH_TOKEN_KEY } from '@/lib/api';

const SESSION_KEY = 'gradion-analytics-session';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/**
 * A "session" is one continuous visit; it resets after 30 minutes of
 * inactivity, which is what makes drop-off (last page of a visit) meaningful.
 */
const SESSION_TTL_MS = 30 * 60 * 1000;

type StoredSession = { id: string; last: number };

function newSessionId() {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return String(rand).slice(0, 64);
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    const now = Date.now();
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed?.id && now - (parsed.last || 0) < SESSION_TTL_MS) {
        const updated: StoredSession = { id: parsed.id, last: now };
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        return parsed.id;
      }
    }
    const fresh: StoredSession = { id: newSessionId(), last: now };
    localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
    return fresh.id;
  } catch {
    return 'anonymous';
  }
}

function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
      ? 'Android'
      : /Macintosh/i.test(ua)
        ? 'macOS'
        : /Windows/i.test(ua)
          ? 'Windows'
          : 'Other';
  const kind = /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
  return `${os}/${kind}`;
}

function authHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

type PendingView = {
  session_id: string;
  path: string;
  referrer_path: string | null;
  entered_at: string;
  duration_ms: number;
  is_exit: boolean;
  device: string;
};

let currentPath: string | null = null;
let currentEnteredAt = 0;
let previousPath: string | null = null;
/** Time already accumulated on this page before the tab was hidden. */
let accumulatedMs = 0;
let visibleSince = 0;
let started = false;

function elapsedMs(): number {
  const live = visibleSince ? Date.now() - visibleSince : 0;
  return accumulatedMs + live;
}

/** Fire-and-forget send; uses sendBeacon when the page is going away. */
function sendViews(views: PendingView[], useBeacon: boolean) {
  if (!views.length) return;
  const url = `${API_BASE}/analytics/page-views`;
  const payload = JSON.stringify({ views });

  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    // Beacon can't carry an Authorization header; the backend treats these as
    // anonymous but still records the page, duration and session.
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    return;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

function flushCurrent(isExit: boolean, useBeacon = false) {
  if (!currentPath) return;
  const view: PendingView = {
    session_id: getSessionId(),
    path: currentPath,
    referrer_path: previousPath,
    entered_at: new Date(currentEnteredAt).toISOString(),
    duration_ms: elapsedMs(),
    is_exit: isExit,
    device: deviceLabel(),
  };
  sendViews([view], useBeacon);
}

/** Record a route change: closes the previous page's timing and opens the new one. */
export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  if (currentPath === path) return;

  if (currentPath) {
    flushCurrent(false);
    previousPath = currentPath;
  }

  currentPath = path;
  currentEnteredAt = Date.now();
  accumulatedMs = 0;
  visibleSince = document.visibilityState === 'visible' ? Date.now() : 0;

  if (!started) {
    started = true;

    // Pause the timer while the tab is hidden so "time on page" reflects
    // attention, not tabs left open overnight.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (visibleSince) {
          accumulatedMs += Date.now() - visibleSince;
          visibleSince = 0;
        }
        // The tab may never come back — record it as a possible exit.
        flushCurrent(true, true);
        currentPath = null;
      } else {
        if (!currentPath) {
          currentPath = window.location.pathname;
          currentEnteredAt = Date.now();
          accumulatedMs = 0;
        }
        visibleSince = Date.now();
      }
    });

    window.addEventListener('pagehide', () => {
      if (visibleSince) {
        accumulatedMs += Date.now() - visibleSince;
        visibleSince = 0;
      }
      flushCurrent(true, true);
      currentPath = null;
    });
  }
}

/** Report an error (JS exception or failed API call) for admin triage. */
export function reportError(input: {
  source: 'client' | 'api';
  message: string;
  name?: string;
  stack?: string;
  status_code?: number;
  path?: string;
}) {
  if (typeof window === 'undefined') return;
  try {
    void fetch(`${API_BASE}/analytics/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        session_id: getSessionId(),
        path: input.path || window.location.pathname,
        source: input.source,
        name: input.name,
        message: String(input.message).slice(0, 1000),
        stack: input.stack ? String(input.stack).slice(0, 4000) : undefined,
        status_code: input.status_code,
        device: deviceLabel(),
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never break the app.
  }
}

let globalHandlersInstalled = false;

/** Capture uncaught exceptions and unhandled promise rejections once. */
export function installGlobalErrorCapture() {
  if (typeof window === 'undefined' || globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  window.addEventListener('error', (event) => {
    if (!event?.message) return;
    reportError({
      source: 'client',
      name: event.error?.name || 'Error',
      message: event.message,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const message =
      typeof reason === 'string' ? reason : reason?.message || 'Unhandled promise rejection';
    reportError({
      source: 'client',
      name: reason?.name || 'UnhandledRejection',
      message,
      stack: reason?.stack,
    });
  });
}
