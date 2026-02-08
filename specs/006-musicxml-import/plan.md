# Implementation Plan: MusicXML Import from MuseScore

**Branch**: `006-musicxml-import` | **Date**: 2026-02-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-musicxml-import/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to import MusicXML files exported by MuseScore 3.x/4.x into musicore by parsing the XML structure, converting timing divisions to 960 PPQ, extracting musical elements (notes, clefs, key signatures, time signatures, tempo), mapping MusicXML hierarchy (parts/staves/voices) to musicore domain model (Instruments/Staves/Voices), validating against domain rules, and displaying the imported score in the staff notation view. Supports both uncompressed (.musicxml, .xml) and compressed (.mxl) formats with best-effort import strategy and clear error reporting.

## Technical Context

**Language/Version**: Rust 1.82+ (backend/parsing engine), TypeScript 5.9 (frontend UI)  
**Primary Dependencies**: quick-xml or roxmltree (Rust XML parsing), zip crate (Rust .mxl decompression), React 19, Axum web framework  
**Storage**: In-memory repository (existing), file system for uploaded MusicXML files (temporary)  
**Testing**: cargo test (backend unit/integration tests), Vitest (frontend component tests), contract tests for API endpoint  
**Target Platform**: Web browser (Chrome, Firefox, Safari), Docker containerized deployment, CLI tool (new)
**Project Type**: Web application (frontend React + backend Rust API) + CLI tool  
**Performance Goals**: Import completes in <3 seconds for 500 notes (SC-002); 95% import success rate (SC-001); ±1 tick timing accuracy (SC-003)  
**Constraints**: 960 PPQ precision preserved (constitution principle IV); no overlapping notes in voices; MIDI pitch range 0-127; BPM range 20-400  
**Scale/Scope**: Support scores up to 100 measures or 2000 notes without degradation (SC-008); handle files up to 5MB; support 4+ instruments (ensemble/orchestral)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅
- **Ubiquitous Language**: Uses MusicXML domain terms (part, measure, division, voice) mapped to musicore domain (Instrument, Staff, Voice, tick)
- **Entity Modeling**: MusicXML elements converted to domain entities (Score, Instrument, Staff, Voice, Note, TempoEvent, etc.)
- **Aggregate Root**: Score remains aggregate root; import creates new Score aggregate
- **Assessment**: PASS - Import service operates on domain entities using music terminology; no data structure leakage

### II. Hexagonal Architecture ✅
- **Core Domain**: MusicXML parsing and conversion logic isolated in domain service (no framework dependencies)
- **Ports**: New port `IMusicXMLImporter` defines interface for importing from external format
- **Adapters**: REST API endpoint (HTTP adapter), CLI tool (command-line adapter), file system access (infrastructure adapter)
- **Dependency Rule**: Domain conversion logic has zero external dependencies (pure Rust, only std library + XML parser)
- **Assessment**: PASS - Clear separation between parsing (infrastructure), conversion (domain), and API/CLI (adapters)

### III. API-First Development ✅
- **Backend API**: New REST endpoint `POST /api/v1/scores/import-musicxml` receives file data, returns Score entity
- **Frontend Integration**: React component uploads file via API, receives Score JSON, loads into notation view
- **CLI Integration**: Command-line tool calls same domain service as API (shared conversion logic)
- **Contract Tests**: API contract validated before implementation (multipart/form-data upload, Score JSON response)
- **Assessment**: PASS - API-first approach with contract-driven development; CLI and frontend share backend logic

### IV. Precision & Fidelity ✅
- **960 PPQ Conversion**: MusicXML division values converted using rational arithmetic (Fraction struct) to avoid floating-point errors
- **Integer Timing**: All tick calculations remain integer-based; rounding only as last resort with precision warnings
- **Validation**: Imported scores validated against domain rules (note overlaps, pitch ranges, BPM ranges)
- **Assessment**: PASS - Maintains 960 PPQ immutability; uses rational math for division conversion; logs precision warnings

