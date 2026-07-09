import { logger } from '../utils/logger.js';

/**
 * Minimal dependency-free daily scheduler. Each job fires once per day at a
 * fixed UTC time. We check on a short interval and dedup per (day, job) so a
 * job runs exactly once even though several ticks fall inside its target
 * minute. Indonesia (WIB) has no daylight saving, so callers convert WIB
 * clock times to UTC with a constant +7 offset.
 */
export interface DailyJob {
  name: string;
  utcHour: number;
  utcMinute: number;
  run: () => Promise<void>;
}

const WIB_OFFSET_HOURS = 7;

/** Convert a WIB (Asia/Jakarta) wall-clock hour to the equivalent UTC hour. */
export function wibHourToUtc(wibHour: number): number {
  return (wibHour - WIB_OFFSET_HOURS + 24) % 24;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

let started = false;

export function startDailyScheduler(jobs: DailyJob[]): void {
  if (started) return;
  started = true;

  const fired = new Set<string>();

  const tick = () => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const dayKey = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;

    for (const job of jobs) {
      if (job.utcHour !== h || job.utcMinute !== m) continue;
      const key = `${dayKey}:${job.name}`;
      if (fired.has(key)) continue;
      fired.add(key);
      logger.info({ job: job.name }, 'Running scheduled job');
      job.run().catch((err) => logger.error({ err, job: job.name }, 'Scheduled job failed'));
    }

    // Keep the dedup set from growing without bound: drop keys not from today.
    if (fired.size > 50) {
      for (const k of fired) {
        if (!k.startsWith(dayKey)) fired.delete(k);
      }
    }
  };

  // 30s cadence guarantees at least one tick inside every target minute.
  setInterval(tick, 30_000);
  logger.info(
    { jobs: jobs.map((j) => `${j.name}@${pad(j.utcHour)}:${pad(j.utcMinute)}Z`) },
    'Daily scheduler started',
  );
}
