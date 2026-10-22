import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Private storage for practice videos (children at home — never public).
 *
 * - S3 (production): the browser uploads straight to a private bucket with a
 *   presigned PUT, and playback uses short-lived presigned GETs.
 * - Local (dev / no bucket configured): files live under uploads/.private,
 *   which the static /uploads route never serves; playback goes through an
 *   authenticated range-streaming route with a short-lived signed token.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_PRIVATE_ROOT = path.join(__dirname, '../../uploads/.private');

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const PLAYBACK_URL_TTL_SECONDS = 60 * 60;

export type PrivateMediaBackend = 's3' | 'local';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    // No explicit credentials: the SDK's default chain picks up the EC2
    // instance role (or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
    s3Client = new S3Client({ region: config.storage.awsS3Region });
  }
  return s3Client;
}

export function privateMediaBackend(): PrivateMediaBackend {
  return config.storage.awsS3Bucket ? 's3' : 'local';
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, '').replace(/\.\./g, '');
}

function localPath(key: string): string {
  return path.join(LOCAL_PRIVATE_ROOT, normalizeKey(key));
}

export function logPrivateMediaConfiguration(): void {
  if (privateMediaBackend() === 's3') {
    logger.info(
      { bucket: config.storage.awsS3Bucket, region: config.storage.awsS3Region },
      'Practice videos: private S3 bucket',
    );
  } else {
    logger.warn('Practice videos: AWS_S3_BUCKET not set — storing on local disk (uploads/.private)');
  }
}

export type UploadTarget =
  | { kind: 's3'; method: 'PUT'; url: string; headers: Record<string, string> }
  | { kind: 'local' };

/** Where the browser should send the file. S3 gets a presigned PUT bound to type + size. */
export async function createUploadTarget(params: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<UploadTarget> {
  if (privateMediaBackend() !== 's3') return { kind: 'local' };
  const url = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: config.storage.awsS3Bucket!,
      Key: normalizeKey(params.key),
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
  return { kind: 's3', method: 'PUT', url, headers: { 'Content-Type': params.contentType } };
}

/** Confirms the object landed (and its size) before analysis is queued. */
export async function statObject(key: string): Promise<{ exists: boolean; size?: number }> {
  try {
    if (privateMediaBackend() === 's3') {
      const head = await getS3Client().send(
        new HeadObjectCommand({ Bucket: config.storage.awsS3Bucket!, Key: normalizeKey(key) }),
      );
      return { exists: true, size: Number(head.ContentLength ?? 0) };
    }
    const st = await fs.stat(localPath(key));
    return { exists: st.isFile(), size: st.size };
  } catch {
    return { exists: false };
  }
}

/**
 * Local-mode upload: stream the request body to disk without buffering it in
 * memory, aborting past maxBytes. Returns the bytes written.
 */
export async function saveLocalStream(key: string, body: Readable, maxBytes: number): Promise<number> {
  const target = localPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  let written = 0;
  body.on('data', (chunk: Buffer) => {
    written += chunk.length;
    if (written > maxBytes) body.destroy(new Error('File too large'));
  });
  try {
    await pipeline(body, createWriteStream(target));
  } catch (err) {
    await fs.rm(target, { force: true }).catch(() => {});
    throw err;
  }
  return written;
}

/** A local file path for the AI to read; S3 objects are streamed to a temp file. */
export async function downloadToTemp(key: string): Promise<{ path: string; cleanup: () => Promise<void> }> {
  if (privateMediaBackend() === 'local') {
    return { path: localPath(key), cleanup: async () => {} };
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gradion-video-'));
  const tempPath = path.join(tempDir, path.basename(normalizeKey(key)));
  const cleanup = async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  };
  try {
    const res = await getS3Client().send(
      new GetObjectCommand({ Bucket: config.storage.awsS3Bucket!, Key: normalizeKey(key) }),
    );
    if (!res.Body) throw new Error('S3 object body is empty');
    await pipeline(res.Body as Readable, createWriteStream(tempPath));
    return { path: tempPath, cleanup };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  if (privateMediaBackend() === 's3') {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: config.storage.awsS3Bucket!, Key: normalizeKey(key) }),
    );
    return;
  }
  await fs.rm(localPath(key), { force: true });
}

// --- Playback ---------------------------------------------------------------

/**
 * Stream tokens are signed with a secret derived from (not equal to) the auth
 * JWT secret, so a playback link can never be presented as a login token.
 */
function streamSecret(): string {
  return `${config.auth.jwtSecret}:program-video-stream`;
}

export async function createPlaybackUrl(params: {
  videoId: number;
  key: string;
  backend: string;
}): Promise<string> {
  if (params.backend === 's3' && config.storage.awsS3Bucket) {
    return getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: config.storage.awsS3Bucket, Key: normalizeKey(params.key) }),
      { expiresIn: PLAYBACK_URL_TTL_SECONDS },
    );
  }
  const token = jwt.sign({ vid: params.videoId }, streamSecret(), {
    expiresIn: PLAYBACK_URL_TTL_SECONDS,
  });
  const base = config.publicApiUrl.replace(/\/$/, '');
  return `${base}/program-videos/stream/${params.videoId}?token=${encodeURIComponent(token)}`;
}

export function verifyStreamToken(token: string, videoId: number): boolean {
  try {
    const decoded = jwt.verify(token, streamSecret()) as { vid?: number };
    return decoded?.vid === videoId;
  } catch {
    return false;
  }
}

export function localFilePath(key: string): string {
  return localPath(key);
}
