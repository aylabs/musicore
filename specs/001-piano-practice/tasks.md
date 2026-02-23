# Tasks: Piano Practice Exercise

**Input**: Design documents from `/specs/001-piano-practice/`  
**Branch**: `001-piano-practice`  
**Date**: 2026-02-22  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story — [US1], [US2], [US3]
- Exact file paths included in every task description

---

## Phase 1: Setup

**Purpose**: Wire the new view into the existing app routing. No new patterns — mirrors the `showRecording` flag established in `001-recording-view`.

- [x] T001 Add `showPractice` boolean state and `PracticeView` routing to `frontend/src/App.tsx` (parallel to the existing `showRecording` flag pattern)
- [x] T002 [P] Add `onShowPractice` prop and debug "Practice" button to `frontend/src/components/ScoreViewer.tsx` (alongside the existing "Record" button)

**Checkpoint**: App compiles; "Practice" button visible in debug mode; clicking it renders a placeholder.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain types and microphone hook that MUST exist before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create all 7 domain types in `frontend/src/types/practice.ts` (`ExerciseNote`, `Exercise`, `ResponseNote`, `NoteComparisonStatus`, `NoteComparison`, `ExerciseResult`, `PracticePhase`) as specified in `contracts/typescript-interfaces.md`
- [x] T004 Create `frontend/src/services/practice/usePracticeRecorder.ts` — requests mic on mount, exposes `startCapture()`, `stopCapture()`, `clearCapture()`, `currentPitch`; wraps AudioWorklet + `pitchDetection.ts` without modifying them (FR-014)
- [x] T005 [P] Write unit tests for `usePracticeRecorder` in `frontend/src/services/practice/usePracticeRecorder.test.ts` — covers mic lifecycle (idle → requesting → active → error), `startCapture`/`stopCapture` capture arrays, `clearCapture` reset

**Checkpoint**: `npm test` passes; `usePracticeRecorder` tests green (or skipped with correct mocks); types compile without errors.

---

## Phase 3: User Story 1 — Play a generated exercise and receive results (Priority: P1) 🎯 MVP

**Goal**: A student can open PracticeView, see exactly 8 random quarter notes on a treble-clef staff, press Play to hear them highlighted one by one, play along (mic captures notes onto a second staff), press Stop or wait for playback to complete, and view a results report.

**Independent Test**: Open PracticeView → press Play → play any notes into mic → verify results report appears listing each note as Correct / Wrong pitch / Wrong timing / Missed.

### Tests for User Story 1

> **Write FIRST — verify they FAIL before implementing the corresponding module**

- [x] T006 [P] [US1] Write unit tests for `exerciseGenerator` in `frontend/src/services/practice/exerciseGenerator.test.ts` — verify: returns exactly 8 notes, all `midiPitch` ∈ `{48,50,52,53,55,57,59,60}`, `expectedOnsetMs` formula at 80 BPM, deterministic output with `seed` parameter
- [x] T012 [P] [US1] Write component tests for `PracticeView` in `frontend/src/components/practice/PracticeView.test.tsx` — verify: renders 8 exercise notes on mount, Play button present in `ready` phase, phase transitions to `playing` on Play press, results view visible after playback ends

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `frontend/src/services/practice/exerciseGenerator.ts` — implement `generateExercise(bpm?: number, seed?: number): Exercise`; 8 notes, pitches from MIDI `{48,50,52,53,55,57,59,60}`, `expectedOnsetMs = slotIndex × (60_000 / bpm)` (T006 tests must pass)
- [x] T008 [US1] Create `frontend/src/components/practice/PracticeView.tsx` scaffold — renders exercise staff via `NotationLayoutEngine`/`NotationRenderer`, renders empty response staff, manages `phase` / `exercise` / `result` / `highlightedSlotIndex` state; depends on T003, T007
- [x] T009 [P] [US1] Create `frontend/src/components/practice/PracticeView.css` — two-staff vertical layout, Play/Stop button, tablet portrait orientation (no horizontal scroll per SC-004)
- [x] T010 [US1] Add playback to `PracticeView.tsx` — Play button triggers `OscillatorNode` tone synthesis per note (reuse envelope pattern from `RecordingStaff`), sequential slot highlighting at configured BPM, Stop button ends playback mid-exercise (FR-004, FR-007); depends on T008
- [x] T011 [US1] Integrate `usePracticeRecorder` into `PracticeView.tsx` — call `startCapture(exercise, startMs)` on Play, display `currentPitch` detections on response staff in real time, call `stopCapture()` on playback end or Stop press; depends on T004, T010

