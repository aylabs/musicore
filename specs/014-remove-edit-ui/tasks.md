---
description: "Task list for Feature 014 - Remove Editing Interface"
---

# Tasks: Remove Editing Interface

**Input**: Design documents from `/specs/014-remove-edit-ui/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅ (N/A), quickstart.md ✅

**Tests**: Test tasks are included per Constitution Principle V (Test-First Development). All test tasks must be completed and verified to FAIL before implementing corresponding functionality.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/` (no changes), `frontend/src/`
- Frontend components: `frontend/src/components/`
- Frontend tests: `frontend/src/test/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify development environment ready for UI removal

- [ ] T001 Confirm branch 014-remove-edit-ui is current and up-to-date with main

**Checkpoint**: Development environment ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**Status**: ✅ No foundational tasks needed - this is pure UI removal with no shared infrastructure changes

**Checkpoint**: Foundation ready - user story implementation can begin immediately

---

## Phase 3: User Story 1 - Read-Only Score Viewing (Priority: P1) 🎯 MVP

**Goal**: Remove all editing controls from the score viewer interface (Save button, score name input, Add Note/Voice/Staff buttons) to create a clean read-only experience. Users can view and play scores without seeing non-functional editing UI.

**Independent Test**: Load demo score or import MusicXML file → verify no Save button, no score name input, no Add Note/Voice/Staff buttons visible → confirm playback and view mode switching work normally

### Tests for User Story 1

> **CRITICAL**: Write these tests FIRST, ensure they FAIL before implementation

- [ ] T002 [P] [US1] Create test file frontend/src/test/components/InstrumentList.test.tsx to verify Add Voice and Add Staff buttons do not render
- [ ] T003 [P] [US1] Create test file frontend/src/test/components/NoteDisplay.test.tsx to verify Add Note button does not render  
- [ ] T004 [P] [US1] Add tests to frontend/src/test/components/ScoreViewer.test.tsx to verify Save button and score name input do not render in viewer

### Implementation for User Story 1

- [ ] T005 [P] [US1] Remove "Add Voice" button rendering logic from frontend/src/components/InstrumentList.tsx
- [ ] T006 [P] [US1] Remove "Add Staff" button rendering logic from frontend/src/components/InstrumentList.tsx
- [ ] T007 [P] [US1] Remove "Add Note" button rendering logic from frontend/src/components/NoteDisplay.tsx
- [ ] T008 [US1] Remove "Save" button rendering logic from frontend/src/components/ScoreViewer.tsx
- [ ] T009 [US1] Remove score name input field rendering logic from frontend/src/components/ScoreViewer.tsx
- [ ] T010 [US1] Remove Ctrl+S (Save) keyboard shortcut handler from frontend/src/components/ScoreViewer.tsx

**Checkpoint**: User Story 1 complete - Score viewer is read-only. Verify tests pass. Manual test: load demo, confirm no editing buttons, playback works.

---

## Phase 4: User Story 2 - Simplified Landing Experience (Priority: P1)

**Goal**: Remove "New Score" button and related creation workflows from the landing page and viewer header. Simplify entry points to focus on demo and file import only.

**Independent Test**: Open app homepage (no score loaded) → verify "New Score" button not present → confirm Demo button and file import controls are visible and functional

### Tests for User Story 2

> **CRITICAL**: Write these tests FIRST, ensure they FAIL before implementation

- [ ] T011 [US2] Add tests to frontend/src/test/components/ScoreViewer.test.tsx to verify "New Score" button does not render in landing state or viewer header

### Implementation for User Story 2

- [ ] T012 [US2] Remove "New Score" button from landing page state in frontend/src/components/ScoreViewer.tsx
- [ ] T013 [US2] Remove "New Score" button from score viewer header in frontend/src/components/ScoreViewer.tsx
- [ ] T014 [US2] Remove Ctrl+N (New Score) keyboard shortcut handler from frontend/src/components/ScoreViewer.tsx
- [ ] T015 [US2] Remove Ctrl+O (Load from backend) keyboard shortcut handler from frontend/src/components/ScoreViewer.tsx
- [ ] T016 [US2] Remove unsaved changes warning (beforeunload event listener) from frontend/src/components/ScoreViewer.tsx

**Checkpoint**: User Story 2 complete - Landing page streamlined. Verify tests pass. Manual test: open app with no score, confirm only Demo and Import visible.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and deployment readiness

- [ ] T017 [P] Run full frontend test suite with `cd frontend && npm test` to verify no regressions
- [ ] T018 [P] Build production bundle with `cd frontend && npm run build` to verify no build errors  
- [ ] T019 Manual testing on local dev server: load demo, import file, verify playback, check all view modes
- [ ] T020 Deploy to GitHub Pages and test on tablet device to verify mobile experience  
- [ ] T021 Run quickstart.md validation: follow user and developer guides to confirm accuracy

**Checkpoint**: Feature complete and deployment-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - no blocking tasks
- **User Story 1 (Phase 3)**: Can start immediately after Setup
- **User Story 2 (Phase 4)**: Can start after Setup, MAY have merge conflicts with US1 in ScoreViewer.tsx (coordinate if parallel)
- **Polish (Phase 5)**: Depends on both US1 and US2 completion

### User Story Dependencies

- **User Story 1 (P1)**: Independent - affects InstrumentList, NoteDisplay, ScoreViewer (Save/name input only)
- **User Story 2 (P1)**: Independent - affects ScoreViewer (New Score button and keyboard shortcuts only)

**Conflict Risk**: Both stories modify ScoreViewer.tsx. Recommend sequential execution (US1 → US2) to avoid merge conflicts. If parallel execution desired, coordinate carefully on ScoreViewer.tsx changes.

### Within Each User Story

1. **Write tests first**: T002-T004 for US1, T011 for US2 - verify they FAIL
2. **Implement changes**: T005-T010 for US1, T012-T016 for US2
3. **Verify tests pass**: After implementation, all tests should pass
4. **Checkpoint validation**: Manual testing at each checkpoint

### Parallel Opportunities

- **Setup Phase**: Only 1 task (T001), no parallelization
- **User Story 1 Tests**: T002, T003, T004 can all be written in parallel (different test files)
- **User Story 1 Implementation**: 
  - T005, T006, T007 can run in parallel (InstrumentList.tsx, NoteDisplay.tsx are different files)
  - T008, T009, T010 must be sequential or carefully coordinated (same file: ScoreViewer.tsx)
- **User Story 2**: All tasks affect ScoreViewer.tsx - sequential recommended
- **Polish Phase**: T017, T018 can run in parallel (test vs build)

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all test file creation in parallel:
Task T002: "Create test file frontend/src/test/components/InstrumentList.test.tsx"
Task T003: "Create test file frontend/src/test/components/NoteDisplay.test.tsx"
Task T004: "Add tests to frontend/src/test/components/ScoreViewer.test.tsx"

# Then run test suite to verify all FAIL before implementation:
cd frontend && npm test
```

