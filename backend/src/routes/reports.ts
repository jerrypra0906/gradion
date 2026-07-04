import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import {
  hasAIAccess,
  checkTokenQuota,
  generateReportSummary,
  updateTokenUsage,
} from '../services/ai.service.js';
import { logger } from '../utils/logger.js';
import { syncMissingParentLogsForChild } from '../services/parentLogFromAba.service.js';

const childReportQuerySchema = z.object({
  range: z
    .string()
    .regex(/^\d+$/)
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  lang: z.enum(['en', 'id']).optional(),
});

const MIN_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 180;
const MAX_RANGE_DAYS_FROM_DATES = 365; // Max 1 year when using date range

function clampRangeDays(range?: string) {
  const parsed = range ? parseInt(range, 10) : 30;
  if (Number.isNaN(parsed)) {
    return 30;
  }
  return Math.min(Math.max(parsed, MIN_RANGE_DAYS), MAX_RANGE_DAYS);
}

function parseDateRange(query: { range?: string; startDate?: string; endDate?: string }) {
  // If startDate and endDate are provided, use them
  if (query.startDate && query.endDate) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Ensure start is before end
    if (start > end) {
      throw new Error('Start date must be before end date');
    }
    
    // Check max range (1 year)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > MAX_RANGE_DAYS_FROM_DATES) {
      throw new Error(`Date range cannot exceed ${MAX_RANGE_DAYS_FROM_DATES} days`);
    }
    
    // Check min range (1 day)
    if (daysDiff < 1) {
      throw new Error('Date range must be at least 1 day');
    }
    
    return { startDate: start, endDate: end, rangeDays: daysDiff };
  }
  
  // Fallback to range parameter (backward compatibility)
  const rangeDays = clampRangeDays(query.range);
  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999); // End of today
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - (rangeDays - 1));
  
  return { startDate, endDate, rangeDays };
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function isAssignedStaff(role: string) {
  return role === 'therapist' || role === 'consultant';
}

function getWeekStartDate(date: Date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay(); // 0 (Sun) - 6 (Sat)
  // We consider Monday as start of the week
  const diff = (day + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diff);
  return utc;
}

type SkillEntry = { name: string; rating: number };
type EnrichedSkillEntry = SkillEntry & {
  domain?: string;
  target?: string;
  trial_data?: string;
};

function parseSkills(value: unknown): SkillEntry[] {
  return parseSkillsEnriched(value).map(({ name, rating }) => ({ name, rating }));
}

function parseSkillsEnriched(value: unknown): EnrichedSkillEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const rawName = record.name;
      if (typeof rawName !== 'string' || !rawName.trim()) {
        return null;
      }
      const numericRating =
        typeof record.rating === 'number'
          ? record.rating
          : Number(record.rating ?? 0);
      const skill: EnrichedSkillEntry = {
        name: rawName.trim(),
        rating: Math.min(Math.max(Math.round(numericRating) || 3, 1), 5),
      };
      if (typeof record.domain === 'string' && record.domain.trim()) {
        skill.domain = record.domain.trim();
      }
      if (typeof record.target === 'string' && record.target.trim()) {
        skill.target = record.target.trim();
      }
      if (typeof record.trial_data === 'string' && record.trial_data.trim()) {
        skill.trial_data = record.trial_data.trim();
      }
      return skill;
    })
    .filter(Boolean) as EnrichedSkillEntry[];
}

function mapRecentLog(log: {
  id: number;
  log_date: Date;
  rating: number;
  status: string;
  skills_practiced: unknown;
  activities: string | null;
  therapist_comment: string | null;
  duration_hours: number | null;
  aba_session_id: number | null;
  creator_role: string;
  creator?: { id: number; name: string; email: string; role: string } | null;
}) {
  return {
    id: log.id,
    log_date: log.log_date.toISOString(),
    rating: log.rating,
    status: log.status,
    skills_practiced: parseSkillsEnriched(log.skills_practiced),
    activities: log.activities || '',
    therapist_comment: log.therapist_comment,
    duration_hours: log.duration_hours ?? 3,
    aba_session_id: log.aba_session_id,
    creator_role: log.creator_role,
    creator: log.creator
      ? {
          id: log.creator.id,
          name: log.creator.name,
          email: log.creator.email,
          role: log.creator.role,
        }
      : undefined,
  };
}

