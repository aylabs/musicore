# Tasks: Play Score Plugin

**Input**: Design documents from `/specs/033-play-score-plugin/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/plugin-api-v3.ts ✅ quickstart.md ✅

**Tests**: Included — Constitution Principle V (Test-First Development) is non-negotiable. All test tasks are marked and MUST be written before the corresponding implementation.

**Organization**: Tasks are grouped by user story. The foundational phase (Plugin API v3) MUST complete before any user story work begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelisable — operates on a different file from concurrent tasks in the same phase
- **[Story]**: Which user story this task delivers (US1–US7 from spec.md)
- Exact file paths in all descriptions

---

## Phase 1: Setup

**Purpose**: Create the plugin directory scaffold so later tasks have real files to edit.

- [X] T001 Create `frontend/plugins/play-score/` directory scaffold: empty `plugin.json`, `index.tsx`, `PlayScorePlugin.tsx`, `PlayScorePlugin.css`, `PlayScorePlugin.test.tsx`, `scoreSelectionScreen.tsx`, `playbackToolbar.tsx` (stub files only — content added in later phases)

---

## Phase 2: Foundational — Plugin API v3

**Purpose**: Extend the Plugin API from v2 to v3, implement the host-side `scorePlayer` context and `ScoreRenderer` component. **BLOCKS all user stories.** No plugin code may be written until this phase is complete.

**⚠️ CRITICAL**: Constitution Principle V — contract tests (T003) must be written and verified FAILING before T004 implements them.

- [X] T002 Add v3 types to `frontend/src/plugin-api/types.ts`: `PluginPreloadedScore`, `ScoreLoadSource`, `PluginPlaybackStatus`, `ScorePlayerState`, `PluginScorePlayerContext`, `PluginScoreRendererProps`; extend `PluginContext` with `scorePlayer` namespace and `components.ScoreRenderer`; bump `PLUGIN_API_VERSION` to `'3'` (see contracts/plugin-api-v3.ts)
- [X] T003 [P] Write contract tests (FAILING) for `PluginScorePlayerContext` in `frontend/src/plugin-api/scorePlayerContext.test.ts`: `getCatalogue()` returns all 6 PRELOADED_SCORES entries; `loadScore({kind:'catalogue'})` transitions status `idle→loading→ready`; `loadScore` with corrupt file transitions to `error`; `subscribe()` calls handler immediately on subscribe; `stop()` resets `currentTick` to 0; `stop()` resets to `pinnedStart` tick when set; `setLoopEnd()` causes playback wrap at end tick
- [X] T004 Implement `frontend/src/plugin-api/scorePlayerContext.ts`: `useScorePlayerContext` hook wrapping `usePlayback` + `useTempoState` + `MusicXMLImportService` + `useNoteHighlight`; exposes full `PluginScorePlayerContext` interface; `loadScore({kind:'catalogue'})` resolves path from `PRELOADED_SCORES` by `id` internally (FR-013); `getCurrentTickLive()` reads `tickSourceRef.current.currentTick` (60 Hz, no re-render); `subscribe()` push model — handler called immediately then on each state change
- [X] T005 [P] Create `frontend/src/components/plugins/ScoreRendererPlugin.tsx`: host-provided `ScoreRenderer` component wrapping `LayoutView`/`pages/ScoreViewer`; maps `onNoteShortTap ← onNoteClick` (short tap), `onNoteLongPress ← onPin` (long press ≥ 500 ms), `onCanvasTap` (canvas background tap); renders loop region overlay, pin markers, note cursor; renders "back to start" button at bottom of score (FR-010) calling `onReturnToStart` prop; no coordinates cross component boundary (Principle VI)
- [X] T006 Inject v3 context into `frontend/src/components/plugins/PluginView.tsx`: instantiate `useScorePlayerContext()`; pass `ScoreRendererPlugin` as `context.components.ScoreRenderer`; inject both into the `PluginContext` object provided to plugins; inject no-op stub `scorePlayer` for v2 plugins (backward compat)

**Checkpoint**: Plugin API v3 complete — all user story tasks may now proceed in parallel.

---

## Phase 3: User Story 1 — Launch Play Score from the landing page (Priority: P1) 🎯 MVP

**Goal**: The Play Score `core` plugin is registered, appears on the landing screen, shows a score selection screen with all 6 preloaded scores, and renders the chosen score full-screen with a toolbar. Back button is hidden before a score is loaded.

**Independent Test**: Open app → tap "Play Score" → selection screen lists 6 scores → select one → score renders full-screen with toolbar → tap Back → returns to landing screen. Back button is NOT visible on the selection screen.

- [X] T007 [P] Write unit tests (FAILING) for US1 in `frontend/plugins/play-score/PlayScorePlugin.test.tsx`: selection screen renders all 6 catalogue entries by `displayName`; selecting an entry calls `scorePlayer.loadScore({kind:'catalogue', catalogueId})` and transitions to player view; Back button is **absent** when screen === 'selection'; Back button is **present** when screen === 'player'; Back button calls `context.close()`; loading indicator shown when `status === 'loading'`; error message shown when `status === 'error'`
- [X] T008 [P] Create `frontend/plugins/play-score/plugin.json`: `id: "play-score"`, `name: "Play Score"`, `type: "core"`, `view: "full-screen"`, `pluginApiVersion: "3"`, `version: "1.0.0"`, `description: "Load and play scores from the library or a file."`
- [X] T009 [P] Create `frontend/plugins/play-score/index.tsx`: plugin entry point implementing `MusicorePlugin` — `init(context)` stores context reference; `Component` renders `<PlayScorePlugin />`
- [X] T010 Implement `frontend/plugins/play-score/scoreSelectionScreen.tsx`: displays all entries from `context.scorePlayer.getCatalogue()` as a tappable list by `displayName`; calls `onSelectScore(catalogueId)` on tap; includes "Load from file" item (wired in US6); does NOT show a Back button (FR-002, Q4 answer)
- [X] T011 Implement `frontend/plugins/play-score/PlayScorePlugin.tsx`: manages screen state `'selection' | 'player'`; subscribes to `context.scorePlayer.subscribe(setState)`; handles `handleSelectScore(id)` → `loadScore({kind:'catalogue',catalogueId:id})` → set screen to `'player'`; renders `scoreSelectionScreen` or player layout conditionally; player layout shows hidden-until-loaded Back button, score title, `ScoreRenderer`, and `playbackToolbar` placeholder; loading indicator while `status === 'loading'`; error banner while `status === 'error'`
- [X] T012 Register plugin in `frontend/src/services/plugins/builtinPlugins.ts`: import `playScorePlugin` from `plugins/play-score/index`; import `playScoreManifestJson` from `plugins/play-score/plugin.json`; add entry with `origin: 'builtin'` to `BUILTIN_PLUGINS` array
- [X] T013 Add `data-testid="plugin-launch-play-score"` to the Play Score core-plugin launch button on the landing screen (in `frontend/src/components/LandingScreen.tsx` or equivalent) to enable SC-006 Playwright targeting

**Checkpoint**: Play Score plugin launches from landing screen, score selection renders, score loads and displays via WASM renderer, Back button behaviour is correct. US1 independently verifiable.

---

## Phase 4: User Story 2 — Play, pause, stop and timer (Priority: P1)

**Goal**: Full playback controls functional: Play starts audio + highlights notes + starts timer; Pause freezes both; Stop resets position; canvas tap toggles play/pause.

**Independent Test**: Load Bach Invention → Play → notes highlighted, timer advances → Pause → timer freezes → Play → resumes from same tick → Stop → position returns to start.

- [X] T014 [P] Write unit tests (FAILING) for US2 in `frontend/plugins/play-score/PlayScorePlugin.test.tsx`: Play button calls `scorePlayer.play()`; Pause button calls `scorePlayer.pause()`; Stop button calls `scorePlayer.stop()`; timer displays elapsed time derived from `currentTick` + `bpm`; timer freezes when `status === 'paused'`; canvas tap calls `play()` when paused/stopped, `pause()` when playing (via `onCanvasTap` prop)
- [X] T015 Implement `frontend/plugins/play-score/playbackToolbar.tsx`: renders Back button (hidden prop), score title, Play/Pause toggle button (icon changes by status), Stop button, elapsed time display (converted from `currentTick` + `bpm` to `mm:ss`), Tempo control placeholder (wired in US7); all button callbacks as props
- [X] T016 Wire playback controls in `frontend/plugins/play-score/PlayScorePlugin.tsx`: connect `scorePlayer.play/pause/stop` to toolbar callbacks; pass `status` + `currentTick` + `bpm` from subscribed `ScorePlayerState` to toolbar; wire `onCanvasTap` on `ScoreRenderer` to toggle play/pause based on current status

**Checkpoint**: All playback controls working. US2 independently verifiable on top of US1.

---

## Phase 5: User Story 3 — Seek by tapping a note (Priority: P2)

**Goal**: Short-tapping a rendered note moves the playback cursor to that note's tick. Works whether playing, paused, or stopped (no auto-resume on stopped/paused).

**Independent Test**: Load score → tap note at measure 8 → cursor jumps to measure 8 → Press Play → playback begins from measure 8.

- [X] T010 [P] Write unit tests (FAILING) for US3 in `frontend/plugins/play-score/PlayScorePlugin.test.tsx`: short-tap note while stopped calls `seekToTick(tick)` and does NOT call `play()`; short-tap note while playing calls `seekToTick(tick)` and does NOT call `pause()`; short-tap note while paused calls `seekToTick(tick)` and does NOT call `play()`
- [X] T010 Implement `onNoteShortTap` handler in `frontend/plugins/play-score/PlayScorePlugin.tsx`: receives `(tick, noteId)` from `ScoreRenderer`; calls `context.scorePlayer.seekToTick(tick)`; does NOT alter playback status

**Checkpoint**: Note-tap seeking fully functional. US3 independently verifiable on top of US1+US2.

---

## Phase 6: User Story 4 — Pin a start point and define a loop region (Priority: P2)

**Goal**: Long-press state machine: no pins → set pin; same note → unpin; different note → create loop region; inside loop → clear. Pin/loop synced to host playback engine. Changes are silent during active playback.

**Independent Test**: Load score → long-press note A → green pin visible → long-press note B → loop region overlay → Play → loops → long-press region → clears.

- [X] T010 [P] Write unit tests (FAILING) for US4 in `frontend/plugins/play-score/PlayScorePlugin.test.tsx`: first long-press sets `loopStart` and calls `setPinnedStart(tick)`; second long-press on same note unpins and calls `setPinnedStart(null)`; second long-press on different note creates loop region and calls `setLoopEnd(tick)`; degenerate region (same tick) treated as unpin; long-press inside active loop region clears both pins; `setPinnedStart`/`setLoopEnd` NOT called while playback is playing (silent set only — pin state updates, host sync deferred to stop); Stop with single pin calls `stop()` which resets to pinned tick (host handles); `pinnedNoteIds` contains the pinned note IDs
- [X] T00 Implement `PinState`/`LoopRegion` state and `handleLongPress` state machine in `frontend/plugins/play-score/PlayScorePlugin.tsx`: `loopStart: PinState | null`, `loopEnd: PinState | null`; `toLoopRegion()` derivation (sort by tick, degenerate = null → unpin); when playback active, defer `setPinnedStart`/`setLoopEnd` call (set local state only; sync on next Stop); when stopped/paused, sync immediately; pass updated `pinnedNoteIds` and `loopRegion` to `ScoreRenderer`
- [X] T00 [P] Pass `pinnedNoteIds: Set<string>` and `loopRegion: LoopRegion | null` from plugin pin state to `context.components.ScoreRenderer` in `frontend/plugins/play-score/PlayScorePlugin.tsx`; wire `onNoteLongPress` prop to `handleLongPress`

**Checkpoint**: Full pin/loop state machine working with overlay display. US4 independently verifiable on top of US1+US2.

---

## Phase 7: User Story 5 — Return to score start with a bottom button (Priority: P2)

**Goal**: A button at the bottom of the score area (inside `ScoreRenderer`) seeks to tick 0 or the pinned start tick. Works during active playback (restarts from that tick immediately).

**Independent Test**: Load score → scroll to measure 20 → tap bottom button → score scrolls to measure 1, playback position at start.

- [X] T00 [P] Write unit tests (FAILING) for US5 in `frontend/plugins/play-score/PlayScorePlugin.test.tsx`: tapping "back to start" button calls `seekToTick(0)` when no pin is set; calls `seekToTick(pinnedStartTick)` when a pin is set; works while playing (does not stop playback)
- [X] T00 Wire `onReturnToStart` callback prop on `frontend/src/components/plugins/ScoreRendererPlugin.tsx` (already renders the button per T005); in `frontend/plugins/play-score/PlayScorePlugin.tsx`, pass handler that calls `context.scorePlayer.seekToTick(loopStart?.tick ?? 0)`

**Checkpoint**: Return-to-start button works in all playback states. US5 independently verifiable on top of US1+US2.

---

## Phase 8: User Story 6 — Load a user-provided score file (Priority: P3)

**Goal**: From the score selection screen, user picks "Load from file", selects a `.mxl`/`.xml` file, it parses and renders. Invalid files show an error; previously loaded score is preserved on error.

**Independent Test**: Open plugin → "Load from file" → pick valid `.mxl` → score renders and is playable. Pick corrupt file → error message shown, selection screen or last score visible.

- [X] T00 [P] Write unit tests (FAILING) for US6 in `frontend/plugins/play-score/PlayScorePlugin.test.tsx`: "Load from file" item present in selection screen; selecting a valid file calls `scorePlayer.loadScore({kind:'file', file})` and transitions to player view; `status === 'error'` after corrupt file → error message shown and selection screen remains; previously loaded score preserved while `status === 'error'`
- [X] T00 Add `<input type="file" accept=".mxl,.xml,.musicxml">` element and "Load from file" list item to `frontend/plugins/play-score/scoreSelectionScreen.tsx`; trigger hidden file input on tap; call `onLoadFile(file)` prop with the selected `File` object; `onLoadFile` in `PlayScorePlugin.tsx` calls `context.scorePlayer.loadScore({kind:'file', file})` then transitions to player view on success or displays error on failure

**Checkpoint**: File loading from device works. US6 independently verifiable on top of US1.

---

## Phase 9: User Story 7 — Tempo control (Priority: P3)

**Goal**: Tempo slider/control in the toolbar adjusts playback BPM. Changes take effect from the next note without restarting. BPM display reflects current value.

**Independent Test**: Load score → Play → drag tempo slider → audio noticeably faster/slower → BPM number updates.

- [X] T00 [P] Write unit tests (FAILING) for US7 in `frontend/plugins/play-score/PlayScorePlugin.test.tsx`: adjusting tempo control calls `scorePlayer.setTempoMultiplier(multiplier)`; BPM display in toolbar updates from `ScorePlayerState.bpm`; tempo change during playback does not stop or restart playback (`status` remains `'playing'`)
- [X] T00 Complete tempo control in `frontend/plugins/play-score/playbackToolbar.tsx`: replace placeholder with working slider (range 0.5–2.0 multiplier, or 50–200% label) + BPM number display; fire `onTempoChange(multiplier)` callback prop; in `PlayScorePlugin.tsx` wire `onTempoChange` to `context.scorePlayer.setTempoMultiplier(multiplier)`; read `bpm` from subscribed `ScorePlayerState` for display

**Checkpoint**: All 7 user stories complete. Full feature functionally done.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, regression suite, audio teardown guarantee, and documentation updates.

- [X] T00 [P] Write Playwright e2e test `frontend/e2e/play-score-plugin.spec.ts` covering full SC-006 regression suite: launch plugin from landing screen via `[data-testid="plugin-launch-play-score"]`; selection screen visible with 6 score entries; Back button absent on selection screen; select Beethoven → player view loads; Back button present → tap closes plugin; Play → Pause → Stop; long-press note → pin visible; second long-press → loop overlay visible; plugin exit stops audio (assert `stopPlayback` spy called); all existing `data-testid` attributes from previous ScoreViewer Playwright tests covered
- [X] T00 Add WASM loading indicator and disable ALL controls (Play, Stop, tempo, file input) when `status === 'loading'` in `frontend/plugins/play-score/PlayScorePlugin.tsx` (edge case: WASM still initialising on first open)
- [X] T00 Add audio teardown guarantee in `frontend/plugins/play-score/PlayScorePlugin.tsx`: `useEffect(() => () => { context.scorePlayer.stop(); context.stopPlayback(); }, [])` — ensures SC-005: no audio continues after plugin unmounts; verify automated test from T028 asserts this
- [X] T00 [P] Verify SC-004 TypeScript compilation: confirm removing `ScoreViewer.tsx` from host routes (without deleting the file) does not introduce any TypeScript errors; run `npx tsc --noEmit` in `frontend/` and confirm clean
- [X] T00 [P] Update `FEATURES.md`: document Play Score Plugin as a core feature; update `PLUGINS.md`: document `play-score` plugin (id, API version, capabilities, full-screen mode, score sources)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational — API v3)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phases 3–9 (User Stories 1–7)**: All depend on Phase 2 completion; can then proceed in priority order or in parallel
  - US1 and US2 are both P1 — US1 MUST complete before US2 (US2 adds controls to the player view from US1)
  - US3, US4, US5 are P2 — all depend on US1+US2 (need player view + rendered score); can run in parallel within their phases
  - US6, US7 are P3 — depend on US1 (selection screen / toolbar); can run in parallel
- **Phase 10 (Polish)**: Depends on all desired user stories complete

### User Story Dependencies

| Story | Priority | Depends On | Notes |
|-------|----------|-----------|-------|
| US1 | P1 | Phase 2 | Foundational — establishes player view scaffold |
| US2 | P1 | US1 | Adds controls to player view |
| US3 | P2 | US1 + US2 | Note interaction on rendered score |
| US4 | P2 | US1 + US2 | Note interaction on rendered score |
| US5 | P2 | US1 + US2 | Requires rendered score + ScoreRenderer button |
| US6 | P3 | US1 | Adds file input to selection screen |
| US7 | P3 | US1 + US2 | Completes toolbar |

### Within Each Phase

- Test tasks (FAILING) MUST be committed before implementation tasks
- Models before services before integration (see quickstart.md for full order)
- `[P]` tasks within the same phase can run in parallel

---

## Parallel Opportunities Per Story

### Phase 2 (Foundational) Parallel Example

```
T002 → types.ts v3 additions (must be first)
After T002:
  T003 [P] → scorePlayerContext.test.ts (contract tests)
  T005 [P] → ScoreRendererPlugin.tsx
