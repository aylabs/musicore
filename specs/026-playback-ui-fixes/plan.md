# Implementation Plan: Playback UI Fixes

**Branch**: `026-playback-ui-fixes` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/026-playback-ui-fixes/spec.md`

---

## Summary

Fix four interrelated playback and layout bugs:

1. **P1 - Replay**: Natural playback end does not clean up Tone.js Transport → overlapping schedules on replay. Fix: flush transport + scheduler in the natural-end timeout.
2. **P2 - Labels**: Instrument name labels clipped because `labelMargin = 80` layout units is too small for multi-instrument names. Fix: increase to 150 units.
3. **P3 - Return to Start**: No button to scroll back to measure 1 after playback. Fix: add `onReturnToStart` prop + ⏮ button to `PlaybackControls`.
4. **P4 - Container overflow**: After playback auto-scrolls to last system, the absolute-positioned inner div at `top: scrollTop` overflows the outer div's height. Fix: reset scroll on playback end via the same Return-to-Start mechanism.

No new persistent entities, no backend changes, no new dependencies.

---

## Technical Context

**Language/Version**: TypeScript 5.x strict mode  
**Primary Dependencies**: React 18+, Vite 7.3.1, Tone.js, Vitest 4.0.18  
**Storage**: N/A (no storage changes — all in-memory/UI state)  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Tablet devices (iPad, Surface, Android tablets) — Chrome 57+, Safari 11+  
**Project Type**: Web application (frontend only for this feature)  
**Performance Goals**: UI transitions <16ms (60fps); Return-to-Start scroll <300ms  
**Constraints**: Offline-capable PWA; no new npm dependencies introduced  
**Scale/Scope**: 4 bug fixes, ~5 files changed, ~3 new test files

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Domain-Driven Design | ✅ PASS | No domain entities changed; PlaybackStatus remains correct music terminology |
| II. Hexagonal Architecture | ✅ PASS | All changes in frontend adapter layer (React components, hooks); core Rust domain untouched |
| III. PWA Architecture | ✅ PASS | No network changes; offline operation unaffected |
| IV. Precision & Fidelity | ✅ PASS | No tick/PPQ arithmetic changed |
| V. Test-First Development | ✅ PASS | 3 new test files required before implementation |
| VI. Layout Engine Authority | ✅ PASS | `labelMargin` is a renderer-side display margin, not a spatial geometry change; Rust engine still owns all coordinates |
| VII. Regression Prevention | ✅ PASS | Each bug gets a failing test first; fix brings it green |

**Verdict**: All gates pass. No violations to justify.

---

## Project Structure

### Documentation (this feature)

```text
specs/026-playback-ui-fixes/
├── plan.md              ← This file
├── research.md          ← Phase 0 complete
├── data-model.md        ← Phase 1 complete
├── quickstart.md        ← Phase 1 complete
├── contracts/           ← (empty — UI-only changes, no API contracts)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (affected files)

```text
frontend/
├── src/
│   ├── services/
│   │   └── playback/
│   │       └── MusicTimeline.ts           # P1: fix natural-end timeout cleanup
│   ├── components/
│   │   ├── ScoreViewer.tsx                # P3, P4: wire onReturnToStart + scroll-to-top
│   │   └── playback/
│   │       ├── PlaybackControls.tsx        # P3: add onReturnToStart prop + button
│   │       └── PlaybackControls.css        # P3: style new button (⏮)
│   └── pages/
│       └── ScoreViewer.tsx                # P2: labelMargin 80→150; P4: expose scrollToTop
└── tests/
    ├── services/
    │   └── MusicTimeline.replay.test.ts    # NEW: P1 regression
    ├── components/
    │   └── PlaybackControls.returnToStart.test.tsx  # NEW: P3 unit tests
    └── pages/
        └── ScoreViewer.layout.test.tsx     # NEW: P2, P4 layout tests
```

---

## Implementation Order

### Phase 1: Tests First (Constitution Principle V + VII)

All tests written before implementation. Each test starts red.

#### T001 — P1 regression test: natural end cleans transport

**File**: `frontend/tests/services/MusicTimeline.replay.test.ts`

Tests:
- Natural end timeout calls `adapter.stopAll()` before setting status='stopped'
- Natural end timeout calls `scheduler.clearSchedule()` before setting status='stopped'
- Calling `play()` after natural end does not overlap with previous schedule
- `pinnedStartTickRef` is null after natural end
- Replay from tick=0 starts from first note correctly

