# Research: Piano Practice Exercise

**Feature**: 001-piano-practice  
**Date**: 2026-02-22  
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## 1. Beat-Slot Alignment Strategy

**Decision**: Time-based alignment using expected onset timestamps computed at view load time.

**Rationale**: At 80 BPM with quarter notes the period is exactly 750 ms/beat. Each beat slot `i` has an expected onset at `i × 750 ms` from the moment Play is pressed. When a note onset arrives (from the stabilised pitch detector) its timestamp is compared against all unfilled beat-slot windows. The slot with |expected − actual| < 200 ms (FR-006) and the smallest distance wins. This is a simple greedy O(N) scan — adequate for 8 notes.

**Alternatives considered**:
- Tick-based alignment using 960 PPQ — unnecessary complexity; the exercise is real-time only, not stored as a score.
- DTW (dynamic time warping) — addresses global timing drift but adds significant algorithmic complexity for 8 notes.
- Onset-order alignment (slot N always matches response note N) — ignores timing entirely; misleading for late/early notes.

---

## 2. Pitch Comparison at ±50 Cents

**Decision**: Convert detected Hz to fractional MIDI cents, compare against target MIDI note; distance ≤ 50 cents → Correct pitch.

**Formula**:
```
detectedCents = 100 × (12 × log2(hz / 440) + 69)   // fractional MIDI in cents
targetCents   = targetMidiNote × 100
deviation     = |detectedCents − targetCents|
correct_pitch = deviation ≤ 50
```

**Rationale**: The existing `hzToMidi` in RecordingStaff rounds to integer MIDI, which loses sub-semitone precision. For scoring we need the raw fractional value. This approach is already consistent with `PitchSample.hz` from the pitch detection service — no new data needed.

**Decision source**: Clarification Q1 (2026-02-22).

---

## 3. Microphone Lifecycle Pattern

**Decision**: Reuse `useAudioRecorder` hook from the Recording feature, or extract a minimal subset.

**Analysis of `useAudioRecorder`**:
- Starts mic on `start()` call, not on mount — but it returns `session.state` which the caller can observe
- The Practice view needs mic active immediately on mount (before Play) to warm up the AudioWorklet
- **Pattern**: Call `start()` in a `useEffect` on mount; gate note-to-slot assignment in the `onmessage` handler to only accumulate during the playback window

**Decision**: Create a new `usePracticeRecorder` hook that wraps the same AudioWorklet lifecycle but starts mic on mount and exposes a `isCapturing` flag controlled by the exercise playback state. This avoids modifying the existing hook (Principle VII: no regressions).

**Alternatives considered**:
- Modify `useAudioRecorder` to accept a `startOnMount` param — risks breaking existing Recording view tests.
- Inline all recorder logic in the Practice view — violates DRY and FR-014.

---

## 4. Note Synthesis for Exercise Playback

**Decision**: Use `OscillatorNode` chain identical to `RecordingStaff.handlePlayNotes()`.

**Rationale**: Pattern already proven in the codebase. MIDI → Hz conversion: `440 × 2^((midi-69)/12)`. Each note uses a short soft envelope (10 ms attack, 20 ms release) to avoid clicks. Notes scheduled via `AudioContext.currentTime` offsets — deterministic and sample-accurate.

**Beat highlighting**: A `setTimeout` per note fires ~50 ms before the audio onset to update a `highlightedSlotIndex` state; this ensures the visual highlight appears slightly before the sound (same pattern used in `PlaybackControls`).

---

## 5. Scoring Formula

**Decision**: Two-component formula, both components 0–1, equally weighted.

```
pitchScore   = (correctPitchSlots) / totalSlots
timingScore  = (correctTimingSlots) / totalSlots
finalScore   = round(50 × pitchScore + 50 × timingScore)
```

Where a slot is "correct pitch" if the assigned response note has deviation ≤ 50 cents, and "correct timing" if the onset offset from expected beat is ≤ 200 ms. Missed slots contribute 0 to both components. Extraneous notes reduce the denominator equivalently (treated as virtual missed slots appended to totalSlots).

**Boundary conditions**:
- All 8 correct → 50×1 + 50×1 = 100 ✓
- All missed → 0 + 0 = 0 ✓
- 4 correct pitch, 4 wrong pitch, all on-time → 50×0.5 + 50×1 = 75

---

## 6. Exercise Generation

**Decision**: `generateExercise(count = 8, seed?: number): ExerciseNote[]`

Picks `count` pitches uniformly at random from the 8 MIDI values C3–C4 (MIDI 48–60). Implemented as a pure function with optional seed for deterministic test fixtures. No constraint against adjacent repeats in v1 (as per spec Assumptions).

**C3–C4 MIDI mapping**:
| Note | MIDI |
|------|------|
| C3   | 48   |
| D3   | 50   |
| E3   | 52   |
| F3   | 53   |
| G3   | 55   |
| A3   | 57   |
| B3   | 59   |
| C4   | 60   |

---

## 7. Component Integration Pattern (App.tsx routing)

**Decision**: Extend the existing `showRecording` / `onShowRecording` pattern in App.tsx with a parallel `showPractice` / `onShowPractice` flag.

No router library is used (existing pattern uses boolean flags + conditional render for debug views). The `ScoreViewer` will receive an `onShowPractice` prop gated on `debugMode`, the same as `onShowRecording`.

---

## 8. Reuse vs. New Files

| Concern | Reused | New |
|---------|--------|-----|
| Pitch detection | `pitchDetection.ts` (FR-014) | — |
| AudioWorklet registration | `audio-processor.worklet.js` | — |
| Score display | `NotationLayoutEngine` + `NotationRenderer` | — |
| Note highlighting | `highlightedNoteIds` prop on `NotationRenderer` | — |
| Recorder lifecycle | — | `usePracticeRecorder.ts` |
| Exercise logic | — | `exerciseGenerator.ts` |
| Scoring algorithm | — | `exerciseScorer.ts` |
| Practice view | — | `PracticeView.tsx` + `.css` |
| Types | `types/recording.ts` (PitchSample) | `types/practice.ts` |

---

## 9. Test Strategy

- **Unit tests** (Vitest): `exerciseGenerator`, `exerciseScorer`, `usePracticeRecorder` (hook tests with mocked AudioContext)
- **Component tests** (Vitest + @testing-library/react): `PracticeView` rendering, Play/Stop state transitions, results report display
- **No new E2E tests**: Feature is debug-only; existing E2E suite not extended (consistent with Recording view precedent)
