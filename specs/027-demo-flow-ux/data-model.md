# Data Model: Demo Flow UX (027)

**Date**: 2026-02-18  
**Branch**: `027-demo-flow-ux`

This feature contains **no new persisted data entities**. All changes are UI/UX modifications to existing frontend components and one layout engine fix. No new IndexedDB stores, REST resources, or WASM-exported types are introduced.

---

## Modified TypeScript Interfaces

### `PlaybackControlsProps` (modified)

**File**: `frontend/src/components/playback/PlaybackControls.tsx`

| Field | Change | Description |
|---|---|---|
| `title?: string` | **ADD** | Score title displayed left of playback buttons; truncated with `…` when overflow |
| `onReturnToView?: () => void` | **ADD** | Callback for the return arrow button (replaces "Instruments View" `rightActions` pattern for the Play screen) |
| `compact?: boolean` | **KEEP** | Compact mode already exists; `TempoControl` will be shown in compact mode too (right of timer) |
| `rightActions?: React.ReactNode` | **KEEP (deprecated for Play screen)** | Still accepted for backward compatibility; Play screen will use `onReturnToView` instead |

**Validation rules**: `title` must be CSS-truncatable (no inherent validation in TypeScript; CSS `text-overflow: ellipsis` handles display).

### `LayoutViewProps` (modified)

**File**: `frontend/src/components/layout/LayoutView.tsx`

| Field | Change | Description |
|---|---|---|
| *(remove)* `TempoControl` internal usage | **REMOVE** | TempoControl moves to PlaybackControls; LayoutView no longer renders it |

### `ScoreViewerProps` (modified, component)

**File**: `frontend/src/components/ScoreViewer.tsx`

| Field | Change | Description |
|---|---|---|
| No prop changes | — | Fullscreen logic and back-gesture handler are internal; `viewMode` already exposed |

---

## Modified Rust Types

### `BracketGlyph` (field semantic change)

**File**: `backend/src/layout/types.rs`

| Field | Current | Change | Description |
|---|---|---|---|
| `y: f32` | `(top_y + bottom_y) / 2.0` — typographic center | **CHANGE** → `top_y` — top-anchor | Starting y for top-anchored glyph rendering |

No new fields. No new structs. WASM-exported type remains structurally identical; only the semantic meaning of `y` changes (top anchor vs center anchor). Frontend rendering must be updated in sync (see R-004 in research.md).

---

## State Transitions

### `viewMode` state (existing)

The `viewMode` state in `ScoreViewer.tsx` (component) already governs the `'individual'` (Instruments) and `'layout'` (Play) views. This feature adds **side-effects** to the existing transitions:

| Transition | New Side Effect |
|---|---|
| `'individual'` → `'layout'` | Call `requestFullscreen()` + `history.pushState({view:'layout'}, '')` + pause if playing |
| `'layout'` → `'individual'` | Call `exitFullscreen()` + pause playback (preserve position) |
| `popstate` event | Trigger `'layout'` → `'individual'` (back gesture) |

---

## No New Database Entities

- No IndexedDB schema changes
- No backend REST API changes
- No WASM-exported function signature changes

---

## Interface Change Summary

| Concern | Type of Change |
|---|---|
| `PlaybackControlsProps.title` | Add optional string prop |
| `PlaybackControlsProps.onReturnToView` | Add optional callback |
| `BracketGlyph.y` semantic | Rust field value change (top_y, not center_y) |
| `LayoutRenderer` `shouldComponentUpdate` | Add `selectedNoteId` guard |
| `LayoutRenderer` note hit rect | Add transparent `<rect>` per note using `bounding_box` |
