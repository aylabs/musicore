# Quickstart: Migrate Practice Layout to Rust Layout Engine

**Feature**: `001-practice-rust-layout`  
**Date**: 2026-02-24

This document gives concrete, copy-paste-ready code patterns for each migration step.

---

## Step 1: Add `id` to ExerciseNote (types/practice.ts)

```typescript
// frontend/src/types/practice.ts
export interface ExerciseNote {
  /** Stable layout/highlight identifier: "ex-{slotIndex}" */
  id: string;               // ← ADD THIS
  slotIndex: number;
  midiPitch: number;
  expectedOnsetMs: number;
}
```

---

## Step 2: Generate IDs in exerciseGenerator.ts

```typescript
// frontend/src/services/practice/exerciseGenerator.ts
// In generateExercise(), change the notes factory:

const notes: ExerciseNote[] = Array.from({ length: config.noteCount }, (_, i) => ({
  id: `ex-${i}`,             // ← ADD: stable id for layout/highlight
  slotIndex: i,
  midiPitch: pool[Math.floor(rand() * pool.length)],
  expectedOnsetMs: i * msPerBeat,
}));
```

Apply the same change in `generateC4ScaleExercise`.

---

## Step 3: Create practiceLayoutAdapter.ts

```typescript
// frontend/src/services/practice/practiceLayoutAdapter.ts

import type { ExerciseNote } from '../../types/practice';
import type { GlobalLayout } from '../../wasm/layout';
import { createSourceKey } from '../highlight/sourceMapping';

const PRACTICE_INSTRUMENT_ID = 'practice-instrument';
const BASE_SCALE = 0.5; // logical units → CSS pixels (matches LayoutView)

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Convert exercise notes to the JSON input schema expected by computeLayout.
 * All notes are quarter notes (960 ticks) at sequential tick positions.
 */
export function serializeExerciseToLayoutInput(
  notes: ExerciseNote[],
  clef: 'Treble' | 'Bass',
) {
  return {
    instruments: [{
      id: PRACTICE_INSTRUMENT_ID,
      name: 'Piano',
      staves: [{
        clef,
        time_signature: { numerator: 4, denominator: 4 },
        key_signature: { sharps: 0 },
        voices: [{
          notes: notes.map(n => ({
            tick: n.slotIndex * 960,
            duration: 960,
            pitch: n.midiPitch,
            articulation: null,
          })),
        }],
      }],
    }],
  };
}

// ─── Source map ───────────────────────────────────────────────────────────────

/**
 * Build the SourceReference → noteId map for LayoutRenderer highlight resolution.
 * Practice staves always use: system=0, instrument="practice-instrument", staff=0, voice=0.
 */
export function buildPracticeSourceToNoteIdMap(
  notes: ExerciseNote[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const note of notes) {
    const key = createSourceKey({
      system_index: 0,
      instrument_id: PRACTICE_INSTRUMENT_ID,
      staff_index: 0,
      voice_index: 0,
      event_index: note.slotIndex,
    });
    map.set(key, note.id); // "ex-{slotIndex}"
  }
  return map;
}

// ─── Auto-scroll helper ───────────────────────────────────────────────────────

/**
 * Find the CSS pixel x-coordinate of a note glyph in the GlobalLayout.
 * Returns null if the layout is empty or the slot is not found.
 */
export function findPracticeNoteX(
  layout: GlobalLayout,
  slotIndex: number,
): number | null {
  const system = layout.systems[0];
  if (!system) return null;

  const staff = system.staff_groups[0]?.staves[0];
  if (!staff) return null;

  for (const run of staff.glyph_runs) {
    for (const glyph of run.glyphs) {
      if (glyph.source_reference.event_index === slotIndex) {
        return glyph.position.x * BASE_SCALE; // logical → CSS px
      }
    }
  }
  return null;
}
```

---

## Step 4: Update PracticeView.tsx — layout call

Replace the `NotationLayoutEngine.calculateLayout` call for the exercise staff:

```typescript
// frontend/src/components/practice/PracticeView.tsx

// REMOVE:
import { NotationLayoutEngine } from '../../services/notation/NotationLayoutEngine';
import { NotationRenderer } from '../notation/NotationRenderer';

// ADD:
import { computeLayout } from '../../wasm/layout';
import { initWasm } from '../../services/wasm/loader';
import LayoutRenderer from '../LayoutRenderer';
import {
  serializeExerciseToLayoutInput,
  buildPracticeSourceToNoteIdMap,
  findPracticeNoteX,
} from '../../services/practice/practiceLayoutAdapter';

// ADD state:
const [wasmReady, setWasmReady] = useState(false);
const [exerciseLayout, setExerciseLayout] = useState<GlobalLayout | null>(null);
const [sourceToNoteIdMap, setSourceToNoteIdMap] = useState<Map<string, string>>(new Map());

// ADD effect — WASM init:
useEffect(() => {
  initWasm().then(() => setWasmReady(true));
}, []);

// REPLACE layout computation (currently in a useEffect on exercise):
useEffect(() => {
  if (!exercise || !wasmReady) return;
  const input = serializeExerciseToLayoutInput(exercise.notes, exerciseConfig.clef);
  const map = buildPracticeSourceToNoteIdMap(exercise.notes);
  setSourceToNoteIdMap(map);
  computeLayout(input, { max_system_width: 99999 }).then(setExerciseLayout);
}, [exercise, wasmReady, exerciseConfig.clef]);
```