After T003 + T004 + T005:
  T006 → PluginView.tsx injection (needs T004 + T005 output)
```

### Phase 3 (US1) Parallel Example

```
T007 [P] → PlayScorePlugin.test.tsx US1 tests
T008 [P] → plugin.json
T009 [P] → index.tsx
After T007 + T008 + T009:
  T010 → scoreSelectionScreen.tsx
  T011 → PlayScorePlugin.tsx
  T012 → builtinPlugins.ts registration
  T013 → data-testid on landing screen
```

### Phase 4 (US2) Parallel Example

```
T014 [P] → PlayScorePlugin.test.tsx US2 tests (parallel with T015)
T015 → playbackToolbar.tsx implementation
After T014 + T015:
  T016 → wire in PlayScorePlugin.tsx
```

---

## Implementation Strategy

### MVP Scope: US1 + US2 only

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational API v3 (blocks everything)
3. Complete Phase 3: US1 — plugin launches, score loads, basic full-screen view ✅
4. Complete Phase 4: US2 — play/pause/stop/timer ✅
5. **STOP and VALIDATE**: SC-001 (3 taps to play), SC-002 (regression), SC-003 (< 3 s load), SC-004 (plugin self-contained), SC-005 (no audio leak)
6. Demo-ready MVP

### Full Feature Delivery Order

1. Setup + Foundational → foundation ready
2. US1 + US2 → **MVP**: launch → select → play (P1 complete)
3. US3 + US4 + US5 → **Practice mode**: seek + pin/loop + return-to-start (P2 complete)
4. US6 + US7 → **Advanced**: file loading + tempo (P3 complete)
5. Phase 10 Polish → end-to-end validation + docs

### Parallel Team Strategy

With multiple developers after Phase 2 completes:
- Dev A: US1 (Phase 3) → US6 (Phase 8)
- Dev B: US2 (Phase 4) → US7 (Phase 9)
- Dev C: US3 (Phase 5) + US4 (Phase 6) + US5 (Phase 7)
- All: Phase 10 together

---

## Format Validation

All tasks follow the required format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

| Check | Result |
|-------|--------|
| Every task has checkbox `- [ ]` | ✅ |
| Every task has sequential ID (T001–T032) | ✅ |
| `[P]` only on tasks that operate on distinct files from concurrent tasks | ✅ |
| `[US#]` label on all user-story phase tasks | ✅ |
| Setup phase tasks: no story label | ✅ |
| Foundational phase tasks: no story label | ✅ |
| Polish phase tasks: no story label | ✅ |
| All tasks include explicit file paths | ✅ |
