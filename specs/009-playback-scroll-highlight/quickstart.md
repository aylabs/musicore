# Quickstart Guide: Playback Scroll and Highlight

**Feature**: 009-playback-scroll-highlight | **Audience**: Developers implementing this feature  
**Prerequisites**: Features 002 (staff-notation-view) and 003 (music-playback) completed

## Overview

This guide helps you implement synchronized scroll and note highlighting during playback. You'll add view services for calculating scroll positions and identifying playing notes, integrate them with existing playback and notation components, and add CSS styling for visual feedback.

**Estimated Time**: 4-6 hours for MVP implementation (User Stories 1-2)

---

## Architecture Quick Reference

```
MusicTimeline (currentTick updates)
        ↓
usePlaybackScroll hook
        ├→ ScrollController.calculateScrollPosition()
        └→ NoteHighlightService.getPlayingNoteIds()
        ↓
StaffNotation (apply scroll + pass highlights)
        ↓
NotationRenderer (apply CSS classes)
```

**Key Insight**: This feature is entirely **view-layer logic**. No domain model changes, no API changes, no backend work. Just coordinate existing playback state with notation display.

---

## Prerequisites Checklist

Before starting implementation:

- [ ] **Feature 002 complete**: StaffNotation and NotationRenderer components exist
- [ ] **Feature 003 complete**: MusicTimeline hook provides currentTick during playback
- [ ] **Feature 008 available** (optional): Tempo multiplier for tempo-aware scrolling
- [ ] **Node.js 20+** and **npm** installed
- [ ] **Frontend tests passing**: `npm test` in `frontend/` directory

---

## File Changes Overview

### New Files (6)

**Services**:
1. `/spec/009-playback-scroll-highlight/spec.md` ✅ (already created)
2. `frontend/src/services/playback/ScrollController.ts` - Scroll position calculations
3. `frontend/src/services/playback/NoteHighlightService.ts` - Playing note identification
4. `frontend/src/services/hooks/usePlaybackScroll.ts` - React integration hook

**Tests**:
5. `frontend/src/services/playback/ScrollController.test.ts`
6. `frontend/src/services/playback/NoteHighlightService.test.ts`
7. `frontend/src/services/hooks/usePlaybackScroll.test.ts`
8. `frontend/tests/integration/playback-scroll.test.tsx`
9. `frontend/tests/integration/playback-highlight.test.tsx`

### Modified Files (6)

10. `frontend/src/types/playback.ts` - Add ScrollState, ScrollConfig interfaces
11. `frontend/src/types/notation/layout.ts` - Add NoteHighlight interface
12. `frontend/src/components/notation/StaffNotation.tsx` - Integrate scroll/highlight
13. `frontend/src/components/notation/StaffNotation.test.tsx` - Add scroll/highlight tests
14. `frontend/src/components/notation/NotationRenderer.tsx` - Apply highlight classes
15. `frontend/src/App.css` - Add highlight animation styles

**Total**: 15 files (9 new + 6 modified)

---

## Implementation Roadmap

Follow this sequence to implement the feature incrementally with TDD.

### Phase 0: Type Definitions (5 min)

Create type extending files for scroll and highlight state.

**Frontend: `frontend/src/types/playback.ts`** (MODIFY - add to end of file):

```typescript
// ... existing PlaybackStatus, PlaybackState types ...

/**
 * Feature 009: Playback Scroll and Highlight
 * Auto-scroll configuration and state
 */
export interface ScrollState {
  enabled: boolean;
  targetScrollX: number;
  lastAutoScrollTime: number;
}

export interface ScrollConfig {
  targetPositionRatio: number;  // Default: 0.3
  pixelsPerTick: number;
  viewportWidth: number;
  totalWidth: number;
  currentScrollX: number;
}

export interface ScrollCalculation {
  scrollX: number;
  shouldScroll: boolean;
  nearEnd: boolean;
}
```

**Frontend: `frontend/src/types/notation/layout.ts`** (MODIFY - add to exports):

