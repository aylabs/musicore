# Feature Specification: Measure Numbering

**Feature Branch**: `020-measure-numbering`  
**Created**: 2025-02-15  
**Status**: Draft  
**Input**: User description: "Add numbering for measures. At the start of a system add the numbering for the first measure of it. The number must be over the lines, aligned vertically with the clef"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Display Measure Number at Start of Each System (Priority: P1)

A musician viewing a rendered score sees a measure number displayed at the beginning of every system. The number corresponds to the first measure contained in that system. This allows the musician to quickly identify which measure they are looking at, which is essential for rehearsals, instruction, and navigation within a piece.

The measure number is positioned above the staff lines and horizontally aligned with the clef glyph, following standard music engraving conventions.

**Why this priority**: Measure numbering is a fundamental music notation convention present in virtually all published sheet music. Without it, musicians cannot efficiently reference specific locations in a score during rehearsal or discussion. This is the core and only required capability of this feature.

**Independent Test**: Can be fully tested by rendering any score with multiple systems and verifying that each system displays the correct measure number in the correct position.

**Acceptance Scenarios**:

1. **Given** a score with enough measures to span multiple systems, **When** the score is rendered, **Then** each system displays a number above the staff lines indicating the first measure in that system.
2. **Given** a score rendered across systems, **When** the user looks at the measure number on any system, **Then** the number is horizontally aligned with the clef glyph on that system.
3. **Given** a score rendered across systems, **When** the user looks at the measure number on any system, **Then** the number is positioned above the topmost staff line (not overlapping with any staff lines or notes).
4. **Given** a score starting from measure 1, **When** the first system is rendered, **Then** the measure number displayed is "1".
5. **Given** a system whose first measure is measure N, **When** that system is rendered, **Then** the measure number displayed is "N" (1-based numbering).

---

### User Story 2 - Measure Numbering with Multi-Instrument Scores (Priority: P2)

A musician viewing a score with multiple instruments (e.g., piano with two hands, or an ensemble) sees a single measure number per system, positioned above the topmost staff of the topmost instrument. The number is not repeated for every staff or every instrument within the same system.

**Why this priority**: Multi-instrument scores are common in real-world usage. Ensuring measure numbers appear once per system (not once per staff) avoids visual clutter and follows standard engraving practice.

**Independent Test**: Can be tested by rendering a multi-instrument score and verifying only one measure number appears per system, above the first staff.

**Acceptance Scenarios**:

1. **Given** a score with two or more instruments (multiple staves per system), **When** the score is rendered, **Then** exactly one measure number appears per system.
2. **Given** a multi-instrument score, **When** a system is rendered, **Then** the measure number is positioned above the topmost staff of the first instrument group, not above each individual staff.

---

### Edge Cases

- What happens when a score has only one system (all measures fit on one line)? The single system still displays measure number "1".
- What happens when a time signature change occurs mid-score, altering measure lengths? Measure numbering continues sequentially regardless of time signature changes — the measure count is determined by measure boundaries, not by fixed tick durations.
- What happens when the score is empty (no notes)? No measure numbers are displayed if there are no measures to number.
- What happens when the measure number is a large number (e.g., measure 999)? The number must still render without overlapping the clef or other structural glyphs. The number is displayed as plain text and may extend beyond the clef width if necessary.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The layout engine MUST compute a 1-based measure number for the first measure of each system.
- **FR-002**: The layout engine MUST produce a positioned text element for each system's measure number, with coordinates ready for rendering.
- **FR-003**: The measure number MUST be positioned above the topmost staff line of the first staff in the system.
- **FR-004**: The measure number MUST be horizontally aligned with the clef glyph (same x-coordinate as the clef).
- **FR-005**: Exactly one measure number MUST be displayed per system, regardless of how many instruments or staves the system contains.
- **FR-006**: The renderer MUST display the measure number using a standard text font (not a music/SMuFL glyph font).
- **FR-007**: The measure number MUST NOT overlap with staff lines, notes, or other structural glyphs (clef, key signature, time signature).
- **FR-008**: Measure numbering MUST be sequential and continuous across all systems (e.g., if system 1 ends at measure 4, system 2 starts at measure 5).
- **FR-009**: The measure number for the very first system MUST always be "1" (assuming the score starts at measure 1).
- **FR-010**: All positioning of the measure number MUST be computed by the layout engine — the renderer MUST NOT perform any positioning calculations.

### Key Entities

- **Measure Number**: A 1-based integer representing the sequential position of a measure within the score. Derived from the system's tick range and the current time signature. Displayed as plain text.
- **System**: A horizontal group of staves that fits on one visual line. Each system has a tick range that determines which measures it contains. The measure number is associated with the system level, not the staff level.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of rendered systems display the correct measure number corresponding to their first measure.
- **SC-002**: Measure numbers are visually readable and do not overlap with any other notation elements (staff lines, clefs, notes, key/time signatures).
- **SC-003**: Musicians can identify the starting measure of any system at a glance without counting measures from the beginning of the score.
- **SC-004**: Multi-instrument scores display exactly one measure number per system (no duplicates across staves).
- **SC-005**: Measure numbering remains accurate regardless of time signature changes within the score.

## Assumptions

- Measure numbering always starts at 1 for the first measure of the score (no anacrusis/pickup measure offset is handled in this feature).
- The font size and styling of measure numbers follow standard music engraving practice: a small, unobtrusive numeral above the staff.
- Measure boundaries are well-defined by time signature events in the score's global structural events.
- The existing layout engine already computes tick ranges per system, which provide sufficient information to derive measure numbers.

