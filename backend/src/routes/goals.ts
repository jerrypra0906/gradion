import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const createGoalSchema = z.object({
  child_id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  target_date: z.string().optional(), // ISO date string
});

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  progress_notes: z.string().optional(),
});

function isProfessionalRole(role: string) {
  return role === 'therapist' || role === 'consultant';
}

export async function goalsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Create goal (therapist/consultant/admin only)
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('therapist', 'consultant', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = createGoalSchema.parse(request.body);

      // Verify child exists and therapist is assigned (or admin)
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

      if (isProfessionalRole(user.role)) {
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

      const therapistId = user.role === 'admin' && (request.body as any).therapist_id
        ? (request.body as any).therapist_id
        : user.id;

      const goal = await prisma.goal.create({
        data: {
          child_id: body.child_id,
          therapist_id: therapistId,
          title: body.title,
          description: body.description || null,
          target_date: body.target_date ? new Date(body.target_date) : null,
          status: 'active',
        },
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        data: goal,
      };
    }
  );

  // Get goals (therapist sees own goals, parent sees child's goals, admin sees all)
  fastify.get(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { child_id, status } = request.query as { child_id?: string; status?: string };

      let where: any = {};

      if (user.role === 'parent') {
        // Parents see goals for their children
        const children = await prisma.child.findMany({
          where: { parent_id: user.id },
          select: { id: true },
        });

        const childIds = children.map((c) => c.id);
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
      } else if (isProfessionalRole(user.role)) {
        // Therapists and consultants see goals they created for assigned children
        where.therapist_id = user.id;
        if (child_id) {
          where.child_id = parseInt(child_id);
        }
      }
      // Admin sees all goals

      if (status) {
        where.status = status;
      }

      const goals = await prisma.goal.findMany({
        where,
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return {
        success: true,
        data: goals,
      };
    }
  );

  // Get single goal
  fastify.get(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const goalId = parseInt(id);

      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!goal) {
        reply.code(404);
        return {
          success: false,
          error: 'Goal not found',
        };
      }

      // Check permissions
      if (user.role === 'parent') {
        const child = await prisma.child.findFirst({
          where: {
            id: goal.child_id,
            parent_id: user.id,
          },
        });
        if (!child) {
          reply.code(403);
          return {
            success: false,
            error: 'Forbidden',
          };
        }
      }

      if (isProfessionalRole(user.role) && goal.therapist_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      return {
        success: true,
        data: goal,
      };
    }
  );

  // Update goal (therapist/consultant/admin only)
  fastify.put(
    '/:id',
    { preHandler: [authenticate, requireRole('therapist', 'consultant', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const goalId = parseInt(id);
      const body = updateGoalSchema.parse(request.body);

      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
      });

      if (!goal) {
        reply.code(404);
        return {
          success: false,
          error: 'Goal not found',
        };
      }

      if (isProfessionalRole(user.role) && goal.therapist_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      const updateData: any = {};
      if (body.title) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.target_date !== undefined) {
        updateData.target_date = body.target_date ? new Date(body.target_date) : null;
      }
      if (body.status) updateData.status = body.status;
      if (body.progress_notes !== undefined) updateData.progress_notes = body.progress_notes;

      const updatedGoal = await prisma.goal.update({
        where: { id: goalId },
        data: updateData,
        include: {
          child: {
            select: {
              id: true,
              name: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        data: updatedGoal,
      };
    }
  );

  // Delete goal (therapist/consultant/admin only)
  fastify.delete(
    '/:id',
    { preHandler: [authenticate, requireRole('therapist', 'consultant', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const goalId = parseInt(id);

      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
      });

      if (!goal) {
        reply.code(404);
        return {
          success: false,
          error: 'Goal not found',
        };
      }

      if (isProfessionalRole(user.role) && goal.therapist_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      await prisma.goal.delete({
        where: { id: goalId },
      });

      return {
        success: true,
        message: 'Goal deleted successfully',
      };
    }
  );
}