```typescript
// ... existing layout types ...

/**
 * Feature 009: Playback Scroll and Highlight
 * Note highlight state during playback
 */
export interface NoteHighlight {
  noteId: string;
  startTick: number;
  endTick: number;
  isPlaying: boolean;
}

export interface HighlightResult {
  playingNoteIds: string[];
  highlightMap: Map<string, NoteHighlight>;
}
```

---

### Phase 1: ScrollController Service (TDD, 30 min)

#### Step 1.1: Write Tests FIRST (Red)

Create `frontend/src/services/playback/ScrollController.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ScrollController } from './ScrollController';
import type { ScrollConfig } from '../../types/playback';

describe('ScrollController', () => {
  const defaultConfig: ScrollConfig = {
    targetPositionRatio: 0.3,
    pixelsPerTick: 0.1,
    viewportWidth: 1200,
    totalWidth: 5000,
    currentScrollX: 0,
  };

  describe('calculateScrollPosition', () => {
    it('should return scroll position for note at beginning', () => {
      const result = ScrollController.calculateScrollPosition(0, defaultConfig);
      
      expect(result.scrollX).toBe(0);  // Clamped to minimum
      expect(result.shouldScroll).toBe(true);
      expect(result.nearEnd).toBe(false);
    });

    it('should position note at 30% from left edge', () => {
      const currentTick = 5000;  // Note at 500px (5000 * 0.1)
      const result = ScrollController.calculateScrollPosition(currentTick, defaultConfig);
      
      // Expected: 500 - (1200 * 0.3) = 500 - 360 = 140
      expect(result.scrollX).toBeCloseTo(140, 1);
      expect(result.shouldScroll).toBe(true);
    });

    it('should clamp scroll to maximum when near end', () => {
      const currentTick = 50000;  // Note at 5000px (end of score)
      const result = ScrollController.calculateScrollPosition(currentTick, defaultConfig);
      
      const maxScrollX = defaultConfig.totalWidth - defaultConfig.viewportWidth;
      expect(result.scrollX).toBe(maxScrollX);  // 5000 - 1200 = 3800
      expect(result.nearEnd).toBe(true);
    });

    it('should not scroll when score fits in viewport', () => {
      const shortScoreConfig: ScrollConfig = {
        ...defaultConfig,
        totalWidth: 1000,  // Shorter than viewport
      };
      
      const result = ScrollController.calculateScrollPosition(5000, shortScoreConfig);
      
      expect(result.scrollX).toBe(0);
      expect(result.shouldScroll).toBe(false);
    });
  });

  describe('isManualScroll', () => {
    it('should return true if enough time elapsed since last auto-scroll', () => {
      const lastAutoScrollTime = Date.now() - 200;  // 200ms ago
      const result = ScrollController.isManualScroll(lastAutoScrollTime, 100);
      
      expect(result).toBe(true);
    });

    it('should return false if recent auto-scroll', () => {
      const lastAutoScrollTime = Date.now() - 50;  // 50ms ago
      const result = ScrollController.isManualScroll(lastAutoScrollTime, 100);
      
      expect(result).toBe(false);
    });
  });
});
```

**Run tests** (should fail - no implementation yet):
```bash
cd frontend
npm test -- ScrollController.test.ts
# Expected: All tests FAIL (red)
```

#### Step 1.2: Implement Service (Green)

Create `frontend/src/services/playback/ScrollController.ts`:

```typescript
import type { ScrollConfig, ScrollCalculation } from '../../types/playback';

/**
 * Feature 009: Playback Scroll and Highlight
 * ScrollController - Calculate scroll position from playback tick
 * 
 * Pure service with no React dependencies
 */
export class ScrollController {
  /**
   * Calculate target scroll position for given playback tick
   */
  public static calculateScrollPosition(
    currentTick: number,
    config: ScrollConfig
  ): ScrollCalculation {
    const {
      targetPositionRatio,
      pixelsPerTick,
      viewportWidth,
      totalWidth,
    } = config;
    
    // Check if score fits entirely in viewport
    if (totalWidth <= viewportWidth) {
      return {
        scrollX: 0,
        shouldScroll: false,
        nearEnd: false,
      };
    }
    
    // Calculate pixel position of current note
    const noteX = currentTick * pixelsPerTick;
    
    // Calculate target scroll position (note at targetPositionRatio from left)
    const targetScrollX = noteX - (viewportWidth * targetPositionRatio);
    
    // Clamp to valid scroll range [0, totalWidth - viewportWidth]
    const maxScrollX = totalWidth - viewportWidth;
    const clampedScrollX = Math.max(0, Math.min(targetScrollX, maxScrollX));
    
    // Determine if we're near the end
    const remainingWidth = totalWidth - noteX;
    const nearEnd = remainingWidth < (viewportWidth * 0.7);
    
    return {
      scrollX: clampedScrollX,
      shouldScroll: true,
      nearEnd,
    };
  }
  
  /**
   * Detect if scroll event was user-initiated
   */
  public static isManualScroll(
    lastAutoScrollTime: number,
    threshold: number = 100
  ): boolean {
    const timeSinceLastAuto = Date.now() - lastAutoScrollTime;
    return timeSinceLastAuto > threshold;
  }
}
```

**Run tests** (should pass):
```bash
npm test -- ScrollController.test.ts
# Expected: All tests PASS (green)
```

---

### Phase 2: NoteHighlightService (TDD, 30 min)

#### Step 2.1: Write Tests FIRST (Red)

Create `frontend/src/services/playback/NoteHighlightService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { NoteHighlightService } from './NoteHighlightService';
import type { Note } from '../../types/score';

describe('NoteHighlightService', () => {
  const mockNotes: Note[] = [
    { id: 'n1', start_tick: 0, duration_ticks: 960, pitch: 60 },
    { id: 'n2', start_tick: 960, duration_ticks: 960, pitch: 62 },
    { id: 'n3', start_tick: 1920, duration_ticks: 960, pitch: 64 },
    { id: 'n4', start_tick: 500, duration_ticks: 1500, pitch: 67 },  // Overlaps n1 and n2
  ];

  describe('getPlayingNoteIds', () => {
    it('should return note playing at tick 0', () => {
      const playing = NoteHighlightService.getPlayingNoteIds(mockNotes, 0);
      
      expect(playing).toContain('n1');
      expect(playing).toContain('n4');  // Also playing (starts at 500)
      expect(playing).toHaveLength(2);
    });

    it('should return note IDs for overlapping notes', () => {
      const playing = NoteHighlightService.getPlayingNoteIds(mockNotes, 1000);
      
      // At tick 1000: n2 (960-1920) and n4 (500-2000) are playing
      expect(playing).toContain('n2');
      expect(playing).toContain('n4');
      expect(playing).toHaveLength(2);
    });

    it('should return empty array when no notes playing', () => {
      const playing = NoteHighlightService.getPlayingNoteIds(mockNotes, 5000);
      
      expect(playing).toEqual([]);
    });

    it('should not include note at exact end tick', () => {
      const playing = NoteHighlightService.getPlayingNoteIds(mockNotes, 960);
      
      // n1 ends at 960, should not be included (exclusive end)
      expect(playing).not.toContain('n1');
      expect(playing).toContain('n2');  // n2 starts at 960
      expect(playing).toContain('n4');  // n4 still playing
    });

    it('should apply minimum duration for very short notes', () => {
      const shortNote: Note = {
        id: 'short',
        start_tick: 1000,
        duration_ticks: 10,  // Very short
        pitch: 60,
      };
      
      // With minimum duration of 100 ticks, note should "play" until 1100
      const playingAt1050 = NoteHighlightService.getPlayingNoteIds([shortNote], 1050, 100);
      expect(playingAt1050).toContain('short');
      
      const playingAt1200 = NoteHighlightService.getPlayingNoteIds([shortNote], 1200, 100);
      expect(playingAt1200).not.toContain('short');
    });
  });

  describe('getHighlightDetails', () => {
    it('should return detailed highlight information', () => {
      const result = NoteHighlightService.getHighlightDetails(mockNotes, 1000);
      
      expect(result.playingNoteIds).toContain('n2');
      expect(result.playingNoteIds).toContain('n4');
      expect(result.highlightMap.size).toBe(4);
      
      const n2Highlight = result.highlightMap.get('n2');
      expect(n2Highlight?.isPlaying).toBe(true);
      expect(n2Highlight?.startTick).toBe(960);
      expect(n2Highlight?.endTick).toBe(1920);
    });
  });
});
```

