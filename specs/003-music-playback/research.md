# Research: Music Playback

**Feature**: 003-music-playback | **Date**: 2026-02-07  
**Purpose**: Resolve technical unknowns and establish implementation approach

## Research Tasks

### 1. Tone.js Library Selection & Architecture

**Question**: How should Tone.js be integrated for piano synthesis with accurate timing?

**Research Findings**:

- **Tone.js Version**: Use latest stable (14.7.x). Installation: `npm install tone`
- **Audio Context**: Tone.js wraps Web Audio API's AudioContext. Must be started after user interaction (browser autoplay policy).
- **Timing Architecture**: Tone.js provides `Tone.Transport` for scheduling events, but for precise MIDI-like playback, use `Tone.Draw.schedule()` or direct `Tone.now()` + offset calculations.
- **Piano Synthesis Options**:
  - **Tone.Sampler** (recommended): Uses audio samples for realistic piano sound. Can load from CDN (e.g., tonejs-instruments). ~500KB for grand piano samples.
  - **Tone.PolySynth**: Synthesized sound using oscillators. Lighter weight (~0KB samples) but less realistic. Good for MVP if bundle size matters.
  
**Decision**: Use **Tone.PolySynth** with sine/triangle waves for MVP to minimize bundle size and avoid sample loading latency. Piano-like timbre achieved with ADSR envelope (attack=0.005s, decay=0.3s, sustain=0.5, release=1s). Sampler-based piano deferred to future iteration.

**Rationale**: 
- Faster time-to-value (no sample loading), smaller bundle
- PolySynth supports polyphony out of the box (10+ voices)
- ADSR envelope provides sufficient "piano-like" character for initial user testing
- Migration to Sampler later is straightforward (same API)

---

### 2. Timing Calculation: Ticks → Milliseconds

**Question**: How to convert 960 PPQ tick positions to real-time milliseconds for audio scheduling?

**Research Findings**:

- **Formula**: `time_ms = (tick_position / PPQ) * (60000 / tempo_bpm)`
  - Example: At 120 BPM, 1 quarter note = 960 ticks = 500ms
  - At 60 BPM, 1 quarter note = 960 ticks = 1000ms
- **PPQ Constant**: 960 ticks per quarter note (from constitution)
- **Tempo Source**: Score entity should have `tempo` field (BPM). Default to 120 BPM if missing.
- **JavaScript Precision**: Number type uses 64-bit float (safe for integer ticks up to 2^53). No precision loss for scores <100 hours.

**Decision**: Implement `ticksToSeconds(ticks: number, tempo: number): number` utility function in PlaybackScheduler. Use seconds (not milliseconds) internally to match Tone.js API (Tone.now() returns seconds).

**Formula Implementation**:
```typescript
function ticksToSeconds(ticks: number, tempo: number, ppq: number = 960): number {
  const beatsPerSecond = tempo / 60;
  const ticksPerSecond = beatsPerSecond * ppq;
  return ticks / ticksPerSecond;
}
```

**Rationale**: Pure function with no side effects, easily testable, matches Tone.js timing conventions.

---

### 3. MusicTimeline → PlaybackScheduler → Tone.js Event Flow

**Question**: How should components interact to schedule and play notes?

**Research Findings**:

**Architecture Components**:

1. **MusicTimeline** (React component/hook):
   - Responsibilities: Track playback state (playing/paused/stopped), manage current tick position, trigger scheduling
   - State: `{ status: 'stopped' | 'playing' | 'paused', currentTick: number }`
   - Methods: `play()`, `pause()`, `stop()`

2. **PlaybackScheduler** (pure service class):
   - Responsibilities: Convert Note[] + tempo → Tone.js events, calculate timing, schedule notes
   - Input: `{ notes: Note[], tempo: number, startTick: number }`
   - Output: Array of scheduled Tone.js event IDs (for cancellation)
   - Methods: `scheduleNotes()`, `clearSchedule()`

3. **ToneAdapter** (Tone.js wrapper):
   - Responsibilities: Initialize audio context, expose Tone.Sampler/PolySynth, handle browser autoplay policy
   - Methods: `init()`, `playNote(pitch, duration, time)`, `stopAll()`

**Event Flow**:
```
User clicks Play
  → MusicTimeline.play()
    → ToneAdapter.init() (if not initialized)
    → PlaybackScheduler.scheduleNotes(notes, tempo, currentTick)
      → For each note: ToneAdapter.playNote(pitch, duration, startTime)
        → Tone.js schedules audio events
  → MusicTimeline tracks currentTick via Tone.Transport or requestAnimationFrame

User clicks Pause
  → MusicTimeline.pause()
    → Tone.Transport.pause() (preserves current position)

User clicks Stop
  → MusicTimeline.stop()
    → PlaybackScheduler.clearSchedule()
    → Tone.Transport.stop()
    → Reset currentTick = 0
```

