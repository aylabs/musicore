# Offline Behavior Contract

**Feature**: 025-offline-mode
**Purpose**: Define behavioral guarantees for offline operation
**Type**: Functional contract

## Overview

This contract defines the **expected behavior** of Musicore when the browser is offline (`navigator.onLine === false`). The goal is **offline parity**: all core features work identically online and offline.

---

## Core Principle

> **All features that worked online MUST work offline, with identical behavior.**

**Rationale**: Musicore is designed for live performance on tablets (iPad, Surface, Android). Musicians expect the app to work reliably without internet connectivity. Network failures should not interrupt music creation, editing, or playback.

---

## Feature Behavioral Contracts

### 1. Demo Score Loading

**Contract**: Demo score MUST load offline after one prior online visit.

**Preconditions**:
- User visited app online at least once (service worker installed)
- Service worker precached `/music/CanonD.musicxml`
- Browser cache not manually cleared

**Online Behavior**:
```text
User taps "Demo"
  → DemoLoaderService.loadBundledDemo()
  → Check IndexedDB for existing demo
  → If not found: fetch('/music/CanonD.musicxml') → network call
  → Parse via WASM → Save to IndexedDB
  → Display score
```

**Offline Behavior** (MUST match):
```text
User taps "Demo"
  → DemoLoaderService.loadBundledDemo()
  → Check IndexedDB for existing demo
  → If not found: fetch('/music/CanonD.musicxml') → service worker cache hit
  → Parse via WASM → Save to IndexedDB
  → Display score
```

**Assertion**: Offline behavior is **identical** to online. The `fetch()` call succeeds from cache instead of network.

**Error Cases**:

| Scenario | Expected Behavior | Message |
|----------|-------------------|---------|
| First offline visit (SW not installed) | ❌ Error | "Demo file not available. Visit the app online first to enable offline demo." |
| Cache cleared manually | ❌ Error | "Demo file not available. Visit the app online first to enable offline demo." |
| Demo already in IndexedDB | ✅ Success (fast path) | No message (instant load) |

**Validation**:
- DevTools → Network tab shows ZERO requests when demo loads offline
- DevTools → Console shows `[DemoLoader] Demo not in IndexedDB, loading from cache` or `[DemoLoader] Demo already in IndexedDB`

---

### 2. MusicXML Import

**Contract**: Importing MusicXML files MUST work offline without any degradation.

**Preconditions**:
- User visited app online at least once (WASM module cached)
- User has MusicXML file on device

**Online Behavior**:
```text
User selects file
  → File → ArrayBuffer
  → WASM parseMusicXML(bytes)
  → Save to IndexedDB
  → Display score
```

**Offline Behavior** (MUST match):
```text
User selects file
  → File → ArrayBuffer
  → WASM parseMusicXML(bytes)
  → Save to IndexedDB
  → Display score
```

**Assertion**: **Identical**. No network calls involved in import flow.

**Removed Behavior** (Feature 014 → 025):
- ❌ `syncLocalScoreToBackend()` — DELETED (no longer attempts to sync to REST API)

**Error Cases**:

| Scenario | Expected Behavior | Message |
|----------|-------------------|---------|
| Invalid MusicXML | ❌ Error (from WASM parser) | "Failed to parse MusicXML: {error details}" |
| File read failure | ❌ Error (from browser FileReader) | "Failed to read file" |
| IndexedDB save failure | ❌ Error | "Failed to save imported score" |

**Validation**:
- DevTools → Network tab shows ZERO requests during import
- Score appears in IndexedDB (`musicore-db` → `scores` store)
- No console errors related to `apiClient` or network

---

### 3. Score Playback

**Contract**: Playback MUST work offline without any degradation.

**Preconditions**:
- Score loaded (from IndexedDB or import)
- Tone.js library cached (precached with app shell)

**Online Behavior**:
```text
User taps Play
  → Load score from state
  → Generate audio via Tone.js (local synthesis)
  → Play audio
```

**Offline Behavior** (MUST match):
```text
User taps Play
  → Load score from state
  → Generate audio via Tone.js (local synthesis)
  → Play audio
```

**Assertion**: **Identical**. Playback is entirely local (no audio files fetched).

**Error Cases**:

| Scenario | Expected Behavior | Message |
|----------|-------------------|---------|
| No score loaded | ⚠️ Play button disabled | (no message) |
| Tone.js initialization failure | ❌ Error | "Failed to initialize audio" |

**Validation**:
- DevTools → Network tab shows ZERO requests during playback
- Audio plays (verify with headphones or speakers)

