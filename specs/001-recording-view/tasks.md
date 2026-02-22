# Tasks: Recording View

**Input**: Design documents from `/specs/001-recording-view/`
**Feature Branch**: `001-recording-view`
**Generated**: 2026-02-22

**Available docs**: spec.md, plan.md, research.md  
**Missing docs**: data-model.md (entities inlined from spec.md), contracts/ (service contracts inlined from plan.md)

---

## Phase 1: Setup

**Purpose**: Install the `pitchy` library, create domain types, and create the AudioWorklet processor file — prerequisites for all subsequent work.

- [X] T001 Install pitchy npm package in frontend/ (`npm install pitchy`)
- [X] T002 [P] Create frontend/src/types/recording.ts with all recording domain types: `RecordingSessionState`, `RecordingSession`, `AudioFrame`, `PitchSample`, `NoteOnset`, `OscilloscopeState`
- [X] T003 [P] Create frontend/public/audio-processor.worklet.js — AudioWorklet processor that accumulates 2048-sample batches from the 128-sample hardware render quantum and posts `{ type: 'pcm', buffer: Float32Array }` to the main thread via `this.port.postMessage(slice, [slice.buffer])`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Web Audio API mock utilities needed by every test task in Phases 3–7.

**⚠️ CRITICAL**: All test tasks depend on this phase completing first.

- [X] T004 Extend frontend/src/test/setup.ts with Web Audio mock utilities: `makeAudioContextMock()` factory, `stubGetUserMedia(stream, error?)` helper, `HTMLCanvasElement.prototype.getContext` 2D context stub, and `requestAnimationFrame`/`cancelAnimationFrame` synchronous stubs

**Checkpoint**: Mock utilities available — test tasks in Phases 3–7 can now be written and will fail correctly.

---

## Phase 3: User Story 1 — Debug Gate (Priority: P1) 🎯 MVP

**Goal**: A "Record View" button appears in the Instruments View only with `?debug=true`; pressing it navigates to the Recording View. The button and route are completely absent in production.

**Independent Test**: Load without `?debug=true` → no button visible anywhere. Load with `?debug=true` → button appears in ScoreViewer → pressing it shows RecordingView → back button returns to ScoreViewer.

### Tests for User Story 1

> **Write these FIRST — verify they FAIL before implementation**

- [X] T005 [P] [US1] Write failing test: Record View button is absent from ScoreViewer when rendered without `?debug=true` in frontend/src/components/recording/RecordingView.test.tsx
- [X] T006 [P] [US1] Write failing test: Record View button is visible in ScoreViewer when rendered with `?debug=true` in frontend/src/components/recording/RecordingView.test.tsx
- [X] T007 [P] [US1] Write failing test: pressing the Record View button mounts `RecordingView` and unmounts `ScoreViewer` in frontend/src/components/recording/RecordingView.test.tsx
- [X] T008 [US1] Write failing test: pressing the back button in `RecordingView` unmounts it and restores `ScoreViewer` in frontend/src/components/recording/RecordingView.test.tsx

### Implementation for User Story 1

- [X] T009 [P] [US1] Create frontend/src/components/recording/RecordingView.tsx — shell component with page heading and a back "← Instruments" button; no audio yet
- [X] T010 [P] [US1] Create frontend/src/components/recording/RecordingView.css — basic layout styles for the recording page
- [X] T011 [US1] Add `debugMode` boolean derived from `?debug=true` URL param and `showRecording` state to frontend/src/App.tsx; render `<RecordingView onBack={() => setShowRecording(false)} />` when `showRecording` is true (pattern mirrors existing `showDemo` state)
- [X] T012 [US1] Add debug-gated "Record View" button to frontend/src/components/ScoreViewer.tsx — accept `debugMode` and `onShowRecording` props; render button only when `debugMode === true`

**Checkpoint**: US1 fully functional and independently testable — no audio required.

---

## Phase 4: User Story 2 — Microphone Capture (Priority: P2)

**Goal**: A Start/Stop Recording toggle button in `RecordingView` opens the microphone via `getUserMedia` + `AudioWorklet`. Errors (denied, no mic, unsupported) are displayed clearly. All resources released on stop or navigation.

**Independent Test**: Press "Start Recording" → `getUserMedia` called → "recording active" shown, button becomes "Stop Recording". Press again → resources released. Deny permission → "Microphone access required" shown.

### Tests for User Story 2

> **Write these FIRST — verify they FAIL before implementation**

- [X] T013 [P] [US2] Write failing unit tests for `useAudioRecorder` hook in frontend/src/services/recording/useAudioRecorder.test.ts — covers: Start Recording calls `getUserMedia({ audio: true })`, microphone permission denied sets error state "Microphone access required", no microphone device sets error "No microphone detected", `AudioWorklet` not supported sets error "AudioWorklet not supported in this browser"
- [X] T014 [P] [US2] Write failing unit test: calling stop() on `useAudioRecorder` disconnects AudioWorkletNode, closes AudioContext, and calls `track.stop()` on all MediaStream tracks in frontend/src/services/recording/useAudioRecorder.test.ts
- [X] T015 [US2] Write failing integration test: Start/Stop button label toggles between "Start Recording" and "Stop Recording", and recording-active indicator appears/disappears in frontend/src/components/recording/RecordingView.test.tsx

