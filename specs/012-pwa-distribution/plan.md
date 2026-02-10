# Implementation Plan: PWA Distribution for Tablets

**Branch**: `012-pwa-distribution` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/012-pwa-distribution/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement Progressive Web App distribution for Musicore to enable tablet-native installation, offline-first operation, and automatic updates without app store friction. This feature creates the Web App Manifest, Service Worker with caching strategies for app shell and WASM module, offline capability for all practice features, and seamless update mechanism. Musicians will be able to install Musicore as a standalone app on iPad, Surface, and Android tablets, access scores without internet connectivity during practice sessions, and receive automatic updates when new versions are deployed.

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend), JavaScript ES2022 (service worker), JSON (manifest)  
**Primary Dependencies**: 
- Workbox 7.0+ (service worker library - Google's PWA toolkit)
- vite-plugin-pwa 0.20+ (Vite PWA plugin for manifest and service worker generation)
- Existing: React 19.2, Vite 7.3, WASM module (144KB musiccore_backend_bg.wasm from Feature 011)
**Storage**: Cache Storage API (browser native), IndexedDB (already implemented in Feature 011 for scores)  
**Testing**: Vitest (unit tests for service worker logic), Lighthouse CI (PWA audit), manual testing on physical tablets (iPad, Surface, Android)  
**Target Platform**: Tablet devices (iPad Pro running iOS 15+/Safari 15+, Surface Pro running Edge 90+, Android tablets running Chrome 90+), HTTPS required  
**Project Type**: Web application (PWA enhancement to existing React frontend)  
**Performance Goals**: 
- Lighthouse PWA score ≥90
- App shell loads <1 second on repeat visits (cached)
- Install flow completes in <3 taps
- Update cycle completes <5 seconds
- Offline mode supports 100% of practice features
**Constraints**: 
- HTTPS deployment required (PWA security requirement)
- Browser storage limits (typically 50MB-1GB depending on device/browser)
- iOS Safari PWA limitations (no beforeinstallprompt, manual install via share menu)
- Service worker activation timing (updates activate on next page load by default)
- Tablet-optimized UI (viewport, orientation, touch targets)
**Scale/Scope**: 
- 1 manifest.json file (200-300 lines JSON)
- 1 service worker file (500-800 lines TypeScript/JavaScript)
- Cache versioning strategy for 1 app shell + N score files
- 3 caching strategies: cache-first (app shell), network-first with fallback (scores), stale-while-revalidate (assets)
- iOS-specific meta tags in index.html (5-7 tags)
- Update notification component (100-150 lines TypeScript/React)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅ PASS

**Status**: Compliant  
**Justification**: PWA infrastructure is a delivery mechanism, not a domain concern. Domain models (Score, Instrument, Note, Timeline) remain unchanged. Service worker caches domain entities but does not modify domain logic. PWA metadata (manifest, icons) are infrastructure concerns correctly separated from domain.

**Action Required**: None

---

### II. Hexagonal Architecture ✅ PASS

**Status**: Compliant  
**Justification**: PWA components act as adapters at the infrastructure layer:
- Service Worker: Adapter for offline persistence (port: cache storage)
- Web App Manifest: Adapter for platform installation (port: operating system integration)
- Domain core remains independent of PWA infrastructure
- WASM module (already hexagonal from Feature 011) is cached as an artifact, not modified

**Action Required**: None

---

### III. Progressive Web Application Architecture ✅ PASS (DIRECT IMPLEMENTATION)

**Status**: Compliant - This feature directly implements Constitution Principle III  
**Justification**: Feature 012 is the implementation of PWA Architecture requirements from Constitution v2.1.0:
- ✅ Target Platform: Targets tablets (iPad, Surface, Android)
- ✅ WASM Deployment: Caches WASM module (144KB musiccore_backend_bg.wasm) for offline engine
- ✅ Offline-First: Implements service worker with cache strategies for offline practice
- ✅ PWA Requirements: Implements manifest, service worker, installability, responsive design
- ✅ Client-Side Processing: Ensures WASM module cached for offline domain logic
- ✅ Contract Definition: Service worker respects existing TypeScript interfaces

This feature is the architectural foundation described in the constitution.

**Action Required**: None

---

### IV. Precision & Fidelity ✅ PASS

**Status**: Compliant  
**Justification**: PWA infrastructure does not touch music timing or 960 PPQ calculations. Service worker caches domain logic artifacts (WASM module) without modifying them. Offline capability ensures precision is maintained even without network connectivity.

**Action Required**: None

---

### V. Test-First Development ✅ PASS

**Status**: Compliant  
**Justification**: Testing strategy defined in spec.md:
- Unit tests for service worker event handlers (install, activate, fetch)
- Integration tests for caching strategies and offline scenarios
- Manual testing on physical tablets for PWA installation and standalone mode
- Lighthouse PWA audit in CI pipeline for regression detection

Service worker logic is testable in isolation using Vitest and service worker test utilities.

**Action Required**: Implement tests before service worker implementation (TDD workflow)

---

**GATE STATUS**: ✅ PASS - All principles satisfied. Feature 012 directly implements Constitution Principle III (PWA Architecture). No violations require complexity tracking.

---

## Project Structure

### Documentation (this feature)

```text
specs/012-pwa-distribution/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── manifest.json    # Web App Manifest contract
├── spec.md              # Feature specification (already exists)
└── checklists/          # Quality checklists (already exists)
    └── requirements.md
```

### Source Code (repository root)

```text
frontend/
├── public/
│   ├── manifest.json           # NEW: Web App Manifest (PWA metadata)
│   ├── icons/                  # NEW: PWA icons directory
│   │   ├── icon-192x192.png    # NEW: Installable icon (192x192)
│   │   ├── icon-512x512.png    # NEW: Installable icon (512x512)
│   │   ├── apple-touch-icon.png # NEW: iOS home screen icon (180x180)
│   │   └── favicon.ico         # Existing (may need update)
│   └── wasm/                   # Existing from Feature 011
│       ├── musiccore_backend_bg.wasm  # Will be cached by service worker
│       └── musiccore_backend.js       # Will be cached by service worker
├── src/
│   ├── service-worker.ts       # NEW: Service Worker with caching strategies
│   ├── sw-registration.ts      # NEW: Service Worker registration logic
│   ├── components/
│   │   ├── UpdatePrompt.tsx    # NEW: Service Worker update notification UI
│   │   ├── UpdatePrompt.css    # NEW: Styles for update prompt
│   │   └── OfflineBanner.tsx   # Existing from Feature 011 (integrate)
│   ├── hooks/
│   │   ├── useServiceWorker.ts # NEW: Hook for SW lifecycle events
│   │   └── useOfflineDetection.ts # Existing from Feature 011 (reuse)
│   ├── services/
│   │   ├── sw-cache.ts         # NEW: Cache management utilities
│   │   └── storage/
│   │       └── local-storage.ts # Existing from Feature 011 (IndexedDB)
│   └── index.html              # MODIFIED: Add iOS PWA meta tags
├── vite.config.ts              # MODIFIED: Add vite-plugin-pwa configuration
└── tests/
    └── service-worker.test.ts  # NEW: Unit tests for service worker
```

**Structure Decision**: Web application structure (Option 2 from template). PWA infrastructure is frontend-only (manifest, service worker, icons, update UI). Backend remains unchanged - service worker caches backend responses but doesn't modify backend code. All new files are in `frontend/` directory.

---

## Complexity Tracking

*No constitution violations - table not needed.*

---

## Phase 0: Research & Analysis

**Status**: ✅ COMPLETE  
**Output**: `research.md` (comprehensive technical research)

### Research Decisions Made

All technical unknowns resolved. Key decisions documented in [research.md](research.md):

1. **Service Worker Library**: Workbox 7.0+ (vs manual implementation)
   - Rationale: Proven, industry standard, pre-built caching strategies, testing utilities
   - Bundle size: ~10KB gzipped (acceptable overhead for reliability)

2. **Caching Strategy by Asset Type**:
   - App Shell (HTML, CSS, JS, WASM): Cache-first (instant offline load)
   - Score Data (MusicXML): Network-first with cache fallback (prioritize fresh data)
   - UI Assets (images, fonts): Stale-while-revalidate (fast + background update)

3. **iOS PWA Compatibility**: iOS-specific install instructions + meta tags
   - iOS Safari lacks beforeinstallprompt event → Manual install via share menu
   - Platform detection shows modal with step-by-step instructions
   - Required meta tags: apple-mobile-web-app-capable, apple-touch-icon

4. **Service Worker Update Strategy**: Manual prompt with user control
   - Show UpdatePrompt banner when update available
   - User chooses: "Update Now" (reload immediately) or "Later" (apply on next launch)
   - Prevents interruption during practice sessions

5. **Offline Sync Strategy**: Manual online event with IndexedDB queue
   - Background Sync API not supported on iOS Safari → Manual polling
   - Queue mutations in IndexedDB (reuse Feature 011 implementation)
   - Flush queue on `online` event

6. **Cache Eviction Policy**: LRU with 50 score limit
   - Automatic management (musicians shouldn't manage cache manually)
   - Workbox ExpirationPlugin: maxEntries: 50, purgeOnQuotaError: true
   - Graceful degradation if quota exceeded

7. **Manifest Configuration**: Standalone mode, "any" orientation
   - Theme color: #6366f1 (Musicore brand indigo)
   - Background color: #1a1a1a (dark theme)
   - Orientation: "any" (musicians use portrait/landscape)

**No remaining NEEDS CLARIFICATION items**. Ready for Phase 1 design.

---

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE  
**Output**: `data-model.md`, `contracts/`, `quickstart.md`

### Data Models Designed

See [data-model.md](data-model.md) for complete schemas. Key entities:

1. **Web App Manifest** (manifest.json): PWA metadata for installability
   - Identity: name, short_name, description
   - Display: standalone mode, "any" orientation, theme/background colors
   - Icons: 192x192, 512x512 (Android), 180x180 (iOS)

2. **Service Worker Lifecycle State Machine**:
   - States: installing → installed → activating → activated → redundant
   - Events: install (precache), activate (cleanup), fetch (intercept), message (SKIP_WAITING)

3. **Cache Storage Structure**: Versioned caches by asset type
   - app-shell-v{BUILD_HASH}: HTML, CSS, JS, WASM (cache-first)
   - scores-v{BUILD_HASH}: MusicXML (network-first, LRU 50 entries)
   - assets-v{BUILD_HASH}: Images, fonts (stale-while-revalidate)

4. **Install Prompt State Machine**:
   - Chrome/Edge: beforeinstallprompt event → programmatic install
   - iOS Safari: Manual detection → install instructions modal

5. **Update Notification State**: SW update lifecycle tracking
   - Status: checking → available → downloading → ready → none
   - User action: Update Now (skipWaiting + reload) or Later (defer)

6. **Offline Sync Queue**: Mutation queue for offline annotations
   - Storage: IndexedDB (reuse Feature 011)
   - Sync trigger: `online` event
   - Conflict resolution: Last-write-wins (MVP)

### API Contracts Defined

See [contracts/](contracts/) for full specifications:

1. **manifest.json**: Web App Manifest contract
   - Required fields: name, short_name, icons (192x192, 512x512), display, theme_color
   - Optional: screenshots, shortcuts (practice session, score library)
   - Validated against JSON Schema: https://json.schemastore.org/web-manifest-combined.json

2. **service-worker-api.md**: Service Worker API contract
   - Registration API: `registerServiceWorker(url, options)`
   - Caching Strategy API: Workbox CacheFirst, NetworkFirst, StaleWhileRevalidate
   - Lifecycle API: install, activate, fetch events
   - Update Management API: `checkForUpdates()`, `skipWaitingAndReload()`
   - Offline Sync API: `queueMutation()`, `syncPendingMutations()`
   - Cache Management API: `getCacheSize()`, `clearCache()`
   - Install Prompt API: `showInstallPrompt()`, `isStandaloneMode()`

### Developer Quickstart Created

See [quickstart.md](quickstart.md) for step-by-step implementation guide:

- **Phase 1**: Setup dependencies (Workbox, vite-plugin-pwa)
- **Phase 2**: Configure Vite PWA plugin (manifest, caching strategies)
- **Phase 3**: Add iOS PWA meta tags to index.html
- **Phase 4**: Create icon assets (192x192, 512x512, apple-touch-icon)
- **Phase 5**: Implement service worker registration (sw-registration.ts)
- **Phase 6**: Implement update prompt component (UpdatePrompt.tsx)
- **Phase 7**: Testing (unit tests, manual tablets, Lighthouse audit)
- **Phase 8**: iOS install instructions modal (IOSInstallModal.tsx)

**Estimated implementation time**: 4-6 hours

---

## Planning Complete

**Date**: 2026-02-10  
**Status**: Ready for `/speckit.tasks`

All planning phases complete:
- ✅ Phase 0: Research (7 technical decisions documented)
- ✅ Phase 1: Design (6 data models, 2 API contracts, developer quickstart)
- ✅ Constitution Check: All 5 principles pass (direct implementation of Principle III)
- ✅ Agent Context: Updated with PWA technologies (Workbox, vite-plugin-pwa, Cache Storage, IndexedDB)

**Next Command**: `/speckit.tasks` to generate implementation tasks organized by user story (P1: Install, P2: Offline, P3: Updates).

---

