# Quickstart: Practice from Score (034)

**Branch**: `034-practice-from-score`  
**Date**: 2026-02-28

---

## System Requirements

- Node.js ≥ 18, npm ≥ 9
- Rust stable + `wasm-pack` (already installed if WASM builds work on main)
- `frontend/` built WASM module present at `backend/pkg/` (run `bash backend/scripts/build-wasm.sh` if missing)
- Feature 033 (Play Score Plugin) merged — Plugin API v3 and `context.scorePlayer` must be live

---

## Feature Overview

Feature 034 patches the Plugin API from v3 to v4 by adding one new method and one new host component, then modifies the Practice plugin to use them.

**Phase A — Plugin API v4** (foundational):  
Add `PluginScorePitches`, `extractPracticeNotes()`, `PluginScoreSelectorProps`, and `context.components.ScoreSelector` to the host. No visible user change yet.

**Phase B — Practice Plugin: Score Preset** (feature):  
Update `practiceTypes.ts`, `exerciseGenerator.ts`, and `PracticePlugin.tsx` to add the Score preset with its loading flow, disabled controls, and "Change score" button.

---

## Phase A: Plugin API v4

### A1 — Extend `types.ts`

Add the new types from `specs/034-practice-from-score/contracts/plugin-api-v4.ts`:

```typescript
// In: frontend/src/plugin-api/types.ts

// ── New types ─────────────────────────────────────────────────────────────
export interface PluginScorePitches {
  readonly notes: ReadonlyArray<{ readonly midiPitch: number }>;
  readonly totalAvailable: number;
  readonly clef: 'Treble' | 'Bass';
  readonly title: string | null;
}

export interface PluginScoreSelectorProps {
  catalogue: ReadonlyArray<PluginPreloadedScore>;
  isLoading?: boolean;
  error?: string | null;
  onSelectScore: (catalogueId: string) => void;
  onLoadFile: (file: File) => void;
  onCancel: () => void;
}

// ── Bump version ──────────────────────────────────────────────────────────
export const PLUGIN_API_VERSION = '4' as const;

// ── Extend PluginScorePlayerContext with extractPracticeNotes ─────────────
export interface PluginScorePlayerContext {
  // ... all existing v3 methods ...
  extractPracticeNotes(maxCount: number): PluginScorePitches | null;  // NEW
}

// ── Extend PluginContext.components with ScoreSelector ────────────────────
readonly components: {
  readonly StaffViewer: ComponentType<PluginStaffViewerProps>;
  readonly ScoreRenderer: ComponentType<PluginScoreRendererProps>;  // v3
  readonly ScoreSelector: ComponentType<PluginScoreSelectorProps>;  // NEW v4
};
```

**Test (write first)**: In `frontend/src/plugin-api/scorePlayerContext.test.ts`, add:
```typescript
describe('extractPracticeNotes()', () => {
  it('returns null when status is idle (no score loaded)', () => {
    const { result } = renderHook(() => useScorePlayerContext(), { wrapper });
    expect(result.current.extractPracticeNotes(8)).toBeNull();
  });

  it('returns pitches after score is loaded', async () => {
    const { result } = renderHook(() => useScorePlayerContext(), { wrapper });
    await act(async () => {
      await result.current.loadScore({ kind: 'catalogue', catalogueId: 'bach-invention-1' });
    });
    const pitches = result.current.extractPracticeNotes(8);
    expect(pitches).not.toBeNull();
    expect(pitches!.notes).toHaveLength(8);
    expect(pitches!.notes.every(n => typeof n.midiPitch === 'number')).toBe(true);
  });

  it('caps notes to maxCount', async () => {
    const { result } = renderHook(() => useScorePlayerContext(), { wrapper });
    await act(async () => {
      await result.current.loadScore({ kind: 'catalogue', catalogueId: 'bach-invention-1' });
    });
    const pitches = result.current.extractPracticeNotes(3);
    expect(pitches!.notes).toHaveLength(3);
    expect(pitches!.totalAvailable).toBeGreaterThanOrEqual(3);
  });

  it('totalAvailable reflects pre-cap count', async () => {
    const { result } = renderHook(() => useScorePlayerContext(), { wrapper });
    await act(async () => {
      await result.current.loadScore({ kind: 'catalogue', catalogueId: 'bach-invention-1' });
    });
    const small = result.current.extractPracticeNotes(2);
    const large = result.current.extractPracticeNotes(100);
    expect(small!.totalAvailable).toBe(large!.totalAvailable);
  });

  it('returns clef Treble or Bass', async () => {
    const { result } = renderHook(() => useScorePlayerContext(), { wrapper });
    await act(async () => {
      await result.current.loadScore({ kind: 'catalogue', catalogueId: 'bach-invention-1' });
    });
    const pitches = result.current.extractPracticeNotes(8);
    expect(['Treble', 'Bass']).toContain(pitches!.clef);
  });
});
```

