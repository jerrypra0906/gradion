import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { syncMissingParentLogsForChild } from '../services/parentLogFromAba.service.js';

function isAssignedStaff(role: string) {
  return role === 'therapist' || role === 'consultant';
}

const skillEntrySchema = z.object({
  name: z.string().min(1),
  rating: z.number().int().min(1).max(5),
});

const createParentLogSchema = z.object({
  child_id: z.number().int().positive(),
  log_date: z.string().optional(), // ISO date string
  skills_practiced: z.array(skillEntrySchema).min(1),
  activities: z.string().min(1),
  duration_hours: z.coerce.number().min(0.25).max(72).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  behavior_notes: z.string().optional(),
});

const updateParentLogSchema = z.object({
  log_date: z.string().optional(), // ISO date string
  skills_practiced: z.array(skillEntrySchema).min(1).optional(),
  activities: z.string().min(1).optional(),
  duration_hours: z.coerce.number().min(0.25).max(72).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  behavior_notes: z.string().optional(),
});

const reviewLogSchema = z.object({
  comment: z.string().min(1),
  status: z.enum(['approved', 'flagged']),
});

type SkillEntry = z.infer<typeof skillEntrySchema>;

function normalizeSkills(skills: SkillEntry[]): SkillEntry[] {
  return skills.map((skill) => ({
    name: skill.name.trim(),
    rating: Math.min(Math.max(skill.rating, 1), 5),
  }));
}

function computeAverageRating(skills: SkillEntry[]): number {
  if (!skills.length) {
    return 0;
  }
  const total = skills.reduce((sum, skill) => sum + skill.rating, 0);
  return Math.round(total / skills.length);
}


