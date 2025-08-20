import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: Number(process.env.PORT) || 3001,
  hostname: process.env.HOSTNAME || '0.0.0.0',
  
  // Database configuration
  database: {
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || 'printing_db',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
  },
  
  // File paths
  baseFilesPath: process.env.BASE_FILES_PATH || `/Volumes/Archives/Next-Label/database`,
  prepressOutPath: process.env.PREPRESS_OUT_PATH || `/Volumes/Archives/Next-Label/prepress_out`,
  
  // CORS configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  
  // Security
  maxFileSize: Number(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
  allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
  ],
  
  // Thumbnail generation
  defaultThumbnailSize: Number(process.env.DEFAULT_THUMBNAIL_SIZE) || 1024,
  maxThumbnailSize: Number(process.env.MAX_THUMBNAIL_SIZE) || 8192,
  minThumbnailSize: Number(process.env.MIN_THUMBNAIL_SIZE) || 64,
} as const;

export default config;