**Run tests** (should fail):
```bash
npm test -- NoteHighlightService.test.ts
# Expected: All tests FAIL (red)
```

#### Step 2.2: Implement Service (Green)

Create `frontend/src/services/playback/NoteHighlightService.ts`:

```typescript
import type { Note } from '../../types/score';
import type { HighlightResult, NoteHighlight } from '../../types/notation/layout';

/**
 * Feature 009: Playback Scroll and Highlight
 * NoteHighlightService - Identify currently playing notes
 * 
 * Pure service with no React dependencies
 */
export class NoteHighlightService {
  /**
   * Get IDs of notes currently playing at specified tick
   */
  public static getPlayingNoteIds(
    notes: Note[],
    currentTick: number,
    minimumDuration: number = 100
  ): string[] {
    return notes
      .filter(note => {
        const noteStartTick = note.start_tick;
        const noteDuration = Math.max(note.duration_ticks, minimumDuration);
        const noteEndTick = noteStartTick + noteDuration;
        
        return currentTick >= noteStartTick && currentTick < noteEndTick;
      })
      .map(note => note.id);
  }
  
  /**
   * Get detailed highlight information
   */
  public static getHighlightDetails(
    notes: Note[],
    currentTick: number
  ): HighlightResult {
    const highlightMap = new Map<string, NoteHighlight>();
    const playingNoteIds: string[] = [];
    
    notes.forEach(note => {
      const noteStartTick = note.start_tick;
      const noteEndTick = noteStartTick + note.duration_ticks;
      const isPlaying = currentTick >= noteStartTick && currentTick < noteEndTick;
      
      if (isPlaying) {
        playingNoteIds.push(note.id);
      }
      
      highlightMap.set(note.id, {
        noteId: note.id,
        startTick: noteStartTick,
        endTick: noteEndTick,
        isPlaying,
      });
    });
    
    return {
      playingNoteIds,
      highlightMap,
    };
  }
}
```

**Run tests** (should pass):
```bash
npm test -- NoteHighlightService.test.ts
# Expected: All tests PASS (green)
```

---

### Phase 3: CSS Highlight Styles (5 min)

**Frontend: `frontend/src/App.css`** (MODIFY - add to end of file):

```css
/* ====================================================================
   Feature 009: Playback Scroll and Highlight
   Note highlighting during playback
   ==================================================================== */

/* Highlighted note styling */
.note-head.highlighted {
  fill: #4CAF50;          /* Green tint for active note */
  opacity: 0.85;          /* Slightly transparent */
  stroke: #2E7D32;        /* Darker green outline */
  stroke-width: 2px;
  
  /* Smooth transition for highlight state changes */
  transition: 
    fill 0.1s ease-in,
    opacity 0.1s ease-in,
    stroke 0.1s ease-in;
}

/* Ensure highlighted notes are above non-highlighted */
.note-head.highlighted {
  paint-order: stroke fill;
}

/* High contrast mode support (accessibility) */
@media (prefers-contrast: high) {
  .note-head.highlighted {
    fill: #1B5E20;        /* Darker green */
    opacity: 1.0;         /* Fully opaque */
    stroke: #000000;      /* Black outline */
    stroke-width: 3px;
  }
}

/* Scroll container optimization */
.staff-notation-container {
  will-change: scroll-position;
  scroll-behavior: auto;
  transform: translateZ(0);  /* Enable hardware acceleration */
}
```

---

### Phase 4: Integration with Components (2 hours)

#### Step 4.1: Update NotationRenderer (Apply Highlight Classes)

**Frontend: `frontend/src/components/notation/NotationRenderer.tsx`** (MODIFY):