### A2 — Implement `extractPracticeNotes` in `scorePlayerContext.ts`

In `useScorePlayerBridge` in `frontend/src/plugin-api/scorePlayerContext.ts`:

```typescript
// Add alongside extractNotes() helper:

/**
 * Extract pitched notes from the first voice of the first part's topmost staff.
 * - Rests (midiNote === null) are skipped.
 * - Simultaneous notes at the same startTick: keep only max(midiNote).
 * - Clef is read from score.parts[0].staves[0].clef.
 * - Results are capped to maxCount; totalAvailable reflects pre-cap count.
 */
function extractPracticeNotesFromScore(
  score: Score,
  maxCount: number,
): PluginScorePitches {
  const staff = score.parts[0]?.staves[0];
  const voice = staff?.voices[0] ?? [];

  // Group by startTick; keep max midiNote per tick (chord reduction)
  const tickMap = new Map<number, number>();
  for (const note of voice) {
    if (note.midiNote === null) continue; // skip rests
    const existing = tickMap.get(note.startTick);
    if (existing === undefined || note.midiNote > existing) {
      tickMap.set(note.startTick, note.midiNote);
    }
  }

  // Sort by tick → ordered pitch sequence
  const allPitches = [...tickMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, midiPitch]) => ({ midiPitch }));

  const totalAvailable = allPitches.length;
  const notes = allPitches.slice(0, maxCount);

  // Clef derivation
  const rawClef = staff?.clef ?? '';
  const clef: 'Treble' | 'Bass' =
    rawClef === 'F' || rawClef.toLowerCase().startsWith('bass') ? 'Bass' : 'Treble';

  return { notes, totalAvailable, clef, title: score.metadata?.work_title ?? null };
}

// Inside useScorePlayerBridge, add to the api useMemo:
const extractPracticeNotes = useCallback(
  (maxCount: number): PluginScorePitches | null => {
    if (!loadedScoreRef.current || pluginStatus !== 'ready') return null;
    return extractPracticeNotesFromScore(loadedScoreRef.current, maxCount);
  },
  [pluginStatus],
);
```

Update `createNoOpScorePlayer()` to add the no-op:
```typescript
extractPracticeNotes: (_maxCount: number) => null,
```

Update `createScorePlayerProxy()` to forward the call:
```typescript
extractPracticeNotes: (...args) => proxyRef.current.extractPracticeNotes(...args),
```

### A3 — Implement `ScoreSelectorPlugin.tsx`

Create `frontend/src/components/plugins/ScoreSelectorPlugin.tsx`:

```tsx
/**
 * ScoreSelectorPlugin.tsx — Host-provided ScoreSelector component (v4)
 * Feature 034: Practice from Score
 *
 * Renders a score selection overlay with:
 *  - Preloaded catalogue list (tappable entries)
 *  - "Load from file" button with <input type="file"> accepting .mxl .musicxml .xml
 *  - Loading spinner when isLoading === true
 *  - Error message when error is non-null
 *  - Cancel button (calls onCancel)
 */
import { useRef } from 'react';
import type { PluginScoreSelectorProps } from '../plugin-api/types';
import './ScoreSelectorPlugin.css';

export function ScoreSelectorPlugin({
  catalogue,
  isLoading,
  error,
  onSelectScore,
  onLoadFile,
  onCancel,
}: PluginScoreSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="score-selector-overlay" role="dialog" aria-modal="true">
      <div className="score-selector-panel">
        <div className="score-selector-header">
          <h2 className="score-selector-title">Select a Score</h2>
          <button className="score-selector-cancel" onClick={onCancel} aria-label="Cancel">✕</button>
        </div>

        {error && (
          <p className="score-selector-error" role="alert">{error}</p>
        )}

        {isLoading ? (
          <div className="score-selector-loading" aria-live="polite">Loading…</div>
        ) : (
          <ul className="score-selector-list" role="listbox">
            {catalogue.map(entry => (
              <li
                key={entry.id}
                role="option"
                className="score-selector-item"
                onClick={() => onSelectScore(entry.id)}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onSelectScore(entry.id)}
              >
                {entry.displayName}
              </li>
            ))}
          </ul>
        )}

        <button
          className="score-selector-load-file"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
        >
          Load from file…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mxl,.musicxml,.xml"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onLoadFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
```

