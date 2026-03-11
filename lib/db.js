import { drizzle } from 'drizzle-orm/d1';
import { getRequestContext } from '@cloudflare/next-on-pages';
import * as schema from '@/db/schema'; // Automatically includes the schema we just built

/**
 * Helper to securely access Cloudflare bindings (D1, R2, KV).
 * This will only work in an Edge runtime environment.
 */
function getEnv() {
  try {
    const { env } = getRequestContext();
    return env;
  } catch (error) {
    console.error('❌ Failed to get Cloudflare context. Ensure you are running in the Edge runtime:', error.message);
    throw new Error('Environment bindings not available. Make sure this function has: export const runtime = "edge";');
  }
}

/**
 * 🗄️ Get the Drizzle DB instance connected to Cloudflare D1.
 */
export function getDb() {
  const env = getEnv();
  
  if (!env.DB) {
    throw new Error('❌ D1 database binding "DB" is missing from the environment.');
  }
  
  // Return the Drizzle instance with schema for typed queries
  return drizzle(env.DB, { schema });
}

/**
 * 🪣 Helper to get the Cloudflare R2 Bucket.
 */
export function getR2Bucket() {
  const env = getEnv();
  
  if (!env.R2_BUCKET) {
    throw new Error('❌ R2 bucket binding "R2_BUCKET" is missing from the environment.');
  }
  
  return env.R2_BUCKET;
}

/**
 * ⚡ Helper to get the Cloudflare KV Cache namespace.
 */
export function getKVCache() {
  const env = getEnv();
  
  if (!env.KV_CACHE) {
    throw new Error('❌ KV namespace binding "KV_CACHE" is missing from the environment.');
  }
  
  return env.KV_CACHE;
}