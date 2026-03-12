# Feature Specification: Key Signatures

**Feature Branch**: `046-key-signatures`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "Add support for Key Signatures"

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

### User Story 1 - Display Key Signature on Staff (Priority: P1)

A musician opens a score that is written in a key other than C major (e.g., G major with one sharp). The key signature appears immediately after the clef symbol at the beginning of each staff line, showing the correct number and type of accidentals (sharps or flats) at their proper vertical positions on the staff.

**Why this priority**: Key signatures are fundamental to reading music. Without them, musicians cannot tell what key the piece is in, making the notation incomplete and potentially misleading. This is the core visual capability that all other key signature features depend on.

**Independent Test**: Can be fully tested by loading any MusicXML file with a non-C-major key signature (e.g., Chopin Nocturne Op.9 No.2 in Eb major) and verifying the accidentals appear correctly on the staff.

**Acceptance Scenarios**:

1. **Given** a score with a sharp key signature (e.g., G major, 1 sharp), **When** the score is rendered, **Then** a sharp symbol (♯) appears on the F line of the treble clef staff, positioned between the clef and the first note/rest.
2. **Given** a score with a flat key signature (e.g., Bb major, 2 flats), **When** the score is rendered, **Then** flat symbols (♭) appear on the B and E lines/spaces in standard order, positioned between the clef and the first note/rest.
3. **Given** a score in C major or A minor (no accidentals), **When** the score is rendered, **Then** no key signature accidentals appear, and spacing between the clef and first note remains unaffected.
4. **Given** a score with key signatures up to 7 sharps or 7 flats, **When** the score is rendered, **Then** all accidentals display at the correct staff positions without overlapping each other or adjacent elements.

---

### User Story 2 - Key Signature Adapts to Clef Type (Priority: P2)

A musician views a score that uses bass clef, alto clef, or tenor clef. The key signature accidentals appear at the correct vertical positions relative to the active clef, following standard music engraving conventions for all four supported clef types (treble, bass, alto, tenor).

**Why this priority**: Many scores use multiple clef types (e.g., piano with treble and bass, or orchestral parts with alto/tenor). Key signatures must be positioned correctly for each clef to be musically readable. Without this, non-treble-clef parts would show accidentals in the wrong positions.

**Independent Test**: Can be fully tested by loading scores using each of the four clef types in a key with sharps or flats, and verifying accidental positions are correct for each clef.

**Acceptance Scenarios**:

1. **Given** a staff with a treble clef in D major (2 sharps), **When** rendered, **Then** sharps appear on the F and C line/space positions defined for treble clef.
2. **Given** a staff with a bass clef in D major (2 sharps), **When** rendered, **Then** sharps appear on the F and C line/space positions defined for bass clef.
3. **Given** a staff with an alto clef in D major (2 sharps), **When** rendered, **Then** sharps appear on the F and C line/space positions defined for alto clef.
4. **Given** a staff with a tenor clef in D major (2 sharps), **When** rendered, **Then** sharps appear on the F and C line/space positions defined for tenor clef.
5. **Given** a multi-staff score where staves use different clef types, **When** rendered, **Then** each staff shows the key signature accidentals at positions appropriate to its own clef.

---

### User Story 3 - Key Signature Spacing and Layout (Priority: P3)

A musician views a score and the key signature accidentals are properly spaced so they don't overlap with the clef symbol on the left or notes/rests on the right. The horizontal space allocated for the key signature adjusts based on the number of accidentals present.

**Why this priority**: Without proper spacing, key signature accidentals may collide with the clef or with notes, making the score unreadable. This ensures visual clarity and professional appearance.

**Independent Test**: Can be fully tested by rendering scores with varying numbers of accidentals (1 through 7) and verifying no visual overlaps occur.

**Acceptance Scenarios**:

1. **Given** a score with 1 sharp in its key signature, **When** rendered, **Then** the horizontal space between the clef and the first note accommodates exactly one accidental symbol with standard padding.
2. **Given** a score with 7 flats in its key signature, **When** rendered, **Then** the horizontal space expands to accommodate all 7 accidental symbols without any overlapping, and note positions shift rightward accordingly.
3. **Given** two scores with different key signatures, **When** rendered side by side, **Then** the measure content starts at different horizontal positions reflecting the different key signature widths.

---

### User Story 4 - Key Signature on Subsequent Staff Lines (Priority: P4)

A musician scrolls through a multi-line score. The key signature is repeated at the beginning of each new staff line (system), so the musician always knows what key they are in without scrolling back to the top.

**Why this priority**: Standard music engraving practice requires key signatures to appear at the start of every system. Without this, musicians reading later parts of a score lose the key context.

**Independent Test**: Can be fully tested by loading a score long enough to span multiple systems and verifying the key signature appears at the start of each line.

**Acceptance Scenarios**:

1. **Given** a score in Eb major that spans multiple systems, **When** rendered, **Then** the three-flat key signature appears after the clef at the beginning of every system.
2. **Given** a score in C major, **When** rendered across multiple systems, **Then** no key signature accidentals appear on any system (consistent with no accidentals).

---

### Edge Cases

- What happens when the key signature contains the maximum number of accidentals (7 sharps or 7 flats)? All accidentals must display without overlapping.
- How does the system handle a score with no key signature element in the data? It defaults to C major (0 accidentals), consistent with current backend behavior.
- What happens if the staff is very narrow? The key signature must still be fully visible, potentially causing notes to reflow to the next system.
- How does the key signature interact with a time signature that also appears at the staff start? The order must be: clef, key signature, time signature, first note.
- What happens if a score contains a mid-piece key signature change (modulation)? The system displays only the initial key signature and silently ignores subsequent key changes. No warning or indicator is shown to the user.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render sharp (♯) accidentals at correct vertical staff positions for key signatures with 1 to 7 sharps, following the standard order: F, C, G, D, A, E, B.
- **FR-002**: System MUST render flat (♭) accidentals at correct vertical staff positions for key signatures with 1 to 7 flats, following the standard order: B, E, A, D, G, C, F.
- **FR-003**: System MUST position key signature accidentals at the correct vertical staff positions for all supported clef types: treble, bass, alto, and tenor.
- **FR-005**: System MUST render key signature accidentals between the clef symbol and the first note or rest in each measure at the start of a system.
- **FR-006**: System MUST allocate horizontal space proportional to the number of accidentals in the key signature, preventing overlap with adjacent elements.
- **FR-007**: System MUST display the key signature at the beginning of every staff system, not just the first one.
- **FR-008**: System MUST render no accidentals when the key signature is C major / A minor (0 sharps/flats).
- **FR-009**: System MUST use the key signature data already parsed from MusicXML files and stored in the score model (fifths value from -7 to +7).
- **FR-010**: System MUST use standard music notation font glyphs (SMuFL-compliant) for sharp and flat symbols in the key signature.
- **FR-011**: System MUST maintain the standard element order at the beginning of each system: clef, key signature, time signature.

### Key Entities

- **Key Signature**: Represents the set of sharps or flats that define the key of a piece. Identified by a fifths value ranging from -7 (7 flats) to +7 (7 sharps), where 0 represents C major / A minor. Associated with a specific position in the score timeline (tick).
- **Accidental Position**: Represents one individual accidental symbol within a key signature. Has a type (sharp or flat), a vertical staff position (which line or space), and a horizontal offset within the key signature group.
- **Staff Structural Event**: A container for staff-level notational elements (clef, key signature) that are not note events. Key Signature is one variant alongside Clef.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 15 standard key signatures (7 sharps, 7 flats, and C major) render correctly with accidentals at the proper staff positions for treble clef.
- **SC-002**: All 15 standard key signatures render correctly with accidentals at the proper staff positions for bass clef.
- **SC-002a**: All 15 standard key signatures render correctly with accidentals at the proper staff positions for alto and tenor clefs.
- **SC-003**: Key signature accidentals have no visual overlap with the clef symbol or with each other across all 15 key signatures.
- **SC-004**: All existing MusicXML test scores that contain key signatures display their key signatures correctly when loaded.
- **SC-005**: Scores in C major display no key signature accidentals, with no extra whitespace where a key signature would appear.
- **SC-006**: Multi-system scores display the correct key signature at the start of every system.

## Clarifications

### Session 2026-03-12

- Q: Should note accidental suppression (hiding sharps/flats on notes that match the key signature) be part of this feature? → A: Track as a follow-up feature; this feature covers key signature display only.
- Q: Should key signature positioning support all clef types (treble, bass, alto, tenor) or only treble and bass? → A: Support all clef types currently handled by the system (treble, bass, alto, tenor).
- Q: If the WASM bridge does not currently pass key signature data to the frontend, should wiring it through be part of this feature? → A: Yes, include WASM bridge wiring as part of this feature if needed.
- Q: What should the system display if a score contains a mid-piece key signature change? → A: Display only the initial key signature, silently ignore mid-piece changes.

## Assumptions

- The backend already fully supports key signature parsing, storage, and retrieval — no backend changes are needed for this feature.
- The MusicXML importer already extracts key signature data and stores it as `KeySignatureEvent` on each staff.
- The WASM bridge may or may not currently expose key signature data to the frontend. If not, wiring the data through the WASM bridge is included in this feature's scope as a prerequisite for rendering.
- Only standard key signatures (fifths-based, -7 to +7) are in scope. Non-standard or microtonal key signatures are not supported.
- Mid-piece key signature changes (modulations) are out of scope for this feature and can be addressed in a future iteration.
- Note accidental suppression (e.g., not showing ♯ on F notes when the key signature already includes F♯) is out of scope and tracked as a separate follow-up feature.
- The Bravura music font (SMuFL) is already available in the frontend for rendering accidental glyphs.

