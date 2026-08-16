import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // 1. Initial status lookup
    const checkStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
      } catch (e) {
        setIsOnline(navigator.onLine);
      }
    };
    checkStatus();

    // 2. Event listeners — Capacitor or web fallback
    let listenerHandle: { remove: () => void } | null = null;

    const setupListener = async () => {
      try {
        // Capacitor Network.addListener returns a handle object directly (not a Promise)
        listenerHandle = await Network.addListener('networkStatusChange', status => {
          setIsOnline(status.connected);
        });
      } catch (e) {
        // Fallback to standard web events when Capacitor is not available
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Return cleanup for web listeners
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
      return undefined;
    };

    let webCleanup: (() => void) | undefined;
    setupListener().then(cleanup => {
      webCleanup = cleanup;
    });

    return () => {
      // Remove Capacitor listener — it's synchronous, NOT a Promise
      try {
        if (listenerHandle) {
          listenerHandle.remove();
        }
      } catch (e) {
        // Ignore cleanup errors in web context
      }
      // Remove web listeners if they were set up
      if (webCleanup) {
        webCleanup();
      }
    };
  }, []);

  return isOnline;
}
