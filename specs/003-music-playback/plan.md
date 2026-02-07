# Implementation Plan: Music Playback

**Branch**: `003-music-playback` | **Date**: 2026-02-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-music-playback/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add interactive music playback using Web Audio API via Tone.js library. The backend adds an Instrument entity to the Score model (initial implementation: piano only), and the frontend implements Play/Pause/Stop controls with accurate note timing based on start_tick and duration_ticks. Architecture: MusicTimeline component manages playback state → PlaybackScheduler converts musical time to real-time audio events → Tone.js synthesizes piano sounds with polyphonic support.

## Technical Context

**Language/Version**: Backend: Rust (latest stable 1.75+), Frontend: TypeScript 5.0+, React 18+  
**Primary Dependencies**: Backend: serde (existing), Frontend: Tone.js 14.7+ (new), React, TypeScript (existing)  
**Storage**: Backend uses existing in-memory Score repository with ScoreRepository trait (no changes needed)  
**Testing**: Backend: cargo test for domain model updates, Frontend: Jest + React Testing Library for components, pure function tests for timing calculations  
**Target Platform**: Web browsers with Web Audio API support (Chrome 90+, Firefox 88+, Safari 14+)  
**Project Type**: web (monorepo with `backend/` and `frontend/` directories)  
**Performance Goals**: 
  - Playback start latency <500ms (SC-001)
  - Note timing accuracy ±20ms at 60-180 BPM (SC-002)
  - Duration accuracy ±50ms (SC-003)
  - Control responsiveness <100ms (SC-004)
  - Support 10+ simultaneous notes without glitches (SC-005)
**Constraints**: 
  - Must respect 960 PPQ timing precision from backend
  - Browser autoplay policy compliance (user interaction required)
  - Piano-only instrument for first iteration
  - Polyphonic playback required (multiple simultaneous notes)
  - Stop must release all audio resources within 200ms (SC-010)
**Scale/Scope**: 
  - Handle scores with 1000+ notes
  - Support tempos from 60-180 BPM
  - MIDI pitch range 21-108 (standard piano)
  - Single instrument per score (mono-timbral)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✓ PASS

**Compliance**: Feature extends existing domain model with new Instrument entity following DDD principles.

- ✓ Ubiquitous language: Introduces "Instrument" as first-class domain entity, uses existing terms (Score, Note, Timeline, Tick)
- ✓ Aggregate root maintained: Instrument belongs to Score aggregate (Score remains the root)
- ✓ Bounded context preserved: Playback timing calculation is infrastructure concern, domain model stays pure (MIDI pitch, tick positions)
- ✓ Entity relationships follow domain: Instrument → Score relationship mirrors real-world music scores

**Evidence**: FR-001 adds Instrument entity to Score model. Playback scheduling is presentation/infrastructure layer, not domain logic.

---

### II. Hexagonal Architecture ✓ PASS

**Compliance**: Feature maintains separation between domain (backend) and infrastructure (frontend audio).

- ✓ Core domain: Backend Score model gains Instrument entity with no Web Audio API dependencies
- ✓ Ports: Backend continues exposing Score API (updated with instrument field)
- ✓ Adapters: Frontend implements playback as infrastructure layer consuming API
- ✓ Dependency flow: Frontend (audio layer) → API → Backend domain (inward only)

**Evidence**: Backend domain model remains technology-agnostic. Tone.js and Web Audio API are frontend infrastructure concerns only (FR-003, FR-013).

---

### III. API-First Development ✓ PASS

**Compliance**: Feature requires backend API updates to include Instrument in Score responses.

- ✓ Backend API modification: Score entity serialization includes new instrument field
- ✓ Frontend API consumption: React components fetch Score with instrument data
- ✓ Contract-driven: Frontend depends on Score API contract (GET `/scores/{id}` returns instrument)
- ✓ Contract tests required: Phase 1 will generate contracts/ with updated Score schema

**Evidence**: FR-001 adds Instrument to Score (backend), frontend consumes via existing API endpoint (updated schema). Dependencies section lists "Feature 001 (score-model)" API.

---

### IV. Precision & Fidelity ✓ PASS

