# Data Model: Playback Scroll and Highlight

**Feature**: 009-playback-scroll-highlight  
**Date**: 2026-02-09  
**Purpose**: Define TypeScript interfaces, state structures, and algorithms for playback visualization

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MusicTimeline Hook                           │
│  (Playback State: currentTick, status, tempo)                   │
│  - Updates currentTick at 30 Hz during playback                 │
│  - Integrates with Feature 008 tempoMultiplier                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ currentTick, notes, tempo
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              usePlaybackScroll Hook (NEW)                        │
│  - Coordinates scroll and highlight logic                       │
│  - Manages auto-scroll enabled state                            │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             │ currentTick                    │ currentTick, notes
             ▼                                ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│   ScrollController       │    │  NoteHighlightService        │
│  (NEW Service)           │    │  (NEW Service)               │
│  - calculateScroll()     │    │  - getPlayingNoteIds()       │
│  - Edge case handling    │    │  - Tick range filtering      │
└────────────┬─────────────┘    └────────────┬─────────────────┘
             │ targetScrollX                 │ highlightedNoteIds
             ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   StaffNotation Component                        │
│  - Applies scrollLeft to container                              │
│  - Passes highlightedNoteIds to NotationRenderer                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ highlightedNoteIds
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NotationRenderer Component                     │
│  - Applies .highlighted CSS class to matching note SVG elements │
└─────────────────────────────────────────────────────────────────┘
```

---

## Type Definitions

### Playback Scroll State

**Location**: `frontend/src/types/playback.ts` (extends existing file)

```typescript
/**
 * Auto-scroll configuration and state
 */
export interface ScrollState {
  /** Whether auto-scroll is currently enabled */
  enabled: boolean;
  
  /** Target scroll position in pixels (calculated from currentTick) */
  targetScrollX: number;
  
  /** Timestamp of last programmatic scroll update (for manual override detection) */
  lastAutoScrollTime: number;
}

/**
 * Scroll calculation configuration
 */
export interface ScrollConfig {
  /** Desired position ratio (0-1) for current playback position in viewport */
  targetPositionRatio: number;  // Default: 0.3 (30% from left)
  
  /** Pixels per tick from layout engine */
  pixelsPerTick: number;
  
  /** Viewport width in pixels */
  viewportWidth: number;
  
  /** Total score width in pixels (from NotationLayoutEngine) */
  totalWidth: number;
  
  /** Current horizontal scroll position in pixels */
  currentScrollX: number;
}

/**
 * Result of scroll position calculation
 */
export interface ScrollCalculation {
  /** Target scroll position in pixels (clamped to valid range) */
  scrollX: number;
  
  /** Whether scrolling should occur (false if score fits in viewport) */
  shouldScroll: boolean;
  
  /** Whether we're near the end of the score */
  nearEnd: boolean;
}
```

### Note Highlight State

**Location**: `frontend/src/types/notation/layout.ts` (extends existing file)

```typescript
/**
 * Highlight state for a note during playback
 */
export interface NoteHighlight {
  /** Note ID being highlighted */
  noteId: string;
  
  /** Start tick of the note */
  startTick: number;
  
  /** End tick of the note (start + duration) */
  endTick: number;
  
  /** Whether the note is currently playing */
  isPlaying: boolean;
}

/**
 * Highlight calculation result
 */
export interface HighlightResult {
  /** Array of note IDs currently playing */
  playingNoteIds: string[];
  
  /** Map of note ID to highlight state (for additional metadata if needed) */
  highlightMap: Map<string, NoteHighlight>;
}
```

---

## Service Interfaces

### ScrollController Service

**Location**: `frontend/src/services/playback/ScrollController.ts` (NEW)

```typescript
/**
 * ScrollController - Calculates target scroll position based on playback tick
 * 
 * Pure service with no React dependencies - testable in isolation
 */