### Implementation for User Story 2

- [X] T016 [US2] Create frontend/src/services/recording/useAudioRecorder.ts — React hook managing `RecordingSession` state, `getUserMedia`, `AudioContext({ sampleRate: 44100 })`, `audioWorklet.addModule('/audio-processor.worklet.js')`, `AudioWorkletNode`, teardown in a cleanup `useEffect`; posts `AudioFrame` buffers via `workletNode.port.onmessage` callback prop
- [X] T017 [US2] Wire `useAudioRecorder` into frontend/src/components/recording/RecordingView.tsx — add Start/Stop toggle button, recording-active indicator, and human-readable error display (`role="alert"`)

**Checkpoint**: US2 fully functional and testable independently.

---

## Phase 5: User Story 3 — Oscilloscope Visualization (Priority: P3)

**Goal**: A canvas oscilloscope renders live PCM waveform at ≥ 30 fps while recording. Shows flat line on silence; waveform on sound. Shows static flat line when stopped.

**Independent Test**: Recording active + silence → flat line on canvas. Recording active + sound → waveform amplitude visible. Recording stopped → static flat line.

### Tests for User Story 3

> **Write these FIRST — verify they FAIL before implementation**

- [X] T018 [P] [US3] Write failing unit tests for `OscilloscopeCanvas` in frontend/src/components/recording/OscilloscopeCanvas.test.tsx — covers: canvas element rendered, `clearRect` called on each frame, flat line when all-zero buffer, non-zero buffer results in `lineTo` calls with non-zero y offsets, `cancelAnimationFrame` called when recording stops

### Implementation for User Story 3

- [X] T019 [US3] Create frontend/src/components/recording/OscilloscopeCanvas.tsx — `<canvas>` element with `requestAnimationFrame` draw loop; accepts `waveform: Float32Array | null` prop; draws centred waveform using Canvas 2D API; loop cancels on unmount via `useEffect` cleanup
- [X] T020 [US3] Accumulate `AudioFrame` buffers in `RecordingView` state and pass latest `waveform` prop to `OscilloscopeCanvas` in frontend/src/components/recording/RecordingView.tsx

**Checkpoint**: US3 fully functional — oscilloscope visible during recording.

---

## Phase 6: User Story 4 — Pitch Detection & Current Note Display (Priority: P4)

**Goal**: Each PCM frame is analysed by `pitchy` (MPM algorithm); notes with confidence ≥ 0.9 are shown in the UI within 200 ms of onset. "—" is shown when no pitch detected.

**Independent Test**: Sustain A4 sine wave → "A4" displayed. Silence → "—". Confidence < 0.9 → "—".

### Tests for User Story 4

> **Write these FIRST — verify they FAIL before implementation**

- [X] T021 [P] [US4] Write failing unit tests for `pitchDetection.ts` in frontend/src/services/recording/pitchDetection.test.ts — covers: all-zero buffer returns `null`; synthetic 440 Hz sine returns `{ hz: ~440, confidence: ≥0.9, note: "A4" }`; confidence < 0.9 returns `null`; `hzToNoteName` returns "C2" for 65.41 Hz, "A4" for 440 Hz, "C7" for 2093 Hz
- [X] T022 [P] [US4] Write failing integration test: current-note display shows "—" when `currentPitch` is null and "A4" when pitch is provided in frontend/src/components/recording/RecordingView.test.tsx

### Implementation for User Story 4

- [X] T023 [US4] Create frontend/src/services/recording/pitchDetection.ts — `PitchDetector.forFloat32Array(2048)` singleton; `detectPitch(buffer, sampleRate): PitchSample | null` (returns null when clarity < 0.9 or Hz outside C2–C7 range); `hzToNoteName(hz): string` using MIDI formula
- [X] T024 [US4] Call `detectPitch` on each incoming `AudioFrame` in `useAudioRecorder`; expose `currentPitch: PitchSample | null`; wire current-note display element in frontend/src/components/recording/RecordingView.tsx

**Checkpoint**: US4 fully functional — current pitch name displayed live.

---

## Phase 7: User Story 5 — Note History List (Priority: P5)

**Goal**: Each new note onset (pitch change or 300 ms silence gap) is appended to a scrollable bounded list (max 200 entries). List auto-scrolls to newest entry. "Clear" button empties it.

**Independent Test**: Play A4 → B4 → C5 → 3 entries in list. Sustain A4 for 5 s → no duplicates. Same note after 300 ms silence → new entry. List scrolls. Clear empties.

### Tests for User Story 5

> **Write these FIRST — verify they FAIL before implementation**

