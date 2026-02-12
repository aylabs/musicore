# Tasks: Layout-Driven Renderer

**Input**: Design documents from `/specs/017-layout-renderer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Feature**: Create SVG-based renderer using Feature 016 layout engine's computed positions. Organized by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=single voice, US2=visual comparison, US3=multi-staff, US4=performance)
- All paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions shared across all user stories

- [X] T001 Create TypeScript interfaces in frontend/src/types/LayoutRenderer.ts from contracts/LayoutRenderer.ts
- [X] T002 [P] Create TypeScript interfaces in frontend/src/types/RenderConfig.ts from contracts/RenderConfig.ts
- [X] T003 [P] Create TypeScript interfaces in frontend/src/types/Viewport.ts from contracts/Viewport.ts
- [X] T004 [P] Create TypeScript interfaces in frontend/src/types/VisualComparison.ts from contracts/VisualComparison.ts
- [X] T005 Verify Feature 016 WASM bindings available in frontend/src/wasm/layout.wasm
- [X] T006 Verify Feature 016 layoutUtils available in frontend/src/utils/layoutUtils.ts (47 tests)

**Checkpoint**: Type definitions complete, dependencies verified - user story implementation can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core rendering utilities and configuration that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create RenderConfig factory in frontend/src/utils/renderUtils.ts (createDefaultConfig, createDarkModeConfig, validateRenderConfig)
- [ ] T008 [P] Create Viewport utilities in frontend/src/utils/renderUtils.ts (createViewportFromSVG, intersectsViewport, getViewportArea)
- [ ] T009 [P] Implement getVisibleSystems() binary search in frontend/src/utils/renderUtils.ts (O(log n) system query)
- [ ] T010 Create SVG namespace constants and helper functions in frontend/src/utils/renderUtils.ts (svgNS, createSVGElement, createSVGGroup)
- [ ] T011 Unit test for RenderConfig validation in frontend/tests/unit/renderUtils.test.ts (validateRenderConfig throws on invalid)
- [ ] T012 [P] Unit test for getVisibleSystems in frontend/tests/unit/renderUtils.test.ts (binary search correctness, <1ms performance)
- [ ] T013 [P] Unit test for Viewport utilities in frontend/tests/unit/renderUtils.test.ts (intersectsViewport, createViewportFromSVG)

**Checkpoint**: Foundation ready (13 tasks) - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Render Single Voice (Priority: P1) 🎯 MVP

**Goal**: Display 10-measure single-staff score using layout engine positions, proving layout-renderer integration works

**Independent Test**: Import violin melody, compute layout, render, verify noteheads appear at GlobalLayout positions (±2 pixels)

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create LayoutRenderer class skeleton in frontend/src/components/LayoutRenderer.tsx (SVGSVGElement, config fields, empty render method)
- [ ] T015 [P] [US1] Create test fixture: 10-measure single-staff score in frontend/tests/fixtures/violin_10_measures.json
- [ ] T016 [US1] Implement LayoutRenderer.render() in frontend/src/components/LayoutRenderer.tsx (remove existing elements, query visible systems, create DocumentFragment)
- [ ] T017 [US1] Implement LayoutRenderer.renderSystem() in frontend/src/components/LayoutRenderer.tsx (create SVG <g> with transform for system)
- [ ] T018 [US1] Implement LayoutRenderer.renderStaffGroup() in frontend/src/components/LayoutRenderer.tsx (render braces/brackets, iterate staves)
- [ ] T019 [US1] Implement LayoutRenderer.renderStaff() in frontend/src/components/LayoutRenderer.tsx (draw 5 SVG <line> elements for staff lines at exact y-positions from layout)
- [ ] T020 [US1] Implement LayoutRenderer.renderGlyphRun() in frontend/src/components/LayoutRenderer.tsx (create SVG <text> element per GlyphRun with SMuFL codepoint)
- [ ] T021 [US1] Set SVG viewBox in LayoutRenderer.render() to use logical units from GlobalLayout (staff space = 20 logical units)
- [ ] T022 [US1] Add error handling in LayoutRenderer.render() for missing GlobalLayout (display error message, no crashes)
- [ ] T023 [US1] Add error handling for invalid SMuFL codepoints (render placeholder box with hex value, log warning)
- [ ] T024 [US1] Unit test for LayoutRenderer instantiation in frontend/tests/unit/LayoutRenderer.test.ts (constructor validates config)
- [ ] T025 [P] [US1] Unit test for LayoutRenderer.renderStaff() in frontend/tests/unit/LayoutRenderer.test.ts (5 lines at correct y-positions)
- [ ] T026 [P] [US1] Unit test for LayoutRenderer.renderGlyphRun() in frontend/tests/unit/LayoutRenderer.test.ts (SVG <text> with correct x, y, codepoint)
- [ ] T027 [US1] Integration test: render violin_10_measures fixture in frontend/tests/integration/SingleVoice.test.ts (verify SVG has systems, staves, glyphs)
- [ ] T028 [US1] Integration test: verify notehead positions in frontend/tests/integration/SingleVoice.test.ts (extract <text> elements, check x/y within ±2 pixels of layout)
- [ ] T029 [US1] Integration test: verify staff line positions in frontend/tests/integration/SingleVoice.test.ts (5 <line> elements per staff at layout.staff_lines[].y_position)
- [ ] T030 [US1] Integration test: verify system boundaries in frontend/tests/integration/SingleVoice.test.ts (SVG <g> transforms match layout.systems[].bounding_box)

**Checkpoint**: User Story 1 complete (17 tasks) - Single-voice rendering functional and independently testable

---

## Phase 4: User Story 2 - Visual Comparison (Priority: P1)

**Goal**: Side-by-side comparison of old vs new renderer with <5% pixel difference validation

**Independent Test**: Render same 10-measure score with both renderers, screenshot, compute pixel diff, verify <5%

### Implementation for User Story 2

- [ ] T031 [P] [US2] Create VisualComparison class in frontend/src/testing/VisualComparison.ts (oldRenderer, newRenderer, diffThreshold fields)
- [ ] T032 [P] [US2] Implement VisualComparison.captureSnapshot() in frontend/src/testing/VisualComparison.ts (convert SVG to ImageData via canvas)
- [ ] T033 [US2] Implement VisualComparison.computePixelDiff() in frontend/src/testing/VisualComparison.ts (compare RGB values, return percentage)
- [ ] T034 [US2] Implement VisualComparison.generateDiffImage() in frontend/src/testing/VisualComparison.ts (red highlight differences, semi-transparent matches)
- [ ] T035 [US2] Implement VisualComparison.compareRenderers() in frontend/src/testing/VisualComparison.ts (render both, capture, compute diff, return ComparisonResult)
- [ ] T036 [US2] Create saveDiffImage() utility in frontend/src/testing/VisualComparison.ts (save ImageData to PNG in test-results/)
- [ ] T037 [US2] Unit test for VisualComparison.computePixelDiff() in frontend/tests/unit/VisualComparison.test.ts (identical images = 0%, completely different = 100%)
- [ ] T038 [P] [US2] Unit test for VisualComparison.captureSnapshot() in frontend/tests/unit/VisualComparison.test.ts (returns valid ImageData with correct dimensions)
- [ ] T039 [US2] Playwright test: visual comparison for violin_10_measures in frontend/tests/integration/VisualComparison.test.ts (old vs new renderer, <5% diff)
- [ ] T040 [US2] Playwright test: visual comparison for piano_8_measures in frontend/tests/integration/VisualComparison.test.ts (<5% diff threshold)
- [ ] T041 [US2] Playwright test: verify system break parity in frontend/tests/integration/VisualComparison.test.ts (both renderers break at same measures ±1 system)
- [ ] T042 [US2] Integration test: compare notehead positions in frontend/tests/integration/VisualComparison.test.ts (average <2 pixel difference)
- [ ] T043 [US2] Integration test: save diff image on failure in frontend/tests/integration/VisualComparison.test.ts (test-results/[test-name]-diff.png)

**Checkpoint**: User Story 2 complete (13 tasks) - Visual comparison harness functional, validates renderer correctness

---

## Phase 5: User Story 3 - Multi-Staff Rendering (Priority: P2)

**Goal**: Display 8-measure piano score (treble + bass) with correct spacing and brace

**Independent Test**: Render piano score, verify both staves, correct spacing, brace connects staves

### Implementation for User Story 3

- [ ] T044 [P] [US3] Create test fixture: 8-measure piano score in frontend/tests/fixtures/piano_8_measures.json (treble + bass clefs)
- [ ] T045 [US3] Implement brace rendering in LayoutRenderer.renderStaffGroup() in frontend/src/components/LayoutRenderer.tsx (draw SMuFL brace glyph if staff_groups[].bracket_type === Brace)
- [ ] T046 [US3] Implement bracket rendering in LayoutRenderer.renderStaffGroup() in frontend/src/components/LayoutRenderer.tsx (draw SMuFL bracket glyph if bracket_type === Bracket)
- [ ] T047 [US3] Handle multi-staff spacing in LayoutRenderer.renderStaffGroup() in frontend/src/components/LayoutRenderer.tsx (use layout.staff_lines[0].y_position differences)
- [ ] T048 [US3] Ensure vertical alignment of simultaneous notes in LayoutRenderer.renderGlyphRun() in frontend/src/components/LayoutRenderer.tsx (same tick = same x-position from layout)
- [ ] T049 [US3] Unit test for brace rendering in frontend/tests/unit/LayoutRenderer.test.ts (verify SMuFL brace glyph at correct position)
- [ ] T050 [P] [US3] Unit test for bracket rendering in frontend/tests/unit/LayoutRenderer.test.ts (verify SMuFL bracket glyph)
- [ ] T051 [US3] Integration test: render piano_8_measures in frontend/tests/integration/MultiStaff.test.ts (verify 2 staves present)
- [ ] T052 [US3] Integration test: verify staff spacing in frontend/tests/integration/MultiStaff.test.ts (vertical separation matches layout.staff_lines[].y_position)
- [ ] T053 [US3] Integration test: verify brace in frontend/tests/integration/MultiStaff.test.ts (brace glyph connects both staves)
- [ ] T054 [US3] Integration test: verify vertical alignment in frontend/tests/integration/MultiStaff.test.ts (simultaneous notes have identical x-positions ±1 pixel)
- [ ] T055 [US3] Playwright test: visual comparison for piano_8_measures in frontend/tests/integration/VisualComparison.test.ts (multi-staff <5% diff vs old renderer)

**Checkpoint**: User Story 3 complete (12 tasks) - Multi-staff rendering functional, piano scores work correctly

---

## Phase 6: User Story 4 - Performance Validation (Priority: P2)

**Goal**: Maintain 60fps scrolling for 100-measure scores via DOM virtualization

**Independent Test**: Render 100-measure score, scroll continuously, measure frame rate, verify sustained 60fps

### Implementation for User Story 4

- [ ] T056 [P] [US4] Create test fixture: 100-measure score in frontend/tests/fixtures/score_100_measures.json (40 systems)
- [ ] T057 [US4] Implement DOM virtualization in LayoutRenderer.render() in frontend/src/components/LayoutRenderer.tsx (remove off-screen systems from DOM)
- [ ] T058 [US4] Add viewport tracking to LayoutRenderer in frontend/src/components/LayoutRenderer.tsx (update viewport on scroll events)
- [ ] T059 [US4] Optimize DOM insertion with DocumentFragment in LayoutRenderer.render() in frontend/src/components/LayoutRenderer.tsx (batch all system groups)
- [ ] T060 [US4] Add performance monitoring in LayoutRenderer.render() in frontend/src/components/LayoutRenderer.tsx (log render time if >16ms, warn on slow frames)
- [ ] T061 [US4] Performance test: getVisibleSystems query time in frontend/tests/performance/Virtualization.test.ts (100 systems, <1ms query via Chrome DevTools)
- [ ] T062 [US4] Performance test: 60fps scrolling in frontend/tests/performance/ScrollPerformance.test.ts (scroll 100-measure score, no dropped frames)
- [ ] T063 [US4] Performance test: DOM node count in frontend/tests/performance/Virtualization.test.ts (verify ~400 nodes per score via GlyphRun batching, not 2000+)
- [ ] T064 [US4] Performance test: visible system query in frontend/tests/performance/Virtualization.test.ts (binary search completes <1ms for 40 systems)
- [ ] T065 [US4] Chrome DevTools profiling in frontend/tests/performance/ScrollPerformance.test.ts (capture Performance timeline, verify frame times <16ms)

**Checkpoint**: User Story 4 complete (10 tasks) - Performance validated, 60fps achieved with long scores

---

## Phase 7: Integration & Polish

**Purpose**: Connect renderer to ScoreViewer, documentation, final validation

- [ ] T066 [P] Integrate LayoutRenderer into ScoreViewer component in frontend/src/pages/ScoreViewer.tsx (replace old renderer, add scroll event handling)
- [ ] T067 [P] Add zoom controls to ScoreViewer in frontend/src/pages/ScoreViewer.tsx (change SVG viewBox on zoom, not coordinate conversion)
- [ ] T068 Update quickstart.md with integration examples in specs/017-layout-renderer/quickstart.md (verify all code samples match implementation)
- [ ] T069 [P] Add dark mode support in frontend/src/components/LayoutRenderer.tsx (use RenderConfig for backgroundColor, staffLineColor, glyphColor)
- [ ] T070 Add error boundary to ScoreViewer in frontend/src/pages/ScoreViewer.tsx (catch rendering errors, display fallback UI)
- [ ] T071 [P] Create demo page in frontend/src/pages/RendererDemo.tsx (side-by-side old vs new, toggle between renderers)
- [ ] T072 Update README with renderer documentation in README.md (link to specs/017-layout-renderer/, performance metrics)
- [ ] T073 Run all visual comparison tests and document results in specs/017-layout-renderer/VALIDATION.md (pixel diff percentages, system break parity)
- [ ] T074 Validate quickstart.md steps in specs/017-layout-renderer/quickstart.md (follow guide from scratch, verify all steps work)

**Checkpoint**: Feature 017 complete (74 tasks total) - Layout-driven renderer production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately (6 tasks)
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories (7 tasks)
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - Can proceed in parallel if team has capacity
  - OR sequentially in priority order: US1 → US2 → US3 → US4
- **Polish (Phase 7)**: Depends on US1 (minimum MVP) or all user stories (full feature)

### User Story Dependencies

- **US1 (P1 - Single Voice)**: Foundation only - No dependencies on other stories  
  **Status**: Core MVP - MUST complete first
  
- **US2 (P1 - Visual Comparison)**: Depends on US1 (needs new renderer to compare)  
  **Status**: Critical validation - Complete immediately after US1
  
- **US3 (P2 - Multi-Staff)**: Foundation only - No dependencies on other stories  
  **Can start**: After Foundation (parallel with US1/US2 if staffed)
  
- **US4 (P2 - Performance)**: Depends on US1 (needs renderer to performance-test)  
  **Can start**: After US1 complete (parallel with US2/US3)

### Within Each User Story

**US1 (Single Voice)**:
1. Fixture + class skeleton (T014, T015) - parallel
2. Core rendering methods (T016-T021) - sequential (render → renderSystem → renderStaffGroup → renderStaff → renderGlyphRun)
3. Error handling (T022, T023) - after core complete
4. Unit tests (T024-T026) - parallel, can run alongside implementation (TDD)
5. Integration tests (T027-T030) - after implementation complete

**US2 (Visual Comparison)**:
1. VisualComparison class + utilities (T031-T036) - sequential
2. Unit tests (T037, T038) - parallel
3. Playwright tests (T039-T043) - after implementation complete

**US3 (Multi-Staff)**:
1. Fixture (T044) + brace/bracket rendering (T045-T048) - sequential
2. Unit tests (T049, T050) - parallel
3. Integration tests (T051-T055) - after implementation complete

**US4 (Performance)**:
1. Fixture (T056) + virtualization (T057-T060) - sequential
2. Performance tests (T061-T065) - parallel after implementation

### Parallel Opportunities

**Setup Phase (Phase 1)**:
```bash
# All type interface creation can run in parallel:
T002 [P] RenderConfig.ts
T003 [P] Viewport.ts
T004 [P] VisualComparison.ts
```

**Foundational Phase (Phase 2)**:
```bash
# Utilities can run in parallel once interfaces exist:
T008 [P] Viewport utilities
T009 [P] getVisibleSystems
T012 [P] Unit tests for getVisibleSystems
T013 [P] Unit tests for Viewport
```

**Within User Story 1**:
```bash
# Skeleton + fixture can start together:
T014 [P] LayoutRenderer skeleton
T015 [P] Test fixture

