# Data Model: Playback & Display Performance Optimization

**Feature**: 024-playback-performance
**Date**: 2026-02-17

## Overview

This feature introduces no new domain entities. All new types are **infrastructure-layer** constructs that optimize how existing domain data (Notes, ticks) is queried and rendered. They live in the frontend services layer, consistent with hexagonal architecture (Principle II).

## New Entities

### HighlightIndex

A pre-sorted index over existing `Note` entities, enabling O(log n + k) lookup of currently-playing notes instead of O(n) linear scan.

```
HighlightIndex
├── sortedNotes: IndexedNote[]      # Notes sorted by start_tick (ascending)
├── maxDuration: number             # Max duration_ticks across all notes (for backward scan bound)
├── noteCount: number               # Total number of notes in the index
│
├── build(notes: Note[]): void      # Sort + precompute maxDuration. O(n log n), called once.
├── findPlayingNoteIds(currentTick: number): string[]  # Binary search + bounded backward scan. O(log n + k).
└── clear(): void                   # Release references for GC
```

**Fields:**

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `sortedNotes` | `IndexedNote[]` | Notes sorted ascending by `start_tick` | Built from `Note[]` on score load |
| `maxDuration` | `number` | `Math.max(note.duration_ticks)` for all notes | Precomputed during `build()` |
| `noteCount` | `number` | Length of `sortedNotes` array | Derived |

**Lifecycle:**
- Built once when a score is loaded or changes.
- Invalidated only when the score's note array changes (never during playback).
- Read-only during playback — the rAF loop calls `findPlayingNoteIds()` without modification.

**Relationships:**
- Wraps existing `Note` entities — does not modify or replace them.
- Consumed by the rAF highlight loop in `LayoutRenderer`.
- Replaces both `computeHighlightedNotes()` and `NoteHighlightService.getPlayingNoteIds()`.

---

### IndexedNote

A lightweight projection of `Note` containing only the fields needed for highlight queries. Avoids carrying the full `Note` object in the sorted array.

```
IndexedNote
├── id: string          # Note UUID (matches Note.id)
├── startTick: number   # Note start position in ticks (matches Note.start_tick)
└── endTick: number     # Precomputed: start_tick + duration_ticks
```

**Rationale:** Precomputing `endTick` avoids an addition per comparison in the hot loop. Using a flat struct (not the full `Note`) improves cache locality during binary search.

---

### HighlightPatch

A diff between the previous frame's highlighted notes and the current frame's highlighted notes. Only the changed DOM elements are touched.

```
HighlightPatch
├── added: string[]     # Note IDs that became highlighted this frame
├── removed: string[]   # Note IDs that stopped being highlighted this frame
└── unchanged: boolean  # True if added.length === 0 && removed.length === 0
```

**Lifecycle:**
- Computed each frame by comparing `prevHighlightedIds: Set<string>` with `currentIds: string[]`.
- Consumed immediately by `updateHighlights()` to toggle CSS classes.
- Not stored — ephemeral per-frame value.

---

### FrameBudgetMonitor

Tracks per-frame rendering time and triggers degradation when the budget is consistently exceeded.

```
FrameBudgetMonitor
├── budgetMs: number            # Frame budget in ms (8ms mobile, 12ms desktop)
├── consecutiveOverruns: number # Count of consecutive frames exceeding budget
├── degradationThreshold: number # Over-runs before degradation kicks in (default: 5)
├── isDegraded: boolean         # Currently in degraded mode
│
├── startFrame(): number        # Returns performance.now() timestamp
├── endFrame(startTime: number): void  # Measures elapsed, updates overrun counter
├── shouldSkipFrame(): boolean  # Returns true if degraded and should skip this frame
└── reset(): void               # Clear counters (e.g., on playback stop)
```

**Degradation behavior:**
- After `degradationThreshold` consecutive frames exceeding `budgetMs`, sets `isDegraded = true`.
- In degraded mode, `shouldSkipFrame()` returns `true` on alternating frames (effectively halving update rate: 60→30 on desktop, 30→15 on mobile).
- Recovers automatically when frames return within budget for `degradationThreshold` consecutive frames.

