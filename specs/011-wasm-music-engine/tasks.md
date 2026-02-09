# Tasks: WASM Music Engine Integration

**Feature**: 011-wasm-music-engine  
**Input**: Design documents from `/specs/011-wasm-music-engine/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: NOT requested in specification - test tasks omitted per template instructions

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **Checkbox**: `- [ ]` marks incomplete task
- **[ID]**: Sequential task number (T001, T002, T003...)
- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3])
- **Description**: Clear action with exact file path

## Path Conventions

This is a monorepo web application:
- Backend: `backend/src/`
- Frontend: `frontend/src/`
- WASM output: `frontend/public/wasm/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install toolchain and configure build pipeline for WASM compilation

- [X] T001 Install wasm-pack toolchain: `cargo install wasm-pack`
- [X] T002 Add WASM target to Rust: `rustup target add wasm32-unknown-unknown`
- [X] T003 [P] Configure Cargo.toml with WASM dependencies (wasm-bindgen, serde-wasm-bindgen) in backend/Cargo.toml
- [X] T004 [P] Add WASM release profile (opt-level="z", lto=true, strip=true, panic="abort") in backend/Cargo.toml
- [X] T005 [P] Set crate-type to ["cdylib", "rlib"] to enable library compilation in backend/Cargo.toml
- [X] T006 [P] Install vite-plugin-static-copy for WASM file handling: `cd frontend && npm install vite-plugin-static-copy`
- [X] T007 [P] Configure Vite to copy WASM artifacts to public/wasm/ in frontend/vite.config.ts
- [X] T008 Verify WASM target compiles: `cd backend && cargo check --target wasm32-unknown-unknown --lib`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core WASM adapter infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend WASM Adapter Structure

- [X] T009 Create WASM adapter directory structure: `backend/src/adapters/wasm/`
- [X] T010 [P] Create error handling module in backend/src/adapters/wasm/error_handling.rs
- [X] T011 [P] Implement WasmError struct with Serialize derive in backend/src/adapters/wasm/error_handling.rs
- [X] T012 [P] Implement From<DomainError> for WasmError conversion in backend/src/adapters/wasm/error_handling.rs
- [X] T013 [P] Create to_js_error function that converts DomainError to JsValue in backend/src/adapters/wasm/error_handling.rs
- [X] T014 [P] Create bindings module in backend/src/adapters/wasm/bindings.rs
- [X] T015 [P] Create main WASM adapter module file in backend/src/adapters/wasm/mod.rs
- [X] T016 [P] Add #[cfg(target_arch = "wasm32")] conditional compilation guards in backend/src/lib.rs
- [X] T017 Expose domain module as public library in backend/src/lib.rs

### Frontend WASM Loader Infrastructure

- [X] T018 Create WASM services directory: `frontend/src/services/wasm/`
- [X] T019 [P] Create WASM loader module in frontend/src/services/wasm/loader.ts
- [X] T020 [P] Implement initWasm function with async module loading in frontend/src/services/wasm/loader.ts
- [X] T021 [P] Implement getWasmModule function with initialization check in frontend/src/services/wasm/loader.ts
- [X] T022 [P] Add WASM initialization state management (wasmInitialized flag) in frontend/src/services/wasm/loader.ts
- [X] T023 [P] Create TypeScript wrapper module skeleton in frontend/src/services/wasm/music-engine.ts
- [X] T024 [P] Create WASM error type definitions in frontend/src/types/wasm-error.ts
- [X] T025 Add WASM initialization to App component in frontend/src/App.tsx
- [X] T026 Add WASM loading state UI (loading indicator) in frontend/src/App.tsx
- [X] T027 Add WASM error state UI (browser compatibility message) in frontend/src/App.tsx

### Build Pipeline

- [X] T028 Create WASM build script in backend/scripts/build-wasm.sh
- [X] T029 Add npm script "build:wasm" to run wasm-pack build in frontend/package.json
- [X] T030 Verify WASM build produces artifacts in frontend/public/wasm/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Instant Score Parsing (Priority: P1) 🎯 MVP

**Goal**: Parse MusicXML files instantly in browser (<100ms) without server requests, eliminating network latency for the most common operation

**Independent Test**: Upload a MusicXML file (50-200 measures) and verify it renders in under 100ms without network requests. Verify invalid MusicXML shows errors immediately.

**Value Delivered**: Users see their notation rendered immediately with no waiting for server responses. This is the core value proposition of the WASM migration.

