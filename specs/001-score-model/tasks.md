---
description: "Task list for Hierarchical Score Model implementation"
feature: "001-score-model"
---

# Tasks: Hierarchical Score Model

**Branch**: `001-score-model`  
**Input**: Design documents from `/specs/001-score-model/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: This feature does not explicitly request tests, so tasks focus on implementation. Tests can be added later if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` (monorepo structure)
- **Backend domain**: `backend/src/domain/` (core entities, zero dependencies)
- **Backend ports**: `backend/src/ports/` (interfaces/traits)
- **Backend adapters**: `backend/src/adapters/` (infrastructure implementations)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create backend Rust project with Cargo.toml in backend/
- [X] T002 [P] Configure linting (clippy) and formatting (rustfmt) in backend/.rustfmt.toml and backend/.clippy.toml
- [X] T003 [P] Add core dependencies to backend/Cargo.toml (serde 1.0+, serde_json 1.0+, thiserror 1.0+)
- [X] T004 [P] Create frontend React project with TypeScript in frontend/
- [X] T005 [P] Configure ESLint and Prettier in frontend/.eslintrc.json and frontend/.prettierrc
- [X] T006 Create directory structure: backend/src/domain/, backend/src/ports/, backend/src/adapters/
- [X] T007 [P] Create .gitignore files for backend (target/, Cargo.lock) and frontend (node_modules/, dist/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create value object types in backend/src/domain/value_objects.rs (Tick, BPM, Pitch, Clef, KeySignature)
- [X] T009 Create domain error enum in backend/src/domain/errors.rs using thiserror
- [X] T010 [P] Create ID types in backend/src/domain/ids.rs (ScoreId, InstrumentId, StaffId, VoiceId, NoteId as UUIDs)
- [X] T011 Define ScoreRepository port trait in backend/src/ports/persistence.rs
- [X] T012 Create DomainError and PersistenceError types with thiserror in backend/src/domain/errors.rs

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Basic Score Structure (Priority: P1) 🎯 MVP

**Goal**: Enable creating a score with one instrument, staff, voice, and notes

**Independent Test**: Create Score → add Instrument → add Note → verify hierarchy and default structural events at tick 0

### Implementation for User Story 1

- [X] T013 [P] [US1] Create GlobalStructuralEvent enum (Tempo, TimeSignature variants) in backend/src/domain/events/global.rs
- [X] T014 [P] [US1] Create TempoEvent struct with tick and BPM fields in backend/src/domain/events/tempo.rs
- [X] T015 [P] [US1] Create TimeSignatureEvent struct with tick, numerator, denominator in backend/src/domain/events/time_signature.rs
- [X] T016 [US1] Create Score aggregate root in backend/src/domain/score/mod.rs with id, global_structural_events, instruments fields
- [X] T017 [US1] Implement Score::new() to initialize with default tempo (120 BPM) and time signature (4/4) at tick 0 in backend/src/domain/score/mod.rs
- [X] T018 [US1] Implement Score::add_tempo_event() with duplicate tick validation in backend/src/domain/score/mod.rs
- [X] T019 [US1] Implement Score::add_time_signature_event() with duplicate tick validation in backend/src/domain/score/mod.rs
- [X] T020 [P] [US1] Create StaffStructuralEvent enum (Clef, KeySignature variants) in backend/src/domain/events/staff.rs
- [X] T021 [P] [US1] Create ClefEvent struct with tick and clef fields in backend/src/domain/events/clef.rs
- [X] T022 [P] [US1] Create KeySignatureEvent struct with tick and sharps field in backend/src/domain/events/key_signature.rs
- [X] T023 [US1] Create Staff entity in backend/src/domain/staff/mod.rs with id, staff_structural_events, voices fields
- [X] T024 [US1] Implement Staff::new() to initialize with default clef (Treble) and key signature (C major) at tick 0 in backend/src/domain/staff/mod.rs
- [X] T025 [US1] Implement Staff::add_clef_event() with duplicate tick validation in backend/src/domain/staff/mod.rs
- [X] T026 [US1] Implement Staff::add_key_signature_event() with duplicate tick validation in backend/src/domain/staff/mod.rs
- [X] T027 [P] [US1] Create Voice entity in backend/src/domain/voice/mod.rs with id and interval_events fields
- [X] T028 [P] [US1] Create Note struct in backend/src/domain/events/note.rs with id, start_tick, duration_ticks, pitch fields
- [X] T029 [US1] Implement Note::new() with validation (duration > 0) in backend/src/domain/events/note.rs
- [X] T030 [US1] Implement Voice::add_note() with overlap validation (same pitch cannot overlap) in backend/src/domain/voice/mod.rs
- [X] T031 [US1] Create Instrument entity in backend/src/domain/instrument/mod.rs with id, name, staves fields
- [X] T032 [US1] Implement Instrument::new() to create instrument with one default staff in backend/src/domain/instrument/mod.rs
- [X] T033 [US1] Implement Score::add_instrument() method in backend/src/domain/score/mod.rs
- [X] T034 [US1] Implement InMemoryScoreRepository adapter in backend/src/adapters/persistence/in_memory.rs with HashMap storage
- [X] T035 [US1] Implement ScoreRepository trait methods (save, find_by_id, delete, list_all) for InMemoryScoreRepository in backend/src/adapters/persistence/in_memory.rs
- [X] T036 [US1] Add serde Serialize/Deserialize derives to all domain entities in backend/src/domain/

**Checkpoint**: User Story 1 complete - Score with instrument, staff, voice, and notes functional

---

## Phase 4: User Story 2 - Multi-Staff Instruments (Priority: P2)

**Goal**: Enable instruments with multiple staves (e.g., piano with treble and bass)

**Independent Test**: Add second staff to instrument → set different clef → verify staves independent

### Implementation for User Story 2

- [X] T037 [US2] Implement Instrument::add_staff() method to add additional staves in backend/src/domain/instrument/mod.rs
- [X] T038 [US2] Implement Instrument::get_staff() method to retrieve staff by ID in backend/src/domain/instrument/mod.rs
- [X] T039 [US2] Implement Instrument::get_staff_mut() method for mutable staff access in backend/src/domain/instrument/mod.rs
- [X] T040 [US2] Add validation to ensure Staff structural events are independent per staff in backend/src/domain/staff/mod.rs

**Checkpoint**: User Story 2 complete - Multi-staff instruments functional

---

## Phase 5: User Story 3 - Polyphonic Voices (Priority: P3)

**Goal**: Enable multiple voices within a single staff for polyphony

**Independent Test**: Add second voice to staff → add overlapping notes with different pitches → verify allowed; add same pitch → verify rejected

### Implementation for User Story 3

- [X] T041 [US3] Implement Staff::add_voice() method to add additional voices in backend/src/domain/staff/mod.rs
- [X] T042 [US3] Implement Staff::get_voice() method to retrieve voice by ID in backend/src/domain/staff/mod.rs
- [X] T043 [US3] Implement Staff::get_voice_mut() method for mutable voice access in backend/src/domain/staff/mod.rs
- [X] T044 [US3] Enhance Voice::add_note() validation to allow different-pitch overlaps (chords) in backend/src/domain/voice/mod.rs
- [X] T045 [US3] Add helper method Voice::has_overlapping_note() for pitch-specific overlap checks in backend/src/domain/voice/mod.rs

**Checkpoint**: User Story 3 complete - Polyphonic voices functional

---

## Phase 6: User Story 4 - Manage Global Structural Events (Priority: P4)

**Goal**: Enable tempo and time signature changes at specific points in score

**Independent Test**: Add tempo change at tick 3840 → verify applies globally; add time signature change → verify global application; attempt duplicate → verify rejection

### Implementation for User Story 4

- [X] T046 [US4] Implement Score::get_tempo_at() to retrieve active tempo at given tick in backend/src/domain/score/mod.rs
- [X] T047 [US4] Implement Score::get_time_signature_at() to retrieve active time signature at tick in backend/src/domain/score/mod.rs
- [X] T048 [US4] Add validation to prevent deletion of required tick 0 events in backend/src/domain/score/mod.rs
- [X] T049 [US4] Implement helper to query structural events by tick range in backend/src/domain/score/mod.rs

**Checkpoint**: User Story 4 complete - Global structural event management functional

---

## Phase 7: User Story 5 - Manage Staff-Scoped Structural Events (Priority: P5)

**Goal**: Enable clef and key signature changes per staff without affecting other staves

**Independent Test**: Add clef change to one staff at tick 1920 → verify only that staff affected; other staves retain independent events

### Implementation for User Story 5

- [X] T050 [US5] Implement Staff::get_clef_at() to retrieve active clef at given tick in backend/src/domain/staff/mod.rs
- [X] T051 [US5] Implement Staff::get_key_signature_at() to retrieve active key signature at tick in backend/src/domain/staff/mod.rs
- [X] T052 [US5] Add validation to prevent deletion of required tick 0 staff events in backend/src/domain/staff/mod.rs
- [X] T053 [US5] Implement helper to query staff structural events by tick range in backend/src/domain/staff/mod.rs

**Checkpoint**: User Story 5 complete - Staff-scoped structural event management functional

---

## Phase 8: API Layer (Cross-Cutting)

**Purpose**: Expose domain operations via REST API for frontend consumption

**Note**: API implementation follows all user stories - implements contracts from contracts/score-api.yaml

- [X] T054 Evaluate and choose web framework (axum vs actix-web) based on research.md recommendations in backend/Cargo.toml
- [X] T055 Add chosen web framework dependency to backend/Cargo.toml
- [X] T056 Create API adapter structure in backend/src/adapters/api/mod.rs
- [X] T057 [P] Implement POST /scores endpoint (create score) in backend/src/adapters/api/scores.rs
- [X] T058 [P] Implement GET /scores endpoint (list scores) in backend/src/adapters/api/scores.rs
- [X] T059 [P] Implement GET /scores/{id} endpoint (retrieve score) in backend/src/adapters/api/scores.rs
- [X] T060 [P] Implement DELETE /scores/{id} endpoint in backend/src/adapters/api/scores.rs
- [X] T061 [P] Implement POST /scores/{id}/instruments endpoint (add instrument) in backend/src/adapters/api/instruments.rs
- [X] T062 [P] Implement POST /scores/{id}/instruments/{id}/staves endpoint (add staff) in backend/src/adapters/api/staves.rs
- [X] T063 [P] Implement POST /scores/{id}/instruments/{id}/staves/{id}/voices endpoint (add voice) in backend/src/adapters/api/voices.rs
- [X] T064 [P] Implement POST /scores/{id}/.../notes endpoint (add note) in backend/src/adapters/api/notes.rs
- [X] T065 [P] Implement GET /scores/{id}/.../notes endpoint (query notes) in backend/src/adapters/api/notes.rs
- [X] T066 [P] Implement POST /scores/{id}/structural-events/tempo endpoint in backend/src/adapters/api/structural_events.rs
- [X] T067 [P] Implement POST /scores/{id}/structural-events/time-signature endpoint in backend/src/adapters/api/structural_events.rs
- [X] T068 [P] Implement POST /scores/{id}/.../structural-events/clef endpoint in backend/src/adapters/api/structural_events.rs
- [X] T069 [P] Implement POST /scores/{id}/.../structural-events/key-signature endpoint in backend/src/adapters/api/structural_events.rs
- [X] T070 Create error mapping layer (DomainError → HTTP status codes) in backend/src/adapters/api/errors.rs
- [X] T071 Implement request validation middleware in backend/src/adapters/api/middleware.rs
- [X] T072 Create main.rs entry point with server initialization in backend/src/main.rs
- [X] T073 Configure API server with routes and middleware in backend/src/adapters/api/routes.rs

**Checkpoint**: API layer complete - Backend exposing all domain operations via REST

---

## Phase 9: Frontend Integration (Cross-Cutting)

**Purpose**: React frontend to consume backend API and display score hierarchy

- [ ] T074 Create TypeScript types mirroring domain entities in frontend/src/types/score.ts
- [ ] T075 Implement ScoreApiClient service class in frontend/src/services/score-api.ts
- [ ] T076 [P] Implement createScore() method in frontend/src/services/score-api.ts
- [ ] T077 [P] Implement getScore() method in frontend/src/services/score-api.ts
- [ ] T078 [P] Implement addInstrument() method in frontend/src/services/score-api.ts
- [ ] T079 [P] Implement addNote() method in frontend/src/services/score-api.ts
- [ ] T080 [P] Create ScoreViewer component in frontend/src/components/ScoreViewer.tsx
- [ ] T081 [P] Create InstrumentList component in frontend/src/components/InstrumentList.tsx
- [ ] T082 [P] Create NoteDisplay component in frontend/src/components/NoteDisplay.tsx
- [ ] T083 Add error handling and loading states to components in frontend/src/components/

**Checkpoint**: Frontend integration complete - UI can display and interact with scores

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements, documentation, and production readiness

- [ ] T084 [P] Add comprehensive Rust doc comments to all public domain APIs in backend/src/domain/
- [ ] T085 [P] Add JSDoc comments to frontend service methods in frontend/src/services/
- [ ] T086 [P] Create README.md in backend/ with build and run instructions
- [ ] T087 [P] Create README.md in frontend/ with development setup instructions
- [ ] T088 [P] Add example scripts for common operations in backend/examples/
- [ ] T089 Verify all validation rules enforced (11 invariants from data-model.md) in backend/src/domain/
- [ ] T090 Performance profiling for success criteria SC-003 (<200ms for 1000-measure score) in backend/
- [ ] T091 Add logging infrastructure using tracing crate in backend/src/adapters/
- [ ] T092 Create Docker configuration for backend in backend/Dockerfile
- [ ] T093 Create docker-compose.yml for full stack (backend + frontend) in repository root

**Checkpoint**: Feature complete and production-ready

---

## Dependencies & Execution Strategy

### User Story Completion Order

```
Setup (Phase 1) → Foundational (Phase 2)
   ↓
   ├── US1 (Phase 3) 🎯 MVP ─────────────────┐
   │                                          │
   ├── US2 (Phase 4) ← depends on US1 ───────┤
   │                                          │
   ├── US3 (Phase 5) ← depends on US1 ───────┤
   │                                          │
   ├── US4 (Phase 6) ← depends on US1 ───────┤
   │                                          │
   ├── US5 (Phase 7) ← depends on US1 ───────┤
   │                                          │
   └─────────────────────────────────────────┴→ API (Phase 8) → Frontend (Phase 9) → Polish (Phase 10)
```

**Key Dependencies**:
- Phase 1 (Setup) and Phase 2 (Foundational) MUST complete before any user story
- User Story 1 (US1) is the MVP and MUST complete before US2-US5
- User Stories 2-5 can be implemented in parallel after US1 completes
- API layer (Phase 8) requires all user stories 1-5 complete
- Frontend (Phase 9) requires API layer complete
- Polish (Phase 10) is final phase after all implementation

### Parallel Execution Examples

**After Phase 2 complete, US1 parallelizable tasks**:
```bash
# Can run simultaneously (different files):
- T013 (events/global.rs)
- T014 (events/tempo.rs)  
- T015 (events/time_signature.rs)
- T020 (events/staff.rs)
- T021 (events/clef.rs)
- T022 (events/key_signature.rs)
- T027 (voice/mod.rs)
- T028 (events/note.rs)
```

**After US1 complete, parallel user story implementation**:
```bash
# Can run simultaneously (independent user stories):
- US2: T037-T040 (multi-staff)
- US3: T041-T045 (polyphonic voices)
- US4: T046-T049 (global structural events)
- US5: T050-T053 (staff structural events)
```

**Phase 8 API parallel tasks** (after all US complete):
```bash
# Can run simultaneously (different endpoint files):
- T057-T060 (scores.rs)
- T061 (instruments.rs)
- T062 (staves.rs)
- T063 (voices.rs)
- T064-T065 (notes.rs)
- T066-T069 (structural_events.rs)
```

### MVP Scope

**Minimum Viable Product** = Phase 1 + Phase 2 + Phase 3 (User Story 1)

**Deliverable**: Score with single instrument, staff, voice, and notes
- Create score with default structural events
- Add instrument with default staff and voice
- Add notes with validation
- In-memory persistence
- Complete domain model for basic functionality

**Validation**: Run scenarios from quickstart.md Scenario 1

---

## Implementation Strategy

### Test-First Approach (Constitution Principle V)

While this feature does not explicitly require tests in the specification, the constitution mandates test-first development. Consider:

1. **Unit Tests**: Add backend/tests/unit/ tests for domain logic (validation rules, invariants)
2. **Contract Tests**: Add backend/tests/contract/ tests for API endpoints before implementation
3. **Integration Tests**: Add backend/tests/integration/ tests for end-to-end scenarios

**Recommended TDD workflow** (if implementing tests):
- Write test for domain entity → verify fails → implement entity → verify passes
- Write contract test for API endpoint → verify fails → implement endpoint → verify passes

### Incremental Delivery

- **Sprint 1**: Phase 1 + Phase 2 + Phase 3 (US1) = MVP
- **Sprint 2**: Phase 4 (US2) + Phase 5 (US3) = Multi-staff + polyphony
- **Sprint 3**: Phase 6 (US4) + Phase 7 (US5) = Structural event management
- **Sprint 4**: Phase 8 (API) + Phase 9 (Frontend) = Full stack
- **Sprint 5**: Phase 10 (Polish) = Production-ready

### Code Review Checkpoints

- [X] Phase 2 complete: Review value objects and domain errors
- [X] Phase 3 complete: Review US1 domain model (Score, Instrument, Staff, Voice, Note)
- [X] Phase 8 complete: Review API adapter implementation (✅ 94 tests passing: 76 unit + 18 integration)
- [ ] Phase 9 complete: Review frontend integration
- [ ] Phase 10 complete: Final code review and documentation

---

## Task Summary

**Total Tasks**: 93  
**Setup Tasks**: 7 (Phase 1)  
**Foundational Tasks**: 5 (Phase 2)  
**User Story Tasks**: 41 (Phases 3-7)
  - US1: 24 tasks
  - US2: 4 tasks
  - US3: 5 tasks
  - US4: 4 tasks
  - US5: 4 tasks
**API Tasks**: 20 (Phase 8)  
**Frontend Tasks**: 10 (Phase 9)  
**Polish Tasks**: 10 (Phase 10)

**Parallelizable Tasks**: 48 (marked with [P])  
**MVP Tasks**: 36 (Phase 1 + Phase 2 + Phase 3)

**Estimated Effort**:
- MVP (US1): 2-3 weeks for domain model + basic persistence
- Full domain (US1-US5): 4-5 weeks
- API + Frontend: 2-3 weeks
- Total: 6-8 weeks for complete feature

---

## Validation Checklist

Before marking feature complete, verify:

- [ ] All 11 domain invariants enforced (from data-model.md)
- [ ] All 5 user stories independently testable
- [ ] All 13 API endpoints operational (from contracts/score-api.yaml)
- [ ] Success criteria met:
  - [ ] SC-001: 100 notes added in <30 seconds
  - [ ] SC-002: 100% validation accuracy across test cases
  - [ ] SC-003: 1000-measure score retrieval in <200ms
  - [ ] SC-004: O(1) hierarchy navigation
  - [ ] SC-005: Integer precision maintained up to 1M ticks
- [ ] Constitution compliance:
  - [ ] DDD: Aggregate root, ubiquitous language, domain events
  - [ ] Hexagonal: Domain independent, ports/adapters clear
  - [ ] API-first: Contracts implemented, frontend consumes API
  - [ ] Precision: 960 PPQ, integer arithmetic, no floating-point
  - [ ] Test-first: (if tests added) TDD workflow followed

---

**Next Phase**: Implementation begins with Phase 1 (Setup). Use `/speckit.implement` command to execute tasks or implement manually following this task breakdown.
