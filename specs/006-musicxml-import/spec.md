# Feature Specification: MusicXML Import from MuseScore

**Feature Branch**: `006-musicxml-import`  
**Created**: 2026-02-08  
**Status**: Draft  
**Input**: User description: "Import MusicXML scores exported by MuseScore"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Basic Single-Staff Score (Priority: P1)

A user opens a simple MusicXML file containing a single melody line (e.g., treble clef with notes) and sees it displayed in the notation view. This is the most common use case for beginners importing simple melodies or exercises from MuseScore.

**Why this priority**: Core MVP functionality - enables users to import the most common score type (single melody) which provides immediate value and validates the entire import pipeline.

**Independent Test**: Export a simple C Major scale from MuseScore as MusicXML, import it, verify notes appear in correct positions with proper timing and pitch.

**Acceptance Scenarios**:

1. **Given** user has a MusicXML file with one staff and 8 quarter notes, **When** user clicks "Import MusicXML" and selects the file, **Then** system displays 8 notes on a treble clef staff at correct pitches and positions
2. **Given** user imports a MusicXML file with tempo marking (120 BPM), **When** import completes, **Then** system preserves tempo setting at tick 0
3. **Given** user imports a MusicXML file with 4/4 time signature, **When** import completes, **Then** system displays barlines at correct measure boundaries (every 3840 ticks)
4. **Given** user imports a MusicXML file with a key signature (G Major, 1 sharp), **When** import completes, **Then** system displays F# accidentals in key signature area

---

### User Story 2 - Import Multi-Staff Piano Score (Priority: P2)

A user imports a piano score with both treble and bass clefs (grand staff), seeing both staves rendered correctly with proper clef symbols and notes on each staff. This enables piano players to import their sheet music.

**Why this priority**: Extends to the most popular multi-staff instrument (piano), unlocking value for a large user segment while reusing P1 infrastructure.

**Independent Test**: Export a simple piano piece (both hands) from MuseScore, import it, verify both staves appear with correct clefs and notes distributed to appropriate staves.

**Acceptance Scenarios**:

1. **Given** user has a MusicXML piano score with treble and bass staves, **When** user imports the file, **Then** system displays two staves with appropriate clef symbols (treble on top, bass on bottom)
2. **Given** piano score has notes spanning both hands, **When** import completes, **Then** notes are assigned to correct staves based on their vertical position in the MusicXML
3. **Given** piano score has chord symbols, **When** import completes, **Then** chord symbols display above the treble staff (integration with feature 005-chord-symbols)

---

### User Story 3 - Import Score with Multiple Instruments (Priority: P3)

A user imports an ensemble score (e.g., string quartet: violin, viola, cello) and sees all instruments rendered as separate staves. This enables orchestral/chamber music workflows.

**Why this priority**: Completes full-featured import capability for complex scores, but less critical than P1/P2 which cover majority of use cases.

**Independent Test**: Export a 3-instrument score from MuseScore, import it, verify all three instruments appear as separate sections with correct instrument names.

**Acceptance Scenarios**:

1. **Given** user has a MusicXML file with 4 instruments (violin, viola, cello, bass), **When** user imports the file, **Then** system creates 4 instruments with correct names
2. **Given** each instrument has unique key signatures, **When** import completes, **Then** each staff displays its own key signature correctly
3. **Given** score has instrument-specific articulations, **When** import completes, **Then** system preserves note timings and pitches (articulation rendering deferred to future features)

---

### Edge Cases

- What happens when MusicXML file is **malformed or invalid XML**?
  → System displays clear error message "Invalid MusicXML file: [specific issue]" without crashing
  
- How does system handle **unsupported MusicXML elements** (e.g., guitar tablature, lyrics, dynamics)?
  → System imports supported elements (notes, clefs, key signatures, time signatures, tempo) and logs warnings for unsupported elements; user sees notation but without unsupported features
  
- What happens when file contains **very large scores** (1000+ notes, 50+ measures)?
  → System processes import asynchronously with progress indicator, limits initial viewport to prevent rendering lag (leverages existing virtual scrolling from feature)
  
- How does system handle **compressed MusicXML (.mxl files)** vs uncompressed (.musicxml/.xml)?
  → System detects file extension and decompresses .mxl files before parsing (MusicXML standard supports both formats)
  
- What happens when **timing divisions** in MusicXML differ from system's 960 PPQ?
  → System converts source divisions to 960 PPQ using fractional arithmetic to preserve exact timing relationships
  
