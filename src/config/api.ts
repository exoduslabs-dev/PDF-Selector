// API Configuration
// Use relative URLs to go through the frontend proxy server

export const API_BASE_URL = '';

// Helper function to make API calls
export async function apiCall(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`API Call: ${url}`);
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

console.log(`API configured to use relative URLs (proxied through frontend server)`);