### WASM Export Implementation

- [X] T031 [P] [US1] Implement parse_musicxml function with wasm-bindgen attribute in backend/src/adapters/wasm/bindings.rs
- [X] T032 [P] [US1] Add XML bytes to Score deserialization in backend/src/adapters/wasm/bindings.rs
- [X] T033 [P] [US1] Add Score to JsValue serialization using serde-wasm-bindgen in backend/src/adapters/wasm/bindings.rs
- [X] T034 [P] [US1] Add error handling for ParseError and ValidationError in backend/src/adapters/wasm/bindings.rs
- [X] T035 [US1] Build WASM module with parse_musicxml export: `wasm-pack build --target web`
- [X] T036 [US1] Verify WASM artifacts generated (musiccore_bg.wasm, musiccore.js) in frontend/public/wasm/

### Frontend Integration

- [X] T037 [P] [US1] Add parseMusicXML wrapper function to music-engine.ts in frontend/src/services/wasm/music-engine.ts
- [X] T038 [P] [US1] Add proper TypeScript typing (Uint8Array → Score) in frontend/src/services/wasm/music-engine.ts
- [X] T039 [P] [US1] Add error handling with WasmError type checking in frontend/src/services/wasm/music-engine.ts
- [X] T040 [P] [US1] Add JSZip dependency for .mxl decompression: `cd frontend && npm install jszip`
- [X] T041 [US1] Replace REST API call with WASM parseMusicXML in frontend/src/services/import/MusicXMLImportService.ts
- [X] T042 [US1] Add .mxl file decompression logic (extract MusicXML bytes) in frontend/src/services/import/MusicXMLImportService.ts
- [X] T043 [US1] Update error handling to catch WasmError in frontend/src/services/import/MusicXMLImportService.ts

### Validation

- [ ] T044 [US1] Manual test: Upload small MusicXML file (50 measures), verify <100ms parse time
- [ ] T045 [US1] Manual test: Upload large MusicXML file (200 measures), verify <500ms parse time
- [ ] T046 [US1] Manual test: Upload invalid MusicXML, verify clear error message
- [X] T047 [US1] Run existing frontend integration tests, verify all pass with WASM backend (418/420 passing - 2 pre-existing failures unrelated to WASM)
- [ ] T048 [US1] Verify network tab shows zero requests to backend for MusicXML parsing

**Validation Test Guide**: See `validation-test.md` in this directory for detailed test procedures

**Checkpoint**: At this point, MusicXML parsing works instantly in browser with no network requests. User Story 1 is complete and independently testable.

---

## Phase 4: User Story 2 - Offline Score Editing (Priority: P2)

**Goal**: Enable users to work completely offline - load scores, edit them, and play them without internet connection. All music domain logic runs locally in the browser.

**Independent Test**: Disconnect from network (or use browser offline mode), upload MusicXML file, trigger playback, verify all operations work without errors. Reload page and verify previously loaded scores are still accessible.

**Value Delivered**: Users can work on planes, trains, or locations with poor connectivity. No more "connection lost" errors during music editing.

### Remaining WASM Exports (Domain Operations)

- [X] T049 [P] [US2] Implement create_score function in backend/src/adapters/wasm/bindings.rs
- [X] T050 [P] [US2] Implement add_instrument function with Score serialization in backend/src/adapters/wasm/bindings.rs
- [X] T051 [P] [US2] Implement add_staff function with instrument_id resolution in backend/src/adapters/wasm/bindings.rs
- [X] T052 [P] [US2] Implement add_voice function with staff_id resolution in backend/src/adapters/wasm/bindings.rs
- [X] T053 [P] [US2] Implement add_note function with domain validation in backend/src/adapters/wasm/bindings.rs
- [X] T054 [P] [US2] Implement add_tempo_event function in backend/src/adapters/wasm/bindings.rs
- [X] T055 [P] [US2] Implement add_time_signature_event function in backend/src/adapters/wasm/bindings.rs
- [X] T056 [P] [US2] Implement add_clef_event function in backend/src/adapters/wasm/bindings.rs
- [X] T057 [P] [US2] Implement add_key_signature_event function in backend/src/adapters/wasm/bindings.rs
- [X] T058 [US2] Rebuild WASM module with all domain operations: `wasm-pack build --target web`

### Frontend Wrapper Functions