**Decision**: Implement three separate modules with clear boundaries:
- `MusicTimeline.ts`: State management only (React hook: `usePlayback`)
- `PlaybackScheduler.ts`: Pure timing calculations and scheduling logic
- `ToneAdapter.ts`: Audio API wrapper with error handling

**Rationale**: Separation of concerns enables independent testing. PlaybackScheduler has zero React/DOM dependencies (testable with Jest alone). ToneAdapter isolates Tone.js API, making it swappable if needed.

---

### 4. Polyphonic Playback Support

**Question**: How to handle multiple simultaneous notes (e.g., chords)?

**Research Findings**:

- **Tone.PolySynth**: Built-in polyphony support. Constructor: `new Tone.PolySynth(Tone.Synth, { maxPolyphony: 16 })`
- **Note Scheduling**: Each note scheduled independently via `polySynth.triggerAttackRelease(note, duration, time)`
- **Voice Stealing**: If maxPolyphony exceeded, oldest note is stopped automatically
- **Simultaneous Notes**: Notes with identical start_tick schedule at same `time` parameter → Tone.js plays concurrently

**Decision**: Use `Tone.PolySynth` with `maxPolyphony: 16` (exceeds SC-005 requirement of 10 notes). Schedule all notes upfront in batch (not streaming).

**Rationale**: Batch scheduling is simpler for MVP (no need for lookahead buffer or streaming). 16-voice polyphony provides headroom beyond requirements.

---

### 5. Best Practices: Web Audio API Autoplay Policy

**Question**: How to handle browser autoplay restrictions?

**Research Findings**:

- **Chrome/Firefox/Safari Policy**: AudioContext must be resumed after user gesture (click, touch, keypress)
- **Tone.js Handling**: Call `await Tone.start()` in event handler (button click). Returns promise that resolves when context is running.
- **Error Scenarios**: If start() fails, show error message to user: "Click to enable audio"
- **State Management**: Track AudioContext state: `context.state` → 'running' | 'suspended' | 'closed'

**Decision**: 
1. Initialize Tone.js lazily (on first Play button click)
2. Wrap `Tone.start()` in try-catch with user-facing error message
3. Add visual indicator if audio context is suspended ("Click Play to enable audio")

**Rationale**: Aligns with browser security model. User-friendly error handling meets SC-009 (95% browser compatibility).

---

### 6. MIDI Pitch Mapping (Backend → Frontend)

**Question**: How should MIDI pitch values be stored and interpreted?

**Research Findings**:

- **Backend**: Store pitch as integer (MIDI note number: 0-127). No changes needed (already in Note entity from Feature 001).
- **Frontend**: Tone.js accepts MIDI number or scientific pitch notation (e.g., "C4")
  - Conversion: `Tone.Frequency(midiNumber, "midi").toNote()` → "C4"
  - Or direct: `polySynth.triggerAttackRelease(60, "8n")` (MIDI 60 = middle C)
- **Piano Range**: Standard piano is MIDI 21 (A0) to 108 (C8). Out-of-range notes should be skipped or clamped.

**Decision**: Store MIDI numbers in backend (existing), convert to Tone.js format in ToneAdapter:
```typescript
playNote(midiPitch: number, durationSeconds: number, time: number) {
  if (midiPitch < 21 || midiPitch > 108) {
    console.warn(`Note ${midiPitch} outside piano range, skipping`);
    return;
  }
  this.polySynth.triggerAttackRelease(
    Tone.Frequency(midiPitch, "midi").toNote(),
    durationSeconds,
    time
  );
}
```

**Rationale**: Backend remains domain-agnostic (MIDI is music standard). Frontend adapter handles presentation concerns (Tone.js API).

---

### 7. Pause/Resume Implementation Strategy

**Question**: How to pause mid-playback and resume without timing drift?

**Research Findings**:

- **Tone.Transport Approach**: Use `Tone.Transport.start()`, `.pause()`, `.stop()`. Transport maintains internal clock.
  - Pros: Built-in pause/resume, no manual tick tracking
  - Cons: Transport is global state, harder to test, overkill for single-timeline playback
  
- **Manual Timing Approach**: Track `currentTick` in component state, schedule notes with `Tone.now() + offset`
  - Pros: Explicit control, easier to test, no global state
  - Cons: Must implement pause logic manually

**Decision**: **Manual timing approach**:
1. On Play: Calculate `startTime = Tone.now()`, schedule all notes with `time = startTime + ticksToSeconds(note.start_tick - currentTick)`
2. On Pause: Record `currentTick = playbackStartTick + (Tone.now() - startTime) * tempo`, cancel all scheduled events
3. On Resume: Repeat Play logic with updated `currentTick`

**Rationale**: Simpler architecture (no global Transport state), testable without Tone.js (mock Tone.now()), explicit about timing logic. Meets SC-006 (pause maintains exact position).

---

