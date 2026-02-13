# Tasks: Rust Layout Engine Engraving

**Feature**: Complete Rust layout engine to generate staff content (staff lines, glyphs, SMuFL positioning) from note data  
**Branch**: `018-rust-layout-engraving`  
**Input**: Design documents from `/specs/018-rust-layout-engraving/`

**Prerequisites**: ✅ plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md all complete

**Test Strategy**: Test-First Development (RED-GREEN-REFACTOR) per Constitution Principle V  
**Organization**: Tasks grouped by user story to enable independent implementation and testing

---

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Parallelizable (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3, US4, US5)
- File paths use `backend/` prefix (web application structure)

---

## Phase 1: Setup

**Purpose**: Project initialization and test infrastructure

- [ ] T001 Review existing layout engine code in backend/src/layout/mod.rs
- [ ] T002 Review test infrastructure in backend/tests/
- [ ] T003 [P] Set up contract test directory backend/tests/contract/
- [ ] T004 [P] Copy frontend fixtures to backend/tests/fixtures/ (violin_10_measures.json, piano_8_measures.json)

**Checkpoint**: Test infrastructure ready ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core fixes and test setup that MUST be complete before user stories

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete

- [X] T005 Create contract test stub backend/tests/contract/wasm_contract_test.rs (FAILS - empty staff_groups)
- [X] T006 Load violin_10_measures.json fixture in contract test
- [X] T007 Assert output structure matches fixture (will FAIL - this is RED phase)
- [X] T008 Fix JSON input parsing in backend/src/layout/mod.rs::extract_instruments() to check `notes` field before `interval_events`
- [X] T009 Update voice parsing in extract_instruments() to handle both formats with backward compatibility
- [X] T010 Run contract test to verify staff_groups now populated (should progress but still miss structural glyphs)

**Checkpoint**: Input parsing fixed, contract test detects missing glyphs ✅

---

## Phase 3: User Story 1 - Basic Staff Line Rendering (Priority: P1) 🎯 MVP

**Goal**: Render 5 evenly-spaced horizontal staff lines per staff with 20 logical unit spacing

**Independent Test**: Load single-staff score → verify 5 staff lines at y=0, 40, 80, 120, 160 with correct start_x and end_x

### Tests for US1 ⚠️ RED Phase

- [X] T011 [P] [US1] Unit test for create_staff_lines() in backend/src/layout/mod.rs verifying 5 lines with 20-unit spacing
- [X] T012 [P] [US1] Integration test in backend/tests/layout_integration_test.rs for single-staff layout structure

### Implementation for US1 🟢 GREEN Phase

- [X] T013 [US1] Verify staff line spacing formula in backend/src/layout/mod.rs::create_staff_lines() uses 2 * units_per_space
- [X] T014 [US1] Update create_staff_lines() to use config.units_per_space correctly (20 units = 1 staff space, not 10)
- [X] T015 [US1] Test with violin fixture - verify staff lines match expected y-positions
- [X] T016 [US1] Add multi-system test - verify each system has independent staff lines at correct vertical offsets

**Checkpoint**: Staff lines render correctly with proper spacing ✅ US1 COMPLETE

---

## Phase 4: User Story 2 - Notehead Positioning (Priority: P1) 🎯 MVP

**Goal**: Position notehead glyphs at correct x (timing) and y (pitch) coordinates using SMuFL codepoints

**Independent Test**: Load 10-note score → verify each notehead at expected x/y within ±2 logical units, correct U+E0A2/U+E0A3/U+E0A4 codepoint

### Tests for US2 ⚠️ RED Phase

- [X] T017 [P] [US2] Unit test for pitch_to_y() in backend/src/layout/positioner.rs with various MIDI pitches
- [X] T018 [P] [US2] Unit test for notehead codepoint selection based on duration (whole=U+E0A2, half=U+E0A3, quarter=U+E0A4)
- [X] T019 [P] [US2] Integration test for 10-note layout verifying x/y positions match calculations

### Implementation for US2 🟢 GREEN Phase

- [X] T020 [P] [US2] Verify pitch_to_y() calculation in backend/src/layout/positioner.rs matches frontend expectations
- [X] T021 [P] [US2] Update position_noteheads() to select correct SMuFL codepoint based on duration_ticks
- [X] T022 [US2] Add duration-to-codepoint mapping: 3840→U+E0A2 (whole), 1920→U+E0A3 (half), ≤960→U+E0A4 (quarter/eighth)
- [X] T023 [US2] Verify glyph_runs populated correctly after input fix (T008-T009)
- [X] T024 [US2] Test with violin fixture - verify noteheads appear at expected positions with correct codepoints
- [X] T025 [US2] Add horizontal spacing validation - verify proportional spacing across measure width

