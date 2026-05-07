import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create the Neon HTTP client
const sql = neon(connectionString);

// Create the Drizzle instance with schema
export const db = drizzle(sql, { schema });

export type Database = typeof db;
