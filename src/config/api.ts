// API Configuration
// Automatically detects if we're accessing via IP address and adjusts API base URL accordingly

function getApiBaseUrl(): string {
  // Check if we're accessing the app via an IP address
  const currentHost = window.location.hostname;
  
  // If accessing via IP address, use the same IP for API calls
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return `http://${currentHost}:3001`;
  }
  
  // Default to localhost for local development
  return 'http://localhost:3001';
}

export const API_BASE_URL = getApiBaseUrl();

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

console.log(`API configured to use: ${API_BASE_URL}`);
