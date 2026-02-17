# Service Worker Cache Contract

**Feature**: 025-offline-mode
**Purpose**: Define the structure and behavior of the service worker precache
**Type**: Build artifact contract

## Overview

This contract defines what assets MUST be cached by the service worker during installation, ensuring offline functionality. The precache manifest is generated at build time by Workbox (via `vite-plugin-pwa`).

---

## Precache Manifest Structure

### Generated Location

**File**: `dist/sw.js` (production build)
**Format**: JavaScript array embedded in service worker code

### Entry Schema

```typescript
interface PrecacheEntry {
  url: string;        // Asset path relative to site origin
  revision: string | null;  // Content hash (null if hash in filename)
}
```

### Example Manifest

```javascript
// Generated in dist/sw.js by Workbox
const precacheManifest = [
  // HTML entry point
  { url: '/index.html', revision: 'abc123...' },
  
  // JavaScript bundles (hash in filename → revision: null)
  { url: '/assets/index-def456.js', revision: null },
  
  // CSS bundles (hash in filename → revision: null)
  { url: '/assets/index-789ghi.css', revision: null },
  
  // WASM module (Feature 011)
  { url: '/wasm/musicore_backend.js', revision: 'jkl012...' },
  { url: '/wasm/musicore_backend_bg.wasm', revision: 'mno345...' },
  
  // Demo MusicXML (NEW in Feature 025)
  { url: '/music/CanonD.musicxml', revision: 'pqr678...' },
  
  // Icons and assets
  { url: '/favicon.ico', revision: 'stu901...' },
  { url: '/icons/icon-192.png', revision: 'vwx234...' },
  // ... other assets
];
```

---

## Required Assets

### Critical Assets (MUST be precached)

These assets are essential for offline functionality:

| Asset Type | Pattern | Example | Rationale |
|------------|---------|---------|-----------|
| **HTML entry** | `/index.html` | `/index.html` | App shell |
| **JavaScript** | `/assets/*.js` | `/assets/index-abc123.js` | App logic |
| **CSS** | `/assets/*.css` | `/assets/index-def456.css` | App styling |
| **WASM module** | `/wasm/*.wasm` | `/wasm/musicore_backend_bg.wasm` | Music engine (Feature 011) |
| **WASM glue** | `/wasm/*.js` | `/wasm/musicore_backend.js` | WASM initialization |
| **Demo MusicXML** | `/music/*.musicxml` | `/music/CanonD.musicxml` | Offline demo (NEW) |

### Optional Assets (MAY be precached)

These assets improve UX but are not critical:

| Asset Type | Pattern | Example | Rationale |
|------------|---------|---------|-----------|
| **Icons** | `/icons/*.png` | `/icons/icon-192.png` | PWA icons for install |
| **Favicon** | `/favicon.ico` | `/favicon.ico` | Browser tab icon |
| **SVG assets** | `/*.svg` | `/logo.svg` | UI graphics |

### Explicitly Excluded Assets

These assets should NOT be precached:

| Asset Type | Pattern | Rationale |
|------------|---------|-----------|
| **Source maps** | `*.map` | Development-only, large, not needed for runtime |
| **Documentation** | `*.md` | Not needed for app functionality |
| **Test fixtures** | `/fixtures/*` | Not needed for production |

---

## Build Configuration Contract

### Vite Configuration

**File**: `frontend/vite.config.ts`

**Required configuration**:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // CRITICAL: Must include musicxml for demo precaching
        globPatterns: [
          '**/*.{js,css,html,wasm,png,svg,ico,musicxml}'
          //                                      ^^^^^^^^ NEW in Feature 025
        ],
        
        // Additional patterns for WASM in /wasm directory
        additionalManifestEntries: [
          // Auto-detected by globPatterns if in public/ or dist/
        ],
        
        // Cache strategy for precached assets (default: cache-first)
        runtimeCaching: [
          // Not used for precached assets — they use cache-first by default
        ],
      },
      
      manifest: {
        name: 'Musicore',
        short_name: 'Musicore',
        // ... PWA manifest fields
      },
    }),
  ],
});
```

**Validation command**:
```bash
cd frontend
grep -A 5 "globPatterns" vite.config.ts | grep "musicxml"
```

**Expected output**: Line containing `musicxml` in the extensions list.

---

## Cache Behavior Contract

### Cache-First Strategy (Precached Assets)

Workbox uses **cache-first** for all precached assets:

```text
Request for precached asset (e.g., /music/CanonD.musicxml):
  ├─ Check cache
  │   ├─ [Cache hit] → Return cached response (OFFLINE-SAFE ✅)
  │   └─ [Cache miss] → Fetch from network
  │       ├─ [Network success] → Cache response, return
  │       └─ [Network failure] → Error (should not happen for precached assets)
```

**Contract guarantees**:
1. If asset is in precache manifest, it WILL be cached during service worker install
2. If asset is cached, it WILL be returned instantly (no network delay)
3. If asset is cached, it WILL be available offline

### Service Worker Lifecycle

```text
First Visit (Online):
  ├─ Browser fetches /index.html
  ├─ Page registers service worker (sw.js)
  ├─ Service worker installs
  │   └─ Downloads ALL precached assets
  │       └─ Stores in 'workbox-precache-v2-...' cache
  ├─ Service worker activates
  └─ Service worker takes control

Subsequent Visits (Offline or Online):
  ├─ Service worker intercepts fetch requests
  ├─ Checks cache for matching entry
  └─ Returns cached asset (cache-first)
