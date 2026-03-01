# Tasks: Virtual Keyboard in Practice View

**Input**: Design documents from `/specs/001-practice-virtual-keyboard/`
**Branch**: `001-practice-virtual-keyboard` | **Date**: 2026-03-01
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/input-source.ts ✅

**Tests**: Included — required by Constitution Principle V (Test-First Development). All test tasks MUST be written and confirmed failing BEFORE implementation tasks in the same story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create file stubs so US1–US3 implementation tasks can proceed without merge conflicts.

- [X] T001 Create empty file stubs: `frontend/plugins/practice-view/PracticeVirtualKeyboard.tsx`, `frontend/plugins/practice-view/PracticeVirtualKeyboard.css`, `frontend/plugins/practice-view/PracticeVirtualKeyboard.test.tsx`, and `frontend/e2e/practice-virtual-keyboard.spec.ts`

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Refactor the MIDI capture handler in `PracticePlugin.tsx` into a stable ref so both physical MIDI and virtual keyboard can share the same scoring path (R-003). This MUST be done before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Extract the body of `context.midi.subscribe` callback (line ~385 of `frontend/plugins/practice-view/PracticePlugin.tsx`) into a stable `handleMidiNoteRef = useRef<(event: PluginNoteEvent) => void>(() => {})` so both physical MIDI and virtual keyboard can call the same handler

**Checkpoint**: Foundational refactor done — `handleMidiNoteRef.current(event)` is callable from any note source. User story implementation can now begin.

---

## Phase 3: User Story 1 — Toggle Virtual Keyboard in Practice View (Priority: P1) 🎯 MVP

**Goal**: A keyboard icon appears in the toolbar. Tapping it shows the virtual keyboard panel and suspends mic/MIDI. Tapping again hides the panel and restores mic/MIDI.

**Independent Test**: Open Practice plugin → tap keyboard icon → virtual keyboard panel appears at bottom → Mic/MIDI section shows as inactive → tap icon again → panel disappears and Mic/MIDI is active again.

### Tests for User Story 1 ⚠️ Write FIRST, verify they FAIL before T005

- [X] T003 [P] [US1] Write unit tests for: keyboard toggle button renders adjacent to Mic/MIDI badge; button shows active state when `virtualKeyboardOpen=true`; pressing button calls toggle handler in `frontend/plugins/practice-view/PracticeVirtualKeyboard.test.tsx`
- [X] T004 [P] [US1] Write e2e tests for SC-002 (toggle response < 300 ms) and SC-005 (active input source visually unambiguous — Mic/MIDI dims when VK active) in `frontend/e2e/practice-virtual-keyboard.spec.ts`

### Implementation for User Story 1

- [X] T005 [P] [US1] Extend `InputSource` union type from `'midi' | 'mic' | null` to `'midi' | 'mic' | 'virtual-keyboard' | null` in `frontend/plugins/practice-view/PracticePlugin.tsx` (update both `useState` and `useRef` type annotations at line ~101)
- [X] T006 [US1] Add `virtualKeyboardOpen: boolean` state (default `false`) and `prevPhysicalSourceRef = useRef<'midi' | 'mic' | null>(null)` to `frontend/plugins/practice-view/PracticePlugin.tsx`
- [X] T007 [US1] Implement `handleVirtualKeyboardToggle` callback in `frontend/plugins/practice-view/PracticePlugin.tsx`: on open, set `prevPhysicalSourceRef.current`, then `setInputSource('virtual-keyboard')` and `setVirtualKeyboardOpen(true)`; on close, restore `prevPhysicalSourceRef.current` to `inputSource` and `setVirtualKeyboardOpen(false)`
- [X] T008 [US1] Add mic-source suspension guard in the `context.recording.subscribe` handler in `frontend/plugins/practice-view/PracticePlugin.tsx`: extend existing `if (inputSourceRef.current === 'midi') return;` (line ~281) to also return when `inputSourceRef.current === 'virtual-keyboard'`
- [X] T009 [US1] Add MIDI-source suspension guard in the `context.midi.subscribe` handler in `frontend/plugins/practice-view/PracticePlugin.tsx`: add `if (inputSourceRef.current === 'virtual-keyboard') return;` at the top of the handler (before the `handleMidiNoteRef.current(event)` call created in T002)
- [X] T010 [US1] Add keyboard toggle button in the Practice View toolbar adjacent to the Mic/MIDI badge in `frontend/plugins/practice-view/PracticePlugin.tsx`: renders `🎹` icon, has `aria-label` and `aria-pressed={virtualKeyboardOpen}` attributes, calls `handleVirtualKeyboardToggle` on click, applies `.practice-plugin__vkb-toggle--active` class when open
- [X] T011 [US1] Add CSS rules for `.practice-plugin__vkb-toggle`, `.practice-plugin__vkb-toggle--active`, `.practice-mic-badge--suspended`, and `.practice-plugin__vkb-panel` (border-top, padding, overflow-x: auto) to `frontend/plugins/practice-view/PracticePlugin.css`

