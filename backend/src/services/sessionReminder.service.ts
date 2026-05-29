import { EmailService } from './email.service.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface SessionReminderData {
  therapistName: string;
  therapistEmail: string;
  childName: string;
  parentName: string;
  sessionDate: Date;
  childId: number;
}

export class SessionReminderService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Send session reminder to therapist (e.g., 24 hours before scheduled session)
   */
  async sendSessionReminderToTherapist(sessionId: number): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          therapist: {
            select: {
              name: true,
              email: true,
            },
          },
          child: {
            include: {
              parent: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        logger.warn({ sessionId }, 'Session not found for reminder');
        return;
      }

      const reminderData: SessionReminderData = {
        therapistName: session.therapist.name,
        therapistEmail: session.therapist.email,
        childName: session.child.name,
        parentName: session.child.parent.name,
        sessionDate: session.date,
        childId: session.child_id,
      };

      await this.sendTherapistReminderEmail(reminderData);
      logger.info({ sessionId }, 'Session reminder sent to therapist');
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to send session reminder to therapist');
    }
  }

  /**
   * Send session reminder to parent (optional - if parents want reminders too)
   */
  async sendSessionReminderToParent(sessionId: number): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          therapist: {
            select: {
              name: true,
            },
          },
          child: {
            include: {
              parent: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        logger.warn({ sessionId }, 'Session not found for reminder');
        return;
      }

      const reminderData: SessionReminderData = {
        therapistName: session.therapist.name,
        therapistEmail: '', // Not needed for parent reminder
        childName: session.child.name,
        parentName: session.child.parent.name,
        sessionDate: session.date,
        childId: session.child_id,
      };

      await this.sendParentReminderEmail(reminderData);
      logger.info({ sessionId }, 'Session reminder sent to parent');
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to send session reminder to parent');
    }
  }

  /**
   * Send reminder email to therapist
   */
  private async sendTherapistReminderEmail(data: SessionReminderData): Promise<void> {
    const sessionDateStr = data.sessionDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Upcoming Session Reminder</h2>
        <p>Dear ${data.therapistName},</p>
        <p>This is a reminder about your upcoming therapy session.</p>
        
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <h3 style="margin-top: 0;">Session Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Child:</td>
              <td style="padding: 8px 0;">${data.childName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Parent:</td>
              <td style="padding: 8px 0;">${data.parentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Date & Time:</td>
              <td style="padding: 8px 0;">${sessionDateStr}</td>
            </tr>
          </table>
        </div>

        <p>
          <a href="${config.frontendUrl}/dashboard/sessions/${data.childId}" 
             style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0;">
            View Session Details
          </a>
        </p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Thank you for your dedication to helping children progress! 🌟
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated reminder from Gradion.
        </p>
      </div>
    `;

    await this.emailService.sendEmail({
      to: data.therapistEmail,
      subject: `Upcoming Session Reminder - ${data.childName} - ${sessionDateStr}`,
      html,
    });
  }

  /**
   * Send reminder email to parent
   */
  private async sendParentReminderEmail(data: SessionReminderData): Promise<void> {
    const sessionDateStr = data.sessionDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Upcoming Therapy Session</h2>
        <p>Dear ${data.parentName},</p>
        <p>This is a friendly reminder about ${data.childName}'s upcoming therapy session.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0;">Session Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Therapist:</td>
              <td style="padding: 8px 0;">${data.therapistName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Date & Time:</td>
              <td style="padding: 8px 0;">${sessionDateStr}</td>
            </tr>
          </table>
        </div>

        <p>
          <a href="${config.frontendUrl}/dashboard/children/${data.childId}" 
             style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0;">
            View Child's Profile
          </a>
        </p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          We're excited to see ${data.childName}'s continued progress! 🌟
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated reminder from Gradion.
        </p>
      </div>
    `;

    // Note: We need parent email from the session data
    // This would need to be passed in or fetched from the session
    const parentEmail = ''; // TODO: Get from session data
    
    if (!parentEmail) {
      logger.warn({ childId: data.childId }, 'Parent email not available for session reminder');
      return;
    }

    await this.emailService.sendEmail({
      to: parentEmail,
      subject: `Upcoming Therapy Session - ${data.childName} - ${sessionDateStr}`,
      html,
    });
  }
}
