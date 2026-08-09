import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { EmailService, getEmailDeliveryStatus } from './email.service.js';

/** Where error alerts go. */
export const ERROR_ALERT_RECIPIENT = 'care@gradion.id';

/** Don't re-alert on the same problem more than once per hour. */
const ALERT_THROTTLE_MS = 60 * 60 * 1000;

/**
 * Safety net so a broad outage can't flood care@gradion.id: at most this many
 * alert emails per hour across all problems. Everything is still recorded and
 * visible in Admin → Analytics.
 */
const ALERT_MAX_PER_HOUR = 8;

/**
 * Which failures deserve an email. 4xx responses are expected outcomes
 * (missing CMS block, expired session, quota reached) and would drown the real
 * signal, so they are recorded but not emailed. Server faults, network
 * failures and uncaught client exceptions are genuine breakage.
 */
function shouldAlert(source: string, statusCode: number | null): boolean {
  if (source === 'client') return true;
  if (statusCode === null) return true; // network/CORS failure — the user saw nothing load
  return statusCode >= 500;
}

/** A single page can't sensibly hold someone for more than ~2h; clamp outliers. */
const MAX_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * Collapse concrete ids out of a route so views aggregate per screen:
 *   /dashboard/children/27/aba-program -> /dashboard/children/:id/aba-program
 * Also drops the query string, so nothing identifying is stored in the path.
 */
export function normalizePath(raw: string): string {
  const path = String(raw || '/').split('?')[0].split('#')[0];
  const normalized = path
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      if (/^\d+$/.test(segment)) return ':id';
      // UUIDs and long opaque tokens (e.g. verification links).
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment)) return ':id';
      if (segment.length > 24 && /^[A-Za-z0-9_-]+$/.test(segment)) return ':token';
      return segment;
    })
    .join('/');
  return normalized.slice(0, 200) || '/';
}

export type IncomingPageView = {
  session_id: string;
  path: string;
  referrer_path?: string | null;
  duration_ms?: number;
  is_exit?: boolean;
  entered_at?: string;
  device?: string | null;
};

/** Store a batch of page views (sent by the browser on route change / unload). */
export async function recordPageViews(input: {
  views: IncomingPageView[];
  userId?: number | null;
  role?: string | null;
}): Promise<number> {
  const rows = input.views
    .filter((v) => v && typeof v.session_id === 'string' && typeof v.path === 'string')
    .slice(0, 50)
    .map((v) => {
      const entered = v.entered_at ? new Date(v.entered_at) : new Date();
      return {
        session_id: String(v.session_id).slice(0, 64),
        user_id: input.userId ?? null,
        role: input.role ?? null,
        path: normalizePath(v.path),
        referrer_path: v.referrer_path ? normalizePath(v.referrer_path) : null,
        duration_ms: Math.max(0, Math.min(MAX_DURATION_MS, Math.round(Number(v.duration_ms) || 0))),
        is_exit: Boolean(v.is_exit),
        device: v.device ? String(v.device).slice(0, 60) : null,
        entered_at: Number.isNaN(entered.getTime()) ? new Date() : entered,
      };
    });

  if (!rows.length) return 0;
  const result = await prisma.analyticsPageView.createMany({ data: rows });
  return result.count;
}

export type IncomingError = {
  session_id?: string | null;
  path?: string | null;
  source?: string;
  name?: string | null;
  message: string;
  stack?: string | null;
  status_code?: number | null;
  device?: string | null;
};

function fingerprintOf(input: {
  source: string;
  path: string | null;
  name: string | null;
  message: string;
  statusCode: number | null;
}) {
  // Numbers in messages (ids, timestamps) would fragment otherwise-identical errors.
  const stableMessage = input.message.replace(/\d+/g, 'N').slice(0, 300);
  return crypto
    .createHash('sha1')
    .update([input.source, input.path ?? '', input.name ?? '', stableMessage, input.statusCode ?? ''].join('|'))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Record an error and, when it's a newly-seen problem (or the first recurrence
 * after the throttle window), email care@gradion.id. Best-effort: reporting an
 * error must never itself throw into the request path.
 */