**Checkpoint**: Noteheads render at correct positions with correct glyphs ✅ US2 COMPLETE

---

## Phase 5: User Story 3 - Structural Glyph Rendering (Priority: P2)

**Goal**: Render clefs, time signatures, and key signatures at system start with correct SMuFL codepoints

**Independent Test**: Load score with treble clef, 4/4 time, D major (2 sharps) → verify clef at x=20, time sig at x=100, sharps at correct line positions

### Tests for US3 ⚠️ RED Phase

- [X] T026 [P] [US3] Unit test for position_clef() in backend/src/layout/positioner.rs with treble/bass/alto/tenor clefs
- [X] T027 [P] [US3] Unit test for position_time_signature() verifying stacked digits at correct y-positions
- [X] T028 [P] [US3] Unit test for position_key_signature() with sharps/flats at standard positions
- [X] T029 [P] [US3] Integration test verifying structural_glyphs array populated with clef + time sig + key sig

### Implementation for US3 🟢 GREEN Phase

- [X] T030 [P] [US3] Implement position_clef() in backend/src/layout/positioner.rs with SMuFL codepoints (Treble=U+E050, Bass=U+E062, Alto=U+E05C, Tenor=U+E05D)
- [X] T031 [P] [US3] Add clef vertical positioning: treble on 2nd line, bass on 4th line, alto/tenor centered
- [X] T032 [P] [US3] Implement position_time_signature() with stacked numerator/denominator digits (U+E080-U+E089)
- [X] T033 [P] [US3] Add time signature vertical centering on staff (numerator above middle line, denominator below)
- [X] T034 [P] [US3] Implement position_key_signature() with sharp (U+E262) and flat (U+E260) glyphs
- [X] T035 [P] [US3] Add key signature positioning tables for each clef type (sharps: F C G D A E B, flats: B E A D G C F)
- [X] T036 [US3] Update compute_layout() in backend/src/layout/mod.rs to call position_structural_glyphs() for each staff
- [X] T037 [US3] Populate structural_glyphs array in Staff struct with clef, time sig, key sig
- [X] T038 [US3] Add SMuFL metrics for structural glyphs to backend/src/layout/metrics.rs (bounding boxes)
- [X] T039 [US3] Test with violin fixture - verify treble clef, 4/4 time sig appear at expected positions
- [X] T040 [US3] Test key signature rendering with various keys (C major, G major, F major, D major, Bb major)

**Checkpoint**: Clefs, time signatures, key signatures render correctly ✅ US3 COMPLETE

---

## Phase 6: User Story 4 - Stem and Beam Rendering (Priority: P2)

**Goal**: Render stems extending from noteheads and beams connecting eighth notes

**Independent Test**: Load 8 consecutive eighth notes → verify each has 35-unit stem, stems connected by horizontal beam, correct direction (up/down)

### Tests for US4 ⚠️ RED Phase

- [ ] T041 [P] [US4] Unit test for compute_stem_direction() in backend/src/layout/stems.rs based on pitch relative to middle line
- [ ] T042 [P] [US4] Unit test for create_stem() verifying 35 logical unit length and attachment point
- [ ] T043 [P] [US4] Unit test for group_beamable_notes() in backend/src/layout/beams.rs grouping by beat
- [ ] T044 [P] [US4] Unit test for compute_beam_slope() clamping to ±0.5 staff spaces per note
- [ ] T045 [P] [US4] Integration test for 8-note beamed group verifying stems + beam rendered

### Implementation for US4 🟢 GREEN Phase

- [ ] T046 [P] [US4] Create backend/src/layout/stems.rs module with Stem struct
- [ ] T047 [P] [US4] Implement compute_stem_direction() returning Up/Down based on notehead y-position
- [ ] T048 [P] [US4] Implement create_stem() calculating start/end points with 35 logical unit length
- [ ] T049 [P] [US4] Add stem attachment logic: stems-up attach to right side, stems-down attach to left side
- [ ] T050 [P] [US4] Create backend/src/layout/beams.rs module with Beam struct
- [ ] T051 [P] [US4] Implement group_beamable_notes() grouping eighth notes within same beat (based on tick position)
- [ ] T052 [P] [US4] Implement compute_beam_slope() calculating average pitch with ±0.5 staff space clamp
- [ ] T053 [P] [US4] Implement create_beam() generating horizontal beam with 0.5 staff space thickness
- [ ] T054 [US4] Encode stems as special glyphs with codepoint U+0000 (position = stem start, bounding box = full stem)
- [ ] T055 [US4] Encode beams as special glyphs with codepoint U+0001 (position = left endpoint, bounding box = beam rectangle)
- [ ] T056 [US4] Update position_glyphs_for_staff() in backend/src/layout/mod.rs to call stem/beam generation
- [ ] T057 [US4] Add stems to glyph array after noteheads
- [ ] T058 [US4] Add beams to glyph array after stems  
- [ ] T059 [US4] Test quarter note stem rendering (single stem, no beam)
- [ ] T060 [US4] Test eighth note beaming (4-note group with connecting beam)
- [ ] T061 [US4] Test stem direction on notes above/below middle line
- [ ] T062 [US4] Test beam slope calculation for ascending/descending pitches

