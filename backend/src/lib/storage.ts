import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOAD_ROOT = path.join(__dirname, '../../uploads');

export type StorageBackend = 'r2' | 'supabase' | 'local';

let supabaseClient: SupabaseClient | null = null;
let r2Client: S3Client | null = null;

function hasR2Config(): boolean {
  const s = config.storage;
  return !!(
    s.r2AccountId &&
    s.r2AccessKeyId &&
    s.r2SecretAccessKey &&
    s.r2BucketName &&
    s.r2PublicUrl
  );
}

function hasSupabaseConfig(): boolean {
  return !!(
    config.storage.supabaseUrl &&
    config.storage.supabaseServiceRoleKey &&
    config.storage.supabaseStorageBucket
  );
}

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      config.storage.supabaseUrl!,
      config.storage.supabaseServiceRoleKey!
    );
  }
  return supabaseClient;
}

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.storage.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.storage.r2AccessKeyId!,
        secretAccessKey: config.storage.r2SecretAccessKey!,
      },
    });
  }
  return r2Client;
}

export function getStorageBackend(): StorageBackend {
  if (hasR2Config()) return 'r2';
  if (hasSupabaseConfig()) return 'supabase';
  return 'local';
}

export function isRemoteStorageConfigured(): boolean {
  return getStorageBackend() !== 'local';
}

export function logStorageConfiguration(): void {
  const backend = getStorageBackend();
  if (backend === 'r2') {
    logger.info({ backend, bucket: config.storage.r2BucketName }, 'Using Cloudflare R2 for file storage');
  } else if (backend === 'supabase') {
    logger.info(
      { backend, bucket: config.storage.supabaseStorageBucket },
      'Using Supabase Storage for file uploads'
    );
  } else {
    logger.warn(
      'Using local filesystem for uploads (files are lost on container restart). ' +
        'Configure R2_* or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for persistent storage.'
    );
    if (config.nodeEnv === 'production') {
      logger.error(
        'Production should use R2 or Supabase for uploads and video fidelity — local storage is not durable.'
      );
    }
  }
}

function localAbsolutePath(key: string): string {
  const normalized = key.replace(/^\/+/, '').replace(/\.\./g, '');
  return path.join(LOCAL_UPLOAD_ROOT, normalized);
}

function publicUrlForKey(key: string, backend: StorageBackend): string {
  const normalizedKey = key.replace(/^\/+/, '');

  if (backend === 'r2') {
    const base = config.storage.r2PublicUrl!.replace(/\/$/, '');
    return `${base}/${normalizedKey}`;
  }

  if (backend === 'supabase') {
    const { data } = getSupabaseClient()
      .storage.from(config.storage.supabaseStorageBucket)
      .getPublicUrl(normalizedKey);
    return data.publicUrl;
  }

  return `/uploads/${normalizedKey}`;
}

export async function uploadObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string; backend: StorageBackend; key: string }> {
  const key = params.key.replace(/^\/+/, '');
  const backend = getStorageBackend();

  if (backend === 'r2') {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: config.storage.r2BucketName!,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
      })
    );
  } else if (backend === 'supabase') {
    const { error } = await getSupabaseClient()
      .storage.from(config.storage.supabaseStorageBucket)
      .upload(key, params.body, {
        contentType: params.contentType,
        upsert: false,
      });
    if (error) {
      throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
    }
  } else {
    const filepath = localAbsolutePath(key);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, params.body);
  }

  return {
    url: publicUrlForKey(key, backend),
    backend,
    key,
  };
}

async function streamToBuffer(body: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function resolveLocalFilePath(
  key: string
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const normalizedKey = key.replace(/^\/+/, '');
  const backend = getStorageBackend();

  if (backend === 'local') {
    return {
      path: localAbsolutePath(normalizedKey),
      cleanup: async () => {},
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gradion-upload-'));
  const tempPath = path.join(tempDir, path.basename(normalizedKey));

  if (backend === 'r2') {
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: config.storage.r2BucketName!,
        Key: normalizedKey,
      })
    );
    if (!response.Body) {
      throw new Error('R2 object body is empty');
    }
    const buffer = await streamToBuffer(response.Body as Readable);
    await fs.writeFile(tempPath, buffer);
  } else {
    const { data, error } = await getSupabaseClient()
      .storage.from(config.storage.supabaseStorageBucket)
      .download(normalizedKey);
    if (error || !data) {
      throw new Error(`Failed to download from Supabase Storage: ${error?.message || 'empty response'}`);
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    await fs.writeFile(tempPath, buffer);
  }

  return {
    path: tempPath,
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

export async function ensureLocalUploadDirs(): Promise<void> {
  await fs.mkdir(path.join(LOCAL_UPLOAD_ROOT, 'banners'), { recursive: true });
  await fs.mkdir(path.join(LOCAL_UPLOAD_ROOT, 'cms'), { recursive: true });
  await fs.mkdir(path.join(LOCAL_UPLOAD_ROOT, 'videos'), { recursive: true });
}
