# Feature Specification: Note Beaming

**Feature Branch**: `021-note-beaming`  
**Created**: 2026-02-15  
**Status**: Draft  
**Input**: User description: "Use beams to join notes and replace flags with join lines when applicable. Use MusicXML beaming information to simplify the implementation. Probably you would need to stop using head+stem combined symbols from Bravura fonts, and draw the beam. The performance implications must be carefully analyzed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Beamed Eighth Notes in Imported Scores (Priority: P1)

A musician imports a MusicXML score containing eighth notes and sixteenth notes. Instead of seeing individual flagged notes (each with its own flag rendered as part of a combined glyph), they see groups of notes connected by horizontal or slightly angled beam lines, matching standard music engraving conventions. This makes the rhythmic structure immediately clear and the score easier to read.

**Why this priority**: Beaming is a fundamental aspect of standard music notation. Without beams, any score with eighth notes or shorter looks amateurish and is harder to read. This is the single highest-value visual improvement for score readability.

**Independent Test**: Import a MusicXML file containing a measure of four eighth notes. Verify that the notes are displayed with a single beam connecting all four noteheads instead of individual flags on each note.

**Acceptance Scenarios**:

1. **Given** a MusicXML file with four eighth notes in a 4/4 measure, **When** the user imports the file, **Then** the notes are displayed grouped with a single beam line connecting them, and no individual flags are visible on the beamed notes.
2. **Given** a MusicXML file with eighth notes that include explicit `<beam>` elements (begin, continue, end), **When** the user imports the file, **Then** the beam groups match exactly what the MusicXML specifies.
3. **Given** a MusicXML file with a mix of quarter notes and eighth notes in the same measure, **When** the user imports the file, **Then** the quarter notes display with stems (no beam), and the eighth notes display connected by beams.

---

### User Story 2 - Multi-Level Beaming for Sixteenth Notes (Priority: P2)

A musician views a score containing sixteenth notes (and shorter durations). These notes are displayed with two levels of beams — a primary beam connecting the full group and a secondary beam connecting the sixteenth-note subgroups — following standard engraving rules.

**Why this priority**: Sixteenth notes are common in most music genres. Supporting multi-level beaming (two or more beam lines) ensures the system handles the most frequent real-world beaming patterns, which is essential for correctness after the basic single-beam case works.

**Independent Test**: Import a MusicXML file containing a group of four sixteenth notes. Verify they display with two parallel beam lines connecting them.

**Acceptance Scenarios**:

1. **Given** a MusicXML file with four sixteenth notes beamed together, **When** the user imports the file, **Then** two beam lines are drawn connecting the note group — a primary beam and a secondary beam.
2. **Given** a MusicXML file with a mixed beam group containing two eighth notes followed by two sixteenth notes, **When** the user imports the file, **Then** a primary beam spans all four notes, and a secondary beam spans only the two sixteenth notes.
3. **Given** a MusicXML file with thirty-second notes, **When** the user imports the file, **Then** three beam levels are drawn for the thirty-second note group.

---

### User Story 3 - Correct Stem Direction in Beamed Groups (Priority: P2)

A musician views a beamed group where all notes are above the middle staff line. The stems point downward, and the beam appears below the noteheads. When all notes are below the middle line, stems point upward and the beam appears above the noteheads. Stem direction within a beamed group is uniform, determined by the majority of notes' positions relative to the middle line.

**Why this priority**: Correct stem direction is tightly coupled with beam rendering — beams attach to stem endpoints. Without uniform and correctly directed stems within a group, beams would look wrong or be positioned incorrectly.

**Independent Test**: Import a score where a beamed group has all notes above the middle staff line. Verify stems point down and the beam is drawn below the noteheads.

**Acceptance Scenarios**:

1. **Given** a beamed group where all notes are above the middle staff line, **When** the score is rendered, **Then** all stems in the group point downward and the beam is drawn below the noteheads.
2. **Given** a beamed group where all notes are below the middle staff line, **When** the score is rendered, **Then** all stems in the group point upward and the beam is drawn above the noteheads.
3. **Given** a beamed group where notes span both sides of the middle staff line, **When** the score is rendered, **Then** the stem direction is uniform for the entire group, determined by the majority position of the notes.

---

### User Story 4 - Beaming Preserves Rendering Performance (Priority: P3)

A musician opens a large orchestral score (10+ staves, 50+ measures). The score scrolls smoothly and notes render without visible lag. The switch from combined glyphs to separate noteheads plus drawn stems and beams does not cause user-perceptible performance degradation.

**Why this priority**: The system currently uses single combined glyphs for notes (efficient — one SVG text element per note). Beaming requires switching to separate noteheads plus drawn stem lines and beam rectangles, which increases the number of rendered elements. Performance must be validated to ensure the change doesn't break the smooth scrolling experience.

**Independent Test**: Open a dense score with 10 staves and 100 measures. Measure rendering time and scrolling frame rate. Confirm rendering meets the performance thresholds.

**Acceptance Scenarios**:

1. **Given** a score with 10 staves and 100 measures containing beamed note groups, **When** the user scrolls through the score, **Then** the scroll frame rate remains above 30 frames per second.
2. **Given** a large score, **When** the layout is computed with beam generation enabled, **Then** layout computation time does not increase by more than 50% compared to the current combined-glyph approach.
3. **Given** a score rendered with beamed notes, **When** rendering a visible viewport, **Then** no individual frame takes more than 33 milliseconds to render.

---

### Edge Cases

