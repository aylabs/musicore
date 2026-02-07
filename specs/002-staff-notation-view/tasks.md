# Tasks: Staff Notation Visualization

**Feature**: 002-staff-notation-view  
**Input**: Design documents from `/specs/002-staff-notation-view/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Test-First Approach**: Per Constitution V (Test-First Development - NON-NEGOTIABLE), all tests must be written FIRST and must FAIL before implementing the corresponding functionality.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for staff notation feature

- [X] T001 Download Bravura font WOFF2 file to frontend/public/fonts/Bravura.woff2 from https://github.com/steinbergmedia/bravura/releases
- [X] T002 Add @font-face declaration for Bravura font in frontend/src/index.css with font-display: block
- [X] T003 Create directory structure: frontend/src/types/notation/, frontend/src/services/notation/, frontend/src/components/notation/
- [X] T004 [P] Create barrel export frontend/src/types/notation/index.ts
- [X] T005 [P] Create barrel export frontend/src/services/notation/index.ts
- [X] T006 [P] Create barrel export frontend/src/components/notation/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and configuration that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create StaffConfig interface and DEFAULT_STAFF_CONFIG constant in frontend/src/types/notation/config.ts (12 properties: staffSpace, pixelsPerTick, minNoteSpacing, viewportWidth, viewportHeight, scrollX, marginLeft, clefWidth, keySignatureWidthPerAccidental, barlineWidth, renderBuffer, glyphFontSizeMultiplier)
- [X] T008 [P] Create LayoutGeometry interface in frontend/src/types/notation/layout.ts with properties: notes, staffLines, barlines, ledgerLines, clef, keySignatureAccidentals, totalWidth, totalHeight, marginLeft, visibleNoteIndices
- [X] T009 [P] Create NotePosition interface in frontend/src/types/notation/layout.ts with properties: id, x, y, pitch, start_tick, duration_ticks, staffPosition, glyphCodepoint, fontSize
- [X] T010 [P] Create StaffLine interface in frontend/src/types/notation/layout.ts with properties: y, x1, x2, lineNumber, strokeWidth
- [X] T011 [P] Create Barline interface in frontend/src/types/notation/layout.ts with properties: id, x, tick, y1, y2, measureNumber, strokeWidth
- [X] T012 [P] Create LedgerLine interface in frontend/src/types/notation/layout.ts with properties: id, x1, x2, y, noteId, strokeWidth
- [X] T013 [P] Create ClefPosition interface in frontend/src/types/notation/layout.ts with properties: type, x, y, glyphCodepoint, fontSize
- [X] T014 [P] Create AccidentalPosition interface in frontend/src/types/notation/layout.ts with properties: type, x, y, staffPosition, glyphCodepoint, fontSize
- [X] T015 [P] Create LayoutInput interface in frontend/src/types/notation/layout.ts with properties: notes, clef, keySignature, timeSignature, config

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Single Voice Notes on Staff (Priority: P1) 🎯 MVP

**Goal**: Render a five-line staff with treble/bass clef and note heads positioned correctly by pitch

**Independent Test**: Create a score with one voice containing notes C4, E4, G4 (MIDI 60, 64, 67). Navigate to that voice. System displays five-line staff with treble clef and three note heads positioned on correct lines/spaces.

### Tests for User Story 1 (Test-First: Write FIRST, ensure they FAIL) ⚠️

- [X] T016 [P] [US1] Unit test for midiPitchToStaffPosition() in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify middle C (60) maps to staffPosition -3.5 in treble clef, 5.0 in bass clef
- [X] T017 [P] [US1] Unit test for staffPositionToY() in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify staffPosition 2 (middle line) at y=70px with STAFF_TOP=50, staffPosition 4 (top line) at y=50px
- [X] T018 [P] [US1] Unit test for calculateStaffLines() in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify returns 5 lines with correct y coordinates (50, 60, 70, 80, 90 for staffSpace=10)
- [X] T019 [P] [US1] Unit test for calculateClefPosition() in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify treble clef uses U+E050, bass clef uses U+E062, positioned at x=marginLeft+20
- [X] T020 [P] [US1] Unit test for calculateNotePositions() in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify notes sorted by start_tick, positioned with correct x/y coordinates
- [X] T021 [P] [US1] Unit test for calculateLedgerLines() in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify ledger lines generated for staffPosition < 0 or > 4, extend 1.5x note head width
- [X] T022 [P] [US1] Integration test for NotationRenderer component in frontend/src/components/notation/NotationRenderer.test.tsx - render mock LayoutGeometry, verify 5 staff lines, 1 clef, N note heads rendered in SVG
- [X] T023 [P] [US1] Integration test for StaffNotation component in frontend/src/components/notation/StaffNotation.test.tsx - pass notes array, verify layout calculated and passed to renderer

### Implementation for User Story 1

- [X] T024 [P] [US1] Implement midiPitchToStaffPosition() helper function in frontend/src/services/notation/NotationLayoutEngine.ts - take MIDI pitch and clef, return staffPosition number (reference: treble line 2 = B4/MIDI 71, bass line 2 = D3/MIDI 50)
- [X] T025 [P] [US1] Implement staffPositionToY() helper function in frontend/src/services/notation/NotationLayoutEngine.ts - convert staffPosition to pixel Y-coordinate (y = STAFF_TOP + (4 - staffPosition) * staffSpace)
- [X] T026 [P] [US1] Implement calculateStaffLines() method in frontend/src/services/notation/NotationLayoutEngine.ts - generate 5 StaffLine objects at y positions 0, 1, 2, 3, 4 * staffSpace, x1=0 to x2=totalWidth
- [X] T027 [P] [US1] Implement calculateClefPosition() method in frontend/src/services/notation/NotationLayoutEngine.ts - return ClefPosition with correct SMuFL codepoint (U+E050 treble, U+E062 bass), x=marginLeft+20, y=70
- [X] T028 [US1] Implement calculateNotePositions() method in frontend/src/services/notation/NotationLayoutEngine.ts - sort notes by start_tick, calculate x using proportional spacing (tick * pixelsPerTick), calculate y using midiPitchToStaffPosition + staffPositionToY, ensure minimum spacing (depends on T024, T025)
- [X] T029 [US1] Implement calculateLedgerLines() method in frontend/src/services/notation/NotationLayoutEngine.ts - iterate NotePosition array, for each note with staffPosition < 0 or > 4, generate LedgerLine objects at even positions (depends on T028)
- [X] T030 [US1] Implement calculateLayout() main method in frontend/src/services/notation/NotationLayoutEngine.ts - orchestrate all calculation methods, return complete LayoutGeometry (depends on T026, T027, T028, T029)
- [X] T031 [US1] Create NotationRenderer component in frontend/src/components/notation/NotationRenderer.tsx - accept layout prop, render SVG with staff lines, clef text (className="music-glyph"), note head text elements
- [X] T032 [US1] Create StaffNotation coordinator component in frontend/src/components/notation/StaffNotation.tsx - accept notes, clef, timeSignature props, use useMemo to call NotationLayoutEngine.calculateLayout(), render NotationRenderer with layout (depends on T030, T031)
- [X] T033 [US1] Integrate StaffNotation into MusicTimeline component in frontend/src/components/MusicTimeline.tsx - extract voice notes, pass to StaffNotation component below existing note list display

**Checkpoint**: At this point, User Story 1 should be fully functional - five-line staff with clef and note heads visible and positioned correctly

---

## Phase 4: User Story 2 - Proper Spacing and Layout (Priority: P2)

**Goal**: Space notes proportionally by tick position and add measure barlines

**Independent Test**: Create voice with notes at ticks 0, 960, 1920, 3840. Visual spacing should show 3840 gap roughly twice as wide as 960 gap. Vertical barlines appear every 3840 ticks (4/4 time).

### Tests for User Story 2 (Test-First: Write FIRST, ensure they FAIL) ⚠️

- [X] T034 [P] [US2] Unit test for calculateBarlines() in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify barlines generated at correct tick intervals (3840 for 4/4, 2880 for 3/4), positioned at correct x coordinates
- [X] T035 [P] [US2] Unit test for proportional spacing in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify note at tick 1920 has x approximately twice that of note at tick 960
- [X] T036 [P] [US2] Unit test for minimum spacing enforcement in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify notes at tick 0 and tick 10 are at least minNoteSpacing (15px) apart despite proportional spacing being only 1px
- [X] T037 [P] [US2] Integration test for barline rendering in frontend/src/components/notation/NotationRenderer.test.tsx - verify barline SVG <line> elements rendered with correct x coordinates matching tick positions

### Implementation for User Story 2

- [X] T038 [P] [US2] Implement calculateBarlines() method in frontend/src/services/notation/NotationLayoutEngine.ts - calculate ticksPerMeasure from timeSignature (PPQ * (4/denominator) * numerator), generate Barline objects at measure boundaries from 0 to maxTick
- [X] T039 [US2] Update calculateNotePositions() in frontend/src/services/notation/NotationLayoutEngine.ts - add proportional spacing logic: baseX = marginLeft + clefWidth, x = baseX + (tick * pixelsPerTick), enforce minimum spacing from previous note
- [X] T040 [US2] Update calculateLayout() in frontend/src/services/notation/NotationLayoutEngine.ts - call calculateBarlines() and include barlines in returned LayoutGeometry (depends on T038)
- [X] T041 [US2] Update NotationRenderer component in frontend/src/components/notation/NotationRenderer.tsx - add barline rendering: map layout.barlines to SVG <line> elements with x1=x2=barline.x, y1=barline.y1, y2=barline.y2, stroke="black"

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - notes spaced proportionally with measure barlines visible

---

## Phase 5: User Story 3 - Interactive Note Selection (Priority: P3)

**Goal**: Click on note heads to select them with visual highlighting

**Independent Test**: Render staff with multiple notes. Click on a note head. Note highlights (changes color). Clicking another note deselects first and selects new one.

### Tests for User Story 3 (Test-First: Write FIRST, ensure they FAIL) ⚠️

- [X] T042 [P] [US3] Integration test for note click handling in frontend/src/components/notation/NotationRenderer.test.tsx - simulate click on note SVG element, verify onNoteClick callback fires with correct note ID
- [X] T043 [P] [US3] Integration test for note highlighting in frontend/src/components/notation/NotationRenderer.test.tsx - pass selectedNoteId prop, verify selected note rendered with fill="blue", unselected with fill="black"
- [X] T044 [P] [US3] Integration test for selection state in frontend/src/components/notation/StaffNotation.test.tsx - click note, verify selectedNoteId state updates, click another note, verify previous deselected

### Implementation for User Story 3

- [X] T045 [P] [US3] Add selectedNoteId state to StaffNotation component in frontend/src/components/notation/StaffNotation.tsx - useState<string | null>(null), handleNoteClick callback to toggle selection
- [X] T046 [US3] Update NotationRenderer component in frontend/src/components/notation/NotationRenderer.tsx - accept onNoteClick and selectedNoteId props, add onClick handler to note <text> elements, set fill={selectedNoteId === note.id ? 'blue' : 'black'}
- [X] T047 [US3] Connect selection state in StaffNotation component in frontend/src/components/notation/StaffNotation.tsx - pass selectedNoteId and handleNoteClick to NotationRenderer (depends on T045, T046)

**Checkpoint**: All user stories 1-3 should now work independently - notes can be clicked and highlighted

---

## Phase 6: User Story 4 - Scroll and Navigate Long Scores (Priority: P4)

**Goal**: Horizontal scrolling for scores longer than viewport with fixed clef margin

**Independent Test**: Create score with 10 measures (38,400 ticks). Horizontal scrollbar appears. Scrolling moves staff content while clef remains fixed in left margin.

### Tests for User Story 4 (Test-First: Write FIRST, ensure they FAIL) ⚠️

- [X] T048 [P] [US4] Unit test for calculateVisibleNoteIndices() in frontend/src/services/notation/NotationLayoutEngine.test.ts - verify returns correct startIdx and endIdx for notes within viewport + buffer, excludes notes outside range
- [X] T049 [P] [US4] Integration test for virtual scrolling in frontend/src/components/notation/NotationRenderer.test.tsx - mock layout with 1000 notes, verify only notes within visibleNoteIndices range are rendered in DOM
- [X] T050 [P] [US4] Integration test for scroll handling in frontend/src/components/notation/StaffNotation.test.tsx - simulate scroll event, verify scrollX state updates, layout recalculated with new scrollX, visible indices change

### Implementation for User Story 4

- [X] T051 [P] [US4] Implement calculateVisibleNoteIndices() method in frontend/src/services/notation/NotationLayoutEngine.ts - binary search notePositions array for notes with x between (scrollX - buffer) and (scrollX + viewportWidth + buffer), return {startIdx, endIdx}
- [X] T052 [US4] Update calculateLayout() in frontend/src/services/notation/NotationLayoutEngine.ts - call calculateVisibleNoteIndices() and include result in LayoutGeometry (depends on T051)
- [X] T053 [US4] Add scrollX state to StaffNotation component in frontend/src/components/notation/StaffNotation.tsx - useState(0), onScroll handler to update scrollX from e.currentTarget.scrollLeft
- [X] T054 [US4] Update StaffNotation memoization in frontend/src/components/notation/StaffNotation.tsx - add scrollX to useMemo dependencies so layout recalculates on scroll
- [X] T055 [US4] Update NotationRenderer component in frontend/src/components/notation/NotationRenderer.tsx - slice notes array using visibleNoteIndices: layout.notes.slice(startIdx, endIdx), render only visible notes
- [X] T056 [US4] Add scrollable container to StaffNotation component in frontend/src/components/notation/StaffNotation.tsx - wrap NotationRenderer in <div> with overflowX: auto, width: 100%, onScroll handler
- [X] T057 [US4] Implement fixed clef margin in frontend/src/components/notation/NotationRenderer.tsx - render clef and staff lines in separate SVG layer or with CSS position: sticky for left margin

**Checkpoint**: User stories 1-4 complete - long scores scroll smoothly with fixed clef

---

## Phase 7: User Story 5 - Responsive Staff Dimensions (Priority: P5)

**Goal**: Staff adapts to different viewport widths

**Independent Test**: Render same voice on 1920px, 1024px, 768px viewports. Staff scales appropriately while maintaining readable note sizes.

### Tests for User Story 5 (Test-First: Write FIRST, ensure they FAIL) ⚠️

- [ ] T058 [P] [US5] Integration test for viewport resize in frontend/src/components/notation/StaffNotation.test.tsx - mock window.innerWidth changes, verify useEffect updates viewportWidth state, layout recalculated
- [ ] T059 [P] [US5] Integration test for dimension recalculation in frontend/src/components/notation/StaffNotation.test.tsx - change viewportWidth prop, verify totalWidth and visibleNoteIndices updated in layout

### Implementation for User Story 5

- [ ] T060 [P] [US5] Add viewportWidth state to StaffNotation component in frontend/src/components/notation/StaffNotation.tsx - useState(1200), useRef for container div
- [ ] T061 [US5] Add resize observer to StaffNotation component in frontend/src/components/notation/StaffNotation.tsx - useEffect with ResizeObserver or window resize event listener, update viewportWidth from containerRef.current.clientWidth
- [ ] T062 [US5] Update StaffNotation memoization in frontend/src/components/notation/StaffNotation.tsx - add viewportWidth to useMemo dependencies so layout recalculates on viewport change (depends on T060, T061)

**Checkpoint**: All user stories 1-5 complete - feature fully functional with responsive design

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T063 [P] Add SMuFL codepoint constants in frontend/src/types/notation/config.ts - TREBLE_CLEF = '\uE050', BASS_CLEF = '\uE062', QUARTER_NOTE = '\uE0A4', etc.
- [ ] T064 [P] Add JSDoc comments to all NotationLayoutEngine methods in frontend/src/services/notation/NotationLayoutEngine.ts
- [ ] T065 [P] Add data-testid attributes to all SVG elements in frontend/src/components/notation/NotationRenderer.tsx for easier testing
- [ ] T066 [P] Performance optimization: add React.memo to NotationRenderer component in frontend/src/components/notation/NotationRenderer.tsx
- [ ] T067 [P] Performance optimization: add shouldComponentUpdate logic for note elements in frontend/src/components/notation/NotationRenderer.tsx
- [ ] T068 [P] Update README.md with feature description, screenshot, usage example
- [ ] T069 Validate all success criteria from spec.md - SC-001 (identify pitches <5s), SC-002 (render 100 notes <500ms), SC-003 (positioning <1px error), SC-004 (selection <50ms), SC-005 (1000 measures 60fps)
- [ ] T070 Run through quickstart.md validation checklist - verify font loads, notes positioned correctly, interactions work, performance targets met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel if staffed
  - Or sequentially in priority order: US1 (MVP) → US2 → US3 → US4 → US5
- **Polish (Phase 8)**: Depends on desired user stories being complete (minimum US1 for MVP)

### User Story Dependencies

- **User Story 1 (P1) - MVP**: Can start after Foundational (Phase 2) - Independent, no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 layout engine but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Adds interaction to US1 rendering but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Requires US1 renderer, adds scrolling without breaking basic rendering
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Requires US1 coordinator, adds responsiveness without breaking core functionality

### Within Each User Story

1. **Tests FIRST** - All test tasks marked [P] within a story can run in parallel, MUST be written and FAIL before implementation
2. **Pure functions** - Layout engine helper functions (T024, T025) can be implemented in parallel, these are leaf dependencies
3. **Calculation methods** - Layout engine methods (T026, T027) can be implemented in parallel as they don't depend on each other
4. **Orchestration** - calculateLayout() method depends on all calculation methods being complete
5. **Components** - Renderer and coordinator components implement in order: types → service → renderer → coordinator → integration

### Parallel Opportunities

**Setup Phase** - All tasks T004, T005, T006 (barrel exports) can run in parallel

**Foundational Phase** - All type definitions T007-T015 can be created in parallel (different interfaces)

**User Story 1 Tests** - Tasks T016-T023 can all be written in parallel (different test files/functions)

**User Story 1 Implementation** - Tasks T024, T025, T026, T027 can run in parallel (independent helper functions)

**User Story 2 Tests** - Tasks T034-T037 can run in parallel

**User Story 3 Tests** - Tasks T042-T044 can run in parallel

**User Story 4 Tests** - Tasks T048-T050 can run in parallel

**User Story 5 Tests** - Tasks T058-T059 can run in parallel

**Polish Phase** - Tasks T063-T068 can run in parallel (documentation, constants, attributes, memos)

**Cross-Story Parallelism** - If team has multiple developers:
  - After Foundational complete, Developer A works US1, Developer B works US2, Developer C works US3 simultaneously
  - Each story is independently testable and completable

---

## Parallel Example: User Story 1

```bash
# Step 1: Launch all tests for User Story 1 together (write these FIRST):
Parallel Task: "Unit test for midiPitchToStaffPosition() in NotationLayoutEngine.test.ts"
Parallel Task: "Unit test for staffPositionToY() in NotationLayoutEngine.test.ts"
Parallel Task: "Unit test for calculateStaffLines() in NotationLayoutEngine.test.ts"
Parallel Task: "Unit test for calculateClefPosition() in NotationLayoutEngine.test.ts"
Parallel Task: "Unit test for calculateNotePositions() in NotationLayoutEngine.test.ts"
Parallel Task: "Unit test for calculateLedgerLines() in NotationLayoutEngine.test.ts"
Parallel Task: "Integration test for NotationRenderer in NotationRenderer.test.tsx"
Parallel Task: "Integration test for StaffNotation in StaffNotation.test.tsx"
# Verify all tests FAIL (red)

