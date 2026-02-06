# Feature Specification: Hierarchical Score Model

**Feature Branch**: `001-score-model`  
**Created**: 2026-02-06  
**Status**: Draft  
**Input**: User description: "Model the score, with instruments, staves in the instrument, voices in the stave and the interval events in the voice. Structural events shall not belong to voices. Structural events are scoped either globally (Score) or per Staff."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Basic Score Structure (Priority: P1) 🎯 MVP

A musician wants to create a simple musical score with one instrument (e.g., piano) that has a single staff and one voice to input notes.

**Why this priority**: This is the foundation for all music editing. Without the ability to create a score with at least one instrument and voice, no musical content can be entered. This represents the absolute minimum viable product.

**Independent Test**: Can be fully tested by creating a new Score entity, adding one Instrument with one Staff containing one Voice, and verifying the hierarchical structure is navigable and the system initializes required structural events at tick 0.

**Acceptance Scenarios**:

1. **Given** an empty music timeline, **When** a musician creates a new score, **Then** the system creates a Score entity with default global structural events (tempo 120 BPM, 4/4 time signature) at tick 0
2. **Given** a newly created score, **When** a musician adds an instrument (e.g., "Piano"), **Then** the system creates an Instrument entity containing one Staff with default staff structural events (treble clef, C major key) at tick 0
3. **Given** an instrument with a staff, **When** the system initializes the staff, **Then** it automatically creates one Voice for note input
4. **Given** a voice at tick 0, **When** a musician adds a note with start_tick=0 and duration_ticks=960 (quarter note), **Then** the note is stored as an IntervalEvent in that voice

---

### User Story 2 - Multi-Staff Instruments (Priority: P2)

A musician wants to add instruments that require multiple staves (e.g., piano with treble and bass clefs, or organ with three staves).

**Why this priority**: Many common instruments (piano, harp, organ) require multiple staves. This is essential for practical music editing but builds on the basic single-staff functionality.

**Independent Test**: Can be tested by creating a piano instrument with two staves (treble and bass), assigning different clefs to each staff, and verifying notes can be added to voices in both staves independently.

**Acceptance Scenarios**:

1. **Given** a score with an instrument, **When** a musician adds a second staff to the instrument, **Then** the system creates a new Staff entity with its own staff-scoped structural events
2. **Given** a piano with treble and bass staves, **When** a musician sets the bass staff clef to bass clef at tick 0, **Then** only the bass staff has the bass clef while the treble staff retains its treble clef
3. **Given** two staves in one instrument, **When** notes are added to voices in both staves, **Then** notes in different staves can occur at the same tick values without conflict

---

### User Story 3 - Polyphonic Voices (Priority: P3)

A musician wants to create polyphonic music by using multiple voices within a single staff (e.g., soprano and alto parts on the same treble staff).

**Why this priority**: Polyphony is common in advanced music notation (four-part harmony, contrapuntal music). This enables professional-level score creation but is not needed for basic functionality.

**Independent Test**: Can be tested by creating a staff with two voices, adding different simultaneous note sequences to each voice, and verifying that notes with different pitches can overlap within each voice while notes with the same pitch cannot overlap within the same voice.

**Acceptance Scenarios**:

1. **Given** a staff with one voice, **When** a musician adds a second voice, **Then** the system creates a new Voice entity within that staff
2. **Given** two voices in one staff, **When** simultaneous notes with different pitches are added to both voices at the same tick, **Then** both notes are stored and can be rendered as a chord
3. **Given** a single voice, **When** a musician attempts to add two notes with the same pitch that overlap in time, **Then** the system rejects the second note with validation error
4. **Given** a single voice, **When** a musician adds two notes with different pitches that overlap in time, **Then** both notes are allowed forming a chord within that voice

---

### User Story 4 - Manage Global Structural Events (Priority: P4)

A musician wants to change tempo or time signature at specific points in the score (e.g., tempo change at measure 10, time signature change from 4/4 to 3/4).

**Why this priority**: Most simple compositions have consistent tempo and time signature throughout. However, more complex pieces require these changes. This is important but not critical for MVP.

**Independent Test**: Can be tested by adding tempo and time signature events at various tick positions, verifying they apply globally to all instruments, and ensuring earlier structural events are overridden by later ones.

**Acceptance Scenarios**:

1. **Given** a score at tick 0 with tempo 120 BPM, **When** a musician adds a tempo event at tick 3840 (measure 5 in 4/4) with tempo 80 BPM, **Then** the new tempo applies globally from tick 3840 onward
2. **Given** a score with 4/4 time signature, **When** a musician adds a time signature event at tick 7680 changing to 3/4, **Then** all staves reflect the new time signature from that tick onward
3. **Given** structural events already exist, **When** a musician attempts to add a structural event of the same type at the same tick, **Then** the system rejects it with a validation error
4. **Given** required structural events at tick 0, **When** a musician attempts to delete them, **Then** the system prevents deletion to maintain invariants

