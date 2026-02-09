# Tasks: Playback Scroll and Highlight

**Feature**: 009-playback-scroll-highlight  
**Input**: Design documents from `/specs/009-playback-scroll-highlight/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per TDD requirement (constitution check - Test-First Development required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Web app: `backend/src/`, `frontend/src/`
- Tests: `frontend/src/**/*.test.ts`, `frontend/tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment and prerequisites

- [x] T001 Verify Feature 002 (Staff Notation View) is complete and StaffNotation component exists
- [x] T002 Verify Feature 003 (Music Playback) is complete and MusicTimeline hook provides currentTick
- [x] T003 [P] Verify frontend test environment (Vitest) is configured and passing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Add ScrollState, ScrollConfig, ScrollCalculation type definitions to frontend/src/types/playback.ts
- [x] T005 [P] Add NoteHighlight, HighlightResult type definitions to frontend/src/types/notation/layout.ts
- [x] T006 Modify MusicTimeline to broadcast currentTick updates at 30 Hz during playback in frontend/src/services/playback/MusicTimeline.ts
- [x] T007 Verify NotationLayoutEngine exposes pixelsPerTick mapping in frontend/src/services/notation/NotationLayoutEngine.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Auto-Scroll During Playback (Priority: P1) 🎯 MVP

**Goal**: Enable automatic horizontal scrolling of notation display synchronized with music playback, keeping the current playback position visible within the viewport at all times.

**Independent Test**: Load any musical score, start playback, verify that the notation viewport automatically scrolls to keep the current playback position visible at approximately 30% from the left edge.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Create ScrollController unit tests in frontend/src/services/playback/ScrollController.test.ts
  - Test: Position note at 30% from left edge
  - Test: Clamp scroll to maximum when near end
  - Test: No scroll when score fits in viewport
  - Test: isManualScroll detection with timestamp threshold

- [x] T009 [P] [US1] Create usePlaybackScroll hook tests in frontend/src/services/hooks/usePlaybackScroll.test.ts
  - Test: Calculate target scroll position from currentTick
  - Test: Enable/disable auto-scroll state management
  - Test: Manual scroll override detection

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement ScrollController service in frontend/src/services/playback/ScrollController.ts
  - Method: calculateScrollPosition(currentTick, config) returns ScrollCalculation
  - Method: isManualScroll(lastAutoScrollTime, threshold) returns boolean
  - Handle edge cases: short scores, near end, negative scroll

- [x] T011 [US1] Implement usePlaybackScroll hook (scroll-only logic) in frontend/src/services/hooks/usePlaybackScroll.ts
  - Use currentTick from MusicTimeline context
  - Call ScrollController.calculateScrollPosition
  - Manage autoScrollEnabled state
  - Return: { autoScrollEnabled, targetScrollX, setAutoScrollEnabled }

- [x] T012 [US1] Integrate scroll logic into StaffNotation component in frontend/src/components/notation/StaffNotation.tsx
  - Add currentTick prop from MusicTimeline
  - Use usePlaybackScroll hook
  - Apply scrollLeft to notation container ref
  - Detect manual scroll events and disable auto-scroll

- [ ] T013 [US1] Update StaffNotation component tests in frontend/src/components/notation/StaffNotation.test.tsx
  - Test: Scrolls to correct position during playback
  - Test: Manual scroll disables auto-scroll
  - Test: Scroll re-enables on playback restart

- [ ] T014 [US1] Create integration test for scroll synchronization in frontend/tests/integration/playback-scroll.test.tsx
  - Test: Viewport follows playback for full score
  - Test: Scroll speed adjusts with tempo changes (Feature 008)
  - Test: Scroll stops at score boundaries

**Checkpoint**: At this point, User Story 1 should be fully functional - auto-scroll during playback works independently

---

## Phase 4: User Story 2 - Highlight Currently Playing Notes (Priority: P2)

**Goal**: Add visual highlighting to notes that are currently playing, providing precise note-level feedback during playback.

**Independent Test**: Play any score and verify that individual notes or chords change visual appearance (green highlight with outline) exactly when they sound, and return to normal appearance when they finish.

### Tests for User Story 2

