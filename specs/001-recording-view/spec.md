# Feature Specification: Recording View

**Feature Branch**: `001-recording-view`
**Created**: 2026-02-22
**Status**: Draft
**Input**: "Recording view: debug-mode only, mic open and recording, oscilloscope showing audio capture, AudioWorklet for continuous recording without UI interference, pitch detection with growing list of detected notes"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Access the Recording View (Priority: P1)

A developer navigates to the app with `?debug=true` in the URL. In the Instruments View, a **Record View** button becomes visible. Pressing it navigates to the Recording View. In normal production use (no `?debug=true`), the button is completely absent — no extra route, no component rendered, no debug indicator visible anywhere.

**Why this priority**: Gatekeeping by URL parameter is the foundation everything else rests on. It must work before any audio work starts.

**Independent Test**: Load the app without `?debug=true` — no Record View button visible anywhere. Load with `?debug=true` — button appears in the Instruments View; pressing it opens the Recording View. No audio or pitch detection required.

**Acceptance Scenarios**:

1. **Given** the app loads without `?debug=true`, **When** the Instruments View renders, **Then** no Record View button or debug indicator is visible anywhere in the UI.
2. **Given** the app loads with `?debug=true`, **When** the Instruments View renders, **Then** a "Record View" button is visible.
3. **Given** the "Record View" button is visible and pressed, **When** navigation completes, **Then** the Recording View is shown.
4. **Given** the user is on the Recording View, **When** they navigate back, **Then** they return to the Instruments View.
5. **Given** the user is in debug mode, **When** they reload without `?debug=true`, **Then** the Record View button and the Recording View route are both inaccessible.

---

### User Story 2 — Open Microphone and Start Capturing Audio (Priority: P2)

Once in the Recording View, the user sees a single **Start/Stop Recording** toggle button. Pressing it starts recording (prompting for mic permission if needed); pressing it again stops recording and releases all audio resources. The mic never opens without an explicit user action.

**Why this priority**: Live audio capture is the input source for everything downstream.

**Independent Test**: Press "Start Recording" → permission prompt appears → "recording active" indicator shown, button label changes to "Stop Recording". Press "Stop Recording" → mic released, button returns to "Start Recording". Deny permission → clear error shown, no crash.

**Acceptance Scenarios**:

1. **Given** the Recording View is open and permission not yet requested, **When** the user presses "Start Recording", **Then** the browser's native permission dialog appears.
2. **Given** microphone permission is granted, **When** the user presses "Start Recording", **Then** a "recording active" indicator is shown, audio capture begins via AudioWorklet, and the button label changes to "Stop Recording".
3. **Given** microphone permission is denied, **When** the user presses "Start Recording", **Then** "Microphone access required" is shown and no crash or silent failure occurs.
4. **Given** recording is active, **When** the user navigates away, **Then** the microphone is released and the AudioWorklet is torn down within 1 second.
5. **Given** the device has no microphone, **When** recording is attempted, **Then** "No microphone detected" is shown.

---

### User Story 3 — Real-Time Oscilloscope Visualization (Priority: P3)

While recording is active, the user sees a live waveform drawn on screen, reflecting the current microphone input frame by frame, at 30+ fps without stuttering the rest of the UI.

**Why this priority**: Gives immediate visual confirmation that audio is being captured correctly.

**Independent Test**: Speak into the microphone → waveform reacts visibly. Silence → flat line. Loud sound → tall waveform. Pitch detection not required.

**Acceptance Scenarios**:

1. **Given** recording is active and the environment is silent, **When** the oscilloscope renders, **Then** a flat near-zero waveform is displayed.
2. **Given** recording is active and the user produces a sound, **When** the oscilloscope renders, **Then** clearly visible amplitude variation is shown.
3. **Given** recording is active, **When** the oscilloscope runs, **Then** it refreshes at least 30 times per second without the rest of the page becoming unresponsive.
4. **Given** recording is stopped, **When** the oscilloscope renders, **Then** it displays a static flat line.

---

### User Story 4 — Pitch Detection and Current Note Display (Priority: P4)

While recording is active, a continuous pitch detection algorithm runs on the captured audio. When a stable musical pitch is detected above a confidence threshold, the corresponding note name (e.g., "A4", "C#5") appears in the UI within 200 ms of onset.

**Why this priority**: Pitch detection is the primary analytical capability of the view.

**Independent Test**: Sustain a single clearly pitched note → the correct note name appears. Silence or noise → "—" or "No pitch detected".

**Acceptance Scenarios**:

1. **Given** recording is active and no pitch is detectable, **When** the pitch display renders, **Then** it shows "—" or "No pitch detected".
2. **Given** recording is active and the user sustains A4 (440 Hz), **When** pitch detection runs, **Then** "A4" is shown within 200 ms of onset.
3. **Given** a pitch is detected, **When** the pitch changes to a different note, **Then** the display updates to the new note.
4. **Given** a quiet or unpitched sound, **When** pitch detection runs, **Then** no spurious note is displayed (confidence threshold filters low-confidence detections).

---

### User Story 5 — Growing Note History List (Priority: P5)

Every time a new distinct note onset is detected, it is appended to a scrollable list. Each entry shows the note name, octave, and elapsed time since recording started. The list auto-scrolls to the newest entry and can be cleared.

**Why this priority**: The list enables the developer to review what was captured over a session.

**Independent Test**: Play three different notes in sequence → list shows three entries in order. List scrolls when it overflows. "Clear" empties it.

**Acceptance Scenarios**:

1. **Given** a note onset is detected, **When** it is appended, **Then** a new entry appears at the bottom of the list showing note name and timestamp.
2. **Given** the same pitch is sustained continuously, **When** 5 seconds pass, **Then** no duplicate entries are added for that single sustained tone.
3. **Given** the list grows beyond the visible area, **When** a new entry is added, **Then** the list auto-scrolls to the newest entry.
4. **Given** a "Clear" button is tapped, **When** the action completes, **Then** the list is emptied.
5. **Given** the list reaches 200 entries, **When** a new entry is added, **Then** the oldest entry is removed to keep the list bounded.

---

### Edge Cases

- What happens when the browser does not support AudioWorklet? → Show "AudioWorklet not supported in this browser"; do not silently fall back to ScriptProcessor.
- What happens if microphone permission is revoked mid-session? → Audio capture stops, error message displayed, UI remains stable.
- What happens in a very noisy environment? → Confidence threshold prevents spurious detections; oscilloscope still shows waveform correctly.
- What happens when multiple pitches are present simultaneously? → Only the single dominant pitch is detected (monophonic). Polyphonic (chord) detection is explicitly out of scope for this feature but identified as a future extension.
- What happens if the audio input device changes mid-session (e.g., headset unplugged)? → Capture stops, error displayed.
- What happens on iOS Safari (restricted AudioWorklet)? → Browser compatibility warning shown.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A "Record View" button MUST appear in the Instruments View only when `?debug=true` is present in the URL. In production mode the button MUST be completely absent from the DOM. The Recording View itself MUST only be rendered when navigated to via this button; it MUST NOT be reachable without `?debug=true`.
- **FR-002**: The Recording View MUST expose a single Start/Stop Recording toggle button. Pressing it when idle starts recording (triggering the browser permission prompt if needed); pressing it when recording stops capture and releases all audio resources. The mic MUST NOT open without an explicit user gesture on this button.
- **FR-003**: Audio capture MUST use AudioWorklet to run the audio processing pipeline on a dedicated thread separate from the UI thread.
- **FR-004**: The Recording View MUST display a real-time oscilloscope showing the raw microphone waveform at a minimum of 30 frames per second while recording.
- **FR-005**: The Recording View MUST run a monophonic pitch detection algorithm on the captured audio stream.
- **FR-006**: When a pitch is detected with sufficient confidence, the detected musical note (letter + accidental + octave, e.g. "C#4") MUST appear in the current-note display within 200 ms of onset.
- **FR-007**: Each new note onset MUST be appended to a scrollable history list showing: note name, octave, and elapsed time since recording started.
- **FR-008**: The note history list MUST auto-scroll to the newest entry when a new note is appended.
- **FR-009**: The note history list MUST be capped at 200 entries; oldest entries are removed when the cap is reached.
- **FR-010**: A "Clear" button MUST allow emptying the note history list at any time without stopping recording.
- **FR-011**: The Recording View MUST display a clear, human-readable error when: microphone permission is denied, no microphone is available, or AudioWorklet is not supported.
- **FR-012**: All audio resources (AudioWorklet node, MediaStream tracks) MUST be fully released when the user leaves the Recording View.
- **FR-013**: Pitch detection MUST apply a confidence threshold so that unpitched sounds do not produce note entries.

### Key Entities

- **RecordingSession**: Active mic capture session — state (idle / requesting / recording / error), start timestamp, error message.
- **AudioFrame**: PCM sample buffer delivered from the AudioWorklet to the main thread for oscilloscope rendering.
- **PitchSample**: Output of one detection cycle — frequency (Hz), confidence (0–1), note name, octave.
- **NoteOnset**: History list entry — note name, octave, confidence, timestamp relative to session start.
- **OscilloscopeState**: Current waveform amplitude buffer used to render the oscilloscope.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Recording View becomes visible within 500 ms of loading with `?debug=true` and is completely absent without it.
- **SC-002**: The oscilloscope sustains 30+ frames per second during recording with no perceptible freezing of the rest of the UI.
- **SC-003**: Pitch detection correctly identifies equal-tempered notes (A4 = 440 Hz ± 20 cents) with at least 90% accuracy on single sustained tones in a quiet environment.
- **SC-004**: A detected note appears in both the current-note display and the history list within 200 ms of pitch onset.
- **SC-005**: The microphone and AudioWorklet are fully released within 1 second of leaving the Recording View.
- **SC-006**: Memory usage remains stable (no continuous growth) after 10 minutes of continuous recording.
- **SC-007**: Microphone permission denial is handled gracefully — no crash, intelligible developer-facing error message shown.

---

## Assumptions

- **Monophonic detection**: Pitch detection targets a single dominant pitch per audio frame. Polyphonic detection is out of scope.
- **Detection threshold**: A confidence score of 0.9 (YIN clarity metric or equivalent) is used as the default; adjustable in implementation.
- **Pitch range**: C2–C7 (approximately 65 Hz – 2093 Hz), sufficient for voice and most instruments.
- **Note onset deduplication**: A new onset is only recorded when the detected pitch changes from the previous one, or when there is a silence gap of at least **300 ms** between two identical pitches.
- **Browser target**: Chromium-based browsers and Firefox on desktop/tablet. iOS Safari expected to show a compatibility warning.
- **No persistence**: The note history list is in-memory only; it is not saved across page loads.

---

## Clarifications

### Session 2026-02-22

- Q: Should recording start automatically when the Recording View mounts, or require an explicit user action? → A: Explicit start/stop toggle button — same button starts and stops recording; mic never opens without a user gesture.
- Q: How is the Recording View presented within the app (full-page, tab, overlay)? → A: A "Record View" button appears in the Instruments View only when `?debug=true`; pressing it navigates to the Recording View as a separate page.
- Q: What silence gap duration triggers a duplicate-note onset in the history list? → A: 300 ms — natural brief interruptions are ignored, deliberate re-attacks captured.
