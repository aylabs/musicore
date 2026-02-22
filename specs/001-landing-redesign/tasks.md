# Tasks: Landing Screen Redesign

**Input**: Design documents from `specs/001-landing-redesign/`  
**Prerequisites**: plan.md, spec.md, research.md  
**Branch**: `001-landing-redesign`  
**Date**: 2026-02-22

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All file paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Create the failing test file — **Principle V (Test-First) gate**. All tests MUST fail before any implementation code is written. Do NOT proceed to Phase 2 until this is confirmed.

- [X] T001 Create failing test file with all 10 test cases in `frontend/src/test/components/LandingScreen.test.tsx` — mock `requestAnimationFrame`, `window.matchMedia`, and `document.hidden`; use `vi.useFakeTimers()`; verify all 10 tests fail before any implementation exists (see research.md Test Plan)

---

## Phase 2: User Story 1 — Full-Viewport Landing Layout (Priority: P1) 🎯 MVP

**Goal**: Replace the minimal `div.no-score` placeholder in `ScoreViewer` with a full-viewport (100vw × 100vh) `LandingScreen` component that preserves the `LoadScoreButton` action.

**Independent Test**: Load the app with no score; verify the landing container covers the full browser window at any viewport size with no scrollbars or gaps. Run `pnpm test --reporter=verbose LandingScreen` and confirm T001 (`renders without crashing`) and T002 (container has full-viewport class) pass.

- [X] T002 [P] [US1] Create `LandingScreen.tsx` component shell with `data-testid="landing-screen"`, `role="region"`, `aria-label="Landing screen"`, and an `onLoadScore: () => void` prop in `frontend/src/components/LandingScreen.tsx`
- [X] T003 [P] [US1] Create `LandingScreen.css` with `.landing-screen { position: fixed; inset: 0; z-index: 0; width: 100%; height: 100%; overflow: hidden; }` and a `.landing-actions` overlay for the `LoadScoreButton` in `frontend/src/components/LandingScreen.css`
- [X] T004 [US1] Replace the `!score` render branch JSX in `frontend/src/components/ScoreViewer.tsx` (lines ~490–510) with `<LandingScreen onLoadScore={() => setDialogOpen(true)} />`; keep `LoadScoreDialog` and error/success messages outside `LandingScreen`

**Checkpoint**: `LandingScreen` renders, covers full viewport (`position: fixed; inset: 0`), and the Load Score action still works. T001 + T002 pass.

---

## Phase 3: User Story 2 — Animated Note Behind the Banner (Priority: P2)

**Goal**: A single Bravura music glyph appears on the landing screen, starts at the banner position (top-center, behind the app-header), and follows a smooth fixed Lissajous looping path continuously.

**Independent Test**: Load the app; observe the note symbol start near the top of the screen (behind the header), trace a figure-8 path, and return seamlessly to the starting position every 8 seconds. Verify T003 (`note glyph rendered on mount`) passes.

- [X] T005 [US2] Add `rafRef`, `elapsedRef`, `prevTimeRef` refs and `position` state `{ x: number; y: number }` to `LandingScreen.tsx`; implement the rAF tick with Lissajous path (`LOOP_DURATION = 8`, `x = 50 + 38 * Math.sin(2 * Math.PI * t)`, `y = Y_OFFSET + R_Y * Math.sin(4 * Math.PI * t + Math.PI / 4)` where `Y_OFFSET` and `R_Y` place `t=0` at approx. `(50%, 5%)` behind the banner) in `frontend/src/components/LandingScreen.tsx`
- [X] T006 [P] [US2] Add `visibilitychange` `useEffect`: cancel rAF on `document.hidden === true`, null-out `prevTimeRef.current` to prevent time-jump, restart rAF on tab focus in `frontend/src/components/LandingScreen.tsx`
- [X] T007 [US2] Render `<span className="landing-note music-glyph" data-testid="landing-note">` with inline style `{ position: 'absolute', left: \`${position.x}%\`, top: \`${position.y}%\`, transform: 'translate(-50%, -50%)' }`; add `.landing-note { position: absolute; font-size: 4rem; cursor: default; user-select: none; }` to `frontend/src/components/LandingScreen.css`

**Checkpoint**: Note traces Lissajous path smoothly. Loops without jump. Tab hide pauses animation. T003 passes.

---

