# Tasks: Architecture Review

**Input**: Design documents from `/specs/049-architecture-review/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story. US2–US6 each produce one ADR and can run in parallel. US1 consolidates all ADRs into a roadmap and depends on US2–US6 completing first.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Exact file paths included in descriptions

## Path Conventions

- **Documentation**: `specs/049-architecture-review/adrs/`
- **Backend spike**: `backend/benches/`
- **Frontend spike**: `frontend/tests/benchmarks/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create output directory structure and ADR skeletons

- [X] T001 Create ADR output directory at specs/049-architecture-review/adrs/
- [X] T002 [P] Create ADR-049-001 skeleton from contracts/adr-template.md in specs/049-architecture-review/adrs/ADR-049-001-plugin-architecture.md
- [X] T003 [P] Create ADR-049-002 skeleton from contracts/adr-template.md in specs/049-architecture-review/adrs/ADR-049-002-midi-processing.md
- [X] T004 [P] Create ADR-049-003 skeleton from contracts/adr-template.md in specs/049-architecture-review/adrs/ADR-049-003-frontend-framework.md
- [X] T005 [P] Create ADR-049-004 skeleton from contracts/adr-template.md in specs/049-architecture-review/adrs/ADR-049-004-test-strategy.md
- [X] T006 [P] Create ADR-049-005 skeleton from contracts/adr-template.md in specs/049-architecture-review/adrs/ADR-049-005-scalability.md
- [X] T007 Create benchmarks directory at frontend/tests/benchmarks/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Collect codebase metrics and baselines that all ADRs reference

**⚠️ CRITICAL**: No ADR writing can begin until baseline metrics are collected

- [X] T008 Collect plugin system metrics: count built-in plugins, count imported plugin code paths, measure total plugin-related bundle size from frontend/src/services/plugins/ and frontend/src/plugin-api/index.ts
- [X] T009 [P] Collect MIDI processing metrics: count lines of code, list all functions and their complexity from frontend/src/services/recording/midiUtils.ts, frontend/src/services/recording/useMidiInput.ts, frontend/src/services/chord/ChordDetector.ts
- [X] T010 [P] Collect test suite metrics: count test files by category (unit/integration/E2E/Rust), count total test cases, measure pre-push pipeline duration from .githooks/pre-push and frontend/vitest.config.ts
- [X] T011 [P] Analyze frontend/src/App.tsx for architectural coupling: document plugin initialization flow, MIDI routing, event fan-out pattern, and identify merge-conflict-prone sections
- [X] T012 Document all collected metrics as a baseline reference in specs/049-architecture-review/adrs/baseline-metrics.md

**Checkpoint**: Baseline metrics ready — ADR writing can now begin

---

## Phase 3: User Story 2 — Plugin Architecture Scalability Assessment (Priority: P1) 🎯 MVP

**Goal**: Produce ADR-049-001 evaluating plugin architecture scalability for trusted-community model with 20+ plugins, including a synthetic load test spike

**Independent Test**: Review ADR-049-001 confirms: third-party developer experience evaluated, API versioning assessed, 20+ plugin runtime performance measured via spike, action items documented

### Implementation for User Story 2

- [X] T013 [US2] Analyze plugin loading flow: trace builtinPlugins.ts discovery → PluginImporter.ts ZIP import → PluginRegistry.ts IndexedDB storage → App.tsx initialization in frontend/src/services/plugins/
- [X] T014 [P] [US2] Create 20 synthetic plugin stubs (minimal init + Component) for load testing in frontend/tests/benchmarks/plugin-load.test.ts
- [X] T015 [US2] Run plugin load test measuring initialization time for 5, 10, 15, and 20 simultaneous plugins and record results in frontend/tests/benchmarks/plugin-load.test.ts
- [X] T016 [US2] Analyze plugin event fan-out error handling: verify behavior when one plugin handler throws during MIDI event dispatch in frontend/src/App.tsx
- [X] T017 [US2] Write ADR-049-001 Context, Concern, and Alternatives sections using research.md findings and load test results in specs/049-architecture-review/adrs/ADR-049-001-plugin-architecture.md
- [X] T018 [US2] Write ADR-049-001 Decision, Consequences, Risk Assessment, and Action Items sections in specs/049-architecture-review/adrs/ADR-049-001-plugin-architecture.md
- [X] T019 [US2] Validate ADR-049-001 against adr-template.md contract rules (≥2 alternatives, ≥1 action item, risk assessment, mixed-audience language) in specs/049-architecture-review/adrs/ADR-049-001-plugin-architecture.md

**Checkpoint**: ADR-049-001 complete. Plugin load test demonstrates ≤2s init for 20+ plugins (SC-006)