**Checkpoint**: Full US1 flow is independently testable. After this phase: App shows PracticeView, exercise staff renders 8 notes, mic captures input, results report appears after Stop.

---

## Phase 4: User Story 2 — Detailed per-note results report (Priority: P2)

**Goal**: The results report shows each target note's status (✅ Correct, ⚠️ Wrong pitch, ⏱ Wrong timing, ❌ Missed, Extraneous), deviation values, and a 0–100 score computed from the 50/50 pitch+timing formula.

**Independent Test**: Complete an exercise; inspect the report. Verify: each of the 8 slots has a status label, a numeric score is shown, extraneous notes are listed, a perfect response produces score=100 and an empty response produces score=0.

### Tests for User Story 2

> **Write FIRST — verify they FAIL before implementing `exerciseScorer`**

- [x] T013 [P] [US2] Write unit tests for `exerciseScorer` in `frontend/src/services/practice/exerciseScorer.test.ts` — cases: all correct → score=100, all missed → score=0, mixed pitch/timing → expected partial score, extraneous notes reduce denominator, `NoteComparisonStatus` values match spec per FR-008/FR-009

### Implementation for User Story 2

- [x] T014 [US2] Create `frontend/src/services/practice/exerciseScorer.ts` — implement `scoreExercise(exercise, responses, extraneousNotes): ExerciseResult`; greedy beat-slot alignment using ±200 ms window, cent-deviation comparison (`|midiCents − targetMidi×100| ≤ 50`), scoring formula: `totalSlots = notes.length + extraneousNotes.length; score = Math.round(50 × pitchScore + 50 × timingScore)` (T013 tests must pass); depends on T003
- [x] T015 [P] [US2] Create `frontend/src/components/practice/ExerciseResultsView.tsx` — renders per-note comparison table (columns: slot, target note, status icon, pitch deviation, timing deviation), extraneous notes section, total score display; props: `{ result: ExerciseResult; exercise: Exercise }`; depends on T003
- [x] T016 [US2] Wire the results phase into `PracticeView.tsx` — on playback end or Stop: call `stopCapture()` → `scoreExercise()` → `setResult()` → `setPhase('results')` → render `ExerciseResultsView`; depends on T011, T014, T015

**Checkpoint**: US1 + US2 both independently functional. Score and per-note breakdown visible after every exercise run.

---

## Phase 5: User Story 3 — Retry or generate a new exercise (Priority: P3)

**Goal**: From the results screen the student can press "Try Again" (same 8 notes, response staff cleared, phase resets to `ready`) or "New Exercise" (new random sequence, response staff cleared, phase resets to `ready`).

**Independent Test**: After a completed exercise, press "Try Again" → same note sequence reappears with response staff empty, within 500 ms (SC-005). Press "New Exercise" → different sequence appears (run multiple times to confirm randomness).

### Tests for User Story 3

> **Write FIRST — verify they FAIL before implementing retry handlers**

- [x] T017 [P] [US3] Extend `frontend/src/components/practice/PracticeView.test.tsx` with Try Again / New Exercise tests — verify: Try Again restores same `exercise` object identity and clears `result`; New Exercise generates a different sequence and clears `result`

### Implementation for User Story 3

- [x] T018 [US3] Add "Try Again" button and handler to `PracticeView.tsx` (visible in `results` phase only) — calls `clearCapture()`, sets `phase → 'ready'`, keeps current `exercise` unchanged; depends on T016
- [x] T019 [US3] Add "New Exercise" button and handler to `PracticeView.tsx` (visible in `results` phase only) — calls `clearCapture()`, calls `generateExercise()`, replaces `exercise` state, sets `phase → 'ready'`; depends on T018

**Checkpoint**: All three user stories independently functional. Full practice loop: load → play → report → retry/new → play again.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Deferred FR requirements, layout validation, and mic-denied degraded mode.

- [x] T020 Add mic-denied error message to `PracticeView.tsx` — when `micState === 'error'`, display FR-013 message ("Microphone access required to record your response"); exercise staff and Play button remain functional; depends on T004
- [x] T021 Validate tablet portrait layout in `PracticeView.css` — confirm no horizontal scroll on iPad/Surface (SC-004); check portrait + landscape modes; tweak `PracticeView.css` as needed
- [x] T022 Wire `onBack` prop in `PracticeView.tsx` — render a "← Back" button that calls `props.onBack`, clears mic resources (calls `stopCapture()` and unmount cleanup); depends on T008

**Checkpoint**: All FRs satisfied, all SCs achievable in manual testing per `quickstart.md`.

---

---

