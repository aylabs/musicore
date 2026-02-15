# Tasks: Playback Note Highlighting

**Feature**: 019-playback-note-highlight  
**Branch**: `019-playback-note-highlight`  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Input**: Design documents from `/specs/019-playback-note-highlight/`
- ✅ plan.md (tech stack: React 19.2, TypeScript, Vitest)
- ✅ spec.md (3 user stories: P1, P2, P3)
- ✅ research.md (linear scan + useMemo, CSS class toggle)
- ✅ data-model.md (HighlightState as Set<string>)
- ✅ contracts/ (TypeScript interfaces)
- ✅ quickstart.md (8 implementation steps)

**Implementation Strategy**: MVP-first approach - US1 delivers core highlighting value, US2 adds polyphony support, US3 ensures accessibility. Each story is independently testable with its own acceptance criteria.

---

## Phase 1: Setup & Foundation

**Goal**: Establish shared infrastructure (types, CSS, computation logic) required by all user stories

**Duration**: ~90 minutes

### Infrastructure Tasks

- [X] T001 [P] Create TypeScript interfaces in `frontend/src/types/highlight.ts` (copy from contracts/HighlightInterfaces.ts with simplified interfaces for UseNoteHighlightReturn, NoteElementHighlightProps, LayoutRendererHighlightProps)