```

**Contract guarantees**:
1. First visit MUST be online (for service worker install)
2. After install, ALL precached assets MUST be available offline
3. Service worker MUST activate before offline functionality is guaranteed

---

## Validation Contract

### Build-Time Validation

**Test**: Verify precache manifest includes demo file

```bash
cd frontend
npm run build
grep -A 200 "precache" dist/sw.js | grep "CanonD.musicxml"
```

**Expected**: Line containing `"url": "/music/CanonD.musicxml"` (or similar).

**Failure**: If demo not in manifest, check:
1. `vite.config.ts` includes `musicxml` in `globPatterns`
2. Demo file exists at `frontend/public/music/CanonD.musicxml`
3. Build completed without errors

---

### Runtime Validation

**Test**: Verify service worker cached demo file

**Steps**:
1. Open Chrome DevTools → Application → Cache Storage
2. Find cache: `workbox-precache-v2-...` (name varies by build)
3. Check entries for `/music/CanonD.musicxml`

**Expected**: Entry exists with full MusicXML content (~50KB).

**Failure**: If missing, check:
1. Service worker is activated (Application → Service Workers)
2. Visit was online during install (offline installs cannot fetch precache)
3. Cache was not manually cleared

---

### Offline Validation

**Test**: Verify demo loads offline

**Steps**:
1. Visit app online (install service worker)
2. DevTools → Network → Enable "Offline"
3. Reload page
4. Tap "Demo" button

**Expected**:
- Page loads (from cache)
- Demo loads (from cache)
- Zero network requests in Network tab
- Console logs: `[DemoLoader] Demo not in IndexedDB, loading from cache`

**Failure**: If network error, check:
1. Service worker activated before going offline
2. Precache manifest includes demo (see Build-Time Validation)
3. Cache not cleared (check Cache Storage)

---

## Cache Invalidation Contract

### When Cache Updates

Workbox automatically updates the precache when:
1. **Asset content changes** → Revision hash changes → Service worker fetches new version
2. **Service worker updated** → New `sw.js` deployed → Browser installs new service worker → Old cache cleared, new cache populated

### What Triggers Update

| Change Type | Cache Update? | Rationale |
|-------------|---------------|-----------|
| **Demo MusicXML content changed** | ✅ Yes | Revision hash changes, Workbox detects new version |
| **Demo MusicXML file renamed** | ✅ Yes | URL changed, Workbox sees new entry |
| **JavaScript bundle changed** | ✅ Yes | Hash in filename changes, manifest updated |
| **WASM module changed** | ✅ Yes | Revision hash changes (or hash in filename) |
| **User clears browser cache** | ⚠️ User action | Service worker must reinstall (requires online visit) |
| **Service worker unregistered** | ⚠️ Manual action | Precache deleted, requires reinstall |

### Update Flow

```text
Developer changes demo file:
  └─ Commit and build
      └─ Workbox generates new precache manifest
          └─ New sw.js deployed
              └─ Browser detects new service worker
                  └─ New service worker installs in background
                      └─ Downloads new demo file
                          └─ New service worker activates on next navigation
                              └─ Old cache cleared
                                  └─ New cache used
```

**User experience**:
- First visit after update: May see old demo (old service worker still active)
- Second visit (or refresh): New service worker active, new demo cached

---

## Size Constraints

### Precache Size Budget

| Asset Category | Typical Size | Max Acceptable |
|----------------|--------------|----------------|
| **App shell** (HTML, CSS, JS) | ~500KB | 2MB |
| **WASM module** | ~200KB | 500KB |
| **Demo MusicXML** | ~50KB | 100KB |
| **Icons and assets** | ~100KB | 500KB |
| **Total precache** | ~850KB | **3MB** |

**Contract**: Total precache MUST NOT exceed 3MB to ensure reasonable install time on slow networks.

**Validation**:
```bash
cd frontend
npm run build
du -sh dist/
```

**Expected**: `dist/` directory < 3MB.

---

## Error Handling Contract

### Cache Miss Errors

If a precached asset is missing (should never happen in production):

```typescript
// Service worker behavior (Workbox default)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Cache hit
      }
      
      // Cache miss — fall back to network
      return fetch(event.request).catch((err) => {
        // Network failure — return error response
        console.error('[SW] Fetch failed for:', event.request.url, err);
        return new Response('Offline and not cached', { status: 503 });
      });
    })
  );
});
```

**Contract guarantees**:
1. Precached assets MUST always hit cache (cache miss indicates a bug)
2. If cache miss occurs, service worker SHOULD attempt network fetch
3. If network fetch fails, service worker SHOULD return 503 response

---

## Summary

**Cache Requirements**:
- ✅ Demo MusicXML (`/music/CanonD.musicxml`) MUST be precached
- ✅ WASM module (`/wasm/*.wasm`) MUST be precached
- ✅ App shell (`/index.html`, JS, CSS) MUST be precached
- ✅ Total precache size MUST be < 3MB

**Behavior Requirements**:
- ✅ First visit MUST be online (for service worker install)
- ✅ After install, ALL precached assets MUST work offline
- ✅ Cache-first strategy MUST be used for precached assets
- ✅ Cache MUST update when asset content changes

**Validation Requirements**:
- ✅ Build MUST verify demo in precache manifest
- ✅ Runtime MUST verify demo in Cache Storage
- ✅ Offline test MUST confirm demo loads without network

**Failure Modes**:
- ❌ First offline visit (before service worker install) → Expected failure
- ❌ Cache cleared manually → Requires online reinstall
- ❌ Service worker unregistered → Requires online reinstall