# Unit tests can run in parallel:
T025 [P] Test renderStaff
T026 [P] Test renderGlyphRun
```

**Within User Story 2**:
```bash
# Class creation and utilities can parallelize:
T031 [P] VisualComparison class
T032 [P] captureSnapshot

# Unit tests parallel:
T038 [P] Test captureSnapshot
```

**Within User Story 3**:
```bash
# Fixture and unit tests can parallelize:
T044 [P] Piano fixture
T050 [P] Unit test bracket
```

**Within User Story 4**:
```bash
# Test fixture can start early:
T056 [P] 100-measure fixture
```

**Polish Phase (Phase 7)**:
```bash
# Documentation and integration can parallelize:
T066 [P] ScoreViewer integration
T067 [P] Zoom controls
T069 [P] Dark mode support
T071 [P] Demo page
```

---

## Parallel Example: User Story 1

```bash
# Start together after Foundation complete:
Task T014 [P] [US1]: "Create LayoutRenderer skeleton"
Task T015 [P] [US1]: "Create violin_10_measures fixture"

# Then sequential core implementation:
Task T016 [US1]: "Implement render()" 
Task T017 [US1]: "Implement renderSystem()"
Task T018 [US1]: "Implement renderStaffGroup()"
# ... etc

# Then parallel unit tests:
Task T025 [P] [US1]: "Unit test renderStaff()"
Task T026 [P] [US1]: "Unit test renderGlyphRun()"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only - 30 tasks)

