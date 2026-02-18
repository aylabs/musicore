# Tasks: Playback UI Fixes

**Input**: Design documents from `/specs/026-playback-ui-fixes/`  
**Prerequisites**: [plan.md](plan.md) ✅ | [spec.md](spec.md) ✅ | [research.md](research.md) ✅ | [data-model.md](data-model.md) ✅  
**Branch**: `026-playback-ui-fixes`  
**Generated**: 2026-02-18

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in every task description

## User Stories

| Story | Priority | Title | Independent Test |
|-------|----------|-------|-----------------|
| US1 | P1 🎯 MVP | Replay Resets Cleanly | Play to end → press Replay → verify clean start, no stale state |
| US2 | P2 | Instrument Labels Always Visible | Load multi-instrument score → verify labels never clipped |
| US3 | P3 | Return to Start Button | Play to end → press ⏮ → view at measure 1, audio stopped |
| US4 | P4 | Score Container Fits Viewport After Playback | Play to end → inspect DOM → no overflow or clipping |

---

## Phase 1: Setup (Test Directory Structure)

**Purpose**: Ensure test directories exist for the three new test files. No new npm dependencies required.

- [ ] T001 Verify/create test subdirectories: `frontend/tests/services/`, `frontend/tests/components/`, `frontend/tests/pages/` (run `mkdir -p` as needed; directories may already exist)

**Checkpoint**: Test directories ready — user story test files can now be created

---

## Phase 2: Foundational (Blocking Prerequisites)

*No foundational phase required for this feature. All four bugs are in independent files with no shared infrastructure to set up. User story phases may begin directly after Phase 1.*

---

## Phase 3: User Story 1 — Replay Resets Cleanly (Priority: P1) 🎯 MVP

**Goal**: Fix the natural-end timeout in `MusicTimeline.ts` so that when playback ends without user intervention, Tone.js Transport and the scheduler are fully cleaned up — preventing overlapping audio on subsequent replay.

**Independent Test**: Play a score to completion without pressing Stop. Press Replay. Verify only the new playback is heard (no doubled notes, no ghost schedules), playback status shows "playing", and the score view is at measure 1.

### Tests for User Story 1

> **Write test FIRST — verify it FAILS before implementing the fix.**

- [ ] T002 [US1] Write failing replay cleanup tests in `frontend/tests/services/MusicTimeline.replay.test.ts`
  - Test: natural-end timeout calls `adapter.stopAll()` before setting `status='stopped'`
  - Test: natural-end timeout calls `scheduler.clearSchedule()` before setting `status='stopped'`
  - Test: `play()` after natural end does not produce overlapping scheduled events
  - Test: `pinnedStartTickRef` is `null` after natural end
  - Test: replay starts from tick=0 (first note of the score)

### Implementation for User Story 1

- [ ] T003 [US1] Fix natural-end timeout in `frontend/src/services/playback/MusicTimeline.ts`
  - Inside the `window.setTimeout` natural-end callback, add before the state setters:
    1. `scheduler.clearSchedule()`
    2. `adapter.stopAll()`
    3. `pinnedStartTickRef.current = null`
    4. `lastReactTickRef.current = 0`
    5. `tickSourceRef.current = { currentTick: 0, status: 'stopped' }`
  - Keep existing: `setStatus('stopped')`, `setCurrentTick(0)`, `playbackEndTimeoutRef.current = null`

**Checkpoint**: US1 fully functional — replay after natural end produces a clean, non-overlapping playback session

---

## Phase 4: User Story 2 — Instrument Labels Always Visible (Priority: P2)

**Goal**: Increase `labelMargin` from 80 to 150 layout units in `pages/ScoreViewer.tsx` so instrument name labels on the left of each system are never partially outside the computed viewBox.

**Independent Test**: Load a multi-instrument score (e.g., piano + violin). Start playback and scroll through all systems. Verify every instrument label on the left of every system is fully readable — no clipping at the left edge.

### Tests for User Story 2

> **Write test FIRST — verify it FAILS before implementing the fix.**

- [ ] T004 [P] [US2] Write failing labelMargin tests in `frontend/tests/pages/ScoreViewer.layout.test.tsx`
  - Test: exported/accessible `labelMargin` constant equals 150
  - Test: `totalWidth = (layout.total_width + 150) * renderScale` (label area included)
  - Test: viewport `x` offset equals `-150` (viewBox starts 150 units left of origin)

### Implementation for User Story 2

