# Tasks: Practice View Plugin & Plugin API Recording Extension

**Input**: Design documents from `specs/031-practice-view-plugin/`
**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/plugin-api-v2.ts](contracts/plugin-api-v2.ts) · [quickstart.md](quickstart.md)

**Tests**: Included — Constitution Principle V (Test-First Development) requires tests before implementation for all new Plugin API surface (`recording` namespace, `offsetMs`, `stopPlayback`), `PluginMicBroadcaster`, and the Practice plugin component (see [plan.md](plan.md) Constitution Check, rows V and VII).

**Organization**: Tasks grouped by user story. US2 (recording API) and US3 (scheduled playback API) are placed in Phase 2 Foundational because they are blocking prerequisites for US1 (Practice plugin) — the plugin cannot subscribe to mic or schedule notes until those API extensions exist.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other tasks at the same phase level (different files, no unresolved dependencies)
- **[Story]**: User story label ([US1]–[US4]) — required in User Story phases; omitted in Setup and Foundational
- Exact file paths in every task description

---

## Phase 1: Setup

**Purpose**: Create the new plugin directory scaffold. All other work happens within existing project structure.

- [X] T001 Create folder `frontend/plugins/practice-view/` and stub files: empty `plugin.json`, `index.tsx`, `PracticePlugin.tsx`, `PracticePlugin.css`, `PracticePlugin.test.tsx`, `practiceTypes.ts`, `exerciseGenerator.ts`, `exerciseScorer.ts`, `matchRawNotesToSlots.ts`

**Checkpoint**: App compiles; new folder exists; no import errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the Plugin API to v2 (implements US2 recording + US3 scheduled-playback API surface) and wire the new context capabilities into the host. **No US1 or US4 work can begin until this phase is fully checkpointed.**

**⚠️ CRITICAL**: Practice plugin cannot subscribe to mic or schedule notes until these tasks are complete.

- [X] T002 Write Plugin API contract test additions (MUST FAIL before T003–T005) in `frontend/src/plugin-api/plugin-api.test.ts` — assert: `PLUGIN_API_VERSION === "2"`; `PluginPitchEvent` has `midiNote`, `hz`, `confidence`, `timestamp`; `PluginContext.recording` has `subscribe` and `onError` functions; `PluginNoteEvent.offsetMs` is optional; `PluginContext.stopPlayback` is a function; `PluginPitchEvent` has no geometry or raw-audio fields
- [X] T003 Add `PluginPitchEvent` interface and `PluginRecordingContext` interface to `frontend/src/plugin-api/types.ts` (see [contracts/plugin-api-v2.ts](contracts/plugin-api-v2.ts) for exact shape); privacy constraint: `PluginPitchEvent` MUST NOT include any PCM, waveform, or raw-audio fields
- [X] T004 Add optional `offsetMs?: number` field to `PluginNoteEvent` in `frontend/src/plugin-api/types.ts`; add `readonly recording: PluginRecordingContext` and `stopPlayback(): void` to `PluginContext` (depends on T003 for `PluginRecordingContext` type)
- [X] T005 [P] Bump `PLUGIN_API_VERSION` from `'1'` to `'2'` in `frontend/src/plugin-api/types.ts`
- [X] T006 [P] Update `frontend/src/plugin-api/index.ts` barrel to additionally export `PluginPitchEvent` and `PluginRecordingContext` (depends on T003)
- [X] T007 [P] Write `PluginMicBroadcaster` tests (MUST FAIL before T008) in `frontend/src/services/recording/PluginMicBroadcaster.test.ts` — cover: first `subscribe` call opens mic stream; second `subscribe` call does NOT call `getUserMedia` again (shared stream); calling unsubscribe closes mic when no subscribers remain; `onError` handler fires immediately (queued microtask) if mic already in error state; mic closed on last unsubscribe; `isActive()` returns `true` while stream open and `false` after teardown
- [X] T008 Implement `frontend/src/services/recording/PluginMicBroadcaster.ts` — singleton class with `subscribe(handler): () => void`, `onError(handler): () => void`, `isActive(): boolean`; opens one `getUserMedia` + AudioWorklet stream on first subscriber; dispatches `PluginPitchEvent` using `detectPitch` from `frontend/src/services/recording/pitchDetection.ts`; releases mic when last subscriber unsubscribes; error state delivered to all `onError` handlers (see [research.md R-001](research.md) and [quickstart.md §2](quickstart.md))
- [X] T009 Add `pluginTimersRef: useRef<Map<string, Set<ReturnType<typeof setTimeout>>>>(new Map())` to `frontend/src/App.tsx`; extend `playNote` handler inside `loadPlugins()` to support `offsetMs`: if `event.offsetMs > 0`, schedule via `setTimeout + ToneAdapter.attackNote` and register timer handle in `pluginTimersRef.current.get(manifest.id)`; if `offsetMs` absent or `0`, keep existing `attackNote`/`releaseNote` path unchanged (see [research.md R-002, R-003](research.md) and [quickstart.md §3](quickstart.md))
- [X] T010 Add `stopPlayback` and `recording` to the `PluginContext` object constructed in `loadPlugins()` in `frontend/src/App.tsx`: `stopPlayback` clears all timers in `pluginTimersRef.current.get(manifest.id)` and calls `ToneAdapter.stopAll()`; `recording.subscribe` delegates to `pluginMicBroadcaster.subscribe`; `recording.onError` delegates to `pluginMicBroadcaster.onError` (depends on T008, T009)

