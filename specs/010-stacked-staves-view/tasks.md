# Tasks: Stacked Staves View

**Input**: Design documents from `/specs/010-stacked-staves-view/`
**Prerequisites**: plan.md (✓), spec.md (✓), research.md (✓), data-model.md (✓), quickstart.md (✓), contracts/ (✓)

**Tests**: Tests are included per TDD workflow (Constitution Principle V)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and component structure for stacked view

- [X] T001 Create `frontend/src/components/stacked/` directory for new components
- [X] T002 [P] Create placeholder files for 4 new components: ViewModeSelector.tsx, StackedStaffView.tsx, StaffGroup.tsx, MultiVoiceStaff.tsx
- [X] T003 [P] Create corresponding CSS files: ViewModeSelector.css, StackedStaffView.css, StaffGroup.css, MultiVoiceStaff.css
- [X] T004 [P] Create test files: ViewModeSelector.test.tsx, StackedStaffView.test.tsx, StaffGroup.test.tsx, MultiVoiceStaff.test.tsx

**Checkpoint**: File structure ready for implementation

---

## Phase 2: User Story 1 - View Selection and Stacked Display (Priority: P1) 🎯 MVP Part 1

**Goal**: Enable toggling between Individual and Stacked view modes with all staves visible vertically

**Independent Test**: Load multi-instrument score, click view selector button, verify all staves render vertically stacked

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T005 [P] [US1] Test ViewModeSelector renders both buttons and highlights active mode in `frontend/src/components/stacked/ViewModeSelector.test.tsx`
- [X] T006 [P] [US1] Test ViewModeSelector onChange fires with correct mode when buttons clicked
- [X] T007 [P] [US1] Test StackedStaffView flattens score into staff list correctly (3 instruments → 5 staves)
- [X] T008 [P] [US1] Test StackedStaffView renders correct number of StaffGroup components

### Implementation for User Story 1

- [X] T009 [US1] Add view mode state to ScoreViewer: `const [viewMode, setViewMode] = useState<'individual' | 'stacked'>('individual')` in `frontend/src/components/ScoreViewer.tsx`
- [X] T010 [P] [US1] Implement ViewModeSelector component in `frontend/src/components/stacked/ViewModeSelector.tsx` with two buttons and onChange callback
- [X] T011 [P] [US1] Style ViewModeSelector with active state highlighting in `frontend/src/components/stacked/ViewModeSelector.css`
- [X] T012 [P] [US1] Create FlattenedStaff type alias and interface in `frontend/src/components/stacked/StackedStaffView.tsx`
- [X] T013 [US1] Implement StackedStaffView component with score flattening logic (useMemo) in `frontend/src/components/stacked/StackedStaffView.tsx`
- [X] T014 [US1] Add conditional rendering in ScoreViewer: render InstrumentList for individual mode, StackedStaffView for stacked mode in `frontend/src/components/ScoreViewer.tsx`
- [X] T015 [US1] Integrate ViewModeSelector into ScoreViewer header (above PlaybackControls) in `frontend/src/components/ScoreViewer.tsx`
- [X] T016 [US1] Style StackedStaffView container with vertical layout in `frontend/src/components/stacked/StackedStaffView.css`

**Checkpoint**: View mode toggle working, stacked view shows placeholder for staves (not fully rendered yet)

---

## Phase 3: User Story 2 - Multi-Voice Staff Rendering (Priority: P2)

**Goal**: Render all voices within a staff together without visual overlap

**Independent Test**: Load score with multi-voice piano staff (2+ voices), verify voices render with distinct stem directions on same staff

### Tests for User Story 2 ⚠️

- [ ] T017 [P] [US2] Test MultiVoiceStaff merges notes from 3 voices into single sorted array in `frontend/src/components/stacked/MultiVoiceStaff.test.tsx`
- [ ] T018 [P] [US2] Test MultiVoiceStaff passes merged notes to StaffNotation component correctly
- [ ] T019 [US2] Integration test: Verify 2-voice staff renders without note overlap (manual or automated visual test)