**Checkpoint**: Stems and beams render correctly with proper direction and grouping ✅ US4 COMPLETE

---

## Phase 7: User Story 5 - Multi-Staff Layout with Braces (Priority: P3)

**Goal**: Render multiple staves with correct vertical spacing and connecting braces/brackets for multi-staff instruments

**Independent Test**: Load piano score (treble + bass) → verify 10 staff lines total (5 per staff), brace at x=0 spanning both staves, 80-unit vertical separation

### Tests for US5 ⚠️ RED Phase

- [ ] T063 [P] [US5] Integration test for piano layout verifying 2 staves with correct vertical spacing
- [ ] T064 [P] [US5] Unit test for brace/bracket positioning and vertical scaling in backend/src/layout/positioner.rs
- [ ] T065 [P] [US5] Contract test against piano_8_measures.json fixture verifying multi-staff output structure

### Implementation for US5 🟢 GREEN Phase

- [ ] T066 [P] [US5] Implement position_brace() in backend/src/layout/positioner.rs with SMuFL brace glyph (U+E000)
- [ ] T067 [P] [US5] Calculate brace vertical scaling to span from top staff line to bottom staff line
- [ ] T068 [P] [US5] Implement position_bracket() with SMuFL bracket glyph (U+E002) for ensemble scores
- [ ] T069 [US5] Update compute_layout() to detect multi-staff instruments and set bracket_type (Brace for piano, Bracket for ensemble)
- [ ] T070 [US5] Verify staff vertical spacing formula: 80 logical units between paired staves, 220 between systems
- [ ] T071 [US5] Add brace/bracket to staff_group rendering before staves
- [ ] T072 [US5] Test with piano fixture - verify treble + bass staves with brace
- [ ] T073 [US5] Test staff group separation - verify correct spacing between instrument groups
- [ ] T074 [US5] Test notes on both staves render correctly relative to their respective staff lines

**Checkpoint**: Multi-staff rendering works with braces/brackets ✅ US5 COMPLETE

---

## Phase 8: Integration & Validation

**Purpose**: End-to-end testing and fixture validation

- [ ] T075 Run full contract test suite against violin_10_measures.json fixture
- [ ] T076 Run full contract test suite against piano_8_measures.json fixture  
- [ ] T077 Verify deterministic output - run same input 10 times, compare SHA256 hashes
- [ ] T078 [P] Performance test: 10-measure score in <10ms (cargo bench layout_10_measures)
- [ ] T079 [P] Performance test: 100-measure score in <100ms (cargo bench layout_100_measures)
- [ ] T080 [P] Verify all SMuFL codepoints are in Bravura font range (U+E000-U+F8FF)
- [ ] T081 Rebuild WASM module with wasm-pack build --target web
- [ ] T082 Frontend integration test - load score in Layout View, verify notation renders
- [ ] T083 Browser console verification - no JavaScript errors, no "empty staff_groups" error
- [ ] T084 Visual verification - compare rendered output against violin/piano demos

**Checkpoint**: All tests passing, WASM module functional ✅

---

## Phase 9: Polish & Documentation

**Purpose**: Final improvements and cross-cutting concerns

- [ ] T085 [P] Add inline documentation comments for all public functions in backend/src/layout/
- [ ] T086 [P] Update backend/src/layout/README.md with architecture overview
- [ ] T087 [P] Document SMuFL codepoint mapping tables in research.md or code comments
- [ ] T088 [P] Add developer guide for engraving rules to specs/018-rust-layout-engraving/
- [ ] T089 Code cleanup: Remove TODO comments from positioner.rs
- [ ] T090 Code cleanup: Remove debug logging statements
- [ ] T091 [P] Run cargo clippy and fix all warnings
- [ ] T092 [P] Run cargo fmt to ensure consistent formatting
- [ ] T093 Update VALIDATION.md with test results and metrics
- [ ] T094 Follow quickstart.md validation steps end-to-end