**Checkpoint**: `npm test` passes for `plugin-api.test.ts` and `PluginMicBroadcaster.test.ts`. `PLUGIN_API_VERSION === "2"`. A minimal test plugin can call `context.recording.subscribe()`, `context.playNote({ offsetMs: 500 })`, and `context.stopPlayback()` without errors.

---

## Phase 3: User Story 1 — Practice as a First-Class Plugin (Priority: P1) 🎯 MVP

**Goal**: The Practice plugin appears in the app navigation for all users. A user can open it, play a mic or MIDI exercise (flow or step mode), see a countdown, get scored results, and try again.

**Independent Test**: Open app → navigate to "Practice" nav entry → start exercise → play notes via mic → results screen shows score. All phase transitions (ready → countdown → playing → results) must function.

### Tests — US1 (write first, must fail before implementation)

- [X] T011 [US1] Write `frontend/plugins/practice-view/PracticePlugin.test.tsx` covering all acceptance scenarios: (a) renders exercise staff and config UI on `ready` phase; (b) countdown counts down and transitions to `playing`; (c) `context.recording.subscribe` handler called on mount and unsubscribed on unmount; (d) `context.midi.subscribe` handler registered; (e) `context.playNote` called with correct `offsetMs` per note when Play is pressed; (f) `context.stopPlayback` called when Stop is pressed; (g) results screen shown with score after exercise completes; (h) "Try Again" resets to `ready` with same exercise; (i) "New Exercise" resets to `ready` with new exercise; (j) zero imports from `src/services/`, `src/components/`, `src/wasm/` — ESLint must flag any violation; (k) unmount during `playing` releases subscriptions and calls `context.stopPlayback`

### Implementation — US1

