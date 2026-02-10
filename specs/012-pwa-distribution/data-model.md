# Data Model: PWA Distribution for Tablets

**Feature**: 012-pwa-distribution  
**Phase**: 1 - Design  
**Date**: 2026-02-10

## Overview

This document defines the data structures and state machines for PWA infrastructure. The PWA layer introduces new entities for web app installability, caching, and offline sync that complement the existing domain models (Score, Instrument, Note) without modifying them.

---

## Entity 1: Web App Manifest

**Purpose**: Metadata for PWA installability - defines app identity, appearance, and behavior when installed on home screen.

**File**: `public/manifest.json`

**Schema**:
```typescript
interface WebAppManifest {
  // === Identity ===
  name: string;                    // Full app name (displayed on install prompt)
  short_name: string;              // Short name (displayed under home screen icon, max 12 chars)
  description: string;             // Brief description for app stores/search
  
  // === Display Configuration ===
  start_url: string;               // URL to open when launched from home screen
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'any' | 'portrait' | 'landscape';
  scope: string;                   // URL scope for PWA (default: start_url parent directory)
  
  // === Visual Appearance ===
  theme_color: string;             // Browser UI color (hex format)
  background_color: string;        // Splash screen background color
  
  // === Icons ===
  icons: Array<{
    src: string;                   // Path to icon file
    sizes: string;                 // Icon size (e.g., "192x192", "512x512")
    type: string;                  // MIME type (e.g., "image/png")
    purpose?: 'any' | 'maskable' | 'monochrome';
  }>;
  
  // === Metadata (Optional) ===
  categories?: string[];           // App categories (e.g., ["music", "education"])
  screenshots?: Array<{            // Screenshots for install prompt (Android)
    src: string;
    sizes: string;
    type: string;
  }>;
  shortcuts?: Array<{              // Quick actions (long-press home screen icon)
    name: string;
    short_name?: string;
    url: string;
    description?: string;
    icons?: Array<{src: string; sizes: string}>;
  }>;
}
```

**Validation Rules**:
- `name`: Required, 1-45 characters
- `short_name`: Required, max 12 characters (for home screen)
- `icons`: Must include at least 192x192 and 512x512 PNG
- `start_url`: Must be within `scope`
- `theme_color`, `background_color`: Valid hex color (e.g., "#1a1a1a")
- `display: "standalone"`: Recommended for music stand UX (hides browser UI)

**Relationships**:
- Referenced by `<link rel="manifest" href="/manifest.json">` in index.html
- Icons referenced by relative paths from `public/` directory

**Lifecycle**:
- Static file generated at build time by vite-plugin-pwa
- Browser fetches manifest on first visit to determine installability
- Manifest changes trigger reinstall prompt (if app already installed)

---

## Entity 2: Service Worker Lifecycle State

**Purpose**: Manage service worker installation, activation, and update cycle. Service workers run in background thread and control caching/offline behavior.

**State Machine**:
```typescript
enum ServiceWorkerState {
  INSTALLING = 'installing',    // SW script downloading and executing
  INSTALLED = 'installed',      // SW installed but not activated (waiting for old SW to release clients)
  ACTIVATING = 'activating',    // Old SW released, new SW taking control
  ACTIVATED = 'activated',      // SW active and controlling pages
  REDUNDANT = 'redundant',      // SW replaced by newer version or install failed
}
```

**State Transitions**:
```
[No SW] 
  → INSTALLING (user visits site)
  → INSTALLED (install event complete)
  → ACTIVATING (no old SW exists, or skipWaiting() called)
  → ACTIVATED (activate event complete)
  
[SW Exists]
  → INSTALLING (new version detected)
  → INSTALLED (new SW waits for old SW to release clients)
  → User Action: Click "Update Now" button
  → ACTIVATING (skipWaiting() called, old SW becomes REDUNDANT)
  → ACTIVATED (clients.claim() takes control immediately)
```