**Compliance**: Feature respects 960 PPQ resolution and integer timing throughout.

- ✓ Fixed resolution: Backend model maintains 960 PPQ (no changes to timing resolution)
- ✓ Integer arithmetic: start_tick and duration_ticks remain integers (FR-006, FR-007)
- ✓ Timing conversion: Frontend converts integer ticks to milliseconds for audio scheduling (infrastructure concern)
- ✓ No domain corruption: Audio timing calculations are presentation layer only, don't modify domain data

**Evidence**: FR-006 "play each note at its specified start_tick", FR-014 "calculate timing based on PPQ (960 ticks per quarter note)". Backend domain model unchanged except for Instrument entity.

---

### V. Test-First Development (NON-NEGOTIABLE) ✓ PASS

**Compliance**: Feature designed for comprehensive testing with clear validation criteria.

- ✓ Testable requirements: Each FR has specific, measurable conditions (SC-001 to SC-010)
- ✓ Success criteria: Timing accuracy ±20ms, latency <500ms, etc. (10 measurable outcomes)
- ✓ User stories: 3 stories with 13 total acceptance scenarios (Given-When-Then format)
- ✓ Edge cases: 7 edge cases identified for test coverage
- ✓ Test strategy: Backend domain tests for Instrument model, frontend tests for timing calculations and playback controls

**Evidence**: Specification checklist validates "all requirements testable and unambiguous." Success criteria are measurable (SC-002: "±20ms accuracy").

---

### Gate Status: ✅ ALL CHECKS PASSED

**Decision**: Proceed to Phase 0 (Research)

**Justification**: Feature fully aligns with all constitutional principles. Backend domain model gains Instrument entity following DDD aggregate pattern. Frontend implements playback as infrastructure/adapter layer. API-first approach maintained with contract updates. 960 PPQ precision preserved. All requirements testable with clear metrics. No violations require complexity tracking.

---

## Phase 1 Re-evaluation: Constitution Check

*Performed after design phase (research.md, data-model.md, contracts/ completed)*

### I. Domain-Driven Design ✅ MAINTAINED

**Post-Design Assessment**: 
- ✅ Instrument entity properly modeled as domain entity (not anemic data class)
- ✅ Ubiquitous language preserved: backend uses music domain terms, frontend timing layer is clearly infrastructure
- ✅ Aggregate root integrity: Score.instruments relationship follows one-way association (Score → Instrument)
- ✅ No domain logic leaked to frontend: PlaybackScheduler does timing conversion (infrastructure), not domain logic

**Evidence**: data-model.md shows Instrument with business rules (default piano, validation), Score aggregate unchanged.

---

### II. Hexagonal Architecture ✅ MAINTAINED

**Post-Design Assessment**:
- ✅ Core domain isolated: Backend Instrument has no Tone.js or Web Audio API coupling
- ✅ Ports defined: Score API contract (score-api.yml) exposes domain via REST
- ✅ Adapters implemented: ToneAdapter wraps Tone.js, PlaybackScheduler converts domain data (ticks) to infrastructure data (seconds)
- ✅ Dependency flow correct: Frontend (adapter) → API (port) → Backend domain

**Evidence**: quickstart.md shows ToneAdapter as wrapper, PlaybackScheduler as pure service with no domain coupling.

---

### III. API-First Development ✅ MAINTAINED

**Post-Design Assessment**:
- ✅ Contract updated: score-api.yml v1.1.0 includes Instrument schema with examples
- ✅ Backward compatibility: Empty instruments array supported, frontend has getScoreInstrument() fallback
- ✅ Contract-driven: Frontend Score type matches backend schema exactly (instruments: Instrument[])
- ✅ No implicit coupling: All frontend-backend communication via documented REST API

**Evidence**: contracts/score-api.yml documents GET /scores/{id} with instruments field, includes backward compatibility example.

---

### IV. Precision & Fidelity ✅ MAINTAINED

