import { APP_CONFIG } from '../config';

export interface ApiResponse<T = any> {
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
  success?: boolean;
  message?: string;
  isNetworkError?: boolean;
}

export interface ApiErrorResponse {
  ok: false;
  status: number;
  success: boolean;
  message: string;
  error: string;
  isNetworkError: boolean;
}

/**
 * Maps HTTP status codes to standard error titles and parses response content.
 */
export function handleApiError(response?: Response, responseText?: string, error?: any): ApiErrorResponse {
  const status = response ? response.status : 0;
  const isNetworkError = !response || (error && error.name === 'TypeError' && (error.message?.includes('fetch') || error.message?.includes('NetworkError')));
  
  let success = false;
  let message = isNetworkError
    ? `Unable to connect to the backend server. Please make sure the PHP server is running on ${APP_CONFIG.apiEndpoint} or check your connection.`
    : 'An unexpected connection error occurred.';
  
  if (responseText) {
    try {
      const parsed = JSON.parse(responseText);
      success = parsed.success ?? false;
      message = parsed.message || parsed.error || message;
    } catch {
      message = responseText.substring(0, 150) || `HTTP error status ${status}`;
    }
  } else if (error && !isNetworkError) {
    message = error.message || message;
  }
  
  let errorTitle = 'Connection Error';
  if (isNetworkError) errorTitle = 'Server Connection Failed';
  else if (status === 400) errorTitle = 'Validation Error';
  else if (status === 401) errorTitle = 'Unauthorized';
  else if (status === 403) errorTitle = 'Forbidden';
  else if (status === 404) errorTitle = 'Not Found';
  else if (status === 409) errorTitle = 'Conflict (Duplicate Email)';
  else if (status === 422) errorTitle = 'Invalid Data';
  else if (status >= 500) errorTitle = 'Server Error';

  const detailedError = isNetworkError
    ? `Connection Error: ${message}\nHTTP Status: Server Down or Unreachable (${APP_CONFIG.apiEndpoint})\nServer Response: None`
    : `${errorTitle}: ${message}\nHTTP Status: ${status}\nServer Response: "${responseText?.substring(0, 150)}"`;

  return {
    ok: false,
    status,
    success,
    message,
    error: detailedError,
    isNetworkError
  };
}

/**
 * Custom wrapper around fetch to interact with the AKVENERGY PHP API.
 * Handles CORS credentials, session tracking via custom header for Capacitor,
 * JSON serialization, and retry logic on network failure.
 */
export async function apiFetch<T = any>(
  action: string,
  options: RequestInit = {},
  retries = (action === 'login' || action === 'register' || action === 'session') ? 1 : 2,
  delay = 800
): Promise<ApiResponse<T>> {
  const url = `${APP_CONFIG.apiEndpoint}?action=${action}`;
  
  // Get stored session ID (important for Capacitor)
  const sessionId = localStorage.getItem('akv_session_id') || localStorage.getItem('akv_token');

  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (sessionId) {
    headers.set('Authorization', `Bearer ${sessionId}`);
    headers.set('X-Auth-Token', `Bearer ${sessionId}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // sends/receives cookies for web fallback
  };

  // Verbose Request Logging
  console.log(`[apiFetch] Request URL: ${url}`);
  console.log(`[apiFetch] HTTP Method: ${options.method ?? 'GET'}`);
  console.log(`[apiFetch] Request Headers:`, Object.fromEntries(headers.entries()));
  if (options.body) {
    console.log(`[apiFetch] Request Body:`, options.body);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    let response: Response | undefined;
    let responseText = '';
    try {
      response = await fetch(url, fetchOptions);
      responseText = await response.text();
      
      console.log(`[apiFetch] Response Status: ${response.status}`);
      console.log(`[apiFetch] Response Body: ${responseText}`);
      
      if (!response.ok) {
        // For client-side logic errors (status < 500), return structured error immediately without retries
        if (response.status < 500) {
          return handleApiError(response, responseText);
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`Invalid JSON returned from server: ${responseText.substring(0, 100)}`);
      }

      if (data.success === false) {
        return {
          ok: false,
          status: response.status,
          success: false,
          message: data.message || data.error || 'Request failed.',
          error: data.message || data.error || 'Request failed.',
          data
        };
      }

      return {
        ok: true,
        status: response.status,
        success: true,
        data: data
      };
    } catch (error: any) {
      console.error(`[apiFetch] Attempt ${attempt} failed for action "${action}":`, error.message ?? error);
      
      if (attempt === retries) {
        return handleApiError(response, responseText, error);
      }
      
      // Wait with exponential backoff before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  return {
    ok: false,
    status: 0,
    success: false,
    message: 'Unknown API fetch failure.',
    error: 'Unknown API fetch failure.',
    isNetworkError: true
  };
}
