# Tasks: Display Improvements

**Input**: Design documents from `/specs/022-display-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/playback-timer.ts, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup

**Purpose**: Shared utilities and type changes needed by multiple stories

- [x] T001 Create `formatPlaybackTime()` utility in `frontend/src/utils/timeFormatting.ts` — pure function converting seconds to `M:SS` / `MM:SS` / `H:MM:SS` format per contract in `specs/022-display-improvements/contracts/playback-timer.ts`
- [x] T002 Add `totalDurationTicks: number` field to `PlaybackState` interface in `frontend/src/services/playback/MusicTimeline.ts` — compute as `Math.max(...notes.map(n => n.start_tick + n.duration_ticks))` via `useMemo`, return in hook result

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational blocking tasks required — all three stories are independent. Phase 1 setup tasks (T001, T002) are the only shared prerequisites for US1.

**Checkpoint**: T001-T002 complete — user story implementation can begin.

---

## Phase 3: User Story 1 — Playback Timer Display (Priority: P1) 🎯 MVP

**Goal**: Show elapsed/total time in `MM:SS` format in the playback controls, updating in real time during playback, visible in all views.

**Independent Test**: Load any score, press Play, verify timer counts up; press Pause, verify timer freezes; press Stop, verify timer resets to `0:00 / T:TT`.

### Implementation for User Story 1

- [x] T003 [US1] Create `PlaybackTimer` component in `frontend/src/components/playback/PlaybackTimer.tsx` — accepts `elapsedSeconds` and `totalSeconds` props, renders `formatPlaybackTime(elapsed) / formatPlaybackTime(total)` per `PlaybackTimerProps` contract
- [x] T004 [US1] Extend `PlaybackControlsProps` in `frontend/src/components/playback/PlaybackControls.tsx` — add `currentTick`, `totalDurationTicks`, `tempo`, `tempoMultiplier` props; compute elapsed/total seconds internally using `ticksToSeconds()` and `tempoMultiplier`; render `<PlaybackTimer>` after the playback buttons (visible in both compact and non-compact modes)
- [x] T005 [US1] Pass timer data from `ScoreViewer` to `PlaybackControls` in `frontend/src/components/ScoreViewer.tsx` — thread `playbackState.currentTick`, `playbackState.totalDurationTicks`, `tempo`, and `tempoState.tempoMultiplier` as new props to the `<PlaybackControls>` invocation

**Checkpoint**: Playback timer visible and functional in all three views. Timer shows `0:00 / T:TT` when stopped, counts up during playback, freezes on pause, resets on stop.

---

## Phase 4: User Story 2 — Score Title Display (Priority: P2)

**Goal**: Extract and display the score title from MusicXML metadata (`work-title` > `movement-title` > filename fallback) in the score header across all views.

**Independent Test**: Import a MusicXML file with `<work-title>`, verify the title appears in the header. Import one without title metadata, verify the filename appears instead. Switch views, verify title persists.

### Implementation for User Story 2 — Backend (Rust)

- [x] T006 [P] [US2] Add `work_title`, `movement_title`, and `composer` fields (`Option<String>`) to `MusicXMLDocument` struct in `backend/src/domain/importers/musicxml/types.rs` — update `Default` impl to set all three to `None`
- [x] T007 [US2] Extract `<work>/<work-title>` and `<movement-title>` elements in `backend/src/domain/importers/musicxml/parser.rs` — add `b"work"` and `b"movement-title"` match arms inside `parse_score_partwise()` (before the existing `_ => {}`), implement `parse_work()` helper method following the existing parsing pattern with `quick-xml`
- [x] T008 [US2] Populate `ImportMetadata.work_title` in `backend/src/domain/importers/musicxml/mod.rs` — replace `work_title: None` with `work_title: doc.work_title.clone().or(doc.movement_title.clone())` in the `build_result` / metadata construction; propagate `doc` reference to where metadata is built
- [x] T009 [US2] Populate `ImportMetadata.work_title` in WASM bindings at `backend/src/adapters/wasm/bindings.rs` — replace `work_title: None` with `work_title: doc.work_title.clone().or(doc.movement_title.clone())` in the `parse_musicxml()` function's metadata construction; propagate the parsed `doc` fields to the metadata builder
- [x] T010 [US2] Add Rust tests for title extraction in `backend/tests/musicxml_import_test.rs` — test parsing `scales.musicxml` (has `<work-title>`) returns `work_title = Some("Untitled score")`; test parsing `simple_melody.musicxml` (no title) returns `work_title = None`

### Implementation for User Story 2 — Frontend (TypeScript)

- [x] T011 [P] [US2] Add `metadata` field to `WasmImportResult` interface in `frontend/src/services/wasm/music-engine.ts` — add `metadata: { format: string; file_name?: string; work_title?: string; composer?: string }` to the existing interface
- [x] T012 [US2] Update `MusicXMLImportService` in `frontend/src/services/import/MusicXMLImportService.ts` — modify `buildMetadata()` to consume `work_title` from the WASM result's `metadata` field instead of always returning `None`; pass the WASM metadata through to `ImportResult.metadata`
- [x] T013 [US2] Add `scoreTitle` state and display in `frontend/src/components/ScoreViewer.tsx` — add `useState<string | null>(null)` for `scoreTitle`; in `handleMusicXMLImport`, set `scoreTitle` from `metadata.work_title ?? stripExtension(metadata.file_name) ?? null`; replace the hardcoded `<h1>Score</h1>` heading with the dynamic title (with `title` attribute for tooltip and CSS `text-overflow: ellipsis` for truncation); ensure the title is displayed in all view modes (not only `individual`)

**Checkpoint**: Score title displays correctly after MusicXML import — shows `<work-title>` when present, filename fallback otherwise. Title visible across all three views.

---

## Phase 5: User Story 3 — Tempo Control in Layout View (Priority: P3)

**Goal**: Add the existing `TempoControl` component to the Layout View, positioned to the right of the zoom controls, disabled during playback.

**Independent Test**: Switch to Layout View, verify tempo controls appear next to zoom controls. Adjust tempo, switch to Instruments View, verify tempo setting is preserved. Start playback, verify tempo control is disabled.

### Implementation for User Story 3

- [x] T014 [US3] Add `playbackStatus` prop to `LayoutView` in `frontend/src/components/layout/LayoutView.tsx` — extend `LayoutViewProps` with `playbackStatus?: PlaybackStatus`; render `<TempoControl disabled={playbackStatus === 'playing'} />` in the JSX, positioned visually to the right of the existing `<ScoreViewer>` zoom controls area (above or alongside the ScoreViewer component, using a flex container)
- [x] T015 [US3] Pass `playbackStatus` from `ScoreViewer` to `LayoutView` in `frontend/src/components/ScoreViewer.tsx` — add `playbackStatus={playbackState.status}` prop to the `<LayoutView>` invocation in the `viewMode === 'layout'` branch

**Checkpoint**: Tempo control visible and functional in Layout View, to the right of the zoom. State shared with Instruments View. Disabled during playback.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories

- [x] T016 [P] Rebuild WASM module by running `backend/scripts/build-wasm.sh` and verify the WASM output in `backend/pkg/` includes updated `ImportMetadata` with `work_title` serialization
- [x] T017 [P] Run full backend test suite with `cargo test` in `backend/` — verify all existing tests pass alongside new title extraction tests
- [x] T018 [P] Run full frontend test suite with `npm test` in `frontend/` — verify all existing tests pass with the modified interfaces
- [x] T019 Run quickstart.md validation — follow steps in `specs/022-display-improvements/quickstart.md` to verify all three features end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: N/A — no blocking foundational tasks
- **US1 (Phase 3)**: Depends on T001 (`timeFormatting.ts`) and T002 (`totalDurationTicks`)
- **US2 (Phase 4)**: Independent — backend tasks (T006-T010) have no dependency on Phase 1; frontend tasks (T011-T013) depend on backend tasks completing and WASM rebuild
- **US3 (Phase 5)**: Independent — no dependency on Phases 1-4
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T001, T002 → then T003 → T004 → T005 (sequential chain)
- **User Story 2 (P2)**: Backend (T006 → T007 → T008, T009) → WASM rebuild → Frontend (T011 → T012 → T013). T006 can run in parallel with US1 work.
- **User Story 3 (P3)**: T014 → T015 (two-task chain). Fully independent of US1 and US2.

### Within Each User Story

- Sequential within story: each task builds on the previous
- T006 (types.rs) before T007 (parser.rs) before T008/T009 (mod.rs/bindings.rs)
- T011 (interface) before T012 (service) before T013 (component)

### Parallel Opportunities

- **T001 and T002** can run in parallel (different files)
- **T006** and **T014** can run in parallel with US1 work (different files, different layers)
- **T011** can run in parallel with T010 (different layers: frontend interface vs backend test)
- **T016, T017, T018** can all run in parallel (different commands)

---

## Parallel Example: User Story 2

```
# Backend tasks — sequential within backend, but can overlap with US1/US3:
Task T006: Add title fields to MusicXMLDocument (types.rs)
Task T007: Extract title elements in parser (parser.rs) — depends on T006
Task T008: Populate ImportMetadata in mod.rs — depends on T007
Task T009: Populate ImportMetadata in bindings.rs — depends on T007 (parallel with T008)
Task T010: Backend tests for title extraction — depends on T008

# Frontend tasks — after WASM rebuild:
Task T011: Add metadata to WasmImportResult (music-engine.ts)
Task T012: Update MusicXMLImportService — depends on T011
Task T013: Display title in ScoreViewer — depends on T012
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T002 (Setup)
2. Complete T003-T005 (US1: Playback Timer)
3. **STOP and VALIDATE**: Timer works in all views
4. Deploy/demo if ready — timer alone delivers clear user value

### Incremental Delivery

1. T001-T002 → Setup ready
2. T003-T005 → US1 complete → **Playback Timer MVP** ✅
3. T006-T013 → US2 complete → **Score Title added** ✅
4. T014-T015 → US3 complete → **Tempo in Layout added** ✅
5. T016-T019 → Polish → **Full validation** ✅

Each story adds value without breaking previous stories.

---

## Notes

- No tests explicitly requested in feature spec — test tasks omitted per template rules. T010 (Rust title test) included because it validates the backend parser change which is not directly observable in the UI.
- US3 is the simplest story (2 tasks) — reuses the existing `TempoControl` component with zero modifications.
- The WASM rebuild (T016) is needed after backend changes in US2 before frontend can consume the updated `ImportMetadata`.
- All tasks reference exact file paths from `plan.md` and `quickstart.md`.
