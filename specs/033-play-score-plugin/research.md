# Research: Play Score Plugin (033)

**Date**: 2026-02-27  
**Branch**: `033-play-score-plugin`  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## R-001 — Playback Engine API Surface

**Decision**: The plugin host will expose the `usePlayback` hook's interface through a new `context.scorePlayer` namespace.

**Findings** (from `frontend/src/services/playback/MusicTimeline.ts`):

```typescript
// usePlayback(notes: Note[], tempo: number) returns PlaybackState:
interface PlaybackState {
  status: 'stopped' | 'playing' | 'paused';
  currentTick: number;              // React state, ~10 Hz throttle
  totalDurationTicks: number;
  error: string | null;
  tickSourceRef: { current: ITickSource }; // live ref — 60 Hz, no re-render
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seekToTick(tick: number): void;
  setPinnedStart(tick: number | null): void;
  setLoopEnd(tick: number | null): void;
  unpinStartTick(): void;
  resetPlayback(): void;
}
```

**Key finding**: `tickSourceRef.current` is updated every rAF frame (60 Hz) **without** triggering React re-renders. The plugin ScoreRenderer must consume this ref inside its own rAF loop for smooth note highlighting.

**Rationale**: Map the full `PlaybackState` surface to `context.scorePlayer.*`. The `subscribe()` pattern (like `context.recording.subscribe`) is used so the plugin host can call all its React handlers internally and propagate a `ScorePlayerState` snapshot to the plugin.

**Alternatives considered**:
- Expose `tickSourceRef` directly: rejected — React ref is an internal implementation detail; crossing the plugin API boundary with it would violate hexagonal architecture (Principle II).
- Re-render-based polling: rejected — 10 Hz throttle would cause visible highlight lag.

---

## R-002 — Tempo State API

**Decision**: Tempo control is exposed through `context.scorePlayer.setTempoMultiplier(multiplier: number)`.

**Findings** (from `frontend/src/services/state/TempoStateContext.tsx`):

```typescript
interface TempoStateContextValue {
  tempoState: { tempoMultiplier: number; originalTempo: number };
  setTempoMultiplier(multiplier: number): void; // clamped [0.5, 2.0]
  adjustTempo(percentageChange: number): void;
  resetTempo(): void;
  getEffectiveTempo(): number;  // Math.round(originalTempo * multiplier)
  setOriginalTempo(bpm: number): void;
}
```

**Rationale**: Expose `setTempoMultiplier` (direct, precise) rather than `adjustTempo` (relative). The plugin toolbar drives its own BPM slider; relative deltas are harder to synchronize with slider position. The current BPM is surfaced via `ScorePlayerState.bpm`.

**Alternatives considered**: Separate `context.tempo.*` namespace (like `context.recording`): rejected — tempo is tightly coupled to score loading (needs `setOriginalTempo` on load); bundling it into `scorePlayer` keeps the API cohesive.

---

## R-003 — Note Highlight Subscription Strategy

**Decision**: The host drives `useNoteHighlight` and delivers a `Set<string>` of highlighted note IDs inside the `ScorePlayerState` snapshot pushed to plugin subscribers every ~100ms (React tick cycle).

**Findings** (from `frontend/src/services/highlight/useNoteHighlight.ts`):
```typescript
// Returns Set<string> of note IDs; stable reference when contents unchanged
function useNoteHighlight(notes: Note[], currentTick: number, status: PlaybackStatus): Set<string>
```

**Rationale**: The `highlightedNoteIds` set is included in `ScorePlayerState` alongside `currentTick`. The plugin passes it as a prop to `context.components.ScoreRenderer`. The ScoreRenderer (host-side) applies the highlighting in its SVG render. This keeps all spatial logic on the host side.

**Alternatives considered**: Plugin subscribes tick at 60 Hz and computes highlight itself: rejected — highlight computation requires `Note[]` array which is an internal domain type; sharing it would violate FR-016.

---

## R-004 — Score Loading Pipeline

**Decision**: `context.scorePlayer.loadScore(source)` accepts `{ catalogueId: string }` or `{ file: File }`. The host uses `MusicXMLImportService.importFile(file)` internally.

**Findings** (from `frontend/src/services/import/MusicXMLImportService.ts`):
```typescript
// MusicXMLImportService.importFile(file: File): Promise<ImportResult>
interface ImportResult {
  score: Score;            // in-memory domain model
  metadata: ImportMetadata; // { work_title?, composer? }
  statistics: { duration_ticks: number; ... };
}
```

**For preloaded scores**: Host fetches `score.path` → `Blob` → `File` using the `PRELOADED_SCORES` manifest (same as `LoadScoreDialog.loadPresetScore`). The plugin only passes the `catalogueId`; the host resolves the path internally, satisfying FR-013.

**For user files**: The plugin can call `context.scorePlayer.loadScore({ file })` with a `File` obtained from an `<input type="file">` element in the plugin UI. The host passes it directly to `MusicXMLImportService`.

**Rationale**: Keeping path resolution in the host respects FR-013 (no hardcoded paths in plugin) and FR-016 (no direct src/ imports).

