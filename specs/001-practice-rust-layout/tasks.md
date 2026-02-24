---
description: "Task list for: Migrate Practice Layout to Rust Layout Engine"
---

# Tasks: Migrate Practice Layout to Rust Layout Engine

**Input**: `specs/001-practice-rust-layout/`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)
**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story ([US1], [US2], [US3])

---

## Phase 1: Setup (Domain Type Update)

**Purpose**: Extend the `ExerciseNote` domain type with a stable `id` field. This change is a prerequisite for all three user stories and has no code risk — it is a pure additive change to an existing interface and its factory functions.

- [ ] T001 Add `id: string` field to `ExerciseNote` interface in `frontend/src/types/practice.ts`
- [ ] T002 Update `generateExercise()` and `generateC4ScaleExercise()` to assign `id: \`ex-${slotIndex}\`` per note in `frontend/src/services/practice/exerciseGenerator.ts`

**Checkpoint**: `ExerciseNote` has an `id` field; all exercise generation paths populate it; existing generator unit tests still pass.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Write the Principle VII regression test for barline overlap and implement the `practiceLayoutAdapter` service used by all three user stories. No user-story work can begin until this phase is complete.

**⚠️ CRITICAL**: Constitution Principle V requires tests written before implementation. Write T003 and T004 before T005.

- [ ] T003 [P] Write Principle VII regression test asserting `barline.x > lastNoteInPriorMeasure.x` for a multi-measure exercise in `frontend/src/services/notation/NotationLayoutEngine.test.ts`
- [ ] T004 [P] Write unit tests for all three adapter functions (`serializeExerciseToLayoutInput`, `buildPracticeSourceToNoteIdMap`, `findPracticeNoteX`) in `frontend/tests/unit/practiceLayoutAdapter.test.ts`
- [ ] T005 Implement `practiceLayoutAdapter.ts` with all three functions: `serializeExerciseToLayoutInput(notes, clef)`, `buildPracticeSourceToNoteIdMap(notes)`, `findPracticeNoteX(layout, slotIndex)` in `frontend/src/services/practice/practiceLayoutAdapter.ts`

**Checkpoint**: T003 test passes (regression protected). T004 tests pass against T005 implementation. `practiceLayoutAdapter.ts` exports all three functions with correct types.

---

## Phase 3: User Story 1 — Exercise Staff Renders via Rust Engine (Priority: P1) 🎯 MVP

**Goal**: Render the exercise staff using `computeLayout` + `LayoutRenderer` instead of `NotationLayoutEngine` + `NotationRenderer`. After this phase the practice view produces visually correct barlines and note spacing identical to the score viewer.

**Independent Test**: Open practice view → press "New Exercise" with 16 notes → verify staff shows correctly-spaced barlines at measure 4 and 8 with no note/barline overlap. Can be verified independently of note highlight or response staff.

- [ ] T006 [US1] Add `wasmReady` state and `initWasm()` call in `useEffect` on mount in `frontend/src/components/practice/PracticeView.tsx`
- [ ] T007 [US1] Replace `NotationLayoutEngine.calculateLayout` call with `serializeExerciseToLayoutInput` + `computeLayout`; change `exerciseLayout` type from `LayoutGeometry` to `GlobalLayout | null` in `frontend/src/components/practice/PracticeView.tsx`
- [ ] T008 [US1] Replace `NotationRenderer` JSX with `LayoutRenderer` for the exercise staff, passing `layout`, `scale={0.5}`, and `max_system_width={99999}` in `frontend/src/components/practice/PracticeView.tsx`
- [ ] T009 [P] [US1] Update `PracticeView.test.tsx`: remove `NotationLayoutEngine` mock, add `computeLayout` mock returning a stub `GlobalLayout`, assert exercise staff renders `LayoutRenderer` in `frontend/src/components/practice/PracticeView.test.tsx`

**Checkpoint**: `PracticeView` renders exercise staff via `LayoutRenderer`. All component tests pass with updated mocks. `NotationLayoutEngine` import count in `PracticeView.tsx` = 0 at end of this phase.

---

## Phase 4: User Story 2 — Highlighted Note Tracks Current Slot by Note ID (Priority: P1)

**Goal**: Express the active slot as a set of note ids and pass it to `LayoutRenderer`; rebuild auto-scroll to query `GlobalLayout` glyph tree via `findPracticeNoteX`. The highlight correctly follows every note in the exercise including the last one.

**Independent Test**: Run a flow-mode exercise with 12 notes. Observe each note highlights in turn. Advance to the last note — it highlights without visual error. Press Stop — no note remains highlighted. Can be tested without response staff.

- [ ] T010 [US2] Build `sourceToNoteIdMap` via `buildPracticeSourceToNoteIdMap(exercise.notes)` on exercise generation and pass to `LayoutRenderer` in `frontend/src/components/practice/PracticeView.tsx`
- [ ] T011 [US2] Replace `highlightedSlotIndex`-as-array-index with `highlightedNoteIds = new Set([\`ex-${highlightedSlotIndex}\`])` and pass to `LayoutRenderer` in `frontend/src/components/practice/PracticeView.tsx`
- [ ] T012 [US2] Replace auto-scroll `exerciseLayout.notes[idx].x` with `findPracticeNoteX(exerciseLayout, idx)` result (handle `null` gracefully) in `frontend/src/components/practice/PracticeView.tsx`
- [ ] T013 [P] [US2] Update `PracticeView.test.tsx` to assert `highlightedNoteIds` prop equals `new Set(["ex-N"])` for the active slot and that `sourceToNoteIdMap` is passed to `LayoutRenderer` in `frontend/src/components/practice/PracticeView.test.tsx`

