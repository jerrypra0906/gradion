import 'dotenv/config';
import { defineConfig } from '@prisma/config';

// Ensure SSL is enabled for Supabase connections
const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // If connecting to Supabase, ensure SSL is enabled
  if (url.includes('supabase.co')) {
    // Add SSL parameters if not already present
    if (!url.includes('sslmode=')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}sslmode=require`;
    }
  }
  
  return url;
};

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: getDatabaseUrl(),
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