export class ScrollController {
  /**
   * Calculate target scroll position for given playback tick
   * 
   * @param currentTick - Current playback position in ticks
   * @param config - Scroll configuration (viewport, scaling, etc.)
   * @returns Scroll calculation result with target position and flags
   * 
   * @example
   * ```typescript
   * const result = ScrollController.calculateScrollPosition(1920, {
   *   targetPositionRatio: 0.3,
   *   pixelsPerTick: 0.1,
   *   viewportWidth: 1200,
   *   totalWidth: 5000,
   *   currentScrollX: 0
   * });
   * 
   * if (result.shouldScroll) {
   *   container.scrollLeft = result.scrollX;
   * }
   * ```
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
    
    // Calculate pixel position of current note
    const noteX = currentTick * pixelsPerTick;
    
    // Check if score fits entirely in viewport (no scrolling needed)
    if (totalWidth <= viewportWidth) {
      return {
        scrollX: 0,
        shouldScroll: false,
        nearEnd: false,
      };
    }
    
    // Calculate target scroll position (note at targetPositionRatio from left)
    const targetScrollX = noteX - (viewportWidth * targetPositionRatio);
    
    // Clamp to valid scroll range [0, totalWidth - viewportWidth]
    const maxScrollX = totalWidth - viewportWidth;
    const clampedScrollX = Math.max(0, Math.min(targetScrollX, maxScrollX));
    
    // Determine if we're near the end of the score
    const remainingWidth = totalWidth - noteX;
    const nearEnd = remainingWidth < (viewportWidth * 0.7);
    
    return {
      scrollX: clampedScrollX,
      shouldScroll: true,
      nearEnd,
    };
  }
  
  /**
   * Detect if scroll event was user-initiated (not auto-scroll)
   * 
   * @param lastAutoScrollTime - Timestamp of last programmatic scroll
   * @param threshold - Time threshold in ms to consider scroll as manual
   * @returns True if scroll was likely manual
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

### NoteHighlightService

**Location**: `frontend/src/services/playback/NoteHighlightService.ts` (NEW)

```typescript
import type { Note } from '../../types/score';
import type { HighlightResult, NoteHighlight } from '../../types/notation/layout';

/**
 * NoteHighlightService - Identifies notes currently playing at given tick
 * 
 * Pure service with no React dependencies - testable in isolation
 */
export class NoteHighlightService {
  /**
   * Get IDs of notes currently playing at specified tick
   * 
   * A note is considered "playing" if: 
   * currentTick >= note.start_tick AND currentTick < note.start_tick + note.duration_ticks
   * 
   * @param notes - Array of all notes in the score
   * @param currentTick - Current playback position in ticks
   * @param minimumDuration - Minimum highlight duration in ticks (for very short notes)
   * @returns Array of note IDs currently playing
   * 
   * @example
   * ```typescript
   * const notes = [
   *   { id: 'n1', start_tick: 0, duration_ticks: 960, pitch: 60 },
   *   { id: 'n2', start_tick: 500, duration_ticks: 960, pitch: 62 },
   * ];
   * 
   * const playing = NoteHighlightService.getPlayingNoteIds(notes, 600);
   * // Returns: ['n1', 'n2'] (both notes overlap at tick 600)
   * ```
   */
  public static getPlayingNoteIds(
    notes: Note[],
    currentTick: number,
    minimumDuration: number = 100  // ~100ms minimum visual feedback
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
   * Get detailed highlight information for analysis/debugging
   * 
   * @param notes - Array of all notes in the score
   * @param currentTick - Current playback position in ticks
   * @returns Detailed highlight result with note metadata
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

---

## React Hook Interface

### usePlaybackScroll Hook

**Location**: `frontend/src/services/hooks/usePlaybackScroll.ts` (NEW)

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollController } from '../playback/ScrollController';
import { NoteHighlightService } from '../playback/NoteHighlightService';
import type { Note } from '../../types/score';
import type { ScrollState, ScrollConfig } from '../../types/playback';

/**
 * Hook configuration
 */
export interface UsePlaybackScrollConfig {
  /** Current playback tick from MusicTimeline */
  currentTick: number;
  
  /** Playback status */
  status: 'stopped' | 'playing' | 'paused';
  
  /** Array of notes to track */
  notes: Note[];
  
  /** Layout configuration */
  layoutConfig: {
    pixelsPerTick: number;
    totalWidth: number;
  };
  
