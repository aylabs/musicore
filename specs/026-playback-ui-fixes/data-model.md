# Data Model: Playback UI Fixes

**Feature**: 026-playback-ui-fixes  
**Date**: 2026-02-18

---

## Overview

This feature fixes four bugs in the existing playback and layout systems. No new persistent entities or data schema changes are required. The changes are limited to:

1. Correcting the lifecycle of existing transient playback state
2. Adding a new UI control to an existing component
3. Adjusting existing layout constants

---

## Existing Entities Affected

### PlaybackStatus (type alias, `types/playback.ts`)

```typescript
type PlaybackStatus = 'stopped' | 'playing' | 'paused';
```

**No change to this type.** 'stopped' correctly represents the post-playback-end state.

---

### PlaybackState (interface, `types/playback.ts`)

The return type of `usePlayback()`. No new fields required for these fixes.

Existing fields used by the fixes:
- `status: PlaybackStatus` — read to determine when to show Return-to-Start button
- `currentTick: number` — read to determine button availability
- `stop: () => void` — called by Return-to-Start handler

---

### PlaybackControlsProps (interface, `components/playback/PlaybackControls.tsx`)

**Extended** with one new optional prop:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `onReturnToStart` | `() => void` | No | Called when user clicks Return to Start button |

All existing props unchanged.

---

### MusicTimeline internal state (refs, `services/playback/MusicTimeline.ts`)

No new state fields. Existing refs affected by P1 fix:

| Ref | Current behavior at natural end | Fixed behavior |
|-----|--------------------------------|----------------|
| `playbackEndTimeoutRef` | Calls `setStatus` + `setCurrentTick` only | Also calls `adapter.stopAll()`, `scheduler.clearSchedule()`, clears `pinnedStartTickRef` |
| `pinnedStartTickRef` | Not cleared on natural end | Cleared to `null` on natural end |

---

### Viewport (type, `types/Viewport.ts`)

No change. `x: -labelMargin` approach preserved; `labelMargin` constant increased from 80 → 150 units.

---

## State Transitions

### Corrected Playback End State Machine

**Before (broken)**:
```
playing → [timeout] → stopped
                      (Transport still active, scheduler not cleared)
→ play() → overlapping schedules (BUG)
```

**After (fixed)**:
```
playing → [timeout] → stopAll() + clearSchedule() → stopped
                      (Transport idle, scheduler empty)
→ play() → clean start
```

### Return to Start State Machine

```
stopped (scrolled to end)
  → onReturnToStart()
    → stop()           (already stopped, no-op for audio)
    → window.scrollTo(top: 0)
    → ScoreViewer.scrollToTop()
  → stopped (view at measure 1)
```

```
playing (mid-score)
  → onReturnToStart()
    → stop()           (stops audio, resets tick to 0)
    → window.scrollTo(top: 0)
    → ScoreViewer.scrollToTop()
  → stopped (view at measure 1)
```

---

## No New Persistent Storage

These fixes are entirely in-memory / UI state. No IndexedDB, localStorage, or backend changes.

---

## Label Margin Model

The instrument label display area is defined by a single constant:

| Constant | Location | Current | Fixed |
|----------|----------|---------|-------|
| `labelMargin` | `pages/ScoreViewer.tsx` | 80 layout units | 150 layout units |

At `renderScale = 0.5` (100% zoom): 80 units = 40px → 150 units = 75px (adequate for 10+ character names in the Bravura SMuFL font at 12px effective size).
