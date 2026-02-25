# Tasks: MIDI Input for Recording View

**Input**: Design documents from `/specs/029-midi-input/`
**Feature Branch**: `029-midi-input`
**Generated**: 2026-02-25

**Available docs**: spec.md, plan.md, research.md, data-model.md, contracts/midi-service.ts, quickstart.md

---

## Phase 1: Setup

**Purpose**: Extend the recording domain types and create the `midiUtils` pure-function library — the zero-dependency prerequisites that every subsequent task relies on.

- [X] T001 Extend `frontend/src/types/recording.ts` with new entities: `MidiDevice`, `InputSource` (discriminated union), `MidiNoteEvent`, `MidiConnectionEvent` — as defined in `contracts/midi-service.ts`
- [X] T002 [P] Create `frontend/src/services/recording/midiUtils.ts` — `midiNoteToLabel(noteNumber: number): string` (MIDI note number → scientific pitch label e.g. "A4") and `parseMidiNoteOn(data, sessionStartMs, eventTimeMs): MidiNoteEvent | null` (filters to note-on only, velocity > 0, all channels) per `contracts/midi-service.ts`
- [X] T003 [P] Write unit tests for `midiUtils.ts` in `frontend/src/services/recording/midiUtils.test.ts` — covers: `midiNoteToLabel(60)` = "C4"; `midiNoteToLabel(69)` = "A4"; `midiNoteToLabel(61)` = "C#4"; `parseMidiNoteOn` returns `MidiNoteEvent` for 0x90 + velocity > 0; returns `null` for velocity 0 (note-off in disguise); returns `null` for 0x80 (note-off); returns `null` for 0xB0 (CC); all 16 channels accepted

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Web MIDI API mock utilities needed by every hook and component test in Phases 3–7.

**⚠️ CRITICAL**: All test tasks in Phases 3–7 depend on this phase completing first.

- [X] T004 Create `frontend/src/test/mockMidi.ts` — Web MIDI API stubs for Vitest/happy-dom: `mockMidiSupported(access)` (stubs `navigator.requestMIDIAccess` via `Object.defineProperty`), `mockMidiUnsupported()` (sets to `undefined`), `createMockMidiAccess(inputs?)` (returns `MIDIAccess` partial with live `Map`), `createMockMidiInput(name, id?)` (returns `MIDIInput` partial with `onmidimessage = null`), `fireMidiNoteOn(input, noteNumber, velocity?, channel?)` (calls `input.onmidimessage` directly to simulate a note event)
- [X] T005 Extend `frontend/src/test/setup.ts` to make `mockMidi` utilities available — import and re-export the stubs so test files can import from `../test/mockMidi`

**Checkpoint**: Mock utilities available — all test tasks in Phases 3–7 can now be written and will fail correctly.

---

## Phase 3: User Story 1 — MIDI Device Detected at Session Start (Priority: P1) 🎯 MVP

**Goal**: The Recording View automatically selects MIDI as the input source on load when a device is connected. Microphone is never opened. Falls back to microphone if no devices, unsupported browser, denied permission, or 3-second timeout.

**Independent Test**: Connect a MIDI keyboard → open Recording View → `activeSource` is `{ kind: 'midi' }`, no `getUserMedia` call made, mic permission never requested. Without MIDI → `activeSource` is `{ kind: 'microphone' }`. Browser without MIDI support → same microphone fallback, info message shown.

### Tests for User Story 1

> **Write these FIRST — verify they FAIL before implementation**

