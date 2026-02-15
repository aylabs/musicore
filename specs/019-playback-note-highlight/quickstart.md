# Quickstart Guide: Playback Note Highlighting

**Feature**: 019-playback-note-highlight  
**Created**: 2026-02-15  
**Estimated Time**: 4-6 hours (excluding tests)

## Overview

This guide provides step-by-step instructions for implementing real-time note highlighting during music playback. The implementation adds visual feedback that synchronizes with audio, helping users follow along with the music.

**Architecture Summary**:
```
Playback State (currentTick, status)
    ↓ (consumed by)
useNoteHighlight Hook (filters notes)
    ↓ (provides)
LayoutRenderer (passes to children)
    ↓ (renders)
NoteElement (applies CSS class)
```

**Implementation Order**:
1. TypeScript interfaces (15 min)
2. Highlight computation logic (30 min)
3. useNoteHighlight hook (45 min)
4. CSS styles (15 min)
5. Update LayoutRenderer (30 min)
6. Update NoteElement (30 min)
7. Wire up in App (15 min)
8. Manual testing (30 min)

---

## Prerequisites

**Before starting, ensure**:
- Feature 003 (Music Playback) is complete and working
- Feature 009 (Playback Scroll) is complete (provides 60 Hz currentTick updates)
- MusicTimeline hook is broadcasting currentTick at 60 Hz
- LayoutRenderer is rendering notes from layout engine
- Basic understanding of React hooks, useMemo, React.memo

**Verify existing infrastructure**:
```bash
# Check that MusicTimeline exports currentTick
grep "currentTick" frontend/src/services/playback/MusicTimeline.ts

# Check that LayoutRenderer renders notes
grep "NoteElement" frontend/src/components/score/LayoutRenderer.tsx

# Run existing tests to ensure baseline functionality
cd frontend && npm test
```

---

## Step 1: Create TypeScript Interfaces (15 min)

### 1.1 Create Type Definitions File

**File**: `frontend/src/types/highlight.ts`

```typescript
/**
 * Type definitions for note highlighting during playback
 * Feature: 019-playback-note-highlight
 */

import type { Note } from './score';
import type { PlaybackStatus } from './playback';

/**
 * Return type for useNoteHighlight hook
 */
export interface UseNoteHighlightReturn {
  /**
   * Set of note IDs currently highlighted
   * Empty when stopped, computed when playing, frozen when paused
   */
  highlightedNoteIds: Set<string>;
}

/**
 * Props for note elements with highlight state
 */
export interface NoteElementHighlightProps {
  /**
   * Whether this note should be highlighted
   */
  isHighlighted: boolean;
}

/**
 * Pure function type for computing highlighted notes
 */
export type ComputeHighlightedNotesFn = (
  notes: Note[],
  currentTick: number
) => Set<string>;
```

**Verification**:
```bash
# TypeScript should compile without errors
npm run typecheck
```

---

## Step 2: Implement Highlight Computation Logic (30 min)

### 2.1 Create Computation Function

**File**: `frontend/src/services/highlight/computeHighlightedNotes.ts`

```typescript
import type { Note } from '../../types/score';
import type { ComputeHighlightedNotesFn } from '../../types/highlight';

/**
 * Compute which notes should be highlighted at given playback position
 * 
 * A note is highlighted if:
 *   currentTick >= note.start_tick AND
 *   currentTick < note.start_tick + note.duration_ticks
 * 
 * Performance: O(n) where n = number of notes
 * Typical execution: <2ms for 1000 notes
 * 
 * @param notes - Array of all notes in the score
 * @param currentTick - Current playback position (PPQ, 960 per quarter note)
 * @returns Set of note IDs that are currently playing
 * 
 * @example
 * ```typescript
 * const notes = [
 *   { id: '1', start_tick: 0, duration_ticks: 960 },
 *   { id: '2', start_tick: 960, duration_ticks: 960 }
 * ];
 * 
 * computeHighlightedNotes(notes, 480);  // Set(['1'])
 * computeHighlightedNotes(notes, 1200); // Set(['2'])
 * ```
 */
export const computeHighlightedNotes: ComputeHighlightedNotesFn = (
  notes: Note[],
  currentTick: number
): Set<string> => {
  const highlighted = new Set<string>();

  for (const note of notes) {
    const noteEndTick = note.start_tick + note.duration_ticks;
    
    // Note is playing if currentTick is within [start_tick, end_tick)
    // Use half-open interval: includes start, excludes end
    if (currentTick >= note.start_tick && currentTick < noteEndTick) {
      highlighted.add(note.id);
    }
  }

  return highlighted;
};

/**
 * Helper: Check if a single note is playing at given tick
 * 
 * @param note - Note to check
 * @param currentTick - Current playback position
 * @returns True if note is playing at currentTick
 */
export const isNotePlaying = (note: Note, currentTick: number): boolean => {
  const noteEndTick = note.start_tick + note.duration_ticks;
  return currentTick >= note.start_tick && currentTick < noteEndTick;
};
```

