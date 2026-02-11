# Feature Specification: Resilient MusicXML Import

**Feature Branch**: `015-musicxml-error-handling`  
**Created**: 2026-02-11  
**Status**: Draft  
**Input**: User description: "Improve MusicXML importer so it imports scores with issues doing a best effort"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Files with Overlapping Notes (Priority: P1)

Musicians import real-world MusicXML files exported from notation software (MuseScore, Finale, Sibelius) that contain overlapping notes with the same pitch in a single voice. These files currently fail with "Domain validation failed" even though the musical content is valid and readable.

**Why this priority**: This is the most common import failure blocking users from viewing their existing sheet music. The Moonlight Sonata example demonstrates this issue - a well-known classical piece fails to import due to technical MusicXML representation details that don't affect musical readability.

**Independent Test**: Import "Moonlight sonata.mxl" from backend/music folder. System should successfully import the score, display all instruments and notes, and report warnings about note overlap resolution. User can view and play the score despite the MusicXML structural issues.

**Acceptance Scenarios**:

1. **Given** a MusicXML file with overlapping notes in the same voice, **When** user imports the file, **Then** system imports successfully, displays all instruments and notes, and shows warning message listing measures with overlap issues
2. **Given** overlapping notes with the same pitch, **When** importer encounters overlap, **Then** system splits notes into separate voices automatically and records this in warnings
3. **Given** a successfully imported file with warnings, **When** user views the import success message, **Then** message displays "Imported with N warnings - see details" with option to view warning list

---

### User Story 2 - Handle Missing Required Elements (Priority: P2)

Musicians import MusicXML files that lack required structural elements like tempo, time signature, or clef definitions. Current implementation may fail or produce incorrect default values.

**Why this priority**: Many MusicXML files omit explicit tempo markings or assume default clefs, causing import failures or incorrect notation display. This blocks imports from automated transcription tools and simplified notation software.

**Independent Test**: Create a test MusicXML file with missing time signature. Import should succeed using 4/4 default, display notes correctly, and report "Missing time signature - using 4/4" as warning.

**Acceptance Scenarios**:

1. **Given** a MusicXML file without explicit tempo marking, **When** user imports the file, **Then** system uses 120 BPM default, imports successfully, and warns "No tempo specified - using 120 BPM"
2. **Given** a staff without explicit clef definition, **When** system processes the staff, **Then** applies treble clef for high instruments and bass clef for low instruments based on pitch range, and records assumption in warnings
3. **Given** measures without time signature, **When** importer processes measures, **Then** uses 4/4 default for duration calculations and warns "Missing time signature - using 4/4"

---

### User Story 3 - Recover from Malformed XML (Priority: P2)

Musicians import MusicXML files with structural inconsistencies: invalid element nesting, missing closing tags, or non-standard XML encodings that cause XML parser failures.

**Why this priority**: Real-world MusicXML files often have minor XML structural issues that don't affect the musical content. Best-effort parsing prevents complete import failure from fixable issues.

**Independent Test**: Import a MusicXML file with an unclosed div tag in lyrics section. System should skip the malformed lyrics element, import all notes and other valid elements, and warn "Skipped malformed lyrics in measure 5".

**Acceptance Scenarios**:

1. **Given** a MusicXML file with invalid element nesting in lyrics, **When** parser encounters the error, **Then** skips the malformed element, continues parsing remaining content, and warns about skipped element with measure context
2. **Given** XML with unexpected character encoding, **When** parser attempts to read file, **Then** tries UTF-8, then ISO-8859-1, then Windows-1252 encodings, uses first successful encoding, and warns if non-UTF-8 encoding used
3. **Given** a part with missing measures in sequence (e.g., measures 1, 2, 4, 5), **When** converter processes the part, **Then** fills gaps with empty measures using last known time signature and warns "Missing measure 3 - inserted empty measure"

---

### User Story 4 - Import Partial Content on Critical Failures (Priority: P3)

Musicians import MusicXML files where one instrument or section has critical errors but other parts are valid. System saves successfully imported instruments rather than failing completely.

**Why this priority**: Large orchestral or multi-instrument scores may have issues in one part that shouldn't prevent viewing the rest of the score. Partial import provides value even when complete import isn't possible.

