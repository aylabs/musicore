# Tasks: Practice Complexity Levels

**Input**: Design documents from `specs/001-practice-complexity-levels/`  
**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/complexity-levels.ts](contracts/complexity-levels.ts) · [quickstart.md](quickstart.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelisable — different files, no dependency on an incomplete task
- **[Story]**: User story label (US1 / US2 / US3)
- All paths relative to `frontend/`

---

## Phase 1: Setup

**Purpose**: Confirm baseline before making changes

- [X] T001 Verify existing practice-view tests pass: `cd frontend && npm test -- --run plugins/practice-view`

---

## Phase 2: Foundational — Domain Types

**Purpose**: Add `ComplexityLevel` type and `COMPLEXITY_PRESETS` constant to `plugins/practice-view/practiceTypes.ts` — these block all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Write failing unit tests for `COMPLEXITY_PRESETS` in `plugins/practice-view/exerciseGenerator.test.ts` — assert each preset level (`'low'`, `'mid'`, `'high'`) maps to the exact `bpm`, `config.preset`, `config.noteCount`, `config.clef`, `config.octaveRange` values from `data-model.md`; tests MUST FAIL before T003
- [X] T003 Add `ComplexityLevel` union type, `ComplexityPreset` interface, `COMPLEXITY_PRESETS` constant, and `COMPLEXITY_LEVEL_STORAGE_KEY` to `plugins/practice-view/practiceTypes.ts` — verify T002 tests now pass

**Checkpoint**: `COMPLEXITY_PRESETS` exists, unit tests pass — user story implementation can begin

---

## Phase 3: User Story 1 — Select Complexity Level Before Practicing (Priority: P1) 🎯 MVP

**Goal**: User selects Low / Mid / High from the config sidebar; exercise immediately reflects the preset parameters; session starts in 2 steps

**Independent Test**: Open Practice plugin, click "Low", click Play — verify exercise uses C major scale, 8 notes, treble clef, C4–C5, 40 BPM

### Tests for User Story 1

> **Write these FIRST — they MUST FAIL before implementation**

- [X] T004 [P] [US1] Write component tests in `plugins/practice-view/PracticePlugin.test.tsx` asserting: level selector renders three buttons (Low / Mid / High); clicking "Low" sets `config.preset = 'c4scale'`, `config.noteCount = 8`, `config.clef = 'Treble'`, `bpmValue = 40`; clicking "Mid" sets `config.preset = 'random'`, `config.noteCount = 16`, `bpmValue = 80`; clicking "High" sets `config.preset = 'random'`, `config.noteCount = 20`, `config.clef = 'Bass'`, `bpmValue = 100`

### Implementation for User Story 1

- [X] T005 [US1] Add `complexityLevel: ActiveComplexityLevel` state (default `'low'`) and `applyComplexityLevel(level)` helper to `plugins/practice-view/PracticePlugin.tsx` — helper calls `updateConfig(COMPLEXITY_PRESETS[level].config)` + `updateBpm(COMPLEXITY_PRESETS[level].bpm)` + `setComplexityLevel(level)`
- [X] T006 [US1] Add Level selector UI block (Low / Mid / High buttons) at the top of `.practice-sidebar__sections` in `plugins/practice-view/PracticePlugin.tsx`; wire each button's `onClick` to `applyComplexityLevel`; disable selector while `phase !== 'ready'`
- [X] T007 [P] [US1] Add `.practice-level-selector`, `.practice-level-btn`, and `.practice-level-btn--active` CSS rules in `plugins/practice-view/PracticePlugin.css` — active level button visually distinct (per US3 SC-002 / FR-001)

**Checkpoint**: Level selector renders; selecting Low/Mid/High applies correct config+bpm; T004 tests pass; all prior tests still green

---

## Phase 4: User Story 2 — Switch Complexity Level Between Sessions (Priority: P2)

**Goal**: Last selected complexity level is restored after navigation, page refresh, and app restart

**Independent Test**: Select "High", reload page, open Practice plugin — selector shows "High" as active; starting a session uses 20 notes, bass clef, C2–C4, 100 BPM

### Tests for User Story 2

> **Write these FIRST — they MUST FAIL before implementation**

- [X] T008 [P] [US2] Extend `plugins/practice-view/PracticePlugin.test.tsx`: assert that selecting "Mid" writes `'mid'` to `localStorage['practice-complexity-level-v1']`; assert that when localStorage contains `'high'` on mount, the selector initialises with "High" active and config/bpm set to High preset values; assert that absent/invalid values default to `'low'`

### Implementation for User Story 2

- [X] T009 [US2] On `PracticePlugin` mount, read `localStorage.getItem('practice-complexity-level-v1')`; if valid `ComplexityLevel` value call `applyComplexityLevel()`, else call `applyComplexityLevel('low')` — initialise `complexityLevel` and config/bpm from stored value in `plugins/practice-view/PracticePlugin.tsx`
- [X] T010 [US2] In `applyComplexityLevel()`, after updating state, write `localStorage.setItem(COMPLEXITY_LEVEL_STORAGE_KEY, level)` in `plugins/practice-view/PracticePlugin.tsx`

**Checkpoint**: Level selection persists across remounts; T008 tests pass; SC-004 criteria satisfied

---

## Phase 5: User Story 3 — Visual Differentiation of Levels (Priority: P3)

**Goal**: Each level button shows its name and a brief parameter summary; current selection is visually distinct; Advanced parameter override clears the level badge

**Independent Test**: Open Practice plugin — each of the three level buttons displays its name and parameter description; selecting "Mid" then changing the Notes slider results in no level button appearing selected

### Tests for User Story 3

> **Write these FIRST — they MUST FAIL before implementation**

- [X] T011 [P] [US3] Extend `plugins/practice-view/PracticePlugin.test.tsx`: assert each level button renders a visible description string (e.g., "8 notes · Treble · 40 BPM"); assert that after selecting "Low" and then firing an `onChange` on the Notes slider, `complexityLevel` becomes `null` and no level button has the active CSS class

### Implementation for User Story 3

- [X] T012 [US3] Add `description` field to each `COMPLEXITY_PRESETS` entry in `plugins/practice-view/practiceTypes.ts` (e.g., Low: `"8 notes · Treble · 40 BPM"`, Mid: `"16 notes · Treble · 80 BPM"`, High: `"20 notes · Bass · 100 BPM"`); render description text beneath each level button in `plugins/practice-view/PracticePlugin.tsx`
- [X] T013 [US3] In all existing individual-parameter `onChange` handlers in `plugins/practice-view/PracticePlugin.tsx` (Notes slider, Clef radio, Octave radio, BPM input, Score/Random/C4Scale preset radio), add `setComplexityLevel(null)` so the badge clears when user overrides a parameter (FR-009)
- [X] T014 [P] [US3] Add `.practice-level-btn__description` and `.practice-advanced` disclosure CSS rules in `plugins/practice-view/PracticePlugin.css`

**Checkpoint**: All level buttons show descriptions; custom-mode clears badge; T011 tests pass; all three user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E coverage, documentation, final validation

- [X] T015 [P] Create E2E spec `e2e/practice-complexity-levels.spec.ts` with scenarios: SC-001 (select Low → practice starts within 15 s), SC-002 (each level produces parameters matching FR-002/FR-003/FR-004), SC-003 (session reachable in 2 interactions: click level → click Play), SC-004 (select High → reload → selector shows High)
- [X] T016 Run full unit + component test suite: `cd frontend && npm run validate`
- [X] T017 Run E2E spec against production build: `VITE_BASE=/musicore/ npm run build && npx vite preview --base /musicore/ --port 4173 & npx playwright test e2e/practice-complexity-levels.spec.ts --reporter=list`
- [X] T018 [P] Update `FEATURES.md` to document the complexity levels feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — delivers MVP
- **Phase 4 (US2)**: Depends on Phase 3 (building on same state machinery)
- **Phase 5 (US3)**: Depends on Phase 3 (needs level buttons to test badge-clear)
- **Phase 6 (Polish)**: Depends on Phases 3 + 4 + 5

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational types — independent MVP
- **US2 (P2)**: Depends on US1 (`applyComplexityLevel` must exist before adding localStorage)
- **US3 (P3)**: Depends on US1 (needs level buttons to exist before adding description + badge-clear)

### Within Each User Story

1. Write failing tests first (**MUST FAIL** before implementation)
2. Implement until tests pass
3. Verify all prior tests still green before moving on

### Parallel Opportunities

- T004 (US1 tests) and T007 (US1 CSS) can run in parallel with each other
- T008 (US2 tests) can start as soon as T005 is complete
- T011 (US3 tests) can start in parallel with T008 (different file, US3 scoped)
- T014 (US3 CSS) can run in parallel with T012 + T013
- T015 (E2E spec) and T018 (FEATURES.md) can be written in parallel

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# Start these together:
Task T004: Write component tests in PracticePlugin.test.tsx
Task T007: Add .practice-level-* CSS in PracticePlugin.css

# Then sequentially:
Task T005: Add complexityLevel state + applyComplexityLevel() in PracticePlugin.tsx
Task T006: Add Level selector UI in PracticePlugin.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) — 1 task
2. Complete Phase 2 (Foundational) — 2 tasks
3. Complete Phase 3 (US1) — 4 tasks
4. **STOP and VALIDATE**: level selector functional, correct config applied, tests pass
5. Demo to stakeholder — delivers SC-001, SC-002, SC-003

### Incremental Delivery

1. Phase 1 + 2 + 3 → MVP — level selection works ✓
2. Add Phase 4 (US2) → persistence across restart ✓
3. Add Phase 5 (US3) → descriptions + badge-clear ✓
4. Add Phase 6 (Polish) → E2E validation + docs ✓