  /** Viewport dimensions */
  viewportWidth: number;
  
  /** Current scroll position (for manual override detection) */
  currentScrollX: number;
}

/**
 * Hook return value
 */
export interface PlaybackScrollState {
  /** Whether auto-scroll is currently enabled */
  autoScrollEnabled: boolean;
  
  /** Target scroll position (apply to container.scrollLeft) */
  targetScrollX: number;
  
  /** Array of note IDs to highlight */
  highlightedNoteIds: string[];
  
  /** Enable/disable auto-scroll */
  setAutoScrollEnabled: (enabled: boolean) => void;
  
  /** Handle manual scroll events */
  handleScroll: (scrollX: number) => void;
}

/**
 * usePlaybackScroll - Coordinate scroll and highlight during playback
 * 
 * Manages auto-scroll state, calculates scroll position from currentTick,
 * identifies playing notes for highlighting, and handles manual scroll override.
 * 
 * @param config - Playback scroll configuration
 * @returns Scroll state and control functions
 * 
 * @example
 * ```typescript
 * const scrollState = usePlaybackScroll({
 *   currentTick: playbackState.currentTick,
 *   status: playbackState.status,
 *   notes: score.notes,
 *   layoutConfig: { pixelsPerTick: 0.1, totalWidth: 5000 },
 *   viewportWidth: 1200,
 *   currentScrollX: containerRef.current?.scrollLeft ?? 0,
 * });
 * 
 * // Apply scroll in effect
 * useEffect(() => {
 *   if (scrollState.autoScrollEnabled && containerRef.current) {
 *     containerRef.current.scrollLeft = scrollState.targetScrollX;
 *   }
 * }, [scrollState.targetScrollX, scrollState.autoScrollEnabled]);
 * ```
 */
export function usePlaybackScroll(
  config: UsePlaybackScrollConfig
): PlaybackScrollState;
```

---

## Component Prop Extensions

### StaffNotation Props (Modified)

**Location**: `frontend/src/components/notation/StaffNotation.tsx` (MODIFIED)

```typescript
export interface StaffNotationProps {
  // ... existing props
  
  /** Current playback tick (for scroll synchronization) */
  currentTick?: number;
  
  /** Playback status (for auto-scroll behavior) */
  playbackStatus?: 'stopped' | 'playing' | 'paused';
  
  /** Array of note IDs to highlight during playback */
  highlightedNoteIds?: string[];
}
```

### NotationRenderer Props (Modified)

**Location**: `frontend/src/components/notation/NotationRenderer.tsx` (MODIFIED)

```typescript
export interface NotationRendererProps {
  // ... existing props
  
  /** Array of note IDs to apply highlight styling */
  highlightedNoteIds?: string[];
}
```

---

## State Management Flow

### Playback → Scroll Flow

```typescript
// 1. MusicTimeline updates currentTick (30 Hz)
setCurrentTick(prevTick => prevTick + tickDelta);

// 2. usePlaybackScroll receives new currentTick
const scrollState = usePlaybackScroll({
  currentTick,  // Triggers recalculation
  status,
  notes,
  layoutConfig,
  viewportWidth,
  currentScrollX,
});

// 3. ScrollController calculates target position
const scrollCalc = ScrollController.calculateScrollPosition(currentTick, {
  targetPositionRatio: 0.3,
  pixelsPerTick: layoutConfig.pixelsPerTick,
  viewportWidth,
  totalWidth: layoutConfig.totalWidth,
});

// 4. StaffNotation applies scroll if auto-enabled
useEffect(() => {
  if (scrollState.autoScrollEnabled && containerRef.current) {
    containerRef.current.scrollLeft = scrollState.targetScrollX;
    lastAutoScrollTimeRef.current = Date.now();
  }
}, [scrollState.targetScrollX, scrollState.autoScrollEnabled]);
```

### Playback → Highlight Flow

```typescript
// 1. usePlaybackScroll calculates playing notes
const highlightedNoteIds = useMemo(() => {
  if (config.status !== 'playing') return [];
  
  return NoteHighlightService.getPlayingNoteIds(
    config.notes,
    config.currentTick
  );
}, [config.currentTick, config.notes, config.status]);

// 2. StaffNotation passes to NotationRenderer
<NotationRenderer
  layout={layout}
  highlightedNoteIds={scrollState.highlightedNoteIds}
  // ... other props
/>

// 3. NotationRenderer applies CSS class
{layout.notes.map(notePos => (
  <text
    key={notePos.noteId}
    className={`note-head ${
      highlightedNoteIds.includes(notePos.noteId) ? 'highlighted' : ''
    }`}
    // ... other props
  />
))}
```

### Manual Scroll Override Flow

```typescript
// 1. User scrolls container manually
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const newScrollX = e.currentTarget.scrollLeft;
  