Find the props interface and add:
```typescript
export interface NotationRendererProps {
  layout: LayoutGeometry;
  selectedNoteId?: string | null;
  onNoteClick?: (noteId: string) => void;
  scrollX?: number;
  notes?: Note[];
  pixelsPerTick?: number;
  highlightedNoteIds?: string[];  // NEW: Feature 009
}
```

In the component function, update the note rendering section:
```typescript
const NotationRendererComponent: React.FC<NotationRendererProps> = ({
  layout,
  selectedNoteId = null,
  onNoteClick,
  scrollX = 0,
  notes = [],
  pixelsPerTick = 0.1,
  highlightedNoteIds = [],  // NEW: Feature 009
}) => {
  // ... existing code ...
  
  {/* Note heads */}
  {layout.notes.map((notePos) => {
    const isSelected = selectedNoteId === notePos.noteId;
    const isHighlighted = highlightedNoteIds.includes(notePos.noteId);  // NEW
    
    return (
      <text
        key={notePos.noteId}
        x={notePos.x}
        y={notePos.y}
        className={`note-head ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}  // MODIFIED
        // ... rest of props ...
      >
        {notePos.symbol}
      </text>
    );
  })}
}
```

**Add Test** in `frontend/src/components/notation/NotationRenderer.test.tsx`:

```typescript
it('should apply highlighted class to notes in highlightedNoteIds array', () => {
  const highlightedNoteIds = ['note-1', 'note-2'];
  
  const { container } = render(
    <NotationRenderer
      layout={mockLayout}
      highlightedNoteIds={highlightedNoteIds}
    />
  );
  
  const highlightedNotes = container.querySelectorAll('.note-head.highlighted');
  expect(highlightedNotes).toHaveLength(2);
  
  const note1 = container.querySelector('[data-note-id="note-1"]');
  expect(note1).toHaveClass('highlighted');
});
```

#### Step 4.2: Create usePlaybackScroll Hook

Create `frontend/src/services/hooks/usePlaybackScroll.ts`:

```typescript
import { useState, useMemo, useCallback } from 'react';
import { ScrollController } from '../playback/ScrollController';
import { NoteHighlightService } from '../playback/NoteHighlightService';
import type { Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';

export interface UsePlaybackScrollConfig {
  currentTick: number;
  status: PlaybackStatus;
  notes: Note[];
  layoutConfig: {
    pixelsPerTick: number;
    totalWidth: number;
  };
  viewportWidth: number;
  currentScrollX: number;
}

export interface PlaybackScrollState {
  autoScrollEnabled: boolean;
  targetScrollX: number;
  highlightedNoteIds: string[];
  setAutoScrollEnabled: (enabled: boolean) => void;
}

/**
 * Feature 009: Playback Scroll and Highlight
 * Hook to coordinate scroll and highlight during playback
 */
export function usePlaybackScroll(
  config: UsePlaybackScrollConfig
): PlaybackScrollState {
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  
  // Calculate scroll position
  const targetScrollX = useMemo(() => {
    if (config.status !== 'playing' || !autoScrollEnabled) {
      return config.currentScrollX;
    }
    
    const scrollCalc = ScrollController.calculateScrollPosition(
      config.currentTick,
      {
        targetPositionRatio: 0.3,
        pixelsPerTick: config.layoutConfig.pixelsPerTick,
        viewportWidth: config.viewportWidth,
        totalWidth: config.layoutConfig.totalWidth,
        currentScrollX: config.currentScrollX,
      }
    );
    
    return scrollCalc.shouldScroll ? scrollCalc.scrollX : config.currentScrollX;
  }, [
    config.currentTick,
    config.status,
    autoScrollEnabled,
    config.layoutConfig,
    config.viewportWidth,
    config.currentScrollX,
  ]);
  
  // Calculate highlighted notes
  const highlightedNoteIds = useMemo(() => {
    if (config.status !== 'playing') {
      return [];
    }
    
    return NoteHighlightService.getPlayingNoteIds(
      config.notes,
      config.currentTick
    );
  }, [config.currentTick, config.notes, config.status]);
  
  return {
    autoScrollEnabled,
    targetScrollX,
    highlightedNoteIds,
    setAutoScrollEnabled,
  };
}
```

#### Step 4.3: Integrate with StaffNotation

**Frontend: `frontend/src/components/notation/StaffNotation.tsx`** (MODIFY):

Add new props to interface:
```typescript
export interface StaffNotationProps {
  notes: Note[];
  clef?: ClefType;
  viewportWidth?: number;
  viewportHeight?: number;
  currentTick?: number;              // NEW: Feature 009
  playbackStatus?: PlaybackStatus;   // NEW: Feature 009
}
```

Import and use the hook:
```typescript
import { usePlaybackScroll } from '../../services/hooks/usePlaybackScroll';

export const StaffNotation: React.FC<StaffNotationProps> = ({
  notes,
  clef = 'Treble',
  viewportWidth: propsViewportWidth,
  viewportHeight: propsViewportHeight = 200,
  currentTick = 0,              // NEW: Feature 009
  playbackStatus = 'stopped',   // NEW: Feature 009
}) => {
  // ... existing state and refs ...
  
  const lastAutoScrollTimeRef = useRef<number>(0);
  
  // Calculate layout (existing code)
  const layout = useMemo(() => {
    return NotationLayoutEngine.calculateLayout({
      notes,
      clef,
      keySignature: undefined,
      timeSignature: { numerator: 4, denominator: 4 },
      config: {
        ...DEFAULT_STAFF_CONFIG,
        viewportWidth,
        viewportHeight,
        scrollX,
      },
    });
  }, [notes, clef, viewportWidth, viewportHeight, scrollX]);
  
  // NEW: Feature 009 - Playback scroll and highlight
  const scrollState = usePlaybackScroll({
    currentTick,
    status: playbackStatus,
    notes,
    layoutConfig: {
      pixelsPerTick: DEFAULT_STAFF_CONFIG.pixelsPerTick,
      totalWidth: layout.totalWidth,
    },
    viewportWidth,
    currentScrollX: scrollX,
  });
  
  // NEW: Apply auto-scroll
  useEffect(() => {
    if (scrollState.autoScrollEnabled && containerRef.current) {
      containerRef.current.scrollLeft = scrollState.targetScrollX;
      lastAutoScrollTimeRef.current = Date.now();
    }
  }, [scrollState.targetScrollX, scrollState.autoScrollEnabled]);
  
  // MODIFIED: Detect manual scroll override
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollX = e.currentTarget.scrollLeft;
    
    // Check if this was user-initiated scroll
    const isManual = ScrollController.isManualScroll(
      lastAutoScrollTimeRef.current
    );
    
    if (isManual && playbackStatus === 'playing') {
      scrollState.setAutoScrollEnabled(false);
    }
    
    setScrollX(newScrollX);
  }, [playbackStatus, scrollState]);
  
  // Re-enable auto-scroll on playback stop/start
  useEffect(() => {
    if (playbackStatus === 'stopped' || 
        (playbackStatus === 'playing' && !scrollState.autoScrollEnabled)) {
      scrollState.setAutoScrollEnabled(true);
    }
  }, [playbackStatus]);
  
  return (
    <div
      ref={containerRef}
      style={{
        width: propsViewportWidth ?? '100%',
height: viewportHeight,
        overflowX: 'auto',
        overflowY: 'hidden',
        border: '1px solid #ccc',
      }}
      className="staff-notation-container"  // NEW: For CSS optimization
      onScroll={handleScroll}
    >
      {/* NEW: Resume auto-scroll button (shown when disabled during playback) */}
      {playbackStatus === 'playing' && !scrollState.autoScrollEnabled && (
        <button
          onClick={() => scrollState.setAutoScrollEnabled(true)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 10,
          }}
        >
          Resume Auto-Scroll
        </button>
      )}
      
      <NotationRenderer
        layout={layout}
        selectedNoteId={selectedNoteId}
        onNoteClick={handleNoteClick}
        scrollX={scrollX}
        notes={notes}
        pixelsPerTick={DEFAULT_STAFF_CONFIG.pixelsPerTick}
        highlightedNoteIds={scrollState.highlightedNoteIds}  // NEW: Feature 009
      />
    </div>
  );
};
```

---

### Phase 5: Integration Test (30 min)

Create `frontend/tests/integration/playback-scroll.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { StaffNotation } from '../../src/components/notation/StaffNotation';
import type { Note } from '../../src/types/score';

