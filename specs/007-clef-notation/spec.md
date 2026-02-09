# Feature Specification: Clef Notation Support in UI

**Feature Branch**: `007-clef-notation`  
**Created**: 2026-02-08  
**Status**: Draft  
**Input**: User description: "support clefs in UI so the more bass notes can be shown correctly"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Display Bass Clef for Low-Range Instruments (Priority: P1)

When a user imports or views a score containing bass instruments (cello, double bass, bass guitar, left hand piano), the UI displays these parts with a bass clef symbol on the staff. Notes are positioned correctly relative to the bass clef staff lines (F3 on the fourth line, C3 in the third space, etc.).

**Why this priority**: This is the core value - bass notes are currently difficult to read without proper clef display. Bass clef is the most common alternative clef and provides immediate usability improvement for piano, orchestral, and bass instrument scores.

**Independent Test**: Can be fully tested by importing a piano score with left-hand bass notes or a cello part, and verifying that the bass clef symbol appears on the staff with notes positioned correctly on bass clef staff lines.

**Acceptance Scenarios**:

1. **Given** a piano score imported with left-hand bass notes (C3-F3 range), **When** the user views the score, **Then** the bass clef symbol (𝄢) appears at the start of the bass staff line and notes are positioned correctly on the bass clef staff (F3 on fourth line, C3 in third space)
   - *Test files*: `tests/fixtures/musicxml/CanonD.musicxml` (with chords), `tests/fixtures/musicxml/piano_grand_staff.musicxml` (simple)
2. **Given** a cello part with notes in the bass range (C2-C4), **When** the user views the part, **Then** the bass clef symbol appears and notes below middle C are easily readable without excessive ledger lines
3. **Given** a multi-staff score with both treble and bass instruments, **When** viewing the score, **Then** each staff displays its appropriate clef (treble for violin, bass for cello)

---

### User Story 2 - Support Alto and Tenor Clefs for Viola/Trombone (Priority: P2)

When a user imports scores containing viola or trombone parts, the UI displays these instruments with alto clef (C clef on middle line) or tenor clef (C clef on fourth line) respectively. Middle C (C4) is positioned on the appropriate staff line for each clef type.

**Why this priority**: Alto and tenor clefs are essential for orchestral scores with viola, trombone, bassoon, and cello (tenor register). This expands the application's usefulness to full orchestral and chamber music repertoire.

**Independent Test**: Can be tested independently by importing a viola part and verifying that the alto clef symbol appears with middle C on the middle line, or importing a trombone part with tenor clef.

**Acceptance Scenarios**:

1. **Given** a viola part in alto clef (C3-C5 range), **When** the user views the score, **Then** the alto clef symbol (C clef on third line) appears and middle C is positioned on the middle line
2. **Given** a trombone part in tenor clef (E3-Bb4 range), **When** viewing the score, **Then** the tenor clef symbol (C clef on fourth line) appears and middle C is on the fourth line
3. **Given** a string quartet score (2 violins, viola, cello), **When** viewing the full score, **Then** violins show treble clef, viola shows alto clef, and cello shows bass clef

---

### User Story 3 - Display Clef Changes Within a Piece (Priority: P3)

When a score contains clef changes mid-piece (common in piano and cello music where the right hand temporarily uses bass clef, or cello switches to tenor clef for high passages), the UI displays the new clef symbol at the point of change and positions subsequent notes according to the new clef.

**Why this priority**: Clef changes are less common but essential for advanced repertoire. This completes the clef support feature and handles all standard musical notation scenarios.

**Independent Test**: Can be tested by importing a piano piece with a clef change in measure 5 (e.g., right hand switches from treble to bass clef), and verifying the new clef symbol appears and notes after it are positioned correctly.

**Acceptance Scenarios**:

1. **Given** a piano score where the right hand changes from treble to bass clef in measure 8, **When** viewing measure 8, **Then** a new bass clef symbol appears at the clef change point and subsequent notes are positioned on bass clef staff lines
2. **Given** a cello part that switches from bass to tenor clef for a high passage, **When** viewing the clef change, **Then** the tenor clef symbol appears mid-staff and notes following it are positioned according to tenor clef
3. **Given** a score with a clef change back to the original clef, **When** viewing the second clef change, **Then** the original clef symbol reappears and note positioning returns to the original clef system

---

### Edge Cases