**Independent Test**: Import a score with 5 instruments where instrument 3 has corrupted measure data. System imports instruments 1, 2, 4, 5 successfully and warns "Failed to import instrument 3 (Violin II) - corrupted measure data in measure 47".

**Acceptance Scenarios**:

1. **Given** a multi-instrument score where one part has unparseable measure data, **When** importer processes the score, **Then** imports all valid instruments, skips the corrupted part, and reports "Skipped 1 of 5 instruments due to errors - see warnings"
2. **Given** an instrument with valid measures 1-20 but corrupted measures 21-25, **When** converter processes the instrument, **Then** imports measures 1-20, stops at corruption point, and warns "Instrument truncated at measure 20 - remaining measures unreadable"
3. **Given** a score where all instruments fail to import, **When** system attempts import, **Then** fails with clear error message listing specific issues found in each instrument

---

### User Story 5 - Provide Actionable Warning Messages (Priority: P3)

Musicians review warnings after importing files with issues and understand exactly what problems were found and where they occurred, enabling them to fix source files if needed.

**Why this priority**: Warnings are only useful if they help users understand and potentially fix issues. Clear, specific warning messages build user confidence and enable workflow improvements.

**Independent Test**: Import a file with 3 different issue types. Warning panel displays categorized list: "Note Overlaps (2 in measures 5, 12)", "Missing Elements (1 - no tempo)", "Structural Issues (1 - invalid lyrics in measure 8)".

**Acceptance Scenarios**:

1. **Given** multiple warnings of the same type, **When** system displays warnings, **Then** groups by category (Overlap, Missing Elements, Structural) with count and measure numbers
2. **Given** a warning about overlapping notes, **When** user views warning, **Then** message shows "Measure 5, Voice 1: Overlapping C4 quarter notes at tick 480 - split into 2 voices"
3. **Given** import with partial failures, **When** user views warnings, **Then** each warning includes severity level (Info, Warning, Error) and specific location (measure number, instrument name, staff number)

---

### Edge Cases

- What happens when every measure in an instrument has overlapping notes - does system create dozens of voices or enforce a maximum? *[Clarified: 4 voice maximum per staff, earlier notes kept]*
- How does system handle circular references in tied notes (note A tied to note B tied to note A)?
- What happens when duration calculations based on divisions result in non-integer tick values? *[Clarified: Round to nearest integer, warn if fractional part > 0.1]*
- How does system respond to MusicXML files larger than 10MB when warnings collection could consume significant memory?
- What happens when a voice has hundreds of overlapping notes at the same tick (e.g., from a corrupt transcription)?
- How does system handle conflicting time signatures in different parts at the same measure?
- What happens when note durations extend beyond measure boundaries based on time signature?
- How does system ensure deterministic behavior when auto-generating voice assignments for overlapping notes (e.g., which note goes to voice 2 vs voice 3)? *[Clarified: Assign by start tick with pitch tiebreaker]*
- What happens when importing the same file multiple times in sequence - does system produce identical results including voice assignments and default value applications? *[Clarified: Must be byte-identical per FR-016]*

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST attempt to import every MusicXML file and succeed if any valid musical content can be extracted
- **FR-002**: System MUST collect all warnings during import without failing the operation, including warning message, severity level, measure context, and affected element
- **FR-003**: System MUST handle overlapping notes by automatically splitting them into separate voices within the same staff when same-pitch notes overlap in a single voice, using deterministic voice assignment: earliest start tick to voice 1, next earliest to voice 2, etc., with pitch as tiebreaker for simultaneous starts (higher pitch to higher voice number)
- **FR-004**: System MUST limit automatic voice creation to 4 voices per staff maximum - notes beyond this limit are skipped with error warning, keeping first 4 voices by start tick (notes requiring voice 5+ are skipped)
- **FR-005**: System MUST apply sensible defaults for missing structural elements: 120 BPM for tempo, 4/4 for time signature, treble clef for high-range parts (calculated as mean MIDI pitch of all notes in staff, ignoring rests, using first 100 notes maximum; avg ≥ C4 = treble, avg < C4 = bass), bass clef for low-range parts
- **FR-006**: System MUST record every applied default in warnings with specific context about what was missing and what default was used
- **FR-007**: System MUST attempt to skip malformed XML elements and continue parsing remaining content rather than failing completely
- **FR-008**: System MUST try multiple text encodings (UTF-8, ISO-8859-1, Windows-1252) in sequence when XML parsing fails due to encoding issues, where encoding succeeds if XML parser completes without errors (try next encoding only if XML parsing fails)
- **FR-009**: System MUST fill missing measures in sequence with empty measures using last known time signature and record gaps in warnings
- **FR-010**: System MUST import partial content when individual instruments fail - successfully imported instruments are retained in final score
- **FR-011**: System MUST truncate instruments at point of corruption rather than failing entire instrument if initial measures are valid
- **FR-012**: System MUST group warnings by category (Overlap Resolution, Missing Elements, Structural Issues, Partial Import) in user displays
- **FR-013**: System MUST include measure number, instrument name, staff number, and voice number in every warning where applicable
- **FR-014**: System MUST report import statistics showing both successful content (X instruments, Y notes) and issues (Z warnings, W skipped elements)
- **FR-015**: System MUST fail import only when no valid musical content can be extracted, providing detailed error report listing all attempted recovery strategies
- **FR-016**: System MUST be deterministic - the same MusicXML file imported multiple times MUST produce identical compiled scores with identical voice assignments, default values, and warning messages
- **FR-017**: System MUST handle non-integer tick values from MusicXML duration calculations by rounding to nearest integer, and MUST warn if fractional part exceeds 0.1 ticks indicating potential timing accuracy issues