- [ ] T015 [P] [US2] Create NoteHighlightService unit tests in frontend/src/services/playback/NoteHighlightService.test.ts
  - Test: Identify single note playing at current tick
  - Test: Identify multiple simultaneous notes (chord)
  - Test: Minimum duration for very short notes
  - Test: No highlights before/after note duration

- [ ] T016 [P] [US2] Update usePlaybackScroll hook tests in frontend/src/services/hooks/usePlaybackScroll.test.ts
  - Test: Return highlightedNoteIds array from hook
  - Test: Highlight updates at 30 Hz with currentTick

### Implementation for User Story 2

- [ ] T017 [P] [US2] Implement NoteHighlightService in frontend/src/services/playback/NoteHighlightService.ts
  - Method: getPlayingNoteIds(notes, currentTick, minimumDuration) returns string[]
  - Method: getHighlightDetails(notes, currentTick) returns HighlightResult
  - Use linear scan O(n) with tick range filtering

- [ ] T018 [US2] Enhance usePlaybackScroll hook with highlight logic in frontend/src/services/hooks/usePlaybackScroll.ts
  - Accept notes array as input
  - Call NoteHighlightService.getPlayingNoteIds(notes, currentTick)
  - Return: { autoScrollEnabled, targetScrollX, highlightedNoteIds, setAutoScrollEnabled }