- [X] T059 [P] [US2] Add createScore wrapper function in frontend/src/services/wasm/music-engine.ts
- [X] T060 [P] [US2] Add addInstrument wrapper function in frontend/src/services/wasm/music-engine.ts
- [X] T061 [P] [US2] Add addStaff wrapper function in frontend/src/services/wasm/music-engine.ts
- [X] T062 [P] [US2] Add addVoice wrapper function in frontend/src/services/wasm/music-engine.ts
- [X] T063 [P] [US2] Add addNote wrapper function in frontend/src/services/wasm/music-engine.ts
- [X] T064 [P] [US2] Add addTempoEvent wrapper function in frontend/src/services/wasm/music-engine.ts
- [X] T065 [P] [US2] Add addTimeSignatureEvent wrapper function in frontend/src/services/wasm/music-engine.ts
- [X] T066 [P] [US2] Add addClefEvent wrapper function in frontend/src/services/wasm/music-engine.ts
- [X] T067 [P] [US2] Add addKeySignatureEvent wrapper function in frontend/src/services/wasm/music-engine.ts

### Replace REST API Calls Throughout Frontend

- [X] T068 [US2] Identify all ScoreApiClient usages: `cd frontend && grep -r "ScoreApiClient" src/`
- [X] T069 [US2] Replace ScoreApiClient.createScore with WASM createScore in frontend components
- [X] T070 [US2] Replace ScoreApiClient.addInstrument with WASM addInstrument in frontend components
- [ ] T071 [US2] Replace ScoreApiClient.addNote with WASM addNote in frontend components (requires component refactoring)
- [ ] T072 [US2] Update error handling from ApiError to WasmError in frontend components (requires component refactoring)
- [ ] T073 [US2] Remove ScoreApiClient class (mark deprecated if gradual migration) in frontend/src/services/score-api.ts (deferred)

### Offline Capabilities

- [X] T074 [P] [US2] Add offline detection using navigator.onLine in frontend/src/hooks/useOfflineDetection.ts
- [X] T075 [P] [US2] Add offline banner UI component in frontend/src/components/OfflineBanner.tsx
- [X] T076 [P] [US2] Add IndexedDB or localStorage for score persistence in frontend/src/services/storage/local-storage.ts
- [X] T077 [US2] Integrate offline banner into App component in frontend/src/App.tsx
- [X] T078 [US2] Add score caching to IndexedDB when loaded in frontend/src/services/score-cache.ts

### Validation

- [ ] T079 [US2] Manual test: Enable browser offline mode, upload MusicXML, verify parsing works
- [ ] T080 [US2] Manual test: While offline, add instruments and notes, verify all operations work
- [ ] T081 [US2] Manual test: While offline, trigger playback, verify audio plays (Tone.js works offline)
- [ ] T082 [US2] Manual test: Reload page while offline, verify cached scores load from IndexedDB
- [ ] T083 [US2] Run existing integration tests, verify 100% pass with WASM implementation
- [ ] T084 [US2] Verify zero backend requests for domain operations in network tab

**Checkpoint**: At this point, all music domain operations work offline. User Stories 1 AND 2 are both complete and independently functional.

---

## Phase 5: User Story 3 - Reduced Server Load (Priority: P3)

**Goal**: Reduce server CPU usage by 80%+ for music operations by moving processing to client browsers. This enables scaling to more users without proportionally increasing infrastructure costs.

**Independent Test**: Run load test with 100 concurrent users parsing scores, measure server CPU compared to previous REST API baseline. Verify server CPU <20% of baseline.

**Value Delivered**: Lower hosting costs and improved scalability. Server resources freed up for other operations (file storage, authentication, collaboration features).

### Server-Side Changes (Optional Deprecation)

- [ ] T085 [P] [US3] Add deprecation warnings to REST API music endpoints in backend/src/adapters/api/routes.rs
- [ ] T086 [P] [US3] Update API documentation to indicate WASM preferred approach in backend/docs/api.md
- [ ] T087 [US3] Consider removing unused MusicXML parsing endpoints (if fully migrated) in backend/src/adapters/api/routes.rs

### Telemetry & Monitoring