### V. Test-First Development ✅
- **Test Strategy**: Write parser tests before implementation (valid MusicXML samples → expected Score entities)
- **Domain Tests**: Conversion logic tested in isolation (XML elements → domain types)
- **Integration Tests**: Full import workflow tested (file upload → parsing → conversion → validation → response)
- **Contract Tests**: API endpoint contract validated (request/response schemas)
- **CLI Tests**: Command-line tool tested with sample files
- **Assessment**: PASS - TDD workflow with multiple test layers; highly testable pure functions

**GATE STATUS**: ✅ PASS - All principles satisfied. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-musicxml-import/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── import-musicxml.md  # POST /api/v1/scores/import-musicxml endpoint
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/
│   │   ├── score.rs          # Existing Score aggregate
│   │   ├── events/           # Existing event types
│   │   ├── (new) importers/  # Import domain services
│   │   │   ├── mod.rs
│   │   │   ├── musicxml/     # MusicXML import implementation
│   │   │   │   ├── mod.rs
│   │   │   │   ├── parser.rs         # XML parsing logic
│   │   │   │   ├── converter.rs      # MusicXML → domain conversion
│   │   │   │   ├── timing.rs         # Division → 960 PPQ conversion
│   │   │   │   ├── elements.rs       # Element mappers (note, clef, key, etc.)
│   │   │   │   └── validator.rs      # Post-import validation
│   │   │   └── errors.rs              # Import-specific errors
│   ├── adapters/
│   │   ├── api/
│   │   │   ├── routes.rs     # Existing + new import endpoint
│   │   │   └── (new) multipart.rs    # Multipart form-data handler
│   │   └── (new) cli/        # CLI adapter
│   │       ├── mod.rs
│   │       └── commands.rs   # Import command implementation
│   ├── ports/
│   │   └── (new) importers.rs        # IMusicXMLImporter trait
│   ├── bin/
│   │   └── (new) musicore-import.rs  # CLI binary entrypoint
│   └── lib.rs
└── tests/
    ├── fixtures/
    │   └── musicxml/         # Sample .musicxml test files
    │       ├── single-staff.musicxml
    │       ├── piano-grand-staff.musicxml
    │       ├── quartet.musicxml
    │       └── compressed.mxl
    ├── unit/
    │   └── musicxml_converter_test.rs
    └── integration/
        ├── musicxml_import_test.rs
        └── cli_import_test.rs

frontend/
├── src/
│   ├── components/
│   │   └── (new) ImportButton.tsx    # "Import MusicXML" button
│   ├── services/
│   │   └── (new) import/
│   │       └── MusicXMLImportService.ts  # Upload file to API
│   ├── hooks/
│   │   └── (new) useImportMusicXML.ts    # React hook for import flow
│   └── types/
│       └── (new) import.ts               # Import-related types
└── tests/
    └── integration/
        └── musicxml_import.test.tsx