**Checkpoint**: At this point, the icon appears, toggling shows/hides an empty panel, and mic/MIDI guards fire. US1 is independently testable.

---

## Phase 4: User Story 2 — Play Practice Notes via Virtual Keyboard (Priority: P2)

**Goal**: Tapping virtual keyboard keys produces audible sound AND is scored by the practice engine identically to physical MIDI. Octave shift controls let the user reach any note in the exercise.

**Independent Test**: Open Practice plugin → toggle virtual keyboard → start exercise → tap keys matching staff notes → result screen appears with scored output identical to MIDI input.

### Tests for User Story 2 ⚠️ Write FIRST, verify they FAIL before T014

- [X] T012 [P] [US2] Write unit tests for `PracticeVirtualKeyboard`: correct white key count (14) and black key count (10) at shift=0; `onKeyDown` fires with correct `midiNote` on mouse press; `onKeyUp` fires on mouse release; `context.playNote` called on both down and up; octave shift Up increments state, Down decrements; shift buttons disabled at ±2 bounds; touch guard suppresses mouse events within 500 ms of touch in `frontend/plugins/practice-view/PracticeVirtualKeyboard.test.tsx`
- [X] T013 [P] [US2] Write e2e test for SC-001 (complete exercise end-to-end via virtual keyboard only, no mic/MIDI) and SC-003 (all tapped notes reach the scorer — 0 dropped under normal conditions) in `frontend/e2e/practice-virtual-keyboard.spec.ts`

### Implementation for User Story 2

- [X] T014 [P] [US2] Implement `PracticeVirtualKeyboard.tsx` in `frontend/plugins/practice-view/PracticeVirtualKeyboard.tsx`: `PracticeVirtualKeyboardProps` interface (`context`, `onKeyDown`, `onKeyUp`); key layout for a two-octave range derived from `KEYBOARD_BASE_NOTE + octaveShift * 12`; white/black key arrays generation; `pressedKeys: Set<number>` state; `attackTimestamps: Map<number, number>` ref; touch/mouse guard (same `lastTouchTimeRef` + `TOUCH_GUARD_MS = 500` pattern as `VirtualKeyboard.tsx`)
- [X] T015 [P] [US2] Create `PracticeVirtualKeyboard.css` in `frontend/plugins/practice-view/PracticeVirtualKeyboard.css`: white key styles (`width: 44px`, `height: 120px`), black key styles (overlapping, `pointer-events: none` for inactive gaps), pressed-key highlight class, octave-shift button layout (row above keyboard, disabled state at ±2 limits)
- [X] T016 [US2] Add `octaveShift: number` state (default `0`, min `−2`, max `+2`) and octave Up/Down buttons to `frontend/plugins/practice-view/PracticeVirtualKeyboard.tsx`; disable Up button at `octaveShift === 2`, disable Down button at `octaveShift === −2`
- [X] T017 [US2] Implement `handleKeyDown(midiNote)` and `handleKeyUp(midiNote)` in `frontend/plugins/practice-view/PracticeVirtualKeyboard.tsx`: on down — record `attackTimestamps`, add to `pressedKeys`, call `props.context.playNote({ midiNote, timestamp: Date.now(), type: 'attack' })`, call `props.onKeyDown(midiNote, Date.now())`; on up — remove from `pressedKeys`, call `props.context.playNote({ midiNote, timestamp: Date.now(), type: 'release' })`, call `props.onKeyUp(midiNote, attackTimestamps.get(midiNote) ?? Date.now())`
- [X] T018 [US2] Implement `handleVirtualKeyDown(midiNote, timestamp)` and `handleVirtualKeyUp(midiNote, attackedAt)` callbacks in `frontend/plugins/practice-view/PracticePlugin.tsx`: each calls `handleMidiNoteRef.current({ midiNote, timestamp, type: 'attack'/'release' })` to route through the shared MIDI scoring pipeline (T002)
- [X] T019 [US2] Wire `PracticeVirtualKeyboard` component (replacing placeholder panel from T010) with `context={context}`, `onKeyDown={handleVirtualKeyDown}`, `onKeyUp={handleVirtualKeyUp}` props in `frontend/plugins/practice-view/PracticePlugin.tsx`