---

## Phase 4: User Story 3 — MIDI Processing Boundary Analysis (Priority: P1)

**Goal**: Produce ADR-049-002 with latency benchmarks comparing TypeScript vs Rust/WASM MIDI parsing, including comparison matrix

**Independent Test**: Review ADR-049-002 confirms: current MIDI complexity documented, latency benchmarks included (SC-005), keep/migrate recommendation stated, comparison matrix present, action items documented

### Implementation for User Story 3

- [X] T020 [US3] Analyze current MIDI processing functions: document complexity, call paths, and latency characteristics from frontend/src/services/recording/midiUtils.ts and frontend/src/services/chord/ChordDetector.ts
- [X] T021 [P] [US3] Create Rust MIDI parsing prototype mirroring parseMidiNoteOn and parseMidiNoteOff functions, exposed via wasm-bindgen in backend/src/adapters/wasm/midi_prototype.rs
- [X] T022 [US3] Create MIDI latency benchmark comparing Rust vs TypeScript for 10,000 parse operations in backend/benches/midi_latency.rs
- [X] T023 [US3] Run MIDI latency benchmark and record comparative results (μs per parse, WASM boundary overhead) in backend/benches/midi_latency.rs
- [X] T024 [US3] Build comparison matrix for MIDI boundary decision (criteria: latency, maintainability, dev velocity, migration cost, WASM overhead) in specs/049-architecture-review/adrs/ADR-049-002-midi-processing.md
- [X] T025 [US3] Write ADR-049-002 Context, Concern, Alternatives, Decision, Consequences, Risk Assessment, and Action Items sections in specs/049-architecture-review/adrs/ADR-049-002-midi-processing.md
- [X] T026 [US3] Validate ADR-049-002 against adr-template.md contract rules (comparison matrix required, ≥2 alternatives, mixed-audience language) in specs/049-architecture-review/adrs/ADR-049-002-midi-processing.md

**Checkpoint**: ADR-049-002 complete. Latency benchmarks demonstrate MIDI processing boundary recommendation (SC-005)

---

## Phase 5: User Story 4 — Frontend Framework Fitness Evaluation (Priority: P2)

**Goal**: Produce ADR-049-003 evaluating React fitness with comparison matrix against alternatives

**Independent Test**: Review ADR-049-003 confirms: React coupling depth analyzed, comparison matrix with ≥2 alternatives present, migration cost estimated, plugin API coupling impact documented

### Implementation for User Story 4

- [X] T027 [P] [US4] Analyze React coupling depth: count React-dependent plugin API surfaces, hooks, shared components, and test dependencies from frontend/src/plugin-api/index.ts and frontend/src/components/
- [X] T028 [US4] Build comparison matrix: React 19 vs Preact vs Solid.js (criteria: plugin coupling impact, bundle size, rendering perf, migration cost, ecosystem maturity) in specs/049-architecture-review/adrs/ADR-049-003-frontend-framework.md
- [X] T029 [US4] Write ADR-049-003 Context, Concern, Alternatives, Decision, Consequences, Risk Assessment, and Action Items sections in specs/049-architecture-review/adrs/ADR-049-003-frontend-framework.md
- [X] T030 [US4] Validate ADR-049-003 against adr-template.md contract rules (comparison matrix required, migration cost documented, mixed-audience language) in specs/049-architecture-review/adrs/ADR-049-003-frontend-framework.md

**Checkpoint**: ADR-049-003 complete. Framework decision documented with migration threshold (FR-005)

---

## Phase 6: User Story 5 — Test Strategy Rationalization (Priority: P2)

**Goal**: Produce ADR-049-004 analyzing test coverage overlap and recommending pipeline optimizations, identifying ≥10% consolidation candidates

**Independent Test**: Review ADR-049-004 confirms: test coverage overlap analyzed, redundant tests identified (≥10% per SC-004), pipeline optimization proposed, action items documented

### Implementation for User Story 5

- [X] T031 [P] [US5] Catalog all test files by category (unit/integration/E2E/Rust) and map coverage boundaries from frontend/tests/, frontend/e2e/, backend/tests/
- [X] T032 [US5] Identify cross-level redundancy: list integration tests whose scenarios are fully covered by E2E tests or unit tests from frontend/tests/ and frontend/e2e/
- [X] T033 [US5] Analyze pre-push pipeline timing and identify parallelization opportunities from .githooks/pre-push
- [X] T034 [US5] Write ADR-049-004 Context, Concern, Alternatives, Decision, Consequences, Risk Assessment, and Action Items sections in specs/049-architecture-review/adrs/ADR-049-004-test-strategy.md
- [X] T035 [US5] Validate ADR-049-004 against adr-template.md contract rules (≥10% reduction target addressed, pipeline optimization included, mixed-audience language) in specs/049-architecture-review/adrs/ADR-049-004-test-strategy.md

