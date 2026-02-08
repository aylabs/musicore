# Implementation Plan: Chord Symbol Visualization

**Branch**: `005-chord-symbols` | **Date**: 2026-02-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-chord-symbols/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace current displaced individual note visualization with chord symbol display when multiple notes with different pitches occur at the same tick position. Implement chord detection algorithm that recognizes common chord types (major, minor, seventh variations), displays standard music notation symbols (e.g., "C", "Am", "G7") above staff notation using SVG text elements, and falls back to individual notes for unrecognized patterns.

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend), Rust 1.82+ (backend)  
**Primary Dependencies**: React 19, Vite bundler (frontend); Axum web framework, Tokio async runtime (backend)  
**Storage**: In-memory (no database persistence for chords)  
**Testing**: Vitest for frontend unit/component tests; cargo test for backend (if chord analysis moves to backend)  
**Target Platform**: Web browser (Chrome, Firefox, Safari), Docker containerized deployment
**Project Type**: Web application (frontend React + backend Rust API)  
**Performance Goals**: Chord detection and display rendering under 100ms (SC-003); maintain 60fps staff notation rendering  
**Constraints**: Zero precision loss with 960 PPQ resolution; sub-100ms response time for chord symbol updates; no overlapping notation elements (SC-006)  
**Scale/Scope**: Support scores with 10,000+ events; detect chords across 12 chromatic pitches; recognize 7+ chord types minimum (major, minor, diminished, augmented, 7ths)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅
- **Ubiquitous Language**: Uses music domain terms (chord, pitch class, interval, voice, tick position)
- **Entity Modeling**: Chord is modeled as a domain concept (collection of notes at same tick), not just a display concern
- **Assessment**: PASS - Chord detection operates on existing domain entities (Note, Voice) using music theory terminology

### II. Hexagonal Architecture ✅
- **Core Domain**: Chord analysis logic is pure function (pitches → chord type), independent of UI framework
- **Ports**: Chord detection can be isolated service/function; rendering is adapter (SVG output)
- **Dependency Rule**: Chord type identification has no external dependencies (pure interval math)
- **Assessment**: PASS - Clear separation between chord analysis (domain) and chord symbol rendering (adapter)

### III. API-First Development ⚠️  
- **Backend API**: Current spec focuses on frontend visualization; chord detection happens client-side
- **Contract Independence**: No backend API changes required for P1 (Display Chord Symbols)
- **Consideration**: Future optimization could move chord analysis to backend, expose via API
- **Assessment**: PASS with note - Frontend-only implementation acceptable for visualization feature; backend enhancement optional

### IV. Precision & Fidelity ✅
- **960 PPQ Preserved**: Chord detection uses existing tick positions (integers), no new timing calculations
- **No Precision Loss**: Grouping notes by tick doesn't modify underlying note data
- **Assessment**: PASS - Feature reads tick positions but doesn't modify timing precision

### V. Test-First Development ✅
- **Test Strategy**: Will write tests for chord detection algorithm before implementation
- **Contract Tests**: If backend API added, require contract tests
- **Component Tests**: StaffNotation component tests for chord symbol rendering
- **Assessment**: PASS - Follows TDD workflow; chord analysis is highly testable (pure function)

**GATE STATUS**: ✅ PASS - All principles satisfied or acknowledged. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-chord-symbols/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/           # Domain entities (Score, Note, Instrument, etc.)
│   ├── services/         # Domain services (if chord analysis moves to backend)
│   └── api/              # HTTP endpoints (Axum routes)
└── tests/

frontend/
├── src/
│   ├── components/
│   │   ├── notation/     # Staff notation components (StaffNotation, NotationRenderer)
│   │   └── (new) ChordSymbol.tsx    # Chord symbol rendering component
│   ├── services/
│   │   ├── notation/     # NotationLayoutEngine, existing layout services
│   │   └── (new) chord/  # Chord detection and analysis services
│   │       ├── ChordDetector.ts     # Detects chords from notes at same tick
│   │       ├── ChordAnalyzer.ts     # Identifies chord type from pitches
│   │       └── ChordSymbolFormatter.ts  # Formats chord symbol string (e.g., "Cm7")
│   ├── types/
│   │   ├── notation/     # Existing notation type definitions
│   │   └── (new) chord.ts    # Chord-related type definitions
│   └── tests/
│       ├── unit/         # Chord detection algorithm tests
│       └── component/    # ChordSymbol component tests
└── tests/
    └── integration/      # End-to-end chord visualization tests
