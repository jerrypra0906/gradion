import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import path from 'path';
import { formatErrorMessage } from '../utils/errorResponse.js';
import sharp from 'sharp';
import {
  ensureLocalUploadDirs,
  logStorageConfiguration,
  uploadObject,
} from '../lib/storage.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

function generateFilename(originalFilename: string, prefix: string = 'banner'): string {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}${ext}`;
}

export async function uploadsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  await ensureLocalUploadDirs();
  logStorageConfiguration();

  fastify.post(
    '/banner',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const data = await request.file();

        if (!data) {
          reply.code(400);
          return {
            success: false,
            error: 'No file uploaded',
          };
        }

        if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
          reply.code(400);
          return {
            success: false,
            error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
          };
        }

        const buffer = await data.toBuffer();
        if (buffer.length > MAX_FILE_SIZE) {
          reply.code(400);
          return {
            success: false,
            error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          };
        }

        const originalMetadata = await sharp(buffer).metadata();
        fastify.log.info(
          {
            originalWidth: originalMetadata.width,
            originalHeight: originalMetadata.height,
            targetSize: '1200x300',
          },
          'Original banner image dimensions'
        );

        const resizedBuffer = await sharp(buffer)
          .resize(1200, 300, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        const filename = generateFilename(data.filename || 'banner', 'banner').replace(/\.[^.]+$/, '.jpg');
        const storageKey = `banners/${filename}`;

        const uploaded = await uploadObject({
          key: storageKey,
          body: resizedBuffer,
          contentType: 'image/jpeg',
        });

        fastify.log.info(
          {
            filename,
            storageKey,
            userId: (request as AuthenticatedRequest).user?.id,
            storage: uploaded.backend,
          },
          'Banner image uploaded'
        );

        return {
          success: true,
          data: {
            url: uploaded.url,
            filename,
          },
        };
      } catch (error: unknown) {
        fastify.log.error({ error }, 'Failed to upload banner image');
        reply.code(500);
        return {
          success: false,
          error: formatErrorMessage(error, 'Failed to upload image'),
        };
      }
    }
  );

  fastify.post(
    '/cms',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const data = await request.file();

        if (!data) {
          reply.code(400);
          return {
            success: false,
            error: 'No file uploaded',
          };
        }

        if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
          reply.code(400);
          return {
            success: false,
            error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
          };
        }

        const buffer = await data.toBuffer();
        if (buffer.length > MAX_FILE_SIZE) {
          reply.code(400);
          return {
            success: false,
            error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          };
        }

        const originalMetadata = await sharp(buffer).metadata();
        const maxWidth = 1920;
        const maxHeight = 1920;

        let processedBuffer = buffer;
        if (
          originalMetadata.width &&
          originalMetadata.height &&
          (originalMetadata.width > maxWidth || originalMetadata.height > maxHeight)
        ) {
          processedBuffer = await sharp(buffer)
            .resize(maxWidth, maxHeight, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();
        }

        const originalExt = path.extname(data.filename || 'image.jpg');
        const filename = generateFilename(data.filename || 'cms-image.jpg', 'cms').replace(
          /\.[^.]+$/,
          originalExt || '.jpg'
        );
        const storageKey = `cms/${filename}`;

        const uploaded = await uploadObject({
          key: storageKey,
          body: processedBuffer,
          contentType: data.mimetype,
        });

        fastify.log.info(
          {
            filename,
            storageKey,
            userId: (request as AuthenticatedRequest).user?.id,
            storage: uploaded.backend,
          },
          'CMS image uploaded'
        );

        return {
          success: true,
          data: {
            url: uploaded.url,
            filename,
          },
        };
      } catch (error: unknown) {
        fastify.log.error({ error }, 'Failed to upload CMS image');
        reply.code(500);
        return {
          success: false,
          error: formatErrorMessage(error, 'Failed to upload image'),
        };
      }
    }
  );
}