- [ ] T088 [P] [US3] Add telemetry event for WASM load success in frontend/src/services/wasm/loader.ts
- [ ] T089 [P] [US3] Add telemetry event for WASM load failure in frontend/src/services/wasm/loader.ts
- [ ] T090 [P] [US3] Add parse time measurement and logging in frontend/src/services/wasm/music-engine.ts
- [ ] T091 [P] [US3] Add server-side metrics endpoint for CPU usage in backend/src/adapters/api/metrics.rs
- [ ] T092 [US3] Configure server metrics collection (expose /metrics endpoint) in backend/src/main.rs

### Load Testing & Benchmarking

- [ ] T093 [P] [US3] Create load test script with 100 concurrent users in specs/011-wasm-music-engine/tests/load-test.js
- [ ] T094 [P] [US3] Add baseline measurement script (REST API) in specs/011-wasm-music-engine/tests/baseline-rest.js
- [ ] T095 [US3] Run baseline load test (REST API) and record server CPU usage
- [ ] T096 [US3] Run WASM load test and record server CPU usage
- [ ] T097 [US3] Calculate CPU reduction percentage, verify >80% reduction
- [ ] T098 [US3] Document baseline vs WASM metrics in specs/011-wasm-music-engine/benchmarks.md

### Production Telemetry Validation

- [ ] T099 [US3] Deploy to staging environment with telemetry enabled
- [ ] T100 [US3] Monitor WASM load success rate for 48 hours
- [ ] T101 [US3] Verify 95%+ browser sessions successfully load WASM
- [ ] T102 [US3] Monitor server /metrics endpoint for zero MusicXML parsing requests
- [ ] T103 [US3] Document telemetry findings in specs/011-wasm-music-engine/telemetry-report.md

**Checkpoint**: All user stories (1, 2, 3) are now complete and independently functional. Server costs reduced by 80%+.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Optimization, documentation, and production readiness improvements that affect multiple user stories

### Bundle Size Optimization

- [ ] T104 [P] Verify WASM binary size <500KB gzipped using `gzip -9 < musiccore_bg.wasm | wc -c`
- [ ] T105 [P] Run wasm-opt optimization if size exceeds target: `wasm-opt -Oz -o optimized.wasm musiccore_bg.wasm`
- [ ] T106 [P] Add CI check to fail if WASM bundle exceeds 400KB gzipped in .github/workflows/wasm-build.yml

### Performance Benchmarking

- [ ] T107 [P] Benchmark parse time for small files (50 measures) in browser DevTools
- [ ] T108 [P] Benchmark parse time for medium files (200 measures) in browser DevTools
- [ ] T109 [P] Benchmark parse time for large files (1000 measures) in browser DevTools
- [ ] T110 Verify all parse times meet success criteria (<100ms typical, <500ms large) per spec.md

### Browser Compatibility

- [ ] T111 [P] Test WASM loading in Chrome 57+ (verify WebAssembly support)
- [ ] T112 [P] Test WASM loading in Firefox 52+ (verify WebAssembly support)
- [ ] T113 [P] Test WASM loading in Safari 11+ (verify WebAssembly support)
- [ ] T114 [P] Test WASM loading in Edge 16+ (verify WebAssembly support)
- [ ] T115 Test graceful degradation on IE11 (expect clear error message)

### Documentation

- [ ] T116 [P] Update main README.md with WASM build instructions in README.md
- [ ] T117 [P] Document WASM browser requirements in docs/requirements.md
- [ ] T118 [P] Add WASM troubleshooting guide in docs/troubleshooting-wasm.md
- [ ] T119 [P] Update CONTRIBUTING.md with WASM development workflow in CONTRIBUTING.md

### CI/CD Pipeline

- [ ] T120 Create GitHub Actions workflow for WASM build in .github/workflows/wasm-build.yml
- [ ] T121 Add WASM test step to CI pipeline (wasm-pack test --headless) in .github/workflows/wasm-build.yml
- [ ] T122 Add WASM artifact upload to workflow in .github/workflows/wasm-build.yml
- [ ] T123 Verify CI passes with all WASM checks

### Production Readiness

- [ ] T124 Run complete quickstart.md validation checklist per specs/011-wasm-music-engine/quickstart.md
- [ ] T125 Verify all acceptance scenarios from spec.md user stories
- [ ] T126 Code cleanup: Remove commented-out REST API code
- [ ] T127 Security review: Ensure WASM error messages don't leak sensitive data

---

## Dependencies & Execution Order

### Phase Dependencies

