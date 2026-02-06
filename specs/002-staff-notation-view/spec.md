# Feature Specification: Staff Notation Visualization

**Feature Branch**: `002-staff-notation-view`  
**Created**: 2026-02-06  
**Status**: Draft  
**Input**: User description: "Create a visualization of a single voice in the web interface using a pentagram in which the notes are displayed"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Single Voice Notes on Staff (Priority: P1)

As a musician, I want to see my voice's notes rendered on a traditional five-line staff so that I can visualize the music in standard notation instead of just a list of MIDI numbers.

**Why this priority**: This is the MVP - without staff visualization, users cannot read music in standard notation, which is the primary goal of this feature. All other functionality depends on this foundation.

**Independent Test**: Create a score with one instrument/voice containing notes at various pitches (C4, E4, G4). Navigate to that voice in the UI. The system should render a five-line staff with properly positioned note heads using SMuFL glyphs.

**Acceptance Scenarios**:

1. **Given** a voice with notes at MIDI pitches 60 (C4), 64 (E4), 67 (G4), **When** user views the voice, **Then** system displays a five-line staff with treble clef and three note heads positioned correctly on lines/spaces
2. **Given** a voice with no notes, **When** user views the voice, **Then** system displays an empty five-line staff with the current clef symbol at the beginning
3. **Given** notes spanning more than one octave, **When** user views the voice, **Then** system automatically adds ledger lines above/below the staff for notes outside the standard range
4. **Given** notes at the same tick position (chord), **When** user views the voice, **Then** system stacks note heads vertically at the same horizontal position

---

### User Story 2 - Proper Spacing and Layout (Priority: P2)

As a musician, I want notes to be spaced proportionally according to their timing (tick positions) so that I can understand the temporal relationships between notes at a glance.

**Why this priority**: Correct spacing is essential for readability. Without proper layout, users cannot understand note timing and rhythm from the visualization.

**Independent Test**: Create a voice with notes at ticks 0, 960, 1920, 3840 (quarter, quarter, half note spacing). The visual spacing should reflect these durations - the gap before tick 3840 should be roughly twice as wide as the gap to 960.

**Acceptance Scenarios**:

1. **Given** notes at regular intervals (960 ticks apart), **When** user views the staff, **Then** notes are spaced evenly across the timeline
2. **Given** notes with large gaps (e.g., tick 0 and tick 3840), **When** user views the staff, **Then** system displays proportionally wider spacing
3. **Given** a long piece with many measures, **When** user views the staff, **Then** system displays measure boundaries with vertical barlines every 3840 ticks (for 4/4 time)
4. **Given** structural events (clef/key changes), **When** user views the staff, **Then** system inserts the appropriate symbols at their tick positions

---

### User Story 3 - Interactive Note Selection (Priority: P3)

As a user, I want to click on individual notes to select them so that I can prepare for future editing operations (move, delete, change pitch).

**Why this priority**: Interaction is required for eventual editing functionality. This establishes the foundation for user input without implementing full editing yet.

**Independent Test**: Render a staff with multiple notes. Click on a note head. The note should visually indicate selection (e.g., highlight or color change). Clicking another note should deselect the first and select the new one.

**Acceptance Scenarios**:

1. **Given** a staff with rendered notes, **When** user clicks on a note head, **Then** the note is highlighted and displays its details (pitch, tick, duration)
2. **Given** a selected note, **When** user clicks on a different note, **Then** the previous note is deselected and the new note is selected
3. **Given** a selected note, **When** user clicks on empty staff space, **Then** the note is deselected
4. **Given** multiple notes in a chord, **When** user clicks on the stack, **Then** system selects the topmost note and provides UI to cycle through the stack

---

### User Story 4 - Scroll and Navigate Long Scores (Priority: P4)

As a user, I want to scroll horizontally through long pieces so that I can view and work with scores that extend beyond a single screen width.

**Why this priority**: Essential for practical use with real musical pieces, but not needed for initial testing with short examples.

**Independent Test**: Create a score with notes spanning 10 measures (38,400 ticks). The staff view should provide horizontal scrolling to navigate through all measures.

**Acceptance Scenarios**:

1. **Given** a score longer than viewport width, **When** user views the staff, **Then** a horizontal scrollbar appears
2. **Given** a scrollable staff, **When** user scrolls horizontally, **Then** the staff content scrolls smoothly while the clef and staff lines remain consistent
3. **Given** a long score, **When** user selects a note outside the current viewport, **Then** system automatically scrolls to bring that note into view

