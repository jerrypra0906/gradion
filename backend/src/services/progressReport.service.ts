import { EmailService } from './email.service.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface ProgressReportData {
  childName: string;
  parentName: string;
  parentEmail: string;
  period: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalLogs: number;
  averageRating: number;
  skillsPracticed: Array<{ name: string; practiceCount: number; averageRating: number }>;
  goalsProgress: Array<{ title: string; status: string; progress: string }>;
  summary?: string; // AI-generated summary if available
}

export class ProgressReportService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Send weekly progress report email
   */
  async sendWeeklyReport(userId: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          children: {
            include: {
              parentLogs: {
                where: {
                  log_date: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                  },
                },
                orderBy: { log_date: 'desc' },
              },
              goals: {
                where: { status: 'active' },
              },
            },
          },
        },
      });

      if (!user || user.role !== 'parent' || user.children.length === 0) {
        logger.warn({ userId }, 'Weekly report: User not found, not a parent, or has no children');
        return;
      }

      // Generate report for each child
      for (const child of user.children) {
        const reportData = await this.generateReportData(
          child.name,
          user.name,
          user.email,
          'weekly',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date()
        );

        await this.sendReportEmail(reportData);
      }

      logger.info({ userId }, 'Weekly progress report sent');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to send weekly progress report');
    }
  }

  /**
   * Send monthly progress report email
   */
  async sendMonthlyReport(userId: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          children: {
            include: {
              parentLogs: {
                where: {
                  log_date: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                  },
                },
                orderBy: { log_date: 'desc' },
              },
              goals: {
                where: { status: 'active' },
              },
            },
          },
        },
      });

      if (!user || user.role !== 'parent' || user.children.length === 0) {
        logger.warn({ userId }, 'Monthly report: User not found, not a parent, or has no children');
        return;
      }

      // Generate report for each child
      for (const child of user.children) {
        const reportData = await this.generateReportData(
          child.name,
          user.name,
          user.email,
          'monthly',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        );

        await this.sendReportEmail(reportData);
      }

      logger.info({ userId }, 'Monthly progress report sent');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to send monthly progress report');
    }
  }

  /**
   * Generate report data from database
   */
  private async generateReportData(
    childName: string,
    parentName: string,
    parentEmail: string,
    period: 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<ProgressReportData> {
    // This is a simplified version - in production, you'd query the database
    // and calculate statistics from parent_logs, goals, etc.
    
    return {
      childName,
      parentName,
      parentEmail,
      period,
      startDate,
      endDate,
      totalLogs: 0, // TODO: Calculate from parent_logs
      averageRating: 0, // TODO: Calculate average from parent_logs
      skillsPracticed: [], // TODO: Aggregate skills from parent_logs
      goalsProgress: [], // TODO: Get goals status and progress
      summary: undefined, // TODO: Generate AI summary if available
    };
  }

  /**
   * Send progress report email
   */
  async sendReportEmail(reportData: ProgressReportData): Promise<void> {
    const periodLabel = reportData.period === 'weekly' ? 'Weekly' : 'Monthly';
    const dateRange = `${reportData.startDate.toLocaleDateString('id-ID')} - ${reportData.endDate.toLocaleDateString('id-ID')}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${periodLabel} Progress Report - ${reportData.childName}</h2>
        <p>Dear ${reportData.parentName},</p>
        <p>Here's your ${periodLabel.toLowerCase()} progress report for ${reportData.childName}.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Report Period</h3>
          <p><strong>${dateRange}</strong></p>
          
          <div style="display: flex; justify-content: space-around; margin: 20px 0;">
            <div style="text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${reportData.totalLogs}</div>
              <div style="color: #6b7280; font-size: 14px;">Activity Logs</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #10b981;">${reportData.averageRating.toFixed(1)}</div>
              <div style="color: #6b7280; font-size: 14px;">Average Rating</div>
            </div>
          </div>
        </div>

        ${reportData.skillsPracticed.length > 0 ? `
          <div style="margin: 20px 0;">
            <h3>Skills Practiced</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${reportData.skillsPracticed.map(skill => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${skill.name}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    ${skill.practiceCount} times (Avg: ${skill.averageRating.toFixed(1)}/5)
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        ${reportData.goalsProgress.length > 0 ? `
          <div style="margin: 20px 0;">
            <h3>Goals Progress</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${reportData.goalsProgress.map(goal => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                    <strong>${goal.title}</strong><br>
                    <span style="color: #6b7280; font-size: 14px;">${goal.progress}</span>
                  </td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="background-color: ${goal.status === 'completed' ? '#10b981' : '#f59e0b'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${goal.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        ${reportData.summary ? `
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0;">AI Summary</h3>
            <p>${reportData.summary}</p>
          </div>
        ` : ''}

        <p>
          <a href="${config.frontendUrl}/dashboard/children" 
             style="background-color: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0;">
            View Full Dashboard
          </a>
        </p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Keep up the great work! Every small step matters. 🌟
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated ${periodLabel.toLowerCase()} report from Gradion.
        </p>
      </div>
    `;

    await this.emailService.sendEmail({
      to: reportData.parentEmail,
      subject: `${periodLabel} Progress Report - ${reportData.childName} - Gradion`,
      html,
    });
  }
}