**Goal**: Prove layout-renderer integration works with single-voice rendering + visual validation

1. **Phase 1**: Setup (6 tasks) - Type interfaces
2. **Phase 2**: Foundational (7 tasks) - renderUtils, getVisibleSystems
3. **Phase 3**: US1 - Single Voice (17 tasks) - Core rendering
4. **Phase 4**: US2 - Visual Comparison (13 tasks) - Validation
5. **STOP and VALIDATE**: Test independently, compare with old renderer
6. **Deploy/Demo**: If <5% visual diff, MVP is shippable!

**MVP Deliverable**: New renderer can display single-voice scores correctly, validated against existing renderer.

### Incremental Delivery

1. **Foundation** (Setup + Foundational = 13 tasks) → Foundation ready
2. **+ US1** (17 tasks) → Test independently → **MVP!**
3. **+ US2** (13 tasks) → Test independently → **Validated MVP!**
4. **+ US3** (12 tasks) → Test independently → Multi-staff support added
5. **+ US4** (10 tasks) → Test independently → Performance optimized
6. **+ Polish** (9 tasks) → Final integration → **Production ready!**

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy (2-3 developers)

With multiple developers:

1. **Week 1**: Team completes Setup + Foundational together (13 tasks)
2. **Week 2**: Once Foundation done:
   - **Developer A**: US1 - Single Voice (17 tasks)
   - **Developer B**: Start US2 prep (VisualComparison class)
