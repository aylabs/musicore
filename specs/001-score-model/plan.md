# Implementation Plan: Hierarchical Score Model

**Branch**: `001-score-model` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-score-model/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a hierarchical domain model for musical scores following DDD principles with hexagonal architecture. The Score acts as the aggregate root containing Instruments → Staves → Voices → IntervalEvents (notes). Structural events (tempo, time signature, clef, key signature) are scoped globally (Score) or per-Staff, never to Voices. All timing uses 960 PPQ integer resolution to ensure precision. The backend exposes domain operations via API for frontend consumption.

## Technical Context

**Language/Version**: Rust (latest stable 1.75+)  
**Primary Dependencies**: serde 1.0+, serde_json 1.0+ (serialization), thiserror 1.0+ (errors); web framework TBD in contracts phase (axum or actix-web)  
**Storage**: In-memory HashMap with ScoreRepository port trait (swappable to PostgreSQL/SQLite later)  
**Testing**: cargo test (unit tests for domain logic, integration tests for API contracts)  
**Target Platform**: Backend API server (Linux/macOS), consumed by React frontend  
**Project Type**: web (monorepo with backend/ and frontend/ directories)  
**Performance Goals**: <200ms query latency for 1000-measure scores (50,000 events), O(1) hierarchy navigation, 100 note insertions in <30s  
**Constraints**: Integer-only arithmetic (no floating-point for timing), 960 PPQ resolution immutable, aggregate root pattern (all mutations through Score)  
**Scale/Scope**: Support scores up to 1,000,000 ticks, 50+ staves, 10+ voices per staff, 50,000+ interval events with validation

**Research Completed**: See [research.md](research.md) for dependency selection rationale, storage strategy, and API design decisions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✓ PASS

**Compliance**: Feature explicitly models music domain entities using DDD principles.

- ✓ Ubiquitous language defined (Score, Instrument, Staff, Voice, StructuralEvent, IntervalEvent, PPQ, Tick)
- ✓ Aggregate root identified (Score is the aggregate root containing all entities)
- ✓ Bounded context clear (music score model separate from rendering/playback concerns)
- ✓ Entity relationships follow domain rules (Instrument contains Staves, Staff contains Voices)

**Evidence**: Spec explicitly states "Score: Root aggregate" and uses consistent music terminology throughout.

---

### II. Hexagonal Architecture ✓ PASS

**Compliance**: Domain model will be independent of infrastructure concerns.

- ✓ Core domain entities (Score, Instrument, Staff, Voice, Events) have no external dependencies
- ✓ Ports will define interfaces for persistence, API exposure
- ✓ Adapters will handle HTTP API, storage implementation
- ✓ Technical Context marks storage as "NEEDS CLARIFICATION"—indicating infrastructure is separate concern

**Evidence**: Spec focuses purely on domain concepts without mentioning databases, HTTP, or frameworks.

---

### III. API-First Development ✓ PASS

**Compliance**: Feature designed for backend API exposure to frontend consumers.

- ✓ Requirements FR-025 through FR-029 specify API operations (create, retrieve, update, delete entities)
- ✓ Spec states "API layer will expose domain entities through REST or GraphQL endpoints"
- ✓ Frontend explicitly consumes API (React-based, retrieves score data via backend API)
- ✓ Contract tests mentioned in constitution (Phase 1 will generate contracts/)

**Evidence**: Dependencies section states "API-first development" and frontend as API consumer.

---

### IV. Precision & Fidelity ✓ PASS

**Compliance**: Feature enforces 960 PPQ resolution with integer-only arithmetic.

- ✓ Fixed resolution: FR-014 "System MUST operate at 960 PPQ resolution"
- ✓ Integer arithmetic: FR-015 "System MUST use integer arithmetic for all tick calculations"
- ✓ Exact timing: FR-016 "All temporal positions as integer tick values"
- ✓ Constraint documented: "Integer-only arithmetic (no floating-point for timing)"

