import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { EmailService, getEmailDeliveryStatus } from './email.service.js';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export type ReminderSlot = 'midday' | 'evening';

/** Start of "today" in Asia/Jakarta (WIB), expressed as a UTC Date. */
function startOfTodayWIB(now: Date = new Date()): Date {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const midnightWibAsUtc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 0, 0, 0);
  return new Date(midnightWibAsUtc - WIB_OFFSET_MS);
}

type ParentBucket = {
  parentName: string;
  parentEmail: string;
  children: string[];
  singleChildId: number | null;
};

function firstName(name: string): string {
  const n = String(name || '').trim();
  return n ? n.split(/\s+/)[0] : 'Bunda/Ayah';
}

function reminderHtml(input: {
  parentName: string;
  children: string[];
  slot: ReminderSlot;
  ctaUrl: string;
}): string {
  const greeting = input.slot === 'midday' ? 'Selamat siang' : 'Selamat sore';
  const parent = firstName(input.parentName);
  const kids = input.children;
  const childPhrase =
    kids.length === 1
      ? `<strong>${kids[0]}</strong>`
      : kids.length === 2
        ? `<strong>${kids[0]}</strong> dan <strong>${kids[1]}</strong>`
        : `${kids.slice(0, -1).map((k) => `<strong>${k}</strong>`).join(', ')}, dan <strong>${kids[kids.length - 1]}</strong>`;

  const closingLine =
    input.slot === 'midday'
      ? 'Masih ada banyak waktu hari ini — yuk luangkan 10–20 menit untuk latihan bersama. 💪'
      : 'Belum terlambat untuk hari ini — beberapa menit latihan sore ini pun sangat berarti. 🌙';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A2B4C;">
      <h2 style="color: #00A896;">${greeting}, ${parent}! 🌟</h2>

      <p>Kami perhatikan program latihan harian (ABA) untuk ${childPhrase} belum tercatat hari ini.</p>

      <p>
        Setiap latihan kecil yang Anda lakukan di rumah sangat berarti bagi perkembangan
        ${kids.length > 1 ? 'anak-anak' : 'ananda'}. Konsistensi setiap hari — walau hanya sebentar —
        adalah kunci kemajuan yang nyata. Anda sudah melakukan hal yang luar biasa dengan hadir untuk mereka. ❤️
      </p>

      <div style="background-color: #E6FAF8; padding: 16px 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #00C1B2;">
        <p style="margin: 0; font-weight: bold;">${closingLine}</p>
      </div>

      <p style="text-align: center;">
        <a href="${input.ctaUrl}"
           style="background-color: #00C1B2; color: #ffffff; padding: 14px 28px; border-radius: 999px; text-decoration: none; display: inline-block; font-weight: bold; margin: 8px 0;">
          Mulai Program Hari Ini
        </a>
      </p>

      <p style="color: #6b7280; font-size: 13px; margin-top: 28px;">
        Terima kasih sudah menjadi orang tua yang hebat. Kami mendampingi Anda di setiap langkah kecil. 💙<br/>
        — Tim Gradion
      </p>

      <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">
        Ini adalah pengingat otomatis dari Gradion. Jika Anda sudah menyelesaikan latihan hari ini, abaikan saja pesan ini.
      </p>
    </div>
  `;
}

/**
 * Remind parents (in Bahasa Indonesia) to run today's home ABA program when
 * their child has an approved, active program but no completed session yet
 * today (WIB). One email per parent, covering all of their children that
 * still need practice today. Best-effort: never throws.
 */
export async function sendWeeklyProgramReminders(slot: ReminderSlot): Promise<{ sent: number }> {
  try {
    if (!getEmailDeliveryStatus().configured) {
      logger.info('Skipping weekly program reminders — email not configured');
      return { sent: 0 };
    }

    const dayStart = startOfTodayWIB();

    // Active children with at least one approved weekly program. We then keep
    // only those whose newest approved program has no completed session today.
    const children = await prisma.child.findMany({
      where: {
        is_active: true,
        abaProgramWeeks: { some: { review_status: 'approved' } },
      },
      select: {
        id: true,
        name: true,
        parent: { select: { id: true, name: true, email: true, is_email_verified: true } },
        abaProgramWeeks: {
          where: { review_status: 'approved' },
          orderBy: { week_start: 'desc' },
          take: 1,
          select: {
            id: true,
            sessions: {
              where: { status: 'completed', completed_at: { gte: dayStart } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    const buckets = new Map<number, ParentBucket>();
    for (const child of children) {
      const week = child.abaProgramWeeks[0];
      if (!week) continue;
      // Already practiced today → no reminder needed.
      if (week.sessions.length > 0) continue;

      const parent = child.parent;
      if (!parent?.email || !parent.email.trim()) continue;
      if (!parent.is_email_verified) continue;

      const existing = buckets.get(parent.id);
      if (existing) {
        existing.children.push(child.name);
        existing.singleChildId = null; // more than one child now
      } else {
        buckets.set(parent.id, {
          parentName: parent.name,
          parentEmail: parent.email,
          children: [child.name],
          singleChildId: child.id,
        });
      }
    }

    if (buckets.size === 0) {
      logger.info({ slot }, 'No parents need a weekly program reminder right now');
      return { sent: 0 };
    }

    const emailService = new EmailService();
    let sent = 0;

    for (const bucket of buckets.values()) {
      const ctaUrl = bucket.singleChildId
        ? `${config.frontendUrl}/dashboard/children/${bucket.singleChildId}`
        : `${config.frontendUrl}/dashboard/children`;
      const subject =
        slot === 'midday'
          ? 'Yuk, lanjutkan program latihan hari ini 🌟'
          : 'Masih ada waktu untuk latihan sore ini 🌙';

      try {
        await emailService.sendEmail({
          to: bucket.parentEmail,
          subject,
          html: reminderHtml({
            parentName: bucket.parentName,
            children: bucket.children,
            slot,
            ctaUrl,
          }),
        });
        sent += 1;
      } catch (err) {
        logger.error({ err, parent: bucket.parentEmail }, 'Failed to send weekly program reminder');
      }
    }

    logger.info({ slot, sent, candidates: buckets.size }, 'Sent weekly program reminders');
    return { sent };
  } catch (err) {
    logger.error({ err, slot }, 'sendWeeklyProgramReminders failed');
    return { sent: 0 };
  }
}
