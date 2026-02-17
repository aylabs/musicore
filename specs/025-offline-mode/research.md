# Research: Offline Mode Parity

**Feature**: 025-offline-mode
**Purpose**: Resolve technical decisions for eliminating network dependencies in local operations
**Status**: Phase 0 Complete

## Overview

This feature makes all user-facing operations work identically offline and online by:
1. Precaching demo MusicXML in service worker
2. Removing REST API fallbacks for local operations
3. Eliminating backend sync requirement
4. Updating offline status messaging

No new technologies or patterns are introduced — all infrastructure already exists (PWA service worker from Feature 012, IndexedDB from Feature 011, WASM parsing from Feature 011). This feature is about **removing network dependencies**, not adding capabilities.

---

## Decision 1: Precaching Demo MusicXML in Service Worker

**Question**: How should the Canon in D demo MusicXML file be made available offline?

**Context**: 
- Current behavior: `DemoLoaderService.loadBundledDemo()` calls `fetch('/music/CanonD.musicxml')`
- Problem: On first offline visit (after PWA installation), the demo file is not in cache
- File location: `public/music/CanonD.musicxml` (~50KB)
- Service worker already precaches app shell, WASM module using Workbox `globPatterns`

**Options Considered**:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A. Add to Workbox globPatterns** | Simple 1-line config change; automatic versioning; cache-first by default | Relies on Vite/Workbox build-time file discovery | ✅ **SELECTED** |
| B. Manual precache in custom SW | Full control over caching logic | Requires maintaining custom service worker code; bypasses Workbox features | ❌ Unnecessary complexity |
| C. Bundle in WASM module | File always available, no fetch needed | Increases WASM bundle size; harder to update demo independently | ❌ Wrong responsibility boundary |
| D. Embed in IndexedDB at install | 100% offline guarantee | Requires install-time logic; adds IndexedDB writes during first run | ❌ Overengineering |

**Decision: Option A — Add `*.musicxml` to Workbox globPatterns**

**Rationale**:
- Workbox already manages precache lifecycle (install, update, cleanup)
- `globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,musicxml}']` ensures all MusicXML files in `public/` are cached
- Service worker installs the precache during the first online visit
- Subsequent offline visits have the demo file available from cache
- Zero custom service worker code needed
- Aligns with existing PWA infrastructure (Feature 012)

**Implementation Notes**:
- Update `frontend/vite.config.ts` → `VitePWA.workbox.globPatterns` to include `*.musicxml`
- Build verification: Check service worker precache manifest includes `/music/CanonD.musicxml`
- Test: Install PWA online → go offline → tap Demo → verify file loads from cache

**Constraints**:
- Requires one prior online visit (inherent browser limitation — service worker must be installed online)
- Demo file must be in `public/` directory (served by Vite as static asset)

**Alternative Rejected Details**:
- **Option B**: Custom service worker adds maintenance burden for no benefit when Workbox handles this automatically
- **Option C**: WASM module size (<500KB) is a performance constraint; adding ~50KB demo violates separation of concerns (demo is app content, not engine code)
- **Option D**: IndexedDB is for user-created/imported scores; demo is a built-in asset that should follow the same caching strategy as app shell

---

## Decision 2: Removing REST API Fallbacks

**Question**: How should REST API fallback code be handled — remove entirely or guard with offline checks?

**Context**:
- `ScoreViewer.tsx` has 3 REST API fallback patterns:
  1. `loadScore()`: Falls back to `apiClient.getScore(id)` when IndexedDB misses
  2. `syncLocalScoreToBackend()`: Makes 10+ REST calls to replicate imported score
  3. `createNewScore()`: Calls `apiClient.createScore()` (deprecated path)
- WASM engine already provides all local operations: `create_score()`, `add_instrument()`, etc.
- IndexedDB already provides local persistence: `saveScoreToIndexedDB()`, `loadScoreFromIndexedDB()`

**Options Considered**:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A. Remove REST fallbacks entirely** | Simplest code; clearest offline-first intent; no offline errors | Eliminates potential future server-side storage if needed | ✅ **SELECTED** |
| B. Guard with `navigator.onLine` checks | Preserves REST code for future use | `navigator.onLine` is unreliable (reports false positives); adds conditional complexity | ❌ Unreliable API |
| C. Try/catch network errors silently | Degrades gracefully | Hides errors from logging; REST calls still attempted (performance cost); users see lag | ❌ Degrades UX |
| D. Keep REST for "sync" feature | Future-proofs for multi-device sync | No current requirement; premature optimization; violates YAGNI | ❌ Speculative |

