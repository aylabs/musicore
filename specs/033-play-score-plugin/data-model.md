# Data Model: Play Score Plugin (033)

**Date**: 2026-02-27  
**Branch**: `033-play-score-plugin`  
**Source**: spec.md (Key Entities) + research.md R-001 through R-010

---

## Entities

### 1. `PluginPreloadedScore`

A catalogue entry describing a score bundled with the app. Exposed to the plugin via `context.scorePlayer.getCatalogue()`.

```typescript
interface PluginPreloadedScore {
  /** Stable string identifier — e.g. "bach-invention-1" */
  readonly id: string;
  /** User-visible title — e.g. "Bach — Invention No. 1" */
  readonly displayName: string;
  // Note: `path` is intentionally absent — the host resolves it internally.
  // FR-013: no score paths may be hardcoded in plugin source code.
}
```

**Validation rules**:
- `id` must be non-empty string, stable across app upgrades.
- `displayName` must be non-empty, UTF-8 safe.

**Source**: derived from `PreloadedScore` in `frontend/src/data/preloadedScores.ts` (6 entries).

---

### 2. `ScoreLoadSource`

Discriminated union describing where to load a score from. Input to `context.scorePlayer.loadScore()`.

```typescript
type ScoreLoadSource =
  | { kind: 'catalogue'; catalogueId: string }
  | { kind: 'file';      file: File }; // File from <input type="file"> element
```

**Validation rules**:
- `kind: 'catalogue'` — `catalogueId` must match an entry returned by `getCatalogue()`.
- `kind: 'file'` — file extension must be `.mxl`, `.xml`, or `.musicxml`; size ≤ 10 MB (enforced by host MusicXMLImportService).

---

### 3. `PlaybackStatus`

Discriminated string literal type for playback lifecycle.

```typescript
type PluginPlaybackStatus =
  | 'idle'      // no score loaded
  | 'loading'   // loadScore() in progress (WASM parse)
  | 'ready'     // score loaded, playback stopped at tick 0
  | 'playing'   // audio is running
  | 'paused'    // audio frozen at currentTick
  | 'error';    // load or playback failure
```

**State transitions**:

```
idle ──[loadScore()]──► loading ──[success]──► ready ──[play()]──► playing
                                  └──[fail]──► error         ├──[pause()]──► paused ──[play()]──┘
                                                              └──[stop()]──► ready
ready ──[loadScore()]──► loading    (reload)
paused ──[stop()]──► ready
playing ──[stop()]──► ready
```

---

### 4. `PinState`

A single user-set playback anchor coupled to its note and tick.

```typescript
interface PinState {
  /** UUID matching a `Note.id` in the loaded score domain model */
  readonly noteId: string;
  /** Absolute 960-PPQ tick position — integer, always ≥ 0 */
  readonly tick: number;
}
```

**Invariants**: `tick` is always a non-negative integer (960 PPQ). Two `PinState` values with the same `tick` are considered equal. Sourced from `onNoteLongPress(tick, noteId)` callback.

---

### 5. `LoopRegion`

Two-pin loop region governing playback wrap-around (FR-009).

```typescript
interface LoopRegion {
  /** Start tick — always ≤ endTick (sorted from two PinState values) */
  readonly startTick: number;
  /** End tick — always ≥ startTick */
  readonly endTick: number;
}
```

**Derivation rule**: `startTick = Math.min(pin1.tick, pin2.tick)`, `endTick = Math.max(pin1.tick, pin2.tick)`. If `startTick === endTick` the region is degenerate — treated as unpin (see FR-008).

**Lifecycle**: created when second `PinState` is set; cleared by long-pressing inside the region.

---

### 6. `ScorePlayerState`

Snapshot of the complete playback state pushed to plugin subscribers by `scorePlayer.subscribe()`. This is the primary data flow from host → plugin.