## Phase 4: User Story 3 — Changing Note Symbol and Color Each Second (Priority: P3)

**Goal**: Every second the note glyph and color change simultaneously to a randomly selected value from their respective pools, with no immediate repetition of the previous value.

**Independent Test**: Observe the note over 5 seconds; verify at least 5 distinct glyph changes occur and all 5 Bravura symbols (whole, half, quarter, eighth, sixteenth) appear at some point. T004, T005, T006 pass.

- [X] T008 [P] [US3] Import `SMUFL_CODEPOINTS` (or the relevant named exports) from `frontend/src/types/notation/config.ts`; define `NOTE_GLYPHS = [WHOLE_NOTE, HALF_NOTE_UP, QUARTER_NOTE_UP, EIGHTH_NOTE_UP, SIXTEENTH_NOTE_UP]` constant; add `glyphIdx` state initialised to a random index `[0–4]` in `frontend/src/components/LandingScreen.tsx`
- [X] T009 [US3] Add `pickRandom(pool: number[], exclude: number): number` pure util function (inline in component or in `frontend/src/utils/`); in the rAF tick detect 1-second boundary via `const second = Math.floor(elapsed); if (second !== prevSecondRef.current)` then call `setGlyphIdx(pickRandom(5, currentGlyphIdx))` and `setColorIdx(pickRandom(3, currentColorIdx))` in the same synchronous update in `frontend/src/components/LandingScreen.tsx`
- [X] T010 [US3] Set note span `textContent`/children to `NOTE_GLYPHS[glyphIdx]` Unicode character in the render of `frontend/src/components/LandingScreen.tsx`

**Checkpoint**: Glyph changes once per second. No two consecutive seconds show the same glyph. T004 and T006 pass.

---

## Phase 5: User Story 4 — Play-View Color Palette (Priority: P4)

**Goal**: The note cycles exclusively through black (`#000000`), orange (`#FF8C00`), and green (`#00C853`) — the exact values from `LayoutRenderer.css` — applied as an inline `color` style.

**Independent Test**: Over 6 seconds of observation, confirm every color displayed is one of the three defined values and matches the highlighted/pinned colors visible in the play view. T005 passes.

- [X] T011 [P] [US4] Define `NOTE_COLORS = ['#000000', '#FF8C00', '#00C853'] as const` (values sourced from `LayoutRenderer.css` lines 32 and 91); add `colorIdx` state initialised to a random index `[0–2]` in `frontend/src/components/LandingScreen.tsx`
- [X] T012 [US4] Apply `style={{ ..., color: NOTE_COLORS[colorIdx] }}` to the note `<span>` in `frontend/src/components/LandingScreen.tsx`; wire `setColorIdx` into the same 1-second boundary handler as `setGlyphIdx` (T009) so both update simultaneously

**Checkpoint**: Color changes simultaneously with glyph. Only `#000000`, `#FF8C00`, `#00C853` ever appear. T005 passes.

---

## Phase 6: User Story 5 — Click to Reset Note Animation (Priority: P5)

**Goal**: Clicking (or tapping on mobile) the animated note immediately snaps it back to `t=0` (initial position behind the banner) and restarts the Lissajous path from the beginning.

**Independent Test**: Wait for the note to travel visibly away from the top-center; click it; verify it immediately returns to the banner area and begins the same path from the start. T007 passes.

- [X] T013 [P] [US5] Add `handleNoteClick` callback: `elapsedRef.current = 0; prevTimeRef.current = null;` — resets elapsed time and discards stale delta so next rAF frame starts fresh from `t=0` in `frontend/src/components/LandingScreen.tsx`
- [X] T014 [US5] Attach `onClick={handleNoteClick}` to the note `<span>`; add `cursor: pointer` and `touch-action: manipulation` to `.landing-note` in `frontend/src/components/LandingScreen.css` to support tap on tablet

**Checkpoint**: Click always returns note to initial position. Multiple rapid clicks are harmless. T007 passes.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, performance, and discoverability improvements that affect multiple user stories.