---

### User Story 5 - Manage Staff-Scoped Structural Events (Priority: P5)

A musician wants to change clef or key signature for a specific staff without affecting other staves (e.g., changing from treble to bass clef mid-piece for a vocal line, or using different key signatures for transposing instruments).

**Why this priority**: While useful for advanced notation (transposing instruments, clef changes), most basic scores maintain consistent clefs and keys throughout. This is a professional feature for complex arrangements.

**Independent Test**: Can be tested by adding clef and key signature events to one staff at various ticks, verifying they only affect that specific staff, and ensuring other staves maintain their independent structural events.

**Acceptance Scenarios**:

1. **Given** a staff with treble clef, **When** a musician adds a clef change event to bass clef at tick 1920, **Then** only that staff changes clef from tick 1920 onward
2. **Given** multiple staves in a score, **When** a musician changes the key signature of one staff, **Then** other staves retain their independent key signatures
3. **Given** a staff with existing structural events, **When** a musician adds a key signature event, **Then** the key signature persists until overridden by a subsequent key signature event
4. **Given** required staff structural events at tick 0, **When** a musician attempts to delete them, **Then** the system prevents deletion to maintain staff invariants

---

### Edge Cases

- What happens when a note's start_tick + duration_ticks extends beyond the current score length?
- How does the system handle overlapping notes with the same pitch in the same voice (must reject)?
- What happens when attempting to add structural events with negative tick values (must reject)?
- How does the system ensure at least one structural event of each type exists at tick 0 when initializing?
- What happens when deleting an instrument that contains notes (cascade deletion or prevent)?
- How does the system handle adding a note with duration_ticks = 0 or negative duration (must reject)?
- What happens when adding structural events of the same type at the same tick (must reject)?

## Requirements *(mandatory)*

### Functional Requirements

#### Score Hierarchy

- **FR-001**: System MUST model a Score as the root entity containing all musical content
- **FR-002**: System MUST allow a Score to contain zero or more Instruments
- **FR-003**: System MUST allow each Instrument to contain one or more Staves
- **FR-004**: System MUST allow each Staff to contain one or more Voices
- **FR-005**: System MUST allow each Voice to contain zero or more IntervalEvents (notes)

#### Event Types

- **FR-006**: System MUST support Structural Events (InstantEvents) that occur at a single tick position and persist until overridden
- **FR-007**: System MUST support Interval Events that have both start_tick and duration_ticks properties
- **FR-008**: System MUST implement these Structural Event types: TempoEvent, TimeSignatureEvent, ClefEvent, KeySignatureEvent
- **FR-009**: System MUST implement Note as an Interval Event type with pitch and rhythm attributes

#### Event Scoping

- **FR-010**: System MUST scope TempoEvent and TimeSignatureEvent globally to the Score level
- **FR-011**: System MUST scope ClefEvent and KeySignatureEvent to individual Staff level
- **FR-012**: System MUST prevent Structural Events from belonging to Voices (only Score or Staff)
- **FR-013**: System MUST store IntervalEvents (notes) exclusively within Voices

#### Timeline Resolution

- **FR-014**: System MUST operate at 960 PPQ (pulses per quarter note) resolution
- **FR-015**: System MUST use integer arithmetic for all tick calculations to maintain precision
- **FR-016**: System MUST represent all temporal positions as integer tick values

#### Invariants & Validation

- **FR-017**: System MUST ensure at least one Structural Event of each required type exists at tick 0 when initializing a Score (TempoEvent, TimeSignatureEvent)
- **FR-018**: System MUST ensure at least one Structural Event of each required type exists at tick 0 when initializing a Staff (ClefEvent, KeySignatureEvent)
- **FR-019**: System MUST prevent multiple Structural Events of the same type from occurring at the same tick position
- **FR-020**: System MUST validate that all IntervalEvents have start_tick ≥ 0
- **FR-021**: System MUST validate that all IntervalEvents have duration_ticks > 0
- **FR-022**: System MUST allow notes in the same voice to overlap if their pitches differ (chords)
- **FR-023**: System MUST prevent notes with the same pitch in the same voice from overlapping in time
- **FR-024**: System MUST support notes in different voices to overlap regardless of pitch

#### API Operations