- How does system handle **note durations** not expressible exactly in 960 PPQ (e.g., triplets in certain contexts)?
  → System rounds to nearest tick while maintaining total measure duration, logs precision warning if rounding exceeds 1 tick

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse valid MusicXML 3.1 or 4.0 files exported by MuseScore 3.x and 4.x
- **FR-002**: System MUST extract note data including pitch (MIDI number), start time, and duration from MusicXML `<note>` elements
- **FR-003**: System MUST convert MusicXML timing divisions to musicore's 960 PPQ format with sub-tick precision
- **FR-004**: System MUST extract tempo markings from MusicXML `<sound tempo>` elements and create TempoEvent objects
- **FR-005**: System MUST extract time signatures from MusicXML `<time>` elements and create TimeSignatureEvent objects  
- **FR-006**: System MUST extract clef types from MusicXML `<clef>` elements and map to musicore ClefType enum (Treble/Bass/Alto/Tenor)
- **FR-007**: System MUST extract key signatures from MusicXML `<key>` elements and map to musicore KeySignature enum
- **FR-008**: System MUST create appropriate hierarchy: one Instrument per `<part>`, one Staff per `<staff>` within part, one Voice per `<voice>` within staff
- **FR-009**: System MUST assign unique UUIDs to all created entities (Score, Instrument, Staff, Voice, Note)
- **FR-010**: System MUST validate imported score against musicore domain rules (no overlapping notes in same voice, valid MIDI pitches 0-127, valid BPM 20-400)
- **FR-011**: System MUST provide clear error messages for malformed XML, invalid MusicXML structure, or unsupported features
- **FR-012**: System MUST support both uncompressed (.musicxml, .xml) and compressed (.mxl) MusicXML formats
- **FR-013**: Users MUST be able to trigger import via "Import MusicXML" button in the UI that opens a file picker
- **FR-014**: System MUST display import progress for large files (>100KB or >500 notes)
- **FR-015**: System MUST render imported score in the staff notation view after successful import
- **FR-016**: System MUST preserve measure numbers from MusicXML `<measure>` elements for user reference
- **FR-017**: System MUST handle multi-staff instruments (e.g., piano grand staff) by creating multiple Staff entities under one Instrument

### Key Entities

- **MusicXMLDocument**: Represents the parsed XML structure with access to parts, measures, and musical elements
- **ImportedScore**: The converted musicore Score entity with all hierarchical data (Instruments → Staves → Voices → Notes)
- **TimingConverter**: Utility for converting MusicXML divisions to 960 PPQ ticks
- **ElementMapper**: Service that maps MusicXML elements (`<note>`, `<clef>`, `<key>`, etc.) to musicore domain types
- **ImportResult**: Contains either success (Score entity) or failure (error messages with line numbers)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully import 95% of MusicXML files exported from MuseScore 3.x and 4.x without errors
- **SC-002**: Import process completes in under 3 seconds for scores with up to 500 notes
- **SC-003**: Timing accuracy is maintained within ±1 tick (1/960th of a quarter note) for 99% of notes after conversion
- **SC-004**: All notes from source MusicXML appear in the imported score (100% note preservation)
- **SC-005**: Users can immediately play imported scores using existing playback feature (feature 003) without additional configuration
- **SC-006**: Error messages for invalid files are clear enough that 80% of users understand the issue without support
- **SC-007**: Multi-staff piano scores import with correct staff separation (95% accuracy for standard grand staff layouts)
- **SC-008**: System handles scores up to 100 measures or 2000 notes without performance degradation

## Assumptions *(documented for transparency)*

- **MusicXML Version**: Targeting MusicXML 3.1 and 4.0 (current standards supported by MuseScore 3.x and 4.x)
- **Error Strategy**: Import is "best effort" - system imports what it can and warns about unsupported elements rather than failing completely
- **File Size**: Typical MuseScore exports are <1MB; implementation will warn/confirm for files >5MB
- **Encoding**: UTF-8 assumed for all text content (instrument names, titles, etc.)
- **Division Conversion**: Source division values will be converted using rational arithmetic to avoid floating-point precision loss
- **Voice Assignment**: Notes without explicit `<voice>` element in MusicXML will be assigned to voice 1 by default
- **Default Values**: 
  - Missing tempo defaults to 120 BPM (MuseScore default)
  - Missing time signature defaults to 4/4
  - Missing clef inferred from instrument type (treble for melody instruments, bass for bass/cello)
  - Missing key signature defaults to C Major / A Minor

## Out of Scope *(deferred to future features)*

- **Lyrics and Text**: Text elements, lyrics, chord symbols (beyond existing feature 005 detection) - will be ignored during import
- **Articulations**: Staccato, accent, fermata markings - notes will import but visual articulations ignored
- **Dynamics**: Volume markings (pp, ff, crescendo) - will be ignored (playback uses fixed velocity)
- **Ornaments**: Trills, mordents, grace notes - will be ignored or converted to simple notes
- **Slurs and Ties**: Visual curve elements - ties will affect note duration but slurs ignored
- **Guitar Tablature**: TAB notation - will be skipped
- **Percussion Notation**: Drum set notation with special noteheads - will import as standard notes
- **Repeats and Codas**: Navigation marks - import will "unroll" repeated sections
- **Multiple Movements**: Scores with separate movements - will import as single continuous score
- **Custom Fonts or Symbols**: Non-standard notation symbols - will use default rendering
- **Layout and Spacing**: Page breaks, system breaks, custom spacing - musicore will apply its own layout
- **Export Back to MusicXML**: One-way import only (export is a separate future feature)