**Decision: Option A — Remove REST API fallbacks, use WASM + IndexedDB only**

**Rationale**:
- **Spec requirement (FR-003)**: "Backend sync MUST be removed or made completely optional" — spec explicitly mandates removal
- **Offline-first architecture** (Constitution Principle III): Local operations should never attempt network requests
- **Simplicity**: Fewer code paths = fewer bugs. If multi-device sync is needed later, it can be added as an explicit opt-in feature with proper conflict resolution
- **User experience**: No network timeout delays, no confusing error messages when offline
- **WASM usage**: Feature 011 already replaced REST API with WASM for core operations — this feature completes the migration

**Implementation Notes**:
- **File**: `frontend/src/components/ScoreViewer.tsx`
  1. `loadScore()`: Remove `apiClient.getScore()` fallback. If score not in IndexedDB, show "Score not found" message (FR-002)
  2. `syncLocalScoreToBackend()`: Delete entire function and all calls to it (FR-003)
  3. `createNewScore()`: Replace `apiClient.createScore()` with `createScore()` from WASM engine (FR-004)
- **Future-proofing**: `ScoreApiClient` class remains in codebase but unused — if multi-device sync is added later, the API client can be re-introduced with explicit user opt-in

**Alternative Rejected Details**:
- **Option B**: `navigator.onLine` only detects if the network interface is up, not if the server is reachable. A device can be "online" but behind a captive portal or firewall. False positives cause confusing "network error" messages.
- **Option C**: Silent catch creates worse UX — user sees loading spinners, timeout delays, then sudden errors. Better to fail fast with clear messaging.
- **Option D**: YAGNI violation. Multi-device sync requires conflict resolution, authentication, sync UI — far beyond current scope. If added later, the REST API layer already exists.

---

## Decision 3: OfflineBanner Messaging

**Question**: What message should the OfflineBanner display to communicate full offline capability?

**Context**:
- Current message: "You're offline. Changes will be saved locally."
- Problem: Sounds like degraded functionality — doesn't affirm that all features work
- User Story 4 (P3): Offline status clarity

**Options Considered**:

| Option | Message | Assessment | Decision |
|--------|---------|------------|----------|
| **A. Neutral affirmation** | "You're offline — all features work normally" | Clear, direct, non-alarming | ✅ **SELECTED** |
| B. Feature list | "You're offline. Import, demo, and playback still work." | More informative | ❌ Too verbose for banner |
| C. Positive spin | "Offline mode active — full functionality available" | Sounds technical | ❌ Unnatural phrasing |
| D. Remove banner entirely | No messaging | No redundant UI | ❌ Users expect offline indicators |

**Decision: Option A — "You're offline — all features work normally"**

**Rationale**:
- **Clarity**: Directly addresses the concern that offline = degraded
- **Brevity**: Fits in a compact banner without overwhelming the screen
- **Tone**: Neutral, not alarming or overly enthusiastic
- **Truthfulness**: After this feature, the statement is factually accurate

**Implementation Notes**:
- Update `frontend/src/components/OfflineBanner.tsx` → message text
- Consider adding a dismiss button (optional enhancement) so users can hide the banner once they understand offline works
- CSS may need small adjustments if message length changes significantly

**Alternative Rejected Details**:
- **Option B**: Listing features in a banner is cramped; if features change, the message must be updated
- **Option C**: "Offline mode active" sounds like a technical system state rather than user-facing reassurance
- **Option D**: Users expect visual feedback when connectivity status changes; removing the banner entirely would be surprising

---

## Decision 4: Offline Testing Strategy

**Question**: How should offline functionality be validated during development and CI?

**Context**:
- Offline behavior is hard to test in CI (requires service worker + cache simulation)
- Manual testing is reliable but not automated
- Constitution Principle V requires tests for all changes
- Constitution Principle VII requires regression tests for bugs

**Approach: Multi-layer testing strategy**

| Test Layer | What It Validates | Automation Level | Coverage |
|------------|-------------------|------------------|----------|
| **Unit tests** | Individual functions (e.g., `DemoLoaderService` no longer calls `fetch()`) | ✅ Automated (Vitest) | Function-level |
| **Integration tests** | Service worker precache manifest includes demo file | ✅ Automated (build output inspection) | Build-time verification |
| **Offline regression tests** | Known bugs fixed: demo loads offline, no REST errors | ✅ Automated (Vitest with mocked `navigator.onLine`) | Feature-level |
| **Manual validation** | Complete offline flow: install → offline → demo + import + play | ⚠️ Manual (documented in quickstart.md) | End-to-end UX |
| **Network monitoring** | Zero network requests during local operations | ⚠️ Manual (Chrome DevTools Network tab) | Validation |