- [X] T025 [P] [US5] Write failing unit tests for onset detection logic in frontend/src/services/recording/useAudioRecorder.test.ts — covers: new pitch appended to history; same pitch sustained continuously produces no duplicate within 5 s; same pitch after 300 ms silence generates a new entry; list capped at 200 (oldest entry removed)
- [X] T026 [P] [US5] Write failing unit tests for `NoteHistoryList` component in frontend/src/components/recording/NoteHistoryList.test.tsx — covers: renders all entries with note name and timestamp, auto-scrolls on new entry (`scrollTop === scrollHeight`), Clear button empties list, empty list renders placeholder text

### Implementation for User Story 5

- [X] T027 [US5] Add onset detection state to frontend/src/services/recording/useAudioRecorder.ts — track `lastDetectedNote` and `lastDetectedAt`; on each `PitchSample`: if note changed or note unchanged but silence gap ≥ 300 ms has elapsed, append new `NoteOnset` to `noteHistory`; cap array at 200 (shift oldest)
- [X] T028 [US5] Create frontend/src/components/recording/NoteHistoryList.tsx — scrollable `<ul>` with `useEffect` auto-scroll via `ref.current.scrollTop = ref.current.scrollHeight`; "Clear" button; placeholder text when empty; entry format: `note octave · elapsed`
- [X] T029 [US5] Wire `NoteHistoryList` and `noteHistory`/`clearHistory` into frontend/src/components/recording/RecordingView.tsx

**Checkpoint**: All five user stories functional and independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T030 [P] Add iOS Safari detection in frontend/src/components/recording/RecordingView.tsx — check `/iPad|iPhone/.test(navigator.userAgent)` on mount; render a `role="alert"` banner "iOS Safari has limited AudioWorklet support — some features may not work" before showing the main recording UI
- [X] T031 [P] Handle mid-session audio device loss in frontend/src/services/recording/useAudioRecorder.ts — attach `stream.getTracks()[0].onended` listener to set error state "Microphone disconnected" and run teardown
- [X] T032 Run full Vitest suite (`npm test -- --run`) from frontend/, confirm all new tests pass and no existing tests regress

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all test tasks
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (RecordingView shell must exist)
- **Phase 5 (US3)**: Depends on Phase 4 (`AudioFrame` buffers must exist)
- **Phase 6 (US4)**: Depends on Phase 4 (PCM frames must flow); parallel with Phase 5
- **Phase 7 (US5)**: Depends on Phase 6 (`PitchSample` must exist)
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2 — no audio needed
- **US2 (P2)**: Requires US1 (RecordingView shell to wire into)
- **US3 (P3)**: Requires US2 (AudioFrame buffers from useAudioRecorder)
- **US4 (P4)**: Requires US2 (PCM frames); can proceed in parallel with US3
- **US5 (P5)**: Requires US4 (PitchSample to detect onsets)

### Within Each User Story

1. Write all test tasks first → verify they fail
2. Implement in order: types → services → components → wiring
3. Run tests → all should pass before moving to next phase

### Parallel Opportunities

- T002 and T003 (Phase 1) can run in parallel
- T005, T006, T007 (US1 tests) can run in parallel
- T009 and T010 (US1 impl: component + CSS) can run in parallel
- T013 and T014 (US2 tests) can run in parallel
- T021 and T022 (US4 tests) can run in parallel
- T025 and T026 (US5 tests) can run in parallel
- US3 (Phase 5) and US4 (Phase 6) can proceed in parallel once US2 is complete

---

## Parallel Example: User Story 1

```bash
# Terminal 1 — test: button absent without debug
# Write T005 first, run vitest to confirm RED

# Terminal 2 — test: button visible with debug (parallel with T005)
# Write T006, run vitest to confirm RED

# Terminal 3 — test: navigation (parallel with T005, T006)
# Write T007, run vitest to confirm RED

# After all tests RED:
# Implement T009 (RecordingView shell) — no conflicts with T010 CSS
# Implement T010 (RecordingView.css) — parallel with T009
# Implement T011 (App.tsx + T012 ScoreViewer.tsx) — sequential, then run tests GREEN
```

---

## Implementation Strategy

**MVP scope (suggested)**: Complete Phases 1–3 (Setup + Foundational + US1) first. This delivers a working navigation-to-Recording-View with zero risk to the existing app. Each subsequent phase adds one complete, independently verifiable capability.

**Incremental delivery**:
- After Phase 3: Debug gate live — US1 done
- After Phase 4: Mic capture live — US2 done
- After Phase 5 or 6 (parallel): Oscilloscope or pitch detection live
- After Phase 7: Full feature complete
- After Phase 8: Production-hardened

## Summary

| Phase | Story | Tasks | Parallel [P] |
|-------|-------|-------|--------------|
| Phase 1: Setup | — | T001–T003 | 2 |
| Phase 2: Foundational | — | T004 | 0 |
| Phase 3 | US1 (P1) 🎯 MVP | T005–T012 | 4 |
| Phase 4 | US2 (P2) | T013–T017 | 3 |
| Phase 5 | US3 (P3) | T018–T020 | 1 |
| Phase 6 | US4 (P4) | T021–T024 | 2 |
| Phase 7 | US5 (P5) | T025–T029 | 2 |
| Phase 8: Polish | — | T030–T032 | 2 |
| **Total** | | **32 tasks** | **16 [P]** |