### 2.2 Create Unit Tests

**File**: `frontend/src/services/highlight/computeHighlightedNotes.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { computeHighlightedNotes, isNotePlaying } from './computeHighlightedNotes';
import type { Note } from '../../types/score';

// Helper to create test notes
const createNote = (id: string, startTick: number, durationTicks: number): Note => ({
  id,
  start_tick: startTick,
  duration_ticks: durationTicks,
  pitch: 60,
  voice: 0,
  staff: 0,
  instrument: 'piano'
});

describe('computeHighlightedNotes', () => {
  it('returns empty set when currentTick is before all notes', () => {
    const notes = [
      createNote('1', 960, 480),
      createNote('2', 1440, 480)
    ];
    
    const result = computeHighlightedNotes(notes, 0);
    
    expect(result.size).toBe(0);
  });

  it('highlights single note when currentTick is within note range', () => {
    const notes = [
      createNote('1', 960, 480),
      createNote('2', 1440, 480)
    ];
    
    const result = computeHighlightedNotes(notes, 1000);
    
    expect(result).toEqual(new Set(['1']));
  });

  it('highlights multiple simultaneous notes', () => {
    const notes = [
      createNote('1', 0, 1920),     // Long note
      createNote('2', 960, 480),    // Overlaps with note 1
      createNote('3', 960, 480)     // Also overlaps
    ];
    
    const result = computeHighlightedNotes(notes, 1000);
    
    expect(result).toEqual(new Set(['1', '2', '3']));
  });

  it('unhighlights note when currentTick reaches note end (exclusive)', () => {
    const notes = [createNote('1', 960, 480)];
    
    // At exact end tick (1440), note should NOT be highlighted
    const result = computeHighlightedNotes(notes, 1440);
    
    expect(result.size).toBe(0);
  });

  it('highlights note at exact start tick (inclusive)', () => {
    const notes = [createNote('1', 960, 480)];
    
    // At exact start tick, note should be highlighted
    const result = computeHighlightedNotes(notes, 960);
    
    expect(result).toEqual(new Set(['1']));
  });

  it('handles empty notes array', () => {
    const result = computeHighlightedNotes([], 1000);
    
    expect(result.size).toBe(0);
  });

  it('handles very large currentTick (after all notes)', () => {
    const notes = [
      createNote('1', 960, 480),
      createNote('2', 1440, 480)
    ];
    
    const result = computeHighlightedNotes(notes, 10000);
    
    expect(result.size).toBe(0);
  });
});

describe('isNotePlaying', () => {
  it('returns true when note is playing', () => {
    const note = createNote('1', 960, 480);
    
    expect(isNotePlaying(note, 1000)).toBe(true);
  });

  it('returns false when currentTick is before note', () => {
    const note = createNote('1', 960, 480);
    
    expect(isNotePlaying(note, 500)).toBe(false);
  });

  it('returns false when currentTick is after note', () => {
    const note = createNote('1', 960, 480);
    
    expect(isNotePlaying(note, 1500)).toBe(false);
  });
});
```

**Run tests**:
```bash
npm test -- computeHighlightedNotes.test.ts
```

---

## Step 3: Create useNoteHighlight Hook (45 min)

### 3.1 Implement Hook

**File**: `frontend/src/services/highlight/useNoteHighlight.ts`

