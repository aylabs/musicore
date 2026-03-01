# Tasks: Practice from Score

**Input**: Design documents from `/specs/034-practice-from-score/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/plugin-api-v4.ts ✅ quickstart.md ✅  
**Depends on**: Feature 033 (Play Score Plugin) merged — Plugin API v3 and `context.scorePlayer` must be live in `main`.

**Tests**: Included — Constitution Principle V (Test-First Development) is non-negotiable. All test tasks are marked and MUST be written before the corresponding implementation.

**Organization**: Tasks are grouped by user story. The Foundational phase (Plugin API v4) MUST complete before any user story work begins.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelisable — operates on a different file from concurrent tasks in the same phase
- **[Story]**: Which user story this task delivers (US1–US3 from spec.md)
- Exact file paths in all descriptions

---

## Phase 1: Setup

**Purpose**: Establish the one new file that will be edited in parallel during Phase 2, so no phase is blocked on file creation.

- [X] T001 Create stub files `frontend/src/components/plugins/ScoreSelectorPlugin.tsx` (minimal export: `export function ScoreSelectorPlugin() { return null; }`) and `frontend/src/components/plugins/ScoreSelectorPlugin.css` (empty) — establishes new host-side component files before parallel Phase 2 work begins

---

## Phase 2: Foundational — Plugin API v4

**Purpose**: Extend the Plugin API from v3 to v4 by adding `PluginScorePitches`, `extractPracticeNotes()`, `PluginScoreSelectorProps`, and `context.components.ScoreSelector`. **BLOCKS all user stories.** No practice plugin changes may be written until this phase is complete.

**⚠️ CRITICAL**: Constitution Principle V — contract tests (T002) MUST be written and verified FAILING before T004 implements them.

- [X] T002 Write contract tests (FAILING) for `extractPracticeNotes()` in `frontend/src/plugin-api/scorePlayerContext.test.ts`: (1) returns `null` when status is `'idle'` (no score loaded); (2) returns a `PluginScorePitches` after `loadScore` + status `'ready'`; (3) `notes` length equals `maxCount` when score has more notes than `maxCount`; (4) `totalAvailable` reflects pre-cap count (same across different `maxCount` calls); (5) `clef` is either `'Treble'` or `'Bass'`; (6) no-op stub `createNoOpScorePlayer().extractPracticeNotes(8)` returns `null`
- [X] T003 [P] Add new types to `frontend/src/plugin-api/types.ts`: `PluginScorePitches` (notes, totalAvailable, clef, title), `PluginScoreSelectorProps` (catalogue, isLoading, error, onSelectScore, onLoadFile, onCancel); extend `PluginScorePlayerContext` with `extractPracticeNotes(maxCount: number): PluginScorePitches | null`; extend `PluginContext.components` with `ScoreSelector: ComponentType<PluginScoreSelectorProps>`; bump `PLUGIN_API_VERSION` to `'4'` (see `specs/034-practice-from-score/contracts/plugin-api-v4.ts`)
- [X] T004 Implement `extractPracticeNotes()` in `frontend/src/plugin-api/scorePlayerContext.ts`: add private `extractPracticeNotesFromScore(score, maxCount)` helper (source: `parts[0].staves[0].voices[0]`; skip rests; chord dedup via `tickMap` keeping max midiNote per tick; sort by tick; clef normalisation to `'Treble' | 'Bass'`; `title` from `score.metadata?.work_title ?? null`); expose via `useScorePlayerBridge` `extractPracticeNotes` callback (returns `null` if status ≠ `'ready'`); add `extractPracticeNotes: (_maxCount) => null` to `createNoOpScorePlayer()`; add `extractPracticeNotes: (...args) => proxyRef.current.extractPracticeNotes(...args)` to `createScorePlayerProxy()`
- [X] T005 [P] Implement `frontend/src/components/plugins/ScoreSelectorPlugin.tsx`: replaces stub from T001; renders score catalogue list (tappable `li` entries), "Load from file" `<input type="file" accept=".mxl,.xml,.musicxml">`, loading spinner when `isLoading === true`, error message when `error` is non-null, Cancel `✕` button; fully implements `PluginScoreSelectorProps`; add all layout rules to `frontend/src/components/plugins/ScoreSelectorPlugin.css` (overlay backdrop, panel, header, list, error, loading, cancel button)
- [X] T006 Inject `ScoreSelector` into `frontend/src/components/plugins/PluginView.tsx`: import `ScoreSelectorPlugin`; add `ScoreSelector: ScoreSelectorPlugin` alongside existing `StaffViewer` and `ScoreRenderer` in the `context.components` object passed to the plugin; no change to v2/v3 plugin behaviour

**Checkpoint**: Plugin API v4 complete — TypeScript compiles with no errors (`npx tsc --noEmit` in `frontend/`); `extractPracticeNotes` contract tests pass; `ScoreSelectorPlugin` renders catalogue. Both user story phases may now proceed.

---

## Phase 3: User Story 1 — Select a Score as the Practice Source (Priority: P1) 🎯 MVP

**Goal**: The Practice plugin sidebar shows three preset options (Random, C4 Scale, Score). Selecting Score opens the `ScoreSelector` overlay. Choosing a preloaded score extracts notes and populates the exercise staff. Notes slider max is capped to available notes. Clef and octave controls are visible but disabled. "Change score" button reopens the dialog; it is disabled during active exercise.

**Independent Test**: Open Practice plugin → select "Score" preset → ScoreSelector overlay appears → choose a preloaded score → exercise staff populates with notes → exercise ready to start; clef/octave controls dimmed; Notes slider max reflects score.

- [X] T007 [P] [US1] Write unit tests (FAILING) for US1 Score preset flow in `frontend/plugins/practice-view/PracticePlugin.test.tsx`: (1) three preset options rendered (Random, C4 Scale, Score); (2) selecting Score with `scorePitches === null` makes `ScoreSelector` visible; (3) after `loadScore` completes and `extractPracticeNotes` returns pitches, exercise staff populates; (4) Notes slider `max` attribute equals `scorePitches.totalAvailable`; (5) clef and octave controls have `disabled` attribute when Score active; (6) disabled label text visible; (7) "Change score" button present when Score active with score loaded; (8) "Change score" button `disabled` when phase is `'countdown'` or `'playing'`; (9) "Change score" click reopens `ScoreSelector`
- [X] T008 [P] [US1] Extend `ExerciseConfig.preset` union type to `'random' | 'c4scale' | 'score'` in `frontend/plugins/practice-view/practiceTypes.ts`; no other fields change
- [X] T009 [P] [US1] Write unit tests (FAILING) for `generateScoreExercise()` in `frontend/plugins/practice-view/exerciseGenerator.ts`: (1) returns `PracticeExercise` with `notes.length === min(noteCount, pitches.length)`; (2) each exercise note carries the corresponding `midiPitch` from the input array; (3) `expectedOnsetMs` uses `slotIndex × (60_000 / bpm)` formula identical to `generateExercise`; (4) empty `pitches` input returns exercise with 0 notes; (5) `noteCount` larger than `pitches.length` clamps to `pitches.length`
- [X] T010 [US1] Implement `generateScoreExercise(bpm: number, pitches: ReadonlyArray<{ midiPitch: number }>, noteCount: number): PracticeExercise` in `frontend/plugins/practice-view/exerciseGenerator.ts`; update `generateExercise()` to delegate to `generateScoreExercise` when `config.preset === 'score'` (receives `scorePitches` as an optional parameter alongside `config`)
- [X] T011 [US1] Add Score preset to `frontend/plugins/practice-view/PracticePlugin.tsx`: (a) `scorePitches: PluginScorePitches | null` state and `showScoreSelector: boolean` state; (b) Score radio button in preset selector; (c) `ScoreSelector` overlay rendered when `showScoreSelector === true`; (d) `onSelectScore` / `onLoadFile` handlers call `context.scorePlayer.loadScore()`; (e) `useEffect` on `scorePlayerState.status === 'ready'` calls `context.scorePlayer.extractPracticeNotes(config.noteCount)` → `setScorePitches` → `generateScoreExercise`; (f) "Change score" button in sidebar (enabled/disabled per exercise phase); (g) Notes slider `max={scorePitches?.totalAvailable ?? DEFAULT_MAX}` when Score active (FR-006)
- [X] T012 [US1] Add disabled clef/octave controls with inline label to `frontend/plugins/practice-view/PracticePlugin.tsx`: render controls with `disabled` attribute and `aria-disabled="true"` when `config.preset === 'score'`; render `<span className="practice-score-disabled-label">Set by score</span>` beneath each control; add `.practice-score-disabled-label` and `.practice-control--disabled` CSS rules to `frontend/plugins/practice-view/PracticePlugin.css` (FR-013)

**Checkpoint**: Score preset selectable; score loads via overlay; exercise populates from score pitches; clef/octave controls disabled with label; Notes slider capped; "Change score" button works. US1 independently verifiable.

---

## Phase 4: User Story 2 — Load a Custom Score File for Practice (Priority: P2)

**Goal**: From the ScoreSelector overlay, the user taps "Load from file", picks a MusicXML file, and the exercise populates from it. Invalid files show an error inside the dialog. Cancelling with no score loaded reverts preset to Random.

**Independent Test**: Select Score preset → overlay open → "Load from file" → pick valid .mxl → exercise staff populates → pick corrupt file → error shown inside dialog → preset still Score.

- [X] T013 [P] [US2] Write unit tests (FAILING) for US2 file loading in `frontend/plugins/practice-view/PracticePlugin.test.tsx`: (1) `onLoadFile` callback in `ScoreSelector` calls `context.scorePlayer.loadScore({ kind: 'file', file })`; (2) `status === 'error'` from `scorePlayerState` passes `error` prop to `ScoreSelector` for display; (3) on error, existing `scorePitches` (if any) is preserved and exercise state is unchanged; (4) cancelling `ScoreSelector` when `scorePitches === null` reverts `config.preset` to `'random'`; (5) cancelling when `scorePitches !== null` keeps the current score and preset unchanged
- [X] T014 [US2] Wire file loading and cancel behaviour in `frontend/plugins/practice-view/PracticePlugin.tsx`: pass `onLoadFile={file => context.scorePlayer.loadScore({ kind: 'file', file })}` to `ScoreSelector`; pass `error={scorePlayerState.status === 'error' ? scorePlayerState.error ?? 'Failed to load score' : null}`; implement `handleSelectorCancel` — if `scorePitches === null` set `config.preset` to `'random'` and close overlay; otherwise close overlay only (FR-011, FR-012)

**Checkpoint**: File picker works end-to-end; error displayed inside dialog without corrupting exercise; cancel logic correct for both loaded-score and no-score cases. US2 independently verifiable on top of US1.

---

## Phase 5: User Story 3 — Switch Presets Without Losing Score State (Priority: P3)

**Goal**: Switching away from Score preset and back within the same session reuses the cached `scorePitches` without reopening the dialog. Only when no score has ever been loaded does the dialog open automatically.

**Independent Test**: Select Score → load score → switch to Random → switch back to Score → exercise repopulates from same score — no dialog opens.

- [X] T015 [P] [US3] Write unit tests (FAILING) for US3 preset caching in `frontend/plugins/practice-view/PracticePlugin.test.tsx`: (1) `scorePitches` state is NOT cleared when user switches to Random or C4 Scale presets; (2) switching back to Score with `scorePitches !== null` immediately regenerates exercise and does NOT set `showScoreSelector(true)`; (3) switching to Score with `scorePitches === null` sets `showScoreSelector(true)` (dialog opens)
- [X] T016 [US3] Guard dialog auto-open in `frontend/plugins/practice-view/PracticePlugin.tsx`: in the `onPresetChange` handler for `'score'`, only call `setShowScoreSelector(true)` when `scorePitches === null`; when `scorePitches !== null`, call `generateScoreExercise` immediately from cached pitches (FR-010); confirm `scorePitches` is excluded from the reset path when switching away from Score preset

**Checkpoint**: Preset switching preserves cached score state. No unnecessary dialog opens. US3 independently verifiable on top of US1+US2.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, regression confirmation, and documentation updates.

- [X] T017 [P] Write Playwright e2e test `frontend/e2e/practice-from-score.spec.ts`: (SC-001) open Practice plugin → select Score preset → selector opens → choose Beethoven Für Elise → exercise staff has notes → start exercise; (SC-002) switch to Random and back to Score — no dialog opens; (SC-003) all existing Random and C4 Scale exercise flows still work; (SC-004) Notes slider max matches `totalAvailable` from loaded score; (SC-005) load .mxl file via "Load from file" button and start exercise
- [X] T018 [P] Verify zero regression on existing presets: run full Vitest suite (`npx vitest run` in `frontend/`) and confirm all pre-existing `PracticePlugin`, `exerciseGenerator`, `scorePlayerContext` tests still pass; run `npx tsc --noEmit` in `frontend/` and confirm clean compilation; assert SC-003 — exercise mechanics are identical for Random and C4 Scale after all changes
- [X] T019 [P] Update `FEATURES.md`: add Score preset as new capability under Practice View; update `PLUGINS.md`: document `practice-view` plugin now at v2 with Score preset, Plugin API v4 dependency, and `context.components.ScoreSelector` usage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational — API v4)**: Depends on Phase 1 (T001 creates file for T005). **BLOCKS all user story phases.**
- **Phase 3 (US1 — P1)**: Depends on Phase 2 completion. MVP target — reach this first.
- **Phase 4 (US2 — P2)**: Depends on Phase 3 (uses ScoreSelector overlay already wired in T011). Can proceed immediately after US1 checkpoint.
- **Phase 5 (US3 — P3)**: Depends on Phase 3 (needs `scorePitches` state from T011). Can proceed after US1 checkpoint.
- **Phase 6 (Polish)**: Depends on all desired user stories complete.

### User Story Dependencies

| Story | Priority | Depends On | Notes |
|-------|----------|------------|-------|
| US1 | P1 | Phase 2 | Establishes Score preset + all shared state |
| US2 | P2 | US1 | Adds file error handling path + cancel logic to wiring from T011 |
| US3 | P3 | US1 | Adds preset-switch caching guard to logic from T011 |

### Within Each Phase

- Test tasks (FAILING) MUST be committed before implementation tasks (Constitution Principle V)
- `[P]` tasks within the same phase operate on different files and can be worked in parallel
- T010 (impl) must follow T009 (tests); T011 must follow T007 + T008 + T010

---

## Parallel Opportunities Per Story

### Phase 2 (Foundational) Parallel Example

```
T002 → scorePlayerContext.test.ts (contract tests — FAILING)
T003 [P] → types.ts (new types, PLUGIN_API_VERSION bump)  ← can run alongside T002
T005 [P] → ScoreSelectorPlugin.tsx + .css               ← can run alongside T002/T003
After T002 + T003 + T005:
  T004 → scorePlayerContext.ts (awaits T002 tests + T003 types)
