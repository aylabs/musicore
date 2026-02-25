# Feature Specification: MIDI Input for Recording View

**Feature Branch**: `029-midi-input`
**Created**: 2026-02-25
**Status**: Draft
**Input**: "Add Midi support. In the Recording view, if a MIDI connection is detected, use it to capture the notes instead of the microphone. The view must show clearly if it is using the microphone or the MIDI connection. If the MIDI connection is detected when working in microphone mode, a dialog must be show to the user to inform about it and to offer to change to the MIDI connection."

---

## Clarifications

### Session 2026-02-25

- Q: Should MIDI velocity be shown in the note history list display? → A: No — omit velocity; show note name and timestamp only (same format as microphone mode).
- Q: When MIDI is active, should the oscilloscope area be hidden or show a placeholder? → A: Show a static placeholder ("Waveform not available in MIDI mode") — layout space is preserved as an extension point for future MIDI-specific visualizations such as velocity.
- Q: Should note-on events be captured from all MIDI channels or only channel 1? → A: All channels (1–16) — no channel filtering applied.
- Q: Should the MIDI hot-connect dialog auto-dismiss if the user does not respond? → A: Yes — auto-dismiss after 30 seconds with "Keep Microphone" as the default outcome; the mic session continues uninterrupted.
- Q: How long should Recording View wait for MIDI device enumeration before falling back to Microphone? → A: 3 seconds — if enumeration does not complete within 3 seconds, fall back to Microphone automatically.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — MIDI Device Detected at Session Start (Priority: P1)

A developer opens the Recording View with a MIDI keyboard already connected to the device. The view automatically selects MIDI as the input source — no microphone is opened. The active input source label clearly reads "MIDI" with the device name. The Start/Stop Recording button works with MIDI instead of the microphone.

**Why this priority**: Correctly initialising the input source before any capture begins is the foundation of the whole feature. If detection at startup is wrong, all downstream user stories are unreliable.

**Independent Test**: Connect a MIDI keyboard, open Recording View → "MIDI" indicator visible, mic permission never requested → press Start Recording → play a note → note appears in history list. No microphone audio pipeline is opened.

**Acceptance Scenarios**:

1. **Given** a MIDI device is connected before the Recording View loads, **When** the view renders, **Then** the active input source indicator shows "MIDI" and the device name.
2. **Given** MIDI is the active source, **When** the user presses "Start Recording", **Then** the browser MIDI permission prompt appears (if not previously granted) and no microphone permission is requested.
3. **Given** MIDI is active and recording starts, **When** the user plays a note on the MIDI keyboard, **Then** the note name appears in the current-note display and is appended to the history list.
4. **Given** no MIDI device is connected, **When** the Recording View loads, **Then** the active input source indicator shows "Microphone" and MIDI is not referenced.
5. **Given** the browser does not support Web MIDI, **When** the Recording View loads, **Then** the Microphone source is used automatically and a non-blocking informational message "MIDI not supported in this browser" is shown.

---

### User Story 2 — Clear Input Source Indicator (Priority: P2)

At all times while the Recording View is open, a prominent label or badge shows which input source is active: either "Microphone" or "MIDI — [Device Name]". The indicator is visible whether recording is idle, active, or in an error state.

**Why this priority**: The specification explicitly requires the view to show clearly which source is in use. This is a safety/trust requirement — a developer relying on the view must never be uncertain which input is capturing.

**Independent Test**: Open the Recording View with no MIDI connected → indicator reads "Microphone". Connect a MIDI device and accept the switch → indicator updates to "MIDI — [device name]". Disconnect the MIDI device → indicator reverts to "Microphone" (or shows an error).

**Acceptance Scenarios**:

1. **Given** the Recording View is open with Microphone as the active source, **When** the view renders in any state (idle, recording, error), **Then** a visible "Microphone" label is present in the UI.
2. **Given** the Recording View is open with MIDI as the active source, **When** the view renders, **Then** a visible "MIDI — [device name]" label is present in the UI.
3. **Given** the active source changes (e.g., user switches from mic to MIDI), **When** the change completes, **Then** the indicator updates within 500 ms without requiring a page reload.
4. **Given** recording is active with MIDI, **When** the oscilloscope area is visible, **Then** it is either hidden or shows a static placeholder (no live waveform, since MIDI has no audio stream).