Create `frontend/src/components/plugins/ScoreSelectorPlugin.css`:
```css
.score-selector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.score-selector-panel {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.score-selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.score-selector-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.score-selector-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
}
.score-selector-item:hover, .score-selector-item:focus { background: var(--color-surface-raised); }
.score-selector-error { color: var(--color-error); }
.score-selector-loading { text-align: center; padding: 24px; }
.score-selector-load-file {
  margin-top: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  min-height: 44px;
  cursor: pointer;
}
```

### A4 — Inject `ScoreSelector` in `PluginView.tsx`

In `frontend/src/components/plugins/PluginView.tsx`, add `ScoreSelectorPlugin` alongside `StaffViewer` and `ScoreRendererPlugin`:

```tsx
// Existing:
import { ScoreRendererPlugin } from './ScoreRendererPlugin';
// Add:
import { ScoreSelectorPlugin } from './ScoreSelectorPlugin';

// In the context.components object passed to the plugin:
components: {
  StaffViewer: PluginStaffViewer,
  ScoreRenderer: ScoreRendererPlugin,
  ScoreSelector: ScoreSelectorPlugin,   // NEW
},
```

---

## Phase B: Practice Plugin — Score Preset

### B1 — Update `practiceTypes.ts`

```typescript
// In: frontend/plugins/practice-view/practiceTypes.ts

// BEFORE:
preset: 'random' | 'c4scale';

// AFTER:
preset: 'random' | 'c4scale' | 'score';
```

**Test (write first)** in `exerciseGenerator.test.ts`:
```typescript
describe('generateScoreExercise()', () => {
  it('creates an exercise with the given pitches as quarter notes', () => {
    const pitches = [{ midiPitch: 60 }, { midiPitch: 62 }, { midiPitch: 64 }];
    const ex = generateScoreExercise(80, pitches, 3);
    expect(ex.notes).toHaveLength(3);
    expect(ex.notes[0].midiPitch).toBe(60);
    expect(ex.notes[1].midiPitch).toBe(62);
  });

  it('caps to noteCount even if pitches[] is longer', () => {
    const pitches = Array.from({ length: 10 }, (_, i) => ({ midiPitch: 60 + i }));
    const ex = generateScoreExercise(80, pitches, 4);
    expect(ex.notes).toHaveLength(4);
  });

  it('uses all pitches if noteCount > pitches.length', () => {
    const pitches = [{ midiPitch: 60 }, { midiPitch: 62 }];
    const ex = generateScoreExercise(80, pitches, 10);
    expect(ex.notes).toHaveLength(2);
  });

  it('computes expectedOnsetMs as slotIndex × (60000/bpm)', () => {
    const pitches = [{ midiPitch: 60 }, { midiPitch: 62 }];
    const ex = generateScoreExercise(60, pitches, 2);
    expect(ex.notes[0].expectedOnsetMs).toBe(0);
    expect(ex.notes[1].expectedOnsetMs).toBe(1000);
  });
});
```

### B2 — Add `generateScoreExercise` to `exerciseGenerator.ts`

```typescript
// In: frontend/plugins/practice-view/exerciseGenerator.ts

/**
 * Build a practice exercise from a pre-extracted pitch list.
 * All notes are treated as quarter notes (durations discarded by host before this call).
 *
 * @param bpm       Tempo for onset time computation
 * @param pitches   Ordered MIDI pitches from PluginScorePitches.notes
 * @param noteCount Number of pitches to use (capped to pitches.length)
 */
export function generateScoreExercise(
  bpm: number,
  pitches: ReadonlyArray<{ midiPitch: number }>,
  noteCount: number,
): PracticeExercise {
  const msPerBeat = 60_000 / bpm;
  const num = Math.min(noteCount, pitches.length);
  const notes: ExerciseNote[] = pitches.slice(0, num).map((p, i) => ({
    id: `ex-${i}`,
    slotIndex: i,
    midiPitch: p.midiPitch,
    expectedOnsetMs: i * msPerBeat,
  }));
  return { notes, bpm };
}
```