### Implementation for User Story 2

- [X] T020 [P] [US2] Define MultiVoiceStaffProps interface in `frontend/src/components/stacked/MultiVoiceStaff.tsx`
- [X] T021 [US2] Implement note merging logic (flatMap + sort by start_tick) in MultiVoiceStaff with useMemo in `frontend/src/components/stacked/MultiVoiceStaff.tsx`
- [X] T022 [US2] Render StaffNotation with merged notes, pass clef prop in `frontend/src/components/stacked/MultiVoiceStaff.tsx`
- [X] T023 [US2] Add wrapper styling for MultiVoiceStaff in `frontend/src/components/stacked/MultiVoiceStaff.css`

**Checkpoint**: Multi-voice staves render all notes correctly without overlap

---

## Phase 4: User Story 3 - Staff Labels (Priority: P3)

**Goal**: Display instrument names at left margin of each staff with truncation for long names

**Independent Test**: Load score with instruments named "Piano", "Violin I", "VeryLongInstrumentNameThatExceedsTwentyCharacters", verify labels appear left-aligned and truncate with ellipsis

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Test StaffGroup renders instrument label when isFirstStaffOfInstrument=true in `frontend/src/components/stacked/StaffGroup.test.tsx`
- [ ] T025 [P] [US3] Test StaffGroup hides label when isFirstStaffOfInstrument=false (multi-staff instruments)
- [ ] T026 [US3] Test CSS truncation applies to labels >20 characters

### Implementation for User Story 3

- [X] T027 [P] [US3] Define StaffGroupProps interface in `frontend/src/components/stacked/StaffGroup.tsx`
- [X] T028 [US3] Implement StaffGroup component with conditional label rendering in `frontend/src/components/stacked/StaffGroup.tsx`
- [X] T029 [US3] Extract clef from staff structural events in StaffGroup in `frontend/src/components/stacked/StaffGroup.tsx`
- [X] T030 [US3] Render MultiVoiceStaff with voices and clef in `frontend/src/components/stacked/StaffGroup.tsx`
- [X] T031 [US3] Implement CSS Grid layout (200px label column | 1fr staff column) in `frontend/src/components/stacked/StaffGroup.css`
- [X] T032 [US3] Add label styling with text-align: right, overflow: hidden, text-overflow: ellipsis in `frontend/src/components/stacked/StaffGroup.css`
- [X] T033 [US3] Add vertical spacing between staff groups (margin-bottom: 40px) in `frontend/src/components/stacked/StaffGroup.css`
- [X] T034 [US3] Update StackedStaffView to render StaffGroup components with instrument names and isFirstStaffOfInstrument flag in `frontend/src/components/stacked/StackedStaffView.tsx`

**Checkpoint**: Staff labels appear and truncate correctly, layout stable with label + staff columns

---

## Phase 5: User Story 4 - Unified Playback in Stacked View (Priority: P1) 🎯 MVP Part 2

**Goal**: Integrate playback with stacked view - note highlighting, click-to-seek, persistent start pin all work identically to individual view

**Independent Test**: Load score, switch to stacked view, click Play, verify green highlighting on all active notes; click any note, verify seek and pin work

### Tests for User Story 4 ⚠️

- [ ] T035 [P] [US4] Test StackedStaffView passes currentTick prop down to all StaffGroup components
- [ ] T036 [P] [US4] Test StaffGroup passes playback props (currentTick, onSeekToTick, onUnpinStartTick) to MultiVoiceStaff
- [ ] T037 [P] [US4] Test MultiVoiceStaff passes playback props to StaffNotation
- [ ] T038 [US4] Integration test: Switch views during playback, verify playback state preserved (currentTick, status unchanged)
- [ ] T039 [US4] Integration test: Click note in stacked view, verify seekToTick called with correct tick value
- [ ] T040 [US4] Integration test: Click note twice (deselect), verify unpinStartTick called

### Implementation for User Story 4