**Events**:
```typescript
interface ServiceWorkerEvents {
  // Lifecycle Events (fired in service worker context)
  onInstall: (event: ExtendableEvent) => void;   // Precache app shell
  onActivate: (event: ExtendableEvent) => void;  // Clean up old caches
  onFetch: (event: FetchEvent) => void;          // Intercept network requests
  
  // Update Events (fired in page context via workbox-window)
  onWaiting: (event: WorkboxEvent) => void;      // New SW waiting (show UpdatePrompt)
  onControlling: (event: WorkboxEvent) => void;  // New SW activated (reload page)
  onUpdateFound: (event: WorkboxEvent) => void;  // Update downloading
  
  // Communication
  onMessage: (event: ExtendableMessageEvent) => void;  // Message from page to SW
}
```

**Lifecycle Hooks**:
1. **Install**: Precache app shell (HTML, CSS, JS, WASM) using Workbox precaching
2. **Activate**: Delete old cache versions, claim clients
3. **Fetch**: Intercept requests, apply caching strategies (cache-first, network-first, SWR)
4. **Message**: Handle SKIP_WAITING message from UpdatePrompt component

**Data Stored**:
- Service worker script: `service-worker.js` (500-800 lines, Workbox-generated)
- Registration object: Managed by browser, accessible via `navigator.serviceWorker.register()`

---

## Entity 3: Cache Storage Structure

**Purpose**: Browser cache storage for offline assets. Organized by cache type (app shell, scores, assets) with version-based naming.

**Cache Schema**:
```typescript
interface CacheStructure {
  // Cache Names (versioned)
  appShellCacheName: string;    // "musicore-app-shell-v{BUILD_HASH}"
  scoresCacheName: string;      // "musicore-scores-v{BUILD_HASH}"
  assetsCacheName: string;      // "musicore-assets-v{BUILD_HASH}"
  wasmCacheName: string;        // "musicore-wasm-v{BUILD_HASH}"
  
  // Cache Contents
  caches: {
    [cacheName: string]: Array<{
      url: string;              // Cached URL
      response: Response;       // Cached response object
      timestamp: number;        // Cache time (for LRU eviction)
    }>;
  };
}
```

**Cache Types**:

**1. App Shell Cache** (cache-first strategy):
```typescript
const appShellCache = {
  name: "musicore-app-shell-v" + BUILD_HASH,
  strategy: "CacheFirst",
  urls: [
    "/",
    "/index.html",
    "/src/main.tsx",
    "/src/App.css",
    "/vite.svg"
  ],
  maxAge: Infinity,  // Never expire (version via cache name)
  maxEntries: 50     // Limit app shell assets
};
```

**2. WASM Module Cache** (cache-first strategy):
```typescript
const wasmCache = {
  name: "musicore-wasm-v" + BUILD_HASH,
  strategy: "CacheFirst",
  urls: [
    "/musiccore_backend_bg.wasm"  // 144KB WASM module from Feature 011
  ],
  maxAge: Infinity,  // Never expire (critical for offline operation)
  maxEntries: 1      // Only one WASM file
};
```

**3. Scores Cache** (network-first strategy):
```typescript
const scoresCache = {
  name: "musicore-scores-v" + BUILD_HASH,
  strategy: "NetworkFirst",
  urlPattern: /\/api\/scores\/.*/,
  maxAge: 7 * 24 * 60 * 60,  // 7 days
  maxEntries: 50,            // LRU eviction when exceeded
  networkTimeoutSeconds: 3   // Fall back to cache after 3s network timeout
};
```

**4. UI Assets Cache** (stale-while-revalidate strategy):
```typescript
const assetsCache = {
  name: "musicore-assets-v" + BUILD_HASH,
  strategy: "StaleWhileRevalidate",
  urlPattern: /\.(png|jpg|svg|woff2)$/,
  maxAge: 30 * 24 * 60 * 60,  // 30 days
  maxEntries: 100             // Images, fonts, icons
};
```

**Cache Versioning**:
- Cache name includes build hash (e.g., `musicore-app-shell-v8a3f9e2`)
- On service worker update (new build hash), new caches created
- Old caches deleted during `activate` event (cleanup)