---

## Step 5: Update PracticeView.tsx — highlight

Replace the `highlightedSlotIndex → x` lookup:

```typescript
// BEFORE: exerciseLayout.notes[highlightedSlotIndex].x
// AFTER:
const highlightedNoteIds = useMemo(
  () => highlightedSlotIndex !== null
    ? new Set([`ex-${highlightedSlotIndex}`])
    : new Set<string>(),
  [highlightedSlotIndex],
);

// Auto-scroll effect (replace the existing one):
useEffect(() => {
  if (!exerciseLayout || highlightedSlotIndex === null) return;
  const x = findPracticeNoteX(exerciseLayout, highlightedSlotIndex);
  if (x === null) return;
  const container = exScrollRef.current;
  if (!container) return;
  container.scrollTo({ left: x - container.clientWidth / 2, behavior: 'smooth' });
}, [exerciseLayout, highlightedSlotIndex]);
```

---

## Step 6: Update PracticeView.tsx — render

Replace `<NotationRenderer>` with `<LayoutRenderer>`:

```tsx
{/* BEFORE */}
<NotationRenderer layout={exerciseLayout} highlightedSlotIndex={highlightedSlotIndex} />

{/* AFTER */}
<LayoutRenderer
  layout={exerciseLayout}
  config={{ /* RenderConfig — use same defaults as LayoutView/ScoreViewer */ }}
  viewport={{ scrollX: 0, scrollY: 0, width: containerWidth, height: staffHeight }}
  highlightedNoteIds={highlightedNoteIds}
  sourceToNoteIdMap={sourceToNoteIdMap}
/>
```

> **Note**: `RenderConfig` defaults (colors, fonts, glyph scale) must match those in `LayoutView` for visual consistency. Extract them into a shared `DEFAULT_RENDER_CONFIG` constant if not already exported.

---

## Step 7: Response staff (flow mode)

Same pattern as exercise staff, using matched response pitches at the same tick positions:

```typescript
function serializeResponseToLayoutInput(
  comparisons: NoteComparison[],
  clef: 'Treble' | 'Bass',
) {
  const notes = comparisons
    .filter(c => c.response !== null)
    .map(c => ({
      tick: c.target.slotIndex * 960,
      duration: 960,
      pitch: Math.round(c.response!.midiCents / 100),
      articulation: null,
    }));

  return {
    instruments: [{
      id: 'practice-instrument',
      name: 'Piano',
      staves: [{ clef, time_signature: { numerator: 4, denominator: 4 }, key_signature: { sharps: 0 }, voices: [{ notes }] }],
    }],
  };
}
```

---

## Step 8: Update PracticeView.test.tsx

Replace the `NotationLayoutEngine` mock with a `computeLayout` mock:

```typescript
// REMOVE:
vi.mock('../../services/notation/NotationLayoutEngine', () => ({
  NotationLayoutEngine: { calculateLayout: vi.fn().mockReturnValue({ notes: [], ... }) },
}));

// ADD:
vi.mock('../../wasm/layout', () => ({
  computeLayout: vi.fn().mockResolvedValue({
    systems: [{
      index: 0,
      bounding_box: { x: 0, y: 0, width: 800, height: 120 },
      staff_groups: [{ instrument_id: 'practice-instrument', staves: [{ glyph_runs: [], structural_glyphs: [] }], bracket_type: 'None' }],
      tick_range: { start_tick: 0, end_tick: 7680 },
    }],
    total_width: 800,
    total_height: 120,
    units_per_space: 10,
  }),
}));
vi.mock('../../services/wasm/loader', () => ({
  initWasm: vi.fn().mockResolvedValue(undefined),
  getWasmModule: vi.fn().mockReturnValue(null),
}));
```

---

## Step 9: Write regression test (Principle VII)

```typescript
// frontend/src/services/notation/NotationLayoutEngine.test.ts
// Add to existing test suite:

describe('calculateBarlines — regression: barline x must exceed preceding note x', () => {
  it('barline at measure 1 sits to the right of all notes in measure 1', () => {
    const config = { ...DEFAULT_STAFF_CONFIG };
    const notes = [/* 4 quarter notes */];
    const positions = NotationLayoutEngine.calculateNotePositions(notes, 'Treble', config, { numerator: 4, denominator: 4 });
    const barlines = NotationLayoutEngine.calculateBarlines({ numerator: 4, denominator: 4 }, 3840, config);

    const lastNoteInMeasure1 = positions[3]; // 4th note (index 3) ends measure 1
    const barline1 = barlines[0];
    expect(barline1.x).toBeGreaterThan(lastNoteInMeasure1.x);
  });
});
```

---

## Quick Validation Checklist

After implementation, verify:

- [ ] `grep -r "NotationLayoutEngine" frontend/src/components/practice/` → zero results
- [ ] `grep -r "NotationRenderer" frontend/src/components/practice/` → zero results
- [ ] `npx vitest run` → all tests pass
- [ ] Manual: generate 20-note exercise, all notes visible, no clipping
- [ ] Manual: generate 8-note exercise spanning 2 measures, barlines between measures 1–2, 2–3
- [ ] Manual: play exercise, highlight advances correctly through all 20 slots
- [ ] Manual: complete flow exercise, response staff shows detected pitches
