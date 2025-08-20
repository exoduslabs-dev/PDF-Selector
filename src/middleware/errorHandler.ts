import { getCorsHeaders } from '../config/cors.js';
import type { ApiError } from '../types/common.js';
import { ValidationError, DatabaseError, NotFoundError } from '../types/common.js';

// Standard error response interface
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// Create standardized error response
export const createErrorResponse = (
  error: Error | ApiError,
  status?: number,
  origin?: string
): Response => {
  let statusCode = status || 500;
  let errorMessage = error.message;
  let errorCode: string | undefined;
  let details: any;

  // Handle specific error types
  if (error instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    details = {
      field: error.field,
      value: error.value,
    };
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (error instanceof DatabaseError) {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    errorMessage = 'An internal database error occurred';
    // Log the original error for debugging
    console.error('Database error:', error.originalError);
  } else if ('status' in error) {
    statusCode = error.status;
    errorCode = error.code;
    details = error.details;
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString(),
  };

  if (errorCode) {
    errorResponse.code = errorCode;
  }

  if (details) {
    errorResponse.details = details;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(origin),
  };

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers,
  });
};

// Success response helper
export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  status: number = 200,
  origin?: string
): Response => {
  const response = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  const headers = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(origin),
  };

  return new Response(JSON.stringify(response), {
    status,
    headers,
  });
};

// Async error handler wrapper for route handlers
export const asyncHandler = (
  handler: (req: Request, url: URL) => Promise<Response>
) => {
  return async (req: Request, url: URL): Promise<Response> => {
    try {
      return await handler(req, url);
    } catch (error) {
      console.error('Unhandled error in route handler:', error);
      const origin = req.headers.get('origin') || undefined;
      return createErrorResponse(error as Error, undefined, origin);
    }
  };
};

// Log error for monitoring/debugging
export const logError = (error: Error, context?: any): void => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error:`, {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
  });
};

// Custom error classes for common scenarios
export class BadRequestError extends Error {
  constructor(message: string = 'Bad Request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends Error {
  constructor(message: string = 'Internal Server Error') {
    super(message);
    this.name = 'InternalServerError';
  }
}
