# Quickstart: Play Score Plugin (033)

**Branch**: `033-play-score-plugin`  
**Date**: 2026-02-27

---

## System Requirements

- Node.js ≥ 18, npm ≥ 9
- Rust stable + `wasm-pack` (already installed if WASM builds work on main)
- `frontend/` built WASM module present at `backend/pkg/` (run `bash backend/scripts/build-wasm.sh` if missing)

---

## Feature Overview

Feature 033 converts the existing `ScoreViewer.tsx` playback experience into a self-contained core plugin. It has **two implementation phases**:

**Phase A — Plugin API v3** (foundational):  
Extend `frontend/src/plugin-api/types.ts` with the `scorePlayer` namespace and `components.ScoreRenderer` component. This is pure host infrastructure — no visible user change yet.

**Phase B — Play Score Plugin** (feature):  
Build `frontend/plugins/play-score/` using the v3 API. Register it as a core builtin. Remove the direct `ScoreViewer` entry path from the landing screen.

---

## Phase A: Plugin API v3

### A1 — Extend `types.ts`

Add the new types from `specs/033-play-score-plugin/contracts/plugin-api-v3.ts`:

```typescript
// In: frontend/src/plugin-api/types.ts

// ── New types (all additive) ──────────────────────────────────────────────
export interface PluginPreloadedScore { id: string; displayName: string; }
export type ScoreLoadSource = ...
export type PluginPlaybackStatus = ...
export interface ScorePlayerState { ... }
export interface PluginScorePlayerContext { ... }
export interface PluginScoreRendererProps { ... }

// ── Bump version ──────────────────────────────────────────────────────────
export const PLUGIN_API_VERSION = '3' as const;

// ── Extend PluginContext.components ───────────────────────────────────────
readonly components: {
  readonly StaffViewer: ComponentType<PluginStaffViewerProps>;
  readonly ScoreRenderer: ComponentType<PluginScoreRendererProps>; // NEW
};

// ── Extend PluginContext ───────────────────────────────────────────────────
readonly scorePlayer: PluginScorePlayerContext; // NEW
```

### A2 — Implement host-side `ScorePlayerContextProvider`

Create `frontend/src/plugin-api/scorePlayerContext.ts`:

```typescript
// Wraps usePlayback, useTempoState, useNoteHighlight and exposes the
// PluginScorePlayerContext interface to be injected via PluginContextProvider.
//
// Key implementation notes:
// - loadScore({ kind: 'catalogue', catalogueId }) → fetch from PRELOADED_SCORES
//   by id → blob → File → MusicXMLImportService.importFile() → set notes + tempo
// - loadScore({ kind: 'file', file }) → same WASM path
// - subscribe() → calls handler with current state; driven by React state
// - getCurrentTickLive() → reads tickSourceRef.current.currentTick (no re-render)
// - All control methods (play/pause/stop/seekToTick/setPinnedStart/setLoopEnd/
//   setTempoMultiplier) delegate to the usePlayback / useTempoState hooks
```

### A3 — Implement `ScoreRenderer` component

Create `frontend/src/components/plugins/ScoreRendererPlugin.tsx`:

```typescript
// Thin adapter that wraps LayoutView / pages/ScoreViewer and maps:
//   props.onNoteShortTap   ← LayoutView.onNoteClick (short-tap)
//   props.onNoteLongPress  ← LayoutView.onPin (long-press)
//   props.onCanvasTap      ← LayoutView container tap (no note target)
//   props.loopRegion       → LayoutView.loopRegion
//   props.pinnedNoteIds    → LayoutView.pinnedNoteIds
//   props.currentTick      → for scroll-to-tick and cursor rendering
//   props.highlightedNoteIds → LayoutView.highlightedNoteIds
//
// Also renders the "back to start" button (FR-010) below the score canvas.
```

### A4 — Inject into `PluginContextProvider`

In `frontend/src/components/plugins/PluginView.tsx` (or wherever `PluginContext` is assembled), add:

```typescript
const scorePlayerCtx = useScorePlayerContext(/* pass usePlayback + useTempoState refs */);
const ctx: PluginContext = {
  ...existingV2Fields,
  scorePlayer: scorePlayerCtx,
  components: {
    StaffViewer: HostStaffViewer,
    ScoreRenderer: HostScoreRenderer,
  },
};
```

### A5 — Contract tests for ScorePlayerContext

Create `frontend/src/plugin-api/scorePlayerContext.test.ts`:
- Test `getCatalogue()` returns all 6 PRELOADED_SCORES entries with matching id/displayName.
- Test `loadScore({ kind: 'catalogue', catalogueId: 'bach-invention-1' })` resolves with `status: 'ready'`.
- Test `loadScore({ kind: 'file', file: corruptFile })` transitions to `status: 'error'` with non-null `error`.
- Test `subscribe()` is called once immediately on subscription with current state.
- Test `stop()` resets `currentTick` to 0 when no pinned start.
- Test `stop()` resets `currentTick` to `pinnedStart` when set.
- Test `setLoopEnd()` causes playback to wrap on tick reach (integration test with mock scheduler).

---

## Phase B: Play Score Plugin

### B1 — Scaffold plugin directory

```
frontend/plugins/play-score/
├── plugin.json
├── index.tsx
├── PlayScorePlugin.tsx
├── PlayScorePlugin.css
├── PlayScorePlugin.test.tsx
├── scoreSelectionScreen.tsx
└── playbackToolbar.tsx
```

**`plugin.json`**:
```json
{
  "id": "play-score",
  "name": "Play Score",
  "version": "1.0.0",
  "pluginApiVersion": "3",
  "entryPoint": "index.tsx",
  "description": "Load and play any score from the library or a file.",
  "type": "core",
  "view": "full-screen"
}
```

### B2 — Plugin architecture

`PlayScorePlugin.tsx` manages:
1. **Screen state**: `'selection' | 'player'`
2. **Pin state machine**: `loopStart: PinState | null`, `loopEnd: PinState | null`
3. **Subscribed player state**: `ScorePlayerState` from `context.scorePlayer.subscribe()`
4. **Derived loopRegion**: `toLoopRegion(loopStart, loopEnd)` → passed to ScoreRenderer + scorePlayer.setLoopEnd

Key flows:

```typescript
// Load a preloaded score
async function handleSelectScore(id: string) {
  await context.scorePlayer.loadScore({ kind: 'catalogue', catalogueId: id });
  setScreen('player');
}

// Load a user file
async function handleLoadFile(file: File) {
  await context.scorePlayer.loadScore({ kind: 'file', file });
  setScreen('player');
}

// Pin / loop state machine (FR-008)
function handleLongPress(tick: number, noteId: string | null) {
  // state machine → see data-model.md Pin/Loop State Machine
  // After state update → sync to host:
  context.scorePlayer.setPinnedStart(newLoopStart?.tick ?? null);
  context.scorePlayer.setLoopEnd(newLoopEnd?.tick ?? null);
}

// Back button
function handleBack() {
  context.scorePlayer.stop();
  context.close();
}

// Cleanup on unmount
useEffect(() => () => { context.scorePlayer.stop(); }, []);
```

### B3 — Unit tests

`PlayScorePlugin.test.tsx` (Vitest + React Testing Library):
- Score selection screen renders all 6 catalogue entries.
- Selecting a score calls `scorePlayer.loadScore({ kind: 'catalogue', ... })`.
- Back button is **absent** on the selection screen.
- Back button is **present** once `screen === 'player'`.
- Back button calls `context.close()`.
- Long-press first note → loopStart set → `setPinnedStart` called.
- Long-press second note → loop region created → `setLoopEnd` called.
- Long-press same note as pin → unpin → `setPinnedStart(null)` called.
- Long-press inside region → region cleared.
- Canvas tap → `play()` / `pause()` toggled.
- Short-tap note → `seekToTick()` called.
- Stop button → `stop()` called.
- Plugin unmount → `stop()` called (SC-005).

### B4 — Register as builtin

In `frontend/src/services/plugins/builtinPlugins.ts`:
```typescript
import playScorePlugin from '../../../plugins/play-score/index';
import playScoreManifestJson from '../../../plugins/play-score/plugin.json';

export const BUILTIN_PLUGINS: BuiltinPluginEntry[] = [
  // ...existing entries...
  {
    manifest: {
      ...(playScoreManifestJson as Omit<PluginManifest, 'origin'>),
      origin: 'builtin' as const,
    },
    plugin: playScorePlugin,
  },
];
```

### B5 — Playwright e2e tests

Update/create `frontend/e2e/play-score-plugin.spec.ts`:
- Launch Play Score from landing screen (data-testid="plugin-launch-play-score").
- Score selection screen visible, lists 6 scores.
- Select a score → player view appears, toolbar visible.
- Back button absent on selection screen.
- Back button closes plugin from player view.
- Play button → notes highlighted.
- Pause button → timer frozen.
- Stop button → timer resets.
- Long-press note → pin marker visible.
- Second long-press → loop region overlay visible.
- No audio after plugin exits (SC-005, mock audio assertion).

---

## Running locally

```bash
# Install frontend deps
cd frontend && npm install

# Build WASM (if not already built)
bash ../backend/scripts/build-wasm.sh

# Start dev server
npm run dev

# Run unit tests
npm run test

# Run e2e (dev server must be running)
npm run test:e2e
```

---

## File index

| File | Phase | Role |
|------|-------|------|
| `frontend/src/plugin-api/types.ts` | A1 | v3 type additions |
| `frontend/src/plugin-api/scorePlayerContext.ts` | A2 | Host-side scorePlayer implementation |
| `frontend/src/components/plugins/ScoreRendererPlugin.tsx` | A3 | Host ScoreRenderer component |
| `frontend/src/components/plugins/PluginView.tsx` | A4 | Inject v3 context |
| `frontend/src/plugin-api/scorePlayerContext.test.ts` | A5 | Contract tests |
| `frontend/plugins/play-score/plugin.json` | B1 | Plugin manifest |
| `frontend/plugins/play-score/index.tsx` | B1 | Plugin entry |
| `frontend/plugins/play-score/PlayScorePlugin.tsx` | B2 | Main plugin component |
| `frontend/plugins/play-score/PlayScorePlugin.css` | B2 | Plugin styles |
| `frontend/plugins/play-score/scoreSelectionScreen.tsx` | B2 | Score picker UI |
| `frontend/plugins/play-score/playbackToolbar.tsx` | B2 | Toolbar (Back, Play/Pause, Stop, Timer, Tempo) |
| `frontend/plugins/play-score/PlayScorePlugin.test.tsx` | B3 | Unit tests |
| `frontend/src/services/plugins/builtinPlugins.ts` | B4 | Register plugin |
| `frontend/e2e/play-score-plugin.spec.ts` | B5 | Playwright e2e |