**Checkpoint**: At this point, virtual keyboard taps are audible, scored, and trigger the result screen. US2 is independently testable end-to-end.

---

## Phase 5: User Story 3 — Switch Input Source Mid-Session (Priority: P3)

**Goal**: Toggling between virtual keyboard and mic/MIDI at any point in a session (including mid-exercise) preserves all exercise configuration and continues seamlessly.

**Independent Test**: Open Practice plugin → toggle virtual keyboard → configure exercise (preset, note count) → toggle back to Mic/MIDI → verify exercise configuration unchanged and Mic/MIDI is correctly active.

### Tests for User Story 3 ⚠️ Write FIRST, verify they FAIL before T021

- [X] T020 [P] [US3] Write e2e tests for SC-004 (exercise config fully preserved after toggle: preset, noteCount, loadedScore, BPM, clef all survive virtual keyboard toggle on → off); and scenario US3-S4 (mid-exercise toggle: exercise continues, all previously captured notes retained) in `frontend/e2e/practice-virtual-keyboard.spec.ts`

### Implementation for User Story 3

- [X] T021 [US3] Audit `handleVirtualKeyboardToggle` in `frontend/plugins/practice-view/PracticePlugin.tsx`: confirm it touches ONLY `virtualKeyboardOpen`, `inputSource`, and `inputSourceRef` — no preset state, score state, note count, BPM, or clef state is referenced or reset; add a code comment explicitly documenting this invariant
- [X] T022 [US3] Validate mid-exercise seamless switch: confirm that `captureRef` (flow-mode notes buffer) and `handleStepInputRef` (step-mode progress) are not cleared by `handleVirtualKeyboardToggle` in `frontend/plugins/practice-view/PracticePlugin.tsx`; add a code comment explicitly documenting this invariant

**Checkpoint**: All user stories are independently functional and testable. The full feature is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, visual refinements, and touch-target compliance.