3. **Week 3**:
   - **Developer A**: US2 - Visual Comparison (after US1 complete)
   - **Developer B**: US3 - Multi-Staff (parallel, independent)
   - **Developer C**: US4 prep - Create 100-measure fixture
4. **Week 4**:
   - **Developer A**: US4 - Performance (needs US1 complete)
   - **Developer B**: Complete US3 + integration tests
   - **Developer C**: Polish phase (integration, docs)

Stories integrate independently, reducing merge conflicts.

---

## Validation Checklist

Before marking feature complete, verify:

- [ ] **US1**: violin_10_measures renders with noteheads at correct positions (±2px)
- [ ] **US2**: Visual diff <5% for all test fixtures vs old renderer
- [ ] **US2**: System breaks match ±1 system between renderers
- [ ] **US3**: piano_8_measures renders with both staves + brace
- [ ] **US3**: Multi-staff spacing matches layout engine's staff_lines[].y_position
- [ ] **US4**: 60fps sustained during scrolling of 100-measure score
- [ ] **US4**: getVisibleSystems query <1ms for 40 systems
- [ ] **US4**: DOM node count ~400 per score (GlyphRun batching working)
- [ ] **All**: No console errors or warnings during normal operation
- [ ] **All**: Error handling graceful (missing layout, invalid glyphs)
- [ ] **Integration**: ScoreViewer component uses new renderer
- [ ] **Integration**: Zoom controls work (viewBox scaling)
- [ ] **Integration**: Dark mode support functional
- [ ] **Docs**: quickstart.md validated end-to-end
- [ ] **Docs**: README updated with renderer documentation

