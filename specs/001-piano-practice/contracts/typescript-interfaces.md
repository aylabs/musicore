# TypeScript Interface Contracts: Piano Practice Exercise

**Feature**: 001-piano-practice  
**Date**: 2026-02-22  
**Project type**: Frontend-only (no backend API endpoints; all logic is client-side)

This feature has no REST/GraphQL API surface. All contracts are TypeScript interfaces defining the boundaries between the modules in `frontend/src/`.

---

## Module: `types/practice.ts`

Single source of truth for all domain types. No external state, no persistence.

```typescript
// ─── Exercise ────────────────────────────────────────────────────────────────

export interface ExerciseNote {
  slotIndex: number;       // 0-based position in the sequence
  midiPitch: number;       // MIDI pitch, ∈ {48,50,52,53,55,57,59,60}
  expectedOnsetMs: number; // slotIndex × (60_000 / bpm)
}

export interface Exercise {
  notes: ExerciseNote[];   // always length 8 in v1
  bpm: number;             // default 80
}

// ─── Response ────────────────────────────────────────────────────────────────

export interface ResponseNote {
  hz: number;              // raw detected frequency
  midiCents: number;       // fractional MIDI ×100: 12×log2(hz/440)×100 + 6900
  onsetMs: number;         // ms since Play was pressed
  confidence: number;      // pitchy clarity [0,1]
}

// ─── Comparison & Result ─────────────────────────────────────────────────────

export type NoteComparisonStatus =
  | 'correct'
  | 'wrong-pitch'
  | 'wrong-timing'
  | 'missed'
  | 'extraneous';

export interface NoteComparison {
  target: ExerciseNote;
  response: ResponseNote | null;
  status: NoteComparisonStatus;
  pitchDeviationCents: number | null;  // null when missed
  timingDeviationMs: number | null;    // null when missed
}

export interface ExerciseResult {
  comparisons: NoteComparison[];       // length === exercise.notes.length
  extraneousNotes: ResponseNote[];     // response notes not matched to any slot
  score: number;                       // 0–100 integer
  correctPitchCount: number;
  correctTimingCount: number;
}

// ─── UI State Machine ────────────────────────────────────────────────────────

export type PracticePhase = 'ready' | 'playing' | 'results';
```

---

## Module: `services/practice/exerciseGenerator.ts`

```typescript
/**
 * generateExercise(bpm?, seed?) → Exercise
 *
 * Generates an 8-note exercise with pitches drawn uniformly from C3–C4.
 *
 * @param bpm     Tempo in beats per minute (default 80)
 * @param seed    Optional seeded random for deterministic tests
 */
export function generateExercise(bpm?: number, seed?: number): Exercise;
```

**Contract**:
- Returns an `Exercise` with exactly 8 `ExerciseNote` entries.
- `notes[i].slotIndex === i` for all i.
- `notes[i].midiPitch` ∈ `{48, 50, 52, 53, 55, 57, 59, 60}`.
- `notes[i].expectedOnsetMs === i × (60_000 / bpm)`.
- When `seed` is provided, the same sequence is produced across calls.

---

## Module: `services/practice/exerciseScorer.ts`

```typescript
/**
 * scoreExercise(exercise, responses, extraneousNotes) → ExerciseResult
 *
 * Classifies each beat slot and computes the final score.
 *
 * @param exercise         The target exercise
 * @param responses        Array of ResponseNotes captured during playback
 *                         (already assigned to slots by the recorder hook)
 * @param extraneousNotes  ResponseNotes that fell outside all beat windows
 */
export function scoreExercise(
  exercise: Exercise,
  responses: (ResponseNote | null)[],  // length === exercise.notes.length; null = missed
  extraneousNotes: ResponseNote[],
): ExerciseResult;
```

**Scoring formula** (as documented in data-model.md):
```
totalSlots     = exercise.notes.length + extraneousNotes.length
pitchScore     = correctPitchCount  / totalSlots
timingScore    = correctTimingCount / totalSlots
score          = Math.round(50 × pitchScore + 50 × timingScore)
```

---

## Module: `services/practice/usePracticeRecorder.ts`

```typescript
export interface UsePracticeRecorderReturn {
  /** 'idle' | 'requesting' | 'active' | 'error' */
  micState: 'idle' | 'requesting' | 'active' | 'error';
  /** Human-readable error when micState === 'error' */
  micError: string | null;
  /** Latest detected pitch from pitchDetection.ts (null when silent) */
  currentPitch: PitchSample | null;
  /**
   * Start capturing notes into slots.
   * @param exercise  Provides slot timing windows for alignment
   * @param startMs   AudioContext.currentTime-equivalent epoch ms for offset calc
   */
  startCapture(exercise: Exercise, startMs: number): void;
  /**
   * Stop capturing. Returns the captured response arrays.
   */
  stopCapture(): {
    responses: (ResponseNote | null)[];
    extraneousNotes: ResponseNote[];
  };
  /** Discard all captured data (called on Try Again / New Exercise) */
  clearCapture(): void;
}

/**
 * usePracticeRecorder()
 *
 * Requests microphone access on mount (not on startCapture). Keeps mic warm
 * so the first note of the exercise is captured without latency.
 *
 * Internally reuses pitchDetection.ts (FR-014).
 * Does NOT modify useAudioRecorder.ts (avoids regressions).
 */
export function usePracticeRecorder(): UsePracticeRecorderReturn;
```

---

## Component: `PracticeView`

```typescript
/**
 * PracticeView — Top-level practice exercise component.
 * Accessed via ?debug=true mode, gated by onShowPractice in ScoreViewer.
 */
interface PracticeViewProps {
  /** Called when the user navigates back from the practice view */
  onBack: () => void;
}

export function PracticeView(props: PracticeViewProps): JSX.Element;
```

**Internal state managed by this component**:

| State variable | Type | Description |
|---|---|---|
| `exercise` | `Exercise` | Current generated exercise (stable until New Exercise) |
| `phase` | `PracticePhase` | `'ready' \| 'playing' \| 'results'` |
| `result` | `ExerciseResult \| null` | Set when phase transitions to `'results'` |
| `highlightedSlotIndex` | `number \| null` | Slot currently highlighted during playback |

---

## Integration: `ScoreViewer.tsx` (existing, minor addition)

```typescript
// NEW prop (alongside existing onShowRecording):
interface ScoreViewerProps {
  debugMode: boolean;
  onShowRecording: () => void;
  onShowPractice: () => void;   // ← NEW
}
```

**Button added** (debug-mode only, same pattern as "Record View"):
```tsx
{debugMode && (
  <button className="practice-debug-btn" onClick={onShowPractice}>
    Practice
  </button>
)}
```

---

## Integration: `App.tsx` (existing, minor addition)

New state variable and routing branch (same pattern as `showRecording`):

```typescript
const [showPractice, setShowPractice] = useState(false);

// In JSX routing block:
if (showPractice) {
  return <PracticeView onBack={() => setShowPractice(false)} />;
}

// In ScoreViewer render:
<ScoreViewer
  debugMode={debugMode}
  onShowRecording={() => setShowRecording(true)}
  onShowPractice={() => setShowPractice(true)}   // ← NEW
/>
```
