import { serve } from "bun";
import { readFileSync, statSync, existsSync } from "fs";
import { join, extname } from "path";

// Serve static files and handle React routing
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    console.log(`📥 Request: ${path}`);

    // Handle API routes (proxy to backend)
    if (path.startsWith('/api/')) {
      console.log(`🔄 Proxying API request to backend: ${path}`);
      const apiUrl = `http://localhost:3001${path}${url.search}`;
      console.log(`🔗 Full backend URL: ${apiUrl}`);
      const apiResponse = await fetch(apiUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? await request.text() : undefined,
      });
      
      return new Response(apiResponse.body, {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: apiResponse.headers,
      });
    }

    // Serve static files from dist directory
    let filePath = join(import.meta.dir, '..', 'dist', path === '/' ? 'index.html' : path);
    
    console.log(`📁 Looking for file: ${filePath}`);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      
      // For client-side routing, serve index.html for any non-file requests
      if (!extname(path) || path === '/') {
        console.log(`🔄 Serving index.html for client-side routing`);
        filePath = join(import.meta.dir, '..', 'dist', 'index.html');
      } else {
        console.log(`❌ File not found and not a route: ${path}`);
        return new Response('File not found', { status: 404 });
      }
    }

    console.log(`✅ Serving file: ${filePath}`);
    const fileContent = readFileSync(filePath);
    const ext = extname(filePath);
    
    // Set appropriate content type
    let contentType = 'text/plain';
    if (ext === '.html') contentType = 'text/html';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    
    return new Response(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('❌ Error serving request:', error);
    return new Response(`Internal Server Error: ${(error as Error).message}`, { status: 500 });
  }
}

const server = serve({
  port: 3000,
  hostname: '0.0.0.0',
  fetch: handleRequest,
});

console.log(`🚀 Frontend server running at ${server.url}`);
console.log(`🌐 Access via IP: http://[YOUR_IP_ADDRESS]:3000`);
console.log(`📱 React app will be served from dist/index.html`);