**LRU Eviction** (Workbox expiration plugin):
```typescript
const lruEviction = {
  maxEntries: 50,               // Keep 50 most recent scores
  maxAgeSeconds: 7 * 24 * 60 * 60,  // 7 days max age
  purgeOnQuotaError: true       // Auto-evict if quota exceeded
};
```

**Cache Operations**:
```typescript
// Add to cache
await caches.open(cacheName).then(cache => cache.put(request, response));

// Retrieve from cache
const cachedResponse = await caches.match(request);

// Delete old caches
const cacheNames = await caches.keys();
await Promise.all(
  cacheNames
    .filter(name => name.startsWith('musicore-') && name !== currentCacheName)
    .map(name => caches.delete(name))
);
```

---

## Entity 4: Install Prompt State

**Purpose**: Track PWA install prompt state for showing custom install UI. Chrome/Edge support programmatic prompt, iOS Safari requires manual install instructions.

**State Machine**:
```typescript
enum InstallPromptState {
  NOT_AVAILABLE = 'not_available',  // Platform doesn't support install (desktop browser, etc.)
  AVAILABLE = 'available',          // beforeinstallprompt fired, ready to show
  DISMISSED = 'dismissed',          // User dismissed prompt
  INSTALLED = 'installed',          // App installed (standalone mode detected)
}
```

**Platform-Specific Behavior**:

**Chrome/Edge (Android/Desktop)**:
```typescript
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;           // Show native install prompt
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

// Usage
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show custom install button
  setInstallPromptState('available');
});

// When user clicks custom install button
async function showInstallPrompt() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    setInstallPromptState('installed');
  } else {
    setInstallPromptState('dismissed');
  }
  deferredPrompt = null;
}
```

**iOS Safari**:
```typescript
// No beforeinstallprompt event - detect iOS and show manual instructions
const isIOS = /iPad|iPhone|iPod/.test(navigator.platform) 
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || (window.navigator as any).standalone;  // iOS-specific

if (isIOS && !isStandalone) {
  // Show iOS install instructions modal
  showIOSInstallModal();
}
```

**Install Detection**:
```typescript
// Detect if app is currently running in standalone mode
const isInstalled = () => {
  // Standard: display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // iOS: navigator.standalone
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
};
```

**State Transitions**:
```
[Initial]
  → NOT_AVAILABLE (no beforeinstallprompt, not iOS, or already installed)
  → AVAILABLE (beforeinstallprompt fired)
  → User clicks install button
  → INSTALLED (outcome === 'accepted')
  OR
  → DISMISSED (outcome === 'dismissed')

[iOS]
  → AVAILABLE (isIOS && !isStandalone)
  → Show manual install instructions
  → User manually installs from share menu
  → INSTALLED (detected on next app launch via isStandalone check)
```

---

## Entity 5: Update Notification State

**Purpose**: Manage service worker update notification UI. When new version available, show non-intrusive banner with update options.

**State Schema**:
```typescript
interface UpdateState {
  status: 'checking' | 'available' | 'downloading' | 'ready' | 'none';
  registration: ServiceWorkerRegistration | null;
  waitingWorker: ServiceWorker | null;
  updateCheckTime: number | null;
  userAction: 'pending' | 'dismissed' | 'accepted' | null;
}
```

**State Transitions**:
```
[App Launch]
  → status: 'checking' (check for updates)
  → status: 'none' (no update available)
  OR
  → status: 'available' (new SW version detected)
  → User sees UpdatePrompt banner
  
[User Action]
  → Click "Update Now"
    → status: 'downloading' (postMessage SKIP_WAITING to SW)
    → status: 'ready' (SW activated)
    → Reload page (window.location.reload())
  OR
  → Click "Later"
    → userAction: 'dismissed'
    → Banner hidden, update applies on next app launch
  OR
  → Click "Remind Me"
    → userAction: 'dismissed'
    → Remind again in 1 hour
```

**Update Check Triggers**:
- App launch
- Focus/visibility change (user returns to app)
- Manual check button (optional)
- Periodic check (every 30 minutes via setInterval)

