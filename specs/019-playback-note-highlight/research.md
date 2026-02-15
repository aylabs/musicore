# Research: Playback Note Highlighting

**Feature**: 019-playback-note-highlight  
**Created**: 2026-02-15  
**Status**: Complete

## Research Overview

This document consolidates research findings for implementing real-time note highlighting during playback. The feature leverages existing infrastructure (MusicTimeline with 60 Hz currentTick updates, LayoutRenderer for SVG note display) and focuses on efficient state management and visual rendering.

## Research Tasks

### 1. Note Highlighting Algorithm: Efficient Lookup at 60 Hz

**Question**: What is the most efficient approach to determine which notes should be highlighted given a currentTick value, when this calculation happens 60 times per second?

**Research Findings**:

**Algorithm Options**:
- **Linear scan** (O(n)): Iterate through all notes, check `currentTick >= start_tick && currentTick < end_tick`
- **Binary search** (O(log n)): Pre-sort notes by start_tick, binary search for current position
- **Index structure** (O(1) amortized): Build tick-to-note lookup map
- **Interval tree** (O(log n + k)): Specialized data structure for interval queries

**Performance Analysis**:
- For typical scores (100-500 notes): Linear scan performs well (<1ms on modern devices)
- For dense scores (1000+ notes): Linear scan still acceptable (~2-5ms) but noticeable
- React's useMemo can cache the highlighted set until currentTick changes
- Most notes are not simultaneously playing, so result sets are small (1-20 notes typically)

**Decision**: **Linear scan with useMemo optimization**

**Rationale**: 
- Simple implementation, easy to test and maintain
- Performance is acceptable for target scale (up to 1000 measures = ~4000 notes max)
- React's useMemo ensures calculation only occurs when currentTick changes
- Can optimize later if profiling reveals performance issues (premature optimization avoided)

**Implementation Approach**:
```typescript
const highlightedNoteIds = useMemo(() => {
  return notes
    .filter(note => 
      currentTick >= note.start_tick && 
      currentTick < note.start_tick + note.duration_ticks
    )
    .map(note => note.id);
}, [notes, currentTick]);
```

---

### 2. React Performance: Managing 60 Hz State Updates

**Question**: How can we ensure 60 Hz highlight updates don't cause performance issues or unnecessary re-renders in React?

**Research Findings**:

**React Rendering Concerns**:
- 60 Hz = 16.67ms intervals; React render must complete in <16ms to maintain smoothness
- Unnecessary re-renders of entire score would cause jank
- Need to isolate highlight state updates to minimize component re-renders

**Best Practices**:
- **React Context with selective subscription**: Use context for highlight state, memoize components
- **Component memoization**: Wrap note components in React.memo with custom comparison
- **Virtual DOM optimization**: React's diffing is fast for class/style changes on existing elements
- **RequestAnimationFrame batching**: React 18 automatic batching handles this
- **Refs for non-visual state**: Use refs for intermediate state if needed

**Decision**: **React Context + React.memo + useMemo for highlight calculation**

**Rationale**:
- Context provides clean separation between playback state and rendering
- React.memo on NoteElement prevents re-renders when highlight state hasn't changed
- useMemo for filtering notes ensures calculation only runs when currentTick changes
- Existing MusicTimeline already updates at 60 Hz successfully (Feature 009 precedent)

**Implementation Pattern**:
```typescript
// Context for highlight state
const HighlightContext = createContext<Set<string>>(new Set());

// In parent component (App or ScoreView)
const highlightedNoteIds = useNoteHighlight(notes, currentTick);

// In LayoutRenderer
const NoteElement = React.memo(({ note, isHighlighted }) => {
  return <g className={isHighlighted ? 'note highlighted' : 'note'}>...</g>;
}, (prev, next) => prev.isHighlighted === next.isHighlighted && prev.note.id === next.note.id);
```

---

### 3. Visual Highlighting Approach: CSS vs Inline Styles

**Question**: What is the best approach for applying visual highlighting to SVG note elements?

**Research Findings**:

**Approach Options**:
- **CSS class toggle**: Add/remove `highlighted` class to SVG elements
- **Inline styles**: Apply style prop with highlight color
- **SVG filters**: Use SVG <filter> element for glow/shadow effects
- **Overlay elements**: Render separate highlighted shapes on top

**Visual Design Requirements** (from spec FR-010):
- Sufficient contrast in all contexts
- No obscuring of note details
- Clear distinction from non-highlighted notes
- Works on different background colors

**Common Approaches in Music Apps**:
- MuseScore: Background color change (yellow highlight)
- SmartMusic: Border/outline highlight
- Noteflight: Background fill with opacity
- Sibelius: Color change with slight glow

**Decision**: **CSS class toggle with background fill + stroke emphasis**

**Rationale**:
- CSS provides declarative styling, easy to theme/customize
- Class toggle is performant (browser optimized for class changes)
- Can use CSS transitions for smooth highlight appearance (optional)
- Separation of concerns (styling in CSS, logic in JS)
- Easy to test (check className attribute)

**CSS Implementation**:
```css
/* Default note appearance */
.note {
  fill: #000;
  stroke: #000;
}

/* Highlighted note appearance */
.note.highlighted {
  fill: #4A90E2;        /* Blue fill */
  stroke: #2E5C8A;      /* Darker blue stroke */
  stroke-width: 2;       /* Emphasis */
}

/* Optional: Smooth transition */
.note {
  transition: fill 50ms ease-out, stroke 50ms ease-out;
}
```

**Alternatives Considered**:
- Inline styles: Rejected (harder to maintain, less performant, no CSS transitions)
- SVG filters: Rejected (too complex for initial implementation, can add later for polish)
- Overlay: Rejected (requires duplicate geometry, harder to maintain sync)

