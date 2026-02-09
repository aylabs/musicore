# Tasks: Score Tempo Change Support

**Feature**: 008-tempo-change  
**Input**: Design documents from `/specs/008-tempo-change/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Following TDD - tests written before implementation for each component

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions

- [X] T001 Create TempoState interface in frontend/src/types/playback.ts
- [X] T002 Create TempoPreference interface in frontend/src/types/playback.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Write unit tests for tempo multiplier calculation in frontend/tests/unit/TempoMultiplier.test.ts
- [X] T004 Create tempo multiplier utility functions in frontend/src/utils/tempoCalculations.ts (clamp, toPercentage, fromPercentage)
- [X] T005 Write tests for useLongPress hook in frontend/src/hooks/useLongPress.test.ts
- [X] T006 Implement useLongPress hook in frontend/src/hooks/useLongPress.ts (500ms threshold, 100ms repeat)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Adjust Playback Tempo in Real-Time (Priority: P1) 🎯 MVP

**Goal**: Users can adjust playback tempo 50%-200% in real-time without pitch shift, using increment/decrement buttons

**Independent Test**: Import any score, start playback, click increment/decrement buttons, verify tempo changes immediately while pitch unchanged

### Tests for User Story 1 (TDD - WRITE FIRST)

- [X] T007 [P] [US1] Write unit tests for TempoStateContext in frontend/src/services/state/TempoStateContext.test.tsx
- [X] T008 [P] [US1] Write component tests for TempoControl buttons in frontend/src/components/playback/TempoControl.test.tsx
- [X] T009 [P] [US1] Write unit tests for PlaybackScheduler tempo integration in frontend/src/services/playback/PlaybackScheduler.test.ts

### Implementation for User Story 1

- [X] T010 [P] [US1] Create TempoStateContext with React Context in frontend/src/services/state/TempoStateContext.tsx (state management, adjustTempo, resetTempo)
- [X] T011 [US1] Integrate TempoStateProvider into App.tsx (wrap ScoreViewer component)
- [X] T012 [P] [US1] Create TempoControl component in frontend/src/components/playback/TempoControl.tsx (increment/decrement buttons using useLongPress)
- [X] T013 [P] [US1] Modify PlaybackScheduler.scheduleNotes() in frontend/src/services/playback/PlaybackScheduler.ts (apply tempo multiplier to ticksToSeconds)
- [X] T014 [US1] Integrate TempoControl into PlaybackControls in frontend/src/components/playback/PlaybackControls.tsx
- [X] T015 [US1] Update usePlayback hook in frontend/src/services/playback/MusicTimeline.ts (pass tempo multiplier to PlaybackScheduler)
- [X] T016 [US1] Add Tone.js Transport.bpm integration in frontend/src/services/playback/ToneAdapter.ts (method to update transport BPM at runtime)

**Checkpoint**: At this point, users can adjust tempo during playback and hear immediate speed changes

---

## Phase 4: User Story 2 - Display Current and Target Tempo (Priority: P2)

**Goal**: UI shows both original tempo (e.g., 120 BPM) and effective tempo (e.g., 96 BPM at 80%)

**Independent Test**: Load score with marked tempo, adjust tempo control, verify UI displays both original and effective BPM with percentage

### Tests for User Story 2 (TDD - WRITE FIRST)

- [X] T017 [P] [US2] Write component tests for TempoDisplay in frontend/src/components/playback/TempoDisplay.test.tsx
- [X] T018 [P] [US2] Write unit tests for tempo display formatting in frontend/tests/unit/TempoFormatting.test.ts

### Implementation for User Story 2

- [X] T019 [P] [US2] Create TempoDisplay component in frontend/src/components/playback/TempoDisplay.tsx (show "120 BPM (100%)" format)
- [X] T020 [P] [US2] Create tempo formatting utilities in frontend/src/utils/tempoFormatting.ts (formatTempo, formatPercentage)
- [X] T021 [US2] Integrate TempoDisplay into PlaybackControls in frontend/src/components/playback/PlaybackControls.tsx (place near tempo control buttons)
- [X] T022 [US2] Add getEffectiveTempo() method to TempoStateContext in frontend/src/services/state/TempoStateContext.tsx

**Checkpoint**: Users see real-time tempo feedback (both original and adjusted BPM)

---

## Phase 5: User Story 3 - Persist Tempo Changes Per Score (Priority: P3)

**Goal**: Tempo preferences saved in localStorage per score, restored when score reopened

**Independent Test**: Adjust tempo to 85%, close app, reopen app and load same score, verify tempo starts at 85%

### Tests for User Story 3 (TDD - WRITE FIRST)

- [ ] T023 [P] [US3] Write unit tests for TempoPreferences localStorage utils in frontend/src/services/playback/TempoPreferences.test.ts
- [ ] T024 [P] [US3] Write integration tests for persistence in frontend/tests/integration/TempoPersistence.test.ts

### Implementation for User Story 3

- [ ] T025 [P] [US3] Create TempoPreferences localStorage utility in frontend/src/services/playback/TempoPreferences.ts (saveTempoPreference, loadTempoPreference, clearTempoPreference)
- [ ] T026 [US3] Add useEffect to TempoStateContext for saving tempo changes to localStorage in frontend/src/services/state/TempoStateContext.tsx
- [ ] T027 [US3] Add useEffect to ScoreViewer for loading tempo preference when score changes in frontend/src/components/ScoreViewer.tsx
- [ ] T028 [US3] Update TempoStateContext with setOriginalTempo() method in frontend/src/services/state/TempoStateContext.tsx (called when new score loaded)

**Checkpoint**: Tempo preferences persist across sessions per score

---

## Phase 6: User Story 4 - Reset Tempo to Original (Priority: P3)

**Goal**: Single-click reset button returns tempo to 100% (original tempo)

**Independent Test**: Adjust tempo to any value (e.g., 70%), click Reset button, verify tempo returns to 100%

### Tests for User Story 4 (TDD - WRITE FIRST)

- [ ] T029 [P] [US4] Write component tests for TempoResetButton in frontend/src/components/playback/TempoControl.test.tsx (add to existing test file)

### Implementation for User Story 4

- [ ] T030 [US4] Add reset button to TempoControl component in frontend/src/components/playback/TempoControl.tsx (calls resetTempo() from context)
- [ ] T031 [US4] Add visual feedback for 100% state in frontend/src/components/playback/TempoControl.tsx (disable/grey out reset button when already at 100%)

**Checkpoint**: Users can quickly return to original tempo with one click

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T032 [P] Add boundary constraint tests for 50% and 200% limits in frontend/tests/unit/TempoMultiplier.test.ts
- [ ] T033 [P] Add accessibility attributes to TempoControl buttons in frontend/src/components/playback/TempoControl.tsx (aria-label, aria-valuemin/max/now)
- [ ] T034 Add keyboard shortcuts for tempo adjustment in frontend/src/components/playback/TempoControl.tsx ([ and ] keys for -/+ 1%, Shift+[ and Shift+] for -/+ 10%)
- [ ] T035 [P] Add visual feedback for tempo changes in frontend/src/components/playback/TempoControl.tsx (highlight button during press)
- [ ] T036 [P] Update quickstart.md validation scenarios in specs/008-tempo-change/quickstart.md
- [ ] T037 Run all tests and verify success criteria in specs/008-tempo-change/spec.md
- [ ] T038 Update feature documentation in specs/008-tempo-change/README.md (if exists) or create summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T002) - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational (T003-T006)
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4)
- **Polish (Phase 7)**: Depends on all user stories (T007-T031)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - T010 (TempoStateContext) must complete before T011 (App.tsx integration)
  - T013 (PlaybackScheduler) can run in parallel with T010, T012
  - T015 (usePlayback) depends on T013 (PlaybackScheduler modified)
  - T016 (ToneAdapter) can run in parallel with other tasks
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1's TempoStateContext (T010)
  - T019, T020 can run in parallel
  - T022 depends on T010 (TempoStateContext exists)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US1's TempoStateContext (T010)
  - T025 can run in parallel with T026
  - T027 depends on T025 (TempoPreferences utils exist)
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Depends on US1's TempoControl (T012)
  - T030 modifies existing TempoControl from T012

### Within Each User Story (TDD Order)

1. **Write failing tests** (all test tasks marked [P] can run in parallel)
2. **Implement components** (implementation tasks run after tests written)
3. **Integration** (final integration tasks after components complete)
4. **Verify** (run tests, ensure all pass before moving to next story)

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T003 and T005 can run in parallel (different test files)
- T004 and T006 can run in parallel after respective tests (different files)

**Phase 3 (US1)**:
- T007, T008, T009 (all tests) can run in parallel
- T010, T012, T013, T016 (implementation) can run in parallel after tests
- T011, T014, T015 (integration) run sequentially after core implementation

**Phase 4 (US2)**:
- T017, T018 (tests) can run in parallel
- T019, T020 (implementation) can run in parallel after tests
- T021, T022 (integration) run after implementation

**Phase 5 (US3)**:
- T023, T024 (tests) can run in parallel
- T025 runs after tests
- T026, T027, T028 run sequentially (modify existing context and components)

**Phase 6 (US4)**:
- T029 (test) runs first
- T030, T031 run sequentially (modify same component)

**Phase 7 (Polish)**:
- T032, T033, T035, T036 can run in parallel
- T034 can run after T030 (TempoControl complete)
- T037, T038 run after all other tasks

---

## Parallel Example: User Story 1 (MVP)

Three developers working in parallel after Foundational phase complete:

```bash
# Developer A: Tempo State
git checkout -b feat/tempo-state
# T007 - Write TempoStateContext tests
# T010 - Implement TempoStateContext
# T011 - Integrate into App.tsx
npm test TempoStateContext.test.tsx  # Verify

