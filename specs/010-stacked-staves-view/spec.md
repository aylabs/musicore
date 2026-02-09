# Feature Specification: Stacked Staves View

**Feature Branch**: `010-stacked-staves-view`  
**Created**: 2026-02-09  
**Status**: Draft  
**Input**: User description: "Create a new view that can be selected from the UI (as a panel) with all the staves vertically stacked. If a staff has several voices, they must be rendered together in the same staff. At the left of each staff, the name must be shown. The music playback must have the same features than the current panel, and the playback controls are the same for this new panel. The playback GUI must be the same than the current view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Selection and Stacked Display (Priority: P1)

A music teacher wants to see the full orchestral score with all instruments simultaneously to understand the overall arrangement and prepare for rehearsal. They need to quickly switch between the current individual instrument view and a full score view.

**Why this priority**: Core functionality that enables the primary use case. Without view switching and stacked display, the feature has no value.

**Independent Test**: Can be fully tested by loading a multi-instrument score, clicking the view selector, and verifying all staves appear vertically stacked. Delivers immediate value by showing the complete score layout.

**Acceptance Scenarios**:

1. **Given** a score with multiple instruments is loaded, **When** user clicks the "Stacked View" selector in the UI, **Then** all staves from all instruments are displayed vertically stacked on the screen
2. **Given** user is in stacked view, **When** user clicks the "Individual View" selector, **Then** the display returns to the current single-instrument focused view
3. **Given** a score with 5 instruments (10 staves total), **When** stacked view is selected, **Then** all 10 staves are visible with vertical scroll if needed

---

### User Story 2 - Multi-Voice Staff Rendering (Priority: P2)

A pianist reviewing a piano score needs to see both hands (treble and bass clef staves) where the right hand part has two independent melodic lines (voices). The system must render both voices clearly within the same staff without visual confusion.

**Why this priority**: Essential for accurate representation of polyphonic music. Piano music and choral arrangements require this, but the view is still usable without it for simpler scores.

**Independent Test**: Load a score with a staff containing 2 voices, switch to stacked view, and verify both voices render distinctly within the same staff. Tests both the stacking mechanism and voice composition.

**Acceptance Scenarios**:

1. **Given** a staff contains 2 or more voices, **When** stacked view is displayed, **Then** all voices within that staff are rendered together on the same staff with distinct visual separation (stem direction, note positioning)
2. **Given** one instrument has 2 staves (piano: treble/bass) where treble staff has 3 voices, **When** stacked view is displayed, **Then** the treble staff shows all 3 voices combined and bass staff shows its voices combined

---

### User Story 3 - Staff Labels (Priority: P3)

A conductor studying the score wants to quickly identify which instrument each staff represents without having to memorize staff positions or clef types.

**Why this priority**: Improves usability and reduces cognitive load, but the stacked view is functional without labels if users can infer from other visual cues.

**Independent Test**: Load a named score with instruments, switch to stacked view, and verify instrument names appear at the left edge of each staff. Enhances the existing stacked display without requiring it.

**Acceptance Scenarios**:

1. **Given** each instrument has a name (e.g., "Violin I", "Cello", "Piano"), **When** stacked view is displayed, **Then** the instrument name appears at the left margin of each staff group
2. **Given** an instrument has multiple staves (e.g., Piano with treble and bass), **When** stacked view is displayed, **Then** the instrument name appears once at the left, spanning both staves vertically with a bracket
3. **Given** an instrument name is very long (>20 characters), **When** displayed in stacked view, **Then** the name is truncated with ellipsis or wrapped to fit the label area without overlapping the staff

---

### User Story 4 - Unified Playback in Stacked View (Priority: P1)

A music student wants to practice along with the full score playback, seeing all parts simultaneously while the system highlights the current playback position across all staves, just like it does in the individual view.

**Why this priority**: Playback integration is core to the feature's value proposition. Without it, the stacked view is a static display with limited utility.