---

### User Story 3 — MIDI Hot-Connect Dialog During Microphone Session (Priority: P3)

The developer has started recording in Microphone mode. They then connect a MIDI keyboard. A dialog immediately appears telling them a MIDI device was detected and offering two choices: switch to MIDI or continue with microphone. The choice is explicit — the system never switches inputs automatically without consent.

**Why this priority**: This is the primary UX safety mechanism. Silent automatic input switching would break active recordings; the dialog gives the user control.

**Independent Test**: Start recording with mic active → connect MIDI keyboard → dialog appears within 2 seconds showing device name, "Switch to MIDI" and "Keep Microphone" buttons → tapping "Keep Microphone" dismisses dialog and mic recording continues uninterrupted → tap "Switch to MIDI" → mic is released, MIDI is activated, indicator updates, recording continues.

**Acceptance Scenarios**:

1. **Given** the Recording View is open with Microphone as the active source (recording or idle), **When** a MIDI device is connected, **Then** a modal dialog appears within 2 seconds informing the user of the new MIDI device.
2. **Given** the MIDI detection dialog is shown, **When** the user selects "Switch to MIDI", **Then** the microphone is released, MIDI becomes the active source, the dialog closes, and the input indicator updates.
3. **Given** the MIDI detection dialog is shown, **When** the user selects "Keep Microphone", **Then** the dialog closes, microphone remains the active source, and no change is made to the recording session.
4. **Given** the dialog is shown and recording was active, **When** the user selects "Switch to MIDI", **Then** recording continues without stopping — the note history list is preserved, only the capture source changes.
5. **Given** the dialog is shown and recording was active, **When** the user selects "Keep Microphone", **Then** recording is uninterrupted and no audio frames are lost.
6. **Given** multiple MIDI devices are connected simultaneously, **When** the dialog appears, **Then** it lists all detected devices and the first available device is pre-selected.
7. **Given** the MIDI detection dialog is shown, **When** 30 seconds elapse without a user choice, **Then** the dialog auto-dismisses and "Keep Microphone" is applied — the mic session continues without interruption.

---

### User Story 4 — MIDI Note Capture and History (Priority: P4)

When MIDI is the active input source and recording is started, every note-on event from the MIDI device is captured and appended to the note history list. The current-note display shows the most recently pressed key. The oscilloscope area is not shown (MIDI produces no audio waveform).

**Why this priority**: This is the core value delivery — MIDI notes flowing into the history list just as microphone-detected pitches do.

**Independent Test**: MIDI active, Start Recording → play C4 → "C4" appears in current-note display and history list → play E4 → "E4" appears → sustain E4 → no duplicate entries → release all keys → "—" in current-note display.

**Acceptance Scenarios**:

1. **Given** MIDI is active and recording is started, **When** the user presses a key on the MIDI keyboard, **Then** the corresponding note name (e.g., "C4") appears in the current-note display within 100 ms.
2. **Given** MIDI is active and recording is started, **When** a note-on event is received, **Then** a new entry is appended to the note history list with note name and elapsed time.
3. **Given** the same MIDI key is held continuously, **When** no other keys are pressed, **Then** no duplicate entries are added (one entry per note-on event).
4. **Given** MIDI is active and recording is started, **When** all keys are released, **Then** the current-note display shows "—" or "No note".
5. **Given** MIDI is the active source, **When** the Recording View is rendered, **Then** the oscilloscope waveform display is replaced by a static placeholder reading "Waveform not available in MIDI mode", occupying the same layout area (reserved for future MIDI-specific visualizations).
6. **Given** MIDI is active and the note history reaches 200 entries, **When** a new note-on event arrives, **Then** the oldest entry is removed to stay within the 200-entry cap.

---

### User Story 5 — MIDI Device Disconnection Handling (Priority: P5)

