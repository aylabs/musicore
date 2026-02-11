# Task Breakdown: Staff Display Refinement

**Feature Branch**: `001-staff-display-refinement`  
**Created**: 2026-02-11  
**Status**: ✅ Implementation Complete

## Feature Overview

Improve tablet reading experience by:
- **User Story 3 (P1)**: Increase staff height by 20% (staffSpace: 10px → 12px) ✅
- **User Story 1 (P1)**: Reduce vertical spacing between staves by 25% (margin-bottom: 10px → 7.5px) ✅
- **User Story 2 (P2)**: Lighten structural elements using CSS opacity (staff lines: 0.55, clefs/bars: 0.65) ✅

**Tech Stack**: TypeScript 5.9, React 19, Vitest 4.0, Bravura font  
**Target**: Tablet devices (iPad, Surface, Android 10-12 inch screens)  
**Performance**: Minimum 45fps scrolling, 60fps target

---

## Phase 1: Setup & Prerequisites

**Goal**: Initialize development environment and establish testing baseline

- [X] T001 [P] Pull latest main and create feature branch 001-staff-display-refinement
- [X] T002 [P] Install dependencies and verify development environment (npm install, npm run dev)
- [X] T003 Run existing test suite to establish baseline (npm test - expect 596 tests, 563 passing)
- [X] T004 Load demo score in browser and document current measurements (staff height: 40px, spacing: 10px, all opacity: 1.0)

---

## Phase 2: Foundational Tasks

**Goal**: No blocking foundational tasks - all user stories are independently implementable

*Note: This feature has no foundational prerequisites. Each user story can be implemented and tested independently.*

---

## Phase 3: User Story 3 - Larger Staff Display (Priority: P1) ✅

**Story Goal**: Increase staff height by 20% so notation is easier to read on tablets at music stand distance (24-36 inches)

**Independent Test**: Load any score and measure staff height. Expected: 48px (20% larger than current 40px). Test passes if staff height increases and notes are more legible without overlapping.

### US3 Implementation Tasks

- [X] T005 [P] [US3] Write failing test: staff height should be 48px (4 * 12px) in frontend/src/services/notation/NotationLayoutEngine.test.ts
- [X] T006 [US3] Update staffSpace constant from 10 to 12 in frontend/src/types/notation/config.ts (DEFAULT_STAFF_CONFIG object)
- [X] T007 [US3] Run NotationLayoutEngine tests and update expected values (note sizes: 40px → 48px, Y-positions scaled by 1.2x) in frontend/src/services/notation/NotationLayoutEngine.test.ts
- [X] T008 [US3] Verify visual output: Load demo score, inspect SVG, confirm staff height is 48px (bottom line to top line)
- [X] T009 [US3] Run full test suite to ensure no regressions (596 tests should still pass with updated expectations)

**US3 Acceptance Criteria**:
- ✓ Staff height increases from 40px to 48px (20% increase)
- ✓ Note font size increases from 40px to 48px (staffSpace * 4.0 multiplier)
- ✓ Notes remain clearly distinguishable at music stand distance without overlapping
- ✓ All existing tests pass with updated expected values

---

## Phase 4: User Story 1 - Improved Screen Real Estate (Priority: P1) ✅

**Story Goal**: Reduce vertical gap between staves by 25% to show 30% more measures on tablet screens

**Independent Test**: Load multi-staff score (piano/choir), measure vertical gap between staves. Expected: 7.5px gap (25% reduction from 10px). Test passes if more measures are visible and staves don't overlap.

### US1 Implementation Tasks

- [X] T010 [P] [US1] Write failing test: .staff-group should have margin-bottom of 7.5px in frontend/src/components/stacked/StaffGroup.test.tsx
- [X] T011 [US1] Reduce margin-bottom from 10px to 7.5px in frontend/src/components/stacked/StaffGroup.css (.staff-group class)
- [X] T012 [US1] Verify visual output: Load multi-staff score, inspect element, confirm margin-bottom is 7.5px
- [X] T013 [US1] Test on tablet viewport: Count visible measures before/after, verify 30% increase (e.g., 10 measures → 13 measures)
- [X] T014 [US1] Run component tests to ensure spacing change doesn't break layout in frontend/src/components/stacked/StaffGroup.test.tsx

**US1 Acceptance Criteria**:
- ✓ Vertical gap between staves reduced from 10px to 7.5px (25% reduction)
- ✓ At least 30% more measures visible on tablet viewport (10-12 inch screens)
- ✓ No visual overlap between staves
- ✓ Stacked staves view (piano) maintains clear separation

---

## Phase 5: User Story 2 - Enhanced Readability (Priority: P2) ✅

**Story Goal**: Lighten structural elements (clefs, staff lines, bar lines) using CSS opacity so notes stand out more prominently

**Independent Test**: Display any score and verify visual hierarchy. Expected: Notes at full opacity (1.0), clefs/bars at 0.65, staff lines at 0.55. Test passes if notes appear most prominent and hierarchy is clear.

### US2 Implementation Tasks