---

### User Story 5 - Responsive Staff Dimensions (Priority: P5)

As a user, I want the staff to adapt to different screen sizes so that I can use the application on various devices (desktop, tablet).

**Why this priority**: Nice-to-have for improved UX, but not critical for MVP functionality.

**Independent Test**: Render the same voice on different viewport widths (1920px, 1024px, 768px). The staff should scale appropriately while maintaining readable note sizes.

**Acceptance Scenarios**:

1. **Given** a viewport resize, **When** user changes window width, **Then** the staff recalculates layout to fit the available width
2. **Given** zoom level changes, **When** user zooms in/out, **Then** note glyphs scale proportionally while maintaining correct positioning

---

### Edge Cases

- What happens when a note has a pitch outside the standard range (MIDI 0-20 or 100-127)? System should add multiple ledger lines and may need to clip or warn if rendering becomes impractical.
- How does the system handle extremely dense note clusters (e.g., 50 notes at the same tick)? Layout engine should detect collisions and offset note heads horizontally or warn the user.
- What if the voice has thousands of notes? System should implement virtual scrolling/rendering to only draw notes in the visible viewport.
- How are structural events (clef changes, key signature changes) at the same tick handled? System should render them in a defined order (clef → key signature → time signature → notes).
- What if the score uses a time signature other than 4/4? System should use the active time signature from the TimeSignatureEvent to calculate measure boundaries.

## Requirements *(mandatory)*

### Functional Requirements

**Architecture & Components**:

- **FR-001**: System MUST implement a three-layer architecture: MusicTimeline (data source) → NotationLayoutEngine (geometry calculation) → NotationRenderer (SVG rendering)
- **FR-002**: MusicTimeline component MUST be the single source of truth, reading from the Score domain model (instruments, staves, voices, notes, structural events)
- **FR-003**: NotationLayoutEngine MUST calculate geometric positions (x, y coordinates, staff line positions) without performing any rendering
- **FR-004**: NotationRenderer MUST accept layout geometry and render SVG elements using SMuFL Bravura font for musical symbols

**Staff Rendering**:

- **FR-005**: System MUST render a five-line staff with correct spacing (staff space = 10px default, configurable)
- **FR-006**: System MUST render the clef symbol at the beginning of the staff based on the active ClefEvent at tick 0
- **FR-007**: System MUST use SMuFL (Standard Music Font Layout) glyphs from the Bravura font for all musical symbols (clefs, note heads, accidentals, barlines)
- **FR-008**: System MUST support rendering Treble (G) clef and Bass (F) clef as minimum requirement

**Note Positioning**:

- **FR-009**: System MUST position note heads vertically based on pitch, with middle C (MIDI 60) on the first ledger line below the treble clef staff
- **FR-010**: System MUST automatically add ledger lines for notes above or below the five-line staff range
- **FR-011**: System MUST position note heads horizontally based on their start_tick value, with spacing proportional to time (1 pixel per 10 ticks as default scale)
- **FR-012**: System MUST render notes at the same tick position (chords) as vertically stacked note heads at the same horizontal position

**Layout and Spacing**:

- **FR-013**: System MUST insert vertical barlines at measure boundaries, calculated from time signature events (default 4/4 = 3840 ticks per measure with 960 PPQ)
- **FR-014**: System MUST allocate minimum width for structural event symbols (clef: 40px, key signature: 15px per accidental, time signature: 30px)
- **FR-015**: System MUST render the key signature after the clef and before the first note, displaying the correct number of sharps or flats based on the KeySignatureEvent

**Interaction**:

- **FR-016**: System MUST support click events on note head SVG elements to select individual notes
- **FR-017**: System MUST visually indicate selected notes with a highlight effect (change fill color or add stroke)
- **FR-018**: System MUST emit events when notes are selected, providing the note's ID, pitch, start_tick, and duration for UI integration
- **FR-019**: System MUST handle click events on empty staff space without triggering note selection

**Scrolling and Viewport**:

- **FR-020**: System MUST provide horizontal scrolling when the rendered staff width exceeds the viewport width
- **FR-021**: System MUST implement efficient rendering by only drawing notes within the visible viewport (virtual scrolling)
- **FR-022**: System MUST maintain the clef symbol and initial structural events visible in a fixed left margin when scrolling horizontally, providing continuous pitch reference for users