---

## Progress Tracking

**Total Tasks**: 74  
**Setup**: 6 tasks (8%)  
**Foundational**: 7 tasks (9%)  
**US1 - Single Voice (P1)**: 17 tasks (23%)  
**US2 - Visual Comparison (P1)**: 13 tasks (18%)  
**US3 - Multi-Staff (P2)**: 12 tasks (16%)  
**US4 - Performance (P2)**: 10 tasks (14%)  
**Polish**: 9 tasks (12%)

**Critical Path** (sequential, no parallelization): 
Setup → Foundational → US1 → US2 → US3 → US4 → Polish = ~8-10 weeks solo

**Optimized Path** (with parallelization and MVP-first):
Setup → Foundational → (US1 + US2) → (US3 || US4) → Polish = ~4-6 weeks with 2 developers

---

## Notes

- **[P] tasks**: Different files, no dependencies, can parallelize
- **[Story] label**: Maps task to user story for traceability
- **Tests are OPTIONAL**: Only included because spec.md implies testing (visual comparison, performance validation)
- **SVG approach**: Research decision #1 chose SVG over Canvas, all tasks reflect SVG DOM API usage
- **No coordinate conversion**: Research decision #2 chose viewBox, no logicalToPixels() method needed
- **Commit often**: Commit after each task or logical group (e.g., after each rendering method)
- **Stop at checkpoints**: Validate each user story independently before moving to next priority
- **MVP flexibility**: Can stop after US1+US2 (43 tasks) for a validated minimum viable product

---

## Migration Note

If 60fps not achieved with SVG (discovered during US4 performance testing):

1. Keep LayoutRenderer interface identical
2. Implement Canvas2DRenderer class with same interface
3. Swap implementation in ScoreViewer (one-line change)
4. Re-run US2 visual comparison tests to validate Canvas output
5. Document performance comparison in specs/017-layout-renderer/VALIDATION.md

This migration would add ~8 tasks (Canvas implementation + tests) but preserves all integration work.