export async function reportsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  fastify.get(
    '/child/:childId',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { childId } = request.params as { childId: string };
      const query = childReportQuerySchema.parse(request.query);

      const child_id = parseInt(childId, 10);
      if (Number.isNaN(child_id)) {
        reply.code(400);
        return {
          success: false,
          error: 'Invalid child ID',
        };
      }

      const child = await prisma.child.findUnique({
        where: { id: child_id },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!child) {
        reply.code(404);
        return {
          success: false,
          error: 'Child not found',
        };
      }

      // Permission checks
      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      if (isAssignedStaff(user.role)) {
        const isAssigned = await prisma.therapistChild.findFirst({
          where: {
            therapist_id: user.id,
            child_id,
          },
        });
        if (!isAssigned) {
          reply.code(403);
          return {
            success: false,
            error: 'Forbidden',
          };
        }
      }

      let dateRange;
      try {
        dateRange = parseDateRange(query);
      } catch (error: any) {
        reply.code(400);
        return {
          success: false,
          error: error.message || 'Invalid date range',
        };
      }
      const { startDate, endDate, rangeDays } = dateRange;

      await syncMissingParentLogsForChild(child_id);

      const [logs, sessions, goals] = await Promise.all([
        prisma.parentLog.findMany({
          where: {
            child_id,
            log_date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            log_date: 'asc',
          },
          include: {
            creator: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        }),
        prisma.session.findMany({
          where: {
            child_id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.goal.findMany({
          where: { child_id },
        }),
      ]);

      const logsByDateMap = new Map<
        string,
        { count: number; totalRating: number }
      >();
      const skillsMap = new Map<string, number>();
      let totalRating = 0;

      for (const log of logs) {
        const dateKey = formatDate(log.log_date);
        const entry = logsByDateMap.get(dateKey) || { count: 0, totalRating: 0 };
        entry.count += 1;
        entry.totalRating += log.rating;
        logsByDateMap.set(dateKey, entry);

        totalRating += log.rating;

        const skillEntries = parseSkills(log.skills_practiced);
        skillEntries.forEach((skill) => {
          const current = skillsMap.get(skill.name) || 0;
          skillsMap.set(skill.name, current + 1);
        });
      }

      const logsByDate = Array.from(logsByDateMap.entries())
        .map(([date, value]) => ({
          date,
          count: value.count,
          avgRating: Number((value.totalRating / value.count).toFixed(2)),
        }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      const skillsFrequency = Array.from(skillsMap.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const sessionsByWeekMap = new Map<string, number>();
      sessions.forEach((session) => {
        const weekStart = getWeekStartDate(session.date);
        const key = formatDate(weekStart);
        const current = sessionsByWeekMap.get(key) || 0;
        sessionsByWeekMap.set(key, current + 1);
      });

      const sessionsByWeek = Array.from(sessionsByWeekMap.entries())
        .map(([week_start, count]) => ({ week_start, count }))
        .sort((a, b) => (a.week_start > b.week_start ? 1 : -1));

      const goalStatuses: Array<'active' | 'completed' | 'paused' | 'cancelled'> =
        ['active', 'completed', 'paused', 'cancelled'];
      const goalStatusCounts = goalStatuses.map((status) => ({
        status,
        count: goals.filter((goal) => goal.status === status).length,
      }));

      const recentLogs = logs.slice(-5).reverse().map((log) => mapRecentLog(log));

      // Prepare all activity logs with full details (for potential AI regeneration)
      const allActivityLogs = logs.map((log) => ({
        log_date: log.log_date.toISOString(),
        rating: log.rating,
        activities: log.activities || '',
        behavior_notes: log.behavior_notes || '',
        therapist_comment: log.therapist_comment || '',
        skills_practiced: parseSkills(log.skills_practiced),
      }));

      // Check if AI summary exists for this date range
      const existingSummary = await prisma.$queryRaw<
        Array<{
          summary: string;
          recommendations: string;
          created_at: Date;
        }>
      >`
        SELECT summary, recommendations, created_at
        FROM ai_report_summaries
        WHERE child_id = ${child_id}
          AND start_date = ${dateRange.startDate}
          AND end_date = ${dateRange.endDate}
        LIMIT 1
      `;

      let aiSummaryPayload:
        | {
            summary: string;
            recommendations: string;
            createdAt: Date;
          }
        | null = null;

      if (existingSummary.length > 0) {
        logger.info(
          `Found saved AI summary for child ${child_id}, date range ${dateRange.startDate} to ${dateRange.endDate}, requested by ${user.role} ${user.id}`
        );

        // If user is viewing in Bahasa Indonesia, regenerate the summary in Indonesian
        if (query.lang === 'id') {
          try {
            const aiResult = await generateReportSummary({
              childName: child.name,
              diagnosis: child.diagnosis || 'Not specified',
              rangeDays,
              totalLogs: logs.length,
              totalSessions: sessions.length,
              avgRating: logs.length
                ? Number((totalRating / logs.length).toFixed(2))
                : null,
              logsByDate,
              skillsFrequency,
              sessionsByWeek,
              goalStatusCounts,
              recentLogs: recentLogs.map((log) => ({
                log_date: log.log_date,
                rating: log.rating,
                activities: log.activities || '',
                skills_practiced: log.skills_practiced.map(({ name, rating }) => ({
                  name,
                  rating,
                })),
              })),
              allActivityLogs,
              language: 'id',
            });

            if (aiResult) {
              aiSummaryPayload = {
                summary: aiResult.summary,
                recommendations: aiResult.recommendations,
                // Keep original created_at as "saved on" reference
                createdAt: existingSummary[0].created_at,
              };
            } else {
              aiSummaryPayload = {
                summary: existingSummary[0].summary,
                recommendations: existingSummary[0].recommendations,
                createdAt: existingSummary[0].created_at,
              };
            }
          } catch (aiError: any) {
            logger.error(
              {
                error: aiError?.message,
                stack: aiError?.stack,
              },
              'Error regenerating AI summary in Bahasa Indonesia for reports GET endpoint'
            );
            aiSummaryPayload = {
              summary: existingSummary[0].summary,
              recommendations: existingSummary[0].recommendations,
              createdAt: existingSummary[0].created_at,
            };
          }
        } else {
          // English or no lang specified: return stored summary as-is
          aiSummaryPayload = {
            summary: existingSummary[0].summary,
            recommendations: existingSummary[0].recommendations,
            createdAt: existingSummary[0].created_at,
          };
        }
      } else {
        logger.info(
          `No saved AI summary found for child ${child_id}, date range ${dateRange.startDate} to ${dateRange.endDate}, requested by ${user.role} ${user.id}`
        );
      }

      return {
        success: true,
        data: {
          child: {
            id: child.id,
            name: child.name,
            parent: child.parent
              ? {
                  id: child.parent.id,
                  name: child.parent.name,
                  email: child.parent.email,
                }
              : undefined,
          },
          rangeDays,
          totalLogs: logs.length,
          totalSessions: sessions.length,
          avgRating: logs.length ? Number((totalRating / logs.length).toFixed(2)) : null,
          logsByDate,
          skillsFrequency,
          sessionsByWeek,
          goalStatusCounts,
          recentLogs,
          lastLogDate: logs.length ? logs[logs.length - 1].log_date : null,
          aiSummary: aiSummaryPayload,
        },
      };
    }
  );

  // Generate AI Summary and Recommendations for a child's report
  fastify.post(
    '/child/:childId/ai-summary',
    { preHandler: authenticate },
    async (request, reply) => {
      const params = request.params as { childId: string };
      logger.info(`AI summary request received for child ${params.childId} by user ${(request as AuthenticatedRequest).user?.id}`);
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { childId } = params;
        const query = childReportQuerySchema.parse(request.query);

      const child_id = parseInt(childId, 10);
      if (Number.isNaN(child_id)) {
        reply.code(400);
        return {
          success: false,
          error: 'Invalid child ID',
        };
      }

      // Check AI access
      const accessCheck = await hasAIAccess(user.id);
      if (!accessCheck.hasAccess) {
        reply.code(403);
        return {
          success: false,
          error: accessCheck.reason || 'AI access not available',
        };
      }

      const child = await prisma.child.findUnique({
        where: { id: child_id },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!child) {
        reply.code(404);
        return {
          success: false,
          error: 'Child not found',
        };
      }

      // Permission checks
      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      if (isAssignedStaff(user.role)) {
        const isAssigned = await prisma.therapistChild.findFirst({
          where: {
            therapist_id: user.id,
            child_id,
          },
        });
        if (!isAssigned) {
          logger.warn(`User ${user.id} (${user.role}) attempted to generate AI summary for child ${child_id} but is not assigned`);
          reply.code(403);
          return {
            success: false,
            error: 'Forbidden',
          };
        }
        logger.info(`User ${user.id} (${user.role}) generating AI summary for child ${child_id} (assigned: ${isAssigned.id})`);
      }

      let dateRange;
      try {
        dateRange = parseDateRange(query);
      } catch (error: any) {
        reply.code(400);
        return {
          success: false,
          error: error.message || 'Invalid date range',
        };
      }
      const { startDate, endDate, rangeDays } = dateRange;

      await syncMissingParentLogsForChild(child_id);

      // Fetch report data (same as GET endpoint)
      const [logs, sessions, goals] = await Promise.all([
        prisma.parentLog.findMany({
          where: {
            child_id,
            log_date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            log_date: 'asc',
          },
          include: {
            creator: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        }),
        prisma.session.findMany({
          where: {
            child_id,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.goal.findMany({
          where: { child_id },
        }),
      ]);

      const logsByDateMap = new Map<
        string,
        { count: number; totalRating: number }
      >();
      const skillsMap = new Map<string, number>();
      let totalRating = 0;

      for (const log of logs) {
        const dateKey = formatDate(log.log_date);
        const entry = logsByDateMap.get(dateKey) || { count: 0, totalRating: 0 };
        entry.count += 1;
        entry.totalRating += log.rating;
        logsByDateMap.set(dateKey, entry);

        totalRating += log.rating;

        const skillEntries = parseSkills(log.skills_practiced);
        skillEntries.forEach((skill) => {
          const current = skillsMap.get(skill.name) || 0;
          skillsMap.set(skill.name, current + 1);
        });
      }

      const logsByDate = Array.from(logsByDateMap.entries())
        .map(([date, value]) => ({
          date,
          count: value.count,
          avgRating: Number((value.totalRating / value.count).toFixed(2)),
        }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      const skillsFrequency = Array.from(skillsMap.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const sessionsByWeekMap = new Map<string, number>();
      sessions.forEach((session) => {
        const weekStart = getWeekStartDate(session.date);
        const key = formatDate(weekStart);
        const current = sessionsByWeekMap.get(key) || 0;
        sessionsByWeekMap.set(key, current + 1);
      });

      const sessionsByWeek = Array.from(sessionsByWeekMap.entries())
        .map(([week_start, count]) => ({ week_start, count }))
        .sort((a, b) => (a.week_start > b.week_start ? 1 : -1));

      const goalStatuses: Array<'active' | 'completed' | 'paused' | 'cancelled'> =
        ['active', 'completed', 'paused', 'cancelled'];
      const goalStatusCounts = goalStatuses.map((status) => ({
        status,
        count: goals.filter((goal) => goal.status === status).length,
      }));

      const recentLogs = logs.slice(-5).reverse().map((log) => ({
        log_date: log.log_date.toISOString(),
        rating: log.rating,
        activities: log.activities,
        skills_practiced: parseSkills(log.skills_practiced),
      }));

      // Prepare all activity logs with full details for AI analysis
      const allActivityLogs = logs.map((log) => ({
        log_date: log.log_date.toISOString(),
        rating: log.rating,
        activities: log.activities || '',
        behavior_notes: log.behavior_notes || '',
        therapist_comment: log.therapist_comment || '',
        skills_practiced: parseSkills(log.skills_practiced),
      }));

      // POST endpoint always generates a new summary (regenerates if one exists)
      // The database INSERT with ON CONFLICT will update the existing record

      // Check token quota (estimate ~600 tokens for optimized report)
      const estimatedTokens = 600;
      const quotaCheck = await checkTokenQuota(user.id, estimatedTokens);
      if (!quotaCheck.hasQuota) {
        reply.code(403);
        return {
          success: false,
          error: quotaCheck.reason || 'Insufficient AI tokens',
        };
      }

      // Generate AI summary
      const reportData = {
        childName: child.name,
        diagnosis: child.diagnosis || 'Not specified',
        rangeDays,
        totalLogs: logs.length,
        totalSessions: sessions.length,
        avgRating: logs.length ? Number((totalRating / logs.length).toFixed(2)) : null,
        logsByDate,
        skillsFrequency,
        sessionsByWeek,
        goalStatusCounts,
        recentLogs: recentLogs.map((log) => ({
          log_date: log.log_date,
          rating: log.rating,
          activities: log.activities,
          skills_practiced: log.skills_practiced,
        })),
        allActivityLogs, // Include all logs with full details for AI analysis
        language: (query.lang === 'id' ? 'id' : 'en') as 'en' | 'id',
      };

      const aiResult = await generateReportSummary(reportData);

      if (!aiResult) {
        logger.error('AI summary generation returned null for child', child_id);
        reply.code(500);
        return {
          success: false,
          error:
            'Failed to generate AI summary. Configure GEMINI_API_KEY (preferred) or OPENAI_API_KEY and try again.',
        };
      }

      // Update token usage
      await updateTokenUsage(user.id, aiResult.tokensUsed, {
        childId: child_id,
        feature: 'report_summary',
      });

      // Save AI summary to database
      await prisma.$executeRaw`
        INSERT INTO ai_report_summaries (child_id, start_date, end_date, summary, recommendations, tokens_used, created_at, updated_at)
        VALUES (${child_id}, ${startDate}, ${endDate}, ${aiResult.summary}, ${aiResult.recommendations}, ${aiResult.tokensUsed}, NOW(), NOW())
        ON CONFLICT (child_id, start_date, end_date) 
        DO UPDATE SET 
          summary = EXCLUDED.summary,
          recommendations = EXCLUDED.recommendations,
          tokens_used = EXCLUDED.tokens_used,
          updated_at = NOW()
      `;

      logger.info(
        `Generated and saved AI report summary for child ${child_id} by user ${user.id}, used ${aiResult.tokensUsed} tokens`
      );

      return {
        success: true,
        data: {
          summary: aiResult.summary,
          recommendations: aiResult.recommendations,
          tokensUsed: aiResult.tokensUsed,
        },
      };
      } catch (error: any) {
        const params = request.params as { childId: string };
        logger.error({
          error: error.message,
          stack: error.stack,
          childId: params.childId,
          userId: (request as AuthenticatedRequest).user?.id,
          fullError: error,
        }, 'Error in AI summary endpoint');
        reply.code(500);
        return {
          success: false,
          error: error.message || 'Failed to generate AI summary',
        };
      }
    }
  );
}

