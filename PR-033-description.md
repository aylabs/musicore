## Summary

Implement the **Play Score Plugin** — a full-screen score player delivered as a
first-class Plugin API v3 core plugin. Replaces the legacy embedded play view
that lived inside `ScoreViewer.tsx` with a self-contained, plugin-isolated
architecture. See `specs/033-play-score-plugin/`.

## What's Included

### Phase 1–2: Setup & Plugin API v3 Foundation (T001–T006)
- New `frontend/plugins/play-score/` directory scaffold
- Plugin API v3 types: `PluginScorePlayerContext`, `PluginScoreRendererProps`,
  `PluginPlaybackStatus`, `ScoreLoadSource`, `ScorePlayerState`
- `useScorePlayerContext` hook wiring `usePlayback` + `useTempoState` +
  `MusicXMLImportService` + `useNoteHighlight`
- `ScoreRendererPlugin.tsx`: host-provided `ScoreRenderer` component wrapping
  `LayoutView`; maps note tap/long-press gestures; renders loop overlay, pin
  markers, note cursor, and Return-to-Start button
- `PluginView.tsx` injection: v3 context + `ScoreRendererPlugin` provided to
  plugins; v2 no-op stub for backward compat

### Phase 3–9: User Stories 1–7 (T007–T032)
- **US1**: Launch plugin from landing page; score selection screen (6 catalogue
  entries + Load from file); Back button absent on selection, present on player
- **US2**: Play / Pause / Stop controls; elapsed timer (`mm:ss` from tick + BPM);
  canvas tap toggles play/pause; WASM loading indicator disables all controls
- **US3**: Seek by tapping a note — `seekToTick(tick)` without altering status
- **US4**: Long-press pin start point; second long-press creates loop region;
  degenerate region unpins; playback defers `setPinnedStart`/`setLoopEnd` until
  Stop; `pinnedNoteIds` passed to `ScoreRenderer`
- **US5**: Return-to-Start bottom button — seeks to tick 0 or pinned tick,
  works while playing
- **US6**: Load from file — hidden `<input type="file">` in selection screen;
  transitions to player on success, shows error on failure
- **US7**: Tempo multiplier slider (0.5–2.0×, snaps to 1.0 ±5%); live BPM
  display; no stop/restart on change

### Phase 10: Polish & Cross-Cutting (T028–T032)
- Playwright e2e regression suite `frontend/e2e/play-score-plugin.spec.ts`
  (SC-006 full pass)
- Audio teardown guarantee on plugin unmount (`useEffect` cleanup)
- TypeScript clean build verification
- `FEATURES.md` and `PLUGINS.md` documentation
- `icon` field added to `PluginManifest` and all `plugin.json` files

### Phase 10 UI Polish (post-task commits)
- Tempo slider snaps to 100% within ±5%
- Two-tap seek-then-resume; OS tap highlight suppressed on canvas
- OS context menu blocked on score view (iOS share / Android download)
- Toolbar polished to match previous viewer design
- Selection screen CSS and UI polish
- Score-area `display: flex` for correct scroll container height on all devices
- Back-gesture (`popstate`) handling restored; Return-to-Start scrolls to top
- `icon` field (`🎼`) in plugin manifests

### Phase 11: Legacy Play Score View Removal (T033–T041)
- **Deleted 12 files**: `src/components/stacked/` (ViewModeSelector + CSS +
  test) and `src/components/playback/` (PlaybackControls, PlaybackTimer,
  TempoControl + CSS + tests)
- **ScoreViewer.tsx rewritten** 724 → ~310 lines: removed `viewMode`, embedded
  playback hooks, fullscreen management, popstate listener, pin/loop state,
  `PlaybackControls`, `LayoutView`; restored independent inline playback bar
  (Play/Pause/Stop + live BPM) for the instruments list view
- **LandingScreen**: `LoadScoreButton` ("🎼 Play Score") removed; Play Score
  plugin is now the sole score-loading entry point from the landing page
- **LoadScoreDialog** retained in the instruments view toolbar ("Load Score"
  button) so users can swap scores without leaving the view
- All broken test mocks updated; 1136 tests pass

## Test Results
- **304 Rust backend tests** — all passing
- **1136 frontend tests** — all passing
- **WASM build** — compiles successfully

## Success Criteria Met

| Criterion | Status |
|-----------|--------|
| SC-001: ≤ 3 taps from landing to playing | ✅ |
| SC-002: No regression in existing tests | ✅ |
| SC-003: Score loads in < 3 s | ✅ |
| SC-004: Plugin self-contained — no host TS errors | ✅ |
| SC-005: No audio leaks after plugin closes | ✅ |
| SC-006: Full Playwright e2e suite passes | ✅ |

## Tasks

41 tasks completed (T001–T041) across 11 phases.
See `specs/033-play-score-plugin/tasks.md` for full task list.
