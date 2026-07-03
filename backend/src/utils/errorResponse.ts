import type { FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logger } from './logger.js';
import { config } from '../config/env.js';

const isProduction = config.nodeEnv === 'production';

const SAFE_USER_FACING_PATTERNS = [
  'already exists',
  'Cannot change role of the last admin',
  'Invalid user id',
  'User not found',
  'Password must',
  'Invalid email',
  'String must contain at least',
  'Email service is not configured',
  'We could not send',
  'Invalid or expired reset token',
  'This reset link has already been used',
  'Reset link has expired',
];

export function getUserFacingError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.errors
      .map((issue) => {
        const field = issue.path.length ? issue.path.join('.') : 'input';
        return `${field}: ${issue.message}`;
      })
      .join('; ');
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === 'P2002') {
      return 'A user with this email already exists';
    }
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      const isSafe =
        !isProduction || SAFE_USER_FACING_PATTERNS.some((pattern) => message.includes(pattern));
      if (isSafe) {
        return message;
      }
    }
  }

  return formatErrorMessage(error, fallback);
}

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

export function isEmailServiceError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  return (
    message.includes('Email service is not configured') ||
    message.includes('We could not send')
  );
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