- [X] T041 [US4] Add playback props to StackedStaffViewProps (currentTick, playbackStatus, onSeekToTick, onUnpinStartTick) in `frontend/src/components/stacked/StackedStaffView.tsx`
- [X] T042 [US4] Thread playback props from StackedStaffView down to StaffGroup components in `frontend/src/components/stacked/StackedStaffView.tsx`
- [X] T043 [US4] Add playback props to StaffGroupProps in `frontend/src/components/stacked/StaffGroup.tsx`
- [X] T044 [US4] Thread playback props from StaffGroup down to MultiVoiceStaff in `frontend/src/components/stacked/StaffGroup.tsx`
- [X] T045 [US4] Add playback props to MultiVoiceStaffProps in `frontend/src/components/stacked/MultiVoiceStaff.tsx`
- [X] T046 [US4] Pass playback props from MultiVoiceStaff to StaffNotation (currentTick, playbackStatus, onNoteClick, onNoteDeselect) in `frontend/src/components/stacked/MultiVoiceStaff.tsx`
- [X] T047 [US4] Wire playback state from ScoreViewer usePlayback hook to StackedStaffView in `frontend/src/components/ScoreViewer.tsx`
- [ ] T048 [US4] Verify playback state NOT reset when switching views (test: switch during playing status)

**Checkpoint**: Playback fully integrated - all user stories now complete and independently testable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting overall feature quality

- [ ] T049 [P] Add JSDoc comments to all new components (ViewModeSelector, StackedStaffView, StaffGroup, MultiVoiceStaff)
- [ ] T050 [P] Add component examples to documentation comments (TSDoc @example tags)
- [ ] T051 [P] Update README or feature documentation with stacked view usage instructions
- [ ] T052 Handle edge case: Empty staves (no notes) - decide show or hide, document decision in code comment
- [ ] T053 Handle edge case: Very long instrument names (>30 chars) - verify ellipsis works
- [ ] T054 Handle edge case: Rapid view switching - test for any visual glitches or state corruption
- [ ] T055 [P] Run full test suite (`npm test`) and ensure all 22+ tests pass
- [ ] T056 [P] Run production build (`npm run build`) and verify no TypeScript errors
- [ ] T057 [P] Run Docker build (`docker compose build frontend`) and verify success
- [ ] T058 Test with multi-instrument scores: string quartet (4 instruments), orchestra (10+ instruments)
- [ ] T059 Performance profiling: Use React DevTools to verify <16ms render time for 10 staves
- [ ] T060 [P] Code review checklist: Verify Constitution compliance (DDD, test-first, no new dependencies)
- [ ] T061 Create demo video or screenshots showing view toggle and playback in stacked view

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup - Provides basic view structure
- **User Story 2 (Phase 3)**: Depends on US1 basic structure (StaffGroup must exist)
- **User Story 3 (Phase 4)**: Depends on US2 (StaffGroup renders staff, now adds labels)
- **User Story 4 (Phase 5)**: Depends on US1-3 (all components must exist to wire playback)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Creates basic stacked view infrastructure - MUST complete first
- **User Story 2 (P2)**: Adds multi-voice rendering - Can start after US1 creates StaffGroup skeleton
- **User Story 3 (P3)**: Adds labels - Can start after US2 completes StaffGroup implementation
- **User Story 4 (P1)**: Integrates playback - MUST complete after US1-3 (wires existing components)

**MVP Delivery**: US1 (view toggle) + US4 (playback integration) = Minimum viable feature
**Full Feature**: US1 + US2 (multi-voice) + US3 (labels) + US4 (playback)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Components built bottom-up: MultiVoiceStaff → StaffGroup → StackedStaffView → ScoreViewer integration
- Props threaded top-down: ScoreViewer → StackedStaffView → StaffGroup → MultiVoiceStaff
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T002, T003, T004 can all run in parallel (different file creation)

**Phase 2 (US1 Tests)**: T005, T006, T007, T008 - all tests can be written in parallel

**Phase 2 (US1 Implementation)**: T010, T011 (ViewModeSelector + CSS) can run parallel

**Phase 3 (US2 Tests)**: T017, T018 can run in parallel