describe('Playback Scroll Integration', () => {
  const mockNotes: Note[] = Array.from({ length: 100 }, (_, i) => ({
    id: `note-${i}`,
    pitch: 60 + (i % 12),
    start_tick: i * 1000,
    duration_ticks: 960,
  }));

  it('should auto-scroll during playback', async () => {
    const { container, rerender } = render(
      <StaffNotation
        notes={mockNotes}
        clef="Treble"
        currentTick={0}
        playbackStatus="stopped"
      />
    );
    
    const scrollContainer = container.querySelector('.staff-notation-container') as HTMLDivElement;
    expect(scrollContainer.scrollLeft).toBe(0);
    
    // Start playback and advance tick
    rerender(
      <StaffNotation
        notes={mockNotes}
        clef="Treble"
        currentTick={50000}  // Far into the score
        playbackStatus="playing"
      />
    );
    
    // ScrollLeft should have increased
    expect(scrollContainer.scrollLeft).toBeGreaterThan(0);
  });

  it('should highlight notes at current tick', () => {
    const { container } = render(
      <StaffNotation
        notes={mockNotes}
        clef="Treble"
        currentTick={1000}  // Second note playing
        playbackStatus="playing"
      />
    );
    
    const highlightedNotes = container.querySelectorAll('.note-head.highlighted');
    expect(highlightedNotes.length).toBeGreaterThan(0);
  });
});
```

**Run integration tests**:
```bash
npm test -- playback-scroll.test.tsx
```

---

## Testing & Verification

### Manual Testing

1. **Start frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Load a score** with multiple measures (at least 10)

3. **Click Play** and observe:
   - Viewport automatically scrolls horizontally
   - Current notes show green highlight
   - Scroll follows playback position

4. **Test manual override**:
   - During playback, manually scroll away
   - "Resume Auto-Scroll" button appears
   - Click button to re-enable auto-scroll

5. **Test tempo integration** (Feature 008):
   - Adjust tempo while playing
   - Scroll speed adapts automatically

### Automated Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- ScrollController.test.ts
npm test -- NoteHighlightService.test.ts
npm test -- playback-scroll.test.tsx

# Run with coverage
npm test -- --coverage
```

