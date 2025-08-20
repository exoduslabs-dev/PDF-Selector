import config from './environment.js';

// CORS headers configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': config.allowedOrigins.join(', '),
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Referer',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Last-Modified',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Referrer-Policy': 'no-referrer-when-downgrade',
};

// Function to check if origin is allowed
export const isOriginAllowed = (origin: string): boolean => {
  return config.allowedOrigins.includes(origin) || 
         config.allowedOrigins.includes('*') ||
         // Allow localhost variants for development
         (process.env.NODE_ENV !== 'production' && origin.includes('localhost'));
};

// Function to get CORS headers for a specific origin
export const getCorsHeaders = (origin?: string): Record<string, string> => {
  const headers = { ...corsHeaders };
  
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (config.allowedOrigins.length === 1) {
    headers['Access-Control-Allow-Origin'] = config.allowedOrigins[0] || '*';
  }
  
  return headers;
};

// CORS preflight handler
export const handleCorsPreFlight = (req: Request): Response => {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin || undefined);
  
  return new Response(null, {
    status: 200,
    headers,
  });
};