- What happens when a beamed group contains only a single note (degenerate beam group)? The note should display with a flag instead of a beam, falling back to the current rendering approach.
- How does the system handle a MusicXML file with no `<beam>` elements? Notes should fall back to algorithmic beaming based on time signature beat groupings (e.g., group eighth notes by beat in 4/4 time).
- What happens when a beamed group spans across a bar line? Beams should not cross bar lines — the group should be split at the bar line boundary.
- What happens when a beamed group contains rests between notes? Standard engraving practice allows beams over rests in some contexts; the system should break the beam at rests by default.
- How does beaming interact with notes on ledger lines (far above or below the staff)? Stems and beams should extend appropriately, maintaining minimum stem length requirements regardless of ledger line distance.
- What happens when a beamed group crosses staves (cross-staff beaming, e.g., piano)? This is out of scope for this feature. Cross-staff beaming should be handled in a future feature. Notes that cross staves should render with individual flags.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse `<beam>` elements from MusicXML files, extracting beam number (level), and beam type (begin, continue, end, forward hook, backward hook) for each note.
- **FR-002**: System MUST group notes into beam groups based on parsed MusicXML beam information when `<beam>` elements are present in the source file.
- **FR-003**: System MUST fall back to algorithmic beat-based beaming when MusicXML files lack `<beam>` elements, grouping eighth notes and shorter by beat position within the current time signature.
- **FR-004**: System MUST render beamed notes using separate notehead glyphs (without integrated stems or flags) combined with independently drawn stems and beam lines.
- **FR-005**: System MUST render unbeamed flagged notes (e.g., a single isolated eighth note) using the existing combined head+stem+flag glyphs to preserve visual quality for non-beamed notes.
- **FR-006**: System MUST support multi-level beaming — one beam line for eighth notes, two for sixteenth notes, three for thirty-second notes, and so on up to 128th notes (five beam levels).
- **FR-007**: System MUST compute uniform stem direction for all notes within a beamed group, based on the majority of note positions relative to the middle staff line.
- **FR-008**: System MUST draw beam lines connecting the stem endpoints of all notes in a beam group, with appropriate slope calculated from the first and last note positions.
- **FR-009**: System MUST clamp beam slope to prevent excessively steep beams, keeping the angle within standard engraving limits.
- **FR-010**: System MUST break beams at bar lines — beam groups cannot span across measure boundaries.
- **FR-011**: System MUST break beams at rests by default — a rest within what would otherwise be a beam group terminates the beam.
- **FR-012**: System MUST maintain minimum stem length for all beamed notes, extending stems as necessary so that no stem is shorter than standard engraving minimums.
- **FR-013**: System MUST support partial beams (forward hooks and backward hooks) for notes that require a secondary beam on only one side (e.g., a single sixteenth note at the end of an eighth-note beam group).
- **FR-014**: System MUST NOT degrade rendering performance beyond the thresholds defined in the success criteria when beam generation is enabled.

### Key Entities

- **Beam Group**: A set of consecutive notes connected by one or more beam lines. Defined by a start note, zero or more continuation notes, and an end note. All notes share a uniform stem direction.
- **Beam Line**: A horizontal or slightly angled thick line connecting stem endpoints at a given beam level. Level 1 connects eighth notes and shorter; level 2 connects sixteenth notes and shorter; and so on.
- **Stem**: A vertical line extending from a notehead to the beam line (for beamed notes) or to a standard length (for unbeamed notes). Has a direction (up or down) and attachment point on the notehead.
- **Beam Hook**: A partial beam line (forward or backward) that appears on only one side of a note's stem, indicating a secondary beam level for a single note within a group.
- **Notehead**: The oval part of a note, rendered as a standalone glyph (separate from stem and flag) when the note participates in a beam group.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All beamed note groups in imported MusicXML files with explicit `<beam>` elements render with visually correct beam lines matching the source file's beaming, verified against reference scores.
- **SC-002**: Scores without MusicXML beam information render with algorithmically correct beam groups that follow standard engraving conventions for the given time signature.
- **SC-003**: Multi-level beams (sixteenth, thirty-second notes) display the correct number of beam lines corresponding to the note duration.
- **SC-004**: Scrolling a score with 10 staves and 100 measures maintains a frame rate above 30 frames per second.
- **SC-005**: Layout computation time for a score with beamed notes does not increase by more than 50% compared to the same score rendered with combined glyphs (no beaming).
- **SC-006**: Beamed note groups are visually indistinguishable from standard engraved music notation when compared to reference implementations (e.g., MuseScore, Finale output).
- **SC-007**: 100% of existing test cases continue to pass after beaming is implemented, ensuring no regressions in unrelated features.

## Assumptions

- MusicXML files from common notation editors (MuseScore, Finale, Sibelius, Dorico) include `<beam>` elements for standard beaming. The fallback algorithmic beaming is a safety net for minimal or hand-crafted MusicXML files.
- The existing viewport-based virtualization (only rendering visible systems) is sufficient to keep performance within bounds even with the increased element count from separate noteheads, stems, and beams.
- Cross-staff beaming (notes beamed across the treble and bass staves of a piano part) is out of scope and will be addressed in a future feature.
- Beam groups in non-standard time signatures (5/8, 7/8, etc.) follow conventional beat groupings (e.g., 3+2 for 5/8) when no explicit MusicXML beam information is provided. Standard 4/4 groups by beat (every 2 eighth notes), 3/4 groups by beat, 6/8 groups by dotted-quarter.
- The Bravura font provides standalone notehead glyphs (noteheadBlack, noteheadHalf) suitable for use when rendering beamed notes without integrated stems.
- Beam thickness, spacing between beam levels, and minimum stem lengths follow SMuFL / standard engraving conventions.

## Known Issues & Regression Tests *(if applicable)*

<!--
  This section is empty at specification time and will be populated during implementation
  as issues are discovered per Principle VII (Regression Prevention).
-->

