# Research: Practice from Score (034)

**Date**: 2026-02-28  
**Branch**: `034-practice-from-score`  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## R-001 — Plugin API v3 Score Player — Current Surface

**Decision**: The Plugin API v3 (`context.scorePlayer`) is already fully implemented (Feature 033). This feature patches it to v4 by adding one method (`extractPracticeNotes`) and one host component (`ScoreSelector`).

**Findings** (from `frontend/src/plugin-api/types.ts` + `scorePlayerContext.ts`):

```typescript
// Already available in v3 — Practice plugin can use these TODAY:
context.scorePlayer.getCatalogue(): ReadonlyArray<PluginPreloadedScore>
context.scorePlayer.loadScore(source: ScoreLoadSource): Promise<void>
context.scorePlayer.subscribe(handler): () => void  // delivers ScorePlayerState
// ScorePlayerState.status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'
```

**Rationale**: The Practice plugin piggybacks on the v3 infrastructure already injected as a no-op stub. After Feature 033, the stub becomes real. The only new capabilities needed are `extractPracticeNotes()` and a shared `ScoreSelector` UI component.

**Alternatives considered**:
- Separate `context.scorePitches` namespace: rejected — unnecessary; note extraction is part of the score player's responsibilities.
- One combined `selectScoreNotes(count)` that opens dialog + loads + returns pitches in one call: rejected — the practice plugin has its own state machine (loading state shown inside the practice sidebar, not a blocking dialog); splitting `loadScore` + `extractPracticeNotes` gives the plugin control over showing loading feedback.

---

## R-002 — Host Note Extraction from Loaded Score

**Decision**: `extractNotes(score: Score): Note[]` already exists in `scorePlayerContext.ts` (used by `useScorePlayerBridge` for playback). A new host-private helper `extractPracticeNotes(score, maxCount)` will be added alongside it, applying the rules from the spec clarifications.

**Findings** (from `frontend/src/plugin-api/scorePlayerContext.ts`):

```typescript
// Existing private helper — extracts voice-0 notes from all parts for playback:
function extractNotes(score: Score): Note[] {
  // iterates score parts → staves → voices[0] → note events
}
```

**Extraction rules for this feature** (from spec clarifications):
1. Source: `score.parts[0].staves[0].voices[0]` (first part, topmost staff, first voice)
2. Skip rests (events with no pitch / `midiNote === null`)
3. Chords: take `max(midiNote)` across simultaneous events at the same tick
4. Clef: read from `score.parts[0].staves[0].clef` → map to `'Treble' | 'Bass'`
5. Total available: count of all pitched events before the `maxCount` cap
6. Cap to `maxCount`; return as `{ midiPitch: number }[]`

**Internal `Note` type** (from `frontend/src/types/music.ts`):
```typescript
interface Note {
  id: string;
  midiNote: number | null;  // null = rest
  startTick: number;
  durationTicks: number;
  // ... layout fields
}
```

**Rationale**: Keeping extraction in the host (not the plugin) satisfies Principle II and the spec clarification Q2 answer. The plugin never sees the `Score` or `Note` domain types.

---

## R-003 — Clef Derivation for Exercise Staff Display

**Decision**: After extraction, the host reads the clef from `score.parts[0].staves[0].clef` and normalises it to `'Treble' | 'Bass'`. Any other clef string (Alto, Tenor) is mapped to `'Treble'` as a fallback.

**Findings** (from `backend/assets/bravura_metadata.json` + MusicXML import):
- MusicXML clef values that map to Treble: `G`, `treble`
- MusicXML clef values that map to Bass: `F`, `bass`
- Other (Alto `C3`, Tenor `C4`): rare in practice repertoire; map to `'Treble'`

**Rationale**: The Practice plugin's `StaffViewer` only supports `'Treble' | 'Bass'` clefs (existing constraint from Feature 031). The fallback ensures no runtime crash on unusual scores.

---

## R-004 — Score Selector UI Component

**Decision**: A new host-provided `ScoreSelector` component is added to `context.components`. It renders the same preloaded catalogue list + "Load from file" option as the Play Score plugin's `ScoreSelectionScreen`.

**Findings** (from `frontend/plugins/play-score/scoreSelectionScreen.tsx`):
```tsx
// Current file: ~80 lines. Props:
interface ScoreSelectionScreenProps {
  catalogue: readonly PluginPreloadedScore[];
  onSelectScore: (catalogueId: string) => void;
  onLoadFile: (file: File) => void;
}
```

