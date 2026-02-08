# Tasks: MusicXML Import from MuseScore

**Feature**: 006-musicxml-import  
**Branch**: `006-musicxml-import`  
**Input**: Design documents from `/specs/006-musicxml-import/`

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Setup and Foundational phases have NO story labels
- Polish phase has NO story labels

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Configure dependencies and create directory structure

**Estimated Time**: 30 minutes

- [X] T001 Add dependencies to backend/Cargo.toml (quick-xml 0.31, zip 0.6, thiserror 1.0, uuid 1.0, tempfile 3.8)
- [X] T002 [P] Create backend directory structure: backend/src/domain/importers/musicxml/ with mod.rs
- [X] T003 [P] Create backend adapters directories: backend/src/adapters/cli/ and backend/src/bin/
- [X] T004 [P] Create backend/src/ports/importers.rs file for IMusicXMLImporter trait
- [X] T005 [P] Create tests/fixtures/musicxml/ directory for test files
- [X] T006 [P] Create frontend directory structure: frontend/src/components/import/, frontend/src/services/import/, frontend/src/hooks/
- [X] T007 Export test fixtures from MuseScore: simple_melody.musicxml (24 notes, single staff), piano_grand_staff.musicxml (2 staves), quartet.mxl (4 instruments, compressed)
- [X] T008 [P] Create malformed.xml test fixture for error testing

**Checkpoint**: Dependencies installed, directories created, test fixtures ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**Estimated Time**: 6-8 hours

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Error Types & Data Structures

- [X] T009 [P] Define ImportError enum in backend/src/domain/importers/musicxml/errors.rs (FileReadError, ParseError, InvalidStructure, MappingError, ConversionError, ValidationError)
- [X] T010 [P] Define MappingError enum in backend/src/domain/importers/musicxml/errors.rs (UnsupportedClef, InvalidPitchStep, PitchOutOfRange)
- [X] T011 [P] Define ConversionError enum in backend/src/domain/importers/musicxml/errors.rs (InvalidDivisions, TickOverflow)
- [X] T012 [P] Define MusicXMLDocument struct in backend/src/domain/importers/musicxml/types.rs (version, encoding, parts, default_tempo)
- [X] T013 [P] Define PartData, MeasureData, AttributesData structs in backend/src/domain/importers/musicxml/types.rs
- [X] T014 [P] Define NoteData, PitchData, RestData structs in backend/src/domain/importers/musicxml/types.rs

### Timing Conversion (Critical for All Stories)

- [X] T015 Write unit test for Fraction::from_musicxml with 480 divisions quarter note in backend/src/domain/importers/musicxml/timing.rs
- [X] T016 Write unit test for Fraction::from_musicxml with 768 divisions triplet eighth in backend/src/domain/importers/musicxml/timing.rs
- [X] T017 Implement Fraction struct with numerator/denominator fields in backend/src/domain/importers/musicxml/timing.rs
- [X] T018 Implement Fraction::from_musicxml(duration, source_divisions) method with 960 PPQ calculation in backend/src/domain/importers/musicxml/timing.rs
- [X] T019 Implement Fraction::normalize() method with GCD algorithm in backend/src/domain/importers/musicxml/timing.rs
- [X] T020 Implement Fraction::to_ticks() method with rounding in backend/src/domain/importers/musicxml/timing.rs
- [X] T021 Implement gcd(a, b) helper function in backend/src/domain/importers/musicxml/timing.rs

### Element Mapping (Critical for All Stories)