---

### 4. Score Loading (by ID)

**Contract**: Loading scores from IndexedDB MUST work offline. Loading scores that don't exist locally MUST fail gracefully with a clear message.

**Preconditions**:
- Score exists in IndexedDB (imported or demo)

**Online Behavior**:
```text
User navigates to /score/:id
  → ScoreViewer.loadScore(id)
  → loadScoreFromIndexedDB(id)
  → If found: display score
  → If not found: show error
```

**Offline Behavior** (MUST match):
```text
User navigates to /score/:id
  → ScoreViewer.loadScore(id)
  → loadScoreFromIndexedDB(id)
  → If found: display score
  → If not found: show error
```

**Assertion**: **Identical**. No REST API fallback attempted.

**Removed Behavior** (Feature 014 → 025):
- ❌ `apiClient.getScore(id)` fallback — DELETED (no longer attempts to fetch from backend)

**Error Cases**:

| Scenario | Expected Behavior | Message |
|----------|-------------------|---------|
| Score found in IndexedDB | ✅ Success | (no message) |
| Score not in IndexedDB | ⚠️ Error (expected) | "Score not found in local storage. Import a MusicXML file or load the demo." |
| IndexedDB read failure | ❌ Error | "Failed to load score from local storage" |

**Validation**:
- DevTools → Network tab shows ZERO requests during load
- Error message is clear and actionable (no generic "Network error")

---

### 5. Score Editing

**Contract**: Editing scores (adding notes, changing tempo, etc.) MUST work offline without any degradation.

**Preconditions**:
- Score loaded in ScoreViewer
- Edit UI available (if editing is enabled — Feature 014 removed edit UI)

**Online Behavior**:
```text
User edits score
  → Update local state
  → Auto-save to IndexedDB (debounced)
```

**Offline Behavior** (MUST match):
```text
User edits score
  → Update local state
  → Auto-save to IndexedDB (debounced)
```

**Assertion**: **Identical**. Editing is local-only (no backend sync).

**Note**: Feature 014 removed the edit UI, so this may not apply to current implementation. However, programmatic edits (e.g., from API or future features) MUST still work offline.

---

### 6. Score Deletion

**Contract**: Deleting scores from IndexedDB MUST work offline.

**Preconditions**:
- Score exists in IndexedDB

**Online Behavior**:
```text
User deletes score
  → deleteScoreFromIndexedDB(id)
  → Remove from IndexedDB
  → Update UI
```

**Offline Behavior** (MUST match):
```text
User deletes score
  → deleteScoreFromIndexedDB(id)
  → Remove from IndexedDB
  → Update UI
```

**Assertion**: **Identical**. Deletion is local-only (no backend sync).

---

### 7. Offline Status Detection

**Contract**: App MUST display an OfflineBanner when offline, with a clear message that all features work.

**Preconditions**: None.

**Online Behavior**:
```text
navigator.onLine === true
  → OfflineBanner hidden
```

**Offline Behavior**:
```text
navigator.onLine === false
  → OfflineBanner visible
  → Message: "You're offline — all features work normally"
```

**Assertion**: Banner provides **reassurance**, not a warning. Users should understand that offline is fully supported.

**Online/Offline Transitions**:

| Transition | Expected Behavior | Timing |
|------------|-------------------|--------|
| Online → Offline | Banner appears | Immediate (on `offline` event) |
| Offline → Online | Banner disappears | Immediate (on `online` event) |

**Validation**:
- DevTools → Network → Toggle "Offline" checkbox
- Banner appears/disappears immediately
- Message text matches spec

---

## Non-Functional Behavioral Contracts

### Performance

**Contract**: Offline operations MUST be faster than or equal to online operations.

**Rationale**: No network latency offline → operations should be instant.

**Metrics**:

| Operation | Online (target) | Offline (target) | Validation |
|-----------|----------------|------------------|------------|
| **Demo load (first)** | 500ms (network fetch + WASM parse) | 100ms (cache fetch + WASM parse) | Chrome DevTools Performance tab |
| **Demo load (cached)** | 100ms (IndexedDB lookup) | 100ms (IndexedDB lookup) | Identical |
| **Import MusicXML** | 200ms (WASM parse + IndexedDB save) | 200ms (WASM parse + IndexedDB save) | Identical |
| **Score load** | 50ms (IndexedDB lookup) | 50ms (IndexedDB lookup) | Identical |
| **Playback start** | 100ms (Tone.js init) | 100ms (Tone.js init) | Identical |

