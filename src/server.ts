import { serve } from 'bun';
import { router } from './routes/index.js';
import { handleCorsPreFlight, getCorsHeaders } from './config/cors.js';
import { createErrorResponse } from './middleware/errorHandler.js';
import config from './config/environment.js';

// Import database to initialize connection pool
import './config/database.js';

console.log(`Starting API server on ${config.hostname}:${config.port}`);

serve({
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('origin') || undefined;

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return handleCorsPreFlight(req);
    }

    try {
      // Route to appropriate handlers
      const response = await router(req, url);
      
      if (response) {
        return response;
      }

      // No route matched - return 404
      const headers = getCorsHeaders(origin);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Not Found',
          message: `Route ${req.method} ${url.pathname} not found`,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );
    } catch (error) {
      console.error('Unhandled error in server:', error);
      return createErrorResponse(error as Error, 500, origin);
    }
  },
  port: config.port,
  hostname: config.hostname,
});

console.log(`API server running on http://${config.hostname}:${config.port}`);
console.log(`Access via IP: http://[YOUR_IP_ADDRESS]:${config.port}`);

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});