**Post-Design Assessment**:
- ✅ 960 PPQ immutable: Backend domain model unchanged, frontend uses PPQ constant
- ✅ Integer arithmetic preserved: ticksToSeconds() converts integers to floats only at infrastructure boundary (presentation layer)
- ✅ No rounding errors: JavaScript Number type safe for ticks up to 2^53 (per research.md)
- ✅ Domain integrity: Note.start_tick and duration_ticks remain integers in backend

**Evidence**: data-model.md confirms PPQ=960, PlaybackScheduler.ts uses const PPQ = 960, timing conversion is one-way (domain → infrastructure).

---

### V. Test-First Development ✅ MAINTAINED

**Post-Design Assessment**:
- ✅ Testable architecture: ToneAdapter implements interface (mockable), PlaybackScheduler is pure service (no dependencies)
- ✅ Test strategy defined: quickstart.md includes unit tests (ticksToSeconds), integration tests (Tone.Offline), manual tests
- ✅ Contract tests: score-api.yml provides schema for backend contract validation
- ✅ Clear test cases: research.md documents edge cases (autoplay, polyphony, out-of-range notes)

**Evidence**: quickstart.md Step 5 provides concrete test implementations with expect() assertions.

---

### Final Gate Status: ✅ ALL CHECKS PASSED (POST-DESIGN)

**Decision**: Proceed to Phase 2 (Task Breakdown via /speckit.tasks)

**Design Quality Summary**:
- Architecture maintains constitutional compliance throughout all layers
- Clear separation: Domain (Instrument entity) vs. Infrastructure (ToneAdapter, PlaybackScheduler)
- No complexity introduced that violates principles
- All requirements remain testable with defined test strategy

**Complexity Tracking**: Not required - no constitutional violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-music-playback/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── score-api.yml    # Updated Score schema with instrument field
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── score.rs             # UPDATED: Add instrument field
│   │   └── instrument.rs        # NEW: Instrument domain entity
│   ├── services/
│   │   └── score_service.rs     # UPDATED: Handle instrument in CRUD operations
│   └── api/
│       └── score_handler.rs     # UPDATED: Serialize instrument in responses
└── tests/
    ├── unit/
    │   └── models/
    │       └── instrument_test.rs   # NEW: Test Instrument validation
    └── integration/
        └── api/
            └── score_api_test.rs    # UPDATED: Contract tests for instrument field

frontend/
├── src/
│   ├── components/
│   │   ├── notation/
│   │   │   └── NotationRenderer.tsx       # UPDATED: Add playback controls UI
│   │   └── playback/                       # NEW: Playback components
│   │       ├── PlaybackControls.tsx        # NEW: Play/Pause/Stop buttons
│   │       └── PlaybackControls.test.tsx   # NEW: Component tests
│   ├── services/
│   │   ├── playback/                       # NEW: Playback logic
│   │   │   ├── MusicTimeline.ts            # NEW: Timeline state management
│   │   │   ├── MusicTimeline.test.ts       # NEW: Timeline tests
│   │   │   ├── PlaybackScheduler.ts        # NEW: Tick → audio event conversion
│   │   │   ├── PlaybackScheduler.test.ts   # NEW: Scheduler tests
│   │   │   ├── ToneAdapter.ts              # NEW: Tone.js audio synthesis wrapper
│   │   │   └── ToneAdapter.test.ts         # NEW: Audio adapter tests
│   │   └── api/
│   │       └── ScoreApiClient.ts           # UPDATED: Handle instrument in Score type
│   └── types/
│       ├── score.ts                        # UPDATED: Add instrument to Score interface
│       └── playback.ts                     # NEW: Playback state types
└── tests/
    ├── unit/
    │   └── services/
    │       └── playback/                   # Tests colocated with source
    └── integration/
        └── playback-integration.test.tsx   # NEW: End-to-end playback test
```

**Structure Decision**: Option 2 (Web application) selected. Monorepo structure with `backend/` (Rust) and `frontend/` (React/TypeScript) directories. Backend adds Instrument entity to existing score model with minimal changes (1 new file, 3 updated files). Frontend adds new `playback/` module with 3 core services (MusicTimeline, PlaybackScheduler, ToneAdapter) and PlaybackControls component. All new files follow existing project conventions (colocated tests, services/ for business logic, components/ for UI).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