## Phase 7: Configuration Sidebar & UX Improvements

**Purpose**: Replace the single-option debug toggle with a full left-side configuration panel; improve layout density and full-screen behaviour.

### T023 — ExerciseConfig type + generator refactor
- [x] T023 Add `ExerciseConfig` interface (`preset`, `noteCount`, `clef`, `octaveRange`) and `DEFAULT_EXERCISE_CONFIG` export to `frontend/src/services/practice/exerciseGenerator.ts`; add `NOTE_POOLS` record (`Treble-1/2`, `Bass-1/2`); update `generateExercise(bpm, config, seed?)` to 3-param signature; add `C3_TO_C4_PITCHES` constant and extend `generateC4ScaleExercise(bpm, noteCount, clef)` to select C3 scale for bass clef; lower `CAPTURE_MIDI_MIN` to 36 (C2) in `frontend/src/services/practice/usePracticeRecorder.ts` to cover Bass-2 pool

### T024 — PracticeConfigPanel component
- [x] T024 [P] Create `frontend/src/components/practice/PracticeConfigPanel.tsx` — left sidebar `<aside>` with five sections: Score (preset radio: Random / C4 Scale), Notes (range slider 1–12, locked for c4scale), Clef (Treble/Bass radio, enabled for all presets), Octaves (1/2 radio, locked for c4scale), Tempo (range slider 40–120 BPM); props `{ config, bpm, disabled, onConfigChange, onBpmChange }`; `data-testid="practice-config-panel"`

### T025 — PracticeView state + layout wiring
- [x] T025 Update `frontend/src/components/practice/PracticeView.tsx` — replace `c4Scale` boolean with `exerciseConfig: ExerciseConfig` state; remove `effectiveExercise` memo; add `handleConfigChange` callback; update `handleBpmChange`, `handleNewExercise`, `handlePlay`, `handleStop` to reference `exercise` directly; `effectiveClef = exerciseConfig.clef` (no forced-Treble override); render two-column body: `<PracticeConfigPanel>` + `<main className="practice-view__main">`; remove old tempo panel and debug checkbox

### T026 — CSS two-column sidebar layout
- [x] T026 [P] Update `frontend/src/components/practice/PracticeView.css` — body becomes `flex-direction: row`; add `.practice-config` (200 px wide sidebar), `.practice-view__main` (flex:1 column); add all `.practice-config__*` styles (section, title, radio-label, slider, value, unit, row, inline-radios); tablet `@media (max-width: 768px)` collapses sidebar to horizontal strip

### T027 — Native browser fullscreen on mount
- [x] T027 Update `frontend/src/components/practice/PracticeView.tsx` — add `useEffect` that calls `document.documentElement.requestFullscreen()` on mount and `document.exitFullscreen()` on unmount, matching the pattern used by ScoreViewer play mode; CSS container uses `position: fixed; inset: 0; z-index: 100` as a same-session fallback for browsers that reject the API call

### T028 — Compact inline staff labels
- [x] T028 [P] Update `.practice-view__staff-block` in `frontend/src/components/practice/PracticeView.css` — change to `flex-row` with rotated vertical label on left + `.practice-view__staff-inner` flex-column wrapper for renderer + pitch display; eliminates the header-row height above the SVG

### T029 — C4 scale clef freedom
- [x] T029 Remove forced-Treble override from `PracticeView.tsx` (`effectiveClef` now always equals `exerciseConfig.clef`); unlock Clef radio buttons in `PracticeConfigPanel.tsx` when `preset === 'c4scale'` (only Note count and Octave range remain locked)

### T030 — C4 scale bass clef uses C3–C4 pitches
- [x] T030 Add `C3_TO_C4_PITCHES` constant `[48,50,52,53,55,57,59,60]` to `exerciseGenerator.ts`; pass `clef` from `ExerciseConfig` through to `generateC4ScaleExercise`; Bass + c4scale generates C3 D3 E3 F3 G3 A3 B3 C4 instead of C4–C5

**Checkpoint**: Practice view covers the full viewport (native fullscreen); configurable preset, note count, clef, octave range, and tempo; C4 scale adapts to selected clef.

---

## Phase 8: Step Mode & Production Promotion

**Purpose**: Add a step-by-step practice mode where the exercise waits for the player to hit each note before advancing; promote the Practice View from debug-only to always-visible.

### T031 — Step mode config + Mode selector
- [x] T031 Add `mode: 'flow' | 'step'` field to `ExerciseConfig` interface and `DEFAULT_EXERCISE_CONFIG` in `frontend/src/services/practice/exerciseGenerator.ts`; add "Mode" section (Flow / Step radio buttons) to `frontend/src/components/practice/PracticeConfigPanel.tsx`