- [X] T002 [P] Add CSS styles for note highlighting in `frontend/src/components/LayoutRenderer.css` with .glyph-run and .glyph-run.highlighted classes (blue fill #4A90E2, darker stroke #2E5C8A, 50ms transition)

- [X] T003 [P] Create pure function computeHighlightedNotes in `frontend/src/services/highlight/computeHighlightedNotes.ts` (linear scan algorithm: filter notes where currentTick >= start_tick AND currentTick < start_tick + duration_ticks, return Set<string>)

### Tests for Foundation

- [X] T004 [P] Write unit tests for computeHighlightedNotes in `frontend/src/services/highlight/computeHighlightedNotes.test.ts` (test cases: empty set before all notes, single note highlighted, multiple overlapping notes, note unhighlighted at exact end tick, edge case with currentTick = 0)

- [X] T005 Run foundation tests to verify baseline functionality (`npm test -- computeHighlightedNotes.test.ts`) ✓ 18/18 tests passing

---

## Phase 2: User Story 1 - Basic Note Highlighting (Priority: P1) 🎯 MVP

**Goal**: Implement core highlighting synchronized with audio playback for single-voice melodies

**Why MVP**: Delivers immediate value - users can follow along with simple melodies. Proves the concept works and establishes the foundation for polyphony (US2) and accessibility (US3).

**Independent Test**: Load a C major scale (8 quarter notes), press play, observe each note highlights when sounding and unhighlights when it stops. Test pause (highlights remain), resume (continues), stop (clears all), and seek (updates immediately).

**Duration**: ~2.5 hours

###Tests for User Story 1

- [X] T006 [P] [US1] Write unit tests for useNoteHighlight hook in `frontend/src/services/highlight/useNoteHighlight.test.ts` ✓ 15/15 tests passing (status='stopped' returns empty set, status='playing' returns computed highlights, status='paused' preserves last state, currentTick updates trigger recomputation)

- [ ] T007 [P] [US1] Write component tests for NoteElement highlighting in `frontend/src/components/score/NoteElement.test.tsx` (test: applies 'highlighted' class when isHighlighted=true, applies default 'note' class when isHighlighted=false, React.memo prevents re-renders when props unchanged)

### Implementation for User Story 1

- [X] T008 [US1] Create useNoteHighlight hook in `frontend/src/services/highlight/useNoteHighlight.ts` ✓ Implemented with useMemo optimization

- [X] T009 [US1] Implement useNoteHighlight logic using useMemo to call computeHighlightedNotes(notes, currentTick) when status='playing', return empty Set when status='stopped', preserve Set when status='paused' ✓ All logic complete

- [X] T010 [P] [US1] Update LayoutRenderer component to accept highlightedNoteIds and sourceToNoteIdMap props, check GlyphRun source references, and apply 'highlighted' class ✓ Implemented

- [ ] T011 [P] [US1] Wrap NoteElement in React.memo with custom comparison function in `frontend/src/components/score/NoteElement.tsx` (compare prev.isHighlighted === next.isHighlighted && prev.note.id === next.note.id to prevent unnecessary re-renders) [SKIPPED - No separate NoteElement component, highlighting applied at GlyphRun level]

- [X] T012 [US1] Wire up highlight state in ScoreViewer: extract currentTick and status from usePlayback, call useNoteHighlight(notes, currentTick, status), build sourceToNoteIdMap from score, pass props through LayoutView → pages/ScoreViewer → LayoutRenderer ✓ Complete data flow implemented

- [X] T013 [US1] Created sourceMapping.ts helper with buildSourceToNoteIdMap() and createSourceKey() for mapping GlyphRun SourceReferences to Note IDs ✓

### Integration Tests for User Story 1

- [ ] T014 [US1] Write integration test for play/pause/stop behavior in `frontend/tests/integration/note-highlight-integration.test.tsx` (test: play highlights notes, pause preserves highlights, stop clears highlights, verified with mock playback state)

- [ ] T015 [US1] Write integration test for seek behavior in `frontend/tests/integration/note-highlight-integration.test.tsx` (test: seeking to new currentTick immediately updates highlighted notes, verified by checking highlightedNoteIds before and after seek)

- [ ] T016 [US1] Run all US1 tests to verify acceptance criteria (`npm test`)

### Manual Test Validation for User Story 1

- [ ] T017 [US1] Manual test: Load simple melody (C major scale), play and verify each note highlights/unhighlights correctly (FR-001, FR-002)

- [ ] T018 [US1] Manual test: Pause playback mid-note and verify highlight remains visible, resume and verify continues correctly (FR-005, FR-008)

- [ ] T019 [US1] Manual test: Stop playback and verify all highlights cleared, position reset (FR-007)

- [ ] T020 [US1] Manual test: Seek to different position during playback and verify highlights update within 100ms (FR-006, SC-008)

---

## Phase 3: User Story 2 - Multiple Simultaneous Notes (Priority: P2)

**Goal**: Support highlighting multiple notes playing simultaneously (chords, polyphonic passages)

**Why this priority**: Extends US1 to handle realistic musical content with harmony and multiple voices. Most scores contain chords - this makes the feature useful beyond simple melodies.

**Independent Test**: Load a score with C-F-G-C chord progression (triads), play and verify all 3 notes in each chord highlight simultaneously. Test with multi-staff piano music to verify highlighting across staves.

**Duration**: ~1.5 hours

### Tests for User Story 2

- [ ] T021 [P] [US2] Write unit test for simultaneous note highlighting in `frontend/src/services/highlight/computeHighlightedNotes.test.ts` (test: multiple notes with overlapping time ranges all appear in Set, chord with 3 notes returns Set of size 3)

- [ ] T022 [P] [US2] Write unit test for partial chord release in `frontend/src/services/highlight/computeHighlightedNotes.test.ts` (test: chord where one note ends early - Set should contain only still-playing notes)

- [ ] T023 [P] [US2] Write component test for multiple highlighted notes rendering in `frontend/src/components/score/LayoutRenderer.test.tsx` (test: 3 notes highlighted simultaneously, all 3 NoteElements have 'highlighted' class)

### Implementation for User Story 2

- [ ] T024 [US2] Verify computeHighlightedNotes handles multiple simultaneous notes correctly (algorithm already supports this - linear scan adds all matching notes to Set)

- [ ] T025 [US2] Verify useNoteHighlight returns Set with multiple IDs when notes overlap (useMemo dependency on currentTick ensures recomputation captures all playing notes)

- [ ] T026 [US2] Verify LayoutRenderer correctly applies highlighting to multiple NoteElements simultaneously (map over all notes, check highlightedNoteIds.has(note.id) for each)

### Integration Tests for User Story 2

- [ ] T027 [US2] Write integration test for chord highlighting in `frontend/tests/integration/note-highlight-integration.test.tsx` (test: play C major triad, verify highlightedNoteIds.size === 3, check all three note IDs present)

- [ ] T028 [US2] Write integration test for multi-staff highlighting in `frontend/tests/integration/note-highlight-integration.test.tsx` (test: two staves with simultaneous notes, verify notes from both staves highlighted)

- [ ] T029 [US2] Write integration test for staggered note endings in `frontend/tests/integration/note-highlight-integration.test.tsx` (test: chord where notes have different durations, verify individual notes unhighlight at correct times)

- [ ] T030 [US2] Run all US2 tests to verify polyphonic highlighting (`npm test`)

### Manual Test Validation for User Story 2

- [ ] T031 [US2] Manual test: Load chord progression (C-F-G-C triads), play and verify all notes in each chord highlight simultaneously (FR-004, SC-004)

- [ ] T032 [US2] Manual test: Load multi-staff piano score, play and verify notes on both staves highlight when playing together (FR-004)

- [ ] T033 [US2] Manual test: Load dense orchestral passage (10+ simultaneous notes), play and verify all notes highlighted without visual degradation (SC-004, SC-009)

---

## Phase 4: User Story 3 - Visual Clarity & Accessibility (Priority: P3)

**Goal**: Ensure highlighted notes are clearly distinguishable in all contexts (dense scores, different screen sizes, various visual conditions)

**Why this priority**: Makes the feature practically useful in real-world scenarios. Without clear visual distinction, the feature fails its purpose even if technically correct.

**Independent Test**: Load sparse single-staff melody, dense piano music, and full orchestral score. Verify highlighted notes are clearly identifiable in each context at different zoom levels and on different screen sizes.

**Duration**: ~2 hours

### Tests for User Story 3

- [ ] T034 [P] [US3] Write visual regression tests for highlight styling in `frontend/src/components/score/LayoutRenderer.test.tsx` (test: verify 'highlighted' class applied with correct CSS properties - fill, stroke, stroke-width)

- [ ] T035 [P] [US3] Write accessibility test for highlight contrast in `frontend/tests/integration/note-highlight-accessibility.test.tsx` (test: verify color contrast ratio meets WCAG AA standard - blue #4A90E2 on white background)

- [ ] T036 [P] [US3] Write performance test for dense scores in `frontend/tests/integration/note-highlight-performance.test.tsx` (test: measuring render time with React Profiler for 1000 notes, verify <16ms per frame)

### Implementation for User Story 3

- [ ] T037 [US3] Review and refine CSS highlight styles in `frontend/src/components/score/LayoutRenderer.css` for visual clarity (ensure sufficient contrast, test on different backgrounds, verify note details not obscured)

- [ ] T038 [P] [US3] Add responsive considerations to highlight styles in `frontend/src/components/score/LayoutRenderer.css` (ensure stroke-width scales appropriately at different zoom levels, test on tablet screen sizes)

- [ ] T039 [P] [US3] Optimize React.memo comparison function in `frontend/src/components/score/NoteElement.tsx` if needed (ensure memoization prevents unnecessary re-renders during rapid playback)

- [ ] T040 [US3] Add error boundaries around highlight rendering in `frontend/src/components/score/LayoutRenderer.tsx` if needed (graceful degradation if highlighting fails - playback continues without highlights)

### Integration Tests for User Story 3

- [ ] T041 [US3] Write integration test for scroll + highlight in `frontend/tests/integration/note-highlight-integration.test.tsx` (test: verify highlights remain visible during score scroll, no visual artifacts)

- [ ] T042 [US3] Write performance integration test in `frontend/tests/integration/note-highlight-integration.test.tsx` (test: verify 60 Hz update rate maintained with 1000+ note score, measure with performance.now())

- [ ] T043 [US3] Run all US3 tests to verify visual clarity and performance (`npm test`)

### Manual Test Validation for User Story 3

- [ ] T044 [US3] Manual test: Load sparse melody, verify highlights clearly visible (FR-010, SC-007)

- [ ] T045 [US3] Manual test: Load dense piano score (many notes in close proximity), verify highlighted notes distinguishable from non-highlighted (FR-010, SC-007)

- [ ] T046 [US3] Manual test: Test on different screen sizes (iPad, Surface, Android tablet), verify highlights remain visible (FR-010)

- [ ] T047 [US3] Manual test: Play score while scrolling, verify highlights remain visible during scroll transitions (US3 acceptance scenario 3)

- [ ] T048 [US3] Manual test: Test at different zoom levels (50%, 100%, 150%), verify highlight styling scales appropriately (FR-010)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: Finalize edge cases, performance optimization, and documentation

**Duration**: ~1.5 hours

### Edge Case Validation

- [ ] T049 [P] Test with tempo changes: Play score, change tempo during playback, verify highlighting stays synchronized (FR-009, SC-005)

- [ ] T050 [P] Test with rapid notes: Play 32nd notes at 180 BPM, verify each note briefly highlights (FR-013)

- [ ] T051 [P] Test seeking mid-note: Seek to position where note is already playing, verify it immediately highlights (edge case from spec.md)

- [ ] T052 [P] Test with tied notes: Play tied notes spanning multiple measures, verify highlighting across all tied noteheads (FR-011, edge case from spec.md)

- [ ] T053 [P] Test with grace notes: Play score with grace notes/ornaments, verify brief highlighting during playback (FR-011, edge case from spec.md)

### Performance Validation

- [ ] T054 Profile highlight computation performance: Measure computeHighlightedNotes execution time for 500, 1000, 2000 notes using performance.now(), verify <2ms target (SC-009)

- [ ] T055 Profile React render performance: Use React DevTools Profiler to measure LayoutRenderer render time during playback, verify <5ms for render phase (SC-006)

- [ ] T056 Validate 60 fps: Use browser DevTools Performance tab to record playback session, verify frame rate stays at 60 fps throughout (FR-014, SC-006)

### Documentation & Cleanup

- [ ] T057 [P] Update README.md or feature documentation with usage instructions for playback highlighting feature

- [ ] T058 [P] Add JSDoc comments to public APIs in `frontend/src/services/highlight/useNoteHighlight.ts` and `frontend/src/services/highlight/computeHighlightedNotes.ts`

- [ ] T059 [P] Create manual test checklist in `specs/019-playback-note-highlight/checklists/manual-tests.md` with all acceptance scenarios from spec.md

- [ ] T060 [P] Update `specs/019-playback-note-highlight/spec.md` Known Issues section with any discovered bugs and regression tests created

---

## Summary Statistics

**Total Tasks**: 60
- **Setup & Foundation**: 5 tasks (~90 min)
- **User Story 1 (P1)**: 15 tasks (~2.5 hours) 🎯 MVP
- **User Story 2 (P2)**: 13 tasks (~1.5 hours)
- **User Story 3 (P3)**: 15 tasks (~2 hours)
- **Polish & Cross-Cutting**: 12 tasks (~1.5 hours)

**Estimated Total Time**: 8-10 hours (including tests and manual validation)

**Parallel Opportunities**:
- Foundation: T001, T002, T003, T004 can run in parallel (different files)
- US1: T006, T007, T010, T011 can run in parallel (different files)
- US2: T021, T022, T023 can run in parallel (different test files)
- US3: T034, T035, T036, T038, T039 can run in parallel (different files/concerns)
- Polish: T049-T053, T057-T060 can run in parallel

**MVP Scope** (minimum viable product):
- Phase 1: Setup & Foundation (T001-T005)
- Phase 2: User Story 1 (T006-T020)

Completing just these 20 tasks delivers core value: basic note highlighting synchronized with playback, handling play/pause/stop/seek correctly. Estimated 4 hours for MVP.

**Independent Test Criteria**:
- **US1**: Load C major scale, play, verify highlights follow notes
- **US2**: Load chord progression, play, verify all chord notes highlight together
- **US3**: Load dense score, play at various zoom levels, verify clarity

**Dependencies**:
- US2 depends on US1 (polyphony builds on basic highlighting)
- US3 depends on US1 and US2 (accessibility validates existing functionality)
- All user stories depend on Phase 1 (foundation)

**Suggested Story Completion Order**: US1 → US2 → US3 (by priority)

---

## Implementation Strategy

### MVP-First Approach
1. **Phase 1 + US1** = Minimum Viable Product (4 hours)
   - Delivers core highlighting value
   - Independently testable
   - Can be released to users for feedback

2. **Add US2** = Polyphony Support (1.5 hours)
   - Extends to realistic musical content
   - Independently testable with chord progressions

3. **Add US3** = Accessibility & Polish (2 hours)
   - Ensures practical usability
   - Performance validation

4. **Phase 5** = Final Polish (1.5 hours)
   - Edge cases and documentation

### Incremental Delivery
Each user story is a complete, deployable increment:
- US1: "Highlight single-note melodies during playback"
- US2: "Highlight chords and polyphonic passages during playback"
- US3: "Highlights are clearly visible and accessible in all contexts"

### Test-First Development
Constitution Principle V requires TDD:
- Write tests before implementation (T004, T006, T007 before T008-T013)
- Verify tests fail (red)
- Implement feature (green)
- Refactor (clean up)

### Parallelization Strategy
Tasks marked [P] can run in parallel:
- Different files: Types, CSS, tests can be created simultaneously
- Different concerns: Algorithm, React hook, component updates are independent
- Team workflow: Multiple developers can work on different stories concurrently after US1

---

## Validation Checklist

After completing all tasks, verify:

- [ ] All 14 functional requirements (FR-001 through FR-014) have passing tests
- [ ] All 10 success criteria (SC-001 through SC-010) are measurable and validated
- [ ] All 5 acceptance scenarios for US1 pass manual testing
- [ ] All 4 acceptance scenarios for US2 pass manual testing
- [ ] All 4 acceptance scenarios for US3 pass manual testing
- [ ] All 8 edge cases from spec.md are tested and handled correctly
- [ ] Performance targets met: <50ms lag (SC-001/002), 60 fps (SC-006), <2ms computation
- [ ] Constitution compliance: All 7 principles verified in implementation
- [ ] No regressions: All existing playback tests still pass

**Next Steps After Completion**:
1. PR review with constitution compliance check
2. Manual testing by product owner with acceptance scenarios
3. Performance profiling on target devices (iPad, Surface, Android tablets)
4. User feedback collection for future improvements (e.g., customizable highlight colors)
