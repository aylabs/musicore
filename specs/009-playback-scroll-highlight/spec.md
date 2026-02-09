# Feature Specification: Playback Scroll and Highlight

**Feature Branch**: `009-playback-scroll-highlight`  
**Created**: 2026-02-09  
**Status**: Draft  
**Input**: User description: "Scroll horizontally the voices notes display in sync with the playback of the music and highlight the notes being played"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-Scroll During Playback (Priority: P1)

As a musician practicing with MusiCore, I want the notation display to automatically scroll horizontally as the music plays, so that I can follow along without manually scrolling and can focus on playing my instrument.

**Why this priority**: This is the foundational feature that enables hands-free music following. Without auto-scroll, users must choose between watching the notation or playing their instrument, which defeats the purpose of a practice tool. This is the minimum viable product that delivers immediate value.

**Independent Test**: Can be fully tested by loading any musical score, starting playback, and verifying that the notation viewport automatically scrolls to keep the current playback position visible within the display area.

**Acceptance Scenarios**:

1. **Given** a score is loaded and displayed, **When** the user presses Play, **Then** the notation display automatically scrolls horizontally to follow the playback position
2. **Given** playback is active and scrolling, **When** the current measure reaches the right edge of the viewport, **Then** the display smoothly scrolls to reveal the next measures
3. **Given** playback is paused mid-score, **When** the user resumes playback, **Then** scrolling continues from the current position
4. **Given** a score with tempo changes (Feature 008), **When** tempo is adjusted during playback, **Then** the scroll speed adjusts accordingly to match the new tempo
5. **Given** the user stops playback and starts again, **When** playback begins from the start, **Then** the viewport scrolls back to the beginning and follows from there

---

### User Story 2 - Highlight Currently Playing Notes (Priority: P2)

As a musician following along with playback, I want to see visual highlighting of the notes currently being played, so that I can precisely track which note is sounding at any moment and follow complex passages more easily.

**Why this priority**: While auto-scroll shows the general area of playback, highlighting provides precise note-level feedback. This is especially valuable for complex scores with multiple voices, chords, or rapid passages. It enhances the P1 feature but isn't strictly required for basic following.

**Independent Test**: Can be fully tested by playing any score and verifying that individual notes or chords change visual appearance (color, brightness, etc.) exactly when they sound, and return to normal appearance when they finish.

**Acceptance Scenarios**:

1. **Given** playback is active, **When** a note starts playing, **Then** that note is visually highlighted in the notation display
2. **Given** a note is highlighted, **When** the note finishes playing, **Then** the highlight is removed after the note's duration ends
3. **Given** multiple notes play simultaneously (chord), **When** the chord sounds, **Then** all notes in the chord are highlighted together
4. **Given** multiple staves with simultaneous notes, **When** notes play across different staves, **Then** all currently sounding notes are highlighted regardless of staff
5. **Given** rapid note sequences, **When** notes play in quick succession, **Then** highlights update precisely without lag or visual artifacts

---

### User Story 3 - Maintain Context During Scroll (Priority: P3)

As a musician reading ahead while the music plays, I want the scrolling to maintain comfortable reading context (showing upcoming measures), so that I can prepare for what's coming and don't feel rushed by the display.

**Why this priority**: This improves the usability of auto-scroll by providing better reading context. Musicians typically read ahead while playing, so showing only the current measure would be inadequate. This is polish that makes P1 more practical but isn't essential for the feature to function.

**Independent Test**: Can be fully tested by measuring the visible notation range during playback and verifying that the current playback position stays within a comfortable zone (not at the extreme right edge) while showing adequate upcoming measures.

**Acceptance Scenarios**:

1. **Given** playback is active, **When** scrolling occurs, **Then** the current playback position stays approximately 30% from the left edge of the viewport, allowing 70% of the view for upcoming measures
2. **Given** the playback position is near the end of the score, **When** there are fewer measures remaining than would fill the viewport, **Then** scrolling stops to avoid showing blank space beyond the score end
3. **Given** playback just started, **When** the score beginning is visible, **Then** scrolling only begins when the playback position would move beyond the comfortable reading zone
4. **Given** the viewport is wider than the entire score length, **When** playback occurs, **Then** the display remains centered without scrolling

---

### User Story 4 - Manual Scroll Override (Priority: P4)

As a musician reviewing a specific section, I want to be able to manually scroll away from the auto-scroll position during playback without disrupting the audio, and have a quick way to return to auto-scroll mode, so that I can examine other parts of the score while listening.

**Why this priority**: This is a convenience feature for advanced usage. While valuable, most users will primarily rely on the automatic behavior from P1. This addresses edge cases where users want to examine the score while audio continues.

**Independent Test**: Can be fully tested by starting playback with auto-scroll active, manually scrolling to a different position, verifying that auto-scroll pauses, then activating a control to re-enable auto-scroll and verifying that the viewport jumps back to following the playback position.

**Acceptance Scenarios**:

