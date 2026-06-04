import { auth } from './firebase';

/**
 * Bhagyoday Cloud ERP - Versioned API Client
 * Automatically handles authentication, version prefixes, and 401 redirection.
 */

const API_VERSION = 'v1';

interface RequestOptions extends RequestInit {
  responseType?: 'json' | 'blob';
}

export const apiClient = {
  async request(endpoint: string, options: RequestOptions = {}) {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `/api/${API_VERSION}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // 1. Get current user's JWT token
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    // 2. Prepare headers
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // 3. Perform Fetch
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 4. Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('API Client: Unauthorized access detected. Signing out...');
      await auth.signOut();
      throw new Error('Session expired or unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Request failed with status ${response.status}`);
    }

    // 5. Handle response type
    if (options.responseType === 'blob') {
      return response.blob();
    }
    return response.json();
  },

  get(endpoint: string, options?: RequestOptions) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
  },

  put(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
  },

  delete(endpoint: string, options?: RequestOptions) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
};