**Checkpoint**: ADR-049-004 complete. ≥10% test consolidation candidates identified (SC-004)

---

## Phase 7: User Story 6 — Scalability Readiness Assessment (Priority: P2)

**Goal**: Produce ADR-049-005 evaluating developer scalability (20+ devs) and user scalability (thousands of users) with concrete thresholds

**Independent Test**: Review ADR-049-005 confirms: developer bottlenecks identified with thresholds (SC-007), user scalability limits documented, monorepo recommendations stated, action items documented

### Implementation for User Story 6

- [X] T036 [P] [US6] Analyze monorepo structure for developer scalability: measure App.tsx merge-conflict risk, build time projections, identify missing CODEOWNERS patterns from frontend/src/App.tsx and root directory
- [X] T037 [US6] Evaluate user scalability for local-first PWA: IndexedDB quota analysis, service worker update distribution, static asset CDN capacity, offline reliability limits
- [X] T038 [US6] Write ADR-049-005 Context, Concern, Alternatives, Decision, Consequences, Risk Assessment, and Action Items sections with concrete thresholds in specs/049-architecture-review/adrs/ADR-049-005-scalability.md
- [X] T039 [US6] Validate ADR-049-005 against adr-template.md contract rules (developer + user scalability addressed, thresholds quantified, mixed-audience language) in specs/049-architecture-review/adrs/ADR-049-005-scalability.md

**Checkpoint**: ADR-049-005 complete. Scalability bottlenecks identified with concrete thresholds (SC-007)

---

## Phase 8: User Story 1 — ADR Consolidation & Roadmap (Priority: P1)

**Goal**: Collect all action items from ADRs 001–005, compile prioritized roadmap across 3 planning cycles, and cross-review all ADRs for consistency and completeness

**Independent Test**: Review all 5 ADRs and roadmap confirms: every ADR follows the template contract, all action items appear in exactly one planning cycle, roadmap is sequenced by impact and effort, a new team member can understand rationale without verbal explanation (SC-008)

### Implementation for User Story 1

- [X] T040 [US1] Collect all action items from ADR-049-001 through ADR-049-005 and create a master action item inventory in specs/049-architecture-review/adrs/action-items-inventory.md
- [X] T041 [US1] Compile prioritized roadmap using contracts/roadmap-template.md: assign action items to 3 planning cycles by impact and effort in specs/049-architecture-review/roadmap.md
- [X] T042 [US1] Validate roadmap against roadmap contract rules (all action items present exactly once, P1 items in Cycle 1 or 2, dependencies satisfied) in specs/049-architecture-review/roadmap.md
- [X] T043 [US1] Cross-review all 5 ADRs for consistency: verify terminology alignment, no contradictory recommendations, audience clarity (FR-008) across specs/049-architecture-review/adrs/ADR-049-*.md
- [X] T044 [US1] Verify each ADR has ≥2 alternatives, ≥1 action item, risk assessment, and non-empty required sections per adr-template.md contract across all ADR files
- [X] T045 [US1] Verify edge cases from spec.md are addressed: React migration cost accounts for plugins and tests, MIDI latency stays under 10ms threshold, test reduction doesn't lose regression detection, plugin changes don't break backward compatibility, PWA cache implications documented

**Checkpoint**: All 5 ADRs accepted. Roadmap ready. Feature deliverables complete (SC-001, SC-003)

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation and validation

- [X] T046 [P] Update specs/049-architecture-review/quickstart.md with final file paths and any workflow changes discovered during implementation
- [X] T047 Run quickstart.md validation: verify all referenced files exist and all steps can be followed by a new team member
- [X] T048 Clean up temporary spike artifacts if not intended for permanent inclusion (document decision in ADR action items)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001, T007 for directories)
- **US2 Plugin ADR (Phase 3)**: Depends on Foundational (T012 baseline metrics)
- **US3 MIDI ADR (Phase 4)**: Depends on Foundational (T012 baseline metrics)
- **US4 Framework ADR (Phase 5)**: Depends on Foundational (T012 baseline metrics)
- **US5 Test Strategy ADR (Phase 6)**: Depends on Foundational (T012 baseline metrics)
- **US6 Scalability ADR (Phase 7)**: Depends on Foundational (T012 baseline metrics)
- **US1 Consolidation (Phase 8)**: Depends on ALL ADRs complete (Phases 3–7)
- **Polish (Phase 9)**: Depends on US1 (Phase 8)