---

### 4. Integration with Existing Playback System

**Question**: How does this feature integrate with the existing MusicTimeline and playback infrastructure?

**Research Findings**:

**Existing Playback Architecture** (Feature 003, 009):
- `MusicTimeline.ts`: Broadcasts currentTick at 60 Hz during playback (Feature 009 T006)
- `usePlayback()` hook: Returns `{ status, currentTick, play, pause, stop }`
- `TempoStateContext`: Manages tempo multiplier for playback speed changes
- Already handles pause (maintains highlight), stop (clears position), seek (updates currentTick)

**Integration Points**:
1. **Consume currentTick**: `usePlayback()` already provides this
2. **Calculate highlights**: New `useNoteHighlight(notes, currentTick)` hook
3. **Pass to renderer**: LayoutRenderer receives highlightedNoteIds as prop
4. **Apply visual styling**: NoteElement checks if its ID is in highlightedNoteIds set

**Playback State Handling**:
- **Playing**: Highlights update as currentTick changes (60 Hz)
- **Paused**: Highlights remain static (currentTick frozen)
- **Stopped**: currentTick = 0, no notes highlighted
- **Seeking**: currentTick jumps, highlights immediately update

**Decision**: **New custom hook `useNoteHighlight` to bridge playback and rendering**

**Rationale**:
- Clean separation of concerns (hook handles filtering logic)
- Testable in isolation
- Composable with existing usePlayback hook
- Follows existing patterns in codebase

**Integration Flow**:
```typescript
// In App.tsx or ScoreView.tsx
const { currentTick, status } = usePlayback(notes, tempo);
const highlightedNoteIds = useNoteHighlight(notes, currentTick, status);

// Pass to renderer
<LayoutRenderer 
  layoutData={layoutData} 
  highlightedNoteIds={highlightedNoteIds}
/>

// In LayoutRenderer
notes.forEach(note => {
  const isHighlighted = highlightedNoteIds.has(note.id);
  // Render with isHighlighted prop
});
```

---

### 5. Handling Edge Cases

**Question**: How do we handle the edge cases identified in the spec (tied notes, grace notes, tempo changes, seeking)?

**Research Findings**:

**Tied Notes** (FR-011):
- Current data model: Each note has start_tick and duration_ticks
- Tied notes: Represented as separate Note entities with visual tie indicator
- Highlighting behavior: Each tied note highlighted independently based on its tick range
- Result: Natural highlighting across tied notes (first note highlights, then second note)

**Grace Notes** (FR-011):
- Grace notes: Very short duration (typically 1-60 ticks)
- May not be visible at 60 Hz if duration < 16ms
- Solution: Highlighting will be brief but present (correct behavior)
- No special handling needed (linear scan captures them)

**Tempo Changes** (FR-009):
- Tempo changes affect audio playback speed (via TempoState.tempoMultiplier)
- MusicTimeline already adjusts currentTick based on tempo multiplier (Feature 008 T015)
- Highlighting automatically stays synchronized (uses same currentTick)
- No additional code needed

**Seeking** (FR-006):
- User jumps to different position in score
- MusicTimeline immediately updates currentTick
- useMemo dependency on currentTick triggers highlight recalculation
- Result: Instantaneous highlight update (within one React render cycle)

**Repeats/Navigation** (FR-012):
- Current playback plays linearly through note array
- Repeats/da capo not yet implemented in playback system
- When implemented, MusicTimeline will update currentTick to navigate
- Highlighting will automatically follow (no special handling needed)

**Decision**: **No special edge case handling required in Phase 1**

**Rationale**:
- Most edge cases are naturally handled by the tick-based algorithm
- Tied notes work correctly with existing data model
- Tempo changes already synchronized via shared currentTick
- Future playback enhancements (repeats) will automatically work

---

## Summary of Decisions

| Research Area | Decision | Key Benefit |
|--------------|----------|-------------|
| Highlight Algorithm | Linear scan + useMemo | Simple, maintainable, sufficient performance |
| React Performance | Context + React.memo | Prevents unnecessary re-renders |
| Visual Styling | CSS class toggle | Declarative, performant, themeable |
| Playback Integration | Custom useNoteHighlight hook | Clean separation, testable |
| Edge Cases | No special handling needed | Leverages existing infrastructure |

## Implementation Approach

1. **Create useNoteHighlight hook**: Filter notes by currentTick, return Set of IDs
2. **Update LayoutRenderer**: Accept highlightedNoteIds prop, pass to NoteElement
3. **Update NoteElement**: Accept isHighlighted prop, apply CSS class
4. **Add CSS styles**: Define .note.highlighted styles
5. **Wire up in App**: Connect playback state to renderer

## Performance Validation

**Expected Performance** (based on research):
- Highlight calculation: <2ms for 1000 notes (linear scan + useMemo)
- React render: <5ms (only className changes, no layout shifts)
- Total overhead: <7ms per frame (well under 16ms budget for 60fps)

**Validation Plan**:
- Unit tests: Verify correct notes highlighted for various currentTick values
- Integration tests: Verify synchronization with actual playback
- Performance tests: Measure rendering time with React Profiler
- Manual testing: Visual inspection on dense scores

## References

- Feature 003: Music Playback (playback controls, timing)
- Feature 009: Playback Scroll and Highlight (60 Hz currentTick broadcast)
- React 18 documentation: useMemo, React.memo, performance optimization
- SVG specification: CSS styling of SVG elements
- Existing codebase: MusicTimeline.ts, LayoutRenderer.tsx, usePlayback hook