- [X] T006 [P] [US1] Write failing unit tests for `useMidiInput` in `frontend/src/services/recording/useMidiInput.test.ts` — covers: hook calls `requestMIDIAccess({ sysex: false })` on mount; returns `devices` array populated from `MIDIAccess.inputs`; `isSupported` is `false` when `requestMIDIAccess` absent in `navigator`; sets `error` "MIDI access denied" when promise rejects with `DOMException`; hook cleans up `onmidimessage` and `onstatechange` on unmount
- [X] T007 [P] [US1] Write failing unit test: `useMidiInput` sets `error` "MIDI access timed out" and returns empty `devices` when `requestMIDIAccess` does not resolve within 3 seconds in `frontend/src/services/recording/useMidiInput.test.ts`
- [X] T008 [P] [US1] Write failing integration test: `RecordingView` sets `activeSource.kind` to `'midi'` and renders the device name when `mockMidiSupported` returns a device in `frontend/src/components/recording/RecordingView.test.tsx`
- [X] T009 [US1] Write failing integration test: `RecordingView` sets `activeSource.kind` to `'microphone'` when `mockMidiUnsupported()` is active, and renders a "MIDI not supported in this browser" info message in `frontend/src/components/recording/RecordingView.test.tsx`

### Implementation for User Story 1

- [X] T010 [US1] Create `frontend/src/services/recording/useMidiInput.ts` — React hook: calls `navigator.requestMIDIAccess({ sysex: false })` on mount with a 3-second `Promise.race` timeout; iterates `MIDIAccess.inputs` to build `devices: MidiDevice[]`; subscribes `onstatechange` (debounced 300 ms for connect, immediate for disconnect) via `onConnectionChange` callback; cleans up all handlers on unmount (set `onmidimessage = null` on all inputs, `onstatechange = null`); exposes `{ devices, error, isSupported }` per contract in `contracts/midi-service.ts`
- [X] T011 [US1] Wire `useMidiInput` into `frontend/src/components/recording/RecordingView.tsx` — add `activeSource: InputSource` state (initialised to `microphone`); on mount, call `useMidiInput` with callbacks; if `devices.length > 0` after enumeration, set `activeSource` to `{ kind: 'midi', deviceName, deviceId }` of first device; if `!isSupported` or `error` (denied / timeout), remain on `microphone` and surface info message

**Checkpoint**: US1 fully functional — MIDI device auto-selected on load, microphone fallback works, browser-incompatibility fallback works.

---

## Phase 4: User Story 2 — Clear Input Source Indicator (Priority: P2)

**Goal**: A persistent `InputSourceBadge` shows "Microphone" or "MIDI — [device name]" at all times in the Recording View regardless of recording state. The oscilloscope is replaced by `MidiVisualizationPlaceholder` when MIDI is active.

**Independent Test**: `activeSource = { kind: 'microphone' }` → badge reads "Microphone", oscilloscope visible. `activeSource = { kind: 'midi', deviceName: 'Piano' }` → badge reads "MIDI — Piano", placeholder visible in same layout area.

### Tests for User Story 2

> **Write these FIRST — verify they FAIL before implementation**

- [X] T012 [P] [US2] Write failing unit tests for `InputSourceBadge` in `frontend/src/components/recording/InputSourceBadge.test.tsx` — covers: renders "Microphone" text for `{ kind: 'microphone' }`; renders "MIDI — Piano" for `{ kind: 'midi', deviceName: 'Piano', deviceId: 'x' }`; visible in idle state; visible in recording active state; visible in error state
- [X] T013 [P] [US2] Write failing unit test for `MidiVisualizationPlaceholder` in `frontend/src/components/recording/MidiVisualizationPlaceholder.test.tsx` — renders default message "Waveform not available in MIDI mode"; renders custom `message` prop when provided; component has same CSS class/dimensions slot as oscilloscope canvas
- [X] T014 [P] [US2] Write failing integration test: `RecordingView` renders `OscilloscopeCanvas` when `activeSource.kind === 'microphone'` and `MidiVisualizationPlaceholder` when `activeSource.kind === 'midi'` in `frontend/src/components/recording/RecordingView.test.tsx`

### Implementation for User Story 2

