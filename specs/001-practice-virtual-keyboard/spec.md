# Feature Specification: Virtual Keyboard in Practice View

**Feature Branch**: `001-practice-virtual-keyboard`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "Add virtual keyboard to Practice View. In order to practice when you don't have a real keyboard let's add a virtual keyboard to the Practice View. Close to the Mic/Midi button, add an icon with a keyboard. If the user press it, open the virtual keyboard at the bottom of the view. If the keyboard is open, micro and midi are not used, and the source of the notes is the virtual keyboard. If the user clicks on the keyboard icon, the keyboard is hidden and mic/midi are the source of notes another time. There is already a plugin implementing a virtual keyboard. The implementation should be aligned with it."

## Assumptions

- **Input source toggle**: Only one input source can be active at a time — either mic/MIDI or the virtual keyboard. When the virtual keyboard is shown, mic/MIDI capture is fully suspended (not just silenced). When the virtual keyboard is hidden, mic/MIDI resumes its previous state.
- **Virtual keyboard layout**: The keyboard opens at the same fixed default range as the existing built-in Virtual Keyboard plugin. Octave Up/Down shift controls (also from the existing plugin) are included in the panel so users can reach notes outside the default visible range.
- **Keyboard toggle placement**: The virtual keyboard toggle icon appears in the same toolbar area as the existing Mic/MIDI toggle button, allowing users to compare and switch input source in a single gesture.
- **No persistent preference**: The virtual keyboard toggle state resets to hidden each time the Practice plugin is opened, consistent with other Practice plugin UI defaults.
- **Note delivery boundary**: Virtual keyboard notes cross the plugin/host boundary using the same `PluginPitchEvent` structure as mic-detected pitches, so exercise scoring logic requires no change.
- **Keyboard appearance**: The visual component is reused (or closely mirrors) the existing Virtual Keyboard plugin display — same key colours, pressed-key highlight behaviour, and proportions.
- **MIDI and mic are treated as one group**: When the virtual keyboard is active, both microphone capture and MIDI input are suspended simultaneously. When returning to mic/MIDI mode, the user's previously active source (mic or MIDI, whichever was last used) is restored.

---

## Clarifications

### Session 2026-03-01

- Q: When the user toggles input source mid-exercise (virtual keyboard ↔ mic/MIDI), does the exercise continue seamlessly, pause for confirmation, or restart? → A: Continues seamlessly — the newly active source is accepted immediately and notes already captured are preserved.
- Q: During an active exercise, does tapping a virtual keyboard key produce audible sound, or is only the pitch event sent to the scorer? → A: Always audible — every key tap produces sound regardless of whether an exercise is in progress, consistent with the standalone Virtual Keyboard plugin behaviour.
- Q: Does the virtual keyboard auto-align its octave range to the exercise configuration, or open at a fixed default with manual shift controls? → A: Fixed default — the keyboard always opens at the same range (matching the existing Virtual Keyboard plugin default); Up/Down octave-shift controls from the existing plugin are included so the user can reach any required range.
- Q: When the virtual keyboard is active, does the exercise start trigger change (e.g. tap-to-start) or remain identical to mic/MIDI behaviour? → A: Identical to current behaviour — the exercise starts exactly the same way regardless of whether the active input source is virtual keyboard, mic, or MIDI.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle Virtual Keyboard in Practice View (Priority: P1)

A user who does not have a physical keyboard or microphone opens the Practice plugin. Near the Mic/MIDI button in the toolbar, they see a keyboard icon. They tap it and a piano keyboard appears at the bottom of the view. The Mic/MIDI indicators dim, showing those sources are inactive. The user is now ready to practice by tapping keys on screen.

**Why this priority**: This is the core deliverable. Simply showing the virtual keyboard and suspending mic/MIDI in response to the toggle is the MVP that unblocks users without physical instruments. Everything else builds on top of this.

**Independent Test**: Open the Practice plugin → tap the keyboard icon → the virtual keyboard panel appears at the bottom → the Mic/MIDI section visually shows as inactive → tap the keyboard icon again → the keyboard panel disappears and Mic/MIDI becomes active again.

**Acceptance Scenarios**:

1. **Given** the Practice plugin is open, **When** the user looks at the toolbar, **Then** a keyboard toggle icon is displayed close to the Mic/MIDI button.
2. **Given** the virtual keyboard is hidden, **When** the user taps the keyboard icon, **Then** the virtual keyboard panel appears at the bottom of the Practice view and the keyboard icon shows an active/selected state.
3. **Given** the virtual keyboard is visible and active, **When** the user looks at the Mic/MIDI section, **Then** both microphone capture and MIDI input are shown as suspended (visually dimmed or with a clear inactive indicator).
4. **Given** the virtual keyboard is visible and active, **When** the user taps the keyboard icon again, **Then** the virtual keyboard panel disappears, the keyboard icon returns to its inactive state, and mic/MIDI capture resumes.
5. **Given** the Practice plugin is opened for the first time in a session, **When** the view loads, **Then** the virtual keyboard is hidden and mic/MIDI is active (default state).
6. **Given** the Practice plugin is closed and reopened, **When** the new session loads, **Then** the virtual keyboard state resets to hidden regardless of the previous session's state.

---

### User Story 2 - Play Practice Notes via Virtual Keyboard (Priority: P2)

A user who has opened the virtual keyboard in the Practice view sees the exercise notes on the staff and taps the corresponding keys on the on-screen keyboard. Each tap sends a note event that is scored by the practice engine exactly as though it came from a microphone or MIDI device. After all notes are played, the result screen is shown as normal.

**Why this priority**: The virtual keyboard must feed notes into the practice scoring pipeline. Without this, the keyboard is cosmetic. This story proves end-to-end viability for users without physical instruments.

**Independent Test**: Open Practice plugin → toggle virtual keyboard → start exercise → tap keys corresponding to displayed notes → result screen appears with scores reflecting accuracy of tapped keys.

**Acceptance Scenarios**:

1. **Given** the virtual keyboard is active and an exercise is on the staff, **When** the user taps a key that matches the expected note, **Then** the practice engine records it as a correct note and the exercise advances.
2. **Given** the virtual keyboard is active and an exercise is on the staff, **When** the user taps a key that does not match the expected note, **Then** the practice engine records it as an incorrect note.
3. **Given** the virtual keyboard is active, **When** the user taps any key, **Then** the tapped key displays a visual pressed highlight, consistent with the behaviour of the existing Virtual Keyboard plugin.
4. **Given** the virtual keyboard is active and an exercise is in progress, **When** the user completes all notes, **Then** the result screen is displayed with the same information and format as when mic/MIDI is used.
5. **Given** the virtual keyboard is active, **When** the user taps any key at any point (before, during, or after an exercise), **Then** the note is always played audibly — consistent with the standalone Virtual Keyboard plugin. During an exercise the note is also scored; outside an exercise it is a preview only and does not count.
6. **Given** the virtual keyboard is open and the exercise requires notes outside the currently visible range, **When** the user taps the octave-shift Up or Down control, **Then** the displayed keyboard range shifts by one octave and the shift controls update to reflect the new position.

---

### User Story 3 - Switch Input Source Mid-Session (Priority: P3)

A user who started a session with the virtual keyboard decides to switch to their MIDI keyboard. They tap the keyboard icon to dismiss the virtual keyboard; the MIDI source resumes and they continue practising in the same session, without losing exercise configuration or loaded score settings.

**Why this priority**: Toggling input source is a routine action for users who switch between on-screen and physical instruments. The state of the exercise (preset, loaded score, note count) must survive the toggle.

**Independent Test**: Open Practice plugin → toggle virtual keyboard → configure an exercise → toggle back to Mic/MIDI → verify the exercise configuration remains unchanged and Mic/MIDI is active.

**Acceptance Scenarios**:

1. **Given** the virtual keyboard is active and an exercise configuration is set (e.g. Score preset with a loaded score), **When** the user hides the virtual keyboard, **Then** the exercise configuration (preset, notes, loaded score) is fully preserved.
2. **Given** mic/MIDI is active and an exercise configuration is set, **When** the user shows the virtual keyboard, **Then** the exercise configuration is fully preserved.
3. **Given** the virtual keyboard is visible, **When** the user connects a physical MIDI device and then hides the virtual keyboard, **Then** MIDI input is captured correctly from that device.
4. **Given** an exercise is in progress with the virtual keyboard active, **When** the user toggles to Mic/MIDI mid-exercise, **Then** the exercise continues seamlessly — the newly active source (mic/MIDI) is accepted immediately and all notes captured so far are preserved.

---

### Edge Cases