**Assertion**: Offline operations MUST NOT be slower (no "graceful degradation" — full parity).

---

### Reliability

**Contract**: Offline operations MUST have zero network-related failures.

**Online Failure Modes** (pre-Feature 025):
- Network timeout
- HTTP 500 errors
- CORS errors
- DNS resolution failures

**Offline Failure Modes** (post-Feature 025):
- ✅ **Zero network failures** (no network calls)
- Cache miss (only if SW not installed — expected, clear error)
- IndexedDB quota exceeded (browser storage limit — rare, clear error)
- WASM parse errors (invalid MusicXML — same as online)

**Assertion**: Offline reliability MUST be higher than online (fewer failure modes).

---

### Data Integrity

**Contract**: Offline operations MUST preserve data integrity (no data loss, no corruption).

**Guarantees**:
- IndexedDB writes are atomic → Score saves complete or fail (no partial writes)
- WASM parser is deterministic → Same MusicXML produces same Score
- No backend sync → No race conditions between local and remote state

**Assertions**:
- ✅ Score saved offline is identical to score saved online
- ✅ Score loaded offline is identical to score loaded online
- ✅ No "sync conflicts" (removed backend sync)

---

## Failure Mode Matrix

### Expected Failures (Handled Gracefully)

| Scenario | Expected Behavior | User-Facing Message | Recoverable? |
|----------|-------------------|---------------------|--------------|
| **First offline visit** (SW not installed) | ❌ Demo fails to load | "Demo file not available. Visit the app online first..." | ✅ Yes (visit online) |
| **Score ID not in IndexedDB** | ⚠️ Score load fails | "Score not found in local storage. Import a MusicXML file..." | ✅ Yes (import file) |
| **Invalid MusicXML import** | ❌ Import fails | "Failed to parse MusicXML: {error}" | ✅ Yes (fix file) |
| **IndexedDB quota exceeded** | ❌ Save fails | "Storage quota exceeded. Delete old scores..." | ✅ Yes (delete scores) |

### Unexpected Failures (Bugs)

| Scenario | Expected Behavior | Indicates Bug In | Fix Priority |
|----------|-------------------|------------------|--------------|
| **Demo fails to load after online visit** | Should succeed | Precache config or demoLoader | P0 (critical) |
| **Network request during import** | Should not happen | ScoreViewer refactoring incomplete | P0 (critical) |
| **Offline banner shows wrong message** | Should say "all features work normally" | OfflineBanner component | P1 (high) |
| **Playback fails offline** | Should work (local synthesis) | Tone.js caching or init | P0 (critical) |

---

## Validation Contract

### Automated Tests

**Required tests** (from quickstart.md):

1. **Offline detection test**: `useOfflineDetection` hook responds to `online`/`offline` events
2. **Demo loader test**: `getExistingDemo()` returns cached demo, `loadBundledDemo()` loads from cache
3. **ScoreViewer test**: `loadScore()` only checks IndexedDB, no REST API calls
4. **Regression test**: Verify no `apiClient` method calls, no `syncLocalScoreToBackend` function

**Validation command**:
```bash
cd frontend
npm run test -- offline-mode.test.ts
npm run test -- offline-regression.test.ts
```

**Expected**: All tests pass.

---

### Manual Validation

**Required validation** (from quickstart.md):

1. **Precache verification**: Chrome DevTools → Application → Cache Storage → Verify demo in cache
2. **Offline demo load**: DevTools Network → Offline → Tap Demo → Verify zero requests
3. **Offline import**: Offline → Import MusicXML → Verify zero requests
4. **Offline playback**: Offline → Play score → Verify zero requests
5. **Banner message**: Offline → Verify message "You're offline — all features work normally"

**Validation checklist** (from quickstart.md):
- [ ] Demo loads offline after one prior online visit
- [ ] Demo loads instantly on second offline load (IndexedDB fast path)
- [ ] MusicXML import works offline
- [ ] Playback works offline
- [ ] Score load works offline (IndexedDB only)
- [ ] Score "not found" shows clear error (no REST API attempts)
- [ ] OfflineBanner shows updated message
- [ ] DevTools Network tab shows zero requests when offline

---

## Boundary Conditions

### Offline → Online Transition

**Contract**: When network returns, app MUST continue working without requiring reload.

**Behavior**:
- Banner disappears
- All features continue to work (no state reset)
- No automatic "sync to backend" (backend sync removed in Feature 025)

**Assertion**: Transition is **seamless** (user can continue working uninterrupted).

---

### Online → Offline Transition

**Contract**: When network drops, app MUST continue working without interruption.

