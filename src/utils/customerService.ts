/**
 * AKV Energy — CustomerService
 *
 * Single source of truth for all customer CRUD.
 * • Online  → direct API calls
 * • Offline → operations are queued in localStorage and synced on reconnect
 */

import type { Customer, CustomerPayload, QueuedOp } from '../types/customer';
import { APP_CONFIG } from '../config';
import { apiFetch } from './api';

// ── API base URL — centralized from APP_CONFIG ────────────────────────────
export const CUSTOMER_API = `${APP_CONFIG.apiBase}/api/customers`;

// ── Offline queue helpers ────────────────────────────────────────────────
const QUEUE_KEY = 'akv_cust_queue';

function readQueue(): QueuedOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function writeQueue(q: QueuedOp[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
function enqueue(op: Omit<QueuedOp, 'uid' | 'queuedAt'>): void {
  const q = readQueue();
  q.push({ ...op, uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`, queuedAt: new Date().toISOString() });
  writeQueue(q);
}

/** How many operations are waiting to sync */
export function pendingCount(): number {
  return readQueue().length;
}

// ── Low-level fetch wrapper ──────────────────────────────────────────────
async function apiCall<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  const sid = localStorage.getItem('akv_session_id') || localStorage.getItem('akv_token');
  if (sid) {
    headers.set('Authorization', `Bearer ${sid}`);
    headers.set('X-Auth-Token', `Bearer ${sid}`);
  }

  const res = await fetch(url, { ...init, headers, credentials: 'include' });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error('Unexpected server response. Please try again.'); }
  if (!json.success) throw new Error(json.message ?? 'Operation failed. Please try again.');
  return json as T;
}

// ══════════════════════════════════════════════════════════════════════════
// Public service
// ══════════════════════════════════════════════════════════════════════════
export const CustomerService = {

  /** Create a new customer */
  async createCustomer(p: CustomerPayload): Promise<{ success: true; message: string; customer_id: number }> {
    try {
      return await apiCall(`${CUSTOMER_API}/create.php`, { method: 'POST', body: JSON.stringify(p) });
    } catch (err: any) {
      if (!navigator.onLine) {
        enqueue({ type: 'create', payload: p });
        return { success: true, message: 'Saved offline — will sync when reconnected.', customer_id: -1 };
      }
      throw err;
    }
  },

  /** Fetch paginated + searchable customer list */
  async getCustomers(search = '', limit = 100, offset = 0): Promise<{ data: Customer[]; total: number }> {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search.trim()) q.set('search', search.trim());
    try {
      const res = await apiCall<{ success: true; data: Customer[]; total: number }>(
        `${CUSTOMER_API}/list.php?${q}`
      );
      return { data: res.data || [], total: res.total || 0 };
    } catch (err: any) {
      try {
        const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
        const fallbackRes = await apiFetch(`get_customers&limit=${limit}&offset=${offset}${searchParam}`);
        if (fallbackRes.ok && fallbackRes.data && (fallbackRes.data.success !== false)) {
          const list = Array.isArray(fallbackRes.data.data) ? fallbackRes.data.data : (Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
          const total = fallbackRes.data.total ?? list.length;
          return { data: list, total };
        }
      } catch {
        // Ignore fallback error and throw original error
      }
      throw err;
    }
  },

  /** Fetch a single customer by id */
  async getCustomer(id: number): Promise<Customer> {
    const res = await apiCall<{ success: true; data: Customer }>(`${CUSTOMER_API}/details.php?id=${id}`);
    return res.data;
  },

  /** Update an existing customer — id is required in payload */
  async updateCustomer(p: CustomerPayload & { id: number }): Promise<{ success: true; message: string }> {
    try {
      return await apiCall(`${CUSTOMER_API}/update.php`, { method: 'PUT', body: JSON.stringify(p) });
    } catch (err: any) {
      if (!navigator.onLine) {
        enqueue({ type: 'update', payload: p });
        return { success: true, message: 'Saved offline — will sync when reconnected.' };
      }
      throw err;
    }
  },

  /** Delete a customer by id */
  async deleteCustomer(id: number): Promise<{ success: true; message: string }> {
    try {
      return await apiCall(`${CUSTOMER_API}/delete.php?id=${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (!navigator.onLine) {
        enqueue({ type: 'delete', payload: { id } });
        return { success: true, message: 'Queued for deletion — will sync when reconnected.' };
      }
      throw err;
    }
  },

  /**
   * Replay every queued operation in order.
   * Successful ops are removed; failed ones stay for the next attempt.
   * Call this whenever `useNetwork` reports isOnline = true.
   */
  async syncQueue(): Promise<void> {
    if (!navigator.onLine) return;
    const queue = readQueue();
    if (!queue.length) return;

    const remaining: QueuedOp[] = [];
    for (const op of queue) {
      try {
        if (op.type === 'create') {
          await apiCall(`${CUSTOMER_API}/create.php`, { method: 'POST', body: JSON.stringify(op.payload) });
        } else if (op.type === 'update') {
          await apiCall(`${CUSTOMER_API}/update.php`, { method: 'PUT', body: JSON.stringify(op.payload) });
        } else if (op.type === 'delete') {
          const { id } = op.payload as { id: number };
          await apiCall(`${CUSTOMER_API}/delete.php?id=${id}`, { method: 'DELETE' });
        }
      } catch {
        remaining.push(op);
      }
    }
    writeQueue(remaining);
  },
};