- [ ] T019 [P] [US2] Add highlight CSS styles to frontend/src/App.css
  - Class: .note-head.highlighted with green fill (#4CAF50), 0.85 opacity
  - Add stroke (#2E7D32) and transition animations
  - Add accessibility high-contrast mode support

- [ ] T020 [US2] Update StaffNotation to pass highlightedNoteIds in frontend/src/components/notation/StaffNotation.tsx
  - Get highlightedNoteIds from usePlaybackScroll hook
  - Pass as prop to NotationRenderer component

- [ ] T021 [US2] Update NotationRenderer to apply highlight classes in frontend/src/components/notation/NotationRenderer.tsx
  - Accept highlightedNoteIds prop
  - Apply .highlighted CSS class to matching note-head SVG elements
  - Use React.memo for performance optimization

- [ ] T022 [US2] Update NotationRenderer tests in frontend/src/components/notation/NotationRenderer.test.tsx
  - Test: Applies highlighted class to playing notes
  - Test: Removes highlight after note duration
  - Test: Highlights all notes in chord simultaneously

- [ ] T023 [US2] Create integration test for highlight synchronization in frontend/tests/integration/playback-highlight.test.tsx
  - Test: Highlights appear within 50ms of audio playback
  - Test: Highlights work across multiple staves
  - Test: Highlights update during rapid note sequences

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - auto-scroll + note highlighting

---

## Phase 5: User Story 3 - Maintain Context During Scroll (Priority: P3)

**Goal**: Refine scrolling to maintain comfortable reading context by positioning the current playback location at 30% from the left edge, allowing musicians to read ahead.

**Independent Test**: During playback, measure the visible notation range and verify that the current playback position stays at approximately 30% from the left edge (not at the extreme right), showing adequate upcoming measures.

**Note**: The 30% positioning logic is already implemented in User Story 1 (ScrollController.calculateScrollPosition). This phase is for validation and potential refinement only.

### Implementation for User Story 3

- [ ] T024 [US3] Validate 30% positioning works correctly across different viewport sizes in ScrollController tests
- [ ] T025 [US3] Add viewport size variation tests to frontend/tests/integration/playback-scroll.test.tsx
  - Test: 30% positioning maintained at 768px width (tablet)
  - Test: 30% positioning maintained at 1920px width (desktop)
  - Test: 30% positioning maintained at 3840px width (4K)

- [ ] T026 [US3] Verify reading context during zoom level changes in frontend/tests/integration/playback-scroll.test.tsx
  - Test: 30% positioning maintained at 50% zoom
  - Test: 30% positioning maintained at 100% zoom
  - Test: 30% positioning maintained at 200% zoom

**Checkpoint**: User Story 3 validation complete - comfortable reading context verified across screen sizes and zoom levels

---

## Phase 6: User Story 4 - Manual Scroll Override (Priority: P4)

**Goal**: Allow users to manually scroll away from the auto-scroll position during playback without disrupting audio, and provide a quick way to return to auto-scroll mode.

**Independent Test**: Start playback with auto-scroll active, manually scroll to a different position, verify that auto-scroll pauses, then click "Resume Auto-Scroll" button and verify that the viewport jumps back to following the playback position.

### Tests for User Story 4

- [ ] T027 [P] [US4] Add manual override tests to frontend/src/services/hooks/usePlaybackScroll.test.ts
  - Test: Manual scroll event disables auto-scroll
  - Test: Resume button re-enables auto-scroll immediately
  - Test: Auto-scroll re-enables on playback stop/start

### Implementation for User Story 4

- [ ] T028 [US4] Enhance usePlaybackScroll hook with manual override state management in frontend/src/services/hooks/usePlaybackScroll.ts
  - Detect manual scroll via ScrollController.isManualScroll
  - Track lastAutoScrollTime for scroll event disambiguation
  - Auto re-enable on playback status change (stop → start)

- [ ] T029 [US4] Add "Resume Auto-Scroll" button UI in frontend/src/components/notation/StaffNotation.tsx
  - Show button when autoScrollEnabled === false and playback is active
  - Button click calls setAutoScrollEnabled(true)
  - Position button in fixed overlay (top-right of notation viewport)

- [ ] T030 [US4] Update StaffNotation tests for manual override UI in frontend/src/components/notation/StaffNotation.test.tsx
  - Test: Resume button appears after manual scroll
  - Test: Button click re-enables auto-scroll
  - Test: Button hidden when auto-scroll is active

- [ ] T031 [US4] Create integration test for manual override workflow in frontend/tests/integration/playback-manual-override.test.tsx
  - Test: Manual scroll during playback disables auto-scroll
  - Test: Resume button jumps viewport to current position
  - Test: Auto-scroll re-enables automatically on stop/start

**Checkpoint**: All user stories complete - auto-scroll, highlight, context, and manual override all function independently

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T032 [P] Add React.memo optimization to NotationRenderer component in frontend/src/components/notation/NotationRenderer.tsx
- [ ] T033 [P] Add useMemo optimization for expensive calculations in usePlaybackScroll hook in frontend/src/services/hooks/usePlaybackScroll.ts
- [ ] T034 [P] Add performance monitoring test for 60 FPS scroll in frontend/tests/integration/performance.test.tsx
  - Test: Maintain 60 FPS during scroll with 1000+ notes
  - Test: Highlight updates occur within <50ms of audio

- [ ] T035 Verify quickstart.md implementation steps match actual code structure
- [ ] T036 [P] Add JSDoc documentation to all new services and hooks
- [ ] T037 Run full test suite and verify all tests pass (npm test)
- [ ] T038 Manual testing: Load Feature 008 tempo change, verify scroll speed adjusts dynamically

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Enhances US1 but independently testable
- **User Story 3 (P3)**: Can start after US1 (validates existing US1 implementation)
- **User Story 4 (P4)**: Can start after US1 (adds override controls to US1 behavior)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Services before hooks
- Hooks before component integration
- Component logic before component tests
- Unit tests before integration tests
- Story complete and independently testable before moving to next priority

### Parallel Opportunities

- **Setup** (Phase 1): All 3 tasks marked [P] can run in parallel
- **Foundational** (Phase 2): T004 and T005 (type definitions) can run in parallel
- **User Story 1 Tests**: T008 and T009 can run in parallel (different files)
- **User Story 1 Implementation**: T010 (ScrollController) and tests can inform each other iteratively
- **User Story 2 Tests**: T015 and T016 can run in parallel
- **User Story 2 Implementation**: T017 (NoteHighlightService) and T019 (CSS) can run in parallel
- **User Story 2 Components**: T020 (StaffNotation) and T021 (NotationRenderer) must be sequential
- **User Story 3**: T025 and T026 can run in parallel (different test scenarios)
- **User Story 4**: T027 (tests) can run before/during T028-T029 implementation
- **Polish** (Phase 7): T032, T033, T034, and T036 can all run in parallel

**After Foundational (Phase 2)**: If team has multiple developers, US1 and US2 can be developed in parallel since they touch different service files.

---

## Parallel Example: User Story 1

```bash
# Step 1: Launch all tests for User Story 1 together (TDD - Red):
Task: [T008] "Create ScrollController unit tests in frontend/src/services/playback/ScrollController.test.ts"
Task: [T009] "Create usePlaybackScroll hook tests in frontend/src/services/hooks/usePlaybackScroll.test.ts"
# Both fail (no implementation yet)

# Step 2: Implement services (Green):
Task: [T010] "Implement ScrollController service in frontend/src/services/playback/ScrollController.ts"
# T008 tests now pass

Task: [T011] "Implement usePlaybackScroll hook in frontend/src/services/hooks/usePlaybackScroll.ts"
# T009 tests now pass

# Step 3: Integrate into components:
Task: [T012] "Integrate scroll logic into StaffNotation component"
Task: [T013] "Update StaffNotation component tests"

# Step 4: Integration tests:
Task: [T014] "Create integration test for scroll synchronization"

# Checkpoint: US1 complete and testable
```

---

## Parallel Example: User Story 2

```bash
# After US1 complete, launch US2 tests in parallel:
Task: [T015] "Create NoteHighlightService unit tests"
Task: [T016] "Update usePlaybackScroll hook tests for highlight"

# Implement service and styles in parallel:
Task: [T017] "Implement NoteHighlightService"
Task: [T019] "Add highlight CSS styles"
# These don't conflict - different files

# Then sequential component integration:
Task: [T018] "Enhance usePlaybackScroll hook with highlight logic"
Task: [T020] "Update StaffNotation to pass highlightedNoteIds"
Task: [T021] "Update NotationRenderer to apply highlight classes"

# Parallel component tests:
Task: [T022] "Update NotationRenderer tests"
Task: [T023] "Create integration test for highlight synchronization"

# Checkpoint: US1 + US2 both working independently
```

---

## Implementation Strategy

### MVP First (User Story 1 Only - Estimated 2 hours)

1. Complete Phase 1: Setup (10 min)
2. Complete Phase 2: Foundational (15 min - type definitions + MusicTimeline update)
3. Complete Phase 3: User Story 1 (1.5 hours - TDD: tests → ScrollController → usePlaybackScroll → StaffNotation integration)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Load a score, play, verify auto-scroll follows playback
   - Test tempo changes (50%-200%)
   - Test edge cases (short scores, long scores)
5. Deploy/demo if ready

### Incremental Delivery (MVP + Highlight - Estimated 4 hours total)

1. Complete Setup + Foundational → Foundation ready (25 min)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! 2 hours)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP + visual feedback! 2 hours)
4. Each story adds value without breaking previous stories

