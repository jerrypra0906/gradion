import { Resend } from 'resend';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends transactional email. Prefers SMTP (e.g. Gmail / Google Workspace) when
 * SMTP_HOST + SMTP_USER + SMTP_PASSWORD are configured; otherwise falls back to
 * Resend (RESEND_API_KEY).
 */
export class EmailService {
  private resendClient: Resend | null;
  private smtpTransport: Transporter | null;
  private readonly useSmtp: boolean;

  constructor() {
    const e = config.email;
    this.useSmtp = Boolean(e.smtpHost && e.smtpUser && e.smtpPassword);

    this.smtpTransport = this.useSmtp
      ? nodemailer.createTransport({
          host: e.smtpHost,
          port: e.smtpPort,
          // false → STARTTLS on 587 (Gmail), true → implicit TLS on 465.
          secure: e.smtpSecure,
          auth: { user: e.smtpUser as string, pass: e.smtpPassword as string },
        })
      : null;

    this.resendClient = !this.useSmtp && e.resendApiKey ? new Resend(e.resendApiKey) : null;
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const fromName = config.email.resendFromName ?? 'Gradion';

    // --- SMTP (Gmail / Google Workspace) ---
    if (this.useSmtp && this.smtpTransport) {
      const fromEmail = config.email.smtpFromEmail ?? (config.email.smtpUser as string);
      const from = `${fromName} <${fromEmail}>`;
      try {
        logger.info({ to: options.to, subject: options.subject, from }, 'Sending email via SMTP');
        await this.smtpTransport.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully via SMTP');
      } catch (error) {
        logger.error({ error, to: options.to, subject: options.subject }, 'Failed to send email via SMTP');
        throw new Error('Failed to send email');
      }
      return;
    }

    // --- Resend fallback ---
    if (!this.resendClient) {
      logger.warn(
        { to: options.to, subject: options.subject },
        'Email service not configured (no SMTP_* and no RESEND_API_KEY). Skipping send.'
      );
      throw new Error(
        'Email service is not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASSWORD or RESEND_API_KEY.'
      );
    }

    const fromEmail = config.email.resendFromEmail ?? 'noreply@langkahkecil.org';
    const from = `${fromName} <${fromEmail}>`;

    try {
      logger.info({ to: options.to, subject: options.subject, from }, 'Sending email via Resend');
      const result = await this.resendClient.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      logger.info(
        { to: options.to, subject: options.subject, resultId: result.data?.id },
        'Email sent successfully via Resend'
      );
    } catch (error) {
      logger.error({ error, to: options.to, subject: options.subject }, 'Failed to send email via Resend');
      throw new Error('Failed to send email');
    }
  }
}
