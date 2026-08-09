import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { recordError, recordPageViews, IncomingPageView } from '../services/analytics.service.js';

type MaybeUser = { id: number; email?: string; role?: string } | null;

/**
 * Analytics is collected for signed-out visitors too (landing, register, login),
 * so auth is read opportunistically instead of enforced.
 */
function readOptionalUser(request: FastifyRequest): MaybeUser {
  try {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const decoded = jwt.verify(header.slice(7), config.auth.jwtSecret) as {
      id: number;
      email?: string;
      role?: string;
    };
    return decoded?.id ? decoded : null;
  } catch {
    return null;
  }
}

export async function analyticsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  /**
   * Batch page-view ingest. Called on route change and (via sendBeacon) when the
   * tab closes, so responses stay tiny and failures are silent by design —
   * analytics must never disrupt the app.
   */
  fastify.post('/page-views', async (request, reply) => {
    try {
      const body = (request.body || {}) as { views?: IncomingPageView[] };
      if (!Array.isArray(body.views) || body.views.length === 0) {
        return { success: true, data: { recorded: 0 } };
      }
      const user = readOptionalUser(request);
      const recorded = await recordPageViews({
        views: body.views,
        userId: user?.id ?? null,
        role: user?.role ?? null,
      });
      return { success: true, data: { recorded } };
    } catch (error) {
      // Never surface analytics failures to the client.
      logger.warn({ err: error }, 'Failed to record page views');
      reply.code(202);
      return { success: false };
    }
  });

  /** Client-side error report (JS exception or failed API call). */
  fastify.post('/errors', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        session_id?: string;
        path?: string;
        source?: string;
        name?: string;
        message?: string;
        stack?: string;
        status_code?: number;
        device?: string;
      };
      if (!body.message) {
        reply.code(400);
        return { success: false, error: 'message is required' };
      }

      const user = readOptionalUser(request);
      const result = await recordError({
        error: {
          session_id: body.session_id ?? null,
          path: body.path ?? null,
          source: body.source,
          name: body.name ?? null,
          message: body.message,
          stack: body.stack ?? null,
          status_code: body.status_code ?? null,
          device: body.device ?? null,
        },
        userId: user?.id ?? null,
        role: user?.role ?? null,
        userEmail: user?.email ?? null,
      });

      return { success: true, data: result };
    } catch (error) {
      logger.warn({ err: error }, 'Failed to record client error');
      reply.code(202);
      return { success: false };
    }
  });
}