### Full Feature (All User Stories - Estimated 6 hours total)

1. Complete Setup + Foundational (25 min)
2. Implement US1 (Auto-Scroll) + US2 (Highlight) → Core feature complete (4 hours)
3. Validate US3 (Context) → Already in US1, just verify (30 min)
4. Implement US4 (Manual Override) → Advanced UX (1 hour)
5. Polish phase → Performance + docs (30 min)

### Parallel Team Strategy

With 2 developers:

1. Team completes Setup + Foundational together (25 min)
2. Once Foundational is done:
   - Developer A: User Story 1 (Auto-Scroll)
   - Developer B: User Story 2 (Highlight - service + CSS preparation)
3. Developer B waits for Developer A to finish T011 (usePlaybackScroll hook)
4. Developer B integrates highlight into hook (T018)
5. Both stories merge and integrate independently

With 3+ developers:

1. Team completes Setup + Foundational together
2. Parallel user story implementation:
   - Developer A: User Story 1
   - Developer B: User Story 2 (after US1 hook exists)
   - Developer C: User Story 4 (after US1 complete)
3. Developer D: Polish phase (performance, docs) in parallel with US4

---

## Notes

- All tasks follow TDD: Write tests first (RED), implement (GREEN), refactor if needed
- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4)
- Each user story should be independently completable and testable
- Verify tests fail before implementing (enforce TDD discipline)
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently before proceeding
- Feature 008 (tempo change) integration is passive - scroll speed automatically adjusts via currentTick
- No backend work required - 100% frontend implementation
- Performance targets: 60 FPS scroll, <50ms sync accuracy, 30 Hz update frequency