### T032 — Note labels on NotationRenderer
- [x] T032 [P] Add `noteLabels?: Record<string, string>` and `noteLabelColors?: Record<string, string>` props to `frontend/src/components/notation/NotationRenderer.tsx`; render a `<text>` label above each note head when a label exists for that note's id; font-size proportional to staff size, `textAnchor="middle"`, default colour `#1976d2`

### T033 — Step mode logic in PracticeView
- [x] T033 Implement step mode in `frontend/src/components/practice/PracticeView.tsx` — skip 3-2-1 countdown and start immediately; play one exercise note at a time; detect user pitch via `currentPitch`; correct note → green label on exercise staff, add to response staff, advance; wrong note → red expected-note label on exercise staff, wrong-note + label on response staff; last note correct → build `ExerciseResult` with `score = max(0, 100 − penalised_slots × 10)` and show results; include 450 ms input-delay guard (`STEP_INPUT_DELAY_MS`) and same-MIDI debounce (`lastStepMidiRef`) to prevent speaker-feedback false positives

### T034 — Fix step mode scoring and false wrong-pitch reports
- [x] T034 Fix two step mode scoring bugs in `frontend/src/components/practice/PracticeView.tsx`: (1) replace cumulative `stepWrongCountRef` with `stepPenalizedSlotsRef: Set<number>` so each slot is penalised at most once regardless of how many wrong pitch samples arrive; (2) retain `lastStepMidiRef` after advancing (set to `detectedMidi` not `null`) to debounce the lingering resonance of the just-played note which was causing the next slot to register a false `wrong-pitch`; slots with any failure get `status: 'wrong-pitch'` in the results comparison table

### T035 — Promote Practice View to production
- [x] T035 Remove `debugMode` gate from the Practice View button in `frontend/src/components/ScoreViewer.tsx` (both landing and toolbar render paths); Recording View button remains debug-only; update `frontend/src/App.tsx` so `PracticeView.onBack` returns to ScoreViewer instead of RecordingView; change back-button label to `← Back` and remove debug badge in `frontend/src/components/practice/PracticeView.tsx`; add `.practice-view-btn` CSS class to `frontend/src/components/ScoreViewer.css` mirroring `.load-score-button` (14px / 500 / 10px 20px, purple palette)

**Checkpoint**: Step mode fully functional with accurate per-slot scoring and no false positives; Practice View accessible without `?debug=true` and visually consistent with other toolbar buttons.

---

## Dependencies

```
T001 ──────────────────────────────────────────────────────► (App routing ready)
T002 [P with T001]
T003 ──► T004 ──► T011
      └─► T007 ──► T008 ──► T010 ──► T011 ──► T016
                         └─► T009 [P]
      └─► T014 ──► T016
                             T015 [P] ──► T016
T016 ──► T018 ──► T019
```

**Story completion order**:
1. **Foundation** (T003–T005) — blocks everything
2. **US1** (T006–T012) — MVP; complete end-to-end flow
3. **US2** (T013–T016) — scoring detail; depends on US1 capture infrastructure
4. **US3** (T017–T019) — purely additive; depends on T016 results phase

---

## Parallel Execution Opportunities

### Within Phase 2 (Foundation)
- T004 + T005 can overlap after T003 (T005 = tests draft while T004 implements)

### Within Phase 3 (US1)
- **T006 + T012**: Both test files can be *drafted* simultaneously before implementations exist
- **T007 + T009**: `exerciseGenerator.ts` and `PracticeView.css` touch entirely different files
- T008 and T009 can be developed in parallel once T007 is done

### Within Phase 4 (US2)
- **T013 + T015**: `exerciseScorer.test.ts` and `ExerciseResultsView.tsx` are independent files

### Within Phase 6 (Polish)
- T020, T021, T022 are fully independent of each other

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 only (US1)**.

Phase 3 alone delivers the complete observable cycle: generate → display → play → capture → report. US2 and US3 add depth and replayability but do not change the fundamental feature viability.

**Suggested delivery order**:
1. T001–T002 (routing, ~30 min)
2. T003 (types, ~20 min)
3. T004–T005 + T006–T007 in two parallel tracks (~45 min)
4. T008–T011 sequentially (core PracticeView, ~90 min)
5. T012 (component tests, ~30 min)
6. T013–T016 (scoring + results view, ~60 min)
7. T017–T019 (retry flow, ~30 min)
8. T020–T022 (polish, ~30 min)

**Estimated total**: ~6 hours for one developer following TDD.