```
Setup (Phase 1)
    ↓
Foundational (Phase 2) ← CRITICAL BLOCKER
    ↓
┌───────────────────────┬──────────────────────────┬─────────────────────────┐
│ User Story 1 (Phase 3) │ User Story 2 (Phase 4)    │ User Story 3 (Phase 5)  │
│ Instant Parsing (P1)   │ Offline Editing (P2)      │ Reduced Load (P3)       │
│ MVP - Ship First! 🎯   │ Can run in parallel       │ Can run in parallel     │
└───────────────────────┴──────────────────────────┴─────────────────────────┘
    ↓
Polish (Phase 6) - Depends on all desired stories
```

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - Can proceed in parallel if staffed by multiple developers
  - Or sequentially in priority order: US1 → US2 → US3
  - **US1 is MVP** - can ship after US1 completion for early value delivery
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Instant Parsing**: Can start immediately after Foundational (Phase 2)
  - No dependencies on other stories
  - **This is the MVP** - delivers core value (instant parsing)
  
- **User Story 2 (P2) - Offline Editing**: Can start after Foundational (Phase 2)
  - **Depends on US1 completing** T031-T036 (parse_musicxml export) for full offline capability
  - Otherwise independent and testable
  
- **User Story 3 (P3) - Reduced Load**: Can start after Foundational (Phase 2)
  - Depends on US1 and US2 for telemetry measurement (need WASM fully implemented)
  - Primarily monitoring and measurement work

### Within Each User Story

**User Story 1 (Instant Parsing)**:
1. WASM export (T031-T036) - implements parse_musicxml
2. Frontend integration (T037-T043) - replaces REST API
3. Validation (T044-T048) - verifies success criteria

**User Story 2 (Offline Editing)**:
1. Remaining WASM exports (T049-T058) - all domain operations
2. Frontend wrappers (T059-T067) - typed TypeScript functions
3. Replace API calls (T068-T073) - remove REST dependencies
4. Offline capabilities (T074-T078) - detection and persistence
5. Validation (T079-T084) - verify offline works

**User Story 3 (Reduced Load)**:
1. Server changes (T085-T087) - deprecation and cleanup
2. Telemetry (T088-T092) - monitoring infrastructure
3. Load testing (T093-T098) - measure CPU reduction
4. Production validation (T099-T103) - verify metrics

### Parallel Opportunities

#### Phase 1 (Setup) - All can run in parallel:
- T003, T004, T005 (Cargo.toml changes - can batch)
- T006, T007 (Vite config - separate developer)

#### Phase 2 (Foundational) - Backend and frontend in parallel:
**Backend Team**:
- T010, T011, T012, T013 (error handling - one dev)
- T014, T015 (bindings modules - one dev)
- T016, T017 (lib.rs changes - one dev)

**Frontend Team**:
- T019, T020, T021, T022 (loader module)
- T023, T024 (wrapper skeleton and types)
- T025, T026, T027 (App component WASM integration)

#### Phase 3 (User Story 1) - Backend and frontend in parallel:
**Backend**: T031-T036 (WASM export implementation)
**Frontend**: T037-T043 (Frontend integration)  
Can work simultaneously once T035 completes (WASM built)

#### Phase 4 (User Story 2) - Maximum parallelization:
**Backend**: T049-T058 (9 WASM exports) - all [P] marked, can implement simultaneously
**Frontend**: T059-T067 (9 wrapper functions) - all [P] marked, can implement simultaneously
**Offline**: T074-T076 (3 offline features) - all [P] marked, can implement simultaneously

#### Phase 5 (User Story 3) - Telemetry, load testing, and server changes in parallel:
- T085-T087 (server deprecation)
- T088-T092 (telemetry)
- T093-T094 (load test scripts)

#### Phase 6 (Polish) - High parallelization:
- T104-T106 (bundle size)
- T107-T110 (benchmarking)
- T111-T115 (browser compatibility)
- T116-T119 (documentation)

---

## Parallel Example: User Story 2 (Offline Editing)

Maximum parallel efficiency with 3 developers:

```bash
# Developer A (Backend WASM Exports):
T049: create_score
T050: add_instrument  
T051: add_staff
T052: add_voice
T053: add_note
T054: add_tempo_event
T055: add_time_signature_event
T056: add_clef_event
T057: add_key_signature_event
# All in backend/src/adapters/wasm/bindings.rs

# Developer B (Frontend Wrappers):
T059-T067: All wrapper functions in frontend/src/services/wasm/music-engine.ts
# Wait for T058 (WASM build) before testing

# Developer C (Offline Features):
T074: useOfflineDetection hook
T075: OfflineBanner component
T076: local-storage.ts
T077: Integrate banner
T078: Score caching
```