- [X] T012 [P] [US1] Create `frontend/plugins/practice-view/plugin.json`: `id: "practice-view"`, `name: "Practice"`, `version: "1.0.0"`, `pluginApiVersion: "2"`, `entryPoint: "index.tsx"`, `description: "Piano practice exercise — play along and see your score."`
- [X] T013 [P] [US1] Fill `frontend/plugins/practice-view/practiceTypes.ts` with plugin-internal types: `PracticeMode` (`'flow' | 'step'`), `PracticePhase` (`'ready' | 'countdown' | 'playing' | 'results'`), `PracticeExercise` (notes with `midiPitch` + `expectedOnsetMs`, `bpm`, `mode`, `clef`), `ExerciseConfig` (`mode`, `clef`, `bpm`, `octavePool`), `NoteComparison` (`slotIndex`, `status`, `targetMidi`, `responseMidi`), `ExerciseResult` (`comparisons`, `score`, `totalNotes`, `correctNotes`) — no imports from `src/`
- [X] T014 [P] [US1] Fill `frontend/plugins/practice-view/exerciseGenerator.ts` — adapted copy of `frontend/src/services/practice/exerciseGenerator.ts` that imports only from `./practiceTypes.ts`; no `src/` imports; exports `generateExercise(config: ExerciseConfig): PracticeExercise` and `DEFAULT_EXERCISE_CONFIG`
- [X] T015 [P] [US1] Fill `frontend/plugins/practice-view/exerciseScorer.ts` — adapted copy of `frontend/src/services/practice/exerciseScorer.ts` importing only from `./practiceTypes.ts`; exports `scoreExercise(exercise, capturedEvents): ExerciseResult`; scoring accepts `PluginPitchEvent[]` (mic) or converted MIDI events
- [X] T016 [P] [US1] Fill `frontend/plugins/practice-view/matchRawNotesToSlots.ts` — adapted copy of `matchRawNotesToSlots` from `frontend/src/services/practice/usePracticeRecorder.ts`; imports only `./practiceTypes.ts`; no `src/` imports
- [X] T017 [P] [US1] Create `frontend/plugins/practice-view/PracticePlugin.css` — styles for plugin container, config sidebar (collapsible on mobile), countdown overlay, staff containers (stacked: exercise on top, response below), controls bar, result panel; 44×44 px minimum touch targets; tablet-first layout
- [X] T018 [US1] Implement `frontend/plugins/practice-view/PracticePlugin.tsx` — phase state machine (`ready → countdown → playing → results`); config UI (BPM, clef, mode, octave pool selectors); `context.recording.subscribe` always-on (filter events by phase in handler); `context.midi.subscribe` always-on (same filter pattern); `handlePlay` runs countdown then calls `context.playNote({ offsetMs })` for each exercise note plus a finish `setTimeout` calling `context.stopPlayback()` + `scoreExercise` + `setPhase('results')`; `handleStop` calls `context.stopPlayback()` + scores incomplete capture; two `<context.components.StaffViewer>` instances (exercise staff with `highlightedNotes`, response staff); result display (per-note status, total score); "Try Again" and "New Exercise" buttons; unmount cleanup calls unsubscribe functions and `context.stopPlayback()`; imports exclusively from `./practiceTypes`, `./exerciseGenerator`, `./exerciseScorer`, `./matchRawNotesToSlots`, and `../../src/plugin-api/index` (depends on T011–T017, T009, T010)
- [X] T019 [US1] Fill `frontend/plugins/practice-view/index.tsx` — default export `MusicorePlugin`; `init(context)` stores context ref; `Component` renders `<PracticePlugin context={_context} />`; `dispose()` clears ref; same shape as `frontend/plugins/virtual-keyboard/index.tsx` (depends on T018)