# Step 2: Launch all helper functions together (green):
Parallel Task: "Implement midiPitchToStaffPosition() in NotationLayoutEngine.ts"
Parallel Task: "Implement staffPositionToY() in NotationLayoutEngine.ts"
Parallel Task: "Implement calculateStaffLines() in NotationLayoutEngine.ts"
Parallel Task: "Implement calculateClefPosition() in NotationLayoutEngine.ts"
# Tests for T016-T019 now PASS

# Step 3: Sequential implementation (dependencies):
Sequential Task: "Implement calculateNotePositions() in NotationLayoutEngine.ts" (depends on T024, T025)
Sequential Task: "Implement calculateLedgerLines() in NotationLayoutEngine.ts" (depends on T028)
Sequential Task: "Implement calculateLayout() in NotationLayoutEngine.ts" (depends on T026-T029)
# Tests for T020, T021 now PASS

# Step 4: Component implementation:
Sequential Task: "Create NotationRenderer component in NotationRenderer.tsx"
Sequential Task: "Create StaffNotation component in StaffNotation.tsx" (depends on T031)
Sequential Task: "Integrate StaffNotation into MusicTimeline.tsx" (depends on T032)
# Tests T022, T023 now PASS
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Minimum Viable Product - 40 tasks total (T001-T033 + selected polish)**