While using MIDI mode, the MIDI keyboard is unplugged. The system detects the disconnection, stops MIDI capture, shows a clear message, and leaves the UI stable. The user can manually switch to microphone or stop recording cleanly.

**Why this priority**: Graceful degradation prevents crashes and data loss. It mirrors the existing microphone disconnection handling in the Recording View.

**Independent Test**: Start recording in MIDI mode → unplug the MIDI keyboard → "MIDI device disconnected" message appears, MIDI capture stops, recording shows as stopped or errored, UI remains stable, user can press Stop or switch to Microphone.

**Acceptance Scenarios**:

1. **Given** MIDI is the active source and recording is active, **When** the MIDI device is disconnected, **Then** a "MIDI device disconnected" error message is shown within 1 second.
2. **Given** the MIDI disconnection message is shown, **When** the user views the Recording View, **Then** recording stops (or is paused) and the note history list is preserved.
3. **Given** the MIDI device is reconnected after a disconnection, **When** the user acknowledges the disconnection message, **Then** the device can be re-selected as the input source.
4. **Given** MIDI disconnects and the user has not manually stopped recording, **When** the error is shown, **Then** a "Switch to Microphone" button is available as a recovery option.

---

### Edge Cases

- What happens when the browser does not support Web MIDI API? → Show a non-blocking "MIDI not supported in this browser" message; silently default to microphone without impacting the existing mic flow.
- What happens when the user denies MIDI access permission? → Show "MIDI access denied" message; fall back to microphone automatically.
- What happens when multiple MIDI devices are connected at once? → Show all available devices in the detection dialog; allow the user to select one; default to the first available.
- What happens if a MIDI controller sends note-on events on multiple channels simultaneously? → All channels (1–16) are captured with no filtering; every note-on event is treated equally regardless of channel.
- What happens if MIDI device enumeration on load takes longer than expected? → Time-boxed to 3 seconds; if enumeration does not resolve within that window, the system falls back to Microphone automatically and the view becomes interactive.
- What happens if MIDI device enumeration on load takes longer than expected? → Time-boxed to 3 seconds; if enumeration does not resolve within that window, the system falls back to Microphone automatically and the view becomes interactive.
- What happens when both mic and MIDI are unavailable? → Show "No input source available" and disable the Start Recording button.
- What happens when MIDI is selected but the device sends unexpected MIDI messages (e.g., control change, pitch bend)? → Only note-on and note-off events are processed; other messages are silently ignored.
- What happens if the MIDI hot-connect dialog is dismissed without a choice (e.g., pressing Escape or 30-second timeout)? → Both are treated as "Keep Microphone" — no source change, mic session continues uninterrupted.
- What happens when a MIDI device connects and disconnects very rapidly? → Debounce the detection event by at least 500 ms to avoid dialog flickering.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On Recording View initialisation, the system MUST query for connected MIDI devices using the device's MIDI access capability. This query MUST complete within 3 seconds; if it does not, the system MUST fall back to Microphone as the input source and proceed without blocking the view.
- **FR-002**: If one or more MIDI devices are detected at initialisation time, MIDI MUST be selected as the default input source and the microphone MUST NOT be opened.
- **FR-003**: If no MIDI devices are detected at initialisation time, Microphone MUST be selected as the default input source (preserving existing behaviour).
- **FR-004**: The Recording View MUST display a persistent input source indicator showing either "Microphone" or "MIDI — [device name]" at all times while the view is open.
- **FR-005**: The input source indicator MUST update within 500 ms of any source change.
- **FR-006**: When MIDI is the active input source and recording is active, every MIDI note-on event from any channel (1–16) MUST be captured and appended to the note history list with note name and elapsed time. Velocity MUST NOT be shown in the list (same display format as microphone mode).
- **FR-007**: When MIDI is the active source, the current-note display MUST show the most recently pressed key within 100 ms of the note-on event.
- **FR-008**: When MIDI is the active source, the current-note display MUST show "—" or "No note" when no keys are pressed.
- **FR-009**: When MIDI is the active source, the oscilloscope waveform display MUST be replaced by a static placeholder reading "Waveform not available in MIDI mode". The placeholder MUST occupy the same layout area as the oscilloscope, keeping the visual structure stable and reserving the space as an extension point for future MIDI-specific visualizations (e.g., velocity display).
- **FR-010**: If a MIDI device is connected while Microphone is the active source, the system MUST display a modal dialog within 2 seconds of detection, informing the user of the new MIDI device.
- **FR-011**: The MIDI detection dialog MUST offer two explicit actions: "Switch to MIDI" and "Keep Microphone". The dialog MUST display a visible countdown showing the remaining auto-dismiss time.
- **FR-021**: The MIDI detection dialog MUST auto-dismiss after 30 seconds of inactivity. Auto-dismissal MUST be treated identically to the user selecting "Keep Microphone" — the microphone session continues uninterrupted and no source change occurs.
- **FR-012**: If the user selects "Switch to MIDI" in the dialog, the microphone MUST be released, MIDI MUST become the active source, and any in-progress recording session MUST continue without interruption.
- **FR-013**: If the user selects "Keep Microphone" in the dialog (or dismisses it), the microphone MUST remain active and no source change MUST occur.
- **FR-014**: If a MIDI device disconnects while MIDI is the active source, the system MUST show a "MIDI device disconnected" error message within 1 second and stop MIDI capture gracefully.
- **FR-015**: On MIDI disconnection, the system MUST present a "Switch to Microphone" recovery option.
- **FR-016**: If the device does not support MIDI input access, the system MUST fall back to Microphone as the input source and display a non-blocking informational message "MIDI not supported in this browser".
- **FR-017**: If MIDI access permission is denied, the system MUST fall back to Microphone and display "MIDI access denied".
- **FR-018**: MIDI note-on events MUST be translated to note names (letter + accidental + octave, e.g., "C#4") using the standard MIDI note number to pitch name mapping.
- **FR-019**: The note history list MUST remain capped at 200 entries when MIDI is the input source, with the same oldest-entry removal behaviour as microphone mode.
- **FR-020**: The MIDI hot-connect detection event MUST be debounced by at least 500 ms to avoid dialog flickering on rapid connect/disconnect cycles.

