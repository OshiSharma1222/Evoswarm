import dotenv from 'dotenv';
import { Pool, QueryResult } from 'pg';

dotenv.config();

// Use Supabase client as primary, fallback to PostgreSQL pool
const USE_SUPABASE_CLIENT = true;

// Supabase PostgreSQL connection pool (backup)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Query helper - uses Supabase client for better reliability
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  try {
    // Use pool for raw SQL queries
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log('Slow query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Transaction helper
export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Initialize database
export async function initDatabase(): Promise<void> {
  try {
    console.log('Database schema should be created manually in Supabase SQL Editor');
    console.log('Run the schema.sql file in your Supabase dashboard');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Close pool
export async function closePool(): Promise<void> {
  await pool.end();
}
