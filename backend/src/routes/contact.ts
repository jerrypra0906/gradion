import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { EmailService } from '../services/email.service.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

export async function contactRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  const emailService = new EmailService();

  // Contact/Support form submission
  fastify.post('/contact', async (request, reply) => {
    try {
      const body = contactSchema.parse(request.body);

      // Check if support email is configured
      if (!config.email.supportEmail) {
        logger.warn('Support email not configured (SUPPORT_EMAIL missing)');
        reply.code(503);
        return {
          success: false,
          error: 'Support email is not configured. Please contact support directly.',
        };
      }

      // Create email HTML
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${body.name}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${body.email}">${body.email}</a></p>
            <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${body.subject}</p>
            <p style="margin: 0;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}</p>
          </div>

          <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Message:</h3>
            <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${body.message}</p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is an automated email from the Gradion contact form.<br>
              You can reply directly to this email to respond to ${body.name} at <a href="mailto:${body.email}">${body.email}</a>.
            </p>
          </div>
        </div>
      `;

      // Send email to support
      await emailService.sendEmail({
        to: config.email.supportEmail!,
        subject: `[Contact Form] ${body.subject}`,
        html,
      });

      // Also send confirmation email to the user
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Thank You for Contacting Us!</h2>
          
          <p>Dear ${body.name},</p>
          
          <p>We have received your message and will get back to you as soon as possible.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Your Message:</strong></p>
            <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">${body.message}</p>
          </div>
          
          <p>Our support team typically responds within 24-48 hours during business days.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated confirmation email. Please do not reply to this email.<br>
            If you need immediate assistance, please contact us at <a href="mailto:${config.email.supportEmail}">${config.email.supportEmail}</a>.
          </p>
        </div>
      `;

      await emailService.sendEmail({
        to: body.email,
        subject: `Re: ${body.subject} - We've received your message`,
        html: confirmationHtml,
      });

      logger.info(
        {
          name: body.name,
          email: body.email,
          subject: body.subject,
        },
        'Contact form submission received and emails sent'
      );

      return {
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon.',
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return {
          success: false,
          error: `Validation error: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        };
      }

      logger.error({ error }, 'Failed to process contact form submission');
      reply.code(500);
      return {
        success: false,
        error: 'Failed to send your message. Please try again later.',
      };
    }
  });
}