---

## Troubleshooting

### Scroll is janky / not smooth

- Check frame rate: Open Chrome DevTools → Performance tab → Record during playback
- Verify currentTick updates at 30 Hz (not faster)
- Ensure React.memo is applied to NotationRenderer
- Check CSS `will-change` is applied to scroll container

### Highlight not appearing

- Verify CSS is loaded (check `.note-head.highlighted` in DevTools)
- Check `highlightedNoteIds` prop is passed to NotationRenderer
- Verify NoteHighlightService identifies notes correctly (add console.log)

### Manual scroll override not working

- Check `lastAutoScrollTimeRef` is updated when setting scrollLeft
- Verify 100ms threshold in isManualScroll()
- Test with longer threshold (e.g., 200ms) if needed

### Performance issues with large scores

- Profile with Chrome DevTools → Performance tab
- Check note count (should be <2000 for target performance)
- Verify virtual scrolling is working (Feature 002 US4)
- Consider reducing highlight update frequency

---

## Next Steps

After MVP (User Stories 1-2) is working:

1. **User Story 3**: Add comfortable reading context adjustments
2. **User Story 4**: Polish manual scroll override UX
3. **Performance optimization**: Profile and optimize if needed
4. **Accessibility**: Test with screen readers and keyboard navigation

---

## Summary

You've now implemented:
✅ Automatic horizontal scrolling synchronized with playback  
✅ Visual note highlighting showing currently playing notes  
✅ Manual scroll override with resume button  
✅ Integration with tempo change feature  
✅ Comprehensive testing suite

The feature enhances the practice experience by providing hands-free music following with precise visual feedback.
