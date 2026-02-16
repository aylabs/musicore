# Feature Specification: Display Improvements

**Feature Branch**: `022-display-improvements`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "Display improvements: Add a timer to show timings during music playback, add the title of the score (collected if possible from MusicXML and if not, from the file imported), add the tempo control also to the Layout view to the right of the zoom"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Playback Timer Display (Priority: P1)

As a musician practising with the application, I want to see how much time has elapsed and the total duration of the piece during playback so that I can track my position in the score and know how long the piece lasts.

When playback starts, a timer appears in the playback controls area showing elapsed time and total duration in `MM:SS` format (e.g., "1:23 / 4:05"). The timer updates in real time as the music plays. When playback is paused, the timer freezes at the current position. When playback is stopped, the timer resets to "0:00 / 4:05" (showing total duration but zero elapsed). The timer is visible in all views that show playback controls (Instruments View, Play View, and Layout View).

**Why this priority**: A playback timer is the most universally useful improvement — it provides essential orientation during playback that every user benefits from regardless of which view they use.

**Independent Test**: Can be fully tested by starting playback on any score and verifying the timer counts up correctly, pauses when expected, and resets on stop.

**Acceptance Scenarios**:

1. **Given** a score is loaded and playback is stopped, **When** the user presses Play, **Then** a timer appears showing "0:00 / T:TT" (where T:TT is total duration) and begins counting up in real time.
2. **Given** playback is active and the timer shows "1:15 / 3:30", **When** the user presses Pause, **Then** the timer freezes at "1:15 / 3:30".
3. **Given** playback is paused at "1:15 / 3:30", **When** the user presses Play again, **Then** the timer resumes counting from "1:15".
4. **Given** playback is active or paused, **When** the user presses Stop, **Then** the timer resets to "0:00 / 3:30".
5. **Given** a score is loaded but playback has not started, **When** the user views the playback controls, **Then** the timer shows "0:00 / T:TT" with the pre-calculated total duration.

---

### User Story 2 - Score Title Display (Priority: P2)

As a user working with multiple scores, I want to see the title of the currently loaded score prominently displayed so that I can quickly identify which piece I am viewing or practising.

When a MusicXML file is imported, the system extracts the title from the MusicXML metadata (work-title or movement-title elements). If no title is found in the MusicXML data, the filename (without extension) is used as the title. The title is displayed in the score header area, replacing the current generic "Score" heading.

**Why this priority**: Showing the score title is a high-value, low-complexity improvement that significantly enhances the user experience when working with imported scores. It provides identity and context to the loaded piece.

**Independent Test**: Can be tested by importing a MusicXML file with a title and verifying it appears, then importing one without a title and verifying the filename is shown instead.

**Acceptance Scenarios**:

1. **Given** a MusicXML file containing a `<work-title>` element with value "Canon in D", **When** the user imports the file, **Then** the score header displays "Canon in D" as the title.
2. **Given** a MusicXML file containing a `<movement-title>` element but no `<work-title>`, **When** the user imports the file, **Then** the score header displays the movement title.
3. **Given** a MusicXML file with neither `<work-title>` nor `<movement-title>`, **When** the user imports the file named "bach_prelude.musicxml", **Then** the score header displays "bach_prelude" as the title.
4. **Given** a score created from scratch (not imported from MusicXML), **When** the user views the score, **Then** the score header displays a default title derived from the score's creation context.
5. **Given** a score with a title is displayed, **When** the user switches between views (Instruments, Play, Layout), **Then** the title remains visible and consistent across all views.

---

### User Story 3 - Tempo Control in Layout View (Priority: P3)

As a user practising music in the Layout View, I want to adjust the playback tempo without switching to the Instruments View so that I can slow down or speed up the music while viewing the engraved score.

Currently, the tempo control (showing BPM and percentage, with −/Reset/+ buttons) is only visible in the Instruments View. This story adds the same tempo control to the Layout View, positioned to the right of the existing zoom controls, providing a consistent experience across views.

**Why this priority**: This is a convenience improvement for Layout View users. The feature already exists in another view, so this is about making it accessible where it is also needed.

**Independent Test**: Can be tested by switching to Layout View, verifying tempo controls appear next to zoom controls, and adjusting tempo to confirm playback speed changes.

**Acceptance Scenarios**:

1. **Given** a score is loaded and the user is in Layout View, **When** the user looks at the control bar, **Then** tempo controls (showing BPM and percentage with −/Reset/+ buttons) are visible to the right of the zoom controls.
2. **Given** the user is in Layout View and playback is stopped, **When** the user clicks the "+" tempo button, **Then** the tempo increases by 1% and the display updates accordingly.
3. **Given** the user is in Layout View and playback is stopped, **When** the user long-presses the "−" tempo button, **Then** the tempo decreases by 10%.
4. **Given** the user adjusts tempo in Layout View, **When** the user switches to Instruments View, **Then** the tempo setting is preserved and reflected in the Instruments View tempo control.
5. **Given** playback is active in Layout View, **When** the user views the tempo control, **Then** the tempo control is disabled (greyed out) to prevent changes during playback.

