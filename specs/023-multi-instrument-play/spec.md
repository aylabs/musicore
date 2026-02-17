# Feature Specification: Multi-Instrument Play View

**Feature Branch**: `023-multi-instrument-play`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "add support for multi instrument in the Play view. Include a title with the instrument name at the start of each system, before the bracket (Piano { and the two related staves) for each instrument."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Display All Instruments in Play View (Priority: P1)

A musician opens a multi-instrument score (e.g., a string quartet with Violin I, Violin II, Viola, Cello) in the Play View. Instead of seeing only the first instrument, they see all four instruments stacked vertically within each system. Each system contains one staff group per instrument, with all instruments visible at once — just like a traditional orchestral score.

**Why this priority**: Without this, the Play View is unusable for any score with more than one instrument. This is the core capability that unlocks the feature.

**Independent Test**: Import a multi-instrument MusicXML file (e.g., string quartet), switch to Play View, and verify all instruments' staves appear in every system.

**Acceptance Scenarios**:

1. **Given** a score with 4 instruments (Violin I, Violin II, Viola, Cello), **When** the user opens Play View, **Then** each system displays 4 staff groups stacked vertically, one per instrument, with correct note content on each.
2. **Given** a score with a single instrument (e.g., flute), **When** the user opens Play View, **Then** the view renders exactly as it does today — no visual regression.
3. **Given** a score with a piano (2 staves) and a violin (1 staff), **When** the user opens Play View, **Then** the piano shows 2 staves with a brace, and the violin shows 1 staff, all within the same system.
4. **Given** a score with instruments that have different numbers of measures, **When** the user opens Play View, **Then** the system uses empty staves for instruments that have fewer measures, maintaining visual alignment.

---

### User Story 2 - Instrument Name Labels at System Start (Priority: P2)

Each system displays the instrument name (e.g., "Piano", "Violin I", "Cello") as a text label to the left of the staff group, before the bracket or brace. This follows standard music engraving practice where instrument names appear at the start of each system.

**Why this priority**: Instrument names are essential for readability in multi-instrument scores. Without labels, the user cannot identify which staves belong to which instrument. However, the instruments can still be distinguished by their note content, making this an enhancement rather than a blocker.

**Independent Test**: Import a multi-instrument MusicXML file, open Play View, and verify each instrument's name appears at the start of its staff group in every system.

**Acceptance Scenarios**:

1. **Given** a multi-instrument score in Play View, **When** the user views any system, **Then** each instrument's name appears as a text label to the left of its bracket/brace.
2. **Given** a score with a piano instrument named "Piano", **When** the user views a system, **Then** the label "Piano" appears to the left of the brace that groups the piano's two staves.
3. **Given** a score with long instrument names (e.g., "Electric Bass Guitar"), **When** the user views a system, **Then** the name is displayed without truncation, and the music content starts after the longest name.
4. **Given** a single-instrument score, **When** the user views Play View, **Then** the instrument name still appears at the start of each system.

---

### User Story 3 - Correct Vertical Spacing Between Instruments (Priority: P1)

When multiple instruments are displayed in a system, each instrument's staves must be vertically separated from the next instrument with appropriate spacing. There must be no overlapping of staves between different instruments, and the spacing between instruments should be visually larger than the spacing between staves within the same instrument (e.g., between treble and bass staves of a piano).

**Why this priority**: This is a prerequisite for US1 — without correct vertical spacing, multiple instruments would overlap and be unreadable. Tied to P1 because it is inseparable from basic multi-instrument rendering.

**Independent Test**: Import a piano + violin score, open Play View, and verify the piano's two staves are closer together than the gap between the piano group and the violin staff.

**Acceptance Scenarios**:

1. **Given** a score with piano (2 staves) and violin (1 staff), **When** displayed in Play View, **Then** the piano's treble and bass staves have intra-instrument spacing, and there is a larger inter-instrument gap between the piano group and the violin staff.
2. **Given** a score with 4 single-staff instruments, **When** displayed in Play View, **Then** all 4 instruments are visible without any staff overlap.
3. **Given** a score with many instruments (e.g., 8+), **When** displayed in Play View, **Then** the system height grows to accommodate all instruments, and the user can scroll vertically to see all staves.

---

### Edge Cases

