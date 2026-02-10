# Research: PWA Distribution for Tablets

**Feature**: 012-pwa-distribution  
**Phase**: 0 - Research & Analysis  
**Date**: 2026-02-10

## Overview

This document captures research findings for implementing Progressive Web App distribution for Musicore. Research focuses on PWA best practices, service worker caching strategies, browser compatibility (especially iOS Safari quirks), offline-sync patterns, and Workbox library usage.

---

## Decision 1: Service Worker Library (Workbox vs Manual)

**Context**: Service workers require complex caching logic, versioning, and lifecycle management. We need to decide whether to use a library (Workbox) or implement manually.

**Options Evaluated**:
1. **Manual Service Worker** - Write all logic from scratch
2. **Workbox (Google's PWA toolkit)** - Pre-built caching strategies and utilities
3. **sw-precache/sw-toolbox** - Older Google libraries (deprecated)

**Decision**: Use Workbox 7.0+

**Rationale**:
- **Proven**: Industry standard used by Google, Twitter, Pinterest, Starbucks PWAs
- **Built-in Strategies**: Provides cache-first, network-first, stale-while-revalidate out-of-the-box
- **Cache Versioning**: Automatic cache cleanup and versioning on service worker updates
- **Background Sync**: Built-in support for queueing requests when offline
- **TypeScript Support**: Full TypeScript definitions for type-safe service worker code
- **Vite Integration**: vite-plugin-pwa provides seamless Workbox integration
- **Testing Utilities**: Workbox includes test helpers for service worker unit tests
- **Bundle Size**: ~10KB gzipped (acceptable overhead for reliability)

**Alternatives Rejected**:
- Manual implementation: Would require 2000+ lines of complex logic for caching, versioning, and lifecycle management. High bug risk.
- sw-precache/sw-tool

box: Deprecated by Google, replaced by Workbox

**Implementation Notes**:
- Install: `npm install workbox-precaching workbox-routing workbox-strategies workbox-window`
- Vite plugin: `npm install -D vite-plugin-pwa`
- Configuration in vite.config.ts handles manifest and service worker generation

---

## Decision 2: Caching Strategy by Asset Type

**Context**: Different asset types have different freshness requirements. App shell needs cache-first for instant loading, while score data should prioritize fresh content when online.

**Caching Strategies Evaluated**:
1. **Cache First** - Serve from cache, fall back to network (fastest, may serve stale)
2. **Network First** - Try network, fall back to cache (freshest, requires network wait)
3. **Stale-While-Revalidate** - Serve cached version immediately, update cache in background
4. **Network Only** - Always fetch from network (no offline support)
5. **Cache Only** - Only serve cached (used for precached assets)

**Decision**: Implement three strategies based on asset type

| Asset Type | Strategy | Rationale |
|------------|----------|-----------|
| **App Shell** (HTML, CSS, JS, WASM) | Cache First | Never wait for network. Instant load from cache. Updates happen via service worker update cycle. |
| **Score Data** (MusicXML, metadata) | Network First with Cache Fallback | Prioritize fresh data when online. Use cached version only when offline. Musicians expect latest score version. |
| **UI Assets** (images, fonts, icons) | Stale-While-Revalidate | Show cached version immediately (fast), update cache in background. Best of both worlds for non-critical assets. |
| **API Requests** (if any) | Network First with Cache Fallback | Same as score data - freshness matters. |

**Rationale**:
- **App Shell Cache First**: Musicians need instant launch even offline. App shell rarely changes during practice session.
- **Score Data Network First**: Musicians may update scores on desktop then open on tablet. Network-first ensures they see latest version.
- **UI Assets SWR**: Balance between speed (cached) and freshness (background update). Non-critical so stale is acceptable.

**Implementation Notes**:
- Workbox strategies: `CacheFirst`, `NetworkFirst`, `StaleWhileRevalidate` classes
- Cache naming: `app-shell-v1`, `score-data-v1`, `ui-assets-v1` (version increments on SW update)
- Max age: UI assets cached for 30 days, score data cached for 7 days (with LRU eviction)

---

## Decision 3: iOS PWA Compatibility Approach

**Context**: iOS Safari has limited PWA support compared to Chrome/Edge. No beforeinstallprompt event, different status bar behavior, manual install process. Need strategy for iOS users.

**iOS Limitations Identified**:
- ❌ No `beforeinstallprompt` event - Cannot trigger install prompt programmatically
- ❌ Limited Background Sync - Background sync API not supported (as of iOS 16)
- ⚠️ Manual Install Required - Users must go to Share menu → "Add to Home Screen"
- ⚠️ Separate Storage - PWA storage quota separate from Safari browser
- ⚠️ Status Bar Quirks - `apple-mobile-web-app-status-bar-style` behaves differently than Android

**Options Evaluated**:
1. **iOS-Only Install Instructions Modal** - Show iOS-specific instructions when Safari detected
2. **Platform-Agnostic Instructions** - Generic "install this app" message for all browsers
3. **No Special Handling** - Let users figure it out (bad UX)

**Decision**: iOS-specific install instructions with platform detection

**Rationale**:
- Chrome/Edge on Android can show native install prompt (good UX)
- Safari on iOS requires manual steps - users need guidance
- Platform detection is reliable (`navigator.userAgent` or `navigator.platform`)
- Modal with screenshots helps users complete install process

**Implementation**:
```typescript
// Platform detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.platform) 
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isIOS && isSafari && !window.matchMedia('(display-mode: standalone)').matches) {
  // Show iOS install instructions modal
  showIOSInstallInstructions();
}
```

**iOS-Specific Meta Tags Required**:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Musicore">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
```

**Alternatives Rejected**:
- No special handling: Poor UX for iPad users (our primary platform)
- Platform-agnostic instructions: Confusing for Chrome users who see native prompt

---

## Decision 4: Service Worker Update Strategy

**Context**: When a new version of the PWA is deployed, the service worker needs to update. Default behavior activates new SW on next page load, which means users may not see updates immediately. Need balance between immediate updates and not interrupting practice sessions.

**Options Evaluated**:
1. **Skip Waiting (Immediate Update)** - New SW activates immediately on detection
2. **Manual Update Prompt** - Show notification, let user decide when to reload
3. **Silent Background Update** - Update activates on next app launch (default)

**Decision**: Manual update prompt with user control

**Rationale**:
- **User Control**: Musicians in practice session should not be interrupted by forced reload
- **Awareness**: Users know an update is available (transparency)
- **Flexibility**: User can defer update until end of practice session or apply immediately
- **Safety**: If update introduces bug, user can defer and report issue before applying

**Update Flow**:
1. Service worker detects new version via update check (automatically on SW fetch events)
2. New SW downloads in background (does not interrupt current session)
3. UpdatePrompt component shows non-intrusive banner: "New version available. Update now?"
4. User options:
   - "Update Now" → Call `skipWaiting()`, reload page, activate new SW
   - "Later" → Dismiss banner, new SW activates on next app launch
   - "Remind Me" → Show banner again in 1 hour

**Implementation**:
- Use Workbox's `workbox-window` for update lifecycle events
- `UpdatePrompt` React component listens to `workbox-waiting` event
- User action triggers `postMessage({type: 'SKIP_WAITING'})` to SW
- SW responds with `clients.claim()` to take control immediately

**Alternatives Rejected**:
- Skip waiting immediate: Interrupts practice sessions (bad UX)
- Silent background update: Users don't know if they have latest version (transparency issue)

---

## Decision 5: Offline Sync Strategy for Annotations

**Context**: Musicians add annotations (fingerings, bowings, markings) while offline. When connectivity returns, these changes need to sync to backend (if backend storage is implemented). Need strategy for queueing and conflict resolution.

**Options Evaluated**:
1. **Background Sync API** - Queue requests, auto-retry when online
2. **Manual Check on Online Event** - Poll online status, flush queue manually
3. **No Sync** - Local-only annotations (no backend persistence)

**Decision**: Manual online event with IndexedDB queue (Background Sync as future enhancement)

**Rationale**:
- **iOS Compatibility**: Background Sync API not supported on iOS Safari (as of iOS 16)
- **IndexedDB Already Implemented**: Feature 011 has IndexedDB for offline scores
- **Simple Polling**: `navigator.onLine` + `online` event is reliable cross-browser
- **MVP Approach**: Get basic sync working, upgrade to Background Sync API when iOS supports it
- **Existing OfflineBanner Integration**: Already detecting online/offline status (Feature 011)

**Sync Flow**:
1. User adds annotation while offline → Save to IndexedDB with `pendingSync: true`
2. App detects `online` event (via `useOfflineDetection` hook from Feature 011)
3. Flush queue: Iterate IndexedDB entries with `pendingSync: true`, POST to backend
4. On success: Mark `pendingSync: false`
5. On failure: Keep `pendingSync: true`, retry on next online event

**Conflict Resolution (MVP)**:
- **Last-Write-Wins**: If backend has newer version, backend wins (simple, acceptable for MVP)
- **Future Enhancement**: Show conflict UI, let user choose local/server/merge

**Implementation Notes**:
- Leverage existing `IndexedDB` implementation from Feature 011 (`local-storage.ts`)
- Add `pendingSync` boolean field to score metadata
- `online` event listener triggers `syncPendingChanges()` function

**Alternatives Rejected**:
- Background Sync API only: Breaks on iOS (57% of tablet market per constitution)
- No sync: Musicians expect annotations to persist across devices (future requirement)

---

## Decision 6: Cache Size Limits and Eviction Policy

**Context**: Browsers enforce storage quotas (varies by device/browser: 50MB-1GB typical). Service worker cache can grow large with many scores. Need eviction policy to prevent quota exceeded errors.

**Options Evaluated**:
1. **No Limit (Queue Until Full)** - Let browser handle quota exceeded
2. **LRU (Least Recently Used) Eviction** - Remove oldest accessed scores first
3. **Fixed Limit** - Cap at N scores (e.g., 50 scores max)
4. **User-Controlled** - Let user choose which scores to cache

**Decision**: LRU eviction with soft limit of 50 scores

**Rationale**:
- **Automatic Management**: Users shouldn't manage cache manually (poor UX)
- **LRU Matches Usage**: Musicians practice recent scores; old scores can be re-downloaded
- **Soft Limit**: 50 scores ≈ 50MB-150MB (typical MusicXML + rendering data) - safe for most tablets
- **Graceful Degradation**: If quota exceeded, evict oldest score, notify user

**Cache Limits**:
- **App Shell**: ~5MB (HTML, CSS, JS, WASM module) - always cached, never evicted
- **Score Data**: ~50 scores × 1-3MB each = 50-150MB - LRU eviction applies
- **UI Assets**: ~10MB (icons, images, fonts) - cached with max-age expiration
- **Total Estimate**: 65-165MB (well within typical 200MB+ quota on tablets)

**Eviction Algorithm**:
```javascript
// Workbox expiration plugin
new ExpirationPlugin({
  maxEntries: 50,           // LRU: Keep 50 most recent scores
  maxAgeSeconds: 7 * 24 * 60 * 60,  // 7 days max age
  purgeOnQuotaError: true,  // Auto-evict if quota exceeded
})
```

**User Notification**:
- Show toast when cache reaches 80% of limit: "Cache nearly full. Oldest scores will be removed automatically."
- Show toast when score evicted: "Removed 'Moonlight Sonata' from offline cache to free space."

**Alternatives Rejected**:
- No limit: Risk quota exceeded errors, app breaks
- Fixed limit without LRU: Recently used scores may be evicted (bad UX)
- User-controlled: Too much cognitive load for practicing musicians

---

## Decision 7: Manifest Configuration

**Context**: Web App Manifest (manifest.json) defines PWA metadata: name, icons, display mode, theme colors, orientation. Need configuration that works well on tablets in practice scenarios.

**Key Manifest Fields**:
```json
{
  "name": "Musicore - Intelligent Music Stand",
  "short_name": "Musicore",
  "description": "Tablet-native intelligent music stand for practice",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#6366f1",
  "orientation": "any",
  "categories": ["music", "education", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Decision Rationale**:

**Display Mode: "standalone"**
- Hides browser UI (address bar, navigation buttons)
- Maximizes screen space for score display (critical on tablets)
- Feels like native app (aligns with constitution's PWA Architecture principle)
- Alternative "fullscreen" rejected: Need status bar for battery/time during practice

**Orientation: "any"**
- Musicians use tablets in portrait (piano/solo) and landscape (orchestral parts)
- Forcing orientation would hurt UX for specific practice scenarios
- CSS media queries handle layout for both orientations

**Theme Color: "#6366f1" (Indigo)**
- Matches existing Musicore brand color
- Shows in browser UI before app loads (smooth transition)
- iOS status bar uses this color in standalone mode

**Background Color: "#1a1a1a" (Dark Gray)**
- Matches app's dark theme (reduces eye strain during practice)
- Shows during splash screen while app loads
- Smooth transition from splash → app (no white flash)

**Icons: 192x192 and 512x512**
- 192x192: Minimum for Android home screen
- 512x512: Required for Android splash screen
- "purpose": "any maskable": Works with Android adaptive icons

**iOS-Specific**:
- `apple-touch-icon.png` (180x180): Separate file for iOS home screen
- iOS doesn't support manifest icons, requires explicit link tag

---

## Summary of Research Decisions

| Decision | Choice | Impact |
|----------|--------|--------|
| **Service Worker Library** | Workbox 7.0+ | Reliable caching, testing, versioning. ~10KB overhead. |
| **Caching Strategy** | Hybrid (cache-first for app shell, network-first for scores, SWR for assets) | Instant load + fresh data when online. |
| **iOS Compatibility** | iOS-specific install instructions + meta tags | Guides iPad users through manual install process. |
| **Update Strategy** | Manual prompt with user control | Users choose when to update, no interruption. |
| **Offline Sync** | Manual online event with IndexedDB queue | Works on iOS (no Background Sync API). MVP approach. |
| **Cache Eviction** | LRU with 50 score limit | Automatic management, graceful degradation. |
| **Manifest Display** | Standalone mode with "any" orientation | Native-like, works portrait/landscape. |

---

## Open Questions / Future Enhancements

**Resolved for MVP**:
- ✅ Service worker library: Workbox
- ✅ Caching strategies: Hybrid approach (3 strategies)
- ✅ iOS compatibility: Manual install instructions + meta tags
- ✅ Update mechanism: User-controlled prompt
- ✅ Offline sync: Manual with IndexedDB (iOS-compatible)

**Deferred to Future Releases**:
- ⏸️ Background Sync API: When iOS Safari supports it (iOS 17+?)
- ⏸️ Advanced conflict resolution UI: MVP uses last-write-wins
- ⏸️ Push notifications: Not essential for practice sessions
- ⏸️ Periodic background sync: Automatic score library updates
- ⏸️ Background fetch API: Large score library downloads

---

## Implementation Readiness

All research questions resolved. No remaining [NEEDS CLARIFICATION] items. Ready to proceed to Phase 1 (Design: data-model.md, contracts/, quickstart.md).

**Key Takeaways for Implementation**:
1. Use vite-plugin-pwa for Workbox integration (simplifies setup)
2. Test on physical tablets (iPad, Surface, Android) - behavior differs from desktop DevTools
3. Implement iOS install instructions modal (critical for iPad users)
4. Add Lighthouse PWA audit to CI pipeline (catch regressions)
5. Create UpdatePrompt component for user-controlled updates
6. Integrate with existing OfflineBanner from Feature 011 for consistent offline feedback
