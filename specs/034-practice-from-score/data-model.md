# Data Model: Practice from Score (034)

**Branch**: `034-practice-from-score`  
**Date**: 2026-02-28

---

## New Types — Plugin API (v4 patch)

### `PluginScorePitches`

Returned by `context.scorePlayer.extractPracticeNotes()`. Carries everything the Practice plugin needs to build an exercise from a loaded score.

```typescript
interface PluginScorePitches {
  /**
   * Ordered MIDI pitches extracted from the source score.
   * Length: min(maxCount, totalAvailable).
   * Rules applied by host:
   *   - Source: parts[0].staves[0].voices[0]
   *   - Rests skipped
   *   - Chords: only max(midiPitch) retained
   *   - Durations discarded (all exercise notes treated as quarter notes)
   */
  readonly notes: ReadonlyArray<{ readonly midiPitch: number }>;
  /**
   * Total pitched notes available in the source voice (before maxCount cap).
   * Used by the plugin to cap the Notes slider maximum (FR-006).
   */
  readonly totalAvailable: number;
  /**
   * Clef of parts[0].staves[0] — 'Treble' or 'Bass'.
   * Non-treble/bass clefs (Alto, Tenor) are mapped to 'Treble' as a fallback.
   */
  readonly clef: 'Treble' | 'Bass';
  /** Score display title from metadata; null if not present in the file. */
  readonly title: string | null;
}
```

### `PluginScoreSelectorProps`

Props for the new `context.components.ScoreSelector` host-provided component.

```typescript
interface PluginScoreSelectorProps {
  /** Catalogue from context.scorePlayer.getCatalogue(). */
  catalogue: ReadonlyArray<PluginPreloadedScore>;
  /** When true, shows a loading indicator inside the dialog. */
  isLoading?: boolean;
  /** Error message to show inside the dialog (score parse failure). */
  error?: string | null;
  /** Called with the catalogue ID when user selects a preloaded score. */
  onSelectScore: (catalogueId: string) => void;
  /** Called with the File when user picks a file via file picker. */
  onLoadFile: (file: File) => void;
  /** Called when user explicitly cancels the dialog. */
  onCancel: () => void;
}
```

---

## Modified Types — Plugin-Internal (Practice Plugin)

### `ExerciseConfig` (updated)

```typescript
// practiceTypes.ts — BEFORE:
preset: 'random' | 'c4scale';

// AFTER:
preset: 'random' | 'c4scale' | 'score';
```

No other fields change. The `clef` and `octaveRange` fields retain their values when `preset === 'score'`; the sidebar renders them disabled with an explanatory label. The `noteCount` field is capped at `scorePitches.totalAvailable` in the slider's `max` attribute.

---

## Entity Relationships

```text
PluginContext (v4)
  ├── scorePlayer: PluginScorePlayerContext
  │     ├── getCatalogue()  → ReadonlyArray<PluginPreloadedScore>        (v3, unchanged)
  │     ├── loadScore()     → Promise<void>                             (v3, unchanged)
  │     ├── subscribe()     → () => void                                (v3, unchanged)
  │     └── extractPracticeNotes(maxCount) → PluginScorePitches | null  (v4, NEW)
  │
  └── components
        ├── StaffViewer      (v2, unchanged)
        ├── ScoreRenderer    (v3, unchanged)
        └── ScoreSelector    (v4, NEW) ← PluginScoreSelectorProps

PracticePlugin (frontend/plugins/practice-view/)
  ├── ExerciseConfig.preset: 'random' | 'c4scale' | 'score'            (MODIFIED)
  ├── scorePitches: PluginScorePitches | null                           (NEW state)
  ├── showScoreSelector: boolean                                        (NEW state)
  ├── generateScoreExercise(bpm, pitches, noteCount) → PracticeExercise (NEW function)
  └── ScoreSelector overlay (conditional render)                        (NEW UI)

Host (frontend/src/)
  ├── plugin-api/types.ts
  │     ├── PluginScorePitches                                          (NEW)
  │     ├── PluginScoreSelectorProps                                    (NEW)
  │     └── PluginScorePlayerContext.extractPracticeNotes               (NEW method)
  ├── plugin-api/scorePlayerContext.ts
  │     └── extractPracticeNotes() implementation in useScorePlayerBridge (NEW)
  └── components/plugins/
        └── ScoreSelectorPlugin.tsx                                     (NEW)
```

---

## Score Preset State Machine

```
                           ┌─────────────────────────────────────────┐
                           │          Score Preset Flow               │
                           └─────────────────────────────────────────┘

  [User selects "Score" preset]
          │
          ▼
  scorePitches === null?
       YES ──► setShowScoreSelector(true) ──► ScoreSelector overlay visible
       NO  ──► regenerate exercise from scorePitches ──► ready (no dialog)

  ─── ScoreSelector overlay visible ──────────────────────────────────────────

  [User taps preloaded score or loads file]
          │
          ▼
  context.scorePlayer.loadScore(source)
          │
          ▼                               [User taps Cancel]
  ScorePlayerState.status = 'loading'   ─────────────────► scorePitches === null?
          │                                                       YES ──► preset → 'random'
          ▼                                                       NO  ──► close overlay
  ScorePlayerState.status = 'ready'
          │
          ▼
  context.scorePlayer.extractPracticeNotes(config.noteCount)
          │
          ▼
  setScorePitches(result); setShowScoreSelector(false)
          │
          ▼
  generateScoreExercise(bpm, result.notes, config.noteCount)
          │
          ▼
  Exercise ready → phase: 'ready' (normal practice flow resumes)

  ─── During active exercise (phase: 'countdown' | 'playing') ─────────────────

  "Change score" button: DISABLED
  ScoreSelector cannot be opened

  ─── After exercise ends (phase: 'results' | 'ready') ───────────────────────

  "Change score" button: ENABLED
  Clicking: setShowScoreSelector(true) → flow repeats from ScoreSelector overlay
```

---

## Plugin File Map

```text
frontend/plugins/practice-view/
├── practiceTypes.ts         ← add 'score' to ExerciseConfig.preset
├── exerciseGenerator.ts     ← add generateScoreExercise(); update generateExercise() branch
├── PracticePlugin.tsx       ← Score preset radio, ScoreSelector overlay, Change score button,
│                               disabled clef/octave label, slot max cap, subscription to
│                               scorePlayer status for loading feedback
├── PracticePlugin.test.tsx  ← Score preset unit/integration tests
└── PracticePlugin.css       ← disabled label style

frontend/src/
├── plugin-api/
│   ├── types.ts             ← PluginScorePitches, PluginScoreSelectorProps,
│   │                           extractPracticeNotes() on PluginScorePlayerContext
│   └── scorePlayerContext.ts← extractPracticeNotes() in useScorePlayerBridge + createNoOpScorePlayer
│
└── components/plugins/
    ├── ScoreSelectorPlugin.tsx ← new host component implementing PluginScoreSelectorProps
    └── PluginView.tsx          ← inject ScoreSelector into context.components
```