---

### DeviceProfile

Detected device characteristics used to select frame rate and budget parameters.

```
DeviceProfile
├── isMobile: boolean           # True if device is phone/tablet in touch mode
├── targetFrameIntervalMs: number  # 33ms (mobile) or 16ms (desktop)
├── frameBudgetMs: number       # 8ms (mobile) or 12ms (desktop)
```

**Detection heuristic:**
- `matchMedia('(pointer: coarse)')` + `matchMedia('(hover: none)')` → mobile
- `window.innerWidth <= 768` → mobile (fallback)
- Otherwise → desktop

---

## Modified Entities

### LayoutRenderer (existing class component)

New instance fields added for the two-tier render model:

| Field | Type | Purpose |
|-------|------|---------|
| `prevHighlightedIds` | `Set<string>` | Previous frame's highlighted note IDs for diff computation |
| `rafId` | `number` | `requestAnimationFrame` handle for cleanup |
| `lastFrameTime` | `number` | Timestamp of last processed frame (for frame-skipping) |
| `frameInterval` | `number` | Target interval between frames (33ms or 16ms) |
| `highlightIndex` | `HighlightIndex \| null` | Pre-sorted note index for binary search |
| `frameBudgetMonitor` | `FrameBudgetMonitor` | Performance tracking |

New methods:

| Method | Purpose |
|--------|---------|
| `shouldComponentUpdate(nextProps)` | Returns `false` for highlight-only prop changes |
| `updateHighlights()` | rAF-driven: compute diff, toggle CSS classes on `[data-note-id]` elements |
| `startHighlightLoop()` | Initialize rAF self-scheduling loop |
| `stopHighlightLoop()` | Cancel rAF on unmount or playback stop |

### LayoutRenderer SVG elements (existing)

New attribute on note glyph elements:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `data-note-id` | Note UUID string | Enables `querySelector('[data-note-id="..."]')` for O(1) element lookup |

---

## Entity Relationships

```
Score (domain)
  └── notes: Note[]
        ├── consumed by HighlightIndex.build()
        └── mapped via sourceToNoteIdMap

HighlightIndex (infrastructure)
  ├── sortedNotes: IndexedNote[]  (projection of Note)
  └── findPlayingNoteIds(tick) → string[]
        └── consumed by LayoutRenderer.updateHighlights()

LayoutRenderer (infrastructure)
  ├── renderSVG()          → structural render (creates SVG with data-note-id attrs)
  ├── updateHighlights()   → cosmetic render (toggles CSS classes)
  ├── FrameBudgetMonitor   → decides whether to skip frames
  └── DeviceProfile        → selects frame interval (30/60 Hz)

HighlightPatch (ephemeral)
  ├── computed from: prevHighlightedIds ⊕ currentIds
  └── consumed by: updateHighlights() to toggle .highlighted class
```

## State Transitions

### Highlight Update Flow (per frame)

```
rAF callback fires
  → Check frameInterval (skip if too soon)
  → FrameBudgetMonitor.startFrame()
  → Read currentTick from playback engine (ref, not React state)
  → HighlightIndex.findPlayingNoteIds(currentTick) → string[]
  → Compare with prevHighlightedIds → HighlightPatch
  → If patch.unchanged → early return (no DOM work)
  → For each patch.removed: querySelector('[data-note-id="X"]').classList.remove('highlighted')
  → For each patch.added: querySelector('[data-note-id="X"]').classList.add('highlighted')
  → Update prevHighlightedIds
  → FrameBudgetMonitor.endFrame()
```

### Degradation State Machine

```
NORMAL ──[5 consecutive over-budget frames]──→ DEGRADED
DEGRADED ──[5 consecutive within-budget frames]──→ NORMAL
DEGRADED ──[skip alternating frames]──→ (halved update rate)
```
