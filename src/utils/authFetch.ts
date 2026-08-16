/**
 * AKV Energy — Authenticated fetch utility
 *
 * Replaces the old apiFetch(?action=) pattern.
 * Reads the Bearer token from localStorage on every call so it always
 * has the latest value without needing React context.
 *
 * Base URL resolves automatically:
 *   - Vite dev server (localhost:5173 / 127.0.0.1:*)  → MAMP at :8888
 *   - Capacitor WebView (capacitor://localhost)        → production
 *   - Production                                       → production
 */

import { APP_CONFIG } from '../config';

export const API_BASE = APP_CONFIG.apiEndpoint.replace('/api.php', '/api');

// ── Storage keys ─────────────────────────────────────────────────────────
export const TOKEN_KEY = 'akv_token';
export const USER_KEY  = 'akv_user';

// ── Token helpers (used by AuthContext too) ───────────────────────────────
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('akv_session_id');
}
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('akv_session_id', token);
}
export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('akv_session_id');
  localStorage.removeItem('akv_user');
}

// ── Core fetch wrapper ────────────────────────────────────────────────────

export interface FetchResult<T = unknown> {
  ok: boolean;
  data?: T;
  message?: string;
  status?: number;
}

/**
 * Make an authenticated request to the PHP REST API.
 *
 * @param path   Relative path under API_BASE, e.g. '/auth/login.php'
 * @param init   Standard RequestInit (method, body, headers …)
 * @returns      FetchResult<T> — never throws, always returns a typed result
 */
export async function authFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<FetchResult<T>> {
  const url = `${API_BASE}${path}`;

  const headers = new Headers(init.headers ?? {});

  // Attach Bearer token when present
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Auth-Token', `Bearer ${token}`);
  }

  // Set Content-Type for JSON bodies
  if (
    !headers.has('Content-Type') &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }

  // Verbose Request Logging
  console.log(`[authFetch] Request URL: ${url}`);
  console.log(`[authFetch] HTTP Method: ${init.method ?? 'GET'}`);
  console.log(`[authFetch] Request Headers:`, Object.fromEntries(headers.entries()));
  if (init.body) {
    console.log(`[authFetch] Request Body:`, init.body);
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    });

    const text = await response.text();
    console.log(`[authFetch] Response Status: ${response.status}`);
    console.log(`[authFetch] Response Body: ${text}`);

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        ok: false,
        message: 'Server returned an unexpected response.',
        status: response.status,
      };
    }

    // 401 → token expired / invalid — clear stored auth
    if (response.status === 401) {
      clearStoredAuth();
    }

    return {
      ok: json.success === true,
      data: json as T,
      message: json.message ?? (json.success ? 'OK' : 'Request failed.'),
      status: response.status,
    };
  } catch (err: any) {
    // Network error (offline, DNS failure, etc.)
    console.error(`[authFetch] Network Error on ${url}:`, err?.message ?? err);
    return {
      ok: false,
      message: err?.message ?? 'Network error. Please check your connection.',
    };
  }
}
