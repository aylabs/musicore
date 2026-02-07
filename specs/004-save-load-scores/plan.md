# Implementation Plan: Score File Persistence

**Branch**: `004-save-load-scores` | **Date**: 2026-02-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-save-load-scores/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to save and load musical scores to/from JSON files using browser File API. Score data will be serialized using the existing Score domain model format (same as GET /api/v1/scores/:id API response), ensuring 100% data fidelity. Frontend-only implementation with no backend changes required.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19 (frontend only - no backend changes)  
**Primary Dependencies**: Browser File API (native), existing Score type definitions  
**Storage**: Client-side browser file system via download/upload (no server-side storage)  
**Testing**: Vitest with React Testing Library, jsdom for browser API mocks  
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Project Type**: Web application (monorepo with backend/ and frontend/)  
**Performance Goals**: Save <1s, Load <2s for scores with 100 measures/10 instruments  
**Constraints**: File size <1MB for typical scores, human-readable JSON format  
**Scale/Scope**: Single-score persistence, browser-local files only (no cloud/sync)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design
**Status**: ✅ PASS  
**Rationale**: Feature uses existing Score domain model for serialization. JSON structure mirrors the Score aggregate (instruments, global_structural_events) with no new domain concepts introduced. File operations are infrastructure concerns that don't leak into domain.

### II. Hexagonal Architecture
**Status**: ✅ PASS  
**Rationale**: Frontend-only feature with no backend changes. Backend already exposes Score via ports (API handlers). This feature adds a frontend "port" for file persistence without violating hexagonal boundaries. Score serialization/deserialization stays independent of file I/O mechanism.

### III. API-First Development
**Status**: ✅ PASS  
**Rationale**: Reuses existing API response format from GET /api/v1/scores/:id for JSON structure. No new API contracts needed. Frontend consumes existing Score format, demonstrating proper contract usage.

### IV. Precision & Fidelity
**Status**: ✅ PASS  
**Rationale**: JSON preserves exact integer Tick values (960 PPQ resolution). All musical timing uses integer arithmetic. No floating-point conversions in save/load path. 100% data fidelity is a stated success criterion (SC-001).

### V. Test-First Development
**Status**: ✅ PASS  
**Rationale**: Implementation will follow strict TDD:
- Unit tests for JSON serialization/deserialization (before implementation)
- Unit tests for file operations (save/load functions with mocked File API)
- Unit tests for validation logic (invalid JSON, missing fields)
- Integration tests for unsaved changes tracking
- Manual test checklist for browser file interactions

**Overall Gate Status**: ✅ ALL CHECKS PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/004-save-load-scores/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── score-file.json  # Example Score JSON file structure
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── ScoreViewer.tsx              # Add Save/Load/New buttons
│   ├── services/
│   │   ├── file/                        # NEW: File operations module
│   │   │   ├── FileService.ts           # Save/Load/New score logic
│   │   │   ├── FileService.test.ts      # Unit tests for file operations
│   │   │   ├── validation.ts            # JSON schema validation
│   │   │   └── validation.test.ts       # Validation tests
│   │   └── state/                       # NEW: File state management
│   │       ├── FileStateContext.tsx     # React context for file path & modified flag
│   │       └── FileStateContext.test.tsx
│   └── types/
│       └── file.ts                      # NEW: FileState, ValidationError types
└── tests/
    └── integration/
        └── file-persistence.test.tsx    # NEW: Integration tests for save/load flow

backend/
└── (no changes - existing Score API reused)
```

**Structure Decision**: This is a frontend-only feature. New code will be added to `frontend/src/services/file/` for file operations and `frontend/src/services/state/` for tracking file state. The existing `frontend/src/components/ScoreViewer.tsx` will be enhanced with Save/Load/New buttons. No backend changes required since Score serialization is already implemented via the REST API.

## Complexity Tracking

**Status**: N/A - All Constitution Checks pass with no violations. No complexity justification required.

---

## Phase 0: Research (COMPLETE)

**Output**: [research.md](./research.md)

**Summary**: All technical decisions documented with rationale. No NEEDS CLARIFICATION markers existed in specification. Key decisions:
- JSON format: Use existing Score API response format
- File operations: Browser File API (download for save, FileReader for load)
- Validation: Multi-layer (syntax, structure, domain rules)
- State management: React Context with FileState interface
- Testing: Unit + integration + manual test suite

**Status**: ✅ Research complete. Zero new dependencies required.

---

## Phase 1: Design (COMPLETE)

### Outputs

**[data-model.md](./data-model.md)**:
- FileState entity defined (frontend-only state)
- Score entity structure documented (no backend changes)
- Validation rules specified (3 layers: syntax, structure, domain)
- Data flow diagrams (save, load, new score)
- Performance analysis mapped to success criteria

**[contracts/](./contracts/)**:
- [score-file.json](./contracts/score-file.json): Complete example with 2 instruments, 4 measures
- [README.md](./contracts/README.md): Schema documentation, validation rules, file size expectations

**[quickstart.md](./quickstart.md)**:
- Manual test procedures for all 3 user stories
- Performance testing guidance (SC-002, SC-003)
- Data fidelity round-trip testing (SC-001)
- Cross-browser testing checklist
- Troubleshooting guide

**Status**: ✅ Design complete. All artifacts generated.

---

## Constitution Check (Post-Design Re-evaluation)

### I. Domain-Driven Design
**Status**: ✅ PASS (Confirmed)  
**Post-Design Validation**: FileState is an infrastructure concern (React Context), not a domain entity. Score domain model unchanged. No domain logic leaks into file operations layer.

### II. Hexagonal Architecture
**Status**: ✅ PASS (Confirmed)  
**Post-Design Validation**: File operations implemented as frontend adapter (services/file/). Core Score serialization uses existing API contract format. Clean separation maintained.

### III. API-First Development
**Status**: ✅ PASS (Confirmed)  
**Post-Design Validation**: Contracts exactly match existing API response from GET /api/v1/scores/:id. No new contracts needed. Frontend consumes existing format.

### IV. Precision & Fidelity
**Status**: ✅ PASS (Confirmed)  
**Post-Design Validation**: JSON preserves exact integer Tick values. Validation rules enforce domain constraints (MIDI 21-108, non-negative ticks). Data model documents 100% fidelity requirement (SC-001).

### V. Test-First Development
**Status**: ✅ PASS (Confirmed)  
**Post-Design Validation**: Test strategy documented in research.md and quickstart.md. Unit tests for FileService, validation, and state management. Integration tests for full save/load cycle. Manual test procedures defined. TDD workflow ready.

**Overall Gate Status**: ✅ ALL CHECKS PASS (Re-confirmed after Phase 1) - Ready for Phase 2

---

## Next Steps

**Phase 2: Task Breakdown** - Run `/speckit.tasks` command to generate:
- `tasks.md`: Detailed implementation tasks (T001-T0XX)
- Test-first task ordering
- Acceptance criteria per task
- Time estimates

**Implementation**: After tasks.md created, proceed with TDD implementation following task order.

---

**Plan Status**: ✅ COMPLETE (Phases 0-1 done, Phase 2 pending)