**Checkpoint**: Highlight advances correctly through all slots including the last. Auto-scroll targets the correct x-position from the `GlobalLayout`. SC-003 verified by unit test.

---

## Phase 5: User Story 3 — Response Staff Also Rendered via Rust Engine (Priority: P2)

**Goal**: Render the flow-mode response staff through `computeLayout` + `LayoutRenderer`, matching the visual style of the exercise staff above it.

**Independent Test**: Complete a flow-mode exercise with mixed correct/incorrect notes. Verify the response staff shows all recorded notes at the correct staff positions. Verify an empty response staff (zero notes detected) renders without errors.

- [ ] T014 [US3] Add `serializeResponseToLayoutInput(responseNotes: ResponseNote[], noteCount: number, clef: Clef)` to `frontend/src/services/practice/practiceLayoutAdapter.ts` mapping each response note to `{ tick: slotIndex * 960, duration: 960, pitch: Math.round(midiCents / 100) }`
- [ ] T015 [US3] Replace response staff `NotationRenderer` with `computeLayout` + `LayoutRenderer` using serialized response notes in `frontend/src/components/practice/PracticeView.tsx`
- [ ] T016 [P] [US3] Update `PracticeView.test.tsx` to assert response staff renders `LayoutRenderer` with correct layout in `frontend/src/components/practice/PracticeView.test.tsx`

**Checkpoint**: Response staff renders via Rust engine. Empty response renders without errors. SC-001 now fully satisfiable — both staves use `LayoutRenderer`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, CSS adjustments, and validation of all success criteria.

- [ ] T017 Verify SC-001: run `grep -r "NotationLayoutEngine\|NotationRenderer" frontend/src/components/practice/` and confirm zero matches
- [ ] T018 [P] Adjust `LayoutRenderer` container sizing in `frontend/src/components/practice/PracticeView.css` so the staff fills the horizontal scroll area correctly (mirror `LayoutView` container pattern)
- [ ] T019 Run end-to-end quickstart.md validation: generate 8-note exercise, verify single-system layout, verify highlight sequence, verify last note visible, measure layout computation time

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001, T002) — **BLOCKS** all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational (Phase 2) completion
  - **US1 (Phase 3)** and **US2 (Phase 4)** are both P1 and must be delivered together
  - **US3 (Phase 5)** is P2 and can follow US1/US2 or be deferred to a later commit
- **Polish (Phase 6)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (Phase 3)**: Can start after Phase 2 — no dependency on US2 or US3
- **US2 (Phase 4)**: Depends on US1 (requires `GlobalLayout` from T007 and `LayoutRenderer` from T008)
- **US3 (Phase 5)**: Depends on US1 (reuses `LayoutRenderer`) — independent of US2

### Within Each Phase

- T003 and T004 are [P] (different files — run simultaneously)
- T005 depends on T004 (test-first: tests must fail before implementation)
- T006 → T007 → T008 are sequential (same file, build on each other)
- T009 is [P] with T006 (different files: impl vs test)
- T010 → T011 → T012 are sequential (same file, each builds on previous)
- T013 is [P] with T010–T012 (test file vs impl file)

---

## Parallel Execution Example: Phase 2

Two agents / two terminals can run simultaneously once Phase 1 is complete:

**Agent A** (regression + serializer tests):
```
T003: Write barline regression test  →  NotationLayoutEngine.test.ts
T004: Write adapter unit tests       →  practiceLayoutAdapter.test.ts
```

**Agent B** (waits for T004 to exist — then implements):
```
T005: Implement practiceLayoutAdapter.ts
```

---

## Parallel Execution Example: Phase 3

**Agent A** (PracticeView implementation):
```
T006 → T007 → T008: WASM init + computeLayout + LayoutRenderer
```

**Agent B** (component test update — can start in parallel):
```
T009: Update PracticeView.test.tsx
```

---

## Implementation Strategy

### MVP Scope (Phases 1–4)
Deliver US1 + US2 together as the minimum shippable slice. After Phases 1–4:
- Exercise staff renders via Rust engine (SC-001, SC-002, SC-005)
- Highlight tracks active slot by note ID (SC-003)
- All unit tests pass (SC-004)
- WASM init latency is transparent (SC-006)

### Incremental Delivery
1. **Commit 1** — Phases 1–2: Domain type + adapter (no UI change yet)
2. **Commit 2** — Phase 3: Exercise staff via LayoutRenderer (visual change)
3. **Commit 3** — Phase 4: Highlight by note ID + auto-scroll (UX change)
4. **Commit 4** — Phase 5: Response staff via Rust engine
5. **Commit 5** — Phase 6: Polish + SC-001 verification

---

## Task Count Summary

| Scope | Task Count |
|---|---|
| Phase 1 (Setup) | 2 |
| Phase 2 (Foundational) | 3 |
| Phase 3 (US1 — Exercise Staff) | 4 |
| Phase 4 (US2 — Highlight) | 4 |
| Phase 5 (US3 — Response Staff) | 3 |
| Phase 6 (Polish) | 3 |
| **Total** | **19** |

| User Story | Tasks | Parallelizable |
|---|---|---|
| Foundational | T003–T005 | T003, T004 [P] |
| US1 | T006–T009 | T009 [P] |
| US2 | T010–T013 | T013 [P] |
| US3 | T014–T016 | T016 [P] |