### Key Entities

- **ImportWarning**: Represents a non-fatal issue during import
  - severity: Info | Warning | Error (for partial failures)
  - category: OverlapResolution | MissingElements | StructuralIssues | PartialImport
  - message: Human-readable description
  - measure_number: Optional measure context
  - instrument_name: Optional instrument context
  - staff_number: Optional staff context
  - voice_number: Optional voice context

- **ImportResult**: Extended with warning information
  - score: Successfully imported Score
  - metadata: Import metadata (format, filename, etc.)
  - statistics: Includes warning_count, skipped_element_count in addition to existing note/instrument counts
  - warnings: Array of ImportWarning instances
  - partial_import: Boolean flag indicating if some content was skipped

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Moonlight Sonata.mxl (71KB, currently failing with "Domain validation failed") imports successfully displaying all 3 movements with notes visible and playable
- **SC-002**: System successfully imports at least 90% of real-world MusicXML files from popular notation software (MuseScore, Finale, Sibelius, Dorico) that contain structural issues
- **SC-003**: Import operations complete within 5 seconds for files up to 10MB, including warning collection and overlap resolution
- **SC-004**: Warning messages are clear enough that 80% of test users can identify the specific measure and issue type without technical knowledge
- **SC-005**: Partial import recovers at least 75% of content from corrupted multi-instrument scores where some parts have critical errors
- **SC-006**: Zero false negatives - system never rejects files that contain valid, displayable musical content
- **SC-007**: Users can successfully view and play imported scores with warnings - warnings do not prevent core functionality
- **SC-008**: Importing the same MusicXML file multiple times produces byte-identical score structures (same note IDs, voice assignments, tick positions, and applied defaults) verified through score serialization comparison

## Clarifications

### Session 2026-02-11

- Q: When overlapping notes with the same pitch need to be split into multiple voices, what deterministic rule should the system use to assign notes to voice 2, voice 3, etc.? → A: Assign by start tick (earliest notes go to voice 1, next earliest to voice 2, etc.) with pitch as tiebreaker for simultaneous starts (higher pitch to higher voice number)
- Q: How should the system calculate average pitch for clef inference when a staff has no explicit clef? → A: Calculate mean MIDI pitch of all notes in the staff, ignoring rests, using first 100 notes maximum to avoid performance issues
- Q: When a staff already has 4 voices and additional overlapping notes are encountered, which notes should be skipped? → A: Keep first 4 voices by start tick (skip notes that would require voice 5+), maintaining consistency with voice assignment algorithm
- Q: How should the system handle non-integer tick values resulting from MusicXML duration calculations? → A: Round to nearest integer, warn if fractional part exceeds 0.1 ticks (indicating potential timing accuracy issue)
- Q: What determines successful encoding detection when trying the encoding fallback sequence? → A: Encoding succeeds if XML parser completes without errors; try next encoding only if XML parsing fails
