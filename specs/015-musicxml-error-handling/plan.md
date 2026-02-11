# Implementation Plan: Resilient MusicXML Import

**Branch**: `015-musicxml-error-handling` | **Date**: 2026-02-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/015-musicxml-error-handling/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Improve MusicXML importer to handle real-world files with structural issues through best-effort parsing. Primary requirement: Import files with overlapping notes, missing elements, and malformed XML while maintaining deterministic behavior. Technical approach: Implement forgiving parser with automatic voice splitting, sensible defaults, warning collection, and partial import fallback—all while ensuring same input always produces identical output.

## Technical Context

**Language/Version**: Rust 1.93+ (backend/WASM), TypeScript 5.9+ (frontend)  
**Primary Dependencies**: quick-xml (XML parsing), wasm-bindgen (JS interop), serde (serialization), JSZip (frontend .mxl decompression)  
**Storage**: N/A (parser operates in-memory; storage handled by existing score persistence layer)  
**Testing**: cargo test (Rust integration tests), vitest (TypeScript component tests)  
**Target Platform**: Tablet devices (iPad/Surface/Android) via WASM in modern browsers (Chrome 57+, Safari 11+, Edge 16+)
**Project Type**: Web application (backend Rust + WASM, frontend React PWA)  
**Performance Goals**: MusicXML parsing <100ms for typical scores (≤1MB), offline-capable, deterministic (same input → same output)  
**Constraints**: 960 PPQ precision (integer arithmetic only), 4-voice limit per staff, 10MB file size maximum, <500KB WASM bundle gzipped  
**Scale/Scope**: Handle scores with 10,000+ events, import 90% of real-world MusicXML files with structural issues, process files up to 10MB within 5 seconds

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅ PASS

- **Ubiquitous Language**: Feature uses proper domain terminology (Voice, Staff, Instrument, Note, overlapping, voice splitting, measure, clef, tempo, time signature)
- **Domain Logic**: Error handling and voice splitting are domain behaviors in `domain/importers/musicxml/` module
- **Aggregate Boundary**: Score remains aggregate root; importer constructs valid Score instances with recovery strategies

**Validation**: Spec uses consistent music domain language throughout. Implementation enhances existing MusicXML importer domain logic.

### II. Hexagonal Architecture ✅ PASS

- **Core Domain**: Parser/converter logic stays in `domain/importers/musicxml/` (parser.rs, converter.rs, mapper.rs)
- **Port**: `IMusicXMLImporter` trait defines domain interface (existing)
- **Adapters**: WASM bindings (`adapters/wasm/bindings.rs`) expose parser via `parse_musicxml()` function
- **Dependency Flow**: Inward - importer depends only on domain entities (Score, Voice, Note), no framework coupling

**Validation**: Feature extends existing hexagonal importer without violating architecture. Error handling and warning collection are pure domain logic.

### III. Progressive Web Application Architecture ✅ PASS

- **WASM Deployment**: Enhanced parser compiles to WASM via wasm-pack, runs in-browser
- **Offline-First**: All error handling and recovery happens client-side - no network required
- **PWA Enhancement**: Improves import reliability for offline score loading (critical for practice/performance scenarios)
- **Client-Side Processing**: Voice splitting, default application, warning generation all happen locally

**Validation**: Feature enhances offline capability by enabling import of previously failing files. No REST API dependencies introduced.

### IV. Precision & Fidelity ✅ PASS

- **960 PPQ Maintained**: All tick calculations use integer arithmetic
- **Non-Integer Handling**: Spec clarifies rounding strategy (round to nearest, warn if fractional part > 0.1) - maintains integer precision
- **Deterministic**: Same MusicXML always produces same tick positions, voice assignments, note placements (FR-016)

**Validation**: Feature preserves 960 PPQ precision. Determinism requirement ensures timing fidelity across repeated imports.

### V. Test-First Development ✅ PASS

- **Test Scenarios Defined**: Spec provides 5 user stories with concrete acceptance criteria
- **Test File Available**: Moonlight Sonata.mxl in backend/music/ folder serves as primary integration test
- **Contract Verification**: ImportResult warnings array enables testing of error handling paths
- **Determinism Testing**: SC-008 requires byte-identical score comparison on repeated imports

