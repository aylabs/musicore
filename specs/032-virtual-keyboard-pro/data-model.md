# Data Model: Virtual Keyboard Pro Plugin

**Feature**: 032-virtual-keyboard-pro
**Date**: 2026-02-27
**Input**: spec.md Key Entities + research.md decisions

---

## Overview

The Virtual Keyboard Pro plugin is a stateful React component. Its data model is entirely in-memory and session-scoped (no persistence). It consumes and emits types from the host Plugin API (`PluginNoteEvent`, `PluginContext`). No new types are added to the Plugin API.

---

## 1. NoteDefinition

Describes one piano key at its **base position** (octave offset = 0, base range C3–B5).

```typescript
interface NoteDefinition {
  /** MIDI note number at base position (octaveOffset = 0).
   *  Range: 48 (C3) – 83 (B5) */
  baseMidi: number;

  /** Whether this is a black (sharp/flat) key */
  isBlack: boolean;

  /** For black keys only: 0-based index of the white key it visually follows.
   *  Used to calculate the absolute left offset for CSS positioning. */
  whiteKeyBefore?: number;

  /** Note name at base position, e.g. "C3", "F#4", "B5" */
  baseLabel: string;
}
```

**Instances**: 36 total — 21 white keys, 15 black keys.
**Immutable**: Defined as a module-level constant array `BASE_NOTES`. Never mutated.

**Derived view (runtime)**:
```typescript
/** A resolved NoteDefinition with MIDI and label adjusted for current octave offset */
interface ResolvedNote extends NoteDefinition {
  /** Actual MIDI note to play and emit: baseMidi + octaveOffset * 12 */
  midi: number;
  /** Display label adjusted for offset, e.g. "C5" when octaveOffset = +2 */
  label: string;
}
```

`ResolvedNote[]` is computed via `useMemo` whenever `octaveOffset` changes. It is the array passed to key rendering and keyboard event handlers.

---

## 2. OctaveShift

Represents the current octave offset applied to the base keyboard range.

```typescript
/** Integer in [-2, +2]. 0 = default range C3–B5. */
type OctaveShift = -2 | -1 | 0 | 1 | 2;
```

**React state**: `const [octaveOffset, setOctaveOffset] = useState<OctaveShift>(0);`

**Effect on displayed range**:

| octaveOffset | Min MIDI | Max MIDI | Display range |
|---|---|---|---|
| -2 | 24 | 59 | C1–B3 |
| -1 | 36 | 71 | C2–B4 |
| 0 (default) | 48 | 83 | C3–B5 |
| +1 | 60 | 95 | C4–B6 |
| +2 | 72 | 107 | C5–B7 |

**Boundary invariant**: `setOctaveOffset` is only called when the result stays within [−2, +2]. The up/down control buttons are rendered as `disabled` when the boundary is reached.

---

## 3. LabelVisibility

Whether note names are shown on the keys.

```typescript
/** false = labels hidden (default). true = labels shown. Session-only (not persisted). */
type LabelVisibility = boolean;
```

**React state**: `const [showLabels, setShowLabels] = useState<LabelVisibility>(false);`

**Default**: `false` (labels off on first load and after navigation).

---

## 4. PressedKeys

The set of MIDI note numbers currently held down (attack received, release not yet received).

```typescript
/** Set of currently pressed MIDI note numbers */
type PressedKeys = Set<number>;
```

**React state**: `const [pressedKeys, setPressedKeys] = useState<PressedKeys>(new Set());`

Used to apply the `key--pressed` CSS class for visual feedback.

---

## 5. PlayedNotes

The sequence of note events already played, fed to the host `StaffViewer`.

```typescript
/** Ordered list of attack events committed to the staff.
 *  Grows as keys are released (durationMs measured on release).
 *  Capped at MAX_DISPLAYED_NOTES (20) — oldest dropped when full. */
type PlayedNotes = PluginNoteEvent[];
```

**React state**: `const [playedNotes, setPlayedNotes] = useState<PlayedNotes>([]);`

**Initial state**: `[]` — produces an empty staff (FR-015).

**Mutation**: Notes are appended on **key release** (not key press) so that `durationMs` can be included.

---

## 6. AttackTimestamps (ref)

Not React state (no re-render needed). A `Map` from MIDI note number to the `Date.now()` value when that key was pressed.

```typescript
/** midiNote → Date.now() at attack time. Used to calculate durationMs on release. */
const attackTimestamps = useRef<Map<number, number>>(new Map());
```

---

## 7. Component State Summary

All state lives in `VirtualKeyboardPro.tsx`:

| State field | Type | Default | Purpose |
|---|---|---|---|
| `octaveOffset` | `OctaveShift` (−2..2) | `0` | Current octave shift; determines displayed MIDI range |
| `showLabels` | `boolean` | `false` | Toggle note name labels on keys |
| `pressedKeys` | `Set<number>` | `new Set()` | Keys visually highlighted as pressed |
| `playedNotes` | `PluginNoteEvent[]` | `[]` | Feed to StaffViewer; empty = empty staff |
| `lastReleasedMidi` | `number \| null` | `null` | Most recently released note for staff highlight |

**Refs** (not state):

| Ref | Type | Purpose |
|---|---|---|
| `attackTimestamps` | `Map<number, number>` | Attack time per MIDI note → compute durationMs |
| `pressedKeysRef` | `Set<number>` | Stale-closure-safe copy for unmount cleanup |
| `lastTouchTimeRef` | `number` | Touch/mouse dual-source guard (500 ms window) |
| `isMouseHeldRef` | `boolean` | Slide-to-play guard — track primary mouse button state |

---

## 8. Derived Values (useMemo)

| Derived | Dependencies | Purpose |
|---|---|---|
| `visibleNotes: ResolvedNote[]` | `octaveOffset` | All 36 keys with adjusted midi/label for current shift |
| `whiteNotes: ResolvedNote[]` | `visibleNotes` | 21 white keys for keyboard rendering |
| `blackNotes: ResolvedNote[]` | `visibleNotes` | 15 black keys for keyboard rendering |
| `timestampOffset: number` | `playedNotes` | Origin timestamp for WASM tick conversion |
| `highlightedNoteIndex: number \| undefined` | `playedNotes` | Staff highlight index for most recent note |

---

## 9. Plugin API Types Consumed

The plugin consumes (imports) the following types from the host Plugin API. No new types are added.

| Type | Used for |
|---|---|
| `MusicorePlugin` | Default export interface satisfied by `index.tsx` |
| `PluginContext` | Injected by host; stored at module scope in `index.tsx` |
| `PluginNoteEvent` | Emitted via `context.emitNote()` and `context.playNote()`; also the element type of `PlayedNotes` |
| `PluginManifest` | Read-only via `context.manifest` (for version display if needed) |
| `PluginStaffViewerProps` | Props type for `context.components.StaffViewer` |

---

## 10. State Transitions

### Octave shift

```
[octaveOffset: 0] --octave-up--> [octaveOffset: 1] --octave-up--> [octaveOffset: 2] (up disabled)
[octaveOffset: 0] --octave-down--> [octaveOffset: -1] --octave-down--> [octaveOffset: -2] (down disabled)
```

Shifting octave does **not** clear `playedNotes` — the staff retains all previously played notes (at their original absolute MIDI pitches). New notes played after shifting are at the new range.

### Label toggle

```
[showLabels: false] --toggle--> [showLabels: true] --toggle--> [showLabels: false]
```

### Key press lifecycle

```
keyDown(note) → add to pressedKeys → context.playNote(attack) → context.emitNote()
keyUp(midi)   → remove from pressedKeys → context.playNote(release) → append to playedNotes
```