- What happens when a score has no instruments? The Play View shows an empty state message (existing behavior).
- What happens when an instrument has 0 notes across all staves? The instrument's staves render with staff lines but no note glyphs — maintaining visual alignment.
- What happens with very large ensembles (20+ instruments)? Systems grow taller; the existing zoom and scroll mechanisms handle the increased height.
- What happens with mixed staff counts (piano with 2 staves, flute with 1, organ with 3)? Each instrument's staff group renders its own number of staves; the layout engine allocates vertical space accordingly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Play View MUST render all instruments from the score, not just the first instrument.
- **FR-002**: Each system MUST contain one staff group per instrument, with all instruments stacked vertically.
- **FR-003**: Each instrument's staff group MUST display the instrument name as a text label to the left of the bracket/brace, at the start of each system.
- **FR-004**: The layout engine MUST calculate correct vertical positions for all instruments' staves, preventing overlap between different instruments' staves.
- **FR-005**: The spacing between instruments (inter-instrument gap) MUST be visually larger than the spacing between staves within the same instrument (intra-instrument spacing).
- **FR-006**: The system height MUST account for the total number of staves across all instruments, not just the staves of a single instrument.
- **FR-007**: For each staff, only voice 0 (the primary voice) MUST be rendered in the Play View, consistent with current single-instrument behavior.
- **FR-008**: The instrument name MUST be sourced from the Score domain model's `Instrument.name` field.
- **FR-009**: The layout engine MUST include the instrument name in the layout output so the renderer can display it without additional computation.
- **FR-010**: Single-instrument scores MUST continue to render correctly with no visual regression.
- **FR-011**: Playback note highlighting MUST work across all instruments — the correct notes highlight in the correct instrument's staves during playback.
- **FR-012**: The existing zoom and scroll controls MUST continue to work with multi-instrument systems.

### Key Entities

- **StaffGroup**: Represents one instrument within a system. Contains 1 or more staves, a bracket/brace glyph, and an instrument name label. One StaffGroup per instrument per system.
- **System**: A horizontal line of music containing all instruments. Height determined by the sum of all StaffGroups' heights plus inter-instrument spacing.
- **Instrument Name Label**: A text element positioned to the left of the bracket/brace in each system, displaying the instrument's name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 4-instrument score (e.g., string quartet) renders all 4 instruments in each system in Play View with no stave overlap.
- **SC-002**: Instrument names are visible at the start of each system for all instruments.
- **SC-003**: A single-instrument score renders identically to the current behavior (no visual regression).
- **SC-004**: Playback highlighting correctly highlights notes across all instruments during playback.
- **SC-005**: The user can zoom in/out and scroll through a multi-instrument score without rendering issues.
- **SC-006**: A piano (2-staff) + violin (1-staff) score displays with correct intra-instrument and inter-instrument spacing.
- **SC-007**: Staff line spacing uses standard 1×ups proportion so noteheads naturally fill the gap between lines.
- **SC-008**: Stem direction follows standard engraving rules — notes on/above the middle line get stems down, notes below get stems up.
- **SC-009**: Note glyphs use direction-aware SMuFL codepoints (Up/Down variants for half, quarter, eighth, sixteenth notes).
- **SC-010**: Systems fit within the viewport width (1600px) without requiring horizontal scrolling.
- **SC-011**: Ledger lines are proportional to notehead width (0.7 ups half-width).
- **SC-012**: All 298 backend tests and 789 frontend tests pass after engraving improvements.
- **SC-013**: Zoom 100% displays the score at natural reading size (BASE_SCALE=0.5 applied internally); no need to manually zoom out on load.
- **SC-014**: When notes from one staff extend into the region of an adjacent staff (e.g., low treble notes approaching the bass staff), the inter-staff spacing for that system is automatically increased to avoid overlap while preserving the default compact spacing for systems without collisions.

## Assumptions

- Voice 0 remains the only rendered voice per staff, consistent with current behavior. Multi-voice rendering is out of scope.
- Instrument names come from the existing `Instrument.name` field in the domain model, which is already populated during MusicXML import.
- The Rust layout engine is the authority for all positioning (Principle VI — Layout Engine Authority). Instrument name positions, vertical offsets, and system heights are all computed in Rust.
- Abbreviated instrument names for subsequent systems (standard engraving practice) are out of scope for this feature — full names are shown on every system.
- System-level brackets (thin vertical lines grouping all instruments) are out of scope; only per-instrument braces/brackets are rendered.