- What happens when a score contains an unsupported clef type (e.g., soprano clef, baritone clef)?
  - System displays a default clef (treble) and logs a warning about unsupported clef type
- How does the UI handle percussion clefs (neutral clef with no pitch)?
  - Percussion clef displays as neutral clef symbol (two vertical lines) with notes positioned for rhythmic notation
- What if imported MusicXML specifies an incorrect clef for an instrument (e.g., violin with bass clef)?
  - System displays the clef as specified in the file, respecting the composer's/arranger's intent
- How does clef display work on small screen sizes or when zoomed out?
  - Clef symbols scale proportionally with staff size and remain legible at minimum zoom level (50%)
- What happens at system breaks (new line of music)?
  - Clef symbol is repeated at the start of each system to maintain readability

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display treble clef (G clef) symbol at the start of staves for instruments notated in treble clef (violin, flute, trumpet, soprano, right-hand piano)
- **FR-002**: System MUST display bass clef (F clef) symbol at the start of staves for instruments notated in bass clef (cello, double bass, trombone, bass guitar, left-hand piano)
- **FR-003**: System MUST display alto clef (C clef on middle line) for viola and other alto-range instruments
- **FR-004**: System MUST display tenor clef (C clef on fourth line) for tenor trombone, bassoon tenor passages, and cello tenor register
- **FR-005**: System MUST position notes correctly on staff lines and spaces according to the active clef (e.g., in bass clef, F3 appears on the fourth line from bottom, not second line as in treble clef)
- **FR-006**: System MUST render clef symbols using standard music notation glyphs that are visually clear and recognizable to musicians (using music font glyphs like Bravura or equivalent)
- **FR-007**: System MUST display clef symbols at the appropriate size relative to staff line spacing (standard music notation proportions)
- **FR-008**: System MUST repeat clef symbols at the start of each system (new line of music) to maintain readability
- **FR-009**: When a clef change occurs mid-piece, system MUST display the new clef symbol at the point of change and adjust note positioning for all subsequent notes until the next clef change
- **FR-010**: System MUST handle multi-staff scores by displaying the appropriate clef for each staff independently (e.g., piano grand staff shows treble clef on top staff, bass clef on bottom staff)
- **FR-011**: System MUST scale clef symbols proportionally when staff size changes (zoom, responsive layout)
- **FR-012**: System MUST store clef information in the score data model, associating each staff/measure with its active clef type
- **FR-013**: When importing MusicXML files, system MUST extract clef information from `<clef>` elements and associate it with the appropriate staff
- **FR-014**: System MUST support the five most common clef types: treble (G2), bass (F4), alto (C3), tenor (C4), and percussion (neutral)
- **FR-015**: For unsupported or unrecognized clef types, system MUST display a default clef (treble) and log a warning for the user

### Key Entities *(include if feature involves data)*

- **Clef**: Represents a musical clef with properties for clef type (treble/bass/alto/tenor/percussion), staff line position, and octave transposition. Associated with a specific staff and measure range.
- **Staff**: Contains clef information indicating which clef is currently active. A staff may have multiple clef changes throughout a piece.
- **Note**: Positioning depends on both the pitch value and the active clef. The same pitch appears on different staff positions depending on clef (e.g., middle C on third ledger line above in bass clef, first ledger line below in treble clef).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view bass clef notation for bass instruments and piano left hand, with notes correctly positioned on bass clef staff lines (verifiable by importing a bass clef part and confirming F3 appears on fourth line)
- **SC-002**: Multi-staff scores (piano, string quartet) display with each staff showing its appropriate clef symbol (treble, bass, alto) simultaneously
- **SC-003**: Clef symbols are visually clear and recognizable at all zoom levels from 50% to 200%, maintaining standard music notation proportions
- **SC-004**: Musicians can identify note pitches 40% faster when viewing bass notes with bass clef compared to the same notes displayed with treble clef and excessive ledger lines
- **SC-005**: All imported MusicXML files with clef information display with the correct clef symbols matching the source file (100% clef accuracy)
- **SC-006**: Alto clef (viola) and tenor clef (trombone) parts display with correct clef symbols, with middle C positioned on the third and fourth lines respectively
- **SC-007**: Clef changes within a piece are visually indicated at the point of change, with subsequent notes positioned correctly according to the new clef
- **SC-008**: Users report that bass-range scores (cello, piano, bass guitar) are "easy to read" and "correctly notated" in 95% of usability feedback