Update `generateExercise()` to handle `preset === 'score'`. The function signature gains an optional `scorePitches` parameter:
```typescript
export function generateExercise(
  bpm: number = DEFAULT_BPM,
  config: ExerciseConfig = DEFAULT_EXERCISE_CONFIG,
  seed?: number,
  scorePitches?: ReadonlyArray<{ midiPitch: number }>,
): PracticeExercise {
  if (config.preset === 'c4scale') return generateC4ScaleExercise(bpm, config.noteCount, config.clef);
  if (config.preset === 'score' && scorePitches) return generateScoreExercise(bpm, scorePitches, config.noteCount);
  // 'random' path unchanged
  ...
}
```

### B3 — Update `PracticePlugin.tsx`

**New state variables**:
```tsx
// Score preset state
const [scorePitches, setScorePitches] = useState<PluginScorePitches | null>(null);
const [showScoreSelector, setShowScoreSelector] = useState(false);
const [scorePlayerState, setScorePlayerState] = useState<ScorePlayerState | null>(null);

// Subscribe to scorePlayer on mount
useEffect(() => {
  return context.scorePlayer.subscribe(setScorePlayerState);
}, [context]);
```

**Types import addition**:
```tsx
import type { PluginScorePitches, ScorePlayerState } from '../../src/plugin-api/index';
```

**Score player status → extract notes when ready**:
```tsx
useEffect(() => {
  if (
    scorePlayerState?.status === 'ready' &&
    showScoreSelector &&
    config.preset === 'score'
  ) {
    const pitches = context.scorePlayer.extractPracticeNotes(config.noteCount);
    if (pitches) {
      setScorePitches(pitches);
      setShowScoreSelector(false);
      // regenerate exercise
      if (phaseRef.current === 'ready') {
        setExercise(generateScoreExercise(bpmRef.current, pitches.notes, config.noteCount));
      }
    }
  }
}, [scorePlayerState?.status]);
```

**Note count change handler** — when preset === 'score', re-extract from loaded score:
```tsx
// In handleNoteCountChange (or the updateConfig handler):
if (next.preset === 'score' && scorePitches) {
  const freshPitches = context.scorePlayer.extractPracticeNotes(next.noteCount);
  if (freshPitches) setScorePitches(freshPitches);
  if (phaseRef.current === 'ready') {
    setExercise(generateScoreExercise(bpmRef.current, freshPitches?.notes ?? scorePitches.notes, next.noteCount));
  }
}
```

**Preset change → open selector if no score cached**:
```tsx
// In updateConfig:
if (patch.preset === 'score' && !scorePitches) {
  setShowScoreSelector(true);
}
```

**Cancel handler**:
```tsx
const handleSelectorCancel = useCallback(() => {
  setShowScoreSelector(false);
  if (!scorePitches) {
    updateConfig({ preset: 'random' });
  }
}, [scorePitches]);
```

**Sidebar — three preset radios** (replace current array):
```tsx
{([
  ['random',  'Random'],
  ['c4scale', 'C4 Scale'],
  ['score',   'Score'],
] as [ExerciseConfig['preset'], string][]).map(([v, label]) => (
  <label key={v} className={...}>
    <input type="radio" name="practice-preset" value={v}
      checked={config.preset === v}
      disabled={isDisabled}
      onChange={() => updateConfig({ preset: v })}
    />
    {label}
  </label>
))}
```

**"Change score" button** (add below preset radios):
```tsx
{config.preset === 'score' && scorePitches && (
  <button
    className="practice-sidebar__change-score"
    disabled={isDisabled}
    onClick={() => setShowScoreSelector(true)}
  >
    Change score{scorePitches.title ? `: ${scorePitches.title}` : ''}
  </button>
)}
```

**Clef / octave controls — disabled label when Score preset active**:
```tsx
// Wrap existing clef + octave controls:
const controlsDisabledByScore = config.preset === 'score';

// On the clef selector:
disabled={isDisabled || controlsDisabledByScore}

// On the octave range selector:
disabled={isDisabled || controlsDisabledByScore}

// Add label below the controls when Score preset active:
{controlsDisabledByScore && (
  <p className="practice-sidebar__score-source-label">
    Set by loaded score
  </p>
)}
```