  // 2. Detect if manual (not from our auto-scroll)
  const isManual = ScrollController.isManualScroll(
    lastAutoScrollTimeRef.current
  );
  
  if (isManual) {
    // 3. Disable auto-scroll
    scrollState.setAutoScrollEnabled(false);
  }
  
  // 4. Update scroll position state
  setScrollX(newScrollX);
};

// 5. Re-enable auto-scroll
// Option A: Explicit button
<button onClick={() => scrollState.setAutoScrollEnabled(true)}>
  Resume Auto-Scroll
</button>

// Option B: Auto re-enable on playback stop/start
useEffect(() => {
  if (playbackStatus === 'stopped' || playbackStatus === 'playing') {
    scrollState.setAutoScrollEnabled(true);
  }
}, [playbackStatus]);
```

---

## CSS Styling

### Highlight Animation

**Location**: `frontend/src/App.css` (MODIFIED)

```css
/* Note highlight during playback */
.note-head.highlighted {
  fill: #4CAF50;        /* Green tint for active note */
  opacity: 0.85;        /* Slightly transparent to preserve notation */
  stroke: #2E7D32;      /* Darker green outline */
  stroke-width: 2px;
  
  /* Smooth transition for highlight state changes */
  transition: 
    fill 0.1s ease-in,
    opacity 0.1s ease-in,
    stroke 0.1s ease-in;
}

/* Ensure highlighted notes are above non-highlighted (z-index via paint order) */
.note-head.highlighted {
  paint-order: stroke fill;
}

/* High contrast mode support (accessibility) */
@media (prefers-contrast: high) {
  .note-head.highlighted {
    fill: #1B5E20;       /* Darker green */
    opacity: 1.0;         /* Fully opaque */
    stroke: #000000;      /* Black outline */
    stroke-width: 3px;
  }
}
```

### Scroll Container Optimization

```css
/* Staff notation scroll container - optimize for smooth scrolling */
.staff-notation-container {
  /* Enable hardware acceleration for scrolling */
  will-change: scroll-position;
  
  /* Ensure smooth 60 FPS scroll updates */
  scroll-behavior: auto;  /* Direct updates, no CSS smoothing */
  
  /* Optimize rendering layers */
  transform: translateZ(0);
}
```

---

## Performance Considerations

### Memoization Strategy

```typescript
// In usePlaybackScroll hook
const targetScrollX = useMemo(() => {
  if (!config.status === 'playing') return config.currentScrollX;
  
  const scrollCalc = ScrollController.calculateScrollPosition(
    config.currentTick,
    {
      targetPositionRatio: 0.3,
      pixelsPerTick: config.layoutConfig.pixelsPerTick,
      viewportWidth: config.viewportWidth,
      totalWidth: config.layoutConfig.totalWidth,
    }
  );
  
  return scrollCalc.shouldScroll ? scrollCalc.scrollX : config.currentScrollX;
}, [config.currentTick, config.status, config.layoutConfig, config.viewportWidth]);

const highlightedNoteIds = useMemo(() => {
  if (config.status !== 'playing') return [];
  
  return NoteHighlightService.getPlayingNoteIds(
    config.notes,
    config.currentTick
  );
}, [config.currentTick, config.notes, config.status]);
```

### React.memo Optimization

```typescript
// NotationRenderer already uses React.memo (Feature 002 T066)
// Ensure props are stable to prevent unnecessary re-renders
export const NotationRenderer = React.memo(NotationRendererComponent, (prev, next) => {
  return (
    prev.layout === next.layout &&
    prev.selectedNoteId === next.selectedNoteId &&
    arraysEqual(prev.highlightedNoteIds, next.highlightedNoteIds)
  );
});
```

---

## Integration with Existing Features

### Feature 002 (Staff Notation View)

**Integration Points**:
- `NotationLayoutEngine.calculateLayout()` provides `totalWidth` and `pixelsPerTick`
- `StaffNotation` component manages scroll container
- `NotationRenderer` applies highlight CSS classes

**No Breaking Changes**: New props are optional with default values

### Feature 003 (Music Playback)

**Integration Points**:
- `MusicTimeline.currentTick` drives scroll and highlight
- `MusicTimeline.status` controls when scroll/highlight are active
- Playback callbacks trigger scroll position updates

**No Breaking Changes**: Feature only observes playback state

### Feature 008 (Tempo Change)

**Integration Points**:
- `tempoMultiplier` affects tick advancement rate
- Scroll speed automatically adjusts (based on currentTick)
- No explicit tempo handling needed in scroll/highlight code

**No Breaking Changes**: Feature is tempo-agnostic (tick-based)

---

## Invariants

### Scroll Position Accuracy

1. **Synchronization**: Scroll position MUST be within 50ms of audio playback position (spec SC-002)
2. **Boundary Respect**: scrollLeft MUST be clamped to [0, totalWidth - viewportWidth]
3. **Responsiveness**: Scroll calculations MUST complete within 1ms to maintain 60 FPS budget

### Highlight Correctness

1. **Timing Precision**: Note highlights MUST activate when `currentTick >= start_tick AND currentTick < start_tick + duration`
2. **Chord Support**: Multiple simultaneous notes MUST all be highlighted
3. **Minimum Duration**: Highlights MUST be visible for at least 100ms (perceivability threshold)

### State Consistency

1. **Auto-Scroll Lifecycle**: Auto-scroll MUST re-enable on playback stop/start unless explicitly disabled by user
2. **Manual Override**: Manual scroll detection MUST have 100ms threshold to avoid false positives
3. **Performance**: Update frequency capped at 30 Hz to balance smoothness and CPU usage

---

## Testing Requirements

### Unit Tests

- `ScrollController.calculateScrollPosition()` with various tick positions
- `ScrollController.isManualScroll()` threshold detection
- `NoteHighlightService.getPlayingNoteIds()` for single notes, chords, overlapping notes
- Edge cases: empty notes array, tick before first note, tick after last note

### Integration Tests

- Scroll synchronization during playback (measure scroll position vs currentTick)
- Highlight application (verify CSS classes added/removed at correct times)
- Manual scroll override (detect and disable auto-scroll)
- Tempo change integration (verify scroll speed adjusts)

### Performance Tests

- Frame rate monitoring during 5-second playback with 1000 notes
- Synchronization accuracy measurement (scroll position lag < 50ms)
- Memory profiling for potential leaks during extended playback

---

## Migration Path

### Existing Components

**No breaking changes required**:
- StaffNotation and NotationRenderer accept new optional props
- Existing usage without props continues to work
- Gradual adoption: Can enable scroll without highlight, or vice versa

### Future Enhancements

**Potential optimizations if performance issues arise**:
1. Spatial index for note lookup (O(log n) instead of O(n))
2. Intersection Observer for visibility detection
3. Worker thread for tick→pixel calculations
4. requestAnimationFrame throttling for scroll updates

---

## Summary

This data model defines the complete type system and state management for playback scroll and highlight. Key characteristics:

- **Pure services**: ScrollController and NoteHighlightService have no dependencies, fully testable
- **React integration**: usePlaybackScroll hook coordinates services with component lifecycle
- **Performance-first**: Memoization, React.memo, and 30 Hz throttling ensure 60 FPS
- **Non-breaking**: All changes are additive extensions to existing components
- **Accessible**: CSS supports high-contrast mode and non-color indicators
