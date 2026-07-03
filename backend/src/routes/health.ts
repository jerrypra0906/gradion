import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { EmailService, getEmailDeliveryStatus } from '../services/email.service.js';
import { config } from '../config/env.js';
import { getUserFacingError } from '../utils/errorResponse.js';

const testEmailSchema = z.object({
  to: z.string().email(),
});

export async function healthRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  fastify.get('/health', async (_request, _reply) => {
    const emailStatus = getEmailDeliveryStatus();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      email: {
        configured: emailStatus.configured,
        provider: emailStatus.provider,
      },
    };
  });

  // Test email endpoint to verify Resend configuration
  fastify.post('/health/test-email', async (request, reply) => {
    try {
      const body = testEmailSchema.parse(request.body);
      const emailService = new EmailService();

      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Resend Email Test</h2>
          <p>This is a test email from Gradion to verify your Resend configuration.</p>
          <p><strong>Configuration Status:</strong></p>
          <ul>
            <li>API Key: ${config.email.resendApiKey ? '✅ Configured' : '❌ Missing'}</li>
            <li>From Email: ${config.email.resendFromEmail || 'Not set'}</li>
            <li>From Name: ${config.email.resendFromName || 'Not set'}</li>
          </ul>
          <p>If you received this email, your Resend configuration is working correctly! 🎉</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `;

      await emailService.sendEmail({
        to: body.to,
        subject: 'Resend Configuration Test - Gradion',
        html: testHtml,
      });

      return {
        success: true,
        message: `Test email sent successfully to ${body.to}`,
        config: {
          ...getEmailDeliveryStatus(),
          fromEmail: config.email.smtpFromEmail ?? config.email.resendFromEmail,
          fromName: config.email.resendFromName,
        },
      };
    } catch (error: any) {
      reply.code(500);
      return {
        success: false,
        error: getUserFacingError(error, 'Failed to send test email'),
        config: getEmailDeliveryStatus(),
      };
    }
  });
}