### Key Entities

- **MidiDevice**: A connected MIDI input device — name, manufacturer, id, connection state (connected / disconnected).
- **InputSource**: Active capture source — enumeration of `microphone` or `midi`, with optional reference to the active `MidiDevice`.
- **MidiNoteEvent**: A single note-on event from the MIDI device — MIDI note number (0–127), velocity (0–127, captured internally but not displayed), channel (1–16, all channels captured with no filtering), timestamp relative to session start.
- **MidiConnectionEvent**: A device-level event signalling that a MIDI device was connected or disconnected during an active session.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a MIDI keyboard is connected before the Recording View loads, MIDI is automatically selected as the input source with no microphone prompt shown.
- **SC-002**: The active input source label (Microphone or MIDI) is visible and accurate within 500 ms of any source change.
- **SC-003**: The MIDI device detection dialog appears within 2 seconds of a MIDI device being connected during microphone mode.
- **SC-004**: Notes played on a connected MIDI keyboard appear in the note history list within 100 ms of the note-on event.
- **SC-005**: Selecting "Keep Microphone" in the MIDI detection dialog causes zero interruption to an active microphone recording session — no audio frames dropped, history list unaffected.
- **SC-006**: Selecting "Switch to MIDI" in the dialog causes zero loss of the existing note history — all previously recorded entries are preserved.
- **SC-007**: A MIDI device disconnection during MIDI recording is handled gracefully — no crash, "MIDI device disconnected" message shown within 1 second, UI remains fully interactive.
- **SC-008**: In browsers without Web MIDI support, the Recording View loads and microphone capture works identically to before this feature — zero regression.- **SC-009**: If MIDI device enumeration does not complete within 3 seconds on Recording View load, the view becomes interactive with Microphone as the active source — no blocking or indefinite loading state.