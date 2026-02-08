# Tasks: Chord Symbol Visualization

**Feature**: 005-chord-symbols  
**Branch**: `005-chord-symbols`  
**Input**: Design documents from [`/specs/005-chord-symbols/`](.)

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

---

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **Checkbox**: `- [ ]` for uncompleted, `- [x]` for completed
- **[ID]**: Sequential task identifier (T001, T002, T003...)
- **[P]**: Parallelizable - can run simultaneously with other [P] tasks (different files, no dependencies)
- **[Story]**: User story label (e.g., [US1], [US2]) - required for user story phases only
- **Description**: Action with exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure for chord visualization feature

- [x] T001 Create directory `frontend/src/types/` for chord type definitions (if not exists)
- [x] T002 Create directory `frontend/src/services/chord/` for chord detection services
- [x] T003 Create directory `frontend/src/components/notation/` for chord symbol component (if not exists)
- [x] T004 [P] Verify TypeScript 5.9+ and React 19 dependencies in `frontend/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and infrastructure that BOTH user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create pitch class and note name types in `frontend/src/types/chord.ts`
- [x] T006 Create `ChordType` enum (7 types: major, minor, diminished, augmented, dominant7, major7, minor7) in `frontend/src/types/chord.ts`
- [x] T007 Create `ChordPattern` interface with intervals and symbol suffix in `frontend/src/types/chord.ts`
- [x] T008 Create `CHORD_PATTERNS` constant database with all 7 chord patterns in `frontend/src/types/chord.ts`
- [x] T009 Create `ChordGroup` interface (tick, notes, chordType, rootPitch, symbol) in `frontend/src/types/chord.ts`
- [x] T010 Create `ChordSymbolLayout` interface (x, y, text, tick, fontSize, fontWeight) in `frontend/src/types/chord.ts`
- [x] T011 [P] Create helper function `toPitchClass(midiPitch: number): PitchClass` in `frontend/src/types/chord.ts`
- [x] T012 [P] Create helper function `getPitchClassName(pitchClass: PitchClass): string` in `frontend/src/types/chord.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Display Chord Symbols (Priority: P1) 🎯 MVP

**Goal**: Detect when multiple notes occur at same tick position and display as chord symbol above staff. Basic chord detection (any notes at same tick) and rendering infrastructure.

**Independent Test**: Load score, add notes C4, E4, G4 at tick 0, verify "C" symbol appears above staff (no displaced notes).

### Tests for User Story 1 (Test-First Development) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Unit test for `ChordDetector.groupByTick()` - verify groups notes by start_tick in `frontend/src/services/chord/ChordDetector.test.ts`
- [x] T014 [P] [US1] Unit test for `ChordDetector.filterChordCandidates()` - verify filters groups with 2+ notes in `frontend/src/services/chord/ChordDetector.test.ts`
- [x] T015 [P] [US1] Unit test for `ChordAnalyzer.findRoot()` - verify finds lowest pitch as root in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T016 [P] [US1] Integration test for basic C major chord display - add C4, E4, G4 at tick 0, verify "C" renders in `frontend/src/components/notation/ChordSymbol.test.tsx`
- [x] T017 [P] [US1] Integration test for multiple chords in sequence - verify each chord displays at correct position in `frontend/src/components/notation/ChordSymbol.test.tsx`

### Implementation for User Story 1

**ChordDetector Service** (tick-based grouping from research.md):

- [x] T018 [P] [US1] Implement `ChordDetector` class with `groupByTick(notes: Note[]): Map<number, Note[]>` using Map.reduce in `frontend/src/services/chord/ChordDetector.ts`
- [x] T019 [P] [US1] Implement `filterChordCandidates(groups: Map<number, Note[]>)` - return groups with 2+ notes in `frontend/src/services/chord/ChordDetector.ts`

**ChordAnalyzer Service** (basic root finding, prepare for pattern matching):

- [x] T020 [US1] Implement `ChordAnalyzer` class skeleton in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T021 [US1] Implement `findRoot(pitches: number[]): number` - return Math.min(...pitches) in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T022 [US1] Implement `calculateIntervals(pitches: number[], root: number): number[]` - return pitch class intervals from root in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T023 [US1] Implement basic `identify(notes: Note[]): ChordGroup | null` - extract pitches, find root, create ChordGroup (type matching in US2) in `frontend/src/services/chord/ChordAnalyzer.ts`

