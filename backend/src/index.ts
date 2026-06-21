import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { childrenRoutes } from './routes/children.js';
import { sessionsRoutes } from './routes/sessions.js';
import { parentLogsRoutes } from './routes/parentLogs.js';
import { goalsRoutes } from './routes/goals.js';
import { reportsRoutes } from './routes/reports.js';
import { cmsRoutes } from './routes/cms.js';
import { bannersRoutes } from './routes/banners.js';
import { uploadsRoutes } from './routes/uploads.js';
import { subscriptionsRoutes } from './routes/subscriptions.js';
import { aiTokensRoutes } from './routes/aiTokens.js';
import { adminRoutes } from './routes/admin.js';
import { profileRoutes } from './routes/profile.js';
import { promotionCodesRoutes } from './routes/promotionCodes.js';
import { contactRoutes } from './routes/contact.js';
import { sitemapRoutes } from './routes/sitemap.js';
import { videoFidelityRoutes } from './routes/videoFidelity.js';
import { modulesRoutes } from './routes/modules.js';
import { abaProgramRoutes } from './routes/abaProgram.js';
import { seedMockAutismCases } from './services/abaAutismCase.service.js';
import { ensureDefaultInitialObservationTemplate } from './services/initialObservationTemplate.service.js';
import { prisma } from './lib/prisma.js';
import { logStorageConfiguration } from './lib/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = Fastify({
  logger: true,
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
});

// Register plugins
async function buildServer() {
  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // allow Tailwind and inline styles
        scriptSrc: [
          "'self'",
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://pagead2.googlesyndication.com',
          'https://www.gstatic.com',
          'https://ssl.google-analytics.com',
        ], // Allow Google Analytics and AdSense
        scriptSrcAttr: ["'none'"],
        frameSrc: [
          "'self'",
          'https://www.google.com',
          'https://tpc.googlesyndication.com',
          'https://googleads.g.doubleclick.net',
        ], // Allow AdSense iframes
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
          'http://localhost:5001',
          'http://localhost:5000',
          'https://www.google-analytics.com',
          'https://www.googletagmanager.com',
          'https://pagead2.googlesyndication.com',
          'https://googleads.g.doubleclick.net',
        ], // Allow AdSense images
        connectSrc: [
          "'self'",
          'https://www.google-analytics.com',
          'https://www.googletagmanager.com',
        ], // Allow Analytics connections
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin for static files
  });

  // CORS - register early to apply to all routes including static files
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return cb(null, true);
      const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
      // Check if origin is in allowed list or is localhost
      if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: config.corsCredentials,
  });

  // Rate limiting - more lenient in development
  await server.register(rateLimit, {
    max: config.nodeEnv === 'production' ? config.rateLimitMaxRequests : config.rateLimitMaxRequests * 5, // 5x limit in development
    timeWindow: config.rateLimitWindowMs,
    skipOnError: true, // Don't fail if rate limit store fails
    keyGenerator: (request) => {
      // Skip rate limiting for health checks by using a special key
      if (request.url?.startsWith('/api/health')) {
        return 'health-check'; // All health checks share the same key (effectively unlimited)
      }
      return request.ip || 'unknown';
    },
  });

  // Multipart support for file uploads
  await server.register(multipart, {
    limits: {
      fileSize: Math.max(10, config.ai.videoMaxFileMb) * 1024 * 1024,
    },
  });

  // Add hook to ensure CORS headers are set for static files
  server.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/uploads/')) {
      const origin = request.headers.origin;
      const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
      // Set Access-Control-Allow-Origin header
      if (origin && (allowedOrigins.includes(origin) || origin.includes('localhost'))) {
        reply.header('Access-Control-Allow-Origin', origin);
      } else if (allowedOrigins.length > 0) {
        reply.header('Access-Control-Allow-Origin', allowedOrigins[0]);
      }
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
  });

  // Static file serving for uploads - register after CORS
  await server.register(fastifyStatic, {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads/',
    decorateReply: false, // Don't decorate reply to allow CORS to work
  });

  // Register routes
  logStorageConfiguration();
  await server.register(healthRoutes, { prefix: '/api' });
  try {
    await server.register(authRoutes, { prefix: '/api/auth' });
    logger.info('✅ Auth routes registered successfully');
  } catch (error) {
    logger.error({ error }, '❌ Failed to register auth routes');
    throw error;
  }
  await server.register(childrenRoutes, { prefix: '/api/children' });
  await server.register(sessionsRoutes, { prefix: '/api/sessions' });
  await server.register(parentLogsRoutes, { prefix: '/api/parent-logs' });
  await server.register(goalsRoutes, { prefix: '/api/goals' });
  await server.register(reportsRoutes, { prefix: '/api/reports' });
  await server.register(cmsRoutes, { prefix: '/api/cms' });
  await server.register(bannersRoutes, { prefix: '/api/banners' });
  await server.register(uploadsRoutes, { prefix: '/api/uploads' });
  await server.register(subscriptionsRoutes, { prefix: '/api/subscriptions' });
  await server.register(aiTokensRoutes, { prefix: '/api/ai-tokens' });
  await server.register(adminRoutes, { prefix: '/api/admin' });
  await server.register(profileRoutes, { prefix: '/api/profile' });
  await server.register(promotionCodesRoutes, { prefix: '/api/promotion-codes' });
  await server.register(contactRoutes, { prefix: '/api' });
  await server.register(sitemapRoutes, { prefix: '/api' });
  await server.register(videoFidelityRoutes, { prefix: '/api/video-fidelity' });
  await server.register(modulesRoutes, { prefix: '/api/modules' });
  await server.register(abaProgramRoutes, { prefix: '/api/aba-program' });

  // Global error handler - sanitize errors in production and standardize responses
  server.setErrorHandler((error, request, reply) => {
    const isProduction = config.nodeEnv === 'production';

    // Log full error details server-side
    logger.error(
      {
        err: error,
        url: request.raw.url,
        method: request.method,
      },
      'Unhandled error occurred'
    );

    const statusCode =
      typeof (error as any).statusCode === 'number' && (error as any).statusCode >= 400
        ? (error as any).statusCode
        : 500;

    let message: string;
    if (isProduction) {
      // In production, hide internal error messages for 5xx
      if (statusCode >= 500) {
        message = 'An unexpected error occurred. Please try again later.';
      } else {
        // For 4xx (client errors), keep the original message but ensure it's a string
        message =
          typeof error.message === 'string' && error.message.trim().length > 0
            ? error.message
            : 'Request failed';
      }
    } else {
      // In development, show full error message to help debugging
      message =
        typeof error.message === 'string' && error.message.trim().length > 0
          ? error.message
          : 'Internal Server Error';
    }

    const response: any = {
      success: false,
      error: message,
    };

    // Optionally include stack trace only in non-production
    if (!isProduction && error.stack) {
      response.stack = error.stack;
    }

    reply.status(statusCode).send(response);
  });

  return server;
}

// Start server
async function start() {
  try {
    const mockCount = await prisma.abaAutismCase.count({ where: { source: 'mock' } });
    if (mockCount === 0) {
      const result = await seedMockAutismCases();
      logger.info({ result }, 'Seeded mock autism cases on startup');
    }

    await ensureDefaultInitialObservationTemplate();

    const app = await buildServer();
    await app.listen({
      port: config.port,
      host: config.host,
    });
    logger.info(`🚀 Server running on http://${config.host}:${config.port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

start();