```typescript
import { useMemo } from 'react';
import type { Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';
import type { UseNoteHighlightReturn } from '../../types/highlight';
import { computeHighlightedNotes } from './computeHighlightedNotes';

/**
 * Hook to compute which notes should be highlighted during playback
 * 
 * This hook derives highlight state from playback state:
 * - stopped: No notes highlighted (empty set)
 * - playing: Notes highlighted based on currentTick (recomputed at 60 Hz)
 * - paused: Notes remain highlighted (frozen from last playing state)
 * 
 * Performance:
 * - useMemo ensures computation only runs when dependencies change
 * - Typical: <2ms for 1000 notes (well under 16ms frame budget)
 * 
 * @param notes - Array of all notes in the score
 * @param currentTick - Current playback position (0 to max tick)
 * @param status - Current playback status
 * @returns Object with highlightedNoteIds Set
 * 
 * @example
 * ```typescript
 * const { currentTick, status } = usePlayback(notes, tempo);
 * const { highlightedNoteIds } = useNoteHighlight(notes, currentTick, status);
 * 
 * // Pass to renderer
 * <LayoutRenderer highlightedNoteIds={highlightedNoteIds} />
 * ```
 */
export function useNoteHighlight(
  notes: Note[],
  currentTick: number,
  status: PlaybackStatus
): UseNoteHighlightReturn {
  const highlightedNoteIds = useMemo(() => {
    // When stopped, clear all highlights
    if (status === 'stopped') {
      return new Set<string>();
    }

    // When playing or paused, compute highlights from currentTick
    // Note: When paused, currentTick is frozen, so highlights remain static
    return computeHighlightedNotes(notes, currentTick);
  }, [notes, currentTick, status]);

  return { highlightedNoteIds };
}
```

### 3.2 Create Hook Tests

**File**: `frontend/src/services/highlight/useNoteHighlight.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNoteHighlight } from './useNoteHighlight';
import type { Note } from '../../types/score';

const createNote = (id: string, startTick: number, durationTicks: number): Note => ({
  id,
  start_tick: startTick,
  duration_ticks: durationTicks,
  pitch: 60,
  voice: 0,
  staff: 0,
  instrument: 'piano'
});

describe('useNoteHighlight', () => {
  const notes: Note[] = [
    createNote('1', 0, 960),      // 0-960
    createNote('2', 960, 960),    // 960-1920
    createNote('3', 1920, 960)    // 1920-2880
  ];

  it('returns empty set when status is stopped', () => {
    const { result } = renderHook(() =>
      useNoteHighlight(notes, 500, 'stopped')
    );

    expect(result.current.highlightedNoteIds.size).toBe(0);
  });

  it('returns highlighted notes when status is playing', () => {
    const { result } = renderHook(() =>
      useNoteHighlight(notes, 500, 'playing')
    );

    expect(result.current.highlightedNoteIds).toEqual(new Set(['1']));
  });

  it('preserves highlights when status is paused', () => {
    const { result } = renderHook(() =>
      useNoteHighlight(notes, 1000, 'paused')
    );

    // Note 2 is playing at tick 1000
    expect(result.current.highlightedNoteIds).toEqual(new Set(['2']));
  });

  it('updates highlights when currentTick changes', () => {
    const { result, rerender } = renderHook(
      ({ tick }) => useNoteHighlight(notes, tick, 'playing'),
      { initialProps: { tick: 500 } }
    );

    // Initially: note 1 is highlighted
    expect(result.current.highlightedNoteIds).toEqual(new Set(['1']));

    // After rerender with new tick: note 2 is highlighted
    rerender({ tick: 1500 });
    expect(result.current.highlightedNoteIds).toEqual(new Set(['2']));
  });

  it('memoizes result when dependencies do not change', () => {
    const { result, rerender } = renderHook(() =>
      useNoteHighlight(notes, 500, 'playing')
    );

    const firstResult = result.current.highlightedNoteIds;

    // Rerender without changing dependencies
    rerender();

    // Should return same Set instance (memoized)
    expect(result.current.highlightedNoteIds).toBe(firstResult);
  });
});
```

**Run tests**:
```bash
npm test -- useNoteHighlight.test.ts
```

---

## Step 4: Add CSS Styles (15 min)

### 4.1 Create Highlight Styles

**File**: `frontend/src/styles/highlight.css` (or add to existing note styles)

