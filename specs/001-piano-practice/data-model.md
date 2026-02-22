# Data Model: Piano Practice Exercise

**Feature**: 001-piano-practice  
**Date**: 2026-02-22  
**Source**: spec.md Key Entities + research.md

All types are in-memory only (no persistence). New types live in `frontend/src/types/practice.ts`. Existing types from `frontend/src/types/recording.ts` (`PitchSample`) are imported where needed.

---

## Types

### `ExerciseNote`

One entry in the target exercise sequence.

```ts
interface ExerciseNote {
  /** Slot index: 0-based position in the exercise (0 = first note) */
  slotIndex: number;
  /** Target MIDI pitch (48 = C3 … 60 = C4) */
  midiPitch: number;
  /** Expected onset time in ms from the moment Play is pressed */
  expectedOnsetMs: number;
}
```

**Constraints**:
- `midiPitch` ∈ {48, 50, 52, 53, 55, 57, 59, 60} (C3–C4, diatonic + C4)
- `expectedOnsetMs = slotIndex × (60_000 / bpm)` at the configured BPM (default 80)
- Array always has exactly 8 elements in v1

---

### `Exercise`

The immutable sequence of target notes for one session.

```ts
interface Exercise {
  /** Ordered target notes */
  notes: ExerciseNote[];
  /** Beats per minute used to compute onset times */
  bpm: number;
}
```

**Validation rules**:
- `notes.length === 8` (v1 fixed count)
- `bpm > 0`
- `notes[i].slotIndex === i` for all i

---

### `ResponseNote`

A note detected from the user's microphone during playback.

```ts
interface ResponseNote {
  /** Detected frequency in Hz */
  hz: number;
  /** Fractional MIDI value for precise cent comparison */
  midiCents: number;   // = 12 × log2(hz/440) + 69  (scale: MIDI notes × 100)
  /** Detected onset offset in ms from the moment Play was pressed */
  onsetMs: number;
  /** Raw detection confidence [0, 1] from pitchy */
  confidence: number;
}
```

**Derivation**: `midiCents` is computed from `hz` at the time the note onset is emitted by `usePracticeRecorder`.

---

### `NoteComparisonStatus`

Classification of one beat slot.

```ts
type NoteComparisonStatus =
  | 'correct'       // pitch within ±50 cents AND timing within ±200 ms
  | 'wrong-pitch'   // response detected in slot window, deviation > 50 cents
  | 'wrong-timing'  // pitch within ±50 cents, but onset outside ±200 ms window
  | 'missed'        // no response note detected for this slot
  | 'extraneous';   // response note that doesn't map to any slot (surplus)
```

---

### `NoteComparison`

The pairing of one target slot with its best-matching response note (if any).

```ts
interface NoteComparison {
  /** The target note for this slot */
  target: ExerciseNote;
  /** The user-played note assigned to this slot, or null if missed */
  response: ResponseNote | null;
  /** Classification result */
  status: NoteComparisonStatus;
  /** Pitch deviation in cents (|detectedMidiCents − targetMidi×100|); null if missed */
  pitchDeviationCents: number | null;
  /** Timing deviation in ms (|response.onsetMs − target.expectedOnsetMs|); null if missed */
  timingDeviationMs: number | null;
}
```

---

### `ExerciseResult`

Complete result for one attempt.

```ts
interface ExerciseResult {
  /** Per-slot comparisons (length = exercise.notes.length) */
  comparisons: NoteComparison[];
  /** Extraneous response notes that were not assigned to any slot */
  extraneousNotes: ResponseNote[];
  /** Final score 0–100 */
  score: number;
  /** Number of slots with correct pitch (deviation ≤ 50 cents) */
  correctPitchCount: number;
  /** Number of slots with correct timing (onset deviation ≤ 200 ms) */
  correctTimingCount: number;
}
```

---

### `PracticePhase`

State machine for the practice view UI.

```ts
type PracticePhase =
  | 'ready'       // Mic active (or error), exercise loaded, waiting for Play
  | 'playing'     // Playback running, mic capturing
  | 'results';    // Playback finished, results visible
```

**Transitions**:
```
ready ──[Play pressed]──► playing ──[all notes done OR Stop]──► results
results ──[Try Again]──► ready (same exercise)
results ──[New Exercise]──► ready (new exercise)
```

---

## Entity Relationships

```
Exercise
  └── notes[]: ExerciseNote[]        (8 items, ordered by slotIndex)

ExerciseResult
  ├── comparisons[]: NoteComparison[] (one per ExerciseNote slot)
  │     ├── target: ExerciseNote
  │     └── response: ResponseNote | null
  └── extraneousNotes[]: ResponseNote[]

usePracticeRecorder (hook)
  ├── emits: ResponseNote (via onset callback during playing phase)
  └── reads: PitchSample from pitchDetection.ts (FR-014 reuse)
```

---

## State Transitions — Scoring

```
All slots classified:
  correctPitchCount   = comparisons.filter(c => pitchDeviationCents ≤ 50).length
  correctTimingCount  = comparisons.filter(c => timingDeviationMs ≤ 200).length
  extraPenaltySlots   = extraneousNotes.length
  totalSlots          = comparisons.length + extraPenaltySlots

  pitchScore  = correctPitchCount  / totalSlots   ∈ [0, 1]
  timingScore = correctTimingCount / totalSlots   ∈ [0, 1]
  score       = Math.round(50 × pitchScore + 50 × timingScore)
```

---

## Validation Rules (enforced in `exerciseScorer.ts`)

| Rule | Condition |
|------|-----------|
| Pitch correct | `pitchDeviationCents ≤ 50` |
| Timing correct | `timingDeviationMs ≤ 200` |
| Extraneous | `response.onsetMs` not within ±200 ms of any unfilled slot |
| Missed | No `ResponseNote` assigned to slot |
| Score boundary | `score ∈ [0, 100]`, `Math.round` ensures integer output |
