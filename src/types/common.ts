// Common API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common database fields
export interface BaseEntity {
  created_at?: string;
  updated_at?: string;
}

// File handling types
export interface FileInfo {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
}

export interface ThumbnailOptions {
  size?: number;
  quality?: number;
  format?: 'png' | 'jpg' | 'webp';
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with ID ${id}` : ''} not found`);
    this.name = 'NotFoundError';
  }
}

// Request/Response helpers
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export interface RouteHandler {
  (req: Request, url: URL): Promise<Response | null>;
}
