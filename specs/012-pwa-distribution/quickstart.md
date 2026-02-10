# Quickstart: PWA Distribution Implementation

**Feature**: 012-pwa-distribution  
**Date**: 2026-02-10  
**Audience**: Developers implementing PWA features

## Overview

This guide walks you through implementing Progressive Web App (PWA) distribution for Musicore. You'll add a web app manifest, configure a service worker with caching strategies, implement offline functionality, and test on physical tablets.

**Estimated Time**: 4-6 hours  
**Prerequisites**: React 19.2, Vite 7.3, TypeScript 5.9, HTTPS deployment

---

## Phase 1: Setup Dependencies (15 minutes)

### Install Workbox and Vite PWA Plugin

```bash
# Navigate to frontend directory
cd frontend/

# Install Workbox libraries
npm install workbox-precaching workbox-routing workbox-strategies workbox-expiration workbox-window

# Install Vite PWA plugin (dev dependency)
npm install -D vite-plugin-pwa

# Verify installation
npm list workbox-window vite-plugin-pwa
```

**Versions**:
- `workbox-*`: 7.0.0 or later
- `vite-plugin-pwa`: 0.20.0 or later

---

## Phase 2: Configure Vite PWA Plugin (30 minutes)

### Update vite.config.ts

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',  // User controls when to update
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Musicore - Intelligent Music Stand',
        short_name: 'Musicore',
        description: 'Tablet-native intelligent music stand for practice',
        theme_color: '#6366f1',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['music', 'education', 'productivity'],
      },
      workbox: {
        // Precache all static assets
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico}'],
        
        // Runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.musicore\.com\/scores\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'musicore-scores-v1',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'musicore-images-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'musicore-fonts-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
        ],
        
        // Clean up old caches
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,  // Disable in dev mode (use Vite HMR instead)
      },
    }),
  ],
  server: {
    https: true,  // Required for service workers
  },
});
```

**Configuration Explained**:
- `registerType: 'prompt'`: User controls when to update (shows UpdatePrompt component)
- `globPatterns`: Assets to precache (includes WASM module)
- `runtimeCaching`: Network-first for scores, SWR for images, cache-first for fonts
- `cleanupOutdatedCaches: true`: Auto-delete old cache versions on activation

---

## Phase 3: Add iOS PWA Meta Tags (15 minutes)

### Update index.html

```html
<!-- frontend/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Musicore - Intelligent Music Stand</title>
    
    <!-- Standard PWA meta tags -->
    <meta name="description" content="Tablet-native intelligent music stand for practice" />
    <meta name="theme-color" content="#6366f1" />
    <link rel="manifest" href="/manifest.webmanifest" />
    
    <!-- iOS-specific PWA meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Musicore" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**iOS Meta Tags Explained**:
- `apple-mobile-web-app-capable`: Enable standalone mode on iOS
- `apple-mobile-web-app-status-bar-style`: Status bar appearance (`black-translucent` for immersive)
- `apple-mobile-web-app-title`: App name under iOS home screen icon
- `apple-touch-icon`: iOS home screen icon (180x180 recommended)

---

## Phase 4: Create Icon Assets (30 minutes)

### Generate Icons