1. **Complete Phase 1: Setup** (6 tasks: T001-T006)
   - Download font, configure CSS, create directories
   
2. **Complete Phase 2: Foundational** (9 tasks: T007-T015)
   - All type definitions ready
   - CHECKPOINT: Foundation ready for user story work
   
3. **Complete Phase 3: User Story 1** (18 tasks: T016-T033)
   - Write all 8 tests FIRST, ensure they FAIL (red)
   - Implement all layout engine functions (green)
   - Build renderer and coordinator components (refactor)
   - Integrate with MusicTimeline
   - CHECKPOINT: Basic staff notation visible - **MVP COMPLETE**
   
4. **Selected Polish** (T063, T068, T069)
   - Add constants for maintainability
   - Update README
   - Validate success criteria
   - **READY FOR DEMO/DEPLOYMENT**

**MVP Delivers**: Five-line staff with clef and note heads correctly positioned by pitch - musicians can read notes in standard notation

### Incremental Delivery (MVP + Each Priority)

1. **MVP Deployed** (Setup + Foundational + US1) → Users can view notes on staff
   
2. **Add User Story 2** (Setup + Foundational + US1 + US2)
   - 8 additional tasks (T034-T041)
   - Test independently: Proportional spacing and barlines
   - **Deploy again**: Users can now read note timing and measure boundaries
   