- [X] T015 [P] [US2] Create `frontend/src/components/recording/InputSourceBadge.tsx` — small badge component accepting `source: InputSource` prop; renders "Microphone" or "MIDI — [deviceName]" per `InputSourceBadgeProps` contract
- [X] T016 [P] [US2] Create `frontend/src/components/recording/MidiVisualizationPlaceholder.tsx` — div/section occupying the same layout slot as `OscilloscopeCanvas`; renders placeholder text; accepts optional `message` prop override per `MidiVisualizationPlaceholderProps` contract
- [X] T017 [P] [US2] Add CSS for `InputSourceBadge` and `MidiVisualizationPlaceholder` in `frontend/src/components/recording/RecordingView.css` — badge styling (prominent, readable in all recording states); placeholder dimensions matching oscilloscope canvas area
- [X] T018 [US2] Wire `InputSourceBadge` and `MidiVisualizationPlaceholder` into `frontend/src/components/recording/RecordingView.tsx` — render `<InputSourceBadge source={activeSource} />` always visible; render `<MidiVisualizationPlaceholder />` in place of `<OscilloscopeCanvas />` when `activeSource.kind === 'midi'`

**Checkpoint**: US2 fully functional — source indicator visible in all states, oscilloscope correctly swapped for placeholder in MIDI mode.

---

## Phase 5: User Story 3 — MIDI Hot-Connect Dialog During Microphone Session (Priority: P3)

**Goal**: When a MIDI device connects while microphone is the active source, a modal dialog appears within 2 seconds. Offers "Switch to MIDI" and "Keep Microphone". Auto-dismisses after 30 seconds (→ "Keep Microphone"). All paths preserve note history uninterrupted.

**Independent Test**: Microphone mode active → simulate `MidiConnectionEvent { kind: 'connected' }` → dialog renders with countdown → click "Keep Microphone" → dialog closed, `activeSource` unchanged → simulate again → click "Switch to MIDI" → `activeSource` is midi, `noteHistory` preserved.

### Tests for User Story 3

> **Write these FIRST — verify they FAIL before implementation**

- [X] T019 [P] [US3] Write failing unit tests for `MidiDetectionDialog` in `frontend/src/components/recording/MidiDetectionDialog.test.tsx` — covers: renders device name; renders visible countdown starting at 30; countdown decrements each second; clicking "Keep Microphone" calls `onKeep`; clicking "Switch to MIDI" calls `onSwitch(device)`; countdown reaching 0 calls `onKeep` (auto-dismiss); Escape key press calls `onKeep`; multiple devices listed with first pre-selected; `clearInterval` called on unmount
- [X] T020 [P] [US3] Write failing integration test: `RecordingView` renders `MidiDetectionDialog` when `useMidiInput` fires `onConnectionChange({ kind: 'connected' })` while `activeSource === 'microphone'` in `frontend/src/components/recording/RecordingView.test.tsx`
- [X] T021 [US3] Write failing integration test: after "Switch to MIDI" in dialog, `activeSource` becomes midi source, `noteHistory` entries from mic session are preserved, `useAudioRecorder` teardown is called in `frontend/src/components/recording/RecordingView.test.tsx`

### Implementation for User Story 3

- [X] T022 [US3] Create `frontend/src/components/recording/MidiDetectionDialog.tsx` — modal dialog accepting `MidiDetectionDialogProps` contract: lists `devices`, pre-selects first, shows "Switch to MIDI" + "Keep Microphone" buttons, renders countdown seconds, implements `setInterval` + `useEffect` auto-dismiss pattern, handles Escape via `onKeyDown`
- [X] T023 [US3] Wire hot-connect dialog in `frontend/src/components/recording/RecordingView.tsx` — add `showMidiDialog: boolean` and `pendingMidiDevices: MidiDevice[]` state; `onConnectionChange` callback: if `kind === 'connected'` and `activeSource.kind === 'microphone'` (debounced 300 ms per `useMidiInput`) → set `showMidiDialog = true`, `pendingMidiDevices = devices`; `onSwitch(device)` handler: call `micRecorder.stopCapture()` + AudioContext/stream teardown, set `activeSource` to midi, close dialog; `onKeep` handler: close dialog, source unchanged