**Implementation**:
```typescript
interface UpdatePromptProps {
  state: UpdateState;
  onUpdate: () => void;      // Call skipWaiting, reload page
  onDismiss: () => void;     // Hide banner
  onRemind: () => void;      // Remind in 1 hour
}

const UpdatePrompt: React.FC<UpdatePromptProps> = ({ state, onUpdate, onDismiss, onRemind }) => {
  if (state.status !== 'available') return null;
  
  return (
    <div className="update-banner">
      <p>New version available. Update now?</p>
      <button onClick={onUpdate}>Update Now</button>
      <button onClick={onDismiss}>Later</button>
      <button onClick={onRemind}>Remind Me</button>
    </div>
  );
};
```

---

## Entity 6: Offline Sync Queue

**Purpose**: Queue mutations (annotations, score edits) made while offline for sync when connectivity returns.

**Queue Schema**:
```typescript
interface OfflineSyncQueue {
  queue: Array<QueuedMutation>;
  lastSyncTime: number | null;
  syncInProgress: boolean;
}

interface QueuedMutation {
  id: string;                   // Unique mutation ID (UUID)
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'annotation' | 'score_metadata';
  data: any;                    // Mutation payload
  timestamp: number;            // When mutation was queued
  retryCount: number;           // Number of sync attempts
  pendingSync: boolean;         // Not yet synced
}
```

**Sync Flow**:
```
[User makes change while offline]
  → Save to IndexedDB with pendingSync: true
  → Add to OfflineSyncQueue
  
[App detects online event]
  → Trigger syncPendingChanges()
  → For each queued mutation:
    → POST to backend API
    → On success: Mark pendingSync: false, remove from queue
    → On failure: Increment retryCount, keep in queue
    
[App detects offline event]
  → Pause sync, wait for next online event
```

**Conflict Resolution** (MVP: Last-Write-Wins):
```typescript
interface SyncConflictResolution {
  strategy: 'last-write-wins' | 'server-wins' | 'client-wins' | 'manual';
  
  // MVP: last-write-wins
  resolve: (localData: any, serverData: any) => any;
}

// Last-write-wins implementation
const resolve = (localData, serverData) => {
  return localData.timestamp > serverData.timestamp ? localData : serverData;
};
```

**Storage**:
- Queue persisted in IndexedDB (reuses Feature 011 implementation)
- Table: `offline_sync_queue`
- Fields: `id, type, entity, data, timestamp, retryCount, pendingSync`

---

## Relationships Between Entities

```
Web App Manifest
  ↓ referenced by
index.html (<link rel="manifest">)

Service Worker
  ↓ manages
Cache Storage (app shell, scores, assets, WASM)
  ↓ stores
HTTP Responses (HTML, CSS, JS, MusicXML, images)

Service Worker
  ↓ listens for
Install Prompt State (beforeinstallprompt event)
  ↓ triggers
Custom Install UI (InstallPrompt component)

Service Worker
  ↓ fires update events
Update Notification State (workbox-waiting event)
  ↓ triggers
UpdatePrompt Component
  ↓ user action
skipWaiting() → Reload Page

User Actions (while offline)
  ↓ queued in
Offline Sync Queue (IndexedDB)
  ↓ synced when
Online Event Detected
  ↓ POST to
Backend API (future)
```

---

## Summary

**New Entities Introduced by PWA**:
1. **Web App Manifest**: Installability metadata (name, icons, display mode)
2. **Service Worker Lifecycle**: State machine for SW installation, activation, updates
3. **Cache Storage**: Versioned caches for offline assets (app shell, scores, WASM, images)
4. **Install Prompt State**: Platform-specific install UI state (Chrome vs iOS)
5. **Update Notification State**: SW update lifecycle and user action tracking
6. **Offline Sync Queue**: Mutation queue for offline annotation sync

**Integration with Existing Entities**:
- Cache Storage stores Score entities (from domain model) for offline access
- Offline Sync Queue persists Annotation entities (from domain model) when offline
- WASM module (Feature 011) cached in dedicated WASM cache

**No Domain Model Changes**:
- PWA entities exist at infrastructure/adapter layer (Hexagonal Architecture compliance)
- Domain models (Score, Instrument, Note, Annotation) unchanged
- PWA layer transparent to domain logic