- [ ] T005 [P] [US2] Change `labelMargin` from `80` to `150` in **both** occurrences in `frontend/src/pages/ScoreViewer.tsx`
  - Occurrence 1: inside `updateViewport()` — `const labelMargin = 80;`
  - Occurrence 2: inside `render()` — `const labelMargin = 80;`
  - Verify no other hardcoded `80` margin references exist in this file

**Checkpoint**: US2 fully functional — all instrument labels visible on all systems; independent of US1, US3, US4

---

## Phase 5: User Story 3 — Return to Start Button (Priority: P3)

**Goal**: Add an `onReturnToStart` prop to `PlaybackControls` and render a ⏮ button. Wire a `handleReturnToStart` callback in `ScoreViewer.tsx` that calls `playbackState.stop()` and scrolls the page to the top.

**Independent Test**: Play a score to completion (or to any point mid-score). Press the ⏮ button. Verify: no audio plays, playback status shows stopped, and the page scrolls back to measure 1.

### Tests for User Story 3

> **Write test FIRST — verify it FAILS before implementing the fix.**

- [ ] T006 [US3] Write failing Return-to-Start button tests in `frontend/tests/components/PlaybackControls.returnToStart.test.tsx`
  - Test: ⏮ button renders when `onReturnToStart` prop is provided
  - Test: ⏮ button does NOT render when `onReturnToStart` is omitted (backward compat)
  - Test: ⏮ button is enabled when `status='stopped'`
  - Test: ⏮ button is enabled when `status='paused'`
  - Test: ⏮ button is disabled when `status='playing'`
  - Test: clicking ⏮ button calls the `onReturnToStart` callback
  - Test: ⏮ button has `aria-label="Return to Start"` (accessibility)

### Implementation for User Story 3

- [ ] T007 [P] [US3] Add `onReturnToStart` prop and ⏮ button to `frontend/src/components/playback/PlaybackControls.tsx`
  - Add `onReturnToStart?: () => void` to `PlaybackControlsProps` interface
  - Inside `.playback-buttons`, after the Stop button, render:
    ```tsx
    {onReturnToStart && (
      <button
        className="playback-button return-to-start-button"
        onClick={onReturnToStart}
        disabled={status === 'playing'}
        title="Return to Start"
        aria-label="Return to Start"
      >
        ⏮
      </button>
    )}
    ```

- [ ] T008 [P] [US3] Add `.return-to-start-button` styles to `frontend/src/components/playback/PlaybackControls.css`
  - Style consistent with existing `.playback-button` siblings
  - The button should visually match Play/Pause/Stop buttons in size and spacing

- [ ] T009 [US3] Add `handleReturnToStart` and wire to `PlaybackControls` in `frontend/src/components/ScoreViewer.tsx` (depends on T007)
  - Add callback:
    ```typescript
    const handleReturnToStart = useCallback(() => {
      playbackState.stop();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [playbackState]);
    ```
  - Pass `onReturnToStart={handleReturnToStart}` to `<PlaybackControls />`

**Checkpoint**: US3 fully functional — ⏮ button visible and working; stop + scroll-to-top on click; independent of US1, US2

---

## Phase 6: User Story 4 — Score Container Fits Viewport After Playback (Priority: P4)

**Goal**: Add a `useEffect` in `ScoreViewer.tsx` that detects the transition from `status='playing'` to `status='stopped'` and automatically scrolls the page back to the top — eliminating the overflow caused by the auto-scrolled inner div position exceeding `totalHeight`.

**Independent Test**: Play any score to natural completion (let it end without pressing Stop). Inspect the page after playback ends. Verify: no vertical overflow, no unexpected scrollbar, score container fits within the viewport.

### Tests for User Story 4

> **Add to existing test file — verify new tests FAIL before implementing the fix.**

- [ ] T010 [US4] Add scroll-reset-on-natural-end tests to `frontend/tests/pages/ScoreViewer.layout.test.tsx`
  - Test: after playback status transitions `'playing' → 'stopped'`, `window.scrollTo` is called with `{ top: 0 }`
  - Test: `window.scrollTo` is NOT called when status transitions `'stopped' → 'playing'` (no spurious scroll on start)
  - Test: score container height equals `totalHeight` (inner div does not exceed outer div)

### Implementation for User Story 4

