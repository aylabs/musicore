# Data Model: Practice View Plugin & Plugin API Recording Extension

## New Public Plugin API Types

### `PluginPitchEvent`

A single pitch detection sample emitted to plugin pitch subscribers.
Part of the public Plugin API (exported from `src/plugin-api/index.ts`).

```ts
interface PluginPitchEvent {
  /** Detected MIDI note number (0–127). Integer — nearest semitone to detected Hz. */
  readonly midiNote: number;
  /** Detected frequency in Hz (raw, before rounding to MIDI). */
  readonly hz: number;
  /** Detection confidence (0.0 = noise / 1.0 = clean pitch). */
  readonly confidence: number;
  /** Epoch milliseconds (Date.now()) at the moment of detection. */
  readonly timestamp: number;
}
```

**Constraints**:
- `midiNote`: integer, clamped 0–127
- `hz`: positive float
- `confidence`: float 0.0–1.0
- `timestamp`: positive integer

---

### `PluginRecordingContext`

The `recording` namespace on `PluginContext`. Allows plugins to receive real-time pitch events from the microphone and to be notified of mic access errors.

```ts
interface PluginRecordingContext {
  /**
   * Subscribe to pitch detection events from the microphone.
   * Pitch events are always-on from the moment of subscription.
   * The plugin is responsible for filtering events by its own phase state.
   *
   * Returns an unsubscribe function. Calling it stops delivery of pitch events
   * to this handler and releases the microphone if no other subscriber remains.
   */
  subscribe(handler: (event: PluginPitchEvent) => void): () => void;
  /**
   * Register a handler to be called if microphone access fails or is revoked.
   * If mic is already in an error state when called, the handler fires on the
   * next microtask. The plugin must NOT call getUserMedia directly.
   *
   * Returns an unregister function.
   */
  onError(handler: (error: string) => void): () => void;
}
```

---

### `PluginNoteEvent` — `offsetMs` addition (backward-compatible)

`offsetMs` is a new **optional** field on the existing `PluginNoteEvent`. Omitting it preserves existing immediate-playback (`attackNote`) behaviour.

```ts
interface PluginNoteEvent {
  readonly midiNote: number;
  readonly timestamp: number;
  readonly velocity?: number;
  readonly type?: 'attack' | 'release';
  readonly durationMs?: number;
  /**
   * NEW (v2): Schedule this note to play `offsetMs` milliseconds after the
   * call to context.playNote() rather than immediately.
   * When present, the host uses ToneAdapter.playNote() with the corresponding
   * time offset instead of attackNote().
   * Omit (or set to 0) for immediate playback.
   */
  readonly offsetMs?: number;
}
```

---

### `PluginContext` — additions

Two new members added to the existing `PluginContext` interface:

```ts
interface PluginContext {
  // ... (existing members unchanged) ...

  /**
   * NEW (v2): Microphone pitch capture.
   * Always-on subscription — continuously delivers PluginPitchEvent as long as
   * subscribed. Raw audio/PCM is never accessible; only musically interpreted
   * pitch data is exposed.
   */
  readonly recording: PluginRecordingContext;

  /**
   * NEW (v2): Cancel all pending notes scheduled via context.playNote() with
   * offsetMs for this plugin. Safe no-op when nothing is scheduled.
   * Does not affect other plugins' scheduled notes.
   */
  stopPlayback(): void;
}
```

---

## New Host-Side Service

### `PluginMicBroadcaster`

A singleton service in `frontend/src/services/recording/PluginMicBroadcaster.ts` (NOT exported through the Plugin API — this is host infrastructure only).

```ts
class PluginMicBroadcaster {
  static getInstance(): PluginMicBroadcaster;

  /** Subscribe to pitch events. Opens mic on first subscriber. */
  subscribe(handler: (event: PluginPitchEvent) => void): () => void;

  /** Register an error handler. */
  onError(handler: (error: string) => void): () => void;

  /** For testing — returns whether the mic stream is currently open. */
  isActive(): boolean;
}
```

**State machine**:

```
idle ──[first subscribe]──► requesting ──[granted]──► active ──[all unsubscribe]──► idle
                                         └─[denied]──► error
active ──[OS revokes]──► error ──[retry not in scope]──► (user must reload)
```

**Key invariants**:
- At most one `getUserMedia` call in any session
- `subscribe` returns a stable unsubscribe function (safe to call multiple times)
- Pitch dispatch uses the same `detectPitch` function as `usePracticeRecorder` (shared code, no duplication)
- On error: all `onError` handlers are called; subsequent `subscribe` calls receive error immediately via `onError`

---

## Plugin-Internal Practice Types

These types live entirely within `frontend/plugins/practice-view/practiceTypes.ts`. They are NOT part of the Plugin API.

### `PracticeMode`

```ts
type PracticeMode = 'flow' | 'step';
```

### `PracticePhase`

```ts
type PracticePhase =
  | 'ready'      // mic/MIDI active, config visible, waiting for Play
  | 'countdown'  // 3…2…1…Go! countdown running
  | 'playing'    // exercise notes playing, capture active
  | 'results';   // exercise complete, score visible
```

**Transitions**:
```
ready ──[Play]──► countdown ──[countdown ends]──► playing ──[all done | Stop]──► results
results ──[Try Again]──► ready (same exercise)
results ──[New Exercise]──► ready (new random exercise)
```

### `PracticeExercise`

```ts
interface PracticeExercise {
  notes: Array<{
    midiPitch: number;
    expectedOnsetMs: number;  // ms offset from exercise start
  }>;
  bpm: number;
  mode: PracticeMode;
  clef: 'Treble' | 'Bass';
}
```

### `ExerciseConfig` (user-configurable)

```ts
interface ExerciseConfig {
  mode: PracticeMode;
  clef: 'Treble' | 'Bass';
  bpm: number;
  octavePool: number[];     // e.g. [3, 4] for one-hand, [2, 3, 4] for wide range
}
```

### `NoteComparison` (plugin-internal result type)

```ts
type NoteComparisonStatus = 'correct' | 'wrong-pitch' | 'missed' | 'extra';

interface NoteComparison {
  slotIndex: number;
  status: NoteComparisonStatus;
  targetMidi: number;
  responseMidi: number | null;
}
```

### `ExerciseResult` (plugin-internal)

```ts
interface ExerciseResult {
  comparisons: NoteComparison[];
  score: number;            // 0–100
  totalNotes: number;
  correctNotes: number;
}
```

---

## Entity Relationships

```
App.tsx (host)
├── PluginMicBroadcaster (singleton)
│   ├── pitchDetection.ts (shared)
│   └── subscribers: Set<(PluginPitchEvent) => void>
│
├── pluginTimersRef: Map<pluginId, Set<TimerId>>  ← per-plugin stopPlayback tracking
│
└── PluginContext (per plugin)
    ├── emitNote()           ← existing
    ├── playNote()           ← extended: reads event.offsetMs
    ├── stopPlayback()       ← NEW: clears pluginTimersRef[pluginId]
    ├── midi.subscribe()     ← existing
    ├── recording            ← NEW: wraps PluginMicBroadcaster
    │   ├── subscribe()
    │   └── onError()
    ├── components.StaffViewer ← existing
    └── manifest             ← existing

frontend/plugins/practice-view/   (plugin boundary)
├── exerciseGenerator.ts    ← plugin-internal copy
├── exerciseScorer.ts       ← plugin-internal copy
├── practiceTypes.ts        ← plugin-internal types
└── PracticePlugin.tsx
    ├── PracticePhase state machine
    ├── ExerciseConfig (user config UI)
    ├── context.recording.subscribe()  ← pitch capture
    ├── context.midi.subscribe()       ← MIDI capture
    ├── context.playNote({ offsetMs }) ← scheduled exercise playback
    ├── context.stopPlayback()         ← exercise cancel
    ├── context.components.StaffViewer (×2) ← exercise + response staffs
    └── ExerciseResult display
```
