# Feature Specification: Offline Mode Parity

**Feature Branch**: `025-offline-mode`  
**Created**: 2026-02-17  
**Status**: Draft  
**Input**: User description: "offline mode should work the same as online in the current version"

## Clarifications

### Session 2026-02-17

- Q: The app already has a PWA service worker (Feature 012) and IndexedDB storage (Feature 011). What specific gaps remain for full offline parity? → A: Analyzed codebase — several code paths still fall back to backend API calls that fail offline: demo loading on first visit, score loading fallback via `apiClient.getScore()`, backend sync (`syncLocalScoreToBackend`), and score creation via REST API. The goal is to make every user-facing feature work identically regardless of network connectivity.

## Problem Analysis

The current app has substantial offline infrastructure in place (PWA service worker, Workbox caching, IndexedDB storage, WASM-based MusicXML parsing), but several user-facing flows still assume network connectivity and fail silently or with errors when offline:

1. **Demo score loading** — `DemoLoaderService.loadBundledDemo()` calls `fetch(demoBundlePath)` to retrieve the Canon in D MusicXML file from the server. On first visit offline (before the service worker has cached the file), this fails.

2. **Score loading fallback** — `ScoreViewer.loadScore()` tries IndexedDB first, then falls back to `apiClient.getScore(id)` via REST API. If the score is not in IndexedDB, the fallback fails offline.

3. **Backend sync on import** — `syncLocalScoreToBackend()` makes multiple REST API calls (`createScore`, `addInstrument`, `getScore`, `addStaff`, `addVoice`, `addNote`) to replicate a locally-imported score on the backend. This entire flow fails offline.

4. **New score creation** — `createNewScore()` calls `apiClient.createScore()` via REST. Fails offline (though this path is currently deprecated, it remains in code).

5. **OfflineBanner messaging** — The current banner says "You're offline. Changes will be saved locally." but doesn't communicate that ALL features still work. Users may think functionality is degraded.

### What Already Works Offline

| Capability | Status | Mechanism |
|---|---|---|
| App shell loading | ✅ Works | Service worker cache-first |
| WASM module loading | ✅ Works | Service worker cache-first |
| MusicXML import from file | ✅ Works | WASM parsing, no network needed |
| Score display & notation | ✅ Works | Local rendering |
| Score playback | ✅ Works | Tone.js (local audio engine) |
| Score persistence | ✅ Works | IndexedDB |
| Offline detection | ✅ Works | `navigator.onLine` + OfflineBanner |
| Previously viewed scores | ✅ Works | IndexedDB cache |

### What Breaks Offline

| Capability | Status | Root Cause |
|---|---|---|
| Demo score on first visit | ❌ Fails | `fetch()` to `/music/CanonD.musicxml` |
| Load score not in IndexedDB | ❌ Fails | Falls back to `apiClient.getScore()` |
| Backend sync after import | ❌ Fails | Multiple REST API calls |
| New score creation (legacy) | ❌ Fails | `apiClient.createScore()` |
| User confidence | ⚠️ Unclear | Banner doesn't affirm full functionality |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Demo Score Available on First Offline Visit (Priority: P1)

A musician installs the Musicore PWA while online, then opens it later without internet. They tap the "Demo" button and expect the Canon in D demo to load and play, exactly as it would online. This is the first interaction for many users — it must not fail.

**Why this priority**: The demo is the primary onboarding experience. If a user installs the app, goes to a practice room with no WiFi, and the demo button shows an error, they will abandon the app immediately. This is the single most critical offline gap.

**Independent Test**: Install the PWA while online (visit the site, let the service worker install). Put the device in airplane mode. Open the PWA from the home screen. Tap "Demo". Verify the Canon in D loads, displays notation, and plays audio identically to the online experience.

**Acceptance Scenarios**:

1. **Given** the user has visited the app at least once while online, **When** they open the app offline and tap "Demo", **Then** the Canon in D demo loads with full notation and plays audio without errors
2. **Given** the demo has never been played before but the app was visited online, **When** the user taps "Demo" offline, **Then** the demo MusicXML is available from cache (precached by service worker during install)
3. **Given** the demo was previously loaded and saved to IndexedDB, **When** the user taps "Demo" offline, **Then** it loads instantly from IndexedDB without any network request
4. **Given** the user is offline, **When** the demo finishes loading, **Then** the user experience (notation, playback, highlighting, auto-scroll) is identical to online mode

