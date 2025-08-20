import { Pool, type PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool configuration
export const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'printing_db',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  statement_timeout: 30000, // Terminate any statement that takes over 30 seconds
  query_timeout: 30000, // Terminate any query that takes over 30 seconds
});

// Helper function to get a client from the pool
export const getDbClient = async (): Promise<PoolClient> => {
  try {
    return await pool.connect();
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw new Error('Failed to connect to database');
  }
};

// Helper function to execute a query with automatic connection management
export const executeQuery = async <T = any>(
  query: string, 
  params: any[] = []
): Promise<T[]> => {
  const client = await getDbClient();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

// Helper function to execute a query and return a single row
export const executeQuerySingle = async <T = any>(
  query: string, 
  params: any[] = []
): Promise<T | null> => {
  const rows = await executeQuery<T>(query, params);
  return rows.length > 0 ? (rows[0] ?? null) : null;
};

// Graceful shutdown handler
export const closeDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
};

// Handle process termination
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);
process.on('exit', closeDatabase);
