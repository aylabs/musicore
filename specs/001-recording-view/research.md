# Research: Recording View

**Feature**: `001-recording-view`  
**Date**: 2026-02-22  

---

## Decision 1 — AudioWorklet PCM Transfer Strategy

**Decision**: Use `MessagePort.postMessage()` to transfer `Float32Array` slices from the AudioWorklet processor to the main thread.

**Rationale**: `MessagePort` with transferable `ArrayBuffer` is zero-copy and supported without additional HTTP headers. The alternative — `SharedArrayBuffer` with Atomics — offers lower latency via lock-free ring buffers but requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` HTTP headers, complicating PWA deployment. For a debug-only feature, the MessagePort approach is sufficient and simpler.

**Alternatives considered**:
- `SharedArrayBuffer` + Atomics: rejected (HTTP headers complexity, unnecessary for debug scope)
- `ScriptProcessorNode`: explicitly out of spec (FRs require AudioWorklet; ScriptProcessor is deprecated and blocks the UI thread)

**Implementation detail**: Batch 2048 samples internally in the processor before posting (hardware render quantum is 128 samples). Post as `{ type: 'pcm', buffer: float32Slice }` with transfer.

---

## Decision 2 — Pitch Detection Library

**Decision**: Use the `pitchy` npm library (v4.1.0, 0BSD licence, ~33 kB, zero dependencies).

**Rationale**: `pitchy` implements the **McLeod Pitch Method (MPM)**, a normalized autocorrelation variant that suppresses octave errors via peak-picking with a `clarity` threshold. Its API maps exactly to the spec's requirements:
- `PitchDetector.forFloat32Array(2048)` matches the chosen buffer size
- `detector.findPitch(buffer, 44100)` returns `[hz, clarity]` — `clarity` (0–1) maps directly to `confidence`
- `clarity >= 0.9` implements the spec's confidence gate (FR-013)

**Alternatives considered**:
- YIN from scratch: ~120 lines, moderate correctness risk, confidence output non-standard — rejected in favour of battle-tested library
- Naive autocorrelation from scratch: prone to octave errors in the C2–C7 range — rejected

**Hz → note name conversion** (standard equal temperament, A4 = 440 Hz):
```
midi = round(12 × log₂(hz / 440) + 69)
noteName = NOTE_NAMES[midi % 12] + (floor(midi / 12) − 1)
NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
```

---

## Decision 3 — AudioContext Configuration

**Decision**: `new AudioContext({ sampleRate: 44100 })` with 2048-sample internal buffer in the processor.

**Rationale**: 44100 Hz is the universally supported sample rate. 2048 samples ≈ 46 ms at 44100 Hz — enough frequency resolution for low notes (C2 ≈ 65 Hz requires lag up to ~677 samples) while keeping latency well inside the 200 ms spec requirement (FR-006). Hardware render quantum is 128 samples; processor accumulates 16 quanta before posting.

---

## Decision 4 — Navigation: Debug Gate Implementation

**Decision**: The `?debug=true` URL parameter already initializes Eruda in `App.tsx`. A new `showRecording` boolean state (analogous to `showDemo`) will gate a `RecordingView` page render. A "Record View" button added to `ScoreViewer` (visible only when `debugMode` prop is true) triggers navigation by lifting state to `App`.

**Rationale**: The project does not use React Router — all "routing" is URL query-param state read once on mount. Reusing this pattern is the lowest-friction integration. No router library needs to be added.

**Alternatives considered**:
- React Router v6: rejected (not in the project, adds dependency for a two-page debug flow)
- Floating overlay: rejected (user clarified: separate navigable page)

---

## Decision 5 — Testing Strategy

**Decision**: Three test layers, written in TDD order:
1. **Unit tests** for `pitchDetection.ts` — pure functions, no DOM, synthetic sine wave fixtures
2. **Unit tests** for `useAudioRecorder` hook — manual mocks of `AudioContext` and `getUserMedia` via `vi.stubGlobal`
3. **Integration tests** for `RecordingView`, `OscilloscopeCanvas`, `NoteHistoryList` — `@testing-library/react` with canvas and RAF stubs

**Key mocking requirements** (happy-dom has no Web Audio API support):
- `AudioContext` → `vi.stubGlobal('AudioContext', vi.fn(...))`
- `navigator.mediaDevices.getUserMedia` → `Object.defineProperty(navigator, 'mediaDevices', ...)`
- `requestAnimationFrame` → `vi.stubGlobal('requestAnimationFrame', cb => { cb(0); return 0; })`
- `HTMLCanvasElement.prototype.getContext` → `vi.fn(() => 2D context stub)`

**Alternatives considered**:
- jsdom: nearly identical Web Audio support (none), canvas has marginal symbol advantage — happy-dom already configured as project standard, no change needed