**Phase 3 (US2 Implementation)**: T020, T023 (interface definition + CSS) can run parallel

**Phase 4 (US3 Tests)**: T024, T025, T026 can run in parallel

**Phase 4 (US3 Implementation)**: T027, T031, T032 can run parallel (component + CSS rules)

**Phase 5 (US4 Tests)**: T035, T036, T037 can run in parallel

**Phase 6 (Polish)**: T049, T050, T051, T055, T056, T057, T060 can run in parallel (independent tasks)

---

## Parallel Example: User Story 2 (Multi-Voice Rendering)

```bash
# Launch all tests for User Story 2 together:
Task T017: Test MultiVoiceStaff merges notes from 3 voices
Task T018: Test MultiVoiceStaff passes merged notes to StaffNotation

# Then implement in parallel:
Task T020: Define MultiVoiceStaffProps interface
Task T023: Add wrapper styling for MultiVoiceStaff.css
# (T021, T022 must wait for T020 to complete)
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: User Story 1 - View Selection (T005-T016)
3. **VALIDATE**: Toggle views, see stacked layout
4. Complete Phase 3: User Story 2 - Multi-Voice (T017-T023)
5. Complete Phase 4: User Story 3 - Labels (T024-T034)
6. Complete Phase 5: User Story 4 - Playback Integration (T035-T048)
7. **STOP and VALIDATE**: Test all playback features in stacked view
8. Deploy/demo MVP

### Incremental Delivery

1. Complete Setup → File structure ready
2. Add US1 → View toggle works (stubs for actual rendering)
3. Add US2 → Multi-voice rendering functional
4. Add US3 → Labels appear
5. Add US4 → Playback fully integrated (FEATURE COMPLETE)
6. Polish → Documentation, edge cases, performance

### Parallel Team Strategy (Optional)

With 2 developers after Phase 1:
- **Developer A**: US1 (T005-T016) → US2 (T017-T023)
- **Developer B**: Tests for US3-US4 (T024-T026, T035-T040)
- **Then merge**: US3 implementation (T027-T034), US4 implementation (T041-T048)

---

## Time Estimates

- **Phase 1 (Setup)**: 15 minutes
- **Phase 2 (US1)**: 2 hours (8 tests + 8 implementation tasks)
- **Phase 3 (US2)**: 1.5 hours (3 tests + 4 implementation tasks)
- **Phase 4 (US3)**: 2 hours (3 tests + 8 implementation tasks)
- **Phase 5 (US4)**: 2 hours (6 tests + 8 implementation tasks)
- **Phase 6 (Polish)**: 1.5 hours (13 tasks, mostly parallel)

**Total**: ~9 hours for complete implementation with full test coverage

---

## Success Criteria Validation

After completing all tasks, verify against spec.md success criteria:

- ✅ **SC-001**: Users can switch between Individual and Stacked views with a single click (US1 T010-T015)
- ✅ **SC-002**: All staves from loaded score visible in Stacked View with vertical scrolling (US1 T013)
- ✅ **SC-003**: Multi-voice staves render without visual overlap (US2 T021)
- ✅ **SC-004**: Playback operates identically in both views with 16ms sync (US4 T041-T048)
- ✅ **SC-005**: View switching during playback completes without glitches <500ms (US1 T014, US4 T038, T048)
- ✅ **SC-006**: Staff labels readable with truncation up to 30 characters (US3 T032)
- ✅ **SC-007**: Click-to-seek works on any note in any staff (US4 T039)

---

## Notes

- All [P] tasks can run in parallel (different files, no blocking dependencies)
- [Story] labels (US1, US2, US3, US4) map tasks to user stories for traceability
- TDD workflow: Write test → Verify FAIL → Implement → Verify PASS → Refactor
- Each user story checkpoint validates independent functionality
- Commit after completing each user story phase
- View switching must preserve playback state (critical requirement FR-009)
- No backend changes required - frontend-only feature
- Reuses existing components: StaffNotation, NotationRenderer, PlaybackControls, usePlayback hook
