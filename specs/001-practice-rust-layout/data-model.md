# Data Model: Migrate Practice Layout to Rust Layout Engine

**Feature**: `001-practice-rust-layout`  
**Date**: 2026-02-24  
**Source**: [spec.md](spec.md) + [research.md](research.md)

---

## 1. Modified Entity: ExerciseNote

**File**: `frontend/src/types/practice.ts`

```typescript
export interface ExerciseNote {
  /** Stable layout/highlight identifier for this slot: "ex-{slotIndex}" */
  id: string;                // NEW — required for LayoutRenderer highlight
  /** Slot index: 0-based position in the exercise (0 = first note) */
  slotIndex: number;
  /** Target MIDI pitch (48–72 diatonic) */
  midiPitch: number;
  /** Expected onset time in ms from the moment Play is pressed */
  expectedOnsetMs: number;
}
```

**Validation rules**:
- `id` MUST equal `"ex-{slotIndex}"` — generated at creation time, never mutated
- `slotIndex` MUST be in range `[0, noteCount - 1]`
- `midiPitch` MUST be a diatonic MIDI pitch in the configured note pool

**State transitions**: `ExerciseNote` is immutable after generation. Created by `generateExercise()`, consumed by `serializeExerciseToLayoutInput()` and `buildPracticeSourceToNoteIdMap()`.

---

## 2. Modified Entity: Exercise

**File**: `frontend/src/types/practice.ts`

No structural change. `notes: ExerciseNote[]` now contains notes with the `id` field. Existing `bpm` field unchanged.

---

## 3. New Service: practiceLayoutAdapter

**File**: `frontend/src/services/practice/practiceLayoutAdapter.ts`

Two pure functions with no side effects, no state:

### 3a. serializeExerciseToLayoutInput

Converts an `Exercise` to the JSON input object expected by `computeLayout` (the Rust WASM function).

```typescript
// Input domain type
Exercise { notes: ExerciseNote[], bpm: number }

// Output layout input schema (matches Rust engine's expected JSON)
ExerciseLayoutInput {
  instruments: [{
    id: "practice-instrument",
    name: "Piano",
    staves: [{
      clef: "Treble" | "Bass",           // from ExerciseConfig.clef
      time_signature: { numerator: 4, denominator: 4 },
      key_signature: { sharps: 0 },
      voices: [{
        notes: [{
          tick: number,      // slotIndex * 960 (quarter note at 960 PPQ)
          duration: number,  // always 960 (quarter note)
          pitch: number,     // ExerciseNote.midiPitch
        }]
      }]
    }]
  }]
}
```

**Tick assignment**: Each slot occupies exactly one quarter note = 960 ticks. `tick = slotIndex * 960`.

### 3b. buildPracticeSourceToNoteIdMap

Builds the `Map<string, string>` that `LayoutRenderer` uses to resolve glyph `SourceReference` → note id.

```typescript
// Input: exercise notes
ExerciseNote[]

// Output: source key → note id map
Map<SourceKey, NoteId>
// where SourceKey = "0/practice-instrument/0/0/{slotIndex}"
//       NoteId    = "ex-{slotIndex}"
```

**Derivation**: system_index=0 (always single system), instrument_id="practice-instrument", staff_index=0, voice_index=0, event_index=slotIndex.

### 3c. findPracticeNoteX (helper)

Locates the x-position (logical units) of the notehead glyph for a given `slotIndex` in an already-computed `GlobalLayout`.

```typescript
// Input
(layout: GlobalLayout, slotIndex: number) → number | null

// Walk: systems[0] → staff_groups[0] → staves[0] → glyph_runs → glyphs
// Match: glyph.source_reference.event_index === slotIndex
// Return: glyph.position.x (logical units); null if not found
```

---

## 4. Relationships

```
ExerciseNote[]
    │
    ├── serializeExerciseToLayoutInput()  ──→  ExerciseLayoutInput (WASM input JSON)
    │                                              │
    │                                         computeLayout()  ──→  GlobalLayout
    │                                              │
    │                             ┌────────────────┴─────────────┐
    │                             │                              │
    │                       LayoutRenderer              findPracticeNoteX()
    │                    (renders staff)              (auto-scroll lookup)
    │
    └── buildPracticeSourceToNoteIdMap()  ──→  Map<SourceKey, NoteId>
                                                    │
                                              LayoutRenderer
                                           (resolves highlights)
```

---

## 5. Not Changed

- `ResponseNote` — type unchanged; response staff serialization reuses `serializeExerciseToLayoutInput` with response pitch/tick values derived at render time
- `ExerciseResult`, `NoteComparison` — unchanged
- `ExerciseConfig` — unchanged
- `exerciseGenerator.ts` — only change: assign `id: \`ex-${i}\`` in the note factory
- `NotationLayoutEngine.ts` — NOT deleted (may be used elsewhere); just no longer imported by `PracticeView`