export async function recordError(input: {
  error: IncomingError;
  userId?: number | null;
  role?: string | null;
  userEmail?: string | null;
}): Promise<{ id: string; notified: boolean }> {
  const source = ['client', 'api', 'server'].includes(String(input.error.source))
    ? String(input.error.source)
    : 'client';
  const path = input.error.path ? normalizePath(input.error.path) : null;
  const name = input.error.name ? String(input.error.name).slice(0, 120) : null;
  const message = String(input.error.message || 'Unknown error').slice(0, 1000);
  const statusCode = Number.isFinite(Number(input.error.status_code))
    ? Number(input.error.status_code)
    : null;
  const fingerprint = fingerprintOf({ source, path, name, message, statusCode });

  const row = await prisma.analyticsError.create({
    data: {
      session_id: input.error.session_id ? String(input.error.session_id).slice(0, 64) : null,
      user_id: input.userId ?? null,
      role: input.role ?? null,
      path,
      source,
      name,
      message,
      stack: input.error.stack ? String(input.error.stack).slice(0, 4000) : null,
      status_code: statusCode,
      fingerprint,
      device: input.error.device ? String(input.error.device).slice(0, 60) : null,
    },
  });

  let notified = false;
  try {
    const since = new Date(Date.now() - ALERT_THROTTLE_MS);
    const recentlyNotified = await prisma.analyticsError.findFirst({
      where: { fingerprint, notified_at: { gte: since }, id: { not: row.id } },
      select: { id: true },
    });
    const alertsThisHour = await prisma.analyticsError.count({
      where: { notified_at: { gte: since } },
    });

    if (!shouldAlert(source, statusCode)) {
      // Recorded for the dashboard, but not worth an email.
    } else if (alertsThisHour >= ALERT_MAX_PER_HOUR) {
      logger.warn({ fingerprint }, 'Error alert suppressed — hourly email cap reached');
    } else if (!recentlyNotified) {
      const occurrences = await prisma.analyticsError.count({ where: { fingerprint } });
      const sent = await sendErrorAlert({
        fingerprint,
        source,
        path,
        name,
        message,
        statusCode,
        occurrences,
        userEmail: input.userEmail ?? null,
        role: input.role ?? null,
        stack: input.error.stack ?? null,
      });
      if (sent) {
        await prisma.analyticsError.update({
          where: { id: row.id },
          data: { notified_at: new Date() },
        });
        notified = true;
      }
    }
  } catch (err) {
    logger.warn({ err, fingerprint }, 'Failed to process error alert');
  }

  return { id: String(row.id), notified };
}