```

**Structure Decision**: Web application (Option 2). Frontend-focused implementation with chord detection and rendering in React/TypeScript. Backend unchanged unless chord analysis optimization required. Follows existing pattern: notation logic in `frontend/src/services/notation/`, components in `frontend/src/components/notation/`.

## Complexity Tracking

*No constitution violations - table not needed.*

---

## Planning Phase Summary

### Phase 0: Research ✅ COMPLETE

**Artifacts Generated**:
- [research.md](research.md) - 5 research tasks with technical decisions

**Key Decisions**:
1. **Chord Detection**: Tick-based grouping with O(n) performance using `Map<number, Note[]>`
2. **Chord Recognition**: Pitch class set algorithm with 7 chord patterns (major, minor, dim, aug, 7th variations)
3. **Positioning Strategy**: Fixed 30px above staff, centered on note groups, handles clef/time signature collisions
4. **Integration Approach**: Separate ChordSymbol component for P1 (lower risk, faster development), future integration into NotationLayoutEngine
5. **Performance Optimization**: React useMemo with 70ms budget (10ms detection, 10ms analysis, 50ms rendering)

**Technology Choices**:
- No new dependencies required
- Pure TypeScript implementation
- Extends existing StaffNotation pattern

### Phase 1: Design & Contracts ✅ COMPLETE

**Artifacts Generated**:
- [data-model.md](data-model.md) - Type definitions for chord system
- [quickstart.md](quickstart.md) - Development workflow and testing guide
- [contracts/README.md](contracts/README.md) - API contract documentation (frontend-only, no backend changes)

**Data Model**:
- `ChordGroup`: Collection of notes at same tick with identified chord type
- `ChordType`: 7 chord classifications (major, minor, dim, aug, dominant7, major7, minor7)
- `ChordPattern`: Interval pattern database for recognition
- `ChordSymbolLayout`: SVG positioning data for rendering
- Helper types: `PitchClass`, pitch-to-name mappings

**Services Defined**:
- `IChordDetector`: Group notes by tick, filter 2+ note candidates
- `IChordAnalyzer`: Identify chord types using interval matching
- `IChordSymbolFormatter`: Format display strings ("C", "Am7", etc.)

**Development Workflow**:
- 7-step implementation sequence (types → services → component → integration)
- TDD approach with unit tests before implementation
- Performance testing with benchmarks (<100ms target)
- Estimated timeline: 15 hours (2 days) + 1-2 days buffer

**Constitution Re-Check**: ✅ PASS
- All 5 principles remain satisfied after detailed design
- No violations introduced in Phase 1
- DDD: Uses ubiquitous language throughout services
- Hexagonal: Pure domain logic with SVG adapter
- API-First: Exempted for visualization (no backend changes)
- Precision: No modification of tick positions
- TDD: Highly testable pure functions

### Agent Context Update ✅ COMPLETE

Updated `.github/agents/copilot-instructions.md` with:
- Language: TypeScript 5.9 (frontend), Rust 1.82+ (backend)
- Framework: React 19, Vite bundler (frontend); Axum, Tokio (backend)
- Database: In-memory (no persistence for chords)
- Project type: Web application

---

## Next Steps

**Planning Complete** ✅ - This document is ready for task breakdown.

**Recommended Next Command**: `/speckit.tasks`

This will generate [`tasks.md`](tasks.md) with:
- Granular implementation tasks (1-4 hour units)
- Task dependencies and sequencing
- Acceptance criteria per task
- Estimated effort breakdown

**For Implementation**: See [quickstart.md](quickstart.md) for:
- Local setup instructions
- Step-by-step development guide
- Testing strategy
- Debugging tips
- Success criteria validation

---

## Implementation Readiness Checklist

- [x] Feature specification complete and validated ([spec.md](spec.md))
- [x] Technical research complete with decisions ([research.md](research.md))
- [x] Data model defined with types and services ([data-model.md](data-model.md))
- [x] Development workflow documented ([quickstart.md](quickstart.md))
- [x] API contracts documented (frontend-only, no backend) ([contracts/](contracts/))
- [x] Constitution compliance verified (all 5 principles pass)
- [x] Agent context updated for implementation guidance
- [x] Project structure defined (web application, frontend focus)
- [ ] Task breakdown generated (`/speckit.tasks` - next step)
- [ ] Implementation started (`/speckit.implement` - after tasks)

**Status**: Ready for task breakdown phase.

**Branch**: `005-chord-symbols` (already created)  
**Spec Directory**: `/Users/alvaro.delcastillo/devel/sdd/musicore/specs/005-chord-symbols/`  
**Plan File**: This file (`plan.md`)