**Checkpoint**: Feature complete and documented ✅

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
Phase 3 (US1: Staff Lines) ─┐
Phase 4 (US2: Noteheads) ───┼─→ Can run in parallel after Phase 2
Phase 5 (US3: Structural) ──┤
Phase 6 (US4: Stems/Beams) ─┤
Phase 7 (US5: Multi-Staff) ─┘
    ↓
Phase 8 (Integration)
    ↓
Phase 9 (Polish)
```

### User Story Completion Order

**MVP (Minimum Viable Product)**: US1 + US2 only  
- Staff lines + noteheads = recognizable notation display

**Full Feature**: US1 → US2 → US3 → US4 → US5  
- All user stories complete = professional music notation rendering

### Critical Path Tasks

1. **T005-T010**: Contract test + input parsing fix (BLOCKS all user stories)
2. **T013-T016**: Staff line spacing (US1 foundation)
3. **T020-T025**: Notehead positioning (US2 foundation)
4. **T030-T040**: Structural glyphs (US3 for readable notation)
5. **T046-T062**: Stems/beams (US4 for complete rendering)
6. **T075-T084**: Integration validation (confirms everything works)

### Parallel Opportunities

**Phase 1** (all parallelizable):
- T001, T002, T003, T004 can run simultaneously

**Phase 2** (sequential due to dependencies):
- T005-T007 must complete first (RED phase)
- T008-T010 follow (GREEN phase)

**Phase 3-7** (user stories can parallelize):
- After Phase 2 completes, US1-US5 can be developed by different team members simultaneously
- Within each story, tasks marked [P] can parallelize

**Example Parallel Execution for US3**:
```bash
# Run these 4 test tasks in parallel (RED phase):
cargo test test_position_clef &          # T026
cargo test test_position_time_signature & # T027
cargo test test_position_key_signature &  # T028
cargo test test_structural_glyphs &       # T029
wait

# Then implement these 6 tasks in parallel (GREEN phase):
# T030, T031, T032, T033, T034, T035 (all marked [P])
# Different team members can work on clefs, time sigs, key sigs simultaneously

# Then sequential integration tasks:
# T036-T040 (depend on prior completion)
```

---

## Implementation Strategy

### Week 1: MVP (P1 User Stories)

**Days 1-2**: Phase 1 + Phase 2 (Setup + Foundational)
- Fix input parsing (T008-T009)
- Contract tests scaffolded

**Days 3-4**: Phase 3 + Phase 4 (US1 + US2)
- Staff lines rendering correctly
- Noteheads positioned accurately
- **MVP Deliverable**: Basic notation visible in Layout View

**Day 5**: Integration testing
- Violin fixture validation
- Visual verification

### Week 2: Complete Feature (P2-P3 User Stories)

**Days 1-2**: Phase 5 (US3 - Structural Glyphs)
- Clefs, time signatures, key signatures render

**Days 3-4**: Phase 6 (US4 - Stems/Beams)
- Stems extend from noteheads
- Beams connect eighth notes

**Day 5**: Phase 7 (US5 - Multi-Staff)
- Piano rendering with braces
- Multi-staff vertical spacing

**Days 6-7**: Phase 8 + Phase 9 (Integration + Polish)
- Full test suite passing
- Piano fixture validation
- Documentation complete

---

## Success Criteria from spec.md

- ✅ **SC-001**: Output JSON matches violin_10_measures.json and piano_8_measures.json exactly
- ✅ **SC-002**: Noteheads positioned within ±2 logical units of expected coordinates
- ✅ **SC-003**: All SMuFL codepoints valid (U+E000-U+F8FF range)
- ✅ **SC-004**: Layout View renders notation from real scores without errors
- ✅ **SC-005**: 100-measure score renders in <100ms
- ✅ **SC-006**: Staff lines exactly 20 logical units apart
- ✅ **SC-007**: Multi-staff spacing correct (80 units paired, 220 units between systems)
- ✅ **SC-008**: staff_groups arrays populated (not empty)
- ✅ **SC-009**: Visual accuracy within 3 pixels at 1.0 zoom
- ✅ **SC-010**: Zero memory leaks (50 consecutive operations)
- ✅ **SC-011**: Deterministic output (10 runs = byte-identical JSON)
- ✅ **SC-012**: Error recovery works (skip invalid notes, continue rendering)

---

**Total Tasks**: 94 tasks  
**Estimated Timeline**: 1-2 weeks (MVP in 1 week, full feature in 2 weeks)  
**Test Tasks**: 26 tasks (28% test coverage by task count)  
**Parallelizable Tasks**: 34 tasks (36% can run in parallel)

**Ready to implement**: Follow quickstart.md → Start with Phase 2 contract tests (RED phase) → Fix input parsing (GREEN phase) → Proceed through user stories in priority order
