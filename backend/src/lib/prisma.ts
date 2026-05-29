import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure Prisma Client with SSL support for Supabase
const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
};

// For Prisma 7, use adapter for database connection
if (process.env.DATABASE_URL) {
  let connectionString = process.env.DATABASE_URL;
  
  // Configure SSL - Supabase uses self-signed certificates that need special handling
  // Check for Supabase in connection string (case-insensitive)
  const connectionLower = connectionString.toLowerCase();
  const isSupabase = connectionLower.includes('supabase.co') || 
                     connectionLower.includes('supabase') ||
                     connectionLower.includes('pooler.supabase.com');
  
  // Also check if sslmode=require is in the connection string
  const requiresSSL = connectionString.includes('sslmode=require') || 
                      connectionString.includes('sslmode=prefer') ||
                      process.env.DB_SSL_REQUIRED === 'true';
  
  // Remove sslmode from connection string - we'll handle SSL via Pool config
  // This prevents conflicts between connection string SSL settings and Pool SSL config
  connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '');
  // Clean up any trailing ? or & after removing sslmode
  connectionString = connectionString.replace(/\?$/, '').replace(/&$/, '');
  
  // Create pool with SSL configuration for Supabase
  // For Supabase, we MUST use rejectUnauthorized: false to accept self-signed certificates
  const poolConfig: any = {
    connectionString,
  };
  
  // Always apply SSL config for Supabase or when SSL is required
  if (isSupabase || requiresSSL) {
    // Supabase and other cloud databases use self-signed certificates
    // We must set rejectUnauthorized: false to accept them
    poolConfig.ssl = { 
      rejectUnauthorized: false 
    };
    console.log('[Prisma] ✅ SSL configured with rejectUnauthorized: false');
    console.log(`[Prisma] Connection: ${connectionString.replace(/:[^:@]+@/, ':****@')}`); // Hide password in logs
    console.log(`[Prisma] Is Supabase: ${isSupabase}, Requires SSL: ${requiresSSL}`);
    console.log(`[Prisma] Pool SSL config:`, JSON.stringify(poolConfig.ssl));
  } else {
    console.log('[Prisma] ⚠️  SSL not configured - connection may fail if SSL is required');
  }
  
  const pool = new Pool(poolConfig);
  
  // Handle pool errors for debugging
  pool.on('error', (err) => {
    console.error('[Prisma Pool] Unexpected error on idle client:', err);
  });
  
  // Test connection on startup (optional, for debugging)
  if (isSupabase || requiresSSL) {
    pool.connect()
      .then((client) => {
        console.log('[Prisma] ✅ Database connection test successful');
        client.release();
      })
      .catch((err) => {
        console.error('[Prisma] ❌ Database connection test failed:', err.message);
        console.error('[Prisma] Error details:', err);
      });
  }
  
  const adapter = new PrismaPg(pool);
  prismaClientOptions.adapter = adapter;
} else {
  console.error('[Prisma] ❌ DATABASE_URL is not set!');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

