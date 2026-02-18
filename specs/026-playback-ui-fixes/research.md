# Phase 0 Research: Playback UI Fixes

**Feature**: 026-playback-ui-fixes  
**Date**: 2026-02-18  
**Status**: Complete — all unknowns resolved

---

## Summary

All four reported bugs are rooted in specific, identifiable code locations. No architectural unknowns remain. Each issue has a targeted fix with well-understood side effects.

---

## Issue P1: Replay Mixes Scores / Wrong Play Status

### Root Cause

**File**: `frontend/src/services/playback/MusicTimeline.ts`

When playback ends naturally (last note plays), a `setTimeout` fires:

```typescript
playbackEndTimeoutRef.current = window.setTimeout(() => {
  setStatus('stopped');
  setCurrentTick(0);
  playbackEndTimeoutRef.current = null;
}, timeoutMs);
```

This sets React state but does **not** call:
- `adapter.stopAll()` — Tone.js Transport and scheduled notes remain active
- `scheduler.clearSchedule()` — PlaybackScheduler's event queue is not flushed

When the user then presses Play (replay), `play()` calls `adapter.startTransport()` on a Transport that is still "running" from the previous session. Tone.js schedules the new notes on top of the still-active old schedule, producing overlapping/mixed playback.

Additionally, `pinnedStartTickRef.current` is NOT cleared by the natural end timeout (only `stop()` clears it), so if the user previously seeked to a note before playing to the end, replay starts from the wrong position.

### Decision

- Natural end timeout MUST call `adapter.stopAll()` + `scheduler.clearSchedule()` before updating state
- Natural end timeout MUST clear `pinnedStartTickRef.current`
- No new PlaybackStatus state needed — 'stopped' correctly represents post-playback state

### Alternatives Considered

- **Add 'ended' state**: Rejected — would require changes across all status guards; unnecessary since 'stopped' is semantically correct post-play
- **Reset transport inside `play()`**: Rejected — `play()` has no way to know if it follows a natural end vs. explicit stop; the timeout must do the cleanup

---

## Issue P2: Instrument Labels Clipped During Playback

### Root Cause

**File**: `frontend/src/pages/ScoreViewer.tsx`

The viewport is expanded leftward by `labelMargin = 80` layout units:

```typescript
const labelMargin = 80;
this.setState({
  viewport: { x: -labelMargin, ... width: viewportWidth + labelMargin, ... }
});
```

The physical SVG container width is computed as:

```typescript
const totalWidth = (layout.total_width + labelMargin) * renderScale;
```

This correctly includes the label area in the physical dimensions. However, the issue occurs because `updateViewport()` is only called on scroll events and layout changes — **not** when the outer parent container changes size. During playback, the parent may resize (e.g., the playback controls bar causes reflow), shifting the available `clientWidth`. The SVG container width is fixed at the layout's `total_width + labelMargin`, but if the page container is narrower than this total, a horizontal scroll appears and the left edge (label area) may be scrolled out of view, or the `overflow: visible` container is clipped by a parent with `overflow: hidden`.

The secondary mechanism: `labelMargin = 80 layout units`. At `renderScale = 0.5` (100% zoom), this is 40px. For instrument names longer than ~5 characters in the font used, the `name_label.position.x` from the Rust engine may be more negative than -80, placing the text outside the viewBox left edge and causing visual clipping.

### Decision

- Increase `labelMargin` from 80 to 150 units to accommodate longer multi-instrument names
- Add `overflow-x: hidden` to the outer page/app container to prevent horizontal scroll exposing the label area boundary
- Add `scrollLeft = 0` guard: after any layout measurement, ensure the container's horizontal scroll is reset to 0

### Alternatives Considered

- **Dynamic labelMargin from layout data**: Requires computing max label width from Rust engine output; adds complexity without benefit since a generous fixed margin is sufficient
- **CSS `clip-path` removal**: Not applicable — the issue is not clip-path

---

## Issue P3: Return to Start Button

### Root Cause

**File**: `frontend/src/components/playback/PlaybackControls.tsx`

The component has Play, Pause, Stop handlers and renders three buttons. There is no "Return to Start" (reset view) action.