1. **Given** auto-scroll is active during playback, **When** the user manually scrolls the notation (via mouse wheel, touch, or scroll bar), **Then** auto-scroll temporarily disables and the viewport stays at the user's chosen position
2. **Given** auto-scroll is disabled due to manual scrolling, **When** the user clicks a "Resume Auto-Scroll" control, **Then** the viewport immediately scrolls to show the current playback position and resumes auto-scrolling
3. **Given** auto-scroll is disabled during playback, **When** the user stops and restarts playback, **Then** auto-scroll automatically re-enables
4. **Given** the user has manually scrolled away, **When** playback ends naturally, **Then** auto-scroll re-enables automatically for the next playback session

---

### Edge Cases

- **What happens when the user manually scrolls during playback?** Auto-scroll temporarily disables (see US4), allowing the user to examine other parts of the score while audio continues. A visual indicator or button will allow re-enabling auto-scroll.

- **How does the system handle very short scores?** If the entire score fits within the viewport width, no scrolling occurs and the display remains stationary. Highlighting still works normally to show playback position.

- **What if tempo changes during playback (Feature 008)?** The scroll speed dynamically adjusts to match the effective tempo, maintaining synchronization between notes and their visual positions.

- **How are repeat signs and jumps (D.C., D.S.) handled?** The scroll position follows the actual performance order. When playback jumps due to repeat signs or navigation marks, the viewport jumps immediately to show the appropriate section.

- **What happens at the very end of a score?** Scrolling stops naturally when the playback position approaches the end, preventing the display from scrolling beyond the last measure or showing blank space.

- **How does the system handle different screen sizes and zoom levels?** The scrolling logic adapts to the current viewport dimensions and zoom level, maintaining the same proportional reading context (30% position) regardless of display size.

- **What if notes have zero or very short durations?** Highlighting appears for a minimum perceivable duration (e.g., 100ms) even if the note's actual duration is shorter, ensuring visual feedback is always visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate the horizontal pixel position of each note based on its temporal position in the score
- **FR-002**: System MUST synchronize viewport scroll position with current playback time, updating at minimum 30 times per second for smooth animation
- **FR-003**: System MUST identify all notes that are currently sounding at any given playback time, including overlapping notes and chords
- **FR-004**: System MUST apply visual highlighting to notes that are currently playing, making them clearly distinguishable from non-playing notes
- **FR-005**: System MUST remove highlighting from notes when their duration ends, returning them to normal appearance
- **FR-006**: System MUST adjust scroll speed dynamically when tempo changes are applied (Feature 008 integration)
- **FR-007**: System MUST maintain a comfortable reading position where the current playback location is approximately 30% from the left edge of the viewport
- **FR-008**: System MUST detect when the user manually scrolls and temporarily disable auto-scroll without stopping playback
- **FR-009**: System MUST provide a mechanism for users to re-enable auto-scroll after manual scrolling, jumping to the current playback position
- **FR-010**: System MUST handle scores of any length, from shorter than the viewport to many times wider than the viewport
- **FR-011**: System MUST maintain scroll synchronization accuracy within 50 milliseconds of actual audio playback position
- **FR-012**: System MUST automatically re-enable auto-scroll when playback stops and restarts
- **FR-013**: System MUST prevent scrolling beyond the boundaries of the score (no overscroll into blank space)
- **FR-014**: Highlighting MUST work independently of scrolling, supporting cases where the score fits entirely within the viewport

### Key Entities

- **Viewport**: The visible rectangular area displaying the musical notation. Has dimensions (width, height), current scroll position (x-offset), and zoom level.

- **Playback Position**: The current temporal position in the score being played, measured in ticks or seconds. Maps to a horizontal pixel coordinate in the notation display.

- **Note Visual Element**: The rendered graphical representation of a musical note. Has a horizontal position, vertical position (staff), and current state (highlighted or normal).

- **Scroll State**: Tracks whether auto-scroll is currently active or disabled by user interaction. Includes the target scroll position and animation state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can follow music playback for scores of any length without manual scrolling, verified by user observation that the current playback position remains visible throughout playback of test scores ranging from 30 seconds to 10 minutes

- **SC-002**: Visual feedback of playback position is accurate within 50 milliseconds of audio output, measured by comparing the timestamp of highlighted notes to actual audio playback time

- **SC-003**: Scrolling animation maintains smooth 60 FPS performance for scores up to 1000 measures, verified by frame rate monitoring during continuous playback

- **SC-004**: Users can identify the currently playing note(s) within 0.5 seconds of viewing the display, measured through user testing with scores containing multiple simultaneous voices

- **SC-005**: The system handles tempo changes from 50% to 200% (Feature 008 range) without losing synchronization, verified by maintaining <50ms accuracy across the full tempo range

- **SC-006**: After manual scrolling, users can return to auto-scroll mode within 1 second using the provided control mechanism

- **SC-007**: Auto-scroll provides comfortable reading context by keeping 3-5 upcoming measures visible at standard zoom levels, measured by calculating the visible time range ahead of the current playback position