async function sendErrorAlert(input: {
  fingerprint: string;
  source: string;
  path: string | null;
  name: string | null;
  message: string;
  statusCode: number | null;
  occurrences: number;
  userEmail: string | null;
  role: string | null;
  stack: string | null;
}): Promise<boolean> {
  if (!getEmailDeliveryStatus().configured) return false;

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const analyticsUrl = `${config.frontendUrl}/dashboard/admin/analytics`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;white-space:nowrap;">${label}</td><td style="padding:6px 0;">${value}</td></tr>`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color:#b91c1c;">Gradion error report</h2>
      <p>An error was captured in the app${
        input.occurrences > 1 ? ` (seen ${input.occurrences}× in total)` : ' (first time seen)'
      }.</p>
      <div style="background:#fef2f2;border-left:4px solid #b91c1c;padding:14px 18px;border-radius:8px;margin:18px 0;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${row('Where', escape(input.path || 'unknown page'))}
          ${row('Type', escape(`${input.source}${input.name ? ` · ${input.name}` : ''}`))}
          ${input.statusCode ? row('Status', String(input.statusCode)) : ''}
          ${row('Message', escape(input.message))}
          ${row('User', escape(input.userEmail || 'not signed in'))}
          ${input.role ? row('Role', escape(input.role)) : ''}
          ${row('Fingerprint', input.fingerprint)}
        </table>
      </div>
      ${
        input.stack
          ? `<pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;white-space:pre-wrap;">${escape(
              String(input.stack).slice(0, 1500)
            )}</pre>`
          : ''
      }
      <p><a href="${analyticsUrl}" style="background:#1A2B4C;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Open Admin Analytics</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        Repeats of this same error are muted for 1 hour to avoid flooding this inbox.
      </p>
    </div>
  `;

  try {
    const emailService = new EmailService();
    await emailService.sendEmail({
      to: ERROR_ALERT_RECIPIENT,
      subject: `[Gradion] Error on ${input.path || 'app'} — ${input.message.slice(0, 80)}`,
      html,
    });
    logger.info({ fingerprint: input.fingerprint }, 'Sent error alert email');
    return true;
  } catch (err) {
    logger.warn({ err }, 'Failed to send error alert email');
    return false;
  }
}

/**
 * Engagement + drop-off report over the last N days.
 * Drop-off = share of views of a page that were the last page of the session.
 */
export async function getEngagementReport(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const pages = await prisma.$queryRaw<
    Array<{
      path: string;
      views: bigint;
      visitors: bigint;
      avg_duration_ms: number | null;
      median_duration_ms: number | null;
      exits: bigint;
    }>
  >`
    SELECT path,
           COUNT(*)                                        AS views,
           COUNT(DISTINCT session_id)                      AS visitors,
           AVG(duration_ms)                                AS avg_duration_ms,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) AS median_duration_ms,
           COUNT(*) FILTER (WHERE is_exit)                 AS exits
    FROM analytics_page_views
    WHERE entered_at >= ${since}
    GROUP BY path
    ORDER BY views DESC
    LIMIT 40
  `;

  const totals = await prisma.$queryRaw<
    Array<{ views: bigint; sessions: bigint; users: bigint; avg_duration_ms: number | null }>
  >`
    SELECT COUNT(*) AS views,
           COUNT(DISTINCT session_id) AS sessions,
           COUNT(DISTINCT user_id) AS users,
           AVG(duration_ms) AS avg_duration_ms
    FROM analytics_page_views
    WHERE entered_at >= ${since}
  `;

  // Sessions that only ever saw one page — the sharpest bounce signal.
  const bounce = await prisma.$queryRaw<Array<{ single: bigint; total: bigint }>>`
    SELECT COUNT(*) FILTER (WHERE page_count = 1) AS single,
           COUNT(*)                               AS total
    FROM (
      SELECT session_id, COUNT(*) AS page_count
      FROM analytics_page_views
      WHERE entered_at >= ${since}
      GROUP BY session_id
    ) s
  `;

  const num = (v: bigint | number | null) => Number(v ?? 0);

  return {
    range_days: days,
    totals: {
      views: num(totals[0]?.views),
      sessions: num(totals[0]?.sessions),
      users: num(totals[0]?.users),
      avg_duration_ms: Math.round(num(totals[0]?.avg_duration_ms)),
      single_page_sessions: num(bounce[0]?.single),
      bounce_rate_pct: num(bounce[0]?.total)
        ? Math.round((num(bounce[0]?.single) / num(bounce[0]?.total)) * 100)
        : 0,
    },
    pages: pages.map((p) => ({
      path: p.path,
      views: num(p.views),
      visitors: num(p.visitors),
      avg_duration_ms: Math.round(num(p.avg_duration_ms)),
      median_duration_ms: Math.round(num(p.median_duration_ms)),
      exits: num(p.exits),
      exit_rate_pct: num(p.views) ? Math.round((num(p.exits) / num(p.views)) * 100) : 0,
    })),
  };
}

/** Errors grouped by fingerprint over the last N days. */
export async function getErrorReport(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const groups = await prisma.$queryRaw<
    Array<{
      fingerprint: string;
      source: string;
      path: string | null;
      name: string | null;
      message: string;
      status_code: number | null;
      occurrences: bigint;
      affected_users: bigint;
      last_seen: Date;
    }>
  >`
    SELECT fingerprint,
           MIN(source)   AS source,
           MIN(path)     AS path,
           MIN(name)     AS name,
           MIN(message)  AS message,
           MIN(status_code) AS status_code,
           COUNT(*)      AS occurrences,
           COUNT(DISTINCT user_id) AS affected_users,
           MAX(created_at) AS last_seen
    FROM analytics_errors
    WHERE created_at >= ${since}
    GROUP BY fingerprint
    ORDER BY MAX(created_at) DESC
    LIMIT 50
  `;

  const total = await prisma.analyticsError.count({ where: { created_at: { gte: since } } });

  return {
    range_days: days,
    total,
    groups: groups.map((g) => ({
      fingerprint: g.fingerprint,
      source: g.source,
      path: g.path,
      name: g.name,
      message: g.message,
      status_code: g.status_code,
      occurrences: Number(g.occurrences),
      affected_users: Number(g.affected_users),
      last_seen: g.last_seen,
    })),
  };
}
