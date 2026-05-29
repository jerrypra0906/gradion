import { EmailService } from './email.service.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class SubscriptionNotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async notifyAdminNewRequest(requestId: number) {
    try {
      const request = await prisma.subscriptionRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!request) {
        logger.warn({ requestId }, 'Subscription request not found for admin notification');
        return;
      }

      // Get all admin users
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: {
          email: true,
          name: true,
        },
      });

      if (admins.length === 0) {
        logger.warn('No admin users found to notify');
        return;
      }

      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { plan_type: request.plan_type },
      });

      const planName = planConfig?.name || request.plan_type.toUpperCase();
      const amount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(request.amount);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Subscription Request</h2>
          <p>A new subscription request has been submitted and requires your review.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Request Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Request ID:</td>
                <td style="padding: 8px 0;">#${request.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">User:</td>
                <td style="padding: 8px 0;">${request.user.name} (${request.user.email})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Plan:</td>
                <td style="padding: 8px 0;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                <td style="padding: 8px 0;">${amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0;">${request.status}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                <td style="padding: 8px 0;">${new Date(request.created_at).toLocaleString('id-ID')}</td>
              </tr>
            </table>
          </div>

          <p>
            <a href="${config.frontendUrl}/dashboard/admin/users/${request.user.id}" 
               style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              Review Request
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated notification from Gradion.
          </p>
        </div>
      `;

      // Send email to all admins
      const emailPromises = admins.map((admin) =>
        this.emailService.sendEmail({
          to: admin.email,
          subject: `New Subscription Request - ${planName} - ${request.user.name}`,
          html: html.replace('${admin.name}', admin.name),
        })
      );

      await Promise.all(emailPromises);
      logger.info({ requestId, adminCount: admins.length }, 'Admin notification emails sent');
    } catch (error) {
      logger.error({ error, requestId }, 'Failed to send admin notification');
      // Don't throw - email failure shouldn't break the request
    }
  }

  async notifyUserPaymentSuccess(requestId: number) {
    try {
      const request = await prisma.subscriptionRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!request) {
        return;
      }

      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { plan_type: request.plan_type },
      });

      const planName = planConfig?.name || request.plan_type.toUpperCase();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Payment Successful!</h2>
          <p>Dear ${request.user.name},</p>
          <p>Your subscription payment has been successfully processed.</p>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #10b981;">Subscription Activated</h3>
            <p><strong>Plan:</strong> ${planName}</p>
            <p><strong>Subscription Period:</strong> ${planConfig?.weeks || 'N/A'} weeks</p>
            <p>Your subscription is now active and you can start using all features!</p>
          </div>

          <p>
            <a href="${config.frontendUrl}/dashboard/profile" 
               style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              View My Profile
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Thank you for choosing Gradion!
          </p>
        </div>
      `;

      await this.emailService.sendEmail({
        to: request.user.email,
        subject: `Subscription Activated - ${planName}`,
        html,
      });

      logger.info({ requestId }, 'User payment success notification sent');
    } catch (error) {
      logger.error({ error, requestId }, 'Failed to send user payment success notification');
    }
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(requestId: number): Promise<void> {
    try {
      const request = await prisma.subscriptionRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!request || !request.payment_reference) {
        logger.warn({ requestId }, 'Payment receipt: Request not found or no payment reference');
        return;
      }

      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { plan_type: request.plan_type },
      });

      const planName = planConfig?.name || request.plan_type.toUpperCase();
      const amount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(request.amount);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Payment Receipt</h2>
          <p>Dear ${request.user.name},</p>
          <p>Thank you for your payment. Here's your receipt:</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="margin-top: 0;">Receipt Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Receipt Number:</td>
                <td style="padding: 8px 0; text-align: right;">#${request.payment_reference}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Date:</td>
                <td style="padding: 8px 0; text-align: right;">${new Date(request.updated_at).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Plan:</td>
                <td style="padding: 8px 0; text-align: right;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Payment Method:</td>
                <td style="padding: 8px 0; text-align: right; text-transform: capitalize;">${request.payment_method || 'Online Payment'}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb; margin-top: 10px;">
                <td style="padding: 12px 0; font-weight: bold; font-size: 18px;">Total Amount:</td>
                <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #10b981;">${amount}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Subscription Status:</strong> Active<br>
              Your subscription is now active and you have access to all features!
            </p>
          </div>

          <p>
            <a href="${config.frontendUrl}/dashboard/profile" 
               style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0;">
              View My Subscription
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Please keep this receipt for your records. If you have any questions, please contact our support team.
          </p>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated receipt from Gradion. Thank you for your business!
          </p>
        </div>
      `;

      await this.emailService.sendEmail({
        to: request.user.email,
        subject: `Payment Receipt - ${planName} - #${request.payment_reference}`,
        html,
      });

      logger.info({ requestId, paymentReference: request.payment_reference }, 'Payment receipt sent');
    } catch (error) {
      logger.error({ error, requestId }, 'Failed to send payment receipt');
    }
  }

  /**
   * Send subscription renewal reminder email
   */
  async sendRenewalReminder(userId: number, daysBeforeExpiry: number = 7): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { user_id: userId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!subscription || !subscription.end_date) {
        logger.warn({ userId }, 'Renewal reminder: Subscription not found or no end date');
        return;
      }

      // Check if subscription expires in the specified days
      const expiryDate = new Date(subscription.end_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry !== daysBeforeExpiry) {
        // Not the right time to send reminder yet
        return;
      }

      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { plan_type: subscription.plan_type },
      });

      const planName = planConfig?.name || subscription.plan_type.toUpperCase();
      const renewalAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(planConfig?.price || 0);

      const expiryDateStr = expiryDate.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Subscription Renewal Reminder</h2>
          <p>Dear ${subscription.user.name},</p>
          <p>Your ${planName} subscription will expire in ${daysBeforeExpiry} day(s).</p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">Subscription Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Current Plan:</td>
                <td style="padding: 8px 0;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Expiry Date:</td>
                <td style="padding: 8px 0;">${expiryDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Renewal Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #f59e0b;">${renewalAmount}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;">
              <strong>⚠️ Important:</strong> To continue enjoying all features of Gradion, please renew your subscription before it expires.
            </p>
          </div>

          <p>
            <a href="${config.frontendUrl}/dashboard/profile?renew=true" 
               style="background-color: #f59e0b; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0;">
              Renew Subscription Now
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions or need assistance, please don't hesitate to contact our support team.
          </p>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated reminder from Gradion. Thank you for being part of our community!
          </p>
        </div>
      `;

      await this.emailService.sendEmail({
        to: subscription.user.email,
        subject: `Subscription Renewal Reminder - Expires in ${daysBeforeExpiry} day(s)`,
        html,
      });

      logger.info({ userId, daysUntilExpiry, planType: subscription.plan_type }, 'Renewal reminder sent');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to send renewal reminder');
    }
  }

  /**
   * Send subscription expired notification
   */
  async sendExpiryNotification(userId: number): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { user_id: userId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!subscription) {
        logger.warn({ userId }, 'Expiry notification: Subscription not found');
        return;
      }

      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { plan_type: subscription.plan_type },
      });

      const planName = planConfig?.name || subscription.plan_type.toUpperCase();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Subscription Expired</h2>
          <p>Dear ${subscription.user.name},</p>
          <p>Your ${planName} subscription has expired.</p>
          
          <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin-top: 0; color: #991b1b;">What This Means</h3>
            <p style="margin: 0; color: #7f1d1d;">
              Your subscription access has ended. Some features may be limited until you renew your subscription.
            </p>
          </div>

          <p>
            <a href="${config.frontendUrl}/dashboard/profile?renew=true" 
               style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0;">
              Renew Subscription Now
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Don't worry - your data is safe and will be available once you renew your subscription.
          </p>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated notification from Gradion. We hope to see you back soon!
          </p>
        </div>
      `;

      await this.emailService.sendEmail({
        to: subscription.user.email,
        subject: `Your ${planName} Subscription Has Expired`,
        html,
      });

      logger.info({ userId, planType: subscription.plan_type }, 'Expiry notification sent');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to send expiry notification');
    }
  }
}

