import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
});

export async function profileRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Get current user profile
  fastify.get(
    '/me',
    { preHandler: authenticate },
    async (request, _reply) => {
      const user = (request as AuthenticatedRequest).user!;

      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          referral_code: true,
          points: true,
          role: true,
          created_at: true,
          is_email_verified: true,
        },
      });

      if (!userProfile) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: userProfile,
      };
    }
  );

  // Update user profile
  fastify.put(
    '/me',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const body = updateProfileSchema.parse(request.body);

      // Check if email is being changed and if it's already taken
      if (body.email && body.email !== user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: body.email },
        });

        if (existingUser) {
          reply.code(409);
          return {
            success: false,
            error: 'Email already in use',
          };
        }

        // If email is changed, reset email verification
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email: body.email,
            phone_number: body.phone_number ?? undefined,
            is_email_verified: false,
          },
        });

        // TODO: Send verification email to new email address
      } else {
        // Only update phone number
        await prisma.user.update({
          where: { id: user.id },
          data: {
            phone_number: body.phone_number ?? undefined,
          },
        });
      }

      // Fetch updated user
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          referral_code: true,
          points: true,
          role: true,
          created_at: true,
          is_email_verified: true,
        },
      });

      return {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      };
    }
  );
}

