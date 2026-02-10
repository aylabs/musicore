// Feature 011: Offline Detection Hook
// Detects online/offline status using navigator.onLine

import { useState, useEffect } from 'react';

/**
 * Hook for detecting online/offline status
 * 
 * @returns isOnline - true if browser is online, false if offline
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useOfflineDetection();
 *   return <div>{isOnline ? 'Online' : 'Offline'}</div>;
 * }
 * ```
 */
export function useOfflineDetection(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Handler for online event
    const handleOnline = () => {
      console.log('[Offline Detection] Connection restored');
      setIsOnline(true);
    };

    // Handler for offline event
    const handleOffline = () => {
      console.log('[Offline Detection] Connection lost');
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