All developers can work simultaneously on different files with zero conflicts.

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended for Fast Value Delivery

1. ✅ Complete Phase 1: Setup (T001-T008) - ~30 minutes
2. ✅ Complete Phase 2: Foundational (T009-T030) - ~4 hours
3. ✅ Complete Phase 3: User Story 1 (T031-T048) - ~3 hours
4. **STOP and VALIDATE**: Test instant parsing independently
5. 🚀 **Deploy MVP** - Users get instant MusicXML parsing with no network latency
6. Gather feedback before continuing to US2/US3

**MVP Delivers**:
- ✅ Core value: Instant score parsing (<100ms)
- ✅ No network latency for most common operation
- ✅ Clear validation errors without server roundtrip
- ✅ Measurable improvement in user experience

### Incremental Delivery (All User Stories) - Recommended for Full Feature

1. Foundation: Setup + Foundational (T001-T030) - ~4.5 hours
2. **MVP Release**: User Story 1 (T031-T048) - ~3 hours → 🚀 **Deploy & Demo**
3. **Iteration 2**: User Story 2 (T049-T084) - ~6 hours → 🚀 **Deploy & Demo**
4. **Iteration 3**: User Story 3 (T085-T103) - ~3 hours → 🚀 **Deploy & Demo**
5. **Final Polish**: Phase 6 (T104-T127) - ~2 hours → 🚀 **Production Ready**

Each iteration adds value without breaking previous functionality.

### Parallel Team Strategy (Multiple Developers)

With 3 developers working concurrently:

**Day 1 (Setup + Foundation)**: All developers work together
- Complete Phase 1 and Phase 2 (T001-T030)
- **Checkpoint**: Foundation ready

**Day 2-3 (User Stories in Parallel)**:
- **Developer A**: User Story 1 (T031-T048) - **MVP Priority**
- **Developer B**: User Story 2 backend (T049-T058)
- **Developer C**: User Story 2 frontend (T059-T067, T074-T078)

**Day 4 (Integration + US3)**:
- **All**: Validate US1 and US2 work independently
- **Developer A**: User Story 3 (T085-T103)
- **Developers B+C**: Polish tasks (T104-T127)

**Day 5 (Polish + Validation)**:
- **All**: Complete remaining polish tasks, run full validation

**Total Timeline**: 5 days with 3 developers (vs 10-12 days with 1 developer)

---

## Success Criteria Validation

Reference: [spec.md](spec.md) Success Criteria section

| Criterion | Validation Task(s) | Target | Status |
|-----------|-------------------|--------|--------|
| **SC-001**: Parse time <100ms typical | T044, T107 | 50-200 measures in <100ms | ⏸️ Pending |
| **SC-002**: Load time <500ms | T110, App initialization | WASM module <500ms load, <500KB gzipped | ⏸️ Pending |
| **SC-003**: 100% test parity | T047, T083 | All existing tests pass with WASM | ⏸️ Pending |
| **SC-004**: Offline/online identical | T079-T082 | All operations work offline | ⏸️ Pending |
| **SC-005**: 80% server CPU reduction | T095-T097 | Server CPU <20% of REST baseline | ⏸️ Pending |
| **SC-006**: Zero server parse requests | T048, T084, T102 | Network tab shows no backend calls | ⏸️ Pending |
| **SC-007**: 95% WASM load success | T100-T101 | 48hr telemetry monitoring | ⏸️ Pending |

**Validation Workflow**: After completing all user story phases, run validation tasks in Phase 6 to verify all success criteria are met per spec.md requirements.

---

## Notes

- **[P] tasks** = Different files, no dependencies on incomplete work, can parallelize
- **[Story] label** maps task to specific user story ([US1], [US2], [US3]) for traceability
- Each user story is **independently completable and testable** (verify at checkpoints)
- **Tests NOT included** per template guidance (not requested in specification)
- **Commit frequently**: After each task or logical group
- **Stop at checkpoints**: Validate each story independently before proceeding
- **MVP recommendation**: Ship User Story 1 first for fast value delivery
- **Avoid**: Vague tasks, same-file conflicts, cross-story dependencies that break independence

**Next Step**: Start with Phase 1 (Setup) tasks T001-T008 to install toolchain and configure build pipeline.