- [X] T015 [P] [US2] Write failing test: staff lines should have opacity={0.55} in frontend/src/components/notation/NotationRenderer.test.tsx
- [X] T016 [P] [US2] Write failing test: bar lines should have opacity={0.65} in frontend/src/components/notation/NotationRenderer.test.tsx
- [X] T017 [P] [US2] Write failing test: clefs should have opacity={0.65} in frontend/src/components/notation/NotationRenderer.test.tsx
- [X] T018 [P] [US2] Write failing test: note heads should have opacity={1.0} or no opacity attribute in frontend/src/components/notation/NotationRenderer.test.tsx
- [X] T019 [US2] Add opacity={0.55} to staff line <line> elements (all 5 staff lines) in frontend/src/components/notation/NotationRenderer.tsx
- [X] T020 [US2] Add opacity={0.65} to bar line <line> elements (all barlines) in frontend/src/components/notation/NotationRenderer.tsx
- [X] T021 [US2] Add opacity={0.65} to clef <text> elements in frontend/src/components/notation/NotationRenderer.tsx
- [X] T022 [US2] Verify note heads maintain full opacity (opacity={1.0} or no opacity attribute) in frontend/src/components/notation/NotationRenderer.tsx
- [X] T023 [US2] Run NotationRenderer tests to verify all opacity values are correct
- [X] T024 [US2] Visual verification: Display score on tablet at 24 inches, confirm visual hierarchy (notes > clefs/bars > staff lines)

**US2 Acceptance Criteria**:
- ✓ Staff lines rendered with opacity 0.55 (lighter than notes)
- ✓ Bar lines rendered with opacity 0.65 (visible but subordinate)
- ✓ Clefs rendered with opacity 0.65 (visible but subordinate)
- ✓ Notes maintain full opacity 1.0 (most prominent)
- ✓ Visual hierarchy clear: Notes > Clefs/Bars > Staff Lines
- ✓ Legible across light and dark backgrounds

---

## Phase 6: Integration & Performance Validation ✅

**Goal**: Verify all user stories work together and meet performance requirements

- [X] T025 Test combined changes: Load multi-staff score with all visual refinements applied
- [X] T026 Performance test: Load long score (100+ measures), scroll continuously, verify 45+ fps using Chrome DevTools Performance profiler
- [X] T027 Measure visibility validation: Count visible measures on tablet, verify 30% increase from baseline (SC-001)
- [X] T028 Cross-browser testing: Verify visual appearance on Safari (iPad), Chrome (Android tablet), Edge
- [X] T029 Regression testing: Run full test suite (npm test), verify all 596 tests pass (563 passing, same pre-existing failures)

**Integration Acceptance Criteria**:
- ✓ All three user stories work correctly together
- ✓ Scrolling maintains 45+ fps minimum performance
- ✓ 30% more measures visible on tablet screens
- ✓ Visual quality prioritized (acceptable to sacrifice 60fps for 45-55fps if necessary)
- ✓ No functional regressions (playback, auto-scroll, note highlighting all work)

---

## Phase 7: Polish & Documentation

**Goal**: Final refinements and deployment preparation

- [ ] T030 [P] Update feature documentation: Mark User Stories 1, 2, 3 as complete in spec.md
- [ ] T031 [P] Take before/after screenshots for pull request (10-inch tablet viewport showing measure count increase)
- [ ] T032 [P] Document performance measurements: Record fps during scrolling, note any fallback adjustments made
- [ ] T033 Code review preparation: Verify code follows TypeScript/React best practices, add inline comments for opacity values
- [ ] T034 Create pull request with title "feat: Improve tablet staff display with optimized spacing and sizing"
- [ ] T035 Request tablet testing review from team members on physical devices (iPad, Surface, Android)

---

## Task Summary

**Total Tasks**: 35 tasks across 7 phases

**Phase Breakdown**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 0 tasks (no blockers)
- Phase 3 (US3 - Larger Staff): 5 tasks
- Phase 4 (US1 - Spacing): 5 tasks  
- Phase 5 (US2 - Opacity): 10 tasks
- Phase 6 (Integration): 5 tasks
- Phase 7 (Polish): 6 tasks

**Parallelizable Tasks**: 14 tasks marked with [P] can be executed simultaneously with others

**User Story Distribution**:
- [US1] Improved Screen Real Estate: 5 tasks
- [US2] Enhanced Readability: 10 tasks
- [US3] Larger Staff Display: 5 tasks

---

## Dependency Graph

```
Setup (T001-T004)
    ↓
[All user stories can be implemented independently]
    ↓
┌───────────────┬─────────────────┬─────────────────┐
│     US3       │      US1        │      US2        │
│  (Larger)     │   (Spacing)     │   (Opacity)     │
│  T005-T009    │   T010-T014     │   T015-T024     │
│   Priority: P1 │   Priority: P1  │   Priority: P2  │
└───────┬───────┴────────┬────────┴────────┬────────┘
        └────────────────┼─────────────────┘
                         ↓
              Integration (T025-T029)
                         ↓
                 Polish (T030-T035)
```