### User Story Dependencies

- **US2 (P1)**: Can start after Foundational — No dependencies on other stories
- **US3 (P1)**: Can start after Foundational — No dependencies on other stories
- **US4 (P2)**: Can start after Foundational — No dependencies on other stories
- **US5 (P2)**: Can start after Foundational — No dependencies on other stories
- **US6 (P2)**: Can start after Foundational — No dependencies on other stories
- **US1 (P1)**: Depends on US2, US3, US4, US5, US6 all complete — consolidation story

### Within Each User Story

- Analysis tasks before writing tasks
- Spike/benchmark tasks before ADR writing (results feed into ADR)
- ADR writing before validation
- All stories independent of each other (can run in parallel)

### Parallel Opportunities

- All ADR skeleton tasks (T002–T006) can run in parallel
- All foundational metric collection tasks (T008–T011) can run in parallel
- **US2 and US3 can run in full parallel** (different files, different concern areas)
- **US4, US5, and US6 can run in full parallel** (different files, different concern areas)
- All 5 user stories (US2–US6) can theoretically run in parallel after Foundational
- Within US2: T014 (plugin stubs) can run parallel to T013 (analysis)
- Within US3: T021 (Rust prototype) can run parallel to T020 (analysis)
- Within US4: T027 (coupling analysis) can start immediately
- Within US5: T031 (test catalog) can start immediately
- Within US6: T036 (monorepo analysis) can start immediately
- Polish tasks (T046) can run parallel to T047

---

## Parallel Example: User Stories 2 & 3 (P1)

```bash
# After Foundational (Phase 2) completes:

# Team Member A — US2 Plugin Architecture:
Task: "Analyze plugin loading flow in frontend/src/services/plugins/"
Task: "Create 20 synthetic plugin stubs in frontend/tests/benchmarks/plugin-load.test.ts"
Task: "Run plugin load test and record results"
Task: "Write ADR-049-001"

# Team Member B — US3 MIDI Processing (runs simultaneously):
Task: "Analyze MIDI processing functions in frontend/src/services/recording/"
Task: "Create Rust MIDI parsing prototype in backend/src/adapters/wasm/midi_prototype.rs"
Task: "Create MIDI latency benchmark in backend/benches/midi_latency.rs"
Task: "Write ADR-049-002"
```

## Parallel Example: User Stories 4, 5 & 6 (P2)

```bash
# After Foundational (Phase 2) completes (can also run alongside US2 & US3):

# Team Member C — US4 Frontend Framework:
Task: "Analyze React coupling depth from frontend/src/plugin-api/"
Task: "Build comparison matrix and write ADR-049-003"

# Team Member D — US5 Test Strategy:
Task: "Catalog test files from frontend/tests/ and frontend/e2e/"
Task: "Identify cross-level redundancy and write ADR-049-004"

# Team Member E — US6 Scalability:
Task: "Analyze monorepo structure from root directory"
Task: "Write ADR-049-005 with concrete thresholds"
```

---

## Implementation Strategy

### MVP First (User Stories 2 & 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational metrics collection
3. Complete Phase 3: US2 — Plugin Architecture ADR + load test spike
4. Complete Phase 4: US3 — MIDI Processing ADR + latency benchmark spike
5. **STOP and VALIDATE**: Two P1 ADRs with spike evidence ready for review

### Incremental Delivery

1. Complete Setup + Foundational → Baselines ready
2. Add US2 (Plugin ADR + spike) → Independently reviewable → Share findings
3. Add US3 (MIDI ADR + spike) → Independently reviewable → Share findings
4. Add US4 (Framework ADR) → Independently reviewable → Share findings
5. Add US5 (Test Strategy ADR) → Independently reviewable → Share findings
6. Add US6 (Scalability ADR) → Independently reviewable → Share findings
7. Add US1 (Consolidation + Roadmap) → All deliverables complete
8. Each ADR adds value without depending on other ADRs

### Parallel Team Strategy

With multiple contributors:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Contributor A: US2 (Plugin ADR)
   - Contributor B: US3 (MIDI ADR)
   - Contributor C: US4 (Framework ADR)
   - Contributor D: US5 (Test Strategy ADR)
   - Contributor E: US6 (Scalability ADR)
3. All 5 ADRs complete → Any contributor: US1 (Consolidation + Roadmap)
4. Final: Polish & validation

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- ADR numbering: ADR-049-001 (Plugin) through ADR-049-005 (Scalability) per contracts/adr-template.md
- Spike code is temporary benchmark code, not production features
- All ADRs must pass validation rules from contracts/adr-template.md before consolidation
