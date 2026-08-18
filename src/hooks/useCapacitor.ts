import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { APP_CONFIG } from '../config';

interface CapacitorHooksProps {
  onBackPress?: () => boolean; // return true if handled, false to exit
}

export function useCapacitor({ onBackPress }: CapacitorHooksProps = {}) {

  // Handle Android back button
  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    const setupBackButton = async () => {
      try {
        listenerHandle = await App.addListener('backButton', ({ canGoBack }) => {
          if (onBackPress) {
            const handled = onBackPress();
            if (handled) return;
          }

          if (!canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        });
      } catch (e) {
        // Not running in a native Capacitor shell — silently ignore in browser
        console.log('Capacitor App listener not active (running in web browser).');
      }
    };

    setupBackButton();

    return () => {
      // listenerHandle.remove() is synchronous — do NOT call .then() on it
      try {
        if (listenerHandle) {
          listenerHandle.remove();
        }
      } catch (e) {
        // Ignore cleanup errors in web context
      }
    };
  }, [onBackPress]);

  // Trigger Native Sharing
  const shareApp = async () => {
    try {
      await Share.share({
        title: 'AKV Energy — Solar Solutions',
        text: 'Save up to 80% on your electricity bills with smart, premium solar installations from AKV Energy!',
        url: APP_CONFIG.appUrl,
        dialogTitle: 'Share AKV Energy App',
      });
    } catch (e) {
      if (navigator.share) {
        navigator.share({
          title: 'AKV Energy — Solar Solutions',
          text: 'Save on electricity with AKV Energy solar solutions!',
          url: APP_CONFIG.appUrl,
        }).catch(err => console.log('Share error:', err));
      } else {
        navigator.clipboard.writeText(`Check out AKV Energy: ${APP_CONFIG.appUrl}`).catch(() => {});
      }
    }
  };

  return { shareApp };
}