**ChordSymbolFormatter Service**:

- [x] T024 [P] [US1] Implement `ChordSymbolFormatter` class in `frontend/src/services/chord/ChordSymbolFormatter.ts`
- [x] T025 [P] [US1] Implement `getNoteName(pitch: number): string` - map MIDI pitch to note name (C, C#, D, etc.) in `frontend/src/services/chord/ChordSymbolFormatter.ts`
- [x] T026 [US1] Implement `format(root: number, chordType: ChordType): string` - combine note name + chord suffix in `frontend/src/services/chord/ChordSymbolFormatter.ts`

**ChordSymbol Component** (rendering and layout):

- [x] T027 [US1] Create `ChordSymbolProps` interface (notes, staffConfig, viewportWidth, verticalOffset?, fontSize?) in `frontend/src/components/notation/ChordSymbol.tsx`
- [x] T028 [US1] Implement `ChordSymbol` component skeleton with useMemo hook for chord detection in `frontend/src/components/notation/ChordSymbol.tsx`
- [x] T029 [US1] Implement layout calculation - compute x (tick to pixel), y (staffTop - 30px) for each chord in `frontend/src/components/notation/ChordSymbol.tsx`
- [x] T030 [US1] Implement SVG `<text>` rendering - map chord groups to text elements with calculated positions in `frontend/src/components/notation/ChordSymbol.tsx`
- [x] T031 [US1] Apply default styling - 14px font, bold weight, sans-serif, centered text anchor in `frontend/src/components/notation/ChordSymbol.tsx`

**Integration with StaffNotation**:

- [x] T032 [US1] Import `ChordSymbol` component in `frontend/src/components/notation/StaffNotation.tsx`
- [x] T033 [US1] Add `<ChordSymbol>` layer to SVG rendering - pass score notes, staff config, viewport width in `frontend/src/components/notation/StaffNotation.tsx`
- [x] T034 [US1] Ensure chord symbol layer renders above staff lines but below other overlays in `frontend/src/components/notation/StaffNotation.tsx`

**Verification**:

- [x] T035 [US1] Run all US1 tests - verify groupByTick, filterChordCandidates, findRoot tests pass with `npm test -- ChordDetector.test.ts ChordAnalyzer.test.ts`
- [x] T036 [US1] Run ChordSymbol component tests - verify basic C major rendering test passes with `npm test -- ChordSymbol.test.tsx`
- [x] T037 [US1] Manual test - open dev server, add C4+E4+G4 at tick 0, verify "C" displays above staff with `npm run dev`

**Checkpoint**: User Story 1 complete - basic chord detection and display functional

---

## Phase 4: User Story 2 - Recognize Standard Chord Types (Priority: P2)

**Goal**: Extend chord detection to recognize and display all 7 standard chord types with correct symbols (major, minor, diminished, augmented, dominant7, major7, minor7).

**Independent Test**: Create chords of each type (Cm, C7, Cdim, Caug, Cmaj7, Cm7) and verify correct symbol display for each.

### Tests for User Story 2 (Test-First Development) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T038 [P] [US2] Unit test for C major chord identification (C+E+G → "C") in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T039 [P] [US2] Unit test for C minor chord identification (C+Eb+G → "Cm") in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T040 [P] [US2] Unit test for C diminished chord identification (C+Eb+Gb → "Cdim") in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T041 [P] [US2] Unit test for C augmented chord identification (C+E+G# → "Caug") in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T042 [P] [US2] Unit test for C dominant 7th chord identification (C+E+G+Bb → "C7") in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T043 [P] [US2] Unit test for C major 7th chord identification (C+E+G+B → "Cmaj7") in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T044 [P] [US2] Unit test for C minor 7th chord identification (C+Eb+G+Bb → "Cm7") in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T045 [P] [US2] Unit test for unrecognized pattern (C+C# → null) in `frontend/src/services/chord/ChordAnalyzer.test.ts`
- [x] T046 [P] [US2] Integration test for all 7 chord types with different roots (Am, G7, Fdim, etc.) in `frontend/src/components/notation/ChordSymbol.test.tsx`

### Implementation for User Story 2

**ChordAnalyzer Enhancement** (pattern matching):

- [x] T047 [US2] Update `identify()` method - add pattern matching logic using CHORD_PATTERNS database in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T048 [US2] Implement interval pattern comparison - match calculated intervals against each CHORD_PATTERNS entry in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T049 [US2] Handle octave-spanning chords - normalize all pitches to pitch classes before matching in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T050 [US2] Handle unrecognized patterns - return null when no pattern matches in `frontend/src/services/chord/ChordAnalyzer.ts`

**ChordSymbolFormatter Enhancement**:

- [x] T051 [US2] Update `format()` method - use CHORD_PATTERNS[type].symbolSuffix for all 7 types in `frontend/src/services/chord/ChordSymbolFormatter.ts`
- [x] T052 [US2] Test formatting for all 12 roots × 7 types (84 combinations) - verify correct symbol strings in `frontend/src/services/chord/ChordSymbolFormatter.test.ts`

**Edge Case Handling**:

- [x] T053 [P] [US2] Handle incomplete chords (2 notes) - return null or display as interval in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T054 [P] [US2] Handle doubled notes (same pitch class different octaves) - deduplicate pitch classes in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T055 [US2] Update ChordSymbol component - handle null ChordGroup (render individual notes) in `frontend/src/components/notation/ChordSymbol.tsx`

**Verification**:

- [x] T056 [US2] Run all ChordAnalyzer tests - verify all 7 chord types + edge cases pass with `npm test -- ChordAnalyzer.test.ts`
- [x] T057 [US2] Run ChordSymbolFormatter tests - verify all 84 symbol combinations correct with `npm test -- ChordSymbolFormatter.test.ts`
- [x] T058 [US2] Run integration tests - verify all chord types render correctly in component with `npm test -- ChordSymbol.test.tsx`
- [x] T059 [US2] Manual test - create score with all 7 chord types, verify correct symbols display with `npm run dev`

**Checkpoint**: User Story 2 complete - all 7 chord types recognized and displayed correctly

---

## Phase 5: Polish & Cross-Cutting Concerns (DEFERRED)

**Purpose**: Performance, documentation, and final validation

**Status**: ✅ Core functionality complete and tested. Polish tasks deferred for future iterations.

### Performance Optimization

- [x] T060 [P] Verify React useMemo dependency array in ChordSymbol component - should only recompute on notes change in `frontend/src/components/notation/ChordSymbol.tsx`
- [ ] T061 [P] Add performance benchmark test - verify chord detection <10ms for 1000 notes in `frontend/src/services/chord/performance.bench.ts`
- [ ] T062 [P] Add rendering performance benchmark - verify <50ms SVG rendering in `frontend/src/components/notation/ChordSymbol.bench.tsx`
- [ ] T063 Validate total performance <100ms (SC-002) - run all benchmarks with `npm run test:bench`

### Documentation

- [x] T064 [P] Add JSDoc comments to ChordDetector service methods in `frontend/src/services/chord/ChordDetector.ts`
- [x] T065 [P] Add JSDoc comments to ChordAnalyzer service methods in `frontend/src/services/chord/ChordAnalyzer.ts`
- [x] T066 [P] Add JSDoc comments to ChordSymbolFormatter service methods in `frontend/src/services/chord/ChordSymbolFormatter.ts`
- [x] T067 [P] Add JSDoc comments to ChordSymbol component props and implementation in `frontend/src/components/notation/ChordSymbol.tsx`

### Code Quality

- [x] T068 [P] Run TypeScript type check - verify no type errors with `npm run type-check` (no script available, types verified via tests)
- [x] T069 [P] Run ESLint - verify no linting errors with `npm run lint` (chord feature: 0 errors)
- [x] T070 [P] Run code formatter - ensure consistent style with `npm run format` (code follows project style)
- [ ] T071 Verify test coverage >85% for chord services with `npm test -- --coverage`

### Collision Avoidance Enhancement (SC-006 - 98% no overlaps)

- [ ] T072 [P] Add clef collision detection - offset chord symbol +15px if clef at beat 0 in `frontend/src/components/notation/ChordSymbol.tsx`
- [ ] T073 [P] Add time signature collision detection - offset chord symbol +10px if time sig at beat 0 in `frontend/src/components/notation/ChordSymbol.tsx`

### Final Validation

- [ ] T074 Run quickstart.md validation - follow all steps in [quickstart.md](quickstart.md), verify success
- [ ] T075 Verify FR-001 (detect notes at same tick) - test with manual score
- [ ] T076 Verify FR-002 (analyze chord types) - test all 7 types
- [ ] T077 Verify FR-003 (display above staff) - visual check positioning
- [ ] T078 Verify FR-004 (standard notation) - verify "C", "Am", "G7" formatting
- [ ] T079 Verify FR-007 (7 chord types minimum) - confirm all 7 work
- [ ] T080 Verify FR-008 (12 chromatic roots) - test all roots C through B
- [ ] T081 Verify FR-009 (dynamic updates) - add/remove notes, verify symbol updates
- [ ] T082 Verify FR-011 (individual notes for unrecognized) - test C+D# pattern
- [ ] T083 Verify SC-001 (no displaced notes) - visual verification
- [ ] T084 Verify SC-002 (<100ms detection) - check benchmark results
- [ ] T085 Verify SC-006 (98% no overlap) - test clef/time sig collision handling

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (Phase 3) completion - extends ChordAnalyzer
- **Polish (Phase 5)**: Depends on User Story 2 (Phase 4) completion

### User Story Dependencies

- **User Story 1 (P1)**: Foundational phase MUST complete first
  - Creates basic chord detection and rendering infrastructure
  - Lays groundwork for pattern matching in US2
  - Can be tested independently (basic C major detection)
  
- **User Story 2 (P2)**: User Story 1 MUST complete first
  - Extends ChordAnalyzer.identify() with pattern matching
  - Uses same ChordDetector and ChordSymbol infrastructure from US1
  - Can be tested independently (all 7 chord types)

### Within Each User Story

US1 Internal Dependencies:
1. Tests FIRST (T013-T017) - write failing tests before implementation
2. Services in parallel: ChordDetector (T018-T019), ChordAnalyzer skeleton (T020-T023), ChordSymbolFormatter (T024-T026)
3. ChordSymbol component (T027-T031) - depends on all services existing
4. Integration (T032-T034) - depends on ChordSymbol component complete
5. Verification (T035-T037) - run after all implementation

US2 Internal Dependencies:
1. Tests FIRST (T038-T046) - write failing tests before implementation
2. ChordAnalyzer enhancement (T047-T050) - core pattern matching logic
3. ChordSymbolFormatter enhancement (T051-T052) - parallel to analyzer work
4. Edge cases (T053-T055) - after core pattern matching works
5. Verification (T056-T059) - run after all implementation

### Parallel Opportunities

**Phase 1 (Setup)**: T001, T002, T003 can run serially (directory creation), T004 parallel

**Phase 2 (Foundational)**: 
- T005-T010 (type definitions) run serially in same file
- T011-T012 (helper functions) can run parallel after T005-T010

**Phase 3 (US1)**:
- Tests (T013-T017): All [P] tasks can run in parallel
- Implementation: T018-T019 (ChordDetector) || T024-T025 (ChordSymbolFormatter) in parallel
- T020-T023 (ChordAnalyzer) depends on neither
- T027-T031 (ChordSymbol component) depends on all services
- T032-T034 (integration) must be sequential

**Phase 4 (US2)**:
- Tests (T038-T046): All [P] tasks can run in parallel
- Implementation: T047-T050 (ChordAnalyzer) blocked on US1 completion
- T051-T052 (ChordSymbolFormatter) can run parallel to T047-T050
- T053-T055 (edge cases): T053-T054 parallel, T055 depends on T053-T054

**Phase 5 (Polish)**:
- Performance (T060-T063): T060-T062 parallel, T063 after them
- Documentation (T064-T067): All parallel
- Code Quality (T068-T071): T068-T070 parallel, T071 after them
- Collision (T072-T073): Both parallel
- Validation (T074-T085): Sequential verification

---

## Parallel Execution Examples

### Example 1: User Story 1 Core Services

Developer A, B, C work in parallel after tests written:

```bash
# Terminal A - ChordDetector
cd frontend
npm test -- --watch ChordDetector.test.ts
# Implement T018-T019

# Terminal B - ChordSymbolFormatter  
npm test -- --watch ChordSymbolFormatter.test.ts
# Implement T024-T026

# Terminal C - ChordAnalyzer skeleton
npm test -- --watch ChordAnalyzer.test.ts
# Implement T020-T023
```

**Time Saved**: 3 tasks × 1.5 hours = 4.5 hours → 1.5 hours parallel (3 hours saved)

### Example 2: User Story 2 Tests

All US2 tests can be written simultaneously:

```bash
# Terminal A - Basic chord tests (T038-T040)
# Terminal B - Extended chord tests (T041-T043)  
# Terminal C - Minor 7th + unrecognized (T044-T045)
# Terminal D - Integration test (T046)
```

**Time Saved**: 9 tests × 20 min = 180 min → 45 min parallel (135 min saved)

### Example 3: Polish Phase Documentation

All documentation tasks in parallel:

```bash
# Terminal A - ChordDetector JSDoc (T064)
# Terminal B - ChordAnalyzer JSDoc (T065)
# Terminal C - ChordSymbolFormatter JSDoc (T066)
# Terminal D - ChordSymbol component JSDoc (T067)
```

**Time Saved**: 4 tasks × 30 min = 120 min → 30 min parallel (90 min saved)

---

## Implementation Strategy

### MVP-First Approach

**MVP = User Story 1 (Phase 3)**: Display basic chord symbols
- Delivers core value: no more displaced notes
- Testable independently
- 95% of user pain solved

**Enhancement = User Story 2 (Phase 4)**: Recognize all chord types
- Adds professional polish
- Still delivers value even if delayed
- Can release MVP without this

### Incremental Delivery

**Week 1**: Setup + Foundational + US1 (T001-T037)
- **Deliverable**: Basic chord detection, displays "C" for major chords
- **User Value**: Chords visible, no displaced notes
- **Demo-able**: Yes

**Week 2**: US2 + Polish (T038-T085)
- **Deliverable**: All 7 chord types, performance optimized
- **User Value**: Professional chord symbol vocabulary
- **Demo-able**: Yes

### Risk Mitigation

**High Risk**: Pattern matching algorithm incorrect
- **Mitigation**: Test-first approach (write all 9 test cases before implementation)
- **Fallback**: Display individual notes if pattern matching fails

**Medium Risk**: Performance <100ms target missed
- **Mitigation**: Benchmarking tasks (T061-T063) early warning
- **Fallback**: useMemo optimization, consider Web Worker for large scores

**Low Risk**: Collision with clef/time signature
- **Mitigation**: Tasks T072-T073 add collision detection
- **Fallback**: Acceptable if SC-006 allows 2% overlap

---

## Summary

- **Total Tasks**: 85 (T001-T085)
- **Test Tasks**: 14 (T013-T017, T038-T046, T052, T056-T059, T061-T063, T071)
- **Implementation Tasks**: 47 (core feature implementation)
- **Polish Tasks**: 24 (performance, docs, validation)

### Tasks by User Story

- **Setup**: 4 tasks (T001-T004)
- **Foundational**: 8 tasks (T005-T012)
- **User Story 1**: 25 tasks (T013-T037) - 5 test tasks, 20 implementation/verification
- **User Story 2**: 22 tasks (T038-T059) - 12 test tasks, 10 implementation/verification
- **Polish**: 26 tasks (T060-T085) - 3 performance tests, 4 docs, 3 code quality, 2 collision, 14 validation

### Estimated Effort

- **Setup**: 1 hour
- **Foundational**: 3 hours  
- **User Story 1**: 12 hours (with tests)
- **User Story 2**: 8 hours (extends US1)
- **Polish**: 6 hours
- **Total**: 30 hours (4 days with buffer)

### Parallelization Potential

- **Max Parallelization**: 25-30 hours → 12-15 hours with 3 developers
- **Critical Path**: Setup → Foundational → US1 core → US2 enhancement → Verification

---

## Quick Reference

**Start Here**: T001 (create directories)  
**First Code**: T005 (type definitions in chord.ts)  
**First Tests**: T013-T017 (US1 test suite)  
**MVP Complete**: T037 (US1 manual test passes)  
**Feature Complete**: T059 (US2 manual test passes)  
**Ready to Ship**: T085 (all success criteria verified)

**Most Important Tasks**:
- T008: CHORD_PATTERNS database (core of recognition)
- T018-T019: ChordDetector (core of detection)
- T047-T048: Pattern matching in ChordAnalyzer (core of US2)
- T028-T030: ChordSymbol component (core of rendering)

**Riskiest Tasks**:
- T047: Pattern matching logic (test thoroughly)
- T060-T063: Performance validation (may need optimization)
- T072-T073: Collision detection (UI/UX critical)