**Independent Test**: Load a score, switch to stacked view, press play, and verify synchronized playback with note highlighting across all visible staves. Delivers the complete feature experience.

**Acceptance Scenarios**:

1. **Given** user is in stacked view, **When** playback starts, **Then** the currently playing notes are highlighted in green across all staves simultaneously
2. **Given** playback is active in stacked view, **When** user clicks a note on any staff, **Then** playback seeks to that note's position and highlights it (click-to-seek works identically to individual view)
3. **Given** playback is running in individual view, **When** user switches to stacked view, **Then** playback continues without interruption and highlighting updates to show active notes in the stacked layout
4. **Given** playback position moves beyond visible area, **When** playback continues in stacked view, **Then** the view auto-scrolls to keep the current playback position visible (same behavior as individual view)
5. **Given** user is in stacked view, **When** user selects a note by clicking it, **Then** that note becomes the persistent playback start point until deselected (persistent start pin works identically)

---

### Edge Cases

- What happens when there are more than 20 staves (vertical scrolling with current position indicator)?
- How does the system handle empty staves (staves with no notes) - are they displayed or hidden?
- What happens when switching views during active playback - does the playback state (play/pause/position) persist seamlessly?
- How are very long staff/instrument names displayed without overlapping musical notation?
- What happens when the viewport is too narrow to display staff names and notation side by side?
- How does the system handle rapid view switching (debouncing needed)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a UI control (button, tab, or dropdown) to switch between "Individual View" and "Stacked View" modes
- **FR-002**: System MUST display all staves from all instruments vertically stacked when in Stacked View mode, ordered by instrument hierarchy (as defined in the score model)
- **FR-003**: When a staff contains multiple voices, system MUST render all voices together within that single staff using standard music notation conventions (opposing stem directions, voice-specific note positioning)
- **FR-004**: System MUST display the instrument name at the left margin of each staff or staff group in Stacked View mode
- **FR-005**: System MUST maintain identical playback functionality in Stacked View as in Individual View (play, pause, stop, seek, tempo control, tempo multiplier)
- **FR-006**: System MUST synchronize note highlighting during playback across all staves in Stacked View, highlighting active notes in green
- **FR-007**: System MUST auto-scroll the Stacked View to keep the current playback position visible within the viewport
- **FR-008**: System MUST support click-to-seek functionality on any note in any staff within Stacked View, with the same persistent start pin behavior
- **FR-009**: System MUST preserve playback state (playing/paused/stopped, current tick position, pinned start tick) when switching between view modes
- **FR-010**: System MUST use the same playback control UI (play/pause/stop buttons, tempo slider) for both Individual and Stacked views
- **FR-011**: System MUST handle vertical overflow in Stacked View with scrolling when total stack height exceeds viewport height
- **FR-012**: System MUST render staff names with appropriate truncation or wrapping when names exceed available label width

### Key Entities

- **ViewMode**: Represents the currently selected display mode (Individual or Stacked). Controls which rendering strategy is active.
- **StackedStaffLayout**: Represents the visual arrangement of all staves in vertical stack order, including positioning, spacing, and label areas. Contains references to all staff displays from all instruments.
- **StaffGroup**: Logical grouping of staves belonging to the same instrument (e.g., piano's two staves), used for label positioning and bracket rendering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between Individual and Stacked views with a single click or tap
- **SC-002**: All staves from a loaded score (up to 50 staves) are visible in Stacked View with vertical scrolling support
- **SC-003**: Multi-voice staves (up to 4 voices per staff) render without visual overlap or ambiguity, with voices distinguishable by stem direction
- **SC-004**: Playback operates identically in both views with note highlighting synchronized within 16ms (60 Hz update rate)
- **SC-005**: View switching during active playback completes without audio glitches or playback position loss (transition time under 500ms)
- **SC-006**: Staff labels are readable for instrument names up to 30 characters with truncation applied consistently
- **SC-007**: Users can click any note in any staff to seek playback, with the same success rate as Individual View
