import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Treat empty/whitespace env vars as unset (common in production .env files). */
const emptyToUndefined = (val: unknown) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_VERSION: z.string().default('v1'),

  // URLs
  FRONTEND_URL: z.string().url(),
  API_URL: z.string().url(),
  PUBLIC_API_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_SSL_REQUIRED: z.coerce.boolean().default(false),
  DB_PORT: z.coerce.number().optional(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  SESSION_SECRET: z.string().min(32),

  // AI — Gradion uses Google Gemini as primary (TD); OpenAI remains optional fallback
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GEMINI_VIDEO_MODEL: z.string().default('gemini-1.5-pro'),
  AI_VIDEO_MIN_TOKEN_CHARGE: z.coerce.number().default(3500),
  VIDEO_FIDELITY_MAX_FILE_MB: z.coerce.number().default(100),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(1000),
  ANTHROPIC_API_KEY: optionalString,
  // Use a known-stable Anthropic model id (avoid "-latest" which may not exist on all accounts)
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  AI_TOKEN_LIMIT_FREE_TRIAL: z.coerce.number().default(2000),
  AI_TOKEN_LIMIT_BASIC: z.coerce.number().default(10000),
  AI_TOKEN_LIMIT_PREMIUM: z.coerce.number().default(30000),
  AI_TOKEN_LIMIT_THERAPIST: z.coerce.number().default(50000),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(5),
  AI_RATE_LIMIT_PER_DAY: z.coerce.number().default(100),
  AI_MAX_PROMPT_LENGTH: z.coerce.number().default(1000),
  AI_MONTHLY_SPEND_LIMIT: z.coerce.number().default(100),

  // Email
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalEmail,
  RESEND_FROM_NAME: z.string().default('Gradion'),
  SUPPORT_EMAIL: optionalEmail,
  EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS: z.coerce.number().default(24),
  EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES: z.coerce.number().default(10),

  // Payment - Midtrans
  MIDTRANS_SERVER_KEY: optionalString,
  MIDTRANS_CLIENT_KEY: optionalString,
  MIDTRANS_IS_PRODUCTION: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const lowerVal = val.toLowerCase().trim();
        if (lowerVal === 'true' || lowerVal === '1') return true;
        if (lowerVal === 'false' || lowerVal === '0' || lowerVal === '') return false;
      }
      return val;
    },
    z.boolean().default(false)
  ),
  MIDTRANS_WEBHOOK_SECRET: optionalString,
  MIDTRANS_FEE_PERCENTAGE: z.coerce.number().min(0).max(100).default(2.5), // Default 2.5% to cover most payment methods

  // Storage
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET_NAME: optionalString,
  R2_PUBLIC_URL: optionalUrl,
  // Supabase Storage
  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_STORAGE_BUCKET: z.string().default('uploads'),

  // CORS
  CORS_ORIGIN: z.string(),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // Google OAuth
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().default(10),
  AUTH_LOGIN_WINDOW_MS: z.coerce.number().default(900000),

  // Registration Security
  REGISTRATION_MAX_ATTEMPTS_PER_IP: z.coerce.number().default(5),
  REGISTRATION_WINDOW_MINUTES: z.coerce.number().default(60),

  // Feature Flags
  ENABLE_AI_FEATURES: z.coerce.boolean().default(true),
  ENABLE_FILE_UPLOAD: z.coerce.boolean().default(false),
  ENABLE_ANALYTICS: z.coerce.boolean().default(true),
  ENABLE_CMS: z.coerce.boolean().default(true),
  ENABLE_VIDEO_FIDELITY: z.coerce.boolean().default(true),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const config = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  host: parsedEnv.data.HOST,
  apiVersion: parsedEnv.data.API_VERSION,
  frontendUrl: parsedEnv.data.FRONTEND_URL,
  apiUrl: parsedEnv.data.API_URL,
  publicApiUrl: parsedEnv.data.PUBLIC_API_URL,
  database: {
    url: parsedEnv.data.DATABASE_URL,
    poolMin: parsedEnv.data.DB_POOL_MIN,
    poolMax: parsedEnv.data.DB_POOL_MAX,
    sslRequired: parsedEnv.data.DB_SSL_REQUIRED,
    port: parsedEnv.data.DB_PORT,
  },
  auth: {
    jwtSecret: parsedEnv.data.JWT_SECRET,
    jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
    jwtRefreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
    jwtRefreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
    bcryptRounds: parsedEnv.data.BCRYPT_ROUNDS,
    sessionSecret: parsedEnv.data.SESSION_SECRET,
  },
  ai: {
    geminiApiKey: parsedEnv.data.GEMINI_API_KEY,
    geminiModel: parsedEnv.data.GEMINI_MODEL,
    geminiVideoModel: parsedEnv.data.GEMINI_VIDEO_MODEL,
    videoMinTokenCharge: parsedEnv.data.AI_VIDEO_MIN_TOKEN_CHARGE,
    videoMaxFileMb: parsedEnv.data.VIDEO_FIDELITY_MAX_FILE_MB,
    openaiApiKey: parsedEnv.data.OPENAI_API_KEY,
    openaiModel: parsedEnv.data.OPENAI_MODEL,
    openaiMaxTokens: parsedEnv.data.OPENAI_MAX_TOKENS,
    anthropicApiKey: parsedEnv.data.ANTHROPIC_API_KEY,
    anthropicModel: parsedEnv.data.ANTHROPIC_MODEL,
    tokenLimitFreeTrial: parsedEnv.data.AI_TOKEN_LIMIT_FREE_TRIAL,
    tokenLimitBasic: parsedEnv.data.AI_TOKEN_LIMIT_BASIC,
    tokenLimitPremium: parsedEnv.data.AI_TOKEN_LIMIT_PREMIUM,
    tokenLimitTherapist: parsedEnv.data.AI_TOKEN_LIMIT_THERAPIST,
    rateLimitPerMinute: parsedEnv.data.AI_RATE_LIMIT_PER_MINUTE,
    rateLimitPerDay: parsedEnv.data.AI_RATE_LIMIT_PER_DAY,
    maxPromptLength: parsedEnv.data.AI_MAX_PROMPT_LENGTH,
    monthlySpendLimit: parsedEnv.data.AI_MONTHLY_SPEND_LIMIT,
  },
  email: {
    resendApiKey: parsedEnv.data.RESEND_API_KEY,
    resendFromEmail: parsedEnv.data.RESEND_FROM_EMAIL,
    resendFromName: parsedEnv.data.RESEND_FROM_NAME,
    supportEmail: parsedEnv.data.SUPPORT_EMAIL,
    verificationExpiresHours: parsedEnv.data.EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS,
    resendCooldownMinutes: parsedEnv.data.EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES,
  },
  payment: {
    midtransServerKey: parsedEnv.data.MIDTRANS_SERVER_KEY,
    midtransClientKey: parsedEnv.data.MIDTRANS_CLIENT_KEY,
    midtransIsProduction: parsedEnv.data.MIDTRANS_IS_PRODUCTION,
    midtransWebhookSecret: parsedEnv.data.MIDTRANS_WEBHOOK_SECRET,
    midtransFeePercentage: parsedEnv.data.MIDTRANS_FEE_PERCENTAGE,
  },
  storage: {
    r2AccountId: parsedEnv.data.R2_ACCOUNT_ID,
    r2AccessKeyId: parsedEnv.data.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: parsedEnv.data.R2_SECRET_ACCESS_KEY,
    r2BucketName: parsedEnv.data.R2_BUCKET_NAME,
    r2PublicUrl: parsedEnv.data.R2_PUBLIC_URL,
    supabaseUrl: parsedEnv.data.SUPABASE_URL,
    supabaseServiceRoleKey: parsedEnv.data.SUPABASE_SERVICE_ROLE_KEY,
    supabaseStorageBucket: parsedEnv.data.SUPABASE_STORAGE_BUCKET,
  },
  corsOrigin: parsedEnv.data.CORS_ORIGIN,
  corsCredentials: parsedEnv.data.CORS_CREDENTIALS,
  rateLimitWindowMs: parsedEnv.data.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: parsedEnv.data.RATE_LIMIT_MAX_REQUESTS,
  google: {
    clientId: parsedEnv.data.GOOGLE_CLIENT_ID,
    clientSecret: parsedEnv.data.GOOGLE_CLIENT_SECRET,
  },
  security: {
    registrationMaxAttempts: parsedEnv.data.REGISTRATION_MAX_ATTEMPTS_PER_IP,
    registrationWindowMinutes: parsedEnv.data.REGISTRATION_WINDOW_MINUTES,
    loginMaxAttempts: parsedEnv.data.AUTH_LOGIN_MAX_ATTEMPTS,
    loginWindowMs: parsedEnv.data.AUTH_LOGIN_WINDOW_MS,
  },
  features: {
    ai: parsedEnv.data.ENABLE_AI_FEATURES,
    fileUpload: parsedEnv.data.ENABLE_FILE_UPLOAD,
    analytics: parsedEnv.data.ENABLE_ANALYTICS,
    cms: parsedEnv.data.ENABLE_CMS,
    videoFidelity: parsedEnv.data.ENABLE_VIDEO_FIDELITY,
  },
} as const;

