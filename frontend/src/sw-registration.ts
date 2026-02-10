// Service Worker Registration Module
// Handles PWA service worker registration, lifecycle events, and update management

import { Workbox } from 'workbox-window';

export type ServiceWorkerStatus = 'checking' | 'available' | 'active' | 'error';

export interface ServiceWorkerCallbacks {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register service worker and set up update listeners
 * @param callbacks - Event callbacks for service worker lifecycle
 * @returns Promise<ServiceWorkerRegistration | undefined>
 */
export async function registerServiceWorker(
  callbacks: ServiceWorkerCallbacks = {}
): Promise<ServiceWorkerRegistration | undefined> {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const wb = new Workbox(`${import.meta.env.BASE_URL}sw.js`);

    // Service worker waiting (update available) - T019
    wb.addEventListener('waiting', () => {
      console.log('Service worker update available');
      if (callbacks.onUpdate) {
        navigator.serviceWorker.ready.then(callbacks.onUpdate);
      }
    });

    // Service worker controlling page (activated) - T019
    wb.addEventListener('controlling', () => {
      console.log('Service worker activated, reloading page');
      window.location.reload();
    });

    // Service worker activated (first install or update) - T019
    wb.addEventListener('activated', (event) => {
      console.log('Service worker activated:', event.isUpdate ? 'update' : 'first install');
    });

    try {
      const registration = await wb.register();
      console.log('Service worker registered:', registration);
      
      if (registration && callbacks.onSuccess) {
        callbacks.onSuccess(registration);
      }
      
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }
    }
  } else {
    console.log('Service worker not supported or running in dev mode');
  }
  
  return undefined;
}

/**
 * Trigger service worker skip waiting (apply update immediately)
 * Used by UpdatePrompt component to activate new service worker
 * @param registration - ServiceWorkerRegistration from onUpdate callback
 */
export function skipWaiting(registration: ServiceWorkerRegistration): void {
  const waitingWorker = registration.waiting;
  
  if (waitingWorker) {
    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    
    // Tell waiting SW to skip waiting
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Check for service worker updates manually
 * Called periodically or on visibility change
 */
export async function checkForUpdates(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  }
}