**Checkpoint**: `npm test` passes for `PracticePlugin.test.tsx`. Open app → "Practice" nav entry not yet visible (builtinPlugins not yet updated — that's US4), but component renders correctly when wired manually or via test.

---

## Phase 4: User Story 4 — Plugin Migration & PracticeView Removal (Priority: P4)

**Goal**: The Practice plugin is registered as a built-in, appears in navigation, and all old internal `PracticeView` wiring is removed. Test parity is confirmed before deletion.

**Independent Test**: Open app → "Practice" nav entry is visible without any user action → navigate to it → full exercise flow works → old `PracticeView` code is gone → `npm test` and `npm run build` pass.

### Tests — US4 (verify coverage before deletion)

- [X] T020 [US4] Audit `frontend/plugins/practice-view/PracticePlugin.test.tsx` against `frontend/src/components/practice/PracticeView.test.tsx` — create a one-time checklist comment in `PracticePlugin.test.tsx` confirming each `PracticeView.test.tsx` test has an equivalent. Do NOT delete old tests until this audit is signed off in code review.

### Implementation — US4

- [X] T021 [P] [US4] Register practice-view in `frontend/src/services/plugins/builtinPlugins.ts` — import `practiceViewPlugin` from `../../../plugins/practice-view/index` and `practiceViewManifestJson` from `../../../plugins/practice-view/plugin.json`; add second entry to `BUILTIN_PLUGINS` array with `origin: 'builtin'` (see [quickstart.md §5](quickstart.md))
- [X] T022 [P] [US4] Remove `PracticeView` routing from `frontend/src/App.tsx`: delete `showPractice` state, `handleShowPractice` callback, `setShowPractice(false)` call in `handleSelectPlugin`, `PracticeView` import, and the `{showPractice && <PracticeView .../>}` render block (see [research.md R-005](research.md))
- [X] T023 [P] [US4] Remove `onShowPractice` prop, Practice debug button, and any related `PracticeViewProps` reference from `frontend/src/components/ScoreViewer.tsx`; verify `ScoreViewer.test.tsx` (if present) still passes (see [quickstart.md §6](quickstart.md))
- [X] T024 [US4] Delete `frontend/src/components/practice/PracticeView.tsx` and `frontend/src/components/practice/PracticeView.css` — confirm `npm run build` passes after deletion (depends on T020 audit sign-off, T022, T023)
- [X] T025 [US4] Delete `frontend/src/components/practice/PracticeView.test.tsx` — only after T020 audit confirms `PracticePlugin.test.tsx` covers equivalent scenarios (depends on T024)
- [X] T026 [P] [US4] Delete `frontend/src/components/practice/ExerciseResultsView.tsx` (and its CSS/test if present) if the component is used exclusively by `PracticeView` — confirm `npm run build` passes
- [X] T027 [P] [US4] Audit `frontend/src/services/practice/practiceLayoutAdapter.ts` — if only imported by `PracticeView.tsx` (already deleted), delete it; confirm `npm run build` passes
- [X] T028 [P] [US4] Audit `frontend/src/services/practice/usePracticeRecorder.ts` — if only imported by deleted practice components, delete it; if still imported elsewhere, keep and add a comment noting it is no longer used by the built-in Practice plugin

**Checkpoint**: `npm run build` and `npm test` both pass with zero references to deleted files. "Practice" nav entry visible on app open. Full exercise flow works end-to-end.

---

## Polish & Cross-Cutting Concerns

**Purpose**: Documentation currency (Constitution §Documentation Currency), ESLint boundary verification, and FEATURES.md update.

- [X] T029 Update `PLUGINS.md` with v2 Plugin API additions: `PluginPitchEvent` type, `context.recording.subscribe` and `context.recording.onError`, `offsetMs` field on `PluginNoteEvent`, `context.stopPlayback()` — include usage examples and the privacy constraint (pitch-events only, no raw audio); note Practice plugin as the reference implementation (see [contracts/plugin-api-v2.ts](contracts/plugin-api-v2.ts))
- [X] T030 [P] Update `FEATURES.md` — mark Practice exercise as a production-navigation plugin available to all users; remove any reference to it being a debug-only feature
- [X] T031 [P] Run `cd frontend && npx eslint plugins/practice-view/` and confirm zero `no-restricted-imports` errors; if any violation is found, fix it before merging

**Checkpoint**: `PLUGINS.md` describes v2 API. `FEATURES.md` is accurate. ESLint clean. All tests pass. Feature complete.

---

## Dependencies

```
T001 (Setup)
  └─► T002–T010 (Foundational)
        ├─► T007 → T008 (PluginMicBroadcaster: test then implement)
        ├─► T009 → T010 (offsetMs + stopPlayback: timers then context wiring)
        └─► T003 → T004, T005, T006 (types → barrel, version, offsetMs)

T002–T010 (Foundational COMPLETE)
  └─► T011 (US1 tests — write first, must fail)
        └─► T012–T017 (parallel US1 scaffolding)
              └─► T018 → T019 (PracticePlugin.tsx → index.tsx)

T019 (US1 COMPLETE)
  └─► T020 (US4 audit)
        └─► T021–T023 (parallel: register + remove App.tsx routing + remove ScoreViewer)
              └─► T024 → T025 (delete PracticeView.tsx then test file)
              └─► T026–T028 (parallel: delete ExerciseResultsView, practiceLayoutAdapter, usePracticeRecorder)

T025–T028 (US4 COMPLETE)
  └─► T029–T031 (Polish: parallel)
```

## Parallel Execution Examples

**Phase 2 (Foundational)**:  
- T002 (contract tests) can be written in parallel with T007 (PluginMicBroadcaster tests)  
- T003 + T007 are parallel (different files); T004 + T005 follow T003; T006 follows T003  
- T009 and T008 are partially parallel (different sections of App.tsx context object)  

**Phase 3 (US1)**:  
- T012 (plugin.json), T013 (practiceTypes), T014 (exerciseGenerator), T015 (exerciseScorer), T016 (matchRawNotesToSlots), T017 (CSS) are all fully parallel  
- T018 (PracticePlugin.tsx) requires T011–T017 all done before starting  

**Phase 4 (US4)**:  
- T021 (builtinPlugins), T022 (App.tsx routing removal), T023 (ScoreViewer) are fully parallel  
- T026 (ExerciseResultsView), T027 (practiceLayoutAdapter), T028 (usePracticeRecorder) are parallel after T024  

## Implementation Strategy

**Suggested MVP scope**: Complete Phases 1, 2, and 3 (T001–T019) — this delivers a fully functional Practice plugin and proves the extended Plugin API. Phase 4 (removal) and Polish can follow in a second pass once the plugin is verified in production navigation.

**Test-first checkpoints**:  
1. T002 must fail → implement T003–T010 → T002 must pass  
2. T007 tests must fail → implement T008 → T007 tests must pass  
3. T011 tests must fail → implement T012–T019 → T011 tests must pass  
4. T020 audit must sign off → T024/T025 deletion permitted  