- [X] T022 Write unit test for ElementMapper::map_clef("G", 2) → Treble in backend/src/domain/importers/musicxml/mapper.rs
- [X] T023 Write unit test for ElementMapper::map_pitch('C', 4, 0) → MIDI 60 in backend/src/domain/importers/musicxml/mapper.rs
- [X] T024 Write unit test for ElementMapper::map_pitch('C', 4, 1) → MIDI 61 (C#) in backend/src/domain/importers/musicxml/mapper.rs
- [X] T025 Implement ElementMapper struct in backend/src/domain/importers/musicxml/mapper.rs
- [X] T026 Implement ElementMapper::map_clef(sign, line) with match statements for Treble/Bass/Alto/Tenor in backend/src/domain/importers/musicxml/mapper.rs
- [X] T027 Implement ElementMapper::map_pitch(step, octave, alter) with MIDI calculation in backend/src/domain/importers/musicxml/mapper.rs
- [X] T028 Implement ElementMapper::map_key(fifths, mode) with KeySignature mapping in backend/src/domain/importers/musicxml/mapper.rs
- [X] T029 Implement ElementMapper::infer_clef_from_instrument(name) with default fallback logic in backend/src/domain/importers/musicxml/mapper.rs

### Compression Handling (Critical for .mxl Support)

- [X] T030 Implement CompressionHandler::load_content(path) in backend/src/domain/importers/musicxml/compression.rs with file extension detection
- [X] T031 Implement CompressionHandler::load_compressed(path) using zip crate in backend/src/domain/importers/musicxml/compression.rs
- [X] T032 Implement CompressionHandler::load_uncompressed(path) with fs::read_to_string in backend/src/domain/importers/musicxml/compression.rs
- [X] T033 Implement CompressionHandler::read_container_manifest(archive) to parse META-INF/container.xml in backend/src/domain/importers/musicxml/compression.rs

**Checkpoint**: Foundation ready - timing conversion, element mapping, compression handling complete. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Import Basic Single-Staff Score (Priority: P1) 🎯 MVP

**Goal**: Enable users to import simple MusicXML files with one staff and see notes displayed in notation view

**Independent Test**: Export C Major scale from MuseScore as MusicXML, import it, verify 8 notes appear at correct pitches with proper timing

**Estimated Time**: 10-12 hours

### XML Parser for User Story 1

- [X] T034 Write integration test: parse simple_melody.musicxml → MusicXMLDocument with 1 part in backend/tests/integration/musicxml_import_test.rs
- [X] T035 [US1] Implement MusicXMLParser struct in backend/src/domain/importers/musicxml/parser.rs
- [X] T036 [US1] Implement MusicXMLParser::parse(xml_content) with quick-xml Reader initialization in backend/src/domain/importers/musicxml/parser.rs
- [X] T037 [US1] Implement parse_score_partwise() to extract <part-list> and <part> elements in backend/src/domain/importers/musicxml/parser.rs
- [X] T038 [US1] Implement parse_part(part_id) to extract measures from <measure> elements in backend/src/domain/importers/musicxml/parser.rs
- [X] T039 [US1] Implement parse_measure() to extract <attributes> and <note> elements in backend/src/domain/importers/musicxml/parser.rs
- [X] T040 [US1]Implement parse_attributes() to extract divisions, key, time, clef, tempo in backend/src/domain/importers/musicxml/parser.rs
- [X] T041 [US1] Implement parse_note() to extract pitch, duration, voice, staff in backend/src/domain/importers/musicxml/parser.rs

### Converter for User Story 1

- [X] T042 Write unit test: convert MusicXMLDocument with 1 part → Score with 1 Instrument in backend/src/domain/importers/musicxml/converter.rs
- [X] T043 [US1] Implement MusicXMLConverter struct in backend/src/domain/importers/musicxml/converter.rs
- [X] T044 [US1] Implement MusicXMLConverter::convert(doc) returning ImportResult in backend/src/domain/importers/musicxml/converter.rs
- [X] T045 [US1] Implement convert_part(part_data) → Instrument with UUID generation in backend/src/domain/importers/musicxml/converter.rs
- [X] T046 [US1] Implement convert_staff_for_single_staff(part) → Staff with clef mapping in backend/src/domain/importers/musicxml/converter.rs
- [X] T047 [US1] Implement convert_voice(measures) → Voice with note events in backend/src/domain/importers/musicxml/converter.rs
- [X] T048 [US1] Implement convert_note(note_data, timing_context) → NoteEvent with MIDI and tick conversion in backend/src/domain/importers/musicxml/converter.rs
- [X] T049 [US1] Implement convert_attributes() to create TempoEvent, TimeSignatureEvent, KeySignatureEvent, ClefEvent in backend/src/domain/importers/musicxml/converter.rs
- [X] T050 [US1] Add domain validation call to Score::validate() after conversion in backend/src/domain/importers/musicxml/converter.rs

### Port & Domain Service for User Story 1

- [X] T051 [US1] Define IMusicXMLImporter trait with import_file(&Path) and import_content(&str) methods in backend/src/ports/importers.rs
- [X] T052 [US1] Implement MusicXMLImporter struct in backend/src/domain/importers/musicxml/mod.rs
- [X] T053 [US1] Implement MusicXMLImporter::import_file(path) using CompressionHandler + Parser + Converter in backend/src/domain/importers/musicxml/mod.rs
- [X] T054 [US1] Implement MusicXMLImporter::import_content(xml_string) for API usage in backend/src/domain/importers/musicxml/mod.rs
- [X] T055 [US1] Add ImportResult, ImportMetadata, ImportStatistics, ImportWarning types in backend/src/ports/importers.rs

### API Adapter for User Story 1

- [X] T056 Write contract test: POST /api/v1/scores/import-musicxml with multipart form-data → 200 OK with Score JSON in backend/tests/integration/api_import_test.rs
- [X] T057 [US1] Implement import_musicxml(multipart) handler in backend/src/adapters/api/import.rs
- [X] T058 [US1] Extract file bytes from multipart form field "file" in backend/src/adapters/api/import.rs
- [X] T059 [US1] Call MusicXMLImporter::import_content() and return Json<ImportResult> in backend/src/adapters/api/import.rs
- [X] T060 [US1] Handle errors and return appropriate HTTP status codes (400, 413, 422, 500) in backend/src/adapters/api/import.rs
- [X] T061 [US1] Register POST /api/v1/scores/import-musicxml route in backend/src/adapters/api/routes.rs

### CLI Adapter for User Story 1

- [X] T062 [US1] Create musicore-import binary with clap CLI parser in backend/src/bin/musicore-import.rs
- [X] T063 [US1] Define Cli struct with file, output, validate_only, quiet, verbose, format fields in backend/src/bin/musicore-import.rs
- [X] T064 [US1] Implement main() to parse args and call MusicXMLImporter::import_file() in backend/src/bin/musicore-import.rs
- [X] T065 [US1] Output ImportResult as JSON/YAML to stdout or file based on --output flag in backend/src/bin/musicore-import.rs
- [X] T066 [US1] Implement --validate-only mode with human-readable output in backend/src/bin/musiccore-import.rs
- [X] T067 [US1] Configure logging based on --quiet, --verbose flags in backend/src/bin/musicore-import.rs

### Frontend Components for User Story 1

- [X] T068 [US1] Implement MusicXMLImportService class with importFile(file) method in frontend/src/services/import/MusicXMLImportService.ts
- [X] T069 [US1] Create fetch POST request with FormData to /api/v1/scores/import-musicxml in frontend/src/services/import/MusicXMLImportService.ts
- [X] T070 [US1] Implement useImportMusicXML hook with loading, error, result state in frontend/src/hooks/useImportMusicXML.ts
- [X] T071 [US1] Implement ImportButton component with file input and upload button in frontend/src/components/import/ImportButton.tsx
- [X] T072 [US1] Add file picker with .musicxml, .xml, .mxl accept filter in frontend/src/components/import/ImportButton.tsx
- [X] T073 [US1] Display loading state and error messages in frontend/src/components/import/ImportButton.tsx
- [X] T074 [US1] Call onImportComplete callback with ImportResult on success in frontend/src/components/import/ImportButton.tsx

### Integration Tests for User Story 1

- [X] T075 Write test: Import simple_melody.musicxml → verify 8 notes, 1 instrument in backend/tests/integration/musicxml_import_test.rs
- [X] T076 Write test: Import malformed.xml → verify ParseError with line number in backend/tests/integration/musicxml_import_test.rs
- [X] T077 Write test: Import .mxl compressed file → verify decompression works in backend/tests/integration/musicxml_import_test.rs
- [X] T078 Write test: CLI musicore-import simple_melody.musicxml → verify JSON output in backend/tests/integration/cli_import_test.sh
- [X] T079 Write frontend test: ImportButton renders and handles file selection in frontend/src/components/import/ImportButton.test.tsx

**Checkpoint**: User Story 1 complete and independently testable. Users can import single-staff scores via UI and CLI.

---

## Phase 4: User Story 2 - Import Multi-Staff Piano Score (Priority: P2)

**Goal**: Enable users to import piano scores with grand staff (treble + bass) and see both staves rendered correctly

**Independent Test**: Export simple piano piece (both hands) from MuseScore, import it, verify both staves appear with correct clefs and note distribution

**Estimated Time**: 4-6 hours

### Multi-Staff Logic

- [X] T080 Write unit test: PartData with staff_count=2 → Instrument with 2 staves in backend/src/domain/importers/musicxml/converter.rs
- [X] T081 [US2] Modify convert_part() to check staff_count and handle multi-staff instruments in backend/src/domain/importers/musicxml/converter.rs
- [X] T082 [US2] Implement convert_staves(part) to create multiple Staff entities in backend/src/domain/importers/musicxml/converter.rs
- [X] T083 [US2] Modify parse_note() to extract <staff> element (staff number 1-indexed) in backend/src/domain/importers/musicxml/parser.rs
- [X] T084 [US2] Implement staff assignment logic: group notes by staff number in backend/src/domain/importers/musicxml/converter.rs
- [X] T085 [US2] Map clefs per staff: parse multiple <clef> elements with staff attribute in backend/src/domain/importers/musicxml/parser.rs
- [X] T086 [US2] Ensure each staff gets correct clef (treble for staff 1, bass for staff 2 in grand staff) in backend/src/domain/importers/musicxml/converter.rs

### Integration Tests for User Story 2

- [X] T087 Write test: Import piano_grand_staff.musicxml → verify 1 instrument with 2 staves in backend/tests/integration/musicxml_import_test.rs
- [X] T088 Write test: Verify treble clef on staff 1, bass clef on staff 2 in backend/tests/integration/musicxml_import_test.rs
- [X] T089 Write test: Verify notes in different staves are separated correctly in backend/tests/integration/musicxml_import_test.rs

**Checkpoint**: User Story 2 complete. Users can import piano scores with grand staff notation.

---

## Phase 5: User Story 3 - Import Score with Multiple Instruments (Priority: P3)

**Goal**: Enable users to import ensemble scores (quartet, orchestra) and see all instruments as separate staves

**Independent Test**: Export 3-instrument score from MuseScore, import it, verify all three instruments appear with correct names

**Estimated Time**: 3-4 hours

### Multi-Instrument Logic

- [ ] T090 Write unit test: MusicXMLDocument with 4 parts → Score with 4 Instruments in backend/src/domain/importers/musicxml/converter.rs
- [ ] T091 [US3] Modify MusicXMLConverter::convert() to iterate over all parts and create multiple Instruments in backend/src/domain/importers/musicxml/converter.rs
- [ ] T092 [US3] Extract part names from <score-part><part-name> in parser and assign to Instrument.name in backend/src/domain/importers/musicxml/parser.rs
- [ ] T093 [US3] Ensure each instrument gets its own key signature if <key> elements differ per part in backend/src/domain/importers/musicxml/converter.rs
- [ ] T094 [US3] Ensure each instrument gets its own clef based on <clef> elements in backend/src/domain/importers/musicxml/converter.rs

### Integration Tests for User Story 3

- [ ] T095 Write test: Import quartet.mxl (4 instruments) → verify 4 Instruments with correct names in backend/tests/integration/musicxml_import_test.rs
- [ ] T096 Write test: Verify each instrument has correct clef (Violin=Treble, Viola=Alto, Cello=Bass) in backend/tests/integration/musicxml_import_test.rs
- [ ] T097 Write test: Verify instrument-specific key signatures are preserved in backend/tests/integration/musicxml_import_test.rs

**Checkpoint**: User Story 3 complete. Users can import multi-instrument ensemble scores.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, error handling, warnings, documentation

**Estimated Time**: 8-10 hours

### Performance & Benchmarking

- [ ] T098 Create benchmark for importing 500-note file using Criterion in backend/benches/musicxml_import.rs
- [ ] T099 Run benchmark and verify <3 seconds per SC-002 requirement
- [ ] T100 Add progress indicator for large files (>500 notes) with file size check in backend/src/domain/importers/musicxml/mod.rs
- [ ] T101 Optimize XML parsing: use quick-xml streaming events instead of building full DOM in backend/src/domain/importers/musicxml/parser.rs

### Warning System

- [ ] T102 [P] Implement TimingWarning enum (PrecisionLoss, UnsupportedDivisions) in backend/src/domain/importers/musicxml/warnings.rs
- [ ] T103 [P] Implement ImportWarning enum (UnsupportedElement, MissingAttribute, LargeFile) in backend/src/domain/importers/musicxml/warnings.rs
- [ ] T104 Add warning collection to TimingContext and ImportResult in backend/src/domain/importers/musicxml/timing.rs
- [ ] T105 Log precision loss warnings when Fraction::to_ticks() requires rounding in backend/src/domain/importers/musicxml/timing.rs
- [ ] T106 Log unsupported element warnings (lyrics, dynamics, etc.) during parsing in backend/src/domain/importers/musicxml/parser.rs
- [ ] T107 Display warnings in CLI output with --verbose flag in backend/src/bin/musicore-import.rs
- [ ] T108 Display warnings in frontend ImportButton component after successful import in frontend/src/components/import/ImportButton.tsx

### Error Handling Edge Cases

- [ ] T109 Write test: Import invalid file type (.pdf) → return UnsupportedFileType error in backend/tests/integration/musicxml_import_test.rs
- [ ] T110 Write test: Import file >10MB → return FileTooLarge error (413) in backend/tests/integration/api_import_test.rs
- [ ] T111 Write test: Import with missing <part-list> → return InvalidStructure error in backend/tests/integration/musicxml_import_test.rs
- [ ] T112 Implement file size validation in API adapter (max 10MB) in backend/src/adapters/api/import.rs
- [ ] T113 Implement detailed error messages with context (measure number, element type) in backend/src/domain/importers/musicxml/errors.rs

### Documentation

- [ ] T114 [P] Update CHANGELOG.md with feature 006 additions (API endpoint, CLI tool, supported formats)
- [ ] T115 [P] Update README.md with CLI usage examples (musicore-import --help, basic usage)
- [ ] T116 [P] Add API documentation for POST /api/v1/scores/import-musicxml endpoint to backend/docs/api.md
- [ ] T117 [P] Add inline code documentation (rustdoc) for all public functions in musicxml module
- [ ] T118 [P] Create user guide section in docs/ explaining MusicXML import workflow

### Final Validation

- [ ] T119 Run full test suite: cargo test (backend) + npm test (frontend)
- [ ] T120 Verify all 8 success criteria from spec.md are met (SC-001 through SC-008)
- [ ] T121 Manual test: Import 5 different MuseScore exports and verify 95% success rate (SC-001)
- [ ] T122 Manual test: Import and immediately playback score using feature 003 (SC-005)
- [ ] T123 Update plan.md with implementation notes and any deviations from original plan

**Checkpoint**: Feature complete - all user stories implemented, tested, documented, and validated against success criteria.

---

## Dependencies & Execution Strategy

### Dependency Graph (Story Completion Order)

```
Setup (Phase 1)
    ↓
Foundational (Phase 2) - BLOCKING
    ↓
    ├─→ User Story 1 (P1) - MVP          [Can implement independently after Foundation]
    │       ↓
    ├─→ User Story 2 (P2) - Piano        [Extends US1, adds multi-staff logic]
    │       ↓
    └─→ User Story 3 (P3) - Ensemble     [Extends US1/US2, adds multi-instrument logic]
            ↓
Polish (Phase 6) - Cross-cutting concerns
```

### Parallel Execution Opportunities

**Within Setup (Phase 1)**: Tasks T002-T006 can run in parallel (different directories)

**Within Foundational (Phase 2)**:
- T009-T014 (error types & data structures) - all parallel
- T015-T021 (timing conversion) - sequential TDD
- T022-T029 (element mapping) - sequential TDD after timing complete
- T030-T033 (compression) - parallel with other foundational work

**Within User Story 1 (Phase 3)**:
- T068-T074 (frontend) can start as soon as API contract is defined (after T056)
- T062-T067 (CLI) can start as soon as domain service is complete (after T053)

**Across User Stories**:
- US2 and US3 both depend on US1 foundation
- US2 (multi-staff) and US3 (multi-instrument) have minimal overlap, could be parallelized

**Within Polish (Phase 6)**:
- T098-T101 (performance) parallel with T102-T108 (warnings)
- T114-T118 (documentation) all parallel

### MVP Delivery Strategy

**Minimum Viable Product**: User Story 1 (P1) only
- Single-staff import covers 70% of beginner use cases
- Validates entire import pipeline (parsing, conversion, validation, rendering)
- Enables immediate user feedback

**Incremental Delivery**:
1. **Sprint 1** (Days 1-3): Setup + Foundational + US1 → Deploy MVP
2. **Sprint 2** (Days 4-5): US2 (Piano) → Deploy for piano users
3. **Sprint 3** (Days 6-7): US3 (Ensemble) → Full feature complete
4. **Sprint 4** (Days 8-9): Polish → Performance optimization and documentation

---

## Task Statistics

**Total Tasks**: 123 tasks

**By Phase**:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 25 tasks
- Phase 3 (User Story 1): 46 tasks
- Phase 4 (User Story 2): 10 tasks
- Phase 5 (User Story 3): 8 tasks
- Phase 6 (Polish): 26 tasks

**By User Story**:
- Setup/Foundation: 33 tasks (no story label)
- User Story 1 (P1): 46 tasks
- User Story 2 (P2): 10 tasks
- User Story 3 (P3): 8 tasks
- Polish: 26 tasks (no story label)

**Parallel Opportunities**: 28 tasks marked [P]

**Estimated Timeline**:
- Setup: 30 minutes
- Foundational: 6-8 hours
- User Story 1 (MVP): 10-12 hours
- User Story 2: 4-6 hours
- User Story 3: 3-4 hours
- Polish: 8-10 hours
- **Total**: 31-40 hours (5-6 working days + buffer)

---

## Implementation Notes

**TDD Workflow**: Tests must be written FIRST for T015-T021 (timing), T022-T029 (mapping), T034-T079 (US1 integration)

**File Paths**: All paths assume monorepo structure with `backend/` and `frontend/` directories at repository root

**Constitution Compliance**: All tasks follow hexagonal architecture (domain → ports → adapters), maintain 960 PPQ precision, and enforce TDD workflow

**Success Criteria Validation**: Tasks T119-T123 map directly to spec.md success criteria SC-001 through SC-008
