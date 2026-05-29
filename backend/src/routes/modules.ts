import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const moduleKeySchema = z.string().min(1).max(100);

const updateProgressSchema = z.object({
  module_key: moduleKeySchema,
  video_completed: z.boolean().optional(),
  quiz_passed: z.boolean().optional(),
  quiz_answers: z.unknown().optional(),
});

export async function modulesRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // List progress for current user
  fastify.get(
    '/progress',
    { preHandler: authenticate },
    async (request, _reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const rows = await prisma.learningModuleProgress.findMany({
        where: { user_id: user.id },
        orderBy: { updated_at: 'desc' },
      });
      return { success: true, data: rows };
    }
  );

  // Upsert progress for a module
  fastify.post(
    '/progress',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = updateProgressSchema.parse(request.body);

      const existing = await prisma.learningModuleProgress.findUnique({
        where: { user_id_module_key: { user_id: user.id, module_key: body.module_key } },
      });

      const next = {
        video_completed: body.video_completed ?? existing?.video_completed ?? false,
        quiz_passed: body.quiz_passed ?? existing?.quiz_passed ?? false,
        quiz_answers: body.quiz_answers ?? existing?.quiz_answers ?? undefined,
      };

      // Don’t allow “uncompleting”
      if (existing) {
        next.video_completed = existing.video_completed || next.video_completed;
        next.quiz_passed = existing.quiz_passed || next.quiz_passed;
      }

      const saved = await prisma.learningModuleProgress.upsert({
        where: { user_id_module_key: { user_id: user.id, module_key: body.module_key } },
        create: {
          user_id: user.id,
          module_key: body.module_key,
          video_completed: Boolean(next.video_completed),
          quiz_passed: Boolean(next.quiz_passed),
          quiz_answers: next.quiz_answers as any,
        },
        update: {
          video_completed: Boolean(next.video_completed),
          quiz_passed: Boolean(next.quiz_passed),
          quiz_answers: next.quiz_answers as any,
        },
      });

      reply.code(200);
      return { success: true, data: saved };
    }
  );
}