**Alternatives considered**: Plugin receives `PRELOADED_SCORES` catalogue via a separate `context.catalogue` call: rejected — unnecessary indirection; plugin needs `catalogueId` (not the full path) and the host handles resolution.

---

## R-005 — Note Hit-Testing and Long-Press Architecture

**Decision**: `context.components.ScoreRenderer` wraps `LayoutView` and `pages/ScoreViewer` internally. It surfaces interaction callbacks that match the existing `pages/ScoreViewer` event model: `onNoteShortTap(tick, noteId)` and `onNoteLongPress(tick, noteId | null)`.

**Findings** (from `frontend/src/pages/ScoreViewer.tsx`):
```
Long-press: 500ms setTimeout on touchstart; cancelled if touchmove > 15px drift
Hit-test: DOM scan of .layout-glyph[data-note-id] → nearest by Euclidean distance
onPin(tick, noteId): fires on long-press with null=unpin fallback
onSeekAndPlay(tick): fires on short tap
```

**Rationale**: The long-press timer, drift detection, and DOM nearest-note lookup are all encapsulated inside `pages/ScoreViewer`. The `ScoreRenderer` host component inherits this behaviour. The plugin just receives resolved `(tick, noteId)` pairs — matching the FR-008 long-press contract — with no spatial code in the plugin itself. This satisfies Principle VI (Layout Engine Authority).

**Alternatives considered**: Plugin implements its own touch handlers: rejected — would require the plugin to duplicate long-press logic and do spatial DOM queries, violating Principle VI.

---

## R-006 — Plugin ScoreRenderer Component Contract

**Decision**: The host provides `context.components.ScoreRenderer` as a pre-wired React component. The plugin owns state (PinState, LoopRegion) and passes it as props; the component renders the score and calls interaction callbacks.

**`ScoreRenderer` Props (host-provided component)**:

```typescript
interface PluginScoreRendererProps {
  // Driven by plugin state (received from scorePlayer.subscribe)
  currentTick: number;
  highlightedNoteIds: Set<string>;
  loopRegion: { startTick: number; endTick: number } | null;
  pinnedNoteIds: Set<string>;
  // Interaction callbacks → plugin handles pin/loop state machine
  onNoteShortTap: (tick: number, noteId: string) => void;
  onNoteLongPress: (tick: number, noteId: string | null) => void;
  onCanvasTap: () => void;
}
```

**Rationale**: All geometry and rendering decisions stay on the host side (Principle VI). The plugin implements only the **state machine** (PinState, LoopRegion transitions per FR-008) and passes the results back as props.

---

## R-007 — Plugin API Version Bump

**Decision**: `PLUGIN_API_VERSION` bumps from `'2'` → `'3'`. New additions are strictly additive; all v2 plugins continue to work unchanged.

**Changes from v2 → v3**:
- `PluginContext.scorePlayer` — new namespace (see contract)
- `PluginContext.components.ScoreRenderer` — new component
- `PluginManifest.pluginApiVersion: '3'` for the new plugin
- All existing `v2` fields are untouched

**Backward compatibility**: v2 plugins (`practice-view`, `virtual-keyboard`) do not declare `scorePlayer` in their manifests and do not access it. The host injects a stub `scorePlayer` (all methods no-op) for v2 plugins so TypeScript typechecks compile; runtime access is guarded.

---

## R-008 — Preloaded Score Catalogue Exposure to Plugin

**Decision**: The plugin discovers available scores from `context.scorePlayer.getCatalogue()` which returns a `PluginPreloadedScore[]` matching the existing `PreloadedScore` interface (id, displayName, path omitted — host resolves paths).

**Findings** (from `frontend/src/data/preloadedScores.ts`):
```typescript
// PRELOADED_SCORES — 6 entries: Bach, Beethoven, Burgmüller x2, Chopin, Pachelbel
interface PreloadedScore { id: string; displayName: string; path: string; }
```

**Rationale**: Plugin only needs `id` and `displayName` to render the selection list. Path is intentionally not exposed in the v3 type to prevent hardcoding (FR-013). The host passes `PRELOADED_SCORES` entries to `getCatalogue()`.

---

## R-009 — File Input for User Score Loading

**Decision**: For user-provided files, the plugin renders its own `<input type="file" accept=".mxl,.xml,.musicxml">` element and passes the resulting `File` to `context.scorePlayer.loadScore({ file })`. No host-provided file picker component is needed.

**Rationale**: The File System Access API is not universally supported on all target tablets (iPad Safari limitations). An `<input type="file">` is universally available and does not require host infrastructure. The plugin is allowed to render its own UI elements (only direct `src/` imports are banned by FR-016).

---

## R-010 — Audio Teardown on Plugin Close

**Decision**: `context.scorePlayer` implements an internal `dispose()` that calls `stop()` and `resetPlayback()` when the plugin host unmounts the plugin component. This guarantees FR-014 and SC-005.

**Rationale**: The existing `context.stopPlayback()` cancels scheduled notes. The new `scorePlayer.stop()` additionally resets tick and status. The host calls both when routing away from the plugin.

**Test implication**: An automated test asserting `scorePlayer.stop()` is called on plugin unmount verifies SC-005.