scripts/
└── (new) import-musicxml.sh          # Wrapper script for CLI tool
```

**Structure Decision**: Web application (Option 2) + CLI tool. Backend-focused implementation with MusicXML parsing and conversion in Rust domain service following hexagonal architecture. Frontend provides file upload UI and displays imported score. CLI tool shares domain logic for command-line imports. Follows existing backend structure: domain logic in `src/domain/`, adapters in `src/adapters/`, ports define interfaces.

## Complexity Tracking

*No constitution violations - table not needed.*

---

## Planning Phase Summary

### Phase 0: Research ⏳ PENDING

**Tasks to Complete**:
1. Research MusicXML 3.1/4.0 specification structure (part/measure/attributes/note elements)
2. Compare Rust XML parsing libraries (quick-xml vs roxmltree vs xml-rs) - performance, API ergonomics, MusicXML compatibility
3. Research timing division conversion algorithms (rational arithmetic, GCD-based normalization to 960 PPQ)
4. Research .mxl compressed format handling (ZIP container structure, manifest.xml, META-INF/)
5. Research MusicXML element mapping strategies (clef/key signature/time signature to musicore enums)

**Expected Artifacts**:
- `research.md` with technical decisions for each research task
- Library selection rationale (XML parser, compression handler)
- Timing conversion algorithm specification
- Element mapping tables (MusicXML ClefSign → musicore ClefType, etc.)

**Key Decisions to Make**:
- XML parsing library selection (quick-xml recommended for performance)
- Compressed file handling approach (zip crate, extract to temp dir vs in-memory)
- Timing conversion precision strategy (Fraction struct for rational arithmetic)
- Error handling strategy (best-effort import with warnings vs strict validation)
- Performance optimization approach (streaming parser vs DOM)

### Phase 1: Design & Contracts 🔲 NOT STARTED

**Artifacts to Generate**:
- `data-model.md` - Type definitions for MusicXML import system
- `quickstart.md` - Development workflow and testing guide
- `contracts/import-musicxml.md` - API endpoint specification

**Data Model to Define**:
- `MusicXMLDocument`: Parsed XML structure
- `PartData`: Intermediate representation of MusicXML `<part>`
- `MeasureData`: Intermediate representation of MusicXML `<measure>`
- `TimingContext`: Track current tick position, divisions per quarter note, accumulated duration
- `ElementMapper`: Service for mapping MusicXML elements to domain types
- `ImportResult<T>`: Result type containing either imported Score or detailed error messages
- `ImportError`: Error types (ParseError, ConversionError, ValidationError)

**Services to Define**:
- `IMusicXMLParser`: Parse XML string/bytes to MusicXMLDocument
- `IMusicXMLConverter`: Convert MusicXMLDocument to Score domain entity
- `ITimingConverter`: Convert MusicXML divisions to 960 PPQ ticks
- `IElementMapper`: Map individual XML elements (note, clef, key, time signature) to domain types
- `ICompressionHandler`: Decompress .mxl files to XML content

**API Contracts to Document**:
- `POST /api/v1/scores/import-musicxml`
  - Request: multipart/form-data with file upload
  - Response: Score JSON (existing format) or error with line numbers
  - Status codes: 200 OK, 400 Bad Request (malformed XML), 413 Payload Too Large (>5MB)
- CLI tool interface: `musicore-import <file.musicxml> [--output score.json] [--validate-only]`

**Development Workflow**:
- 10-step implementation sequence (detailed in quickstart.md)
- TDD approach with test fixtures (sample MusicXML files from MuseScore exports)
- Performance testing with benchmarks (<3s for 500 notes target)
- Estimated timeline: 25-35 hours (4-5 days) + 2-3 days buffer for edge cases

**Constitution Re-Check**: (After Phase 1 design complete)
- Verify all 5 principles still satisfied
- Check for any new dependencies introduced
- Validate hexagonal boundaries maintained
- Confirm TDD workflow preserved

### Agent Context Update ✅ COMPLETE

Updated `.github/agents/copilot-instructions.md` with:
- Language: Rust 1.82+ (backend/parsing engine), TypeScript 5.9 (frontend UI)
- Framework: quick-xml or roxmltree (Rust XML parsing), zip crate (Rust .mxl decompression), React 19, Axum web framework
- Database: In-memory repository (existing), file system for uploaded MusicXML files (temporary)
- Project type: Web application (frontend React + backend Rust API) + CLI tool
- Testing: cargo test, Vitest, contract tests

**Command used**: `.specify/scripts/bash/update-agent-context.sh copilot`

---

## Next Steps

**Current Status**: ✅ Phase 0 (Research) and Phase 1 (Design) complete. Ready for task breakdown.

**What's Been Completed**:
1. ✅ Phase 0 research tasks completed → [research.md](research.md)
   - XML parser selected: quick-xml
   - Compression library: zip crate
   - Timing conversion algorithm: Rational arithmetic with Fraction struct
   - Element mapping strategy: Match statements with const tables
   - MusicXML structure analysis complete
2. ✅ Phase 1 design artifacts generated:
   - ✅ [data-model.md](data-model.md) - All types defined
   - ✅ [contracts/api-import-musicxml.md](contracts/api-import-musicxml.md) - REST API specification
   - ✅ [contracts/cli-import.md](contracts/cli-import.md) - CLI tool specification
   - ✅ [quickstart.md](quickstart.md) - Complete development workflow
3. ✅ Agent context updated with new technologies
4. ✅ Constitution re-checked after design (all 5 principles still pass)

**Recommended Next Actions**:
1. **Run `/speckit.tasks`** - Generate granular task breakdown from plan
2. **Start Phase 2** - Begin implementation following TDD workflow in quickstart.md
3. **Create test fixtures** - Export sample MusicXML files from MuseScore (simple_melody, piano_grand_staff, quartet)
4. **Setup backend dependencies** - Update backend/Cargo.toml with quick-xml and zip crates
5. **Begin domain layer** - Start with timing.rs (Fraction struct), then mapper.rs, then parser.rs

**For Manual Execution** (optional deep dives):
- Review MusicXML 3.1 specification: https://www.w3.org/2021/06/musicxml40/
- Study quick-xml examples: https://docs.rs/quick-xml/
- Test MuseScore exports with different divisions values

---

## Implementation Readiness Checklist

- [x] Feature specification complete and validated ([spec.md](spec.md))
- [x] Technical research complete with decisions ([research.md](research.md))
- [x] Data model defined with types and services ([data-model.md](data-model.md))
- [x] Development workflow documented ([quickstart.md](quickstart.md))
- [x] API contracts documented ([contracts/api-import-musicxml.md](contracts/api-import-musicxml.md), [contracts/cli-import.md](contracts/cli-import.md))
- [x] Constitution compliance verified (all 5 principles pass - initial + post-design)
- [x] Agent context updated for implementation guidance
- [x] Project structure defined (web app + CLI, backend Rust conversion)
- [x] Task breakdown generated → [tasks.md](tasks.md) (123 tasks organized by user story)
- [ ] Implementation started (`/speckit.implement` - after tasks)

**Status**: ✅ Phase 0 (Research) and Phase 1 (Design) complete. Ready for `/speckit.tasks`.

**Branch**: `006-musicxml-import` (checked out)  
**Spec Directory**: `/Users/alvaro.delcastillo/devel/sdd/musicore/specs/006-musicxml-import/`  
**Plan File**: This file (`plan.md`)

---

## Post-Design Constitution Re-Check ✅ PASS

All 5 constitutional principles re-validated after completing research and design phases:

### I. Domain-Driven Design ✅ PASS
- Music terminology preserved: MusicXMLDocument, PartData, MeasureData, NoteData, TimingContext
- Entity modeling follows hierarchy: Instrument → Staff → Voice → NoteEvent
- Domain validation enforced via Score.validate()
- **Verdict**: Strong domain focus maintained

### II. Hexagonal Architecture ✅ PASS
- Domain isolated in `backend/src/domain/importers/musicxml/`
- Port defined: `IMusicXMLImporter` trait
- Adapters separated: API (`adapters/api/import.rs`), CLI (`bin/musicore-import.rs`)
- No framework coupling in domain layer
- **Verdict**: Clean hexagonal separation

### III. API-First Development ✅ PASS
- Contracts written before implementation (API + CLI)
- Consistent `ImportResult` schema across adapters
- Clear error codes documented (400, 413, 422, 500)
- Contract tests defined in quickstart
- **Verdict**: Contract-first approach followed

### IV. Precision & Fidelity ✅ PASS
- 960 PPQ conversion via rational arithmetic (Fraction struct)
- Integer arithmetic only, no floating-point
- Rounding tracked with warnings
- ±1 tick accuracy for 99% of notes (SC-003)
- **Verdict**: Timing precision preserved

### V. Test-First Development ✅ PASS
- TDD workflow mandated in quickstart
- Unit tests per module (timing.rs, mapper.rs, parser.rs, converter.rs)
- Integration tests with MusicXML fixtures
- Contract tests for API endpoint
- Performance benchmarks for SC-002 validation
- **Verdict**: Comprehensive TDD approach

**Conclusion**: ✅ All constitutional principles satisfied. No violations introduced. Feature ready for implementation.
