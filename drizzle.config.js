import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './db/schema.js',
  out: './drizzle/migrations', // Where the generated SQL files will live
  // We don't need dbCredentials here because Wrangler handles the actual database connection
});