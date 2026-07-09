import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { EmailService, getEmailDeliveryStatus } from './email.service.js';

type PendingContentKind = 'assessment' | 'weekly_program';

const KIND_LABEL: Record<PendingContentKind, string> = {
  assessment: 'Initial Assessment report',
  weekly_program: 'Weekly Home Program (ABA)',
};

/**
 * Notify all admins that a new piece of AI-generated content is waiting for
 * review. Best-effort: never throws, and quietly no-ops when email is not
 * configured. Callers should fire-and-forget so content creation is never
 * blocked by email delivery.
 */
export async function notifyAdminsOfPendingAiContent(input: {
  kind: PendingContentKind;
  childId: number;
  childName: string;
}): Promise<void> {
  try {
    if (!getEmailDeliveryStatus().configured) return;

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, name: true },
    });
    const recipients = admins.filter((a) => a.email && a.email.trim());
    if (recipients.length === 0) return;

    const label = KIND_LABEL[input.kind];
    const reviewUrl = `${config.frontendUrl}/dashboard/admin/ai-content-review`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New AI content awaiting review</h2>
        <p>A new <strong>${label}</strong> has been generated and is waiting for admin review before it becomes visible to the family.</p>

        <div style="background-color: #eff6ff; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Type:</td>
              <td style="padding: 6px 0;">${label}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Child:</td>
              <td style="padding: 6px 0;">${input.childName} (#${input.childId})</td>
            </tr>
          </table>
        </div>

        <p>
          <a href="${reviewUrl}"
             style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 8px 0;">
            Review it now
          </a>
        </p>

        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Gradion.
        </p>
      </div>
    `;

    const emailService = new EmailService();
    const subject = `[Gradion] New ${label} to review — ${input.childName}`;

    await Promise.all(
      recipients.map((admin) =>
        emailService
          .sendEmail({ to: admin.email, subject, html })
          .catch((err) => logger.error({ err, admin: admin.email }, 'Failed to send admin review notification')),
      ),
    );

    logger.info(
      { kind: input.kind, childId: input.childId, admins: recipients.length },
      'Sent admin review notifications',
    );
  } catch (err) {
    logger.error({ err, childId: input.childId }, 'notifyAdminsOfPendingAiContent failed');
  }
}