#### T002 — P3 unit tests: Return-to-Start button

**File**: `frontend/tests/components/PlaybackControls.returnToStart.test.tsx`

Tests:
- Button renders when `onReturnToStart` prop is provided
- Button does NOT render when `onReturnToStart` is omitted (backward compat)
- Button is enabled when status='stopped'
- Button is enabled when status='paused'
- Button is disabled when status='playing' (cannot return to start during playback — update spec to reflect this)
- Clicking button calls `onReturnToStart` callback
- Button has accessible label

#### T003 — P2, P4 layout tests

**File**: `frontend/tests/pages/ScoreViewer.layout.test.tsx`

Tests:
- `labelMargin` constant equals 150
- `totalWidth` = `(layout.total_width + 150) * renderScale` (includes label area)
- After playback ends (highlighted notes cleared), scroll position resets to 0
- Score container height = `totalHeight` (not exceeded by inner div)

### Phase 2: Bug Fixes (Red → Green)

#### Fix P1: MusicTimeline natural-end cleanup

**File**: `frontend/src/services/playback/MusicTimeline.ts`

Change the natural-end `setTimeout` callback:

```typescript
// BEFORE (broken)
playbackEndTimeoutRef.current = window.setTimeout(() => {
  setStatus('stopped');
  setCurrentTick(0);
  playbackEndTimeoutRef.current = null;
}, timeoutMs);

// AFTER (fixed)
playbackEndTimeoutRef.current = window.setTimeout(() => {
  // Clean up audio state (mirrors stop() but from a timeout context)
  scheduler.clearSchedule();
  adapter.stopAll();
  pinnedStartTickRef.current = null;
  lastReactTickRef.current = 0;
  tickSourceRef.current = { currentTick: 0, status: 'stopped' };
  // Update React state
  setStatus('stopped');
  setCurrentTick(0);
  playbackEndTimeoutRef.current = null;
}, timeoutMs);
```

#### Fix P2: Increase labelMargin

**File**: `frontend/src/pages/ScoreViewer.tsx`

```typescript
// BEFORE
const labelMargin = 80;

// AFTER
const labelMargin = 150;
```

This change must appear in BOTH places in the file (updateViewport and render).

#### Fix P3: Return to Start button

**File**: `frontend/src/components/playback/PlaybackControls.tsx`

1. Add `onReturnToStart?: () => void` to `PlaybackControlsProps`
2. In render, add button inside `.playback-buttons` after the Stop button:

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

**File**: `frontend/src/components/playback/PlaybackControls.css`

Add styling for `.return-to-start-button` consistent with existing button styles.

**File**: `frontend/src/components/ScoreViewer.tsx`

Wire the handler:

```typescript
const handleReturnToStart = useCallback(() => {
  playbackState.stop();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}, [playbackState]);
```

Pass to PlaybackControls:

```tsx
<PlaybackControls
  ...
  onReturnToStart={handleReturnToStart}
/>
```

#### Fix P4: Scroll reset on playback end

The "Return to Start" action in P3 also addresses P4 for the user-triggered case. For the auto-trigger case (natural playback end), add a `useEffect` in `components/ScoreViewer.tsx` that detects status transition from 'playing' → 'stopped' and calls `window.scrollTo(0, 0)`:

```typescript
const prevStatusRef = useRef<PlaybackStatus>('stopped');
useEffect(() => {
  if (prevStatusRef.current === 'playing' && playbackState.status === 'stopped') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  prevStatusRef.current = playbackState.status;
}, [playbackState.status]);
```

---

## Complexity Tracking

No constitution violations. No complexity to justify.

---

## Notes

- **No API contracts generated**: All fixes are frontend-only; no new backend endpoints or WASM interfaces introduced
- **P3 button availability**: The button is disabled during `status='playing'` to prevent accidental interruption. It is available in both 'stopped' and 'paused' states.
- **P4 and P3 share the scroll reset**: Returning to start after natural end is a desirable UX (takes user back to beginning), so the auto-scroll-to-top on natural end doubles as the P4 overflow fix.
- **Label margin is renderer-side only**: Constitution Principle VI is preserved — the Rust engine still provides all logical coordinates; `labelMargin` is purely a display viewport expansion with no semantic geometry meaning.