**Implementation Notes**:
- **Unit tests** (`offline-mode.test.ts`):
  - Mock `navigator.onLine` to simulate offline state
  - Verify `DemoLoaderService` loads from cache/IndexedDB, not `fetch()`
  - Verify `ScoreViewer` does not call `apiClient` methods for local operations
- **Regression tests** (`offline-regression.test.ts`):
  - Reproduce bug: "Demo fails on first offline visit" → expect demo to load from precached file
  - Reproduce bug: "REST fallback throws error offline" → expect no REST calls
- **Manual validation checklist** (in `quickstart.md`):
  ```markdown
  ## Offline Validation Checklist
  1. Visit app online (install service worker)
  2. Enable airplane mode
  3. Open PWA from home screen
  4. ✅ Tap "Demo" → Canon in D loads and plays
  5. ✅ Tap "Import Score" → select local MusicXML → score displays
  6. ✅ Play imported score → audio works, highlighting works
  7. ✅ Check DevTools Network tab → zero requests made
  8. ✅ OfflineBanner shows "all features work normally"
  ```

**Rationale**:
- Automated tests catch regressions at code level (Principle V + VII compliance)
- Manual validation ensures real-world offline UX works (PWA installation, service worker behavior)
- Network monitoring verifies no accidental REST calls leak through

---

## Decision 5: ScoreApiClient Retention

**Question**: Should `ScoreApiClient` class be deleted or retained for potential future features?

**Context**:
- `ScoreApiClient` provides REST API methods: `createScore()`, `getScore()`, `addInstrument()`, etc.
- After this feature, no user-facing code paths call these methods
- Spec "Out of Scope" mentions multi-device sync as a potential future feature
- Constitution emphasizes simplicity (don't keep unused code)

**Options Considered**:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A. Keep class, delete usage** | Easy to restore if multi-device sync added | Unused code increases maintenance | ✅ **SELECTED** |
| B. Delete class and all tests | Cleaner codebase today | Must rewrite if server sync needed | ❌ Too aggressive |
| C. Move to archive/deprecated | Signals "not in use" clearly | Adds complexity (where to archive?) | ❌ Unnecessary ceremony |

**Decision: Option A — Keep `ScoreApiClient` class, remove all usage from primary code paths**

**Rationale**:
- **Minimal cost**: The class is ~300 lines, well-tested, stable
- **Future-proofing**: Multi-device sync is explicitly mentioned in spec "Out of Scope" — keeping the API layer avoids rewriting if that feature is added
- **Clear boundaries**: If the class exists but is unused, it's easy to verify via grep or static analysis
- **Constitution compliance**: While simplicity is valued, keeping a small, stable adapter for potential future use is not "complexity" — it's prudent architecture

**Implementation Notes**:
- Add a comment to `ScoreApiClient` class:
  ```typescript
  /**
   * REST API client for backend communication.
   * NOTE: As of Feature 025, this client is NOT used for primary user flows.
   * All local operations (import, demo, score creation) use WASM + IndexedDB.
   * This client is retained for potential future multi-device sync features.
   */
  ```
- Audit codebase to ensure no calls to `apiClient` methods exist in ScoreViewer or DemoLoader
- Keep existing unit tests for `ScoreApiClient` — they serve as API contract documentation

**Alternative Rejected Details**:
- **Option B**: Too aggressive. If multi-device sync is added, we'd have to rebuild the entire API client and write tests from scratch. The cost of maintenance is low (class is stable).
- **Option C**: Adding an `archive/` or `deprecated/` folder creates confusion about whether the code is maintained. Better to keep it in place with clear documentation.

---

## Summary of Research Decisions

| Decision | Choice | Key Rationale |
|----------|--------|---------------|
| **Demo precaching** | Add `*.musicxml` to Workbox globPatterns | Simple, automatic, aligns with existing PWA infrastructure |
| **REST fallbacks** | Remove entirely, use WASM + IndexedDB only | Offline-first architecture, spec requirement, cleaner code |
| **Banner messaging** | "You're offline — all features work normally" | Clear, brief, non-alarming, factually accurate post-implementation |
| **Testing strategy** | Multi-layer: unit tests + regression tests + manual validation | Balances automation (Principle V) with real-world offline UX verification |
| **ScoreApiClient** | Keep class, remove usage | Low maintenance cost, future-proofing for multi-device sync |

**No NEEDS CLARIFICATION items remain.** All technical decisions are resolved and documented. Ready for Phase 1 (data model, contracts, quickstart).