**Evidence**: Multiple functional requirements and success criteria (SC-005) validate precision maintenance.

---

### V. Test-First Development (NON-NEGOTIABLE) ✓ PASS

**Compliance**: All requirements designed for testability with clear validation rules.

- ✓ Testable requirements: Each FR has specific validation conditions (e.g., start_tick ≥ 0, duration_ticks > 0)
- ✓ Success criteria measurable: SC-002 "100% accuracy across 10,000 test cases"
- ✓ User stories have Given-When-Then scenarios (5 stories with 17 total acceptance scenarios)
- ✓ Edge cases identified for test coverage (7 edge cases documented)

**Evidence**: Constitution checklist validates "all requirements testable and unambiguous."

---

### Gate Status: ✅ ALL CHECKS PASSED

**Decision**: Proceed to Phase 0 (Research)

**Justification**: Feature fully aligns with all constitutional principles. No violations require complexity tracking. DDD aggregate pattern, hexagonal architecture boundaries, API-first design, precision constraints, and test-first readiness all validated.

## Project Structure

### Documentation (this feature)

```text
specs/001-score-model/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
├── checklists/          # Quality validation checklists
│   └── requirements.md  # ✅ Completed during /speckit.specify
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/
│   │   ├── score/          # Score aggregate root
│   │   ├── instrument/     # Instrument entity
│   │   ├── staff/          # Staff entity  
│   │   ├── voice/          # Voice entity
│   │   └── events/         # StructuralEvent, IntervalEvent, Note
│   ├── ports/              # Domain interfaces (persistence, commands, queries)
│   ├── adapters/           # Infrastructure implementations (API, storage)
│   │   ├── api/            # HTTP API adapter (REST/GraphQL)
│   │   └── persistence/    # Storage adapter
│   └── lib.rs
├── tests/
│   ├── contract/           # API contract tests
│   ├── integration/        # End-to-end domain tests
│   └── unit/               # Domain logic unit tests
└── Cargo.toml

frontend/
├── src/
│   ├── components/         # React components for rendering score
│   ├── services/           # API client services
│   │   └── score-api.ts    # Score API integration
│   └── types/              # TypeScript types mirroring domain entities
├── tests/
└── package.json
```

**Structure Decision**: Selected **Web application (Option 2)** structure based on:
- Constitution mandates monorepo with backend/ and frontend/ directories
- Backend uses hexagonal architecture: domain/ (core), ports/ (interfaces), adapters/ (infrastructure)
- Frontend consumes backend API independently
- Domain model lives in backend/src/domain/ organized by aggregate/entity
- Clear separation enables parallel development and API-first workflow

## Complexity Tracking

**Status**: No constitutional violations detected.

All principles (DDD, Hexagonal Architecture, API-First, Precision & Fidelity, Test-First) are fully satisfied. No additional complexity justification required.

---

## Phase 1 Design Artifacts

### Generated Documents

✅ **research.md**: Resolved technical unknowns
- Primary dependencies: serde, serde_json, thiserror
- Storage strategy: In-memory with repository port trait
- API style: REST with JSON
- Domain modeling: Rust type system for invariants

✅ **data-model.md**: Complete domain model specification
- 5 entities: Score (aggregate root), Instrument, Staff, Voice, Note
- 5 value objects: Tick, BPM, Pitch, Clef, KeySignature
- 8 event types: Tempo, TimeSignature, Clef, KeySignature, Note
- 11 validation rules enforcing domain invariants
- Persistence port trait with in-memory adapter