**Checkpoint**: US3 fully functional — hot-connect dialog shown, both paths (switch/keep) work, note history preserved throughout.

---

## Phase 6: User Story 4 — MIDI Note Capture and History (Priority: P4)

**Goal**: When MIDI is active and recording is started, every note-on event is captured and appended to the history list. Current-note display reflects the latest pressed key. 200-entry cap is enforced.

**Independent Test**: MIDI active, Start Recording → simulate note-on 60 (C4) → current-note display shows "C4", history list has 1 entry → simulate note-on 64 (E4) → "E4" in display, 2 entries → hold E4 down (no more note-ons) → no duplicates added → release all → display shows "—".

### Tests for User Story 4

> **Write these FIRST — verify they FAIL before implementation**

- [X] T024 [P] [US4] Write failing unit tests for `useMidiInput` note event path in `frontend/src/services/recording/useMidiInput.test.ts` — covers: `fireMidiNoteOn(input, 69)` triggers `onNoteOn` with `label: "A4"`; `fireMidiNoteOn(input, 60, 0)` (velocity 0) does NOT trigger `onNoteOn`; note-on on channel 5 triggers `onNoteOn` (all channels); 0xB0 Control Change message does NOT trigger `onNoteOn`; `onNoteOn.timestampMs` is session-relative
- [X] T025 [P] [US4] Write failing integration tests in `frontend/src/components/recording/RecordingView.test.tsx` — covers: MIDI note-on appends `NoteOnset` entry to `NoteHistoryList`; current-note display shows note label; no keys pressed shows "—"; 201st note-on removes oldest entry (200-entry cap)

### Implementation for User Story 4

- [X] T026 [US4] Extend `frontend/src/services/recording/useMidiInput.ts` — in `subscribeToInputs()`, attach `onmidimessage` to each `MIDIInput`; for each message, call `parseMidiNoteOn(event.data, sessionStartMs, event.timeStamp)`; if result is non-null, invoke `onNoteOn` callback; `sessionStartMs` passed in via updated `UseMidiInputCallbacks` (add `sessionStartMs?: number`)
- [X] T027 [US4] Wire MIDI note events in `frontend/src/components/recording/RecordingView.tsx` — implement `onNoteOn` callback: construct `NoteOnset` from `MidiNoteEvent` (`confidence: 1.0`, `elapsedMs: timestampMs`); prepend/append to `noteHistory`; enforce 200-entry cap using existing `shift()` pattern; set `currentNote` display state; when all keys released (infer from note-off detection or key tracking) reset display to "—"

**Checkpoint**: US4 fully functional — MIDI note-on events flow into history list and current-note display.

---

## Phase 7: User Story 5 — MIDI Device Disconnection Handling (Priority: P5)

**Goal**: When the MIDI keyboard unplugs during MIDI recording, a "MIDI device disconnected" error is shown within 1 second, capture stops gracefully, and a "Switch to Microphone" recovery button is available.

**Independent Test**: MIDI recording active → simulate `MidiConnectionEvent { kind: 'disconnected' }` → error message "MIDI device disconnected" shown, recording stops, history list preserved → press "Switch to Microphone" → `activeSource` becomes microphone, mic recording starts.

### Tests for User Story 5

> **Write these FIRST — verify they FAIL before implementation**

- [X] T028 [P] [US5] Write failing unit test: `useMidiInput` fires `onConnectionChange({ kind: 'disconnected' })` immediately
- [X] T029 [P] [US5] Write failing integration tests in `frontend/src/components/recording/RecordingView.test.tsx` — MIDI disconnect alert, history preserved, source badge returns to Microphone

### Implementation for User Story 5

- [X] T030 [US5] Extend disconnect path in `frontend/src/services/recording/useMidiInput.ts` — in `onstatechange` handler: if `port.state === 'disconnected'`, fire `onConnectionChange` immediately (skip debounce); if `port.state === 'connected'`, apply the existing 300 ms debounce
- [X] T031 [US5] Handle disconnect in `frontend/src/components/recording/RecordingView.tsx` — error banner + active source reverts to microphone