---

### User Story 2 — Import and View Scores Offline (Priority: P1)

A musician has MusicXML files on their tablet (downloaded earlier, received via email, or on a USB drive). They want to import these files into Musicore while offline and immediately view, play, and practice them.

**Why this priority**: Importing local MusicXML files is a core workflow. Since the WASM parser operates locally and IndexedDB persists scores locally, this should already work — but backend sync calls and score loading fallbacks can cause errors that break the flow.

**Independent Test**: Put the device in airplane mode. Open the PWA. Tap "Import Score". Select a MusicXML file from the device. Verify the score imports, displays, and plays without errors.

**Acceptance Scenarios**:

1. **Given** the user is offline, **When** they import a MusicXML file, **Then** the score is parsed via WASM, saved to IndexedDB, and displayed without any network requests or errors
2. **Given** a score was imported offline, **When** the user navigates away and returns to the score, **Then** it loads from IndexedDB without attempting any backend API call
3. **Given** a score was imported offline, **When** the user plays the score, **Then** playback, highlighting, and auto-scroll work identically to online mode
4. **Given** a score was imported offline and the user later reconnects, **When** the app detects connectivity, **Then** no automatic backend sync is attempted (scores remain local-first)

---

### User Story 3 — Seamless Transition Between Online and Offline (Priority: P2)

A musician is using the app in a room with intermittent WiFi. The connection drops and returns unpredictably. The app should continue working without interruption and never show network-related errors for features that work locally.

**Why this priority**: Real-world usage involves unreliable connectivity. The app should not degrade or show errors when the network is unavailable, since all core features (display, import, playback) are local. This story ensures graceful behavior during transitions.

**Independent Test**: Open the app online with a score displayed. Toggle airplane mode on and off several times. Verify the app continues functioning — notation displays, playback works, no error messages appear for local operations.

**Acceptance Scenarios**:

1. **Given** the user is viewing a score online, **When** the network drops, **Then** the app continues displaying and playing the score without interruption
2. **Given** the user is offline, **When** the network reconnects, **Then** no disruptive UI changes occur (no forced reloads, no sync dialogs)
3. **Given** the user is offline, **When** they perform any local operation (import, play, navigate), **Then** no error messages related to network connectivity appear
4. **Given** the app transitions from offline to online, **When** the OfflineBanner disappears, **Then** all features continue working without the user needing to take any action

---

### User Story 4 — Offline Status Clarity (Priority: P3)

When offline, the user should feel confident that the app is fully functional. The OfflineBanner should reassure them rather than suggest degraded functionality.

**Why this priority**: User confidence matters for retention. If users see an "offline" warning, they may hesitate to use the app, even though everything works. Clear messaging eliminates this friction.

**Independent Test**: Put the device in airplane mode. Open the app. Verify the OfflineBanner message communicates that all features work offline, not just that "changes will be saved locally".

**Acceptance Scenarios**:

1. **Given** the user is offline, **When** the OfflineBanner appears, **Then** the message clearly states that all features (import, playback, demo) work offline
2. **Given** the user is online, **When** the app is loaded, **Then** no offline-related messaging is visible
3. **Given** the user transitions from online to offline, **When** the banner appears, **Then** it uses a neutral/positive tone (not alarming)

---

### Edge Cases