✅ **contracts/**: REST API OpenAPI specification
- 13 endpoints covering all domain operations
- Resource-oriented URLs following RESTful principles
- JSON request/response schemas
- Contract test requirements documented
- Status codes: 200, 201, 204, 400, 404, 409, 500

✅ **quickstart.md**: Integration scenarios and examples
- 5 scenarios mapping to user stories (P1-P5)
- Validation tests for domain invariants
- Performance test example (100 notes in <30s)
- Frontend React integration example
- Troubleshooting guide

✅ **Agent context updated**: GitHub Copilot instructions enhanced with Rust, serde, DDD patterns

---

## Post-Phase 1 Constitution Re-Check

*Re-evaluation after design and contracts generation*

### I. Domain-Driven Design ✓ PASS (RECONFIRMED)

**Design Evidence**:
- ✓ data-model.md defines entities with DDD patterns (aggregate root, value objects, domain events)
- ✓ Rust implementation uses type system to enforce invariants (Tick(u32), BPM, Pitch validation)
- ✓ Score is explicit aggregate root with encapsulated operations
- ✓ Domain errors use ubiquitous language (OverlappingNote, DuplicateStructuralEvent)

**Compliance**: Design fully implements DDD principles.

---

### II. Hexagonal Architecture ✓ PASS (RECONFIRMED)

**Design Evidence**:
- ✓ Source structure: domain/ (core), ports/ (interfaces), adapters/ (impl)
- ✓ ScoreRepository port trait defined with no implementation details in domain
- ✓ In-memory adapter implements port trait—swappable without domain changes
- ✓ API adapter maps domain operations to HTTP endpoints
- ✓ Core domain has zero external dependencies (serde is port boundary concern)

**Compliance**: Hexagonal architecture boundaries clearly defined and enforced.

---

### III. API-First Development ✓ PASS (RECONFIRMED)

**Design Evidence**:
- ✓ OpenAPI 3.0 contract generated before implementation
- ✓ 13 endpoints with complete request/response schemas
- ✓ Contract tests documented as requirement before coding
- ✓ Frontend TypeScript integration example shows API consumption
- ✓ quickstart.md demonstrates parallel frontend/backend development capability

**Compliance**: Contract-first approach enables independent development.

---

### IV. Precision & Fidelity ✓ PASS (RECONFIRMED)

**Design Evidence**:
- ✓ Tick value object uses u32 (integer, no floating-point)
- ✓ Duration calculations: start_tick + duration_ticks (integer arithmetic only)
- ✓ 960 PPQ resolution enforced throughout (Notes, StructuralEvents use Tick type)
- ✓ data-model.md explicitly documents integer-only constraint

**Compliance**: Precision requirements maintained in all design artifacts.

---

### V. Test-First Development ✓ PASS (RECONFIRMED)

**Design Evidence**:
- ✓ contracts/README.md documents contract tests required BEFORE implementation
- ✓ quickstart.md provides test scenarios for each user story
- ✓ Validation tests defined for all invariants (11 rules)
- ✓ Performance test example for success criteria (SC-001)
- ✓ Constitution mandates TDD: tests written → fail → implement → pass

**Compliance**: Test-first workflow explicitly documented and required.

---

### Final Gate Status: ✅ ALL CHECKS PASSED (POST-PHASE 1)

**Decision**: Design phase complete. Ready for Phase 2 (Tasks generation via `/speckit.tasks`).

**Summary**: All constitutional principles validated in both specification and design artifacts. No deviations detected. Implementation can proceed following test-first methodology with confidence that architecture aligns with project principles.

---

## Next Steps

**Current Status**: Phase 1 (Planning & Design) COMPLETE ✅

**Ready For**: `/speckit.tasks` command to generate tasks.md

**Prerequisites Met**:
- ✓ Specification validated (spec.md + checklists/requirements.md)
- ✓ Research completed (research.md)
- ✓ Data model defined (data-model.md)
- ✓ API contracts specified (contracts/score-api.yaml)
- ✓ Integration scenarios documented (quickstart.md)
- ✓ Constitution compliance verified (pre- and post-Phase 1)
- ✓ Agent context updated (.github/agents/copilot-instructions.md)

**Blocked Items**: None

**Notes**: Tasks generation will break down implementation into test-first tasks organized by user story (P1-P5), enabling incremental MVP delivery per constitution principles.