# Developer B: UI Controls
git checkout -b feat/tempo-controls
# T008 - Write TempoControl tests
# T012 - Implement TempoControl component
# T014 - Integrate into PlaybackControls
npm test TempoControl.test.tsx  # Verify

# Developer C: Playback Integration
git checkout -b feat/tempo-playback
# T009 - Write PlaybackScheduler tests
# T013 - Modify PlaybackScheduler.scheduleNotes()
# T015 - Update usePlayback hook
# T016 - Add ToneAdapter BPM update
npm test PlaybackScheduler.test.ts  # Verify
```

After all three complete, merge branches and verify integration tests pass.

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**User Story 1 only** (Phase 3: T007-T016):
- Tempo adjustment UI (buttons with long-press)
- Real-time playback tempo changes
- No display, no persistence, no reset button
- **Estimated time**: 2-3 hours
- **Deliverable**: Musicians can adjust practice tempo

### Full Feature Scope

**All 4 User Stories** (Phase 3-6: T007-T031):
- US1: Tempo adjustment ✓
- US2: Tempo display ✓
- US3: Persistence ✓
- US4: Reset button ✓
- **Estimated time**: 4-6 hours
- **Deliverable**: Complete tempo change feature

### Incremental Delivery

1. **Sprint 1**: US1 (MVP) - Deploy and gather user feedback
2. **Sprint 2**: US2 (Display) - Add visual feedback based on US1 feedback
3. **Sprint 3**: US3 + US4 (Persistence + Reset) - Polish and convenience features

---

## Testing Strategy

### Test Pyramid

**Unit Tests** (~60% of tests):
- Tempo calculations (clamp, percentage conversion)
- useLongPress hook timing
- TempoStateContext state management
- localStorage utilities
- Display formatting

**Component Tests** (~30% of tests):
- TempoControl button interactions
- TempoDisplay rendering
- Long-press behavior
- Reset button

**Integration Tests** (~10% of tests):
- PlaybackScheduler with tempo multiplier
- End-to-end: adjust tempo → hear change
- Persistence: save → reload → verify

### Test Coverage Goals

- **Target**: >80% code coverage
- **Critical paths**: 100% coverage (tempo calculation, playback integration)
- **UI components**: >70% coverage

---

## Success Validation

After completing all tasks, verify these success criteria from spec.md:

- [ ] **SC-001**: Tempo adjustment 50%-200% without artifacts (load CanonD.musicxml, test all range)
- [ ] **SC-002**: Changes apply <100ms (measure with browser performance timeline)
- [ ] **SC-003**: Persistence 100% reliable (test 10 save/reload cycles)
- [ ] **SC-004**: UI updates <50ms (verify with React DevTools Profiler)
- [ ] **SC-005**: User workflow <2 seconds (time from click to sound change)
- [ ] **SC-006**: Reset instant <50ms (measure reset button response)
- [ ] **SC-007**: Stable playback (30-minute continuous playback test at various tempos)
- [ ] **SC-008**: 90% first-attempt success (usability testing with 10 users)

---

## File Change Summary

### New Files (13)
- frontend/src/types/playback.ts additions (TempoState, TempoPreference interfaces)
- frontend/src/services/state/TempoStateContext.tsx
- frontend/src/services/state/TempoStateContext.test.tsx
- frontend/src/components/playback/TempoControl.tsx
- frontend/src/components/playback/TempoControl.test.tsx
- frontend/src/components/playback/TempoDisplay.tsx
- frontend/src/components/playback/TempoDisplay.test.tsx
- frontend/src/hooks/useLongPress.ts
- frontend/src/hooks/useLongPress.test.ts
- frontend/src/services/playback/TempoPreferences.ts
- frontend/src/services/playback/TempoPreferences.test.ts
- frontend/src/utils/tempoCalculations.ts
- frontend/src/utils/tempoFormatting.ts
- frontend/tests/unit/TempoMultiplier.test.ts
- frontend/tests/unit/TempoFormatting.test.ts
- frontend/tests/integration/TempoPersistence.test.ts

### Modified Files (5)
- frontend/src/services/playback/PlaybackScheduler.ts (apply tempo multiplier)
- frontend/src/services/playback/PlaybackScheduler.test.ts (add tempo tests)
- frontend/src/services/playback/ToneAdapter.ts (add updateTempo method)
- frontend/src/services/playback/MusicTimeline.ts (pass tempo multiplier)
- frontend/src/components/playback/PlaybackControls.tsx (add TempoControl and TempoDisplay)
- frontend/src/components/ScoreViewer.tsx (load tempo preferences)
- frontend/src/App.tsx (add TempoStateProvider)

### Backend Files (0)
- No backend changes required (feature is frontend-only)

---

## Notes

- **TDD Approach**: All test tasks must be completed and FAILING before implementation tasks
- **Frontend Only**: Zero backend changes required per constitution check (API-First validated)
- **Architecture**: Follows hexagonal architecture - tempo adjustment in adapter layer, domain untouched
- **Performance**: Target <100ms tempo changes, <50ms UI updates per success criteria
- **Accessibility**: Keyboard shortcuts and ARIA labels required in polish phase
