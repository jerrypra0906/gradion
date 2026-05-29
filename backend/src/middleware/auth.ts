import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  name?: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthUser;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized - No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.auth.jwtSecret) as AuthUser;

    (request as AuthenticatedRequest).user = decoded;
  } catch {
    reply.code(401).send({ error: 'Unauthorized - Invalid token' });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(request as AuthenticatedRequest).user) {
      await authenticate(request, reply);
      if (reply.sent) return;
    }

    const user = (request as AuthenticatedRequest).user;

    if (!user) {
      if (!reply.sent) {
        reply.code(401).send({ error: 'Unauthorized' });
      }
      return;
    }

    const userRole = user.role ? user.role.toLowerCase().trim() : null;
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase().trim());

    if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
      if (config.nodeEnv === 'development') {
        logger.debug(
          {
            userId: user.id,
            userRole,
            requiredRoles: allowedRoles,
            method: request.method,
            url: request.url,
          },
          'Authorization denied: insufficient role'
        );
      }
      if (!reply.sent) {
        reply.code(403).send({
          error: 'Forbidden - Insufficient permissions',
        });
      }
      return;
    }
  };
}