**Behavior**:
- Banner appears
- All features continue to work (no state reset)
- In-flight network requests fail gracefully (should not happen in Feature 025 — no network requests for core features)

**Assertion**: Transition is **seamless** (user can continue working uninterrupted).

---

### Mixed Connectivity (Flaky Network)

**Contract**: App MUST handle intermittent connectivity without errors or interruptions.

**Scenario**: User has unstable WiFi that drops every few seconds.

**Expected Behavior**:
- Banner toggles online/offline rapidly (expected)
- No errors in console
- No failed network requests (core features don't use network)
- User can continue working uninterrupted

**Assertion**: App is **resilient** to network flakiness.

---

## Storage Boundaries

### What Works Offline (Guaranteed)

| Feature | Data Source | Offline-Safe? | Rationale |
|---------|-------------|---------------|-----------|
| **Demo load** | Service worker cache + IndexedDB | ✅ Yes | Precached file, local parse, local storage |
| **Import MusicXML** | File system + WASM + IndexedDB | ✅ Yes | No network involved |
| **Load score** | IndexedDB | ✅ Yes | Local storage only |
| **Playback** | Tone.js (local synthesis) | ✅ Yes | No audio files fetched |
| **Edit score** | Local state + IndexedDB | ✅ Yes | Local-only operations |
| **Delete score** | IndexedDB | ✅ Yes | Local storage only |

### What Requires Online (Expected)

| Feature | Data Source | Offline-Safe? | Rationale |
|---------|-------------|---------------|-----------|
| **Service worker install** | Network (first visit) | ❌ No | Cannot install SW without network |
| **App updates** | Network (new SW version) | ❌ No | Requires fetching new SW script |
| **Manual cache refresh** | Network | ❌ No | User-initiated, requires network |

### What No Longer Exists (Removed)

| Feature | Data Source | Status |
|---------|-------------|--------|
| **Backend sync** | REST API | ❌ REMOVED (Feature 025) |
| **Fetch score from server** | REST API | ❌ REMOVED (Feature 025) |
| **Create score on backend** | REST API | ❌ REMOVED (Feature 025) |

---

## Compatibility Contract

### Browser Support

**Contract**: Offline functionality MUST work on all browsers that support PWA features.

**Required browser APIs**:
- Service Workers (for precaching)
- IndexedDB (for score storage)
- Web Audio API (for playback via Tone.js)
- File API (for MusicXML import)
- `navigator.onLine` (for offline detection)

**Supported browsers**:
- ✅ Chrome 90+ (desktop and Android)
- ✅ Edge 90+
- ✅ Safari 14+ (iOS and macOS)
- ✅ Firefox 90+

**Known limitations**:
- iOS Safari: Service worker requires "Add to Home Screen" for full functionality
- Firefox: `navigator.onLine` may report false positives (browser quirk, not our bug)

---

## Security and Privacy Contract

### Offline Security

**Contract**: Offline data MUST be protected by browser same-origin policy.

**Guarantees**:
- IndexedDB data accessible only to same origin (https://musicore.app)
- Service worker cache accessible only to same origin
- No cross-site data leakage

**Assertions**:
- ✅ Scores stored offline cannot be accessed by other websites
- ✅ Offline functionality does not weaken security posture

---

### Privacy

**Contract**: Offline functionality MUST NOT send telemetry or analytics while offline.

**Guarantees**:
- Zero network requests when offline → Zero telemetry
- No analytics pings
- No error reporting to external services

**Assertions**:
- ✅ User's offline activity is private
- ✅ No tracking when offline

---

## Summary

**Core Behavioral Guarantee**: All features work **identically** online and offline.

**Key Contracts**:
- ✅ Demo loads offline (after first online visit)
- ✅ Import works offline (WASM + IndexedDB)
- ✅ Playback works offline (Tone.js local synthesis)
- ✅ Score load/edit/delete work offline (IndexedDB only)
- ✅ Banner shows reassuring message ("all features work normally")
- ✅ Zero network requests for core features
- ✅ Performance: offline ≥ online (no degradation)
- ✅ Reliability: offline > online (fewer failure modes)

**Failure Modes**:
- ❌ First offline visit fails (expected — SW not installed)
- ❌ Score not in IndexedDB fails (expected — clear error message)
- ❌ Invalid MusicXML fails (expected — WASM parser error)

**Validation**:
- ✅ Automated tests cover offline detection, demo load, score load
- ✅ Regression tests verify no REST API usage
- ✅ Manual validation checklist ensures zero network requests