3. **Add User Story 3** (Setup + Foundational + US1 + US2 + US3)
   - 6 additional tasks (T042-T047)
   - Test independently: Click and select notes
   - **Deploy again**: Users can interact with notes
   
4. **Add User Story 4** (All above + US4)
   - 10 additional tasks (T048-T057)
   - Test independently: Scroll through long scores
   - **Deploy again**: Users can work with real-world score lengths
   
5. **Add User Story 5** (All above + US5)
   - 5 additional tasks (T058-T062)
   - Test independently: Resize browser window
   - **Deploy again**: Users can use on different screen sizes
   
6. **Polish & Optimize** (Phase 8)
   - 8 additional tasks (T063-T070)
   - Performance optimization, documentation
   - **Final deployment**: Production-ready feature

**Each increment adds value without breaking previous functionality**

### Parallel Team Strategy

**With 3 developers after Foundational phase completes:**

- **Developer A (Frontend Lead)**: Phase 3 - User Story 1 (MVP critical path)
  - T016-T033 (18 tasks)
  - Focus: Core rendering engine
  
- **Developer B**: Phase 4 - User Story 2 (Spacing/Layout)
  - T034-T041 (8 tasks)
  - Can start in parallel with A
  - Focus: Barlines and proportional spacing
  
- **Developer C**: Phase 5 - User Story 3 (Interaction)
  - T042-T047 (6 tasks)
  - Can start in parallel with A and B
  - Focus: Click handlers and selection state

