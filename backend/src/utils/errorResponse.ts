import type { FastifyReply } from 'fastify';
import { logger } from './logger.js';
import { config } from '../config/env.js';

const isProduction = config.nodeEnv === 'production';

export function formatErrorMessage(error: any, fallback: string): string {
  if (!error) return fallback;

  // In production, avoid leaking internal error details
  if (isProduction) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  error: any,
  fallback: string
) {
  const message = formatErrorMessage(error, fallback);
  // Always log full error details on the server
  if (error) {
    logger.error({ err: error, statusCode }, 'Request error');
  } else {
    logger.error({ statusCode }, 'Request error without error object');
  }

  return reply.code(statusCode).send({
    success: false,
    error: message,
  });
}