**Notes slider max** (FR-006):
```tsx
max={config.preset === 'score' && scorePitches ? scorePitches.totalAvailable : 20}
```

**ScoreSelector overlay** (add at the bottom of the component return, before the closing fragment):
```tsx
{showScoreSelector && (
  <context.components.ScoreSelector
    catalogue={context.scorePlayer.getCatalogue()}
    isLoading={scorePlayerState?.status === 'loading'}
    error={scorePlayerState?.status === 'error' ? scorePlayerState.error : null}
    onSelectScore={id => context.scorePlayer.loadScore({ kind: 'catalogue', catalogueId: id })}
    onLoadFile={file => context.scorePlayer.loadScore({ kind: 'file', file })}
    onCancel={handleSelectorCancel}
  />
)}
```

### B4 — Tests for `PracticePlugin.tsx`

Key test scenarios to add to `PracticePlugin.test.tsx`:

```tsx
describe('Score preset', () => {
  it('shows Score as a third preset option', () => {
    render(<PracticePlugin context={mockContext} />);
    expect(screen.getByRole('radio', { name: /score/i })).toBeInTheDocument();
  });

  it('opens score selector when Score preset selected and no score loaded', () => {
    render(<PracticePlugin context={mockContext} />);
    fireEvent.click(screen.getByRole('radio', { name: /score/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not open score selector when Score preset selected and score is already cached', () => {
    // Render with pre-loaded scorePitches (inject via mock or state setup)
    const ctx = createMockContextWithScoreReady();
    render(<PracticePlugin context={ctx} />);
    fireEvent.click(screen.getByRole('radio', { name: /score/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reverts to Random when selector is cancelled with no score loaded', () => {
    render(<PracticePlugin context={mockContext} />);
    fireEvent.click(screen.getByRole('radio', { name: /score/i }));
    fireEvent.click(screen.getByLabelText(/cancel/i));
    expect(screen.getByRole('radio', { name: /random/i })).toBeChecked();
  });

  it('shows "Change score" button when Score preset is active and score is loaded', () => {
    const ctx = createMockContextWithScoreReady();
    render(<PracticePlugin context={ctx} />);
    // set preset to score externally in state...
    expect(screen.getByRole('button', { name: /change score/i })).toBeInTheDocument();
  });

  it('"Change score" button is disabled during playing phase', () => {
    const ctx = createMockContextWithScoreReady();
    render(<PracticePlugin context={ctx} />);
    // Trigger playing phase...
    const btn = screen.getByRole('button', { name: /change score/i });
    expect(btn).toBeDisabled();
  });

  it('clef and octave controls are disabled when Score preset active', () => {
    const ctx = createMockContextWithScoreReady();
    render(<PracticePlugin context={ctx} />);
    // set preset to score...
    expect(screen.getByLabelText(/clef/i)).toBeDisabled();
  });

  it('shows "Set by loaded score" label when Score preset active', () => {
    const ctx = createMockContextWithScoreReady();
    render(<PracticePlugin context={ctx} />);
    expect(screen.getByText(/set by loaded score/i)).toBeInTheDocument();
  });
});
```

### B5 — CSS additions to `PracticePlugin.css`

```css
/* Disabled-by-score label */
.practice-sidebar__score-source-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 2px 0 0 0;
}

/* Change score button */
.practice-sidebar__change-score {
  margin-top: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  min-height: 36px;
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.practice-sidebar__change-score:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

## Running Tests

```bash
# Unit + integration tests
cd frontend && npx vitest run

# Watch mode during development
cd frontend && npx vitest

# E2E (requires a running dev server)
cd frontend && npx playwright test
```

---

## Key Acceptance Checks

1. Open Practice plugin → sidebar shows three preset radio buttons: Random, C4 Scale, Score
2. Select Score → score selection dialog opens over the practice UI
3. Select a preloaded score → dialog closes, exercise staff populates with score notes
4. Change Notes count → exercise updates immediately from cached score (no new dialog)
5. Cancel dialog with no score → preset reverts to Random
6. Cancel dialog with score already loaded → overlay closes, exercise unchanged
7. "Change score" button disabled during playing phase; enabled during ready/results
8. Clef and octave controls greyed out with "Set by loaded score" label while Score preset active
9. All existing Random and C4 Scale preset functionality unchanged (no regression)
