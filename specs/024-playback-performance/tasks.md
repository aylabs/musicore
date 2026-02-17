# Tasks: Playback & Display Performance Optimization

**Input**: Design documents from `/specs/024-playback-performance/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included — Constitution Principle V (TDD) requires test-first development; spec mandates regression tests and performance benchmarks as CI checks.

**Organization**: Tasks grouped by user story to enable independent implementation and testing. Each user story phase is a complete, independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths included in every task description

## Path Conventions

- **Web app**: `frontend/src/` for source, tests colocated (`.test.ts` next to source)

---

## Phase 1: Setup

**Purpose**: Verify environment and establish performance baseline

- [X] T001 Verify dev environment: run `cd frontend && npm test` and confirm all existing tests pass
- [X] T002 Establish performance baseline: record current frame timing during Moonlight Sonata playback with Chrome DevTools Performance profiler (document in commit message for before/after comparison)

---

## Phase 2: Foundational (Core Performance Infrastructure)

**Purpose**: Create the new performance-optimized modules that ALL user stories depend on. These are pure, independently testable units with no dependencies on existing playback code.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### New Modules

- [X] T003 [P] Create HighlightIndex class with binary search in frontend/src/services/highlight/HighlightIndex.ts
  - Implement `IHighlightIndex` from contracts/highlight-performance.ts
  - `build()`: sort notes by startTick, precompute maxDuration. O(n log n)
  - `findPlayingNoteIds()`: binary search + bounded backward scan. O(log n + k)
  - `clear()`: release references for GC
  - See quickstart.md Step 2.1 and data-model.md HighlightIndex entity for full specification

- [X] T004 [P] Create computeHighlightPatch pure function in frontend/src/services/highlight/computeHighlightPatch.ts
  - Implement `ComputeHighlightPatch` type from contracts/highlight-performance.ts
  - Takes `prevIds: ReadonlySet<string>` and `currentIds: readonly string[]`
  - Returns `HighlightPatch` with `added`, `removed`, `unchanged` fields
  - Must be a pure function with zero side effects

- [X] T005 [P] Create deviceDetection utility in frontend/src/utils/deviceDetection.ts
  - Implement `DetectDeviceProfile` type from contracts/highlight-performance.ts
  - Detection: `matchMedia('(pointer: coarse)')` + `matchMedia('(hover: none)')` → mobile; `innerWidth <= 768` fallback
  - Returns `DeviceProfile` with `isMobile`, `targetFrameIntervalMs` (33/16), `frameBudgetMs` (8/12)
  - See research.md Topic 4 for decision rationale

- [X] T006 [P] Create FrameBudgetMonitor class in frontend/src/services/highlight/FrameBudgetMonitor.ts
  - Implement `IFrameBudgetMonitor` from contracts/highlight-performance.ts
  - `startFrame()` / `endFrame()`: measure elapsed time via `performance.now()`
  - Degradation after 5 consecutive over-budget frames; recovery after 5 within-budget frames
  - `shouldSkipFrame()`: returns true on alternating frames when degraded (halves update rate)
  - See data-model.md FrameBudgetMonitor entity for state machine

### Structural Rendering Prep

- [X] T007 Add data-note-id attributes to SVG note glyphs in frontend/src/components/LayoutRenderer.tsx
  - In `renderGlyph()`: when glyph has a source_reference mapping to a note ID via `sourceToNoteIdMap`, set `element.setAttribute('data-note-id', noteId)`
  - Verify via DevTools: note glyphs have `data-note-id="<uuid>"` attributes after loading any score
  - See quickstart.md Step 1.1

- [X] T008 [P] Add .highlighted CSS class styling in frontend/src/components/LayoutRenderer.css
  - Add `.layout-glyph.highlighted { fill: #4A90E2; stroke: #4A90E2; transition: fill 50ms ease-out, stroke 50ms ease-out; }`
  - Must produce identical visual appearance to current inline highlight styling (SC-010)
  - See quickstart.md Step 1.2

### Unit Tests (TDD — write before user story implementation)

- [X] T009 [P] Unit tests for HighlightIndex in frontend/src/services/highlight/HighlightIndex.test.ts
  - Test cases: empty index returns [], single note (before/during/after), chord (same startTick), non-overlapping sequential, long pedal tone overlapping rapid notes
  - Performance assertion: 10,000 notes → findPlayingNoteIds < 0.1ms per query
  - See quickstart.md Step 2.1 test cases

- [X] T010 [P] Unit tests for computeHighlightPatch in frontend/src/services/highlight/computeHighlightPatch.test.ts
  - Test cases: identical sets → unchanged=true, empty→some → all added, some→empty → all removed, partial overlap → correct added/removed

- [X] T011 [P] Unit tests for FrameBudgetMonitor in frontend/src/services/highlight/FrameBudgetMonitor.test.ts
  - Test cases: within budget → isDegraded=false, 5 consecutive overruns → isDegraded=true, recovery after 5 within-budget, shouldSkipFrame alternates when degraded

- [X] T012 [P] Unit tests for deviceDetection in frontend/src/utils/deviceDetection.test.ts
  - Mock `matchMedia` and `window.innerWidth`
  - Test cases: desktop (pointer:fine, hover:hover, >768px), tablet (pointer:coarse, hover:none, >768px), phone (pointer:coarse, hover:none, ≤768px), fallback (small viewport overrides fine pointer)

**Checkpoint**: All foundational modules created, tested, and passing. No existing code modified yet (except data-note-id attrs). User story implementation can now begin.

---

## Phase 2b: Regression Tests for Known Bugs (Constitution VII)

**Purpose**: Document known bugs and create failing regression tests BEFORE implementing fixes. Per Constitution Principle VII, every error must have a test that reproduces it before the fix is applied.

- [X] T032 [BUG] [US1] Regression test: Canon in D audio glitches on mobile phones
  - **Symptom**: Audible glitches, pops, and timing irregularities during Canon in D playback on mobile phones
  - **Root Cause**: Full SVG DOM teardown/rebuild on every highlight change (LayoutRenderer.renderSVG() called 60x/sec) competes with Tone.js audio scheduling
  - **Affected Area**: frontend/src/components/LayoutRenderer.tsx — componentDidUpdate triggers renderSVG() for highlight-only changes
  - Create test in frontend/src/components/LayoutRenderer.test.tsx (or a dedicated regression test file) that asserts: when only highlightedNoteIds changes, renderSVG() is NOT called
  - Test MUST fail against current code (renders on every prop change)
  - Passes after T013 (shouldComponentUpdate gate) is implemented

- [X] T033 [BUG] [US2] Regression test: Moonlight Sonata (4932 notes) playback too slow on tablets with highlighting active
  - **Symptom**: Playback tempo degrades severely when auto-scrolling and highlighting are active on large scores
  - **Root Cause**: O(n) linear scan of all notes per frame + full SVG rebuild + 60Hz React setState
  - **Affected Area**: frontend/src/services/highlight/computeHighlightedNotes.ts, frontend/src/services/playback/MusicTimeline.ts
  - Create test that asserts: highlight computation for a 5000-note score completes in < 1ms (currently O(n) scan is much slower)
  - Test MUST fail against current O(n) implementation
  - Passes after T003 (HighlightIndex binary search) and T019 (delegation) are implemented

- [X] T034 [BUG] Regression test: Duplicate highlight computation paths
  - **Symptom**: Two independent code paths both scan all notes: computeHighlightedNotes (useNoteHighlight) and NoteHighlightService.getPlayingNoteIds (usePlaybackScroll)
  - **Root Cause**: Highlight logic duplicated across two modules without consolidation
  - **Affected Area**: frontend/src/services/highlight/computeHighlightedNotes.ts, frontend/src/services/playback/NoteHighlightService.ts
  - Create test that verifies only ONE code path computes highlighted notes (e.g., grep-based or import-graph assertion)
  - Test MUST fail against current code (two paths exist)
  - Passes after T021 (NoteHighlightService removal) is implemented

**Checkpoint**: All 3 known bugs documented and have failing regression tests. Fixes proceed in user story phases below.

---

## Phase 3: User Story 1 — Glitch-Free Playback on Mobile Phones (Priority: P1) 🎯 MVP

**Goal**: Canon in D plays on a mid-range phone with zero audio glitches while highlighting and auto-scrolling are active.

**Independent Test**: Load Canon in D on Pixel 7a / iPhone SE → play full score 3 times → verify zero audible glitches (SC-001).

### Implementation for User Story 1

- [X] T013 [US1] Add shouldComponentUpdate gate for highlight-only changes in frontend/src/components/LayoutRenderer.tsx
  - Return `false` when only `highlightedNoteIds` or `selectedNoteId` changed
  - Return `true` for `layout`, `config`, `viewport`, `sourceToNoteIdMap` changes
  - This prevents React from calling `render()` → `renderSVG()` on every tick
  - See quickstart.md Step 1.3

- [X] T014 [US1] Implement updateHighlights() with diff-based CSS class toggling in frontend/src/components/LayoutRenderer.tsx
  - Use `HighlightIndex.findPlayingNoteIds(currentTick)` to get active note IDs
  - Call `computeHighlightPatch(prevHighlightedIds, currentIds)` for the diff
  - Early return if `patch.unchanged`
  - For `patch.removed`: `querySelector('[data-note-id="ID"]').classList.remove('highlighted')`
  - For `patch.added`: `querySelector('[data-note-id="ID"]').classList.add('highlighted')`
  - Update `prevHighlightedIds` Set
  - See quickstart.md Step 1.4 and data-model.md HighlightPatch flow

- [X] T015 [US1] Add rAF self-scheduling highlight loop in frontend/src/components/LayoutRenderer.tsx
  - Add instance fields: `rafId`, `lastFrameTime`, `prevHighlightedIds`, `frameInterval`, `highlightIndex`
  - `startHighlightLoop()`: self-scheduling `requestAnimationFrame` loop with frame-skipping
  - `stopHighlightLoop()`: `cancelAnimationFrame(rafId)` on unmount or playback stop
  - Call from `componentDidMount` / `componentWillUnmount`
  - See quickstart.md Step 1.5 and research.md Topic 1

- [X] T016 [US1] Integrate FrameBudgetMonitor into rAF loop with audio-first degradation in frontend/src/components/LayoutRenderer.tsx
  - Wrap `updateHighlights()` with `frameBudgetMonitor.startFrame()` / `endFrame()`
  - Check `shouldSkipFrame()` before doing highlight work
  - Audio-first policy: when degraded, skip visual updates entirely (FR-013)
  - Mobile budget: 8ms, desktop: 12ms

- [X] T017 [US1] Apply device-adaptive frame interval (33ms mobile / 16ms desktop) in frontend/src/components/LayoutRenderer.tsx
  - Call `detectDeviceProfile()` in constructor or `componentDidMount`
  - Set `this.frameInterval = profile.targetFrameIntervalMs`
  - Mobile processes every other rAF callback (30 Hz); desktop processes every callback (60 Hz)
  - See FR-006

**Checkpoint**: Canon in D plays on a mobile phone with zero audio glitches. `renderSVG()` is NOT called during playback — only `updateHighlights()` runs. This is the MVP: deploy/demo here if needed.

---

## Phase 4: User Story 2 — Fluent Large Score Playback on Tablets (Priority: P1)

**Goal**: Moonlight Sonata (4932 notes) plays on tablets at correct tempo with synchronized highlighting and smooth auto-scrolling. Extends to 10,000 notes on supported devices.

**Independent Test**: Load Moonlight Sonata on iPad 9th gen / Samsung Tab A8 → play full score → verify tempo within ±2% of specified BPM with highlighting active (SC-002).

### Implementation for User Story 2

- [X] T018 [US2] Decouple tick broadcast: replace setInterval+setState with rAF+ref in frontend/src/services/playback/MusicTimeline.ts
  - Replace `setInterval(callback, 16)` + `setCurrentTick(setState)` with a ref-based `currentTick`
  - Expose `tickRef` that LayoutRenderer's rAF loop reads directly (no React re-render)
  - Update React state only when highlighted note set changes (for components that need it), not every 16ms
  - See quickstart.md Step 2.3 and FR-005

- [X] T019 [US2] Update computeHighlightedNotes.ts to delegate to HighlightIndex in frontend/src/services/highlight/computeHighlightedNotes.ts
  - Replace O(n) linear scan with delegation to `HighlightIndex.findPlayingNoteIds()`
  - Maintain the same function signature for backward compatibility during migration
  - See FR-003 and FR-011

- [X] T020 [US2] Update useNoteHighlight.ts with stable Set reference in frontend/src/services/highlight/useNoteHighlight.ts
  - Only create a new `Set<string>` when contents actually change (compare by size + iteration)
  - Use the `HighlightIndex` for note lookup instead of inline computation
  - Eliminate per-frame allocations when highlighted notes are stable
  - See FR-004 and research.md Topic 3

- [X] T021 [US2] Remove NoteHighlightService.ts and update all imports in frontend/src/services/playback/NoteHighlightService.ts
  - Consolidate `NoteHighlightService.getPlayingNoteIds()` functionality into HighlightIndex
  - Update all files that import from NoteHighlightService to use HighlightIndex
  - Remove the file and its test file (NoteHighlightService.test.ts)
  - See FR-011

- [X] T022 [P] [US2] Pass highlightedNoteIds via ref instead of props in frontend/src/components/layout/LayoutView.tsx
  - Change from React props to a ref that LayoutRenderer reads directly
  - Prevents React re-render cascade from ScoreViewer → LayoutView → LayoutRenderer

- [X] T023 [US2] Update usePlaybackScroll to use consolidated highlight source and rAF-driven scroll in frontend/src/services/hooks/usePlaybackScroll.ts
  - Remove dependency on NoteHighlightService (use HighlightIndex instead)
  - Switch scroll updates to rAF cadence matching highlight updates
  - See plan.md source code structure

**Checkpoint**: Moonlight Sonata (4932 notes) plays at correct tempo on tablets. React DevTools shows minimal re-renders during playback. CPU profiler shows ≥50% reduction in rendering time.

---

## Phase 5: User Story 3 — Responsive Highlight Updates Without Jank (Priority: P2)

**Goal**: Highlight transitions are visually smooth at ≥30 FPS mobile / ≥60 FPS desktop, even during fast passages and chords.

**Independent Test**: Play a score with rapid 16th-note passages on a phone → record screen at 120fps → verify no frames with wrong/lagging highlights (SC-003 criteria).

### Implementation for User Story 3

- [X] T024 [US3] Re-apply current highlight state after structural render in frontend/src/components/LayoutRenderer.tsx
  - After `renderSVG()` rebuilds SVG (viewport change, layout change, resize), immediately re-apply `prevHighlightedIds` since all `data-note-id` elements were recreated
  - Call `updateHighlights()` at end of `componentDidUpdate` when structural render occurred
  - See quickstart.md Step 3.3

- [X] T025 [US3] Ensure chord notes (6+ simultaneous) highlight in same visual frame in frontend/src/components/LayoutRenderer.tsx
  - Verify `HighlightIndex.findPlayingNoteIds()` returns all notes at the same tick atomically
  - Apply all highlight changes in a single `updateHighlights()` call (no batching across frames)
  - Test with a scored chord passage: all chord tones highlight together

**Checkpoint**: Highlight transitions are smooth on all devices. Chord notes highlight simultaneously. Resizing during playback preserves correct highlights.

---

## Phase 6: User Story 4 — Efficient Battery and Resource Usage (Priority: P3)

**Goal**: ≥50% CPU reduction during playback on mobile devices. Minimal per-frame GC pressure. No device overheating during extended playback.

**Independent Test**: Profile CPU during 2-minute Moonlight Sonata playback on mobile → compare to Phase 1 baseline → verify ≥50% reduction in rendering CPU time (SC-007).

### Implementation for User Story 4

- [X] T026 [P] [US4] Convert ScrollController to rAF-based throttling in frontend/src/services/playback/ScrollController.ts
  - Replace any setInterval-based scroll updates with rAF-driven updates
  - Respect same frame interval as highlights (33ms mobile / 16ms desktop)
  - See quickstart.md Step 3.2

- [X] T027 [US4] Decouple auto-scroll from React state in frontend/src/pages/ScoreViewer.tsx
  - Remove scroll-related setState calls that trigger re-renders during playback
  - Use refs or direct DOM manipulation for scroll position updates
  - Preserve manual scroll override: auto-scroll disables on user scroll, re-enables on playback restart (FR-010, SC-009)

**Checkpoint**: CPU usage during Moonlight Sonata playback is ≥50% lower than baseline. JavaScript heap allocation timeline shows no per-frame Set/Array allocations during stable highlighting.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance validation, regression prevention, documentation

- [X] T028 [P] Add performance benchmark test (highlight update <4ms for 10K notes) in frontend/src/services/highlight/HighlightIndex.bench.ts
  - Vitest bench mode or `performance.now()` assertion
  - 10,000 notes: `findPlayingNoteIds()` < 0.1ms, full `updateHighlights()` loop < 4ms
  - Serves as CI regression check per SC-003

- [X] T029 [P] Update existing playback and highlight tests for refactored modules
  - Update frontend/src/services/playback/MusicTimeline.test.ts for rAF+ref pattern
  - Update frontend/src/services/playback/ScrollController.test.ts for rAF-based throttling
  - Update frontend/src/services/hooks/usePlaybackScroll.test.ts for consolidated highlight source
  - Verify all existing E2E playback tests pass unmodified (SC-006)

- [X] T030 Run quickstart.md validation checklist against implemented code
  - Walk through all validation items in quickstart.md "Validation Checklist"
  - Verify: Canon in D mobile, Moonlight Sonata tablet, no renderSVG during playback, <4ms highlight, minimal re-renders, E2E pass, manual scroll, seek, pause/resume, tempo change
  - **SC-008 verification**: Measure time from pressing Play to first audible note on a mobile device — must be under 500ms (no regression from optimization overhead)

- [X] T031 [P] Update FEATURES.md with 024-playback-performance feature entry

---

## Phase 8: Post-Implementation Fixes

**Purpose**: Integration testing revealed several issues in the two-tier rendering architecture that required iterative fixes. These tasks document the bugs discovered and their resolutions.

### ESLint & Build Fixes

- [X] T035 Fix ESLint react-hooks/refs violations in MusicTimeline.ts (bc381bd)
  - **Problem**: `react-hooks/refs` rule flagged intentional `tickSourceRef.current` access during render and ref dependencies
  - **Resolution**: Added targeted `/* eslint-disable react-hooks/refs */` directives around architectural ref patterns
  - **File**: frontend/src/services/playback/MusicTimeline.ts

### Playback Stability Fixes

- [X] T036 Fix mobile jitter caused by async tick status sync (0cd1ff7)
  - **Problem**: `tickSource.status` synchronized via `useEffect` (async/batched) instead of during render, causing 1-frame lag
  - **Resolution**: Moved `tickSourceRef.current` status sync to synchronous render-time assignment in MusicTimeline.ts
  - **Files**: frontend/src/services/playback/MusicTimeline.ts, frontend/vite.config.ts (added `server.host: '0.0.0.0'` for mobile testing)

### Scroll & Viewport Fixes

- [X] T037 Add vertical auto-scroll for multi-instrument playback (d52293d)
  - **Problem**: Play View did not scroll vertically to follow current measure; used container-based scroll listeners but Play View renders in window scroll context
  - **Resolution**: Updated pages/ScoreViewer.tsx to use `window.addEventListener('scroll', ...)` and `window.scrollY` with `window.innerHeight` for viewport-based visibility
  - **File**: frontend/src/pages/ScoreViewer.tsx

- [X] T038 Fix auto-scroll losing track of current measure at ~measure 50 (9ba84ea)
  - **Problem**: Auto-scroll lost playback position after ~50 measures due to incorrect system position computation (relative to viewport instead of document)
  - **Resolution**: Fixed scroll tracking logic to compute system positions relative to the document
  - **File**: frontend/src/pages/ScoreViewer.tsx

### Highlight Rendering Fixes

- [X] T039 Fix stale highlights persisting after scroll — initial cleanup (003888e)
  - **Problem**: Highlights remained on notes no longer playing after scrolling; InstrumentList had unnecessary vertical scroll code
  - **Resolution**: Fixed highlight cleanup on scroll, reverted InstrumentList vertical scroll code
  - **Files**: frontend/src/pages/ScoreViewer.tsx, frontend/src/components/ScoreViewer.tsx

- [X] T040 Fix stale highlights via tickSourceRef live ref (5795d8c)
  - **Problem**: `shouldComponentUpdate` blocked `tickSource` prop updates (by design), so rAF loop read frozen `this.props.tickSource`. Additionally `ScoreViewer` component was not passing tickSourceRef through the chain.
  - **Resolution**: Exposed `tickSourceRef` (live `useRef<ITickSource>`) from MusicTimeline.ts. Threaded through: ScoreViewer → LayoutView → LayoutRenderer. rAF loop reads `tickSourceRef.current` instead of frozen props.
  - **Files**: frontend/src/services/playback/MusicTimeline.ts, frontend/src/components/layout/LayoutView.tsx, frontend/src/components/LayoutRenderer.tsx, frontend/src/components/ScoreViewer.tsx

- [X] T041 Remove inline highlight colors from renderGlyph — dual-highlight conflict (22677be)
  - **Problem**: `renderGlyphRun` baked highlight colors into SVG `fill` attributes during structural renders; rAF loop only toggled CSS `.highlighted` classes. Inline `fill` has higher specificity than CSS, so class removal had no visible effect.
  - **Resolution**: Removed all inline highlight color logic from `renderGlyph()`. CSS `.highlighted` class with `!important` became sole mechanism. Added `polygon.highlighted` for beams.
  - **Files**: frontend/src/components/LayoutRenderer.tsx, frontend/src/components/LayoutRenderer.css

### Scroll Fight Loop Fix

- [X] T042 Fix scroll fight loop at system boundaries — isAutoScrolling approach (941443a)
  - **Problem**: `scrollToHighlightedSystem` called every ~100ms, each call cancelling and restarting the 400ms ease-out animation, causing jittering at system boundaries
  - **Resolution (reverted)**: Added `isAutoScrolling` flag to suppress `updateViewport()` during animation. Caused regression: flag always true → viewport never updates → highlights broken in imported scores.
  - **File**: frontend/src/pages/ScoreViewer.tsx

- [X] T043 Fix scroll fight loop — animation dedup approach (23d95af)
  - **Problem**: T042's `isAutoScrolling` was always true during playback, preventing viewport updates and breaking highlights beyond initial view
  - **Resolution**: Replaced `isAutoScrolling` with `autoScrollTargetSystem` tracking. Animation only restarted when target system changes. Viewport updates never suppressed. Increased `SCROLL_THRESHOLD` from 4px to 20px.
  - **File**: frontend/src/pages/ScoreViewer.tsx

**Checkpoint**: All post-implementation issues resolved. 812 tests passing. Highlights work correctly in both demo and imported scores. Auto-scroll follows playback without fight loops.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — can start immediately after Phase 2
- **US2 (Phase 4)**: Depends on Foundational — can start after Phase 2 (parallel with US1 if different developers, but sequential is safer since both modify LayoutRenderer.tsx)
- **US3 (Phase 5)**: Depends on US1 (Phase 3) — needs the rAF loop and updateHighlights() to be in place
- **US4 (Phase 6)**: Depends on Foundational — can start in parallel with US1/US2 (different files: ScrollController, ScoreViewer)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    │
    ▼
Phase 2: Foundational ──── BLOCKS ALL ────┐
    │                                      │
    ▼                                      ▼
Phase 3: US1 (Mobile Glitch-Free) 🎯   Phase 6: US4 (Battery) [P — different files]
    │                                      
    ▼                                      
Phase 4: US2 (Tablet Large Score)          
    │                                      
    ▼                                      
Phase 5: US3 (Smooth Highlights)           
    │                                      
    ▼                                      
Phase 7: Polish                            
```

### Critical File Ownership (prevents parallel conflicts)

| File | Modified By | Sequential Constraint |
|------|-------------|----------------------|
| `LayoutRenderer.tsx` | T007, T013–T017, T024–T025 | US1 before US3 (same file, extending methods) |
| `MusicTimeline.ts` | T018 | US2 only |
| `computeHighlightedNotes.ts` | T019 | US2 only |
| `useNoteHighlight.ts` | T020 | US2 only |
| `NoteHighlightService.ts` | T021 (REMOVE) | US2 only, after T019–T020 |
| `LayoutView.tsx` | T022 | US2, can parallel with US1 |
| `usePlaybackScroll.ts` | T023 | US2, after T021 |
| `ScrollController.ts` | T026 | US4, independent file |
| `ScoreViewer.tsx` | T027 | US4, independent file |

### Within Each User Story

1. Foundation modules (T003–T006) before integration (T013+)
2. Tests (T009–T012) before or alongside implementation
3. shouldComponentUpdate (T013) before updateHighlights (T014)
4. updateHighlights (T014) before rAF loop (T015)
5. rAF loop (T015) before FrameBudget integration (T016) and device detection (T017)
6. Tick decoupling (T018) before highlight consolidation (T019–T021)
7. NoteHighlightService removal (T021) after all code using it is updated

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
```
T003 (HighlightIndex) ──┐
T004 (computeHighlightPatch) ──┤── All [P]: different new files
T005 (deviceDetection) ──┤
T006 (FrameBudgetMonitor) ──┤
T008 (.highlighted CSS) ──┘

T009 (HighlightIndex tests) ──┐
T010 (patch tests) ──┤── All [P]: different test files
T011 (budget tests) ──┤
T012 (device tests) ──┘
```

**Cross-Story Parallelism**:
```
US1 (LayoutRenderer changes) ║ US4 (ScrollController + ScoreViewer)
─ T013–T017                   ║ T026–T027
─ Same file cluster            ║ Different file cluster
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T012)
3. Complete Phase 3: User Story 1 (T013–T017)
4. **STOP and VALIDATE**: Play Canon in D on a phone — zero audio glitches?
5. Deploy/demo if ready — this alone solves the most critical user-facing bug

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. **Add US1** → Test on mobile → Deploy (MVP! Fixes audio glitches)
3. **Add US2** → Test on tablet with Moonlight Sonata → Deploy (Fixes large score playback)
4. **Add US3** → Test rapid passages → Deploy (Visual polish)
5. **Add US4** → Profile battery/CPU → Deploy (Efficiency)
6. Polish → Benchmarks, docs, validation → Final release

### Risk Mitigation

- **LayoutRenderer.tsx is the hot file**: 5 tasks modify it sequentially. Plan commits carefully.
- **NoteHighlightService removal (T021)**: Wait until all consumers are updated (T019, T020, T023).
- **Existing E2E tests**: Run after each phase to catch regressions early (SC-006).