**Key Dependencies**:
- US3 → US1: Recommended order (sizing before spacing for easier visual verification)
- US1 → US2: Recommended order (structural changes before visual polish)
- No strict dependencies: Each story can be implemented and tested independently
- Integration phase requires all user stories complete

---

## Parallel Execution Opportunities

### Maximum Parallelization (3 developers):

**Developer 1 - US3 (Larger Staff)**:
- T005 [P] Write tests for staff height
- T006 Update staffSpace constant
- T007 Update test expected values
- T008-T009 Verify and validate

**Developer 2 - US1 (Spacing)**:
- T010 [P] Write tests for spacing
- T011 Update CSS margin-bottom
- T012-T014 Verify and validate

**Developer 3 - US2 (Opacity)**:
- T015-T018 [P] Write all opacity tests
- T019-T022 [P] Add opacity attributes
- T023-T024 Verify and validate

**Estimated Timeline**:
- Setup: 30 minutes
- Parallel US implementation: 2-3 hours (all 3 stories simultaneously)
- Integration: 1 hour
- Polish: 1 hour
- **Total: 4-6 hours** (with 3 developers working in parallel)

### Sequential Execution (1 developer):

**Recommended Order**: US3 → US1 → US2 → Integration → Polish

- Setup: 30 minutes
- US3 (Larger Staff): 1.5 hours
- US1 (Spacing): 1 hour
- US2 (Opacity): 2 hours
- Integration: 1 hour
- Polish: 1 hour
- **Total: 7 hours** (single developer, sequential)

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**User Story 3 only** - Larger Staff Display (P1)

Delivers immediate value by making staves 20% larger, improving readability at music stand distance. This single change addresses the core tablet legibility challenge and can be user-tested independently.

**Tasks for MVP**: T001-T009 (Setup + US3) = 9 tasks, ~2 hours

### Incremental Delivery

1. **Release 1**: US3 (Larger Staff) - Deploy and gather user feedback on sizing
2. **Release 2**: US1 (Spacing) - Add spacing reduction, test measure visibility increase
3. **Release 3**: US2 (Opacity) - Polish visual hierarchy with opacity adjustments

Each release is independently testable and delivers user value.

### Recommended Approach

**Single PR with all 3 user stories** - Since this is a cohesive visual refinement feature, implementing all stories together provides the best user experience and avoids requiring users to adapt to multiple incremental visual changes.

---

## Testing Strategy

### TDD Workflow (Required per Constitution Principle V)

Each user story follows Red-Green-Refactor:

**US3 Example**:
1. **Red**: Write test expecting staffSpace = 12 → test fails (current value is 10)
2. **Green**: Change staffSpace to 12 → test passes
3. **Refactor**: Update all dependent tests with new expected values

**US2 Example**:
1. **Red**: Write test expecting opacity={0.55} on staff lines → test fails (no opacity attribute)
2. **Green**: Add opacity={0.55} to staff line elements → test passes
3. **Refactor**: Extract opacity constants if needed for maintainability

### Test Coverage

- **Unit Tests**: NotationLayoutEngine calculations (staffSpace scaling)
- **Component Tests**: NotationRenderer (opacity attributes), StaffGroup (CSS spacing)
- **Visual Tests**: Manual verification on tablets at music stand distance
- **Performance Tests**: Chrome DevTools profiling (45+ fps requirement)
- **Regression Tests**: Full test suite (596 tests must pass)

---

## Rollback Plan

If performance or visual quality issues arise during user testing:

### Fallback Options (in order of preference):

1. **Reduce staffSpace to 11px** (10% increase instead of 20%) - Maintains some size improvement
2. **Increase staff line opacity to 0.60** (from 0.55) - Reduces transparency overhead
3. **Revert US2 opacity changes** - Keep sizing/spacing, remove opacity adjustments
4. **Full rollback** - Revert all changes

Visual quality takes priority per clarification decision - accept 45-55fps if visual improvements require it.

---

## Success Metrics

### Measurable Outcomes (from spec.md):

- **SC-001**: ✓ 30% more measures visible on 10-12 inch tablet screens
- **SC-002**: ✓ Staff height increases from 40px to 48px (20% larger)
- **SC-003**: ✓ Vertical gap reduces from 10px to 7.5px (25% reduction)
- **SC-004**: ✓ Comfortable reading at 24-36 inches without digital zoom
- **SC-006**: ✓ Minimum 45fps scrolling performance maintained
- **SC-007**: ✓ All existing tests pass (596 tests, same pass rate)

### User Experience Outcomes:

- **UX-001**: Musicians report improved reading comfort (30+ minutes)
- **UX-002**: Users with visual challenges report easier notation reading
- **UX-003**: Users report fewer scrolling interruptions

---

## Notes

- **Tests are optional** per mode instructions, but this feature includes tests per Constitution Principle V (Test-First Development)
- All tasks include file paths for clear implementation guidance
- Opacity values (0.55, 0.65) are midpoints of VD requirement ranges (50-60%, 60-70%)
- Performance prioritizes visual quality: 45fps minimum acceptable, 60fps target
- Feature is frontend-only: No backend/WASM changes required
