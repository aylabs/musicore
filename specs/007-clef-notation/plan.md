# Implementation Plan: Clef Notation Support in UI

**Branch**: `007-clef-notation` | **Date**: 2026-02-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-clef-notation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable visual display of clef symbols (treble, bass, alto, tenor) in the frontend staff notation renderer so that bass-range instruments and low piano notes are readable with correct staff line positioning. Backend already extracts clef from MusicXML `<clef>` elements (Feature 006) and stores ClefEvent in Staff. Frontend requires: (1) complete note positioning logic for Alto/Tenor clefs in NotationLayoutEngine, (2) ensure API response includes clef information per staff, (3) render clef glyphs using Bravura SMuFL font with correct positioning, (4) support clef changes mid-piece. Primary value: 40% faster pitch identification for bass notes, improved readability for piano/orchestral scores.

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend), Rust 1.82+ (backend API - minimal changes)  
**Primary Dependencies**: React 19.2, Bravura music font (SMuFL), Vite 7.2 bundler; backend: Axum 0.7, serde  
**Storage**: N/A (display-only feature; clef data already stored in domain model via Feature 006)  
**Testing**: Vitest 4.0 (frontend unit tests), React Testing Library (component tests), visual regression tests for clef rendering  
**Target Platform**: Web browser (Chrome, Firefox, Safari) with responsive layout support (desktop/tablet)
**Project Type**: Web application - frontend-focused (80% frontend, 20% backend API response enhancement)  
**Performance Goals**: 60 fps rendering, clef glyph renders in <16ms, note positioning calculations <5ms for 500 notes  
**Constraints**: Must use SMuFL-compliant music font (Bravura), maintain 960 PPQ timing precision, scale proportionally from 50%-200% zoom  
**Scale/Scope**: Support 4 clef types (Treble/Bass/Alto/Tenor), handle scores with 100+ clef changes, render 50+ staves simultaneously (orchestral), maintain visual clarity at all zoom levels

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅
- **Ubiquitous Language**: Uses music notation terminology (clef, staff line, middle C, pitch positioning) consistently across code and documentation
- **Entity Modeling**: Clef represented as `ClefEvent` domain entity (already established in Feature 006); frontend uses `ClefType` enum matching domain
- **Bounded Context**: Clef display is UI concern (presentation layer); clef semantics (pitch interpretation) handled by domain
- **Assessment**: PASS - Frontend rendering respects domain clef semantics; no domain logic leakage into UI concerns

### II. Hexagonal Architecture ✅
- **Core Domain**: Clef data model and semantics already in domain (Feature 006: `ClefEvent`, `ClefType` enum); no changes needed
- **Ports**: Existing API port returns Staff with ClefEvents; may need serialization enhancement to include clef-per-measure
- **Adapters**: Frontend notation renderer is presentation adapter consuming domain data via API; no architectural violations
- **Dependency Rule**: Frontend depends on domain types via API contract; domain remains framework-agnostic
- **Assessment**: PASS - Clear presentation layer concerns; no new adapters needed; existing hexagonal boundaries maintained

### III. API-First Development ✅
- **Backend API**: Enhances existing `GET /api/v1/scores/{id}` to include clef information in Staff serialization (currently implicit)
- **Frontend Contract**: Expects `clef` field in Staff JSON response; graceful fallback to Treble if missing (backward compatible)
- **Contract Tests**: Validate API returns clef data for each staff; frontend tests verify clef rendering from API response
- **Assessment**: PASS - Minimal API enhancement (serialization only); maintains API-first approach with contract clarity

### IV. Precision & Fidelity ✅
- **960 PPQ Preservation**: Clef display is visual-only feature; does not affect timing calculations or pitch values
- **Pitch Accuracy**: Note positioning algorithm must correctly interpret MIDI pitch relative to active clef (e.g., MIDI 60 = middle C on different staff lines for Treble vs Bass)
- **Validation**: Visual regression tests ensure note positioning matches clef-specific staff line conventions
- **Assessment**: PASS - No timing precision impact; maintains pitch-to-visual-position fidelity per clef type

### V. Test-First Development ✅
- **Test Strategy**: Write unit tests for note positioning (MIDI pitch + clef → staff line position) before implementation
- **Component Tests**: Test clef glyph rendering, clef change handling, multi-staff clef display
- **Visual Regression**: Snapshot tests for clef symbols at different zoom levels and screen sizes
- **Integration Tests**: Test full workflow: import MusicXML with clefs → API returns clef data → UI displays correctly
- **Assessment**: PASS - Testable pure functions (note positioning); visual tests for rendering correctness

**GATE STATUS**: ✅ PASS - All principles satisfied. Frontend presentation feature with no domain changes.

## Project Structure

### Documentation (this feature)

```text
specs/007-clef-notation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── staff-clef-api.md    # GET /api/v1/scores/{id} clef serialization contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/
│   │   ├── events/
│   │   │   └── clef.rs          # Existing ClefEvent (no changes)
│   │   ├── value_objects.rs     # Existing Clef enum (no changes)
│   ├── adapters/
│   │   └── api/
│   │       └── routes.rs        # May need clef serialization enhancement
│   └── models/
│       └── (enhance) staff.rs   # Ensure ClefEvent serialized in StaffResponse
└── tests/
    └── integration/
        └── (new) api_clef_serialization_test.rs  # Verify API returns clef data

frontend/
├── src/
│   ├── components/
│   │   └── notation/
│   │       ├── StaffNotation.tsx         # Existing (minor: clef prop handling)
│   │       ├── NotationRenderer.tsx      # Existing (clef rendering already present)
│   │       └── (new) ClefGlyph.tsx       # Optional: isolated clef component
│   ├── services/
│   │   └── notation/
│   │       ├── (enhance) NotationLayoutEngine.ts  # Add Alto/Tenor positioning logic
│   │       └── (new) ClefPositioningService.ts    # Pure functions for clef-specific logic
│   ├── types/
│   │   ├── score.ts             # Existing ClefType (may need to ensure matches backend)
│   │   └── notation/
│   │       ├── config.ts        # Existing SMUFL_CODEPOINTS (verify Tenor unique glyph)
│   │       └── layout.ts        # Existing ClefPosition (no changes likely)
│   └── assets/
│       └── fonts/
│           └── Bravura.woff2    # Music font (verify includes Alto/Tenor glyphs)
└── tests/
    ├── unit/
    │   ├── (new) ClefPositioning.test.ts  # Unit tests for note positioning per clef
    │   └── (enhance) NotationLayoutEngine.test.ts  # Add Alto/Tenor test cases
    └── components/
        └── (enhance) StaffNotation.test.tsx  # Add clef display test cases
```

**Structure Decision**: Web application (frontend-focused). Primary work in `frontend/src/services/notation/NotationLayoutEngine.ts` to complete Alto/Tenor clef positioning logic. Backend changes minimal (ensure API serialization includes clef). Follows existing structure: notation logic in `services/notation/`, rendering in `components/notation/`, types in `types/`.

## Complexity Tracking

*No constitution violations - table not needed.*