export async function parentLogsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Create activity log (parents, therapists, consultants, and admins)
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;

      const body = createParentLogSchema.parse(request.body);

      // Verify child exists
      const child = await prisma.child.findUnique({
        where: { id: body.child_id },
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
            child_id: body.child_id,
          },
        });
        if (!isAssigned) {
          reply.code(403);
          return {
            success: false,
            error: 'You are not assigned to this child',
          };
        }
      }

      // Determine parent_id (always the child's parent) and creator info
      const parentId = child.parent_id; // Always use child's parent
      const creatorId = user.id;
      const creatorRole = user.role as Role;

      // Check subscription status for parent logs
      // For parents: check their own subscription
      // For therapists: check the parent's subscription (therapist can create logs if parent's subscription is active)
      if (user.role === 'parent' || isAssignedStaff(user.role)) {
        const { isSubscriptionActive } = await import('../lib/subscription.js');
        const subscriptionCheck = await isSubscriptionActive(parentId);

        if (!subscriptionCheck.active) {
          reply.code(403);
          return {
            success: false,
            error: subscriptionCheck.message || 'The parent\'s subscription has expired. Activity logs cannot be created until the subscription is renewed.',
          };
        }
      }

      const logDate = body.log_date ? new Date(body.log_date) : new Date();

      const normalizedSkills = normalizeSkills(body.skills_practiced);
      const overallRating =
        body.rating ?? computeAverageRating(normalizedSkills);

      const durationHours = body.duration_hours ?? 3;

      const log = await prisma.parentLog.create({
        data: {
          parent_id: parentId,
          child_id: body.child_id,
          creator_id: creatorId,
          creator_role: creatorRole,
          log_date: logDate,
          skills_practiced: normalizedSkills,
          activities: body.activities,
          duration_hours: durationHours,
          rating: overallRating,
          behavior_notes: body.behavior_notes || null,
          status: 'pending',
        },
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Update used_sessions (now counts activity logs)
      await prisma.child.update({
        where: { id: body.child_id },
        data: {
          used_sessions: {
            increment: 1,
          },
        },
      });

      return {
        success: true,
        data: log,
      };
    }
  );

  // Get parent logs (parent sees own logs, therapist sees assigned children's logs, admin sees all)
  fastify.get(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { child_id, status } = request.query as { child_id?: string; status?: string };

      let where: any = {};

      if (user.role === 'parent') {
        where.parent_id = user.id;
        if (child_id) {
          where.child_id = parseInt(child_id);
        }
      } else if (isAssignedStaff(user.role)) {
        // Therapists and consultants see logs for assigned children
        const assignedChildren = await prisma.therapistChild.findMany({
          where: { therapist_id: user.id },
          select: { child_id: true },
        });

        const childIds = assignedChildren.map((tc) => tc.child_id);
        if (childIds.length === 0) {
          return {
            success: true,
            data: [],
          };
        }

        where.child_id = { in: childIds };
        if (child_id) {
          const childId = parseInt(child_id);
          if (!childIds.includes(childId)) {
            reply.code(403);
            return {
              success: false,
              error: 'Forbidden',
            };
          }
          where.child_id = childId;
        }
      } else if (user.role === 'admin') {
        // Admin sees all logs, but a child_id filter must still scope the
        // result (e.g. the Child Detail activity section).
        if (child_id) {
          const childId = parseInt(child_id, 10);
          if (!Number.isNaN(childId)) {
            where.child_id = childId;
          }
        }
      }

      if (status) {
        where.status = status;
      }

      if (child_id) {
        const childIdNum = parseInt(child_id, 10);
        if (!Number.isNaN(childIdNum)) {
          await syncMissingParentLogsForChild(childIdNum);
        }
      }

      const logs = await prisma.parentLog.findMany({
        where,
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          log_date: 'desc',
        },
      });

      return {
        success: true,
        data: logs,
      };
    }
  );

  // Get single log
  fastify.get(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const logId = parseInt(id);

      const log = await prisma.parentLog.findUnique({
        where: { id: logId },
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!log) {
        reply.code(404);
        return {
          success: false,
          error: 'Log not found',
        };
      }

      // Check permissions
      if (user.role === 'parent' && log.parent_id !== user.id) {
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
            child_id: log.child_id,
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

      return {
        success: true,
        data: log,
      };
    }
  );

  // Update log (creator only, if pending)
  fastify.put(
    '/:id',
    { preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const logId = parseInt(id);
      const body = updateParentLogSchema.parse(request.body);

      const log = await prisma.parentLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        reply.code(404);
        return {
          success: false,
          error: 'Log not found',
        };
      }

      // Only allow the creator (or admin) to edit
      if (user.role !== 'admin' && log.creator_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'You can only edit logs that you created',
        };
      }

      // Only allow editing if status is pending
      if (log.status !== 'pending') {
        reply.code(400);
        return {
          success: false,
          error: 'Cannot edit log that has been reviewed',
        };
      }

      // Check subscription status for editing (time-based access)
      // Only check for parents and when admin is editing someone else's log
      if (user.role === 'parent' || (user.role === 'admin' && log.parent_id !== user.id)) {
        const { isSubscriptionActive } = await import('../lib/subscription.js');
        const subscriptionCheck = await isSubscriptionActive(log.parent_id);

        if (!subscriptionCheck.active) {
          reply.code(403);
          return {
            success: false,
            error: subscriptionCheck.message || 'Your subscription has expired. You can view your data but cannot edit logs. Please renew your subscription to continue.',
          };
        }
      }

      const updateData: any = {};
      
      // Handle log_date update
      if (body.log_date) {
        const logDate = new Date(body.log_date);
        if (isNaN(logDate.getTime())) {
          reply.code(400);
          return {
            success: false,
            error: 'Invalid date format',
          };
        }
        updateData.log_date = logDate;
      }
      
      if (body.skills_practiced) {
        const normalizedSkills = normalizeSkills(body.skills_practiced);
        updateData.skills_practiced = normalizedSkills;
        updateData.rating =
          body.rating ?? computeAverageRating(normalizedSkills);
      } else if (body.rating) {
        updateData.rating = body.rating;
      }

      if (body.activities) updateData.activities = body.activities;
      if (body.duration_hours !== undefined) updateData.duration_hours = body.duration_hours;
      if (body.behavior_notes !== undefined) updateData.behavior_notes = body.behavior_notes;

      const updatedLog = await prisma.parentLog.update({
        where: { id: logId },
        data: updateData,
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return {
        success: true,
        data: updatedLog,
      };
    }
  );

  // Review log (based on creator: parent-created logs reviewed by therapist/consultant, staff-created logs reviewed by parent)
  fastify.post(
    '/:id/review',
    { preHandler: [authenticate, requireRole('parent', 'therapist', 'consultant', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const logId = parseInt(id);
      const body = reviewLogSchema.parse(request.body);

      const log = await prisma.parentLog.findUnique({
        where: { id: logId },
        include: {
          child: {
            select: {
              id: true,
              parent_id: true,
            },
          },
        },
      });

      if (!log) {
        reply.code(404);
        return {
          success: false,
          error: 'Log not found',
        };
      }

      // Review permissions based on creator
      // If parent created → therapist reviews
      // If therapist created → parent reviews
      if (log.creator_role === 'parent') {
        // Parent-created log: only assigned therapist/consultant (or admin) can review
        if (!isAssignedStaff(user.role) && user.role !== 'admin') {
          reply.code(403);
          return {
            success: false,
            error: 'Only therapists or consultants can review parent-created logs',
          };
        }
        if (isAssignedStaff(user.role)) {
          const isAssigned = await prisma.therapistChild.findFirst({
            where: {
              therapist_id: user.id,
              child_id: log.child_id,
            },
          });
          if (!isAssigned) {
            reply.code(403);
            return {
              success: false,
              error: 'You are not assigned to this child',
            };
          }
        }
      } else if (log.creator_role === 'therapist' || log.creator_role === 'consultant') {
        // Staff-created log: only parent can review
        if (user.role !== 'parent' && user.role !== 'admin') {
          reply.code(403);
          return {
            success: false,
            error: 'Only parents can review logs created by therapists or consultants',
          };
        }
        if (user.role === 'parent' && log.child.parent_id !== user.id) {
          reply.code(403);
          return {
            success: false,
            error: 'You can only review logs for your own children',
          };
        }
      }

      const updatedLog = await prisma.parentLog.update({
        where: { id: logId },
        data: {
          status: body.status,
          therapist_comment: body.comment, // Keep field name for backward compatibility
        },
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return {
        success: true,
        data: updatedLog,
      };
    }
  );

  // Delete log (parent only, if pending)
  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireRole('parent', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const logId = parseInt(id);

      const log = await prisma.parentLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        reply.code(404);
        return {
          success: false,
          error: 'Log not found',
        };
      }

      if (user.role === 'parent' && log.parent_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      // Only allow deletion if status is pending
      if (log.status !== 'pending' && user.role === 'parent') {
        reply.code(400);
        return {
          success: false,
          error: 'Cannot delete log that has been reviewed',
        };
      }

      await prisma.parentLog.delete({
        where: { id: logId },
      });

      return {
        success: true,
        message: 'Log deleted successfully',
      };
    }
  );
}