### 8. Testing Strategy: Audio Without Actual Playback

**Question**: How to test audio scheduling logic without hearing sounds in CI?

**Research Findings**:

- **Tone.js Offline Rendering**: `Tone.Offline()` renders audio to buffer without playing. Good for integration tests.
- **Mock Tone.js**: Create mock ToneAdapter interface for unit tests:
  ```typescript
  interface IToneAdapter {
    init(): Promise<void>;
    playNote(pitch: number, duration: number, time: number): void;
    stopAll(): void;
  }
  ```
  Test with mock that records calls instead of playing audio.
  
- **Timing Tests**: Test `ticksToSeconds()` calculation with known inputs/outputs (no audio needed)
- **Component Tests**: React Testing Library with mock `usePlayback` hook

**Decision**: 
1. **Unit tests**: Mock ToneAdapter, test PlaybackScheduler and MusicTimeline in isolation
2. **Integration tests**: Use Tone.Offline() to verify audio is scheduled correctly (check buffer output)
3. **E2E tests**: Manual testing in browser (automated audio E2E too flaky for CI)

**Rationale**: Balances test coverage with CI practicality. Critical timing logic tested via pure functions. Audio synthesis tested via offline rendering. UI tested with mocks.

---

### 9. Performance: Bundle Size Impact

**Question**: What is the bundle size impact of adding Tone.js?

**Research Findings**:

- **Tone.js minified + gzip**: ~170KB (v14.7.x)
- **Alternative**: Howler.js (~10KB) - simpler but less powerful (no scheduling, ADSR)
- **Tree-shaking**: Tone.js is modular; import only needed classes: `import { PolySynth, start, now } from 'tone'` reduces size to ~120KB
- **Constraint**: Frontend constraint is <200KB increase (from Feature 002 spec)

**Decision**: Use Tone.js with tree-shaking. Import only: `PolySynth`, `Synth`, `start`, `now`, `Frequency`. Estimated bundle increase: ~120KB (within constraint).

**Rationale**: Tone.js provides scheduling precision and ADSR envelopes essential for music playback quality. 120KB is acceptable for core feature. Howler.js lacks scheduling capabilities needed for accurate timing.

---

### 10. Instrument Entity: Backend Data Model

**Question**: What fields should the Instrument entity contain?

**Research Findings**:

- **Minimum Viable Instrument**:
  ```rust
  pub struct Instrument {
      pub id: String,
      pub instrument_type: String, // "piano", "guitar", etc.
  }
  ```
  
- **Future Extensions** (out of scope for MVP):
  - `volume: f32` (0.0-1.0)
  - `pan: f32` (-1.0 right, 1.0 left)
  - `midi_program: u8` (General MIDI instrument number)
  - `sample_library: Option<String>` (URL to sample pack)

**Decision**: MVP Instrument entity (backend):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Instrument {
    pub id: String,
    pub instrument_type: String, // Always "piano" for MVP
}

impl Default for Instrument {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            instrument_type: "piano".to_string(),
        }
    }
}
```

Add `instrument: Instrument` field to Score struct. All existing scores get default instrument via migration or on-demand initialization.

**Rationale**: Minimal data model reduces implementation scope. Single instrument_type field is sufficient for MVP (always "piano"). ID enables future multi-instrument support. Default implementation ensures backward compatibility.

---

## Summary: Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Piano Synthesis | Tone.PolySynth (synthesized) | Smaller bundle, no sample loading, sufficient quality for MVP |
| Timing Calculation | Pure function: `ticksToSeconds()` | Testable, matches Tone.js API (seconds) |
| Architecture | MusicTimeline + PlaybackScheduler + ToneAdapter | Separation of concerns, testable in isolation |
| Polyphony | Tone.PolySynth with maxPolyphony=16 | Exceeds requirement (10 notes), automatic voice stealing |
| Autoplay Policy | Lazy init with Tone.start() on Play click | Browser-compliant, user-friendly error handling |
| Pause/Resume | Manual timing with currentTick tracking | Simpler than Transport, testable without Tone.js |
| Testing | Mock ToneAdapter + Tone.Offline rendering | Unit tests without audio, integration tests verify scheduling |
| Bundle Size | Tone.js with tree-shaking (~120KB) | Within <200KB constraint, provides essential features |
| Instrument Entity | `{ id: String, instrument_type: String }` | Minimal MVP model, extensible for future features |

## Technology Stack Confirmation

✅ **Tone.js 14.7+**: Web Audio API wrapper for synthesis and scheduling  
✅ **React 18+**: Existing frontend framework (no changes)  
✅ **TypeScript 5.0+**: Type safety for timing calculations  
✅ **Jest + React Testing Library**: Existing test infrastructure  
✅ **Rust + serde**: Backend instrument serialization  

## Open Questions for Phase 1 (Design)

None - all technical unknowns resolved. Ready to proceed to data model design and API contracts.