- [ ] T011 [US4] Add `prevStatusRef` and scroll-to-top `useEffect` in `frontend/src/components/ScoreViewer.tsx`
  - Add ref: `const prevStatusRef = useRef<PlaybackStatus>('stopped');`
  - Add effect after existing effects:
    ```typescript
    useEffect(() => {
      if (prevStatusRef.current === 'playing' && playbackState.status === 'stopped') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      prevStatusRef.current = playbackState.status;
    }, [playbackState.status]);
    ```
  - Note: this effect shares the scroll-to-top mechanism with T009's `handleReturnToStart` — both converge on `window.scrollTo`

**Checkpoint**: US4 fully functional — page layout is clean after natural playback end; all 4 user stories independently complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Overflow guard and final validation across all fixes

- [ ] T012 [P] Add `overflow-x: hidden` to outer page/app container in `frontend/src/index.css` or `frontend/src/App.css` to prevent horizontal scroll from exposing the label area boundary during viewport resize events
- [ ] T013 Run full Vitest test suite (`cd frontend && npx vitest run`) and confirm all new and existing tests pass
- [ ] T014 [P] Manual smoke test following all scenarios in `specs/026-playback-ui-fixes/quickstart.md`:
  - US1: replay after natural end, replay after manual stop, multiple consecutive replays
  - US2: multi-instrument score labels visible on all systems
  - US3: ⏮ button present, works after natural end and mid-playback
  - US4: page layout clean after natural end, no overflow

---

## Dependency Graph

```
T001 (setup)
  ↓
T002 (US1 test) → T003 (US1 fix)           [independent branch]
T004 (US2 test) → T005 (US2 fix)           [independent branch]
T006 (US3 test) → T007,T008 (US3 impl) → T009 (US3 wiring)  [independent branch]
T010 (US4 test) → T011 (US4 fix)           [depends on T009 for same file ScoreViewer.tsx]
  ↓
T012, T013, T014 (polish)
```

**Story independence**: US1, US2, US3 are fully independent and can be implemented in any order or in parallel across engineers. US4 shares `ScoreViewer.tsx` with US3 — implement US3 first (T009), then add T011 to the same file.

---

## Parallel Execution Examples

### If working alone (recommended order):

```
T001 → T002 → T003        (US1 complete — MVP)
     → T004 → T005        (US2 complete)
     → T006 → T007+T008 → T009    (US3 complete)
              → T010 → T011       (US4 complete, after T009)
     → T012+T014 → T013   (polish + validation)
```

### If working with two engineers:

```
Engineer A: T001 → T002 → T003 → T004 → T005 → T012
Engineer B: T001 → T006 → T007+T008 → T009 → T010 → T011 → T014
Both: T013 (final test run)
```

### Parallel tasks within the same phase:

- **Phase 4+5 simultaneously** (different files): T004+T005 (US2: `pages/ScoreViewer.tsx`) can run in parallel with T006+T007+T008 (US3: `PlaybackControls.tsx` + `.css`)
- **Phase 5 internal**: T007 (component prop) and T008 (CSS) can run in parallel

---

## Implementation Strategy

### MVP Scope: User Story 1 only (T001–T003)

US1 is the highest-impact fix (core replay loop broken). After T003, the app is meaningfully better — musicians can replay scores without audio corruption. Deliver US1 first and validate before proceeding.

### Incremental Delivery Order

1. **US1** (T002–T003): Fix replay — highest urgency, most disruptive bug
2. **US2** (T004–T005): Fix labels — pervasive visual defect visible during all playback
3. **US3** (T006–T009): Add Return-to-Start button — completes end-of-playback UX
4. **US4** (T010–T011): Fix overflow — pairs with US3 scroll mechanism, minimal extra code

---

## Summary

| Metric | Count |
|--------|-------|
| Total tasks | 14 |
| Phase 1 (Setup) | 1 |
| Phase 3 — US1 (P1) | 2 |
| Phase 4 — US2 (P2) | 2 |
| Phase 5 — US3 (P3) | 4 |
| Phase 6 — US4 (P4) | 2 |
| Phase 7 (Polish) | 3 |
| Parallelizable [P] tasks | 5 (T004, T005, T007, T008, T012, T014) |
| New test files | 2 (`MusicTimeline.replay.test.ts`, `PlaybackControls.returnToStart.test.tsx`) |
| Files modified (existing) | 1 (`ScoreViewer.layout.test.tsx` — extended) |
| Source files touched | 5 (`MusicTimeline.ts`, `pages/ScoreViewer.tsx`, `PlaybackControls.tsx`, `PlaybackControls.css`, `components/ScoreViewer.tsx`) |
| MVP scope | US1 only (T001–T003) |