```css
/**
 * Note highlighting styles for playback
 * Feature: 019-playback-note-highlight
 */

/* Base note styles (default, non-highlighted) */
.note {
  fill: #000000;
  stroke: #000000;
  stroke-width: 1;
}

/* Highlighted note styles (during playback) */
.note.highlighted {
  fill: #4A90E2;           /* Blue fill */
  stroke: #2E5C8A;          /* Darker blue stroke for emphasis */
  stroke-width: 2;          /* Thicker stroke for visibility */
}

/* Optional: Smooth transition for highlight appearance */
.note {
  transition: fill 50ms ease-out, 
              stroke 50ms ease-out, 
              stroke-width 50ms ease-out;
}

/* High-contrast mode support (accessibility) */
@media (prefers-contrast: high) {
  .note.highlighted {
    fill: #0066CC;          /* Higher contrast blue */
    stroke: #003366;
    stroke-width: 3;         /* More prominent stroke */
  }
}

/* Dark mode support (if applicable) */
@media (prefers-color-scheme: dark) {
  .note {
    fill: #FFFFFF;
    stroke: #FFFFFF;
  }
  
  .note.highlighted {
    fill: #66B3FF;          /* Lighter blue for dark background */
    stroke: #3399FF;
    stroke-width: 2;
  }
}
```

### 4.2 Import Styles

**File**: `frontend/src/App.tsx` or `frontend/src/main.tsx`

```typescript
import './styles/highlight.css';  // Add this import
```

**Verification**:
```bash
# Check that styles are loaded
npm run dev
# Open browser DevTools, check that .note.highlighted styles are present
```

---

## Step 5: Update LayoutRenderer Component (30 min)

### 5.1 Update Component Props

**File**: `frontend/src/components/score/LayoutRenderer.tsx`

```typescript
import React from 'react';
import { NoteElement } from './NoteElement';
import type { LayoutData } from '../../types/layout';

// ADD: Import highlight props type
interface LayoutRendererProps {
  layoutData: LayoutData;
  highlightedNoteIds: Set<string>;  // NEW: Highlight state
  // ... other existing props
}

/**
 * Renders musical score from layout engine output
 * 
 * UPDATED: Feature 019 - Accepts highlightedNoteIds prop and passes
 * isHighlighted flag to each NoteElement
 */
export function LayoutRenderer({ 
  layoutData,
  highlightedNoteIds,  // NEW
  // ... other props
}: LayoutRendererProps) {
  return (
    <svg width={layoutData.width} height={layoutData.height}>
      {/* Render notes */}
      {layoutData.notes.map(note => (
        <NoteElement
          key={note.id}
          note={note}
          isHighlighted={highlightedNoteIds.has(note.id)}  // NEW
        />
      ))}
      
      {/* Other rendering (staves, clefs, etc.) */}
      {/* ... */}
    </svg>
  );
}
```

### 5.2 Add Default Prop (Optional)

```typescript
// If highlightedNoteIds is optional, provide default
LayoutRenderer.defaultProps = {
  highlightedNoteIds: new Set()  // Empty set = no highlights
};
```

---

## Step 6: Update NoteElement Component (30 min)

### 6.1 Update Component with Highlight Support

**File**: `frontend/src/components/score/NoteElement.tsx`

```typescript
import React from 'react';
import type { Note } from '../../types/score';

interface NoteElementProps {
  note: Note;
  isHighlighted: boolean;  // NEW: Highlight state
}

/**
 * Renders an individual note (notehead, stem, flags)
 * 
 * UPDATED: Feature 019 - Applies 'highlighted' CSS class when note is playing
 */
export const NoteElement = React.memo(({ 
  note, 
  isHighlighted 
}: NoteElementProps) => {
  // Determine CSS class based on highlight state
  const className = isHighlighted ? 'note highlighted' : 'note';

  return (
    <g className={className} data-note-id={note.id}>
      {/* Notehead (simplified - replace with actual rendering logic) */}
      <ellipse
        cx={note.x}
        cy={note.y}
        rx={6}
        ry={4}
        transform={`rotate(-20 ${note.x} ${note.y})`}
      />
      
      {/* Stem (if note has stem) */}
      {note.hasStem && (
        <line
          x1={note.x + 6}
          y1={note.y}
          x2={note.x + 6}
          y2={note.y - 35}
          strokeWidth={1}
        />
      )}
      
      {/* Additional note elements (flags, dots, accidentals) */}
    </g>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if highlight state or note ID changed
  return (
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.note.id === nextProps.note.id
  );
});

NoteElement.displayName = 'NoteElement';
```

### 6.2 Add Component Tests