The existing component lacks `onCancel`. The new `context.components.ScoreSelector` adds `onCancel` and `isLoading` to support the Practice plugin's two-phase flow (dialog open → loading → notes ready).

**New Props**:
```typescript
interface PluginScoreSelectorProps {
  catalogue: ReadonlyArray<PluginPreloadedScore>;
  isLoading?: boolean;         // shows spinner while loadScore() is in flight
  error?: string | null;       // score parse error from ScorePlayerState
  onSelectScore: (catalogueId: string) => void;
  onLoadFile: (file: File) => void;
  onCancel: () => void;
}
```

**Implementation**: A new `ScoreSelectorPlugin.tsx` in `frontend/src/components/plugins/` wraps the existing `LoadScoreDialog` or reframes `scoreSelectionScreen.tsx` as a host export injected via `PluginView.tsx`.

**Rationale**: Hosts the dialog on the host side, satisfying the spec FR-003 and the constitution Principle II. Both the Play Score and Practice plugins use identical catalogue + file loading UX.

---

## R-005 — Practice Plugin Exercise Generation for Score Preset

**Decision**: A new exported function `generateScoreExercise(bpm, pitches, noteCount)` is added to `exerciseGenerator.ts`. It builds a `PracticeExercise` from an array of `{ midiPitch: number }` using the same `expectedOnsetMs` formula as `generateExercise`.

**New function signature**:
```typescript
export function generateScoreExercise(
  bpm: number,
  pitches: ReadonlyArray<{ midiPitch: number }>,
  noteCount: number,
): PracticeExercise
```

The `pitches` array is already pre-filtered (rests removed, chords reduced) by the host. The function takes `min(noteCount, pitches.length)` notes from the front of the array and creates `ExerciseNote[]` with `id: 'ex-{i}'` IDs.

**`generateExercise` update**: When `config.preset === 'score'`, delegates to `generateScoreExercise(bpm, scorePitches.notes, config.noteCount)`. The `scorePitches` are passed through a new optional parameter.

**Rationale**: Keeps the plugin-internal exercise factory consistent; `generateScoreExercise` is pure and unit-testable without any `src/` imports.

---

## R-006 — Practice Plugin State Machine for Score Preset

**Decision**: The Practice plugin adds a `scorePitches: PluginScorePitches | null` state variable. The `ScoreSelector` overlay is shown when `config.preset === 'score' && scorePitches === null`. A `changeScoreRequested` boolean state triggers re-opening the dialog.

**State additions in `PracticePlugin.tsx`**:
```typescript
// New state (in addition to existing config, phase, exercise, etc.):
const [scorePitches, setScorePitches] = useState<PluginScorePitches | null>(null);
const [showScoreSelector, setShowScoreSelector] = useState(false);
// scorePlayerState already subscribed to via context.scorePlayer.subscribe()
```

**Flow when user selects Score preset**:
1. `updateConfig({ preset: 'score' })` is called
2. If `scorePitches === null`: `setShowScoreSelector(true)` — overlay opens
3. User selects score: `context.scorePlayer.loadScore(source)` is called
4. ScorePlayerState subscription fires with `status: 'loading'` → show spinner in overlay
5. `status: 'ready'` → call `context.scorePlayer.extractPracticeNotes(config.noteCount)` → `setScorePitches(result)`; `setShowScoreSelector(false)`
6. Exercise regenerates using `generateScoreExercise`

**Flow when user cancels dialog**:
- If `scorePitches === null`: `updateConfig({ preset: 'random' })` (FR-011)
- If `scorePitches !== null`: `setShowScoreSelector(false)` — keep existing score

**"Change score" button**:
- Shown in sidebar when `config.preset === 'score' && scorePitches !== null`
- Disabled when `phase === 'countdown' || phase === 'playing'` (FR-009)
- On click: `setShowScoreSelector(true)` — re-opens overlay; existing `scorePitches` kept until user completes new selection

**Notes slider max when Score preset active**:
- `max={config.preset === 'score' && scorePitches ? scorePitches.totalAvailable : 20}` (FR-006)

**Rationale**: Minimal new state — leverages the existing `scorePlayer.subscribe()` subscription from v3 (already available to the Practice plugin as a no-op stub, now real after Feature 033). No new React refs needed.
