import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

function isClinicalStaffRole(role: string) {
  return role === 'therapist' || role === 'consultant';
}

const createSessionSchema = z.object({
  child_id: z.number().int().positive(),
  date: z.string().optional(), // ISO date string
  duration_minutes: z.number().int().positive(),
  goals_worked_on: z.array(z.string()),
  notes: z.string().optional(),
});

const reviewSessionSchema = z.object({
  comment: z.string().min(1),
  status: z.enum(['approved', 'flagged']),
});

export async function sessionsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Create session (therapist only)
  fastify.post(
    '/',
    { preHandler: [authenticate, requireRole('therapist', 'consultant', 'admin')] },
    async (request, reply) => {
      try {
      const user = (request as AuthenticatedRequest).user!;
        
        logger.info({
          userId: user.id,
          userRole: user.role,
          body: request.body,
        }, 'Session creation request received');

        let body;
        try {
          body = createSessionSchema.parse(request.body);
        } catch (error) {
          logger.error({ error, body: request.body }, 'Session creation validation failed');
          reply.code(400);
          return {
            success: false,
            error: error instanceof z.ZodError 
              ? `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
              : 'Invalid request data',
          };
        }

      // Check if child exists and therapist is assigned (or admin)
      const child = await prisma.child.findUnique({
        where: { id: body.child_id },
      });

      if (!child) {
          logger.warn({ child_id: body.child_id }, 'Child not found for session creation');
        reply.code(404);
        return {
          success: false,
          error: 'Child not found',
        };
      }

      if (isClinicalStaffRole(user.role)) {
        const isAssigned = await prisma.therapistChild.findFirst({
          where: {
            therapist_id: user.id,
            child_id: body.child_id,
          },
        });

        if (!isAssigned) {
            logger.warn({
              therapist_id: user.id,
              child_id: body.child_id,
            }, 'Therapist not assigned to child');
          reply.code(403);
          return {
            success: false,
            error: 'You are not assigned to this child',
          };
        }
      }

      // Check quota
      if (child.used_sessions >= child.monthly_quota) {
          logger.warn({
            child_id: body.child_id,
            used_sessions: child.used_sessions,
            monthly_quota: child.monthly_quota,
          }, 'Monthly quota exceeded');
        reply.code(403);
        return {
          success: false,
          error: 'Monthly quota exceeded',
        };
      }

      // Parse date if provided, otherwise use current date
      const sessionDate = body.date ? new Date(body.date) : new Date();
        
        if (isNaN(sessionDate.getTime())) {
          logger.error({ date: body.date }, 'Invalid date provided');
          reply.code(400);
          return {
            success: false,
            error: 'Invalid date format',
          };
        }
        
        // Verify clinical staff or admin (safety check; middleware already enforces)
        if (!isClinicalStaffRole(user.role) && user.role !== 'admin') {
          logger.error({
            userId: user.id,
            userRole: user.role,
          }, 'Invalid role attempting to create session');
          reply.code(403);
          return {
            success: false,
            error: 'Only clinical staff and admins can create sessions',
          };
        }
      
      // Create session
        logger.info({
          userId: user.id,
          userRole: user.role,
          userEmail: user.email,
          childId: body.child_id,
          sessionDate: sessionDate,
        }, 'Creating session with therapist_id from authenticated user');

      const session = await prisma.session.create({
        data: {
            therapist_id: user.id, // This should be the therapist's ID
          child_id: body.child_id,
          date: sessionDate,
          duration_minutes: body.duration_minutes,
          goals_worked_on: body.goals_worked_on,
          notes: body.notes || null,
            status: 'pending', // Default status for new sessions
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

        logger.info({
          sessionId: session.id,
          therapistId: session.therapist_id,
          therapistName: session.therapist?.name,
          childId: session.child_id,
          childName: session.child?.name,
        }, 'Session created successfully');

      // Update used_sessions
      await prisma.child.update({
        where: { id: body.child_id },
        data: {
          used_sessions: {
            increment: 1,
          },
        },
      });

        logger.info({
          session_id: session.id,
          therapist_id: user.id,
          therapist_email: user.email,
          user_role: user.role,
          child_id: body.child_id,
          session_data: {
            id: session.id,
            therapist_id: session.therapist_id,
            therapist_name: session.therapist?.name,
            child_id: session.child_id,
            date: session.date,
          },
        }, 'Session created successfully');

      return {
        success: true,
        data: session,
      };
      } catch (error) {
        logger.error(
          {
            error,
            stack: error instanceof Error ? error.stack : undefined,
            body: request.body,
          },
          'Error creating session'
        );
        reply.code(500);
        return {
          success: false,
          error: 'Failed to create session',
        };
      }
    }
  );

  // Get sessions for a child
  fastify.get(
    '/child/:childId',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { childId } = request.params as { childId: string };
      const id = parseInt(childId);

      // Check permissions
      const child = await prisma.child.findUnique({
        where: { id },
      });

      if (!child) {
        reply.code(404);
        return {
          success: false,
          error: 'Child not found',
        };
      }

      if (user.role === 'parent' && child.parent_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'Forbidden',
        };
      }

      if (isClinicalStaffRole(user.role)) {
        const isAssigned = await prisma.therapistChild.findFirst({
          where: {
            therapist_id: user.id,
            child_id: id,
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

      // For clinical staff, only show their own sessions for this child
      // For parents and admins, show all sessions for this child
      const whereClause: any = { child_id: id };
      if (isClinicalStaffRole(user.role)) {
        whereClause.therapist_id = user.id;
      }

      logger.info({
        userId: user.id,
        userRole: user.role,
        childId: id,
        whereClause,
      }, 'GET /api/sessions/child/:childId - Fetching sessions for child');

      const sessions = await prisma.session.findMany({
        where: whereClause,
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
          date: 'desc',
        },
      });

      logger.info({
        userId: user.id,
        userRole: user.role,
        childId: id,
        sessionsCount: sessions.length,
        sessionIds: sessions.map(s => s.id),
        sessionTherapistIds: sessions.map(s => s.therapist_id),
      }, 'GET /api/sessions/child/:childId - Sessions found');

      return {
        success: true,
        data: sessions,
      };
    }
  );

  // Get all sessions (admin sees all, therapist sees only their own, parent sees their children's sessions)
  fastify.get(
    '/',
    { preHandler: authenticate },
    async (request) => {
      const user = (request as AuthenticatedRequest).user!;
      
      logger.info({
        userId: user.id,
        userRole: user.role,
        url: request.url,
        method: request.method,
      }, 'GET /api/sessions - Fetching sessions');
      
      // Build where clause based on user role
      let whereClause: any = {};
      
      if (isClinicalStaffRole(user.role)) {
        // Therapists and consultants see only their own sessions
        whereClause = { therapist_id: user.id };
      } else if (user.role === 'parent') {
        // Parents see sessions for their children
        const children = await prisma.child.findMany({
          where: { parent_id: user.id },
          select: { id: true },
        });
        const childIds = children.map(c => c.id);
        if (childIds.length === 0) {
          return {
            success: true,
            data: [],
          };
        }
        whereClause = { child_id: { in: childIds } };
      }
      // Admin sees all (empty whereClause)
      
      logger.info({
        userId: user.id,
        userRole: user.role,
        whereClause,
      }, 'GET /api/sessions - Query filter');
      
      const sessions = await prisma.session.findMany({
        where: whereClause,
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
          date: 'desc',
        },
        take: 100,
      });

      logger.info({
        userId: user.id,
        userRole: user.role,
        whereClause,
        sessionsCount: sessions.length,
        sessionIds: sessions.map(s => s.id),
      }, 'GET /api/sessions - Query results');

      return {
        success: true,
        data: sessions,
      };
    }
  );

  // Get single session
  fastify.get(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const sessionId = parseInt(id);

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
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

      if (!session) {
        reply.code(404);
        return {
          success: false,
          error: 'Session not found',
        };
      }

      // Check permissions
      if (user.role === 'parent') {
        const child = await prisma.child.findUnique({
          where: { id: session.child_id },
        });
        if (!child || child.parent_id !== user.id) {
          reply.code(403);
          return {
            success: false,
            error: 'Forbidden',
          };
        }
      } else if (isClinicalStaffRole(user.role)) {
        if (session.therapist_id !== user.id) {
          reply.code(403);
          return {
            success: false,
            error: 'Forbidden',
          };
        }
      }

      return {
        success: true,
        data: session,
      };
    }
  );

  // Review session (parent/admin only)
  fastify.post(
    '/:id/review',
    { preHandler: [authenticate, requireRole('parent', 'admin')] },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const sessionId = parseInt(id);
      const body = reviewSessionSchema.parse(request.body);

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          child: {
            select: {
              id: true,
              parent_id: true,
            },
          },
        },
      });

      if (!session) {
        reply.code(404);
        return {
          success: false,
          error: 'Session not found',
        };
      }

      // Check if parent owns the child
      if (user.role === 'parent' && session.child.parent_id !== user.id) {
        reply.code(403);
        return {
          success: false,
          error: 'You can only review sessions for your own children',
        };
      }

      const updatedSession = await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: body.status,
          parent_comment: body.comment,
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

      logger.info({
        session_id: sessionId,
        parent_id: user.id,
        status: body.status,
      }, 'Session reviewed by parent');

      return {
        success: true,
        data: updatedSession,
      };
    }
  );
}