- [X] T015 [P] Add `reducedMotion` constant at top of component: `const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches`; guard the `setPosition(...)` call in the rAF tick with `if (!reducedMotion)` so position is static when reduced-motion is active (glyph/color tick continues unaffected) in `frontend/src/components/LandingScreen.tsx`
- [X] T016 [P] Add `.landing-note:hover { transform: translate(-50%, -50%) scale(1.15); }` and `transition: color 0.15s ease` to `.landing-note` for a subtle hover hint and smooth colour transition in `frontend/src/components/LandingScreen.css`
- [X] T017 Verify all 10 tests in `frontend/src/test/components/LandingScreen.test.tsx` pass: run `pnpm test --reporter=verbose` in `frontend/`; confirm T001–T010 from research.md Test Plan all green

**Checkpoint**: All tests pass. Reduced-motion freezes position but glyph/color still cycles. Hover affordance present. Tests pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 (test file created and failing)
- **US2 (Phase 3)**: Depends on Phase 2 (container must exist as animation host)
- **US3 (Phase 4)**: Depends on Phase 3 (rAF loop must exist for the 1s tick)
- **US4 (Phase 5)**: Depends on Phase 4 (1s tick must exist for simultaneous color update)
- **US5 (Phase 6)**: Depends on Phase 3 (rAF refs must exist for elapsedRef reset)
- **Polish (Final)**: Depends on all US phases; T015 and T016 can run in parallel once US2 is done

### User Story Dependency Graph

```
Phase 1 (Setup)
    └── Phase 2 (US1: Container)
            └── Phase 3 (US2: rAF loop + path)
                    ├── Phase 4 (US3: glyph tick)
                    │       └── Phase 5 (US4: color palette)
                    └── Phase 6 (US5: click reset) ← can run in parallel with US3/US4
```

### Parallel Opportunities Per Phase

```
Phase 2 (US1):
  T002 [P] LandingScreen.tsx shell       ───┐ different files,
  T003 [P] LandingScreen.css             ───┘ run together

Phase 3 (US2):
  T005     rAF loop + path (must finish first)
  T006 [P] visibilitychange listener     ← independent of T005 (different concern)

Phase 4 (US3):
  T008 [P] NOTE_GLYPHS constant + state  ← can start while T005 finishes in Phase 3
  T009     1s tick boundary handler      ← needs T005 rAF available
  T010     render glyph in span          ← needs T008

Phase 5 (US4):
  T011 [P] NOTE_COLORS constant + state  ← can start after T008 completes

Phase 6 (US5):
  T013 [P] handleNoteClick handler       ─── can run in parallel with Phase 4/5

Final Phase:
  T015 [P] reduced-motion guard          ───┐
  T016 [P] hover CSS                     ───┘ run together
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (write failing tests)
2. Complete Phase 2 (US1 — container + ScoreViewer integration)
3. **STOP and VALIDATE**: Full-viewport layout works independently
4. The `LoadScoreButton` is accessible → users can load scores → functional MVP

### Incremental Delivery

| Step | Delivers | Independently testable |
|------|----------|------------------------|
| Phase 1 + 2 | Full-viewport landing screen | ✅ Resize viewport, no scrollbars |
| + Phase 3 | Animated note follows Lissajous path | ✅ Observe 8s loop, tab-hide pause |
| + Phase 4 | Glyph changes every second (no repeat) | ✅ 5-second observation |
| + Phase 5 | Colors cycle through play-view palette | ✅ Match against LayoutRenderer.css |
| + Phase 6 | Click resets note to initial position | ✅ Click mid-animation, verify reset |
| + Polish | Reduced-motion, hover hint, all tests pass | ✅ Run full test suite |

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 17 |
| Setup tasks | 1 (T001) |
| US1 tasks | 3 (T002–T004) |
| US2 tasks | 3 (T005–T007) |
| US3 tasks | 3 (T008–T010) |
| US4 tasks | 2 (T011–T012) |
| US5 tasks | 2 (T013–T014) |
| Polish tasks | 3 (T015–T017) |
| Parallelizable [P] tasks | 9 (T002, T003, T006, T008, T011, T013, T015, T016 + T017 run order) |
| Independent test criteria | 5 (one per user story — see Checkpoints) |
| Suggested MVP scope | Phase 1 + Phase 2 (US1) |

### Format Validation

All 17 tasks follow the required format:
- ✅ Checkbox: `- [ ]`
- ✅ Task ID: T001–T017, sequential
- ✅ `[P]` marker: present on parallelizable tasks only
- ✅ `[Story]` label: present on all user-story phase tasks (US1–US5), absent on Setup/Polish
- ✅ File paths: every implementation task includes exact file path
