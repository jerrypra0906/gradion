import { Resend } from 'resend';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private resendClient: Resend | null;

  constructor() {
    this.resendClient = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.resendClient) {
      logger.warn(
        {
          to: options.to,
          subject: options.subject,
        },
        'Email service not configured (RESEND_API_KEY missing). Skipping send.'
      );
      throw new Error('Email service is not configured. Please configure RESEND_API_KEY.');
    }

    const fromEmail = config.email.resendFromEmail ?? 'noreply@langkahkecil.org';
    const fromName = config.email.resendFromName ?? 'Gradion';
    const from = `${fromName} <${fromEmail}>`;

    try {
      logger.info({ to: options.to, subject: options.subject, from }, 'Sending email via Resend');
      const result = await this.resendClient.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      logger.info({ to: options.to, subject: options.subject, resultId: result.data?.id }, 'Email sent successfully via Resend');
    } catch (error) {
      logger.error({ error, to: options.to, subject: options.subject }, 'Failed to send email via Resend');
      throw new Error('Failed to send email');
    }
  }
}

