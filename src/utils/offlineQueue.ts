import { Network } from '@capacitor/network';
import { apiFetch } from './api';

export interface QueuedRequest {
  id: string;
  action: string;
  options: any;
  timestamp: number;
}

class OfflineQueueManager {
  private queue: QueuedRequest[] = [];
  private isOnline = true;
  private onStatusChangeCallbacks: ((online: boolean) => void)[] = [];
  private onQueueChangeCallbacks: ((queue: QueuedRequest[]) => void)[] = [];

  constructor() {
    this.loadQueue();
    this.initNetworkListener();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem('akv_offline_queue');
      this.queue = stored ? JSON.parse(stored) : [];
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    localStorage.setItem('akv_offline_queue', JSON.stringify(this.queue));
    this.notifyQueueChange();
  }

  private async initNetworkListener() {
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    Network.addListener('networkStatusChange', status => {
      const prevOnline = this.isOnline;
      this.isOnline = status.connected;
      this.notifyStatusChange();
      
      if (this.isOnline && !prevOnline) {
        this.processQueue();
      }
    });
  }

  public getQueue(): QueuedRequest[] {
    return this.queue;
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public subscribeStatusChange(callback: (online: boolean) => void) {
    this.onStatusChangeCallbacks.push(callback);
    callback(this.isOnline);
  }

  public subscribeQueueChange(callback: (queue: QueuedRequest[]) => void) {
    this.onQueueChangeCallbacks.push(callback);
    callback(this.queue);
  }

  private notifyStatusChange() {
    this.onStatusChangeCallbacks.forEach(cb => cb(this.isOnline));
  }

  private notifyQueueChange() {
    this.onQueueChangeCallbacks.forEach(cb => cb(this.queue));
  }

  /**
   * Queue a request to be sent later when online.
   */
  public enqueue(action: string, options: any) {
    const newReq: QueuedRequest = {
      id: Math.random().toString(36).substring(2, 11),
      action,
      options,
      timestamp: Date.now()
    };
    this.queue.push(newReq);
    this.saveQueue();
    
    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Process and retry all queued requests sequentially.
   */
  public async processQueue() {
    if (!this.isOnline || this.queue.length === 0) return;

    const reqsToProcess = [...this.queue];
    for (const req of reqsToProcess) {
      try {
        const res = await apiFetch(req.action, req.options, 1, 0); // try once, no retries/delay
        if (res.ok && res.success !== false) {
          // Success, remove from queue
          this.queue = this.queue.filter(q => q.id !== req.id);
          this.saveQueue();
        }
      } catch (err) {
        console.warn('[OfflineQueue] Retrying request failed:', err);
        break; // retry again on next connectivity change
      }
    }
  }

  /**
   * Caches data locally for offline reads.
   */
  public cacheData(key: string, data: any) {
    try {
      localStorage.setItem(`akv_cache_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('[OfflineQueue] Cache saving failed:', e);
    }
  }

  /**
   * Reads cached data locally when offline.
   */
  public getCachedData<T = any>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`akv_cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }
}

export const offlineQueueManager = new OfflineQueueManager();