**Integration Point**: After all three user stories complete independently, test them working together (notes render + spaced correctly + clickable)

---

## Validation Checklist (from quickstart.md)

After implementation, verify these criteria:

### Visual Verification
- [ ] Staff appears: 5 horizontal lines visible
- [ ] Clef renders: Treble clef (𝄞) or bass clef (𝄢) in left margin
- [ ] Notes appear: Black note heads on/between staff lines
- [ ] Higher pitches appear higher: C5 (MIDI 72) above C4 (MIDI 60)
- [ ] Ledger lines: Very high/low notes show extra lines
- [ ] Barlines: Vertical lines every 4 beats (default 4/4 time)

### Interaction Verification
- [ ] Click note: Note head turns blue when clicked
- [ ] Click again: Deselects (turns black)
- [ ] Horizontal scroll: Staff scrolls left/right, clef stays fixed
- [ ] No lag: Scrolling feels smooth (60fps)

### Performance Verification (Chrome DevTools Performance tab)
- [ ] Render 100 notes: Initial render <500ms (SC-002)
- [ ] Scroll with 1000 notes: Maintains 60fps (SC-005)
- [ ] Click response: <50ms from click to highlight change (SC-004)
- [ ] Position accuracy: <1px vertical error for MIDI 48-84 (SC-003)
- [ ] Pitch identification: 3 random notes in <5s (SC-001)

---

## Notes

- **[P] marker**: Tasks can run in parallel if working in different files with no dependencies
- **[Story] label**: Maps task to specific user story (US1-US5) for traceability
- **Test-First**: Per Constitution V, tests MUST be written FIRST and FAIL before implementation (red-green-refactor)
- **Independent stories**: Each user story should be independently completable and testable without breaking previous stories
- **Commit strategy**: Commit after each task or logical group (e.g., all type definitions, all tests for one story)
- **Checkpoints**: Stop at each checkpoint to validate story independently before proceeding
- **MVP scope**: Minimum viable product is Setup + Foundational + User Story 1 (33 tasks total)
- **Frontend-only**: No backend changes required - uses existing GET /scores/{id} API

---

**Total Tasks**: 70  
**MVP Tasks**: 33 (Setup + Foundational + US1 + selected polish)  
**Estimated Duration (MVP)**: 2-3 developer days with Test-First approach  
**Estimated Duration (Full)**: 5-7 developer days for all user stories + polish

**Ready for Implementation**: ✅ All design documents complete, tasks ordered and parallelized efficiently
