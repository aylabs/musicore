# Tasks: Measure Numbering

**Input**: Design documents from `/specs/020-measure-numbering/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Tests are included following Constitution Principle V (Test-First Development) which is marked NON-NEGOTIABLE.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Data model and type definitions shared by all user stories

- [X] T001 [P] Add `MeasureNumber` struct to `backend/src/layout/types.rs` with fields `number: u32` and `position: Point`, deriving `Debug, Clone, Serialize, Deserialize`
- [X] T002 Add `measure_number: Option<MeasureNumber>` field to `System` struct in `backend/src/layout/types.rs`
- [X] T003 Initialize `measure_number: None` in `create_system` function in `backend/src/layout/breaker.rs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript type definitions that must mirror Rust types before any frontend work

**⚠️ CRITICAL**: No frontend rendering work can begin until this phase is complete

- [X] T004 [P] Add `MeasureNumber` interface (`number: number`, `position: Point`) to `frontend/src/wasm/layout.ts`
- [X] T005 Add optional `measure_number?: MeasureNumber` field to `System` interface in `frontend/src/wasm/layout.ts`

**Checkpoint**: Rust and TypeScript types are in sync — implementation can proceed

---

## Phase 3: User Story 1 — Display Measure Number at Start of Each System (Priority: P1) 🎯 MVP

**Goal**: Each system displays its first measure's 1-based number, positioned above the topmost staff line and horizontally aligned with the clef (x=60.0)

**Independent Test**: Render any score with multiple systems → verify each system shows the correct measure number at the correct position

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T006 [P] [US1] Add unit test `test_measure_number_present_on_system` in `backend/tests/layout_test.rs` — inline single-instrument score → `compute_layout` → assert `systems[0].measure_number.is_some()` and `.number == 1`
- [X] T007 [P] [US1] Add unit test `test_measure_number_sequential_across_systems` in `backend/tests/layout_test.rs` — inline score with enough measures for 3+ systems → assert each system's `measure_number.number` is sequential (1, N, M where N and M are correct based on tick ranges)
- [X] T008 [P] [US1] Add unit test `test_measure_number_position_aligned_with_clef` in `backend/tests/layout_test.rs` — assert `measure_number.position.x == 60.0` and `measure_number.position.y < topmost_staff_line_y` (above staff)
- [X] T009 [P] [US1] Add unit test `test_measure_number_first_system_is_one` in `backend/tests/layout_test.rs` — assert first system always has `measure_number.number == 1`

### Implementation for User Story 1

- [X] T010 [US1] Compute measure number and position for each system in `compute_layout` function in `backend/src/layout/mod.rs` — after staff group population, set `system.measure_number = Some(MeasureNumber { number: (tick_range.start_tick / 3840) + 1, position: Point { x: 60.0, y: system.bounding_box.y - 30.0 } })`
- [X] T011 [US1] Render measure number in `renderSystem()` method in `frontend/src/components/LayoutRenderer.tsx` — if `system.measure_number` exists, create SVG `<text>` element at `position` coordinates with font `system-ui, sans-serif`, fontSize 14, fill color from config

**Checkpoint**: Single-instrument scores display correct measure numbers — User Story 1 is independently testable

---

## Phase 4: User Story 2 — Measure Numbering with Multi-Instrument Scores (Priority: P2)

**Goal**: Multi-instrument scores display exactly one measure number per system, above the topmost staff of the first instrument

**Independent Test**: Render a multi-instrument score → verify only one measure number per system, positioned above the first staff

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T012 [P] [US2] Add integration test `test_measure_number_single_per_multi_instrument_system` in `backend/tests/layout_integration_test.rs` — inline score with 2+ instruments → `compute_layout` → assert each system has exactly one `measure_number` (not per staff group)
- [X] T013 [P] [US2] Add integration test `test_measure_number_above_topmost_staff_multi_instrument` in `backend/tests/layout_integration_test.rs` — assert `measure_number.position.y < first_staff_group.staves[0].staff_lines[0].y_position` for multi-instrument layout

### Implementation for User Story 2

- [X] T014 [US2] Verify measure number computation in `backend/src/layout/mod.rs` handles multi-instrument scores correctly — the measure number is set at the system level (not per staff group), so ensure it remains singular regardless of instrument count. No additional implementation expected if T010 is correct (system-level field), but verify with multi-instrument fixture.

**Checkpoint**: Multi-instrument scores show exactly one measure number per system — both User Stories 1 and 2 are independently functional

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Determinism validation and edge case coverage

- [X] T015 [P] Add determinism test `test_measure_number_deterministic` in `backend/tests/layout_test.rs` — compute layout twice with same input → assert `measure_number` values are identical
- [X] T016 [P] Add edge case test `test_measure_number_single_system_score` in `backend/tests/layout_test.rs` — score that fits in one system → assert system has `measure_number.number == 1`
- [X] T017 Rebuild WASM module by running `backend/scripts/build-wasm.sh` and verify frontend integration
- [X] T018 Run `quickstart.md` validation — render a score in the app and visually confirm measure numbers appear correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Can run in parallel with Phase 1 (different files: Rust vs TypeScript)
- **User Story 1 (Phase 3)**: Depends on Phase 1 (Rust types) and Phase 2 (TS types)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (US1 implementation)
- **Polish (Phase 5)**: Depends on Phase 3 and Phase 4

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend implementation before frontend rendering
- Core computation before rendering display

### Parallel Opportunities

- T001 and T004 can run in parallel (Rust types.rs + TS layout.ts — different files)
- T006, T007, T008, T009 can all run in parallel (all test functions in same file, no deps)
- T012 and T013 can run in parallel (both integration tests, different assertions)
- T015 and T016 can run in parallel (independent test cases)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T006: "Unit test measure_number_present_on_system in backend/tests/layout_test.rs"
Task T007: "Unit test measure_number_sequential_across_systems in backend/tests/layout_test.rs"
Task T008: "Unit test measure_number_position_aligned_with_clef in backend/tests/layout_test.rs"
Task T009: "Unit test measure_number_first_system_is_one in backend/tests/layout_test.rs"

# Then implementation (sequential — T010 before T011):
Task T010: "Compute measure number in backend/src/layout/mod.rs"
Task T011: "Render measure number in frontend/src/components/LayoutRenderer.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T005)
3. Complete Phase 3: User Story 1 (T006–T011)
4. **STOP and VALIDATE**: Run `cargo test` — all measure numbering tests pass
5. Rebuild WASM and test in browser — measure numbers visible on single-instrument scores

### Incremental Delivery

1. Setup + Foundational → Types ready
2. User Story 1 → Test independently → Single-instrument measure numbering works (MVP!)
3. User Story 2 → Test independently → Multi-instrument scores also correct
4. Polish → Determinism, edge cases, WASM rebuild, visual verification

---

## Notes

- [P] tasks = different files, no dependencies
- [US1]/[US2] label maps task to specific user story for traceability
- The measure number is a system-level field — US2 is largely a verification that US1 already works for multi-instrument scores
- All positioning computed in Rust layout engine (Principle VI) — renderer only reads coordinates
- Measure derivation: `(tick_range.start_tick / 3840) + 1` — integer arithmetic, deterministic
- Total tasks: 18