```typescript
interface ScorePlayerState {
  /** Current lifecycle status */
  readonly status: PluginPlaybackStatus;
  /**
   * Current playback position in 960-PPQ ticks.
   * Updated ~10 Hz during playback (React re-render cycle).
   */
  readonly currentTick: number;
  /** Total duration of the loaded score in ticks; 0 when status is 'idle'/'loading'. */
  readonly totalDurationTicks: number;
  /**
   * Set of note IDs to visually highlight.
   * Computed by host's useNoteHighlight; stable reference when unchanged.
   */
  readonly highlightedNoteIds: Set<string>;
  /** Effective BPM = originalBpm × tempoMultiplier; 0 when no score loaded. */
  readonly bpm: number;
  /** Display title derived from score metadata; null until score is loaded. */
  readonly title: string | null;
  /** Non-null when status === 'error'. */
  readonly error: string | null;
}
```

**Update frequency**: snapshot is pushed whenever any field changes (driven by React state). For per-frame tick tracking the plugin must use `tickSourceRef` via `context.scorePlayer.getCurrentTickLive()`.

---

### 7. `PluginScoreRendererProps`

Props contract for `context.components.ScoreRenderer` — the host-provided React component the plugin embeds.

```typescript
interface PluginScoreRendererProps {
  // ─── Read props (from ScorePlayerState or plugin state) ───
  currentTick: number;
  highlightedNoteIds: Set<string>;
  loopRegion: LoopRegion | null;
  pinnedNoteIds: Set<string>;
  // ─── Interaction callbacks (implemented by plugin) ───
  /** Short-tap on a note: plugin seeks playback to tick */
  onNoteShortTap: (tick: number, noteId: string) => void;
  /** Long-press on a note or region: plugin handles pin/loop state machine */
  onNoteLongPress: (tick: number, noteId: string | null) => void;
  /** Tap on canvas background (not a note): plugin toggles play/pause */
  onCanvasTap: () => void;
}
```

**Host responsibilities**: geometry computation, long-press detection (≥500ms), hit-testing, SVG rendering — all handled internally. The plugin receives only resolved semantic events.

---

## Pin / Loop State Machine

The plugin owns this state machine (implemented in the plugin component, not the host):

```
State: { loopStart: PinState | null, loopEnd: PinState | null }

onNoteLongPress(tick, noteId):
  case (null, null)                     → loopStart = { tick, noteId }  [single pin]
  case ({ same tick }, null)            → loopStart = null               [unpin]
  case ({ different tick }, null)       → loopEnd = derive(loopStart, {tick,noteId})
                                         [create loop region]
  case (_, _) where tick in region      → loopStart = null, loopEnd = null [clear]
  case (_, _) where tick not in region  → loopStart = { tick, noteId }, loopEnd = null [replace]
```

**Derived loopRegion** (passed to ScoreRenderer and scorePlayer):
```typescript
function toLoopRegion(start: PinState, end: PinState): LoopRegion | null {
  if (start.tick === end.tick) return null; // degenerate → unpin
  return {
    startTick: Math.min(start.tick, end.tick),
    endTick:   Math.max(start.tick, end.tick),
  };
}
```

---

## Plugin View State Machine

The plugin UI has two top-level screens:

```
Screens: 'selection' | 'player'

Initial state: 'selection'

Transitions:
  'selection' + loadScore(source) success → 'player'
  'player'    + Back button tapped        → implicit context.close() (no return to 'selection')
```

**Back button visibility**: hidden when screen === 'selection'; shown when screen === 'player' (FR-002, Q4 answer).

---

## Relationships

```
PluginPreloadedScore ─── identified by ──► ScoreLoadSource.catalogueId
ScoreLoadSource      ─── triggers ──────► ScorePlayerState (via loadScore())
ScorePlayerState     ─── drives ────────► PluginScoreRendererProps (currentTick, highlightedNoteIds)
PinState × 2         ─── derives ────────► LoopRegion
LoopRegion           ─── passed to ──────► PluginScoreRendererProps.loopRegion
LoopRegion           ─── passed to ──────► scorePlayer.setLoopRegion() (host enforces wrap-around)
```
