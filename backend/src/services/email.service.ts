import { Resend } from 'resend';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export type EmailProvider = 'smtp' | 'resend';

const PLACEHOLDER_RESEND_KEY_MARKERS = ['your_resend_api_key', 're_your_'];

function isUsableResendApiKey(key: string | undefined): key is string {
  if (!key || key.trim() === '') return false;
  const lower = key.toLowerCase();
  return !PLACEHOLDER_RESEND_KEY_MARKERS.some((marker) => lower.includes(marker));
}

/** True when SMTP or a real Resend API key is configured (not .env.example placeholders). */
export function getEmailDeliveryStatus(): {
  configured: boolean;
  provider: EmailProvider | null;
} {
  const e = config.email;
  const useSmtp = Boolean(e.smtpHost && e.smtpUser && e.smtpPassword);
  if (useSmtp) {
    return { configured: true, provider: 'smtp' };
  }
  if (isUsableResendApiKey(e.resendApiKey)) {
    return { configured: true, provider: 'resend' };
  }
  return { configured: false, provider: null };
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
          requireTLS: !e.smtpSecure && e.smtpPort === 587,
          auth: { user: e.smtpUser as string, pass: e.smtpPassword as string },
        })
      : null;

    this.resendClient =
      !this.useSmtp && isUsableResendApiKey(e.resendApiKey) ? new Resend(e.resendApiKey) : null;
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
        const smtpError = error as { code?: string; response?: string; responseCode?: number };
        logger.error(
          {
            error,
            code: smtpError.code,
            responseCode: smtpError.responseCode,
            response: smtpError.response,
            to: options.to,
            subject: options.subject,
            smtpHost: config.email.smtpHost,
            smtpPort: config.email.smtpPort,
            smtpUser: config.email.smtpUser,
          },
          'Failed to send email via SMTP'
        );
        throw new Error('We could not send the email. Please try again later.');
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
        'Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD, or a valid RESEND_API_KEY on the server.'
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
      throw new Error('We could not send the email. Please try again later.');
    }
  }
}