**File**: `frontend/src/components/score/NoteElement.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NoteElement } from './NoteElement';

const mockNote = {
  id: 'note-1',
  start_tick: 0,
  duration_ticks: 960,
  pitch: 60,
  x: 100,
  y: 200,
  voice: 0,
  staff: 0,
  instrument: 'piano',
  hasStem: true
};

describe('NoteElement', () => {
  it('applies default class when not highlighted', () => {
    const { container } = render(
      <svg>
        <NoteElement note={mockNote} isHighlighted={false} />
      </svg>
    );

    const noteGroup = container.querySelector('g');
    expect(noteGroup).toHaveClass('note');
    expect(noteGroup).not.toHaveClass('highlighted');
  });

  it('applies highlighted class when highlighted', () => {
    const { container } = render(
      <svg>
        <NoteElement note={mockNote} isHighlighted={true} />
      </svg>
    );

    const noteGroup = container.querySelector('g');
    expect(noteGroup).toHaveClass('note', 'highlighted');
  });

  it('includes note ID in data attribute', () => {
    const { container } = render(
      <svg>
        <NoteElement note={mockNote} isHighlighted={false} />
      </svg>
    );

    const noteGroup = container.querySelector('g');
    expect(noteGroup).toHaveAttribute('data-note-id', 'note-1');
  });
});
```

**Run tests**:
```bash
npm test -- NoteElement.test.tsx
```

---

## Step 7: Wire Up in App Component (15 min)

### 7.1 Connect Playback to Highlighting

**File**: `frontend/src/App.tsx` (or wherever score is rendered)

```typescript
import React from 'react';
import { usePlayback } from './services/playback/MusicTimeline';
import { useNoteHighlight } from './services/highlight/useNoteHighlight';  // NEW
import { LayoutRenderer } from './components/score/LayoutRenderer';
import type { Note } from './types/score';

function App() {
  // Existing playback state
  const notes: Note[] = /* ... load notes ... */;
  const tempo = 120;
  const { currentTick, status, play, pause, stop } = usePlayback(notes, tempo);

  // NEW: Derive highlight state from playback
  const { highlightedNoteIds } = useNoteHighlight(notes, currentTick, status);

  // Existing layout data
  const layoutData = /* ... get from layout engine ... */;

  return (
    <div className="app">
      {/* Playback controls */}
      <div className="controls">
        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>
        <button onClick={stop}>Stop</button>
      </div>

      {/* Score renderer with NEW highlight prop */}
      <LayoutRenderer
        layoutData={layoutData}
        highlightedNoteIds={highlightedNoteIds}  // NEW
      />
    </div>
  );
}

export default App;
```

### 7.2 Verify Wiring

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:5173
# Load a score and click Play
# Verify notes highlight as they play
```

---

## Step 8: Manual Testing (30 min)

### 8.1 Test Checklist

**User Story 1 - Basic Highlighting (P1)**:

- [ ] Load a simple melody (C major scale)
- [ ] Click Play
- [ ] ✅ Notes highlight as they play (blue color)
- [ ] ✅ Previous note unhighlights when next note starts
- [ ] Click Pause
- [ ] ✅ Currently highlighted note remains highlighted
- [ ] ✅ Audio stops
- [ ] Click Play again (resume)
- [ ] ✅ Highlighting resumes from paused position
- [ ] Click Stop
- [ ] ✅ All highlights cleared
- [ ] ✅ Playback position resets

**User Story 2 - Multiple Notes (P2)**:

- [ ] Load a score with chords (C-E-G triad)
- [ ] Click Play
- [ ] ✅ All three notes in chord highlight simultaneously
- [ ] Load a score with overlapping notes (different durations)
- [ ] ✅ Longer notes remain highlighted while shorter notes unhighlight

**User Story 3 - Visual Clarity (P3)**:

- [ ] Load a dense score (many notes close together)
- [ ] ✅ Highlighted notes are clearly visible
- [ ] ✅ Note details (stem, flags, etc.) not obscured
- [ ] Test on different screen sizes
- [ ] ✅ Highlighting remains visible on tablet, desktop

### 8.2 Performance Verification

```typescript
// Add temporary performance logging (remove after testing)
console.time('highlight-computation');
const highlighted = computeHighlightedNotes(notes, currentTick);
console.timeEnd('highlight-computation');
// Should log: <2ms for 1000 notes
```

**React DevTools Profiler**:
- Open React DevTools
- Go to Profiler tab
- Record playback session
- Verify LayoutRenderer renders complete in <5ms

### 8.3 Edge Cases

- [ ] Test with tied notes (notes should highlight across ties)
- [ ] Test with grace notes (brief highlights visible)
- [ ] Change tempo during playback (highlights stay synchronized)
- [ ] Seek to different position (highlights immediately update)
- [ ] Test with empty score (no errors)
- [ ] Test with very long notes (highlights persist correctly)

---

## Common Issues & Solutions

### Issue: Notes not highlighting during playback

**Possible Causes**:
1. CSS not imported
2. highlightedNoteIds not passed to LayoutRenderer
3. NoteElement not applying className

**Solution**:
```bash
# Check CSS is imported
grep "highlight.css" frontend/src/App.tsx