- [X] T023 [P] Apply `.practice-mic-badge--suspended` class to the Mic/MIDI badge element conditionally when `inputSource === 'virtual-keyboard'` in `frontend/plugins/practice-view/PracticePlugin.tsx` (implements FR-004 visual indicator)
- [X] T024 [P] Audit all interactive elements in `PracticeVirtualKeyboard.tsx` and `PracticePlugin.tsx` (toggle button, octave shift buttons) for `aria-label`, `aria-pressed`, and `role` attributes per WCAG 2.1 AA in `frontend/plugins/practice-view/PracticeVirtualKeyboard.tsx` and `frontend/plugins/practice-view/PracticePlugin.tsx`
- [X] T025 CSS audit: verify all piano keys and octave-shift buttons in `frontend/plugins/practice-view/PracticeVirtualKeyboard.css` meet 44×44 px minimum touch target (Constitution §III); adjust `height`/`min-width` values if any key falls below threshold
- [X] T026 Run quickstart.md validation: `cd frontend && npx vitest run plugins/practice-view/` (unit tests pass) and `npx playwright test --config playwright.config.prod.ts e2e/practice-virtual-keyboard.spec.ts` (e2e tests pass)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup        → No dependencies — start immediately
Phase 2: Foundational → Depends on Phase 1 — BLOCKS all user stories
Phase 3: US1 (P1)    → Depends on Phase 2
Phase 4: US2 (P2)    → Depends on Phase 2 (and can run after US1 tests pass)
Phase 5: US3 (P3)    → Depends on Phase 3 + Phase 4 (needs toggle + note pipeline)
Phase 6: Polish       → Depends on Phase 3 + Phase 4 + Phase 5
```

### User Story Dependencies

- **US1 (P1)**: Can start once Phase 2 is complete. No dependency on US2 or US3.
- **US2 (P2)**: Can start once Phase 2 is complete. Shares `handleMidiNoteRef` from T002 and the empty panel from T010; can be developed in parallel with US1 once those two tasks are done.
- **US3 (P3)**: Depends on US1 toggle logic (T007) and US2 note routing (T018, T019) being implemented to be testable.

### Within Each User Story

1. Tests MUST be written (T00x) and **confirmed failing** before implementation
2. Foundational/shared state (T005–T007) before guards (T008–T009)
3. Component creation (T014–T016) before wiring (T017–T019)
4. Core implementation before Polish phase

### Parallel Opportunities

| Parallel Group | Tasks | Condition |
|---|---|---|
| Stubs | T001 | Start of session |
| US1 tests | T003, T004 | After T001 |
| US2 tests | T012, T013 | After T001 |
| US1 type extension | T005 | After T002 |
| US2 component + CSS | T014, T015 | After T001 |
| US3 tests | T020 | After T001 |
| Polish | T023, T024 | After US1 + US2 complete |

---

## Parallel Example: User Story 2

```bash
# After T002 (foundational) is complete, these can run in parallel:

# Parallel track A — Unit tests
Task T012: "Write unit tests for PracticeVirtualKeyboard in .../PracticeVirtualKeyboard.test.tsx"

# Parallel track B — E2e tests
Task T013: "Write e2e test for SC-001/SC-003 in frontend/e2e/practice-virtual-keyboard.spec.ts"

# Parallel track C — Component (after T012 written)
Task T014: "Implement PracticeVirtualKeyboard.tsx"
Task T015: "Create PracticeVirtualKeyboard.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002) — critical blocker
3. Write US1 tests (T003, T004) — verify they fail
4. Complete Phase 3: US1 (T005–T011)
5. **STOP and VALIDATE**: Toggle shows/hides empty panel; mic/MIDI guards fire
6. US1 delivers usable (though incomplete) toggle for early demos

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 (US1) → Toggle works → Demo: icon, panel, mic/MIDI suspension
3. Phase 4 (US2) → Notes work → Full feature functional end-to-end (MVP complete)
4. Phase 5 (US3) → State preservation verified → Production-ready
5. Phase 6 (Polish) → Accessibility + visual polish → Release-quality

### Suggested MVP Scope

**Phases 1–4 (T001–T019)** is the true functional MVP:
- 19 tasks delivering the core toggle + playable keyboard + scored notes
- A user without a physical instrument can complete a practice exercise

---

## Notes

- `[P]` tasks touch different files or have no incomplete dependencies — safe to assign to separate agents or branches
- `[US1]`, `[US2]`, `[US3]` labels map tasks to spec.md user stories for traceability
- The `PracticeVirtualKeyboard` component (T014–T017) mirrors `VirtualKeyboard.tsx` but does NOT import from it (R-002: cross-plugin boundary)
- `handleMidiNoteRef` (T002) is the single most critical prerequisite — both T009 and T018 depend on it
- Commit after each phase checkpoint; verify quickstart.md commands pass before committing Phase 4
- Avoid: editing `PracticePlugin.tsx` and `PracticeVirtualKeyboard.tsx` in the same task (merge conflicts); importing from `frontend/plugins/virtual-keyboard/` (ESLint violation); adding coordinate math to any component (Constitution Principle VI)