- What happens on the very first visit ever (no service worker installed yet) while offline? → The app cannot load at all — this is expected. Offline mode requires at least one prior online visit to install the service worker and cache the app shell.
- What happens if IndexedDB storage is full? → The app should display a user-friendly error suggesting the user free up space by deleting unused scores, rather than a cryptic browser error.
- What happens if the WASM module fails to load from cache? → The app should show a clear error message explaining that a re-visit while online is needed to restore the engine.
- What happens if the demo MusicXML file is corrupted in cache? → The service worker should detect this on the next online visit and re-cache it.
- What happens if the browser clears the service worker cache (e.g., storage pressure)? → On next online visit, the service worker reinstalls and re-caches. If offline, the app may not load — this is acceptable for edge cases.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The demo score MusicXML file MUST be included in the service worker precache manifest so it is available on the very first offline visit after installation.
- **FR-002**: Score loading MUST NOT fall back to backend REST API calls when a score is not found in IndexedDB. If a score is not in IndexedDB, the system MUST show a user-friendly "Score not found" message rather than attempting a network request.
- **FR-003**: Backend sync (`syncLocalScoreToBackend`) MUST be removed or made completely optional and deferred. Imported scores MUST be treated as local-first — persisted to IndexedDB only, with no mandatory backend replication.
- **FR-004**: The `createNewScore` function MUST use the WASM engine (`create_score`) instead of the REST API (`apiClient.createScore`), ensuring score creation works offline.
- **FR-005**: All code paths that currently call `ScoreApiClient` methods MUST be audited and either removed, replaced with WASM equivalents, or guarded with offline-safe fallbacks that do not produce user-visible errors.
- **FR-006**: The OfflineBanner message MUST be updated to communicate that all features work offline (e.g., "You're offline — all features work normally").
- **FR-007**: The system MUST NOT display network-related error messages to the user for any operation that can be performed locally (import, demo load, playback, score display).
- **FR-008**: Score import MUST NOT trigger any backend sync or REST API calls, regardless of online/offline status. Import is a local-only operation: WASM parse → IndexedDB save.
- **FR-009**: The app MUST preserve all existing functionality when online — no features should be removed, only made network-independent.
- **FR-010**: The service worker MUST precache the WASM module, app shell, and demo MusicXML file as a single atomic unit during installation.

### Key Entities

- **ScoreApiClient**: The existing REST API client that communicates with the backend. Most of its usage should be eliminated in favor of WASM + IndexedDB for offline parity. Any remaining usage must be guarded to avoid offline errors.
- **DemoLoaderService**: The service that loads the Canon in D demo. Must be updated to load from IndexedDB or service worker cache without requiring a live network `fetch()`.
- **IndexedDB Score Store**: The local persistence layer. Becomes the sole source of truth for all scores (demo, imported, created). No backend fallback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All user-facing features (demo load, MusicXML import, score display, playback, highlighting, auto-scroll, tempo change) work identically offline after one prior online visit. Verified by testing each feature in airplane mode.

- **SC-002**: Zero network-related error messages appear during any offline user flow (demo, import, playback, navigation). Verified by monitoring the browser console and UI during a complete offline session.

- **SC-003**: The demo score loads offline in under 2 seconds on a mid-range tablet (iPad 9th gen, Pixel tablet), matching the online loading time within ±500ms.

- **SC-004**: Imported scores persist across app restarts while offline. Import a score offline, close the app completely, reopen it — the score is still available.

- **SC-005**: All existing tests continue to pass. No functional regression in online behavior.

- **SC-006**: The OfflineBanner clearly communicates full offline capability without alarming the user.

- **SC-007**: No REST API calls are made during any local operation (import, demo load, create score, display, playback) regardless of online/offline status. Verified via Network tab monitoring.

## Assumptions

- At least one prior online visit is required to install the service worker and cache the app shell, WASM module, and demo file. The very first visit to the site cannot work offline — this is an inherent browser limitation.
- The backend REST API will be retained for potential future multi-device sync features, but it is not required for any current user-facing functionality.
- IndexedDB storage is sufficient for the user's score library. Most MusicXML files are well under 1MB; a typical practice library of 50 scores requires less than 50MB of storage.
- The WASM module (~144KB) and demo MusicXML file are small enough to precache without impacting the initial service worker install time.

## Out of Scope

- Multi-device score synchronization (syncing scores between tablet, phone, desktop via backend)
- Backend REST API removal — the API remains in the codebase for potential future sync features, but is no longer called from primary user flows
- Offline-first conflict resolution — not needed since there is no server-side state to conflict with
- Push notifications for offline/online transitions
- Background sync of locally-created scores to backend

## Known Issues & Regression Tests *(if applicable)*

This section will be populated during implementation as issues are discovered.