## Parallel Example: User Story 1 Implementation (Different Files)

```bash
# These can be done simultaneously since they affect different files:
Task T005: "Remove Add Voice button from InstrumentList.tsx"
Task T006: "Remove Add Staff button from InstrumentList.tsx"  
Task T007: "Remove Add Note button from NoteDisplay.tsx"

# Then do ScoreViewer.tsx changes sequentially:
Task T008: "Remove Save button from ScoreViewer.tsx"
Task T009: "Remove score name input from ScoreViewer.tsx"
Task T010: "Remove Ctrl+S keyboard shortcut from ScoreViewer.tsx"
```

---

## Implementation Strategy

### MVP First (Both User Stories Required - Both P1)

Since both user stories are Priority 1 and collectively deliver the "read-only viewer" experience:

1. Complete Phase 1: Setup (T001)
2. Skip Phase 2: Foundational (no tasks)
3. Complete Phase 3: User Story 1 (T002-T010)
   - **VALIDATE CHECKPOINT**: Test independently - viewer has no editing buttons
4. Complete Phase 4: User Story 2 (T011-T016)
   - **VALIDATE CHECKPOINT**: Test independently - landing has no New Score button
5. Complete Phase 5: Polish (T017-T021)
6. **Deploy to GitHub Pages** - MVP complete

### Incremental Delivery (Alternative if time-boxing)

If needed to ship faster, could deploy US1 first:

1. Setup → US1 → Partial Polish (just tests + local validation)
2. **Early Deploy**: Viewer is read-only, landing still shows New Score (acceptable intermediate state)
3. US2 → Full Polish → **Final Deploy**: Complete feature

### Parallel Team Strategy

With 2 developers:

1. **Developer A**: US1 (InstrumentList, NoteDisplay, ScoreViewer Save/input)
2. **Developer B**: US2 (ScoreViewer New Score button and shortcuts)
3. **Merge coordination**: Developer A finishes ScoreViewer.tsx changes first, Developer B merges and resolves conflicts
4. **Joint validation**: Both test on Polish phase tasks

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label (US1, US2) maps task to specific user story for traceability  
- Each user story should be independently completable and testable
- **Constitution Requirement**: Tests MUST be written first and FAIL before implementation
- Commit after each task or logical group (e.g., all InstrumentList changes)
- Stop at each checkpoint to validate story independently before proceeding
- **ScoreViewer.tsx merge risk**: Coordinate carefully if both stories run in parallel
- **No backend changes**: All tasks are frontend-only, backend Rust code untouched
- **Manual testing critical**: This is UI removal - visual verification required on tablet device

---

## Success Criteria Validation (from spec.md)

After all tasks complete, verify:

- **SC-001**: Users cannot access any score editing functions from the UI ✓ (US1 + US2 remove all editing buttons)
- **SC-002**: App loads without errors on GitHub Pages deployment ✓ (Validated in T020)
- **SC-003**: All view and playback features remain functional ✓ (Regression tests in T017, manual in T019)
- **SC-004**: Demo onboarding works without edit button clutter ✓ (Manual validation in T019, T020)
- **SC-005**: Users can import MusicXML and view without editing prompts ✓ (Manual validation in T019)