Use a tool like [PWA Asset Generator](https://www.npmjs.com/package/pwa-asset-generator):

```bash
# Install PWA Asset Generator globally
npm install -g pwa-asset-generator

# Generate icons from source image (1024x1024 recommended)
pwa-asset-generator logo.svg public/icons \
  --background "#1a1a1a" \
  --ios \
  --favicon

# This generates:
# - icon-192x192.png (Android)
# - icon-512x512.png (Android splash)
# - apple-touch-icon.png (iOS home screen, 180x180)
# - favicon-32x32.png
# - favicon-16x16.png
```

**Manual Icon Creation** (if no source SVG):
1. Create 1024x1024 source image (logo with padding)
2. Use [Squoosh](https://squoosh.app/) to resize:
   - 512x512 → `icon-512x512.png`
   - 192x192 → `icon-192x192.png`
   - 180x180 → `apple-touch-icon.png`
   - 32x32 → `favicon-32x32.png`
   - 16x16 → `favicon-16x16.png`
3. Place in `public/icons/` directory

**Icon Requirements**:
- Format: PNG with transparency
- Purpose: "any maskable" (supports Android adaptive icons)
- Background: Match app background color (#1a1a1a for dark theme)

---

## Phase 5: Implement Service Worker Registration (45 minutes)

### Create sw-registration.ts

```typescript
// frontend/src/sw-registration.ts
import { Workbox } from 'workbox-window';

export type ServiceWorkerStatus = 'checking' | 'available' | 'active' | 'error';

export interface ServiceWorkerCallbacks {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register service worker and set up update listeners
 */
export async function registerServiceWorker(
  callbacks: ServiceWorkerCallbacks = {}
): Promise<ServiceWorkerRegistration | undefined> {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const wb = new Workbox('/sw.js');

    // Service worker waiting (update available)
    wb.addEventListener('waiting', () => {
      console.log('Service worker update available');
      if (callbacks.onUpdate) {
        navigator.serviceWorker.ready.then(callbacks.onUpdate);
      }
    });

    // Service worker controlling page (activated)
    wb.addEventListener('controlling', () => {
      console.log('Service worker activated, reloading page');
      window.location.reload();
    });

    // Service worker activated (first install or update)
    wb.addEventListener('activated', (event) => {
      console.log('Service worker activated:', event.isUpdate ? 'update' : 'first install');
    });

    try {
      const registration = await wb.register();
      console.log('Service worker registered:', registration);
      
      if (callbacks.onSuccess) {
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
 */
export function skipWaiting(registration: ServiceWorkerRegistration): void {
  const waitingWorker = registration.waiting;
  
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Check for service worker updates manually
 */
export async function checkForUpdates(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.update();
}
```

### Register in main.tsx

```typescript
// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './sw-registration';

// Register service worker
registerServiceWorker({
  onUpdate: (registration) => {
    console.log('Update available, show prompt');
    // Trigger UpdatePrompt component (implemented in Phase 6)
    window.dispatchEvent(new CustomEvent('sw-update', { detail: registration }));
  },
  onSuccess: (registration) => {
    console.log('Service worker registered successfully');
    
    // Check for updates periodically (every 30 minutes)
    setInterval(() => {
      registration.update();
    }, 30 * 60 * 1000);
  },
  onError: (error) => {
    console.error('Service worker registration failed:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## Phase 6: Implement Update Prompt Component (1 hour)

### Create UpdatePrompt.tsx

```typescript
// frontend/src/components/UpdatePrompt.tsx
import React, { useEffect, useState } from 'react';
import { skipWaiting } from '../sw-registration';
import './UpdatePrompt.css';

export const UpdatePrompt: React.FC = () => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>;
      setRegistration(customEvent.detail);
      setShowPrompt(true);
    };

    window.addEventListener('sw-update', handleUpdate);

    return () => {
      window.removeEventListener('sw-update', handleUpdate);
    };
  }, []);

  const handleUpdate = () => {
    if (registration) {
      skipWaiting(registration);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="update-prompt">
      <div className="update-prompt__content">
        <p className="update-prompt__message">
          New version available. Update now to get the latest features and improvements.
        </p>
        <div className="update-prompt__actions">
          <button className="update-prompt__button update-prompt__button--primary" onClick={handleUpdate}>
            Update Now
          </button>
          <button className="update-prompt__button update-prompt__button--secondary" onClick={handleDismiss}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Create UpdatePrompt.css

```css
/* frontend/src/components/UpdatePrompt.css */
.update-prompt {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  max-width: 500px;
  width: calc(100% - 40px);
}

.update-prompt__content {
  background-color: #1a1a1a;
  border: 1px solid #6366f1;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.update-prompt__message {
  margin: 0 0 12px 0;
  color: #ffffff;
  font-size: 14px;
  line-height: 1.5;
}

.update-prompt__actions {
  display: flex;
  gap: 8px;
}

.update-prompt__button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.update-prompt__button--primary {
  background-color: #6366f1;
  color: #ffffff;
}

.update-prompt__button--primary:hover {
  background-color: #4f46e5;
}

.update-prompt__button--secondary {
  background-color: #374151;
  color: #ffffff;
}

.update-prompt__button--secondary:hover {
  background-color: #4b5563;
}
```

### Add to App.tsx

```typescript
// frontend/src/App.tsx
import { UpdatePrompt } from './components/UpdatePrompt';

function App() {
  return (
    <>
      {/* Existing app content */}
      <UpdatePrompt />
    </>
  );
}

export default App;
```

---

## Phase 7: Testing (2 hours)

### Unit Tests (Vitest)

```typescript
// frontend/src/__tests__/sw-registration.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerServiceWorker, skipWaiting } from '../sw-registration';

describe('Service Worker Registration', () => {
  it('should register service worker in production', async () => {
    const mockRegister = vi.fn(() => Promise.resolve({ scope: '/' }));
    const mockWorkbox = { register: mockRegister, addEventListener: vi.fn() };
    
    vi.mock('workbox-window', () => ({
      Workbox: vi.fn(() => mockWorkbox),
    }));
    
    await registerServiceWorker();
    expect(mockRegister).toHaveBeenCalled();
  });
  
  it('should call onUpdate callback when update available', async () => {
    const onUpdate = vi.fn();
    const mockWorkbox = {
      register: vi.fn(() => Promise.resolve({ scope: '/' })),
      addEventListener: vi.fn((event, callback) => {
        if (event === 'waiting') {
          callback();
        }
      }),
    };
    
    await registerServiceWorker({ onUpdate });
    expect(onUpdate).toHaveBeenCalled();
  });
});
```

### Manual Testing on Physical Tablets

**iPad (iOS Safari)**:
1. Deploy to HTTPS staging environment
2. Open Safari on iPad, navigate to https://staging.musicore.com
3. Tap Share button → "Add to Home Screen"
4. Verify app installed on home screen with correct icon
5. Launch app from home screen
6. Verify standalone mode (no Safari UI)
7. Enable Airplane Mode
8. Verify app loads from cache (no network)
9. Add annotation (queued for sync)
10. Disable Airplane Mode
11. Verify annotation synced when online

**Android Tablet (Chrome)**:
1. Deploy to HTTPS staging environment
2. Open Chrome on Android tablet, navigate to https://staging.musicore.com
3. Tap install banner: "Add Musicore to Home screen"
4. Verify app installed on home screen
5. Launch app from home screen
6. Verify standalone mode (no Chrome UI)
7. Enable Airplane Mode
8. Verify app loads from cache
9. Test offline annotations (same as iPad)

**Surface (Edge)**:
1. Deploy to HTTPS staging environment
2. Open Edge on Surface, navigate to https://staging.musicore.com
3. Click install button in address bar
4. Verify app installed as desktop PWA
5. Launch app from Start menu
6. Verify standalone window
7. Test offline functionality

### Lighthouse PWA Audit

```bash
# Install Lighthouse CLI
npm install -g @lh ci/cli

# Run PWA audit
lighthouse https://staging.musicore.com \
  --only-categories=pwa \
  --output=json \
  --output-path=./lighthouse-report.json

# Check score (should be ≥90)
cat lighthouse-report.json | jq '.categories.pwa.score'
```

**Lighthouse Checklist**:
- ✅ Installable (manifest with required fields)
- ✅ Service worker registered
- ✅ HTTPS
- ✅ Responsive design
- ✅ Splash screen
- ✅ Theme color
- ✅ App works offline

---

## Phase 8: iOS Install Instructions Modal (1 hour)

### Create IOSInstallModal.tsx

```typescript
// frontend/src/components/IOSInstallModal.tsx
import React, { useEffect, useState } from 'react';
import './IOSInstallModal.css';

export const IOSInstallModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Detect standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Show modal if iOS and not installed
    if (isIOS && !isStandalone) {
      const dismissed = localStorage.getItem('ios-install-dismissed');
      if (!dismissed) {
        setShowModal(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('ios-install-dismissed', 'true');
    setShowModal(false);
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="ios-install-modal">
      <div className="ios-install-modal__backdrop" onClick={handleDismiss} />
      <div className="ios-install-modal__content">
        <h2 className="ios-install-modal__title">Install Musicore</h2>
        <p className="ios-install-modal__description">
          Install this app on your iPad for the best experience:
        </p>
        <ol className="ios-install-modal__steps">
          <li>Tap the Share button <span className="ios-install-modal__icon">⎋</span> at the top</li>
          <li>Scroll down and tap "Add to Home Screen"</li>
          <li>Tap "Add" to confirm</li>
        </ol>
        <button className="ios-install-modal__button" onClick={handleDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
};
```

### Add to App.tsx

```typescript
// frontend/src/App.tsx
import { UpdatePrompt } from './components/UpdatePrompt';
import { IOSInstallModal } from './components/IOSInstallModal';

function App() {
  return (
    <>
      {/* Existing app content */}
      <UpdatePrompt />
      <IOSInstallModal />
    </>
  );
}

export default App;
```

---

## Common Pitfalls

### Issue 1: Service Worker Not Updating

**Symptom**: New version deployed but users see old version.

**Cause**: Service worker caching old app shell.

**Solution**:
1. Increment version in `vite.config.ts` (cache names auto-versioned by build hash)
2. Ensure `cleanupOutdatedCaches: true` in Workbox config
3. Test with "Update on reload" in Chrome DevTools → Application → Service Workers

### Issue 2: HTTPS Required Error

**Symptom**: Service worker registration fails with security error.

**Cause**: Service workers require HTTPS (except localhost).

**Solution**:
1. Development: Use Vite's `server.https: true` option
2. Production: Deploy to HTTPS domain (Vercel, Netlify, AWS CloudFront)
3. Testing: Use `ngrok` for HTTPS tunnel to localhost

### Issue 3: iOS Status Bar Overlaps Content

**Symptom**: iOS status bar overlaps app content in standalone mode.

**Cause**: iOS doesn't apply safe area insets by default.

**Solution**:
```css
/* Add to global CSS */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Issue 4: Cache Quota Exceeded

**Symptom**: Service worker stops caching, errors in console.

**Cause**: Browser storage limit reached.

**Solution**:
1. Ensure `purgeOnQuotaError: true` in Workbox expiration plugin
2. Reduce `maxEntries` for score cache (default: 50)
3. Check cache size with `navigator.storage.estimate()`

---

## Next Steps

After completing this quickstart:
1. ✅ PWA installed on tablets (iOS, Android, Surface)
2. ✅ Offline functionality working (app shell, scores, annotations)
3. ✅ Update flow working (user-controlled prompt)
4. ✅ Lighthouse PWA score ≥90

**Future Enhancements**:
- Push notifications for practice reminders
- Periodic background sync for automatic score library updates
- Advanced conflict resolution UI for offline annotation sync
- App shortcuts for quick actions (long-press home screen icon)

---

## Resources

- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)
- [Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [iOS PWA Quirks](https://firt.dev/ios-15/)
- [Lighthouse PWA Audit](https://web.dev/lighthouse-pwa/)

---

## Support

**Questions?** Check [specs/012-pwa-distribution/spec.md](./spec.md) for requirements or [contracts/service-worker-api.md](./contracts/service-worker-api.md) for API details.

**Issues?** Create a GitHub issue with label `feature/012-pwa-distribution`.
