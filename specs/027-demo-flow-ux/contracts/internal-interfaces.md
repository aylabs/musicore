# Internal Interface Contracts: Demo Flow UX (027)

**Date**: 2026-02-18  
**Note**: This feature introduces no new REST API endpoints or WASM-exported functions.
All contracts are internal TypeScript interface changes within the frontend.

---

## Contract 1: `PlaybackControlsProps` (modified)

**File**: `frontend/src/components/playback/PlaybackControls.tsx`

### Current interface (relevant excerpt)

```typescript
export interface PlaybackControlsProps {
  status: PlaybackStatus;
  hasNotes?: boolean;
  error?: string | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  compact?: boolean;
  rightActions?: React.ReactNode;
  currentTick?: number;
  totalDurationTicks?: number;
  tempo?: number;
  tempoMultiplier?: number;
  onReturnToStart?: () => void;
}
```

### New interface (additions marked)

```typescript
export interface PlaybackControlsProps {
  status: PlaybackStatus;
  hasNotes?: boolean;
  error?: string | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  compact?: boolean;
  rightActions?: React.ReactNode;         // kept for back-compat; Play screen uses onReturnToView
  title?: string;                          // NEW: score title, truncated left of buttons in compact mode
  onReturnToView?: () => void;             // NEW: return arrow callback (replaces Instruments View button)
  currentTick?: number;
  totalDurationTicks?: number;
  tempo?: number;
  tempoMultiplier?: number;
  onReturnToStart?: () => void;
}
```

### Rendering contract

| `title` value | Behaviour |
|---|---|
| `undefined` / `null` | No title area rendered |
| String ≤40 chars (typical) | Rendered fully left of play/pause/stop buttons |
| String >40 chars | CSS `text-overflow: ellipsis` truncates; controls never displaced |

| `onReturnToView` value | Behaviour |
|---|---|
| `undefined` | No return arrow rendered |
| Function | Return arrow `←` button rendered; calls function on click |

**TempoControl visibility change**: `TempoControl` is now shown in compact mode (right of timer). This is a **breaking behavioural change** — previously hidden in compact. All existing tests that assert "TempoControl absent in compact mode" must be updated.

---

## Contract 2: `BracketGlyph.y` semantic (Rust ↔ TypeScript)

**Rust file**: `backend/src/layout/mod.rs` `create_bracket_glyph`  
**TypeScript consumer**: `frontend/src/components/LayoutRenderer.tsx` bracket rendering at ~L583

### Current contract (broken)

| Side | Meaning of `bracket_glyph.y` |
|---|---|
| Rust sets | `(top_y + bottom_y) / 2.0` — typographic center for `dominant-baseline: middle` |
| TS renders | `transform="translate(x, y)"` + `dominant-baseline="middle"` |

Result: visual offset because SMuFL brace U+E000 typographic midpoint ≠ visual geometric center.

### New contract (correct)

| Side | Meaning of `bracket_glyph.y` |
|---|---|
| Rust sets | `top_y` — top edge of the bracket glyph |
| TS renders | `transform="translate(x, y)"` + `dominant-baseline="hanging"` (top-anchored) |

Both sides must change atomically to preserve the invariant.

**WASM API compatibility**: `BracketGlyph` struct is unchanged (same fields, same types). Only the runtime value of `y` changes. No wasm-bindgen regeneration needed.

---

## Contract 3: Note hit-rect (`data-note-id` on `<rect>`)

**File**: `frontend/src/components/LayoutRenderer.tsx` `renderGlyphRun()`

### New SVG element contract

For each notehead glyph, a sibling `<rect>` element is added:

```tsx
<rect
  data-note-id={noteId}
  x={glyph.bounding_box.x}
  y={glyph.bounding_box.y}
  width={Math.max(glyph.bounding_box.width, MIN_TOUCH_PX / renderScale)}
  height={Math.max(glyph.bounding_box.height, MIN_TOUCH_PX / renderScale)}
  fill="transparent"
  style={{ cursor: 'pointer', pointerEvents: 'all' }}
/>
```

Where `MIN_TOUCH_PX = 44` (Constitution-agnostic display layer constant).

**Event delegation**: The existing `handleSVGClick` walks `event.target` looking for `dataset.noteId`. The `<rect>` carries this attribute and will be found by the existing delegation — no changes to the hit-testing handler are required.

**Origin of geometry**: `glyph.bounding_box.{x, y, width, height}` — all values from the Rust layout engine. ✅ Constitution VI compliant.