- **FR-025**: System MUST provide operations to create Score, Instrument, Staff, and Voice entities
- **FR-026**: System MUST provide operations to add, retrieve, and delete Structural Events at specific tick positions
- **FR-027**: System MUST provide operations to add, retrieve, update, and delete IntervalEvents (notes) within Voices
- **FR-028**: System MUST provide operations to query all events (structural and interval) within a specified tick range
- **FR-029**: System MUST provide operations to validate the hierarchical structure and temporal constraints

### Key Entities *(include if feature involves data)*

- **Score**: Root aggregate containing the entire musical composition. Contains global structural events and a collection of Instruments. Operates at 960 PPQ resolution.

- **Instrument**: Represents a musical instrument (e.g., Piano, Violin, Trumpet). Contains one or more Staves. Has a name attribute for identification.

- **Staff**: Represents a musical staff with five lines. Contains staff-scoped structural events (clef, key signature) and one or more Voices. Belongs to exactly one Instrument.

- **Voice**: Represents an independent melodic line within a staff. Contains a sequence of IntervalEvents (notes). Multiple voices enable polyphony on a single staff.

- **StructuralEvent (abstract)**: Base type for events that occur at a single tick and persist until overridden. Has a tick position. Cannot belong to a Voice.

- **TempoEvent**: Structural event defining tempo in BPM (beats per minute). Scoped globally to Score. Persists until next TempoEvent.

- **TimeSignatureEvent**: Structural event defining time signature (e.g., 4/4, 3/4). Scoped globally to Score. Persists until next TimeSignatureEvent.

- **ClefEvent**: Structural event defining the clef (treble, bass, alto, tenor). Scoped to individual Staff. Persists until next ClefEvent on that staff.

- **KeySignatureEvent**: Structural event defining key signature (e.g., C major, D minor). Scoped to individual Staff. Persists until next KeySignatureEvent on that staff.

- **IntervalEvent (abstract)**: Base type for events with duration. Has start_tick (integer ≥ 0) and duration_ticks (integer > 0). Belongs to a Voice.

- **Note**: Interval event representing a musical note. Has pitch (e.g., MIDI note number 60 = middle C) and inherits timing from IntervalEvent. Multiple notes with different pitches at the same tick form a chord.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A musician can create a score with one instrument and add 100 notes in under 30 seconds through the API
- **SC-002**: The system validates all invariants (tick 0 events, no overlaps of same pitch, positive durations) with 100% accuracy across 10,000 test cases
- **SC-003**: The system retrieves all events in a 1000-measure score (with 50 events per measure) within 200ms
- **SC-004**: Score hierarchy navigation (Score → Instrument → Staff → Voice → Notes) completes in constant time O(1) for direct access operations
- **SC-005**: The system maintains integer precision for all timing operations with scores up to 1,000,000 ticks without rounding errors

## Assumptions

- This specification focuses on the domain model structure; rendering/display of notation is handled by separate frontend components
- Default values for initial structural events (tempo 120 BPM, 4/4 time, treble clef, C major) are reasonable starting points for most scores
- MIDI note numbers (0-127) are sufficient for representing pitch in musical notes
- Duration is measured in ticks and converted to musical notation (quarter notes, eighth notes) by separate presentation logic
- Score persistence (saving/loading to storage) is handled by infrastructure layer adapters, not the core domain model
- Multi-measure rests and other notational shortcuts are display concerns, not domain model concerns

## Out of Scope

- Visual rendering of the score (staff lines, note heads, stems, beams)
- Audio playback or MIDI export
- Music notation engraving rules (stem direction, beam grouping, spacing)
- Undo/redo functionality
- Collaborative editing or multi-user access
- Score metadata (composer, title, copyright)
- Advanced notation (articulations, dynamics, ornaments, lyrics)
- Score layout and pagination
- Import from MusicXML, MIDI, or other formats
- Transposition or other musical transformations

## Dependencies

- Backend music engine core domain (Rust implementation with hexagonal architecture)
- 960 PPQ resolution is a fixed constraint inherited from Music Timeline specification
- API layer will need to expose these domain entities through REST or GraphQL endpoints (API-first development)
- Frontend will consume the API to present the score model to users (React-based)

## Glossary

- **PPQ (Pulses Per Quarter)**: The resolution of the timeline, where 960 pulses equals one quarter note
- **Tick**: A discrete time unit in the timeline; 960 ticks = 1 quarter note at any tempo
- **Structural Event**: An event that occurs at a specific point in time and persists until overridden (e.g., tempo change)
- **Interval Event**: An event with both a start time and duration (e.g., a note)
- **Voice**: An independent melodic line; multiple voices on one staff enable polyphony
- **Polyphony**: Multiple simultaneous melodic lines (voices) in the same staff
- **Aggregate Root**: In DDD, the entry point for accessing and modifying a cluster of domain objects (Score is the aggregate root)