**Multi-Voice Preparation**:

- **FR-023**: Architecture MUST support rendering multiple voices on the same staff in future iterations (no implementation required for MVP)
- **FR-024**: NotationLayoutEngine MUST accept a voice ID parameter to support filtering which voice to render
- **FR-025**: Component interfaces MUST be designed to accept an array of voices in future versions without breaking changes

### Key Entities *(include if feature involves data)*

- **MusicTimeline**: React component that fetches Score data from the API and passes it to the NotationLayoutEngine. Maintains the connection between domain model (Score/Voice/Note) and visualization.

- **NotationLayoutEngine**: Pure TypeScript service that calculates geometric layout from musical data. Takes as input: voice notes, structural events, viewport dimensions, staff configuration (staff space, scaling). Outputs: array of positioned elements (note heads, staff lines, clefs, barlines) with x/y coordinates, widths, heights.

- **NotationRenderer**: React component that receives layout geometry and renders SVG. Responsible for: creating SVG elements, loading and applying SMuFL Bravura font, handling zoom/scaling, managing click event handlers, providing visual feedback for selected notes.

- **PositionedElement**: TypeScript interface representing a renderable element with properties: type (note, clef, staffLine, barline), x, y, width, height, symbol (SMuFL code point or line coordinates), metadata (note ID, pitch for interactive elements).

- **StaffConfig**: Configuration object with properties: staffSpace (distance between staff lines), horizontalScale (pixels per tick), viewportWidth, viewportHeight, clefType, keySignature, timeSignature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can visually identify pitches on the staff within 5 seconds of viewing (measured by correctly identifying 3 random notes in usability testing)

- **SC-002**: System renders a 100-note score (single voice) in under 500ms including layout calculation and SVG generation

- **SC-003**: Note positioning accuracy: vertical position error < 1px from theoretically correct staff line/space for all pitches in MIDI range 48-84

- **SC-004**: Interactive selection has <50ms response time from click to visual feedback (measured from mousedown to DOM update)

- **SC-005**: System handles scores up to 1000 measures (384,000 ticks) without freezing the UI, using virtual scrolling to maintain smooth 60fps scrolling performance

## Assumptions

- Users are viewing scores created by the existing Musicore backend (001-score-model feature) with 960 PPQ resolution
- Initial implementation focuses on single-voice visualization; multi-voice is a future iteration
- Treble clef is the primary use case; bass clef support is included but other clefs (alto, tenor) can be added later
- Browser supports modern SVG features (SVG 2.0) and CSS Grid/Flexbox for layout
- SMuFL Bravura font can be loaded via web font (WOFF2 format) or CDN
- Time signature defaults to 4/4 unless otherwise specified by TimeSignatureEvent
- Tempo (BPM) does not affect visual layout, only horizontal spacing based on tick positions
- Users will primarily interact via mouse/trackpad; touch support is not required for MVP

## Dependencies

- Existing Score domain model from 001-score-model (Score, Instrument, Staff, Voice, Note, StructuralEvents)
- Backend REST API endpoints: GET /scores/{id} to fetch complete score hierarchy
- SMuFL Bravura font files (available from https://github.com/steinbergmedia/bravura or Google Fonts)
- React 18+ for component architecture
- TypeScript 5.0+ for type safety
- SVG rendering capability in target browsers (Chrome 90+, Firefox 88+, Safari 14+)

## Out of Scope

- Note editing (adding, moving, deleting notes) - future feature after visualization is stable
- Playback or audio rendering - separate feature
- Multi-staff rendering (e.g., piano grand staff with both treble and bass) - future iteration
- Printing or PDF export - separate feature
- Rhythmic notation (stems, beams, flags, rests) - future enhancement, notes are currently rendered as whole notes
- Dynamic markings (forte, piano, crescendo) - future enhancement
- Articulations (staccato, accent, slurs) - future enhancement
- Chord symbols or lyrics - future enhancement
- Custom color themes or dark mode for staff - future enhancement

## Technical Constraints

- Must integrate with existing React frontend codebase in frontend/src/
- Must not modify the backend or domain model (visualization only)
- SVG rendering must support up to 10,000 elements without performance degradation
- Layout calculations must be synchronous (no async operations) to ensure immediate rendering
- Must maintain 60fps during scrolling and zoom operations
- Total bundle size increase for this feature must be <200KB (including Bravura font subset)