After T004 + T005:
  T006 → PluginView.tsx injection (needs T004 + T005)
```

### Phase 3 (US1) Parallel Example

```
T007 [P] → PracticePlugin.test.tsx US1 tests (FAILING)
T008 [P] → practiceTypes.ts preset union          ← parallel with T007
T009 [P] → exerciseGenerator.ts unit tests (FAILING) ← parallel with T007/T008
After T009:
  T010 → exerciseGenerator.ts implementation
After T007 + T008 + T010:
  T011 → PracticePlugin.tsx Score preset flow     ← all prereqs needed
  T012 [P] → PracticePlugin.tsx disabled controls + PracticePlugin.css ← parallel with T011
```

### Phase 4 (US2) Parallel Example

```
T013 [P] → PracticePlugin.test.tsx US2 tests (FAILING)
After T013:
  T014 → PracticePlugin.tsx file + cancel wiring
```

### Phase 5 (US3) Parallel Example

```
T015 [P] → PracticePlugin.test.tsx US3 tests (FAILING)
After T015:
  T016 → PracticePlugin.tsx caching guard
```

### Phase 6 (Polish) — All Parallel

```
T017 [P] → e2e spec                ─┐
T018 [P] → regression run + tsc    ─┤  all independent
T019 [P] → FEATURES.md + PLUGINS.md─┘
```

---

## Implementation Strategy

### MVP Scope: US1 only

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational API v4 (T002–T006) — blocks everything
3. Complete Phase 3: US1 — Score preset fully working with preloaded scores ✅
4. **STOP and VALIDATE**: SC-001 (score selected in < 15 s), SC-003 (zero regression on Random/C4 Scale), SC-004 (Notes count updates exercise immediately)
5. Demo-ready MVP

### Full Feature Delivery Order

1. Phase 1 + Phase 2 → API v4 foundation ready
2. Phase 3 (US1) → **MVP**: select preset → pick score → practice ✅
3. Phase 4 (US2) → File loading + error handling ✅
4. Phase 5 (US3) → Preset-switch caching (zero extra dialogs) ✅
5. Phase 6 → End-to-end tests + regression + docs ✅

### Parallel Team Strategy

With two developers after Phase 2 completes:
- Dev A: US1 (Phase 3) → US2 (Phase 4) — main plugin wiring thread
- Dev B: US3 (Phase 5) → Phase 6 Polish — caching + e2e

---

## Format Validation

All tasks follow the required format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

| Check | Result |
|-------|--------|
| Every task has checkbox `- [ ]` | ✅ |
| Every task has sequential ID (T001–T019) | ✅ |
| `[P]` only on tasks that operate on distinct files from concurrent tasks | ✅ |
| `[US#]` label on all user-story phase tasks | ✅ |
| Setup phase tasks: no story label | ✅ |
| Foundational phase tasks: no story label | ✅ |
| Polish phase tasks: no story label | ✅ |
| All tasks include explicit file paths | ✅ |