- What happens if the user toggles the virtual keyboard while an exercise countdown ("3…2…1…Go!") is playing? The toggle is accepted; the newly active source is used when Go is reached.
- What happens if the screen is too narrow to display both the exercise staff and the virtual keyboard? The virtual keyboard is displayed in a scrollable or resizable panel at the bottom; the staff remains visible above it and neither component collapses to an unusable state.
- What happens when the user taps keys rapidly in the virtual keyboard, faster than the exercise expects? Extra notes beyond the exercise's expected count are ignored — the same behaviour as mic/MIDI receiving extra pitches.
- What happens when the virtual keyboard is open and the device loses audio context (e.g. the tab is backgrounded)? The virtual keyboard remains visible but note events are suppressed until the audio context resumes, consistent with how the host handles mic/MIDI events when backgrounded.
- What happens if neither mic/MIDI was active before showing the virtual keyboard (e.g. permission denied)? The virtual keyboard toggle still works normally; hiding the keyboard restores the Mic/MIDI section to the same unavailable-but-visible state it was in before.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Practice View MUST display a keyboard toggle icon in the input-source toolbar area, adjacent to the Mic/MIDI button.
- **FR-002**: When the keyboard toggle is activated, a virtual keyboard panel MUST appear at the bottom of the Practice View.
- **FR-003**: When the virtual keyboard panel is visible, microphone capture and MIDI input MUST both be suspended.
- **FR-004**: When the virtual keyboard panel is visible, the Mic/MIDI section MUST display a clear visual indicator that those sources are inactive.
- **FR-005**: When the keyboard toggle is deactivated, the virtual keyboard panel MUST disappear and mic/MIDI capture MUST resume.
- **FR-006**: Key presses on the virtual keyboard MUST produce audible sound on every tap, regardless of whether an exercise is active (always-audible, consistent with the standalone Virtual Keyboard plugin). The tap MUST also produce a note event delivered to the practice scoring engine using the same pathway as mic and MIDI note events.
- **FR-007**: The visual behaviour of virtual keyboard keys (highlight on press, return to normal on release) MUST match the existing Virtual Keyboard plugin behaviour.
- **FR-008**: The virtual keyboard panel MUST open at the same fixed default octave range as the existing Virtual Keyboard plugin (same key proportions and visual design). The panel MUST include octave Up/Down shift controls — matching the behaviour of the existing plugin — so users can reach notes outside the default visible range.
- **FR-009**: The virtual keyboard toggle state MUST reset to hidden each time the Practice plugin is loaded or the page is refreshed.
- **FR-010**: Toggling the virtual keyboard MUST NOT alter the exercise configuration (preset, note count, loaded score, BPM, clef).
- **FR-011**: The keyboard toggle icon MUST show a visible active/inactive state so users can see at a glance which input source is in use.
- **FR-012**: The exercise start trigger (Play button, countdown, and any mode-specific auto-start behaviour) MUST be identical regardless of whether the active input source is virtual keyboard, mic, or MIDI — switching input source MUST NOT alter how the exercise is initiated.

### Key Entities

- **Input Source**: An enumerated state within the Practice plugin indicating the active note input channel — one of `mic`, `midi`, or `virtual-keyboard`. Only one is active at a time.
- **Virtual Keyboard Panel**: A collapsible UI region rendered at the bottom of the Practice View containing the on-screen piano keyboard. Visible only when Input Source is `virtual-keyboard`.
- **Keyboard Toggle Button**: An icon button in the Practice View toolbar that switches Input Source between `virtual-keyboard` (panel shown) and the previously active physical source (panel hidden).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user without a microphone or MIDI device can complete a full practice exercise — from opening the Practice plugin through to the result screen — using only the on-screen virtual keyboard, within the same number of steps as a mic/MIDI user.
- **SC-002**: Toggling the virtual keyboard on or off takes a single tap and the UI updates (panel appears or disappears) within 300 milliseconds.
- **SC-003**: 100% of tapped virtual keyboard notes are delivered to the practice scoring engine with the same correctness as mic-detected or MIDI notes (no silent or dropped taps under normal conditions).
- **SC-004**: Switching input source (virtual keyboard ↔ mic/MIDI) preserves all exercise configuration settings — users never need to reconfigure the exercise after toggling.
- **SC-005**: The active input source is unambiguous at all times — users can determine which source is in use (virtual keyboard or mic/MIDI) without interacting with any additional controls.