**Checkpoint**: All five user stories functional and independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T032 [P] Verify zero regression on existing mic-mode tests — run `frontend/` Vitest on the unchanged components (`OscilloscopeCanvas`, `NoteHistoryList`, `useAudioRecorder`, `pitchDetection`) and confirm all previously passing tests still pass
- [X] T033 Run full Vitest suite (`npm test -- --run`) from `frontend/`, confirm all new tests pass and no existing tests regress

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all test tasks in Phases 3–7
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (`activeSource` state must exist in `RecordingView`)
- **Phase 5 (US3)**: Depends on Phase 3 (`useMidiInput.onConnectionChange` must exist)
- **Phase 6 (US4)**: Depends on Phase 3 (`useMidiInput` mounted); can proceed in parallel with Phase 5
- **Phase 7 (US5)**: Depends on Phase 3 (`useMidiInput` disconnect path); can proceed in parallel with Phase 5 and Phase 6
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2 — foundational hook + state
- **US2 (P2)**: Requires US1 (`activeSource` state in `RecordingView`)
- **US3 (P3)**: Requires US1 (`useMidiInput.onConnectionChange` callback wired); can proceed in parallel with US2
- **US4 (P4)**: Requires US1 (`useMidiInput` mounted, `onNoteOn` callback slot available); can proceed in parallel with US2 and US3
- **US5 (P5)**: Requires US1 (disconnect path in `useMidiInput`); can proceed in parallel with US2, US3, US4

### Within Each User Story

1. Write all test tasks first → verify they fail (RED)
2. Implement in order: types → services → components → wiring
3. Run tests → all should pass (GREEN) before moving to next phase

### Parallel Opportunities

- T002 and T003 (Phase 1) can run in parallel
- T006, T007 (US1 hook tests) can run in parallel
- T008, T009 (US1 integration tests) can run sequentially after T006/T007 are written
- T012, T013, T014 (US2 tests) can all run in parallel
- T015, T016, T017 (US2 impl: two new components + CSS) can run in parallel
- T019, T020 (US3 tests) can run in parallel
- T024, T025 (US4 tests) can run in parallel
- T028, T029 (US5 tests) can run in parallel
- US3 (Phase 5), US4 (Phase 6), US5 (Phase 7) tests can all be written in parallel once US1 is complete

---

## Parallel Example: User Story 2

```bash
# All three tests for US2 together (after US1 checkpoint):
Task T012: "Write failing unit tests for InputSourceBadge in InputSourceBadge.test.tsx"
Task T013: "Write failing unit test for MidiVisualizationPlaceholder in MidiVisualizationPlaceholder.test.tsx"
Task T014: "Write failing integration test for oscilloscope/placeholder swap in RecordingView.test.tsx"

# All three implementation tasks for US2 together (after tests fail):
Task T015: "Create InputSourceBadge.tsx"
Task T016: "Create MidiVisualizationPlaceholder.tsx"
Task T017: "Add CSS styles in RecordingView.css"
```

---

## Implementation Strategy

**MVP (Minimum Viable Product)**: Complete Phase 3 (US1) only — MIDI device auto-selected at load, microphone correctly not opened. This is the foundation that makes the feature useful.

**Full delivery order**:
1. Phase 3 (US1) — auto-detection at load
2. Phase 4 (US2) — always-visible indicator + oscilloscope placeholder
3. Phase 5 (US3) or Phase 6 (US4) in parallel — dialog or note capture
4. Phase 7 (US5) — disconnection handling
5. Phase 8 — regression validation

**Zero regression guarantee**: The existing mic-mode path in `RecordingView`, `useAudioRecorder`, `OscilloscopeCanvas`, `NoteHistoryList`, and `pitchDetection` is unchanged. All new code is additive. T032 validates this explicitly before the final test run.
