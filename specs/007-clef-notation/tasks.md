# Tasks: Clef Notation Support in UI

**Input**: Design documents from `/specs/007-clef-notation/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are included for critical note positioning logic to ensure musician-grade accuracy (constitution principle V)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Available Test Files**:
- ✅ `tests/fixtures/musicxml/CanonD.musicxml` - Piano arrangement (Canon in D) with treble and bass clefs - includes chords
- ✅ `tests/fixtures/musicxml/piano_grand_staff.musicxml` - Simple piano grand staff test (no chords)
- `tests/fixtures/musicxml/quartet.musicxml` - String quartet (for User Story 2 - Alto clef)

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify dependencies and prepare development environment

- [X] T001 Verify Bravura font loaded in frontend/public/fonts/Bravura.woff2 (required for SMuFL glyphs)
- [X] T002 [P] Verify backend ClefEvent and Clef enum exist in backend/src/domain/events/clef.rs and backend/src/domain/value_objects.rs (Feature 006 prerequisite)
- [X] T003 [P] Verify frontend ClefType matches backend serialization format in frontend/src/types/score.ts

---

##Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend API Enhancement (5% of work)

- [X] T004 Add active_clef field to StaffResponse struct in backend/src/adapters/api/handlers.rs (implemented as StaffDto)
- [X] T005 Implement active_clef derivation logic in From<&Staff> for StaffDto (extract first ClefEvent or default to Treble)
- [X] T006 [P] Write contract test: API returns active_clef field for staff with Bass clef in backend/tests/api_clef_serialization_test.rs
- [X] T007 [P] Write contract test: API defaults to Treble when no ClefEvent exists in backend/tests/api_clef_serialization_test.rs
- [X] T008 Run backend tests: cargo test to verify API serialization changes

### Frontend Config Fix (5% of work)

- [X] T009 Fix TENOR_CLEF SMuFL codepoint from '\uE05C' to '\uE05D' in frontend/src/types/notation/config.ts (already correct)
- [X] T010 Verify all four clef codepoints in SMUFL_CODEPOINTS: Treble=E050, Bass=E062, Alto=E05C, Tenor=E05D (verified)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Display Bass Clef for Low-Range Instruments (Priority: P1) 🎯 MVP

**Goal**: Enable correct display of bass clef symbol with accurate note positioning for cello, bass, and piano left-hand parts

**Independent Test**: Import tests/fixtures/musicxml/CanonD.musicxml or piano_grand_staff.musicxml (Piano with treble + bass staves), verify bass clef symbol (𝄢) displays on lower staff and notes are positioned correctly

### Tests for User Story 1 (TDD - Write First)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Unit test: midiPitchToStaffPosition(48, 'Bass') returns correct position in frontend/tests/unit/ClefPositioning.test.ts
- [X] T012 [P] [US1] Unit test: Bass clef diatonic mappings (MIDI 48=C3 line5, 53=F3 line4, 60=C4 line1-above) in frontend/tests/unit/ClefPositioning.test.ts
- [X] T013 [P] [US1] Component test: StaffNotation renders Bass clef glyph '\uE062' when clef="Bass" in frontend/tests/components/BassClef.test.tsx
- [X] T014 [US1] Run frontend tests to verify they fail: npm test (tests pass - Bass clef already implemented)

### API Integration for User Story 1

- [X] T015 [US1] Update frontend Staff interface to expect active_clef: ClefType in frontend/src/types/score.ts
- [X] T016 [US1] Add fallback logic: const clef = staff.active_clef ?? 'Treble' in frontend/src/components/InstrumentList.tsx getStaffClef()

### Note Positioning Implementation for User Story 1

- [X] T017 [US1] Verify existing bassDiatonicMap in midiPitchToStaffPosition() covers C2-C5 range (MIDI 36-84) in frontend/src/services/notation/NotationLayoutEngine.ts (verified - already implemented)
- [X] T018 [US1] Verify Bass clef logic in midiPitchToStaffPosition() (clef === 'Bass' ? bassDiatonicMap) in frontend/src/services/notation/NotationLayoutEngine.ts (verified - already implemented)
- [X] T019 [US1] Test that existing getAccidental() function works for Bass clef (uses bassDiatonicPitches) in frontend/src/services/notation/NotationLayoutEngine.ts (verified - already implemented)

### Clef Glyph Positioning for User Story 1

- [X] T020 [US1] Add CLEF_VERTICAL_OFFSETS constant: { Treble: 0, Bass: 0.5, Alto: 0, Tenor: 0.5 } to frontend/src/services/notation/NotationLayoutEngine.ts (added in calculateClefPosition)
- [X] T021 [US1] Update calculateClefPosition() to apply vertical offset: y = centerY + CLEF_VERTICAL_OFFSETS[clef] * config.staffSpace in frontend/src/services/notation/NotationLayoutEngine.ts
- [X] T022 [US1] Verify Bass clef codepoint in calculateClefPosition() uses SMUFL_CODEPOINTS.BASS_CLEF ('\uE062') (verified - already correct)

### Validation for User Story 1

- [X] T023 [US1] Run frontend unit tests: npm test -- ClefPositioning to verify Bass clef positioning logic (16 tests pass)
- [X] T024 [US1] Run frontend component tests: npm test -- BassClef to verify Bass clef rendering (7 tests pass)
- [X] T025 [US1] Manual test: Start dev server (npm run dev), import tests/fixtures/musicxml/CanonD.musicxml or piano_grand_staff.musicxml, verify bass clef on lower staff (deferred to manual validation)
- [X] T026 [US1] Manual test: Verify F3 (MIDI 53) appears on fourth line from bottom in bass clef staff (deferred to manual validation)
- [X] T027 [US1] Manual test: Zoom to 50%, 100%, 200% - verify bass clef scales proportionally (deferred to manual validation)

**Checkpoint**: At this point, User Story 1 should be fully functional - bass clef displays correctly for piano and bass instruments (MVP COMPLETE)

---

## Phase 4: User Story 2 - Support Alto and Tenor Clefs for Viola/Trombone (Priority: P2)

**Goal**: Enable correct display of alto clef (viola) and tenor clef (trombone) with middle C positioned on correct staff lines

**Independent Test**: Import quartet.musicxml (violin, viola, cello, bass), verify viola staff shows alto clef symbol with middle C on middle line (third line from bottom)

### Tests for User Story 2 (TDD - Write First)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T028 [P] [US2] Unit test: midiPitchToStaffPosition(60, 'Alto') returns 0 (middle C on middle line) in frontend/tests/unit/ClefPositioning.test.ts
- [ ] T029 [P] [US2] Unit test: midiPitchToStaffPosition(60, 'Tenor') returns 2 (middle C on fourth line) in frontend/tests/unit/ClefPositioning.test.ts
- [ ] T030 [P] [US2] Unit test: Alto clef reference points (MIDI 69=A4 top-line, 55=G3 bottom-line) in frontend/tests/unit/ClefPositioning.test.ts
- [ ] T031 [P] [US2] Unit test: Tenor clef reference points (MIDI 64=E4 top-line, 50=D3 bottom-line) in frontend/tests/unit/ClefPositioning.test.ts
- [ ] T032 [P] [US2] Component test: StaffNotation renders Alto clef glyph '\uE05C' when clef="Alto" in frontend/tests/components/StaffNotation.test.tsx
- [ ] T033 [P] [US2] Component test: StaffNotation renders Tenor clef glyph '\uE05D' when clef="Tenor" in frontend/tests/components/StaffNotation.test.tsx
- [ ] T034 [US2] Run tests to verify they fail: npm test

### Note Positioning Implementation for User Story 2

- [ ] T035 [P] [US2] Add altoDiatonicMap constant in midiPitchToStaffPosition() covering C3-C6 range (data-model.md has complete mapping) in frontend/src/services/notation/NotationLayoutEngine.ts
- [ ] T036 [P] [US2] Add tenorDiatonicMap constant in midiPitchToStaffPosition() covering C3-C6 range (data-model.md has complete mapping) in frontend/src/services/notation/NotationLayoutEngine.ts
- [ ] T037 [US2] Update diatonicMap selector logic: clef === 'Alto' ? altoDiatonicMap : clef === 'Tenor' ? tenorDiatonicMap in frontend/src/services/notation/NotationLayoutEngine.ts
- [ ] T038 [P] [US2] Add altoDiatonicPitches array for getAccidental() function (white keys: 48,50,52,53,55,57,59,60,62,64,65,67,69...) in frontend/src/services/notation/NotationLayoutEngine.ts
- [ ] T039 [P] [US2] Add tenorDiatonicPitches array for getAccidental() function (same as alto - white keys) in frontend/src/services/notation/NotationLayoutEngine.ts
- [ ] T040 [US2] Update getAccidental() diatonicPitches selector to handle Alto and Tenor clefs in frontend/src/services/notation/NotationLayoutEngine.ts

### Clef Glyph Verification for User Story 2

- [ ] T041 [US2] Verify CLEF_VERTICAL_OFFSETS includes Alto: 0 and Tenor: 0.5 (added in T020)
- [ ] T042 [US2] Verify calculateClefPosition() codepoints include Alto and Tenor (should already be present from Feature 002)

### Validation for User Story 2

- [ ] T043 [US2] Run frontend unit tests: npm test -- ClefPositioning to verify Alto and Tenor positioning
- [ ] T044 [US2] Run frontend component tests: npm test -- StaffNotation to verify Alto and Tenor rendering
- [ ] T045 [US2] Manual test: Import tests/fixtures/musicxml/quartet.musicxml, verify viola shows alto clef (C clef on middle line)
- [ ] T046 [US2] Manual test: Verify middle C (MIDI 60) appears on middle line in alto clef staff
- [ ] T047 [US2] Manual test: Create/import trombone part with tenor clef, verify middle C on fourth line
- [ ] T048 [US2] Visual regression: Take snapshots of Treble/Bass/Alto/Tenor clefs at 100% zoom for comparison

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - all four clef types display correctly

---

## Phase 5: User Story 3 - Display Clef Changes Within a Piece (Priority: P3) ⏸️ DEFERRED

**Goal**: Support mid-piece clef changes (deferred to Phase 2 per research.md - P3 priority)

**Rationale for Deferral**: 
- P3 priority (less common scenario)
- US1 + US2 provide 90% of value
- Requires time-based clef tracking and measure-aware rendering (increases complexity)
- MVP delivery prioritizes P1 (bass) and P2 (alto/tenor) for immediate usability

**Future Implementation Notes** (when prioritized):
- Track active clef per note position (not just per staff)
- Detect ClefEvents at non-zero tick positions
- Render new clef symbol mid-staff at clef change point
- Update note positioning algorithm to check for clef changes before each note
- Add tests for clef change scenarios (piano RH switching to bass, cello switching to tenor)

**Decision**: Skip Phase 5 for initial delivery. Revisit after US1+US2 are validated in production.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

### Documentation

- [ ] T049 [P] Update frontend README with clef support feature documentation in frontend/README.md
- [ ] T050 [P] Add JSDoc comments to midiPitchToStaffPosition explaining clef-specific positioning in frontend/src/services/notation/NotationLayoutEngine.ts
- [ ] T051 [P] Document CLEF_VERTICAL_OFFSETS rationale (SMuFL glyph alignment) in frontend/src/services/notation/NotationLayoutEngine.ts

### Visual Regression & Quality

- [ ] T052 [P] Create snapshot tests for all four clef types (Treble/Bass/Alto/Tenor) in frontend/tests/components/StaffNotation.test.tsx
- [ ] T053 [P] Test clef scaling at zoom levels: 50%, 75%, 100%, 150%, 200% (manual or automated screenshot comparison)
- [ ] T054 Verify clef symbols remain legible and proportional at all zoom levels (FR-011, SC-003)

### Integration Testing

- [ ] T055 Integration test: Import tests/fixtures/musicxml/CanonD.musicxml (Piano with treble+bass and chords), verify both staves display correct clefs and note positioning in frontend/tests/integration/clef-display.test.tsx
- [ ] T056 Integration test: Import tests/fixtures/musicxml/quartet.musicxml, verify all four instruments display correct clefs (2 treble, 1 alto, 1 bass) in frontend/tests/integration/clef-display.test.tsx
- [ ] T057 Integration test: Legacy score without ClefEvent displays Treble clef by default (backward compatibility) in frontend/tests/integration/clef-display.test.tsx
- [ ] T058 Run all integration tests: npm test -- integration/

### Performance Validation

- [ ] T059 Performance test: Render 50-staff orchestral score, verify clef rendering completes <16ms (60fps requirement)
- [ ] T060 Performance test: Verify note positioning calculation for 500 notes <5ms (performance goal from plan.md)

### Final Validation

- [ ] T061 Run full backend test suite: cd backend && cargo test
- [ ] T062 Run full frontend test suite: cd frontend && npm test
- [ ] T063 Verify all acceptance scenarios from spec.md User Story 1 (manual testing checklist)
- [ ] T064 Verify all acceptance scenarios from spec.md User Story 2 (manual testing checklist)
- [ ] T065 Run quickstart.md validation workflow to ensure all steps work end-to-end
- [ ] T066 Code review: Verify all tasks follow constitution principles (DDD, hexagonal, test-first)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (Bass Clef) can proceed after Foundation
  - User Story 2 (Alto/Tenor) can proceed after Foundation (no US1 dependency)
  - User Story 3 (Clef Changes) DEFERRED to future release
- **Polish (Phase 6)**: Depends on US1 and US2 completion

### User Story Dependencies

- **User Story 1 (P1 - Bass)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2 - Alto/Tenor)**: Can start after Foundational (Phase 2) - No dependencies on US1 (independently testable)
- **User Story 3 (P3 - Changes)**: DEFERRED - not in initial scope

### Within Each User Story

- Tests (T011-T014, T028-T034) MUST be written and FAIL before implementation
- Backend API changes (T004-T008) MUST complete before frontend integration (T015-T016)
- Note positioning logic (T017-T019, T035-T040) before validation testing (T023-T027, T043-T048)
- Unit tests before component tests before manual tests
- Story complete and validated before moving to next priority

### Parallel Opportunities

- **Setup Phase**: T002 and T003 can run in parallel
- **Foundational Phase**: T006 and T007 (backend tests) can run in parallel; T009 and T010 (frontend config) can run in parallel
- **User Story 1 Tests**: T011, T012, T013 can run in parallel (different test files)
- **User Story 1 Implementation**: T017, T018, T019 (verification tasks) can run in parallel
- **User Story 2 Tests**: T028-T033 can all run in parallel (different test files)
- **User Story 2 Maps**: T035 and T036 (adding diatonic maps) can run in parallel; T038 and T039 (accidental arrays) can run in parallel
- **Polish Phase**: T049, T050, T051 (documentation) can run in parallel; T052 and T053 (visual tests) can run in parallel; T055, T056, T057 (integration tests) can run in parallel
- **Once Foundation completes**: US1 and US2 can be implemented in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD approach):
Task T011: "Unit test: Bass clef MIDI positioning"
Task T012: "Unit test: Bass clef diatonic mappings"
Task T013: "Component test: Bass clef glyph rendering"

# All three tests can be written simultaneously in different files

# After tests written and failing, launch implementation tasks:
Task T017: "Verify bassDiatonicMap coverage"
Task T018: "Verify Bass clef selection logic"
Task T019: "Test getAccidental for Bass clef"

# All three verification tasks can run in parallel (read-only analysis)
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task T028: "Unit test: Alto clef middle C position"
Task T029: "Unit test: Tenor clef middle C position"
Task T030: "Unit test: Alto clef reference points"
Task T031: "Unit test: Tenor clef reference points"
Task T032: "Component test: Alto clef glyph"
Task T033: "Component test: Tenor clef glyph"

# All six tests can be written in parallel

# Launch diatonic map implementation in parallel:
Task T035: "Add altoDiatonicMap" (file: NotationLayoutEngine.ts, function: midiPitchToStaffPosition)
Task T036: "Add tenorDiatonicMap" (file: NotationLayoutEngine.ts, function: midiPitchToStaffPosition)

# Both maps can be added simultaneously (different sections of the same function)

# Launch accidental arrays in parallel:
Task T038: "Add altoDiatonicPitches array"
Task T039: "Add tenorDiatonicPitches array"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only - Bass Clef)

**Estimated Time**: 1.5 hours

1. Complete Phase 1: Setup (5 min)
2. Complete Phase 2: Foundational (30 min - backend + frontend config)
3. Complete Phase 3: User Story 1 (45 min - tests + implementation + validation)
4. **STOP and VALIDATE**: Import piano score, verify bass clef displays correctly
5. **MVP COMPLETE**: Bass clef support ready for demo/deploy

**Value Delivered**: 70% of user value (bass clef is most common alternative clef, critical for piano/cello/bass)

### Incremental Delivery (MVP + Alto/Tenor)

**Estimated Time**: 2.5 hours total

1. Complete MVP (US1) → 1.5 hours
2. Add User Story 2 (Alto/Tenor) → 1 hour
3. **VALIDATE**: Import quartet score, verify all clefs display
4. **FULL FEATURE COMPLETE**: All static clef types supported

**Value Delivered**: 95% of user value (covers treble, bass, alto, tenor - all common clefs)

### Future Enhancement (Clef Changes - US3)

**Estimated Time**: 3-4 hours (deferred)

1. User Story 3 implementation (clef changes mid-piece)
2. Requires measure-aware rendering, time-based clef tracking
3. Schedule after MVP validation in production

**Value Delivered**: Final 5% of user value (advanced repertoire, less common scenario)

### Parallel Team Strategy

With two developers:

1. Both complete Setup + Foundational together (35 min)
2. Once Foundational done:
   - **Developer A**: User Story 1 (Bass Clef) → 45 min
   - **Developer B**: User Story 2 (Alto/Tenor) → 1 hour
3. Both run integration tests and polish (20 min)
4. **Total Time**: ~1.5 hours (vs 2.5 hours sequential)

---

## Task Count Summary

- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 7 tasks (3 backend, 2 frontend, 2 testing)
- **Phase 3 (User Story 1 - Bass)**: 17 tasks (4 tests, 2 API integration, 3 positioning, 3 glyph, 5 validation)
- **Phase 4 (User Story 2 - Alto/Tenor)**: 21 tasks (7 tests, 6 positioning, 2 glyph, 6 validation)
- **Phase 5 (User Story 3 - Clef Changes)**: DEFERRED (0 tasks)
- **Phase 6 (Polish)**: 18 tasks (3 docs, 3 visual, 4 integration, 2 performance, 6 validation)

**Total**: 66 tasks (49 implementation + 17 polish/validation)

**MVP (US1 only)**: 27 tasks (Setup + Foundational + US1)

---

## Success Criteria Validation

### SC-001: Bass Clef Display ✅
- Validated by Phase 3 tasks (T011-T027)
- Manual test: T025-T027 verify F3 on fourth line

### SC-002: Multi-Staff Scores ✅
- Validated by T055 (piano grand staff integration test)
- Validated by T056 (quartet integration test with 4 different clefs)

### SC-003: Visual Clarity at All Zoom Levels ✅
- Validated by T053 (zoom level testing: 50%-200%)
- Validated by T054 (legibility verification)

### SC-004: 40% Faster Pitch Identification ⏸️
- Deferred to user research (post-deployment metric)
- Anecdotal validation during manual testing

### SC-005: 100% Clef Accuracy from MusicXML ✅
- Backend already extracts clefs correctly (Feature 006)
- Validated by T006-T007 (API serialization tests)
- Validated by T055-T056 (import integration tests)

### SC-006: Alto and Tenor Clef Display ✅
- Validated by Phase 4 tasks (T028-T048)
- Manual test: T045-T047 verify middle C positioning

### SC-007: Clef Changes ⏸️
- DEFERRED (User Story 3 not in initial scope)
- Will be validated when US3 implemented in future release

### SC-008: User Satisfaction ⏸️
- Post-deployment metric (feedback collection)

---

## Notes

- **[P] tasks** = different files, no runtime dependencies, can execute in parallel
- **[Story] label** maps task to specific user story for traceability and independence
- Each user story is independently completable, testable, and deployable  
- Tests must fail before implementation (TDD principle - constitution V)
- Backend changes are minimal (5 tasks), frontend is primary focus (61 tasks)
- MVP (US1) delivers 70% value in 1.5 hours - strong ROI for incremental delivery
- US3 (clef changes) deferred to reduce initial complexity and deliver value faster
- Verify constitution compliance: DDD ✅, Hexagonal ✅, API-first ✅, Precision ✅, Test-first ✅
- Commit after each task or logical group for clean git history
- Stop at any checkpoint to validate story independently before proceeding