# Check props are passed
grep "highlightedNoteIds" frontend/src/App.tsx

# Check React DevTools to see if prop is received
# Open React DevTools → Components → LayoutRenderer → props
```

---

### Issue: Performance lag or jank during playback

**Possible Causes**:
1. NoteElement re-rendering unnecessarily
2. computeHighlightedNotes not memoized
3. Too many notes in score (>5000)

**Solution**:
```typescript
// Verify React.memo is applied
export const NoteElement = React.memo(...);

// Verify useMemo is wrapping computation
const highlightedNoteIds = useMemo(() => { ... }, [notes, currentTick, status]);

// Profile with React DevTools
// Look for excessive renders in LayoutRenderer/NoteElement
```

---

### Issue: Highlights don't clear on stop

**Possible Causes**:
1. useNoteHighlight not checking status === 'stopped'
2. Component not re-rendering when status changes

**Solution**:
```typescript
// Verify status check in hook
if (status === 'stopped') {
  return new Set<string>();
}

// Verify status is in useMemo dependency array
}, [notes, currentTick, status]);
```

---

### Issue: Paused highlights disappear

**Possible Causes**:
1. useNoteHighlight only computing highlights for 'playing' status
2. useMemo dependency causing recomputation

**Solution**:
```typescript
// Correct implementation
if (status === 'stopped') {
  return new Set<string>();
}
// For both 'playing' and 'paused', compute from currentTick
return computeHighlightedNotes(notes, currentTick);
```

---

## Performance Optimization (If Needed)

If profiling reveals performance issues:

### Optimization 1: Avoid recomputation on every render

Already solved by useMemo, but verify dependency array is correct.

### Optimization 2: Spatial indexing for large scores

For scores with >5000 notes:

```typescript
// Build index of notes by tick range (one-time cost)
const noteIndex = useMemo(() => buildTickIndex(notes), [notes]);

// Use index for O(log n) lookups instead of O(n)
const highlighted = queryIndex(noteIndex, currentTick);
```

### Optimization 3: Virtual rendering

Only render visible notes (out of scope for initial implementation).

---

## Next Steps

After completing implementation:

1. **Write comprehensive tests** (Phase 2 - tasks.md)
   - Unit tests for all functions
   - Integration tests for playback synchronization
   - E2E tests with Playwright

2. **Manual QA testing** (Phase 2 - manual test checklist)
   - Test all user stories
   - Test all edge cases
   - Performance validation

3. **Code review**
   - Verify constitution compliance
   - Performance profiling results
   - Test coverage report

4. **Documentation**
   - Update feature spec with any discovered issues
   - Document performance characteristics
   - Add examples to component README

---

## References

- **Spec**: [spec.md](spec.md)
- **Research**: [research.md](research.md) - Design decisions
- **Data Model**: [data-model.md](data-model.md) - Entity relationships
- **Contracts**: [contracts/](contracts/) - TypeScript interfaces
- **Feature 003**: Music Playback (playback controls)
- **Feature 009**: Playback Scroll and Highlight (60 Hz updates)

---

## Estimated Timeline

| Task | Time | Status |
|------|------|--------|
| TypeScript interfaces | 15 min | ⬜ |
| Highlight computation | 30 min | ⬜ |
| useNoteHighlight hook | 45 min | ⬜ |
| CSS styles | 15 min | ⬜ |
| Update LayoutRenderer | 30 min | ⬜ |
| Update NoteElement | 30 min | ⬜ |
| Wire up in App | 15 min | ⬜ |
| Manual testing | 30 min | ⬜ |
| **Total** | **3.5 hours** | |

**Note**: This estimate excludes comprehensive test writing, which will be tracked in tasks.md (Phase 2).