---

### Edge Cases

- What happens when a score has zero duration (no notes)? The timer should display "0:00 / 0:00".
- What happens when playback reaches the end of the piece? The timer should show the total duration (e.g., "3:30 / 3:30") and playback should stop, resetting to "0:00 / 3:30".
- What happens when the tempo is changed between playback sessions? The total duration in the timer should update to reflect the new effective duration at the adjusted tempo.
- What happens when the MusicXML title contains very long text or special characters? The title should be displayed as-is, with truncation and a tooltip if it exceeds the available display space.
- What happens when a MusicXML file has both `<work-title>` and `<movement-title>`? The `<work-title>` takes precedence.
- What happens when the browser window is narrow? The tempo control and timer should remain usable, potentially wrapping or adapting to the available space.

## Requirements *(mandatory)*

### Functional Requirements

**Playback Timer**

- **FR-001**: System MUST display a playback timer showing elapsed time and total duration in `MM:SS` format during playback.
- **FR-002**: The timer MUST update in real time (at least once per second visually) during active playback.
- **FR-003**: The timer MUST freeze at the current elapsed time when playback is paused.
- **FR-004**: The timer MUST reset elapsed time to "0:00" when playback is stopped, while continuing to show total duration.
- **FR-005**: The timer MUST be visible in all views that display playback controls (Instruments View, Play View, and Layout View).
- **FR-006**: The total duration MUST be calculated based on the score content and current tempo multiplier.
- **FR-007**: For pieces longer than 59 minutes and 59 seconds, the timer MUST display in `H:MM:SS` format.

**Score Title**

- **FR-008**: System MUST display the score title in the score header area.
- **FR-009**: When importing a MusicXML file, the system MUST extract the title from the `<work-title>` element if present.
- **FR-010**: If `<work-title>` is not present, the system MUST fall back to the `<movement-title>` element.
- **FR-011**: If neither MusicXML title element is present, the system MUST use the imported filename (without extension) as the title.
- **FR-012**: The title MUST be visible across all views (Instruments, Play, Layout).
- **FR-013**: If the title exceeds the available display space, it MUST be truncated with an ellipsis and the full title MUST be accessible via a tooltip.

**Tempo Control in Layout View**

- **FR-014**: The Layout View MUST display the tempo control to the right of the existing zoom controls.
- **FR-015**: The Layout View tempo control MUST provide the same functionality as the existing Instruments View tempo control (display BPM and percentage, −/Reset/+ buttons, single-click ±1%, long-press ±10%).
- **FR-016**: The tempo state MUST be shared across all views — changes in one view MUST be reflected in all others.
- **FR-017**: The tempo control in Layout View MUST be disabled during active playback, consistent with the existing behaviour.

### Key Entities

- **Score Title**: A text string representing the name of the score. Sourced from MusicXML metadata (`work-title` or `movement-title`) or derived from the imported filename. Stored as part of the score's import metadata.
- **Playback Timer State**: Tracks elapsed time (in seconds), total duration (in seconds), and playback status (playing, paused, stopped). Derived from the existing playback tick system and tempo settings.
- **Import Metadata**: Extended to include the extracted title alongside existing format and filename fields.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see elapsed time and total duration during playback, with the timer updating at least once per second and accurate to within 1 second of actual playback position.
- **SC-002**: 100% of imported MusicXML files with `<work-title>` or `<movement-title>` elements display the correct title in the score header.
- **SC-003**: 100% of imported MusicXML files without title metadata display the filename as the score title.
- **SC-004**: Users can adjust tempo in Layout View without switching views, using the same controls available in Instruments View.
- **SC-005**: Tempo changes made in any view are reflected in all other views within 1 second.
- **SC-006**: All three improvements (timer, title, tempo control) are accessible without any additional user configuration or setup.

## Assumptions

- The existing `currentTick` broadcast at 60 Hz provides sufficient timing information to derive an accurate elapsed-time display.
- The total duration can be calculated from the score's note events and current tempo settings without requiring new computation from the backend.
- The `<work-title>` and `<movement-title>` elements in MusicXML are plain text strings (no embedded markup that requires special handling).
- The existing `TempoStateContext` can be consumed by the Layout View's `ScoreViewer` (page-level component) without architectural changes.
- The score title will be stored as part of the frontend's import metadata and does not require changes to the backend `Score` data model at this time.