The existing `stop()` function in `MusicTimeline.ts` resets `currentTick` to 0 (or pinned position) but does **not** scroll the page back to the top. After playback, the page is scrolled to the last highlighted system.

### Decision

- Add `onReturnToStart?: () => void` prop to `PlaybackControls`
- Render a "⏮" (return-to-start) button, shown when `status !== 'playing'` at `currentTick === 0 or status === 'stopped'`
- Handler in `components/ScoreViewer.tsx`: call `playbackState.stop()` + `window.scrollTo({ top: 0, behavior: 'smooth' })`
- `pages/ScoreViewer.tsx` scroll-to-top via ref when `returnToStart` is triggered (resets `lastAutoScrollSystemIndex`)

### Alternatives Considered

- **Merge with Stop button**: Rejected — Stop should stop audio without moving view (user may want to read current position); Return to Start is a distinct action
- **Auto-scroll to top on natural end**: Rejected — user may want to read the ending measure before deciding to return

---

## Issue P4: Score Container Larger Than Page After Playback

### Root Cause

**File**: `frontend/src/pages/ScoreViewer.tsx`

The inner absolutely-positioned div is rendered at:

```tsx
<div style={{
  position: 'absolute',
  top: `${scrollTop}px`,   // ← set from page scroll position
  width: `${totalWidth}px`,
  height: `${viewport.height * renderScale}px`,
}}>
```

During playback, auto-scroll advances `scrollTop` to keep the current system visible. When playback ends, `scrollTop` is large (e.g., 3000px for a long score). The inner div sits at `top: 3000px` inside the outer div (which is `height: totalHeight`). `viewport.height * renderScale` ≈ `window.innerHeight + padding`. So the inner div bottom = `3000 + windowHeight + padding`, which can exceed `totalHeight`, making the outer div overflow and the page larger than the score.

Additionally, when `setCurrentTick(0)` is called on natural end, `highlightedNoteIds` is cleared (via `useNoteHighlight`), which triggers `componentDidUpdate` to reset `lastAutoScrollSystemIndex` — but does NOT call `window.scrollTo(0, 0)`. The page stays scrolled to the end.

### Decision

- In `componentDidUpdate` of `pages/ScoreViewer.tsx`, detect when playback transitions from playing to not-playing (via `highlightedNoteIds` going from non-empty to empty) — already partially handled
- Add `window.scrollTo(0, 0)` (or expose a `scrollToTop()` method) when `onPlaybackEnded` prop is signaled
- Fix: after natural end, trigger a `returnToStart` action from `components/ScoreViewer.tsx`

### Alternatives Considered

- **Clamp `scrollTop` to valid range**: Would prevent display of the overflow but not fix the underlying scroll position
- **CSS `min-height` on outer div**: Workaround, not a fix

---

## Technology Stack (Confirmed)

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React 18+ | — |
| Language | TypeScript strict | — |
| Build | Vite 7.3.1 | — |
| Testing | Vitest 4.0.18 | — |
| Audio | Tone.js | — |
| Rendering | SVG (imperative DOM) | — |
| Styling | Inline styles + CSS modules | — |

## Files to Modify

| File | Issue(s) | Change Type |
|------|----------|-------------|
| `frontend/src/services/playback/MusicTimeline.ts` | P1 | Bug fix: add cleanup to natural end timeout |
| `frontend/src/components/playback/PlaybackControls.tsx` | P3 | Feature: add Return to Start button |
| `frontend/src/components/playback/PlaybackControls.css` | P3 | Style: new button style |
| `frontend/src/components/ScoreViewer.tsx` | P3, P4 | Feature + scroll reset hook |
| `frontend/src/pages/ScoreViewer.tsx` | P2, P4 | Layout: increase labelMargin, expose scrollToTop |

## New Test Files Required (Constitution Principle V + VII)

| Test File | Covers |
|-----------|--------|
| `frontend/tests/services/MusicTimeline.replay.test.ts` | P1: natural end cleans up transport; replay starts clean |
| `frontend/tests/components/PlaybackControls.returnToStart.test.tsx` | P3: button renders, prop called, availability logic |
| `frontend/tests/pages/ScoreViewer.layout.test.tsx` | P2, P4: label margin sufficiency, container bounds after playback |
