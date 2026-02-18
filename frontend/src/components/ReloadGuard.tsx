import { useEffect } from 'react';
import { useOfflineDetection } from '../hooks/useOfflineDetection';

/**
 * ReloadGuard - Feature 025
 * 
 * Warns users before reloading when offline if service worker isn't ready.
 * Prevents broken state from reloading during SW installation or first offline visit.
 */
export function ReloadGuard() {
  const isOffline = useOfflineDetection();

  useEffect(() => {
    // Only warn if offline
    if (!isOffline) return;

    // Check if service worker is installed and controlling the page
    const isServiceWorkerReady = 
      'serviceWorker' in navigator && 
      navigator.serviceWorker &&
      navigator.serviceWorker.controller !== null;

    if (!isServiceWorkerReady) {
      // Service worker not installed - warn before reload
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = 'You are offline and the app has not been cached yet. Reloading will fail. Please go online first.';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isOffline]);

  // This component renders nothing - it's just a guard
  return null;
}