**Validation**: Feature is highly testable with clear success criteria. Implementation will follow TDD with overlapping note tests, missing element tests, malformed XML tests, and determinism verification.

**GATE STATUS**: ✅ ALL PRINCIPLES PASS - Proceed to Phase 0

**POST-PHASE 1 RE-EVALUATION**: ✅ CONFIRMED - Design decisions from Phase 1 (ImportWarning data structure, warning collection pattern, voice splitting algorithm, encoding fallback) maintain constitutional compliance. No new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/015-musicxml-error-handling/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   └── ImportWarning.ts # TypeScript interface for warning structure
├── checklists/
│   └── requirements.md  # Specification validation checklist (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - deferred)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/
│   │   ├── importers/
│   │   │   └── musicxml/
│   │   │       ├── mod.rs          # [MODIFY] Add warning collection
│   │   │       ├── parser.rs       # [MODIFY] Add error recovery in XML parsing
│   │   │       ├── converter.rs    # [MODIFY] Add voice splitting, default application
│   │   │       ├── errors.rs       # [MODIFY] Add warning types
│   │   │       └── types.rs        # [MODIFY] Extend ImportResult with warnings
│   │   └── voice.rs                # [MODIFY] Relax overlap validation or add try_add_note()
│   └── adapters/
│       └── wasm/
│           └── bindings.rs         # [MODIFY] Update parse_musicxml() to return warnings
└── tests/
    └── musicxml_import_test.rs     # [NEW] Add error handling integration tests

frontend/
├── src/
│   ├── services/
│   │   └── import/
│   │       └── MusicXMLImportService.ts  # [MODIFY] Display warnings in UI
│   ├── types/
│   │   └── import-warning.ts             # [NEW] TypeScript warning interfaces
│   └── components/
│       └── import/
│           └── ImportButton.tsx          # [MODIFY] Show warning panel
└── tests/
    └── integration/
        └── import-error-handling.test.tsx  # [NEW] Frontend warning display tests
```

**Structure Decision**: Web application (Option 2) - Rust backend with WASM compilation + React frontend. Feature enhances existing MusicXML importer in `backend/src/domain/importers/musicxml/` and updates frontend import UI to display warnings. All parser enhancements stay in domain layer per hexagonal architecture.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - All constitutional principles pass without violations. No complexity justification required.

---

## Planning Summary

**Phase 0 - Research** ✅ COMPLETE
- Investigated forgiving XML parsing with quick-xml event-based recovery
- Defined deterministic voice assignment algorithm (start tick with pitch tiebreaker)
- Researched clef inference strategy (mean MIDI pitch of first 100 notes, C4 threshold)
- Established warning collection pattern (ImportContext threading, severity levels)
- Validated deterministic behavior requirements (BTreeMap, integer arithmetic, sorted iteration)

**Phase 1 - Design & Contracts** ✅ COMPLETE
- Defined ImportWarning data structure with severity/category/context fields
- Extended ImportResult with warnings array and partial_import flag
- Created TypeScript contracts for frontend warning display
- Documented source code modifications (parser, converter, voice, WASM bindings, UI)
- Generated quickstart guide for Moonlight Sonata.mxl testing

**Constitutional Compliance** ✅ VALIDATED
- All 5 principles pass without violations
- Design maintains hexagonal architecture (domain logic in importers/)
- Enhances PWA offline capability (client-side error recovery)
- Preserves 960 PPQ precision (integer tick rounding with warning threshold)
- Test-first approach enabled (clear acceptance criteria, real test file available)

**Artifacts Generated**:
- [research.md](research.md) - Technical decisions and alternatives analysis
- [data-model.md](data-model.md) - Entity definitions and relationships
- [contracts/ImportWarning.ts](contracts/ImportWarning.ts) - TypeScript interfaces
- [quickstart.md](quickstart.md) - Testing guide with validation checklist

**Next Steps**:
1. Run `/speckit.tasks` to generate task breakdown from this plan
2. Implement tasks following TDD workflow (test → fail → implement → pass)
3. Validate with Moonlight Sonata.mxl at each milestone
4. Update README.md with new import capabilities upon completion

**Planning Complete** - Ready for implementation phase.
