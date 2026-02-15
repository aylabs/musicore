# Data Model: Playback Note Highlighting

**Feature**: 019-playback-note-highlight  
**Created**: 2026-02-15  
**Status**: Draft

## Overview

This feature introduces minimal new data model elements, primarily leveraging existing entities (Note, PlaybackState) and adding derived state for visual highlighting. The model maintains clear separation between playback timing (domain concern) and visual presentation (UI concern).

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      Playback System                         │
│  (Existing - Feature 003, 009)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MusicTimeline                                              │
│  ├── currentTick: number  (broadcasts at 60 Hz)            │
│  ├── status: 'stopped'|'playing'|'paused'                  │
│  └── tempo: number                                          │
│                                                              │
│  Note[]                                                      │
│  ├── id: string                                             │
│  ├── start_tick: number                                     │
│  ├── duration_ticks: number                                 │
│  └── pitch: number                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ consumes
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Highlight Logic (NEW)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  useNoteHighlight(notes, currentTick, status)               │
│  └── returns: Set<string>  (highlighted note IDs)           │
│                                                              │
│  Algorithm:                                                  │
│    filter notes where:                                       │
│      currentTick >= note.start_tick AND                     │
│      currentTick < note.start_tick + note.duration_ticks    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ provides
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Rendering Layer (UPDATED)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LayoutRenderer                                              │
│  └── highlightedNoteIds: Set<string>  (new prop)            │
│                                                              │
│  NoteElement                                                 │
│  └── isHighlighted: boolean  (new prop)                     │
│      └── applies CSS class: 'note highlighted'              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Entities

### 1. HighlightState (Derived State - Ephemeral)

**Description**: A set of note IDs that are currently highlighted during playback. This is computed state, not persisted.

**Attributes**:
- `highlightedNoteIds`: `Set<string>` - Set of note IDs currently playing

**Lifecycle**:
- Created: When playback status is 'playing' or 'paused'
- Updated: Every 16ms (60 Hz) when currentTick changes during playback
- Cleared: When playback status is 'stopped'
- Preserved: When playback status is 'paused' (static until resume or stop)

**Computation**:
```typescript
function computeHighlightedNotes(
  notes: Note[], 
  currentTick: number
): Set<string> {
  const highlighted = new Set<string>();
  
  for (const note of notes) {
    const noteEndTick = note.start_tick + note.duration_ticks;
    
    if (currentTick >= note.start_tick && currentTick < noteEndTick) {
      highlighted.add(note.id);
    }
  }
  
  return highlighted;
}
```

**Cardinality**:
- Typical: 1-20 notes (single melody line or simple harmony)
- Maximum: ~50 notes (dense orchestral chord with multiple voices)
- Empty set when no notes playing (gaps in music, stopped state)

**State Transitions**:
```
stopped → playing:   Set transitions from {} to computed highlighted notes
playing → paused:    Set preserved (static)
paused → playing:    Set resumes updating (from preserved state)
playing/paused → stopped: Set cleared to {}
seek (any time):     Set immediately recomputed for new currentTick
```

---

### 2. Note (Existing Entity - No Changes)

**Description**: Musical note with timing and pitch information. Existing domain entity from core music model.

**Relevant Attributes** (for highlighting):
- `id`: `string` - Unique identifier (UUID)
- `start_tick`: `number` - Note start position in PPQ (960 per quarter note)
- `duration_ticks`: `number` - Note duration in PPQ
- `pitch`: `number` - MIDI pitch number (21-108)

**Derived Attributes** (computed, not stored):
- `end_tick`: `number` = `start_tick + duration_ticks`
- `isCurrentlyPlaying(currentTick)`: `boolean` = `currentTick >= start_tick && currentTick < end_tick`

**No changes to Note entity**: Highlighting is a presentation concern, not part of the domain model. Notes don't know about highlighting state.

---

### 3. PlaybackState (Existing Entity - No Changes)

**Description**: Current state of music playback. Existing entity from Feature 003.

**Relevant Attributes** (for highlighting):
- `currentTick`: `number` - Current playback position (0 to max_tick)
- `status`: `'stopped' | 'playing' | 'paused'` - Playback state

**Usage for Highlighting**:
- `currentTick` is the primary input for determining which notes to highlight
- `status` determines whether highlighting should update (playing) or remain static (paused) or clear (stopped)

---

## Data Flow

### 1. Playback → Highlight Calculation

```typescript
// In App.tsx or ScoreView.tsx
const { currentTick, status } = usePlayback(notes, tempo);

// Custom hook: derives highlight state from playback state
const highlightedNoteIds = useNoteHighlight(notes, currentTick, status);
```

**Frequency**: 60 times per second during playback (driven by MusicTimeline's interval)

**Performance**: 
- Input: Array of 1000-4000 notes, currentTick value
- Processing: Linear scan with early termination
- Output: Set with 1-50 note IDs
- Time: <2ms (well under 16ms frame budget)

---

### 2. Highlight State → Rendering

```typescript
// In LayoutRenderer.tsx
<LayoutRenderer 
  layoutData={layoutData}
  highlightedNoteIds={highlightedNoteIds}  // NEW PROP
/>

// In NoteElement.tsx (child of LayoutRenderer)
function NoteElement({ note, highlightedNoteIds }: Props) {
  const isHighlighted = highlightedNoteIds.has(note.id);
  
  return (
    <g className={isHighlighted ? 'note highlighted' : 'note'}>
      {/* SVG note rendering */}
    </g>
  );
}
```

**Update Trigger**: React's automatic re-rendering when highlightedNoteIds changes

**Optimization**: React.memo on NoteElement prevents re-renders when highlight state hasn't changed for that specific note

---

## State Management Strategy

### Option A: Local State (Simpler)

```typescript
// In parent component (App.tsx or ScoreView.tsx)
const highlightedNoteIds = useNoteHighlight(notes, currentTick, status);

// Pass as prop to renderer
<LayoutRenderer highlightedNoteIds={highlightedNoteIds} />
```

**Pros**: Simple, no context overhead, clear data flow
**Cons**: Limited to single component tree

### Option B: React Context (More Flexible)

```typescript
// Context provider
const HighlightContext = createContext<Set<string>>(new Set());

// In parent
const highlightedNoteIds = useNoteHighlight(notes, currentTick, status);
<HighlightContext.Provider value={highlightedNoteIds}>
  <LayoutRenderer />
</HighlightContext.Provider>

// In deeply nested components
const highlightedNoteIds = useContext(HighlightContext);
```

**Pros**: Accessible from any component, decoupled
**Cons**: More boilerplate, potential for overuse

### Decision: **Option A (Local State) for initial implementation**

**Rationale**:
- Simpler implementation, easier to test
- Clear parent-to-child data flow
- Sufficient for current needs (single LayoutRenderer)
- Can refactor to Context later if needed without breaking contracts

---

## Validation Rules

### Highlight State Invariants

1. **Only existing notes can be highlighted**:
   - `highlightedNoteIds ⊆ notes.map(n => n.id)`
   - Invalid note IDs should never appear in the set

2. **Highlighting respects playback state**:
   - `status === 'stopped'` → `highlightedNoteIds.size === 0`
   - `status === 'playing'` → `highlightedNoteIds` computed from currentTick
   - `status === 'paused'` → `highlightedNoteIds` static (preserved from last playing state)

3. **Temporal consistency**:
   - For any `noteId ∈ highlightedNoteIds`:
     - `note.start_tick <= currentTick < note.start_tick + note.duration_ticks`
   - Equivalently: A note is highlighted iff it's actively playing at currentTick

4. **Set uniqueness**:
   - Set automatically ensures uniqueness (no duplicate IDs)
   - Each note ID appears at most once

---

## Testing Strategy

### Unit Tests (Data Model Logic)

```typescript
describe('useNoteHighlight', () => {
  it('returns empty set when currentTick is before all notes', () => {
    const notes = [
      { id: '1', start_tick: 960, duration_ticks: 480 },
      { id: '2', start_tick: 1440, duration_ticks: 480 }
    ];
    const result = computeHighlightedNotes(notes, 0);
    expect(result.size).toBe(0);
  });

  it('highlights single note when currentTick is within note range', () => {
    const notes = [
      { id: '1', start_tick: 960, duration_ticks: 480 },
      { id: '2', start_tick: 1440, duration_ticks: 480 }
    ];
    const result = computeHighlightedNotes(notes, 1000);
    expect(result).toEqual(new Set(['1']));
  });

  it('highlights multiple notes when they overlap', () => {
    const notes = [
      { id: '1', start_tick: 0, duration_ticks: 1920 },    // Long note
      { id: '2', start_tick: 960, duration_ticks: 480 },   // Overlaps with note 1
      { id: '3', start_tick: 1440, duration_ticks: 480 }   // Also overlaps with note 1
    ];
    const result = computeHighlightedNotes(notes, 1000);
    expect(result).toEqual(new Set(['1', '2']));
  });

  it('unhighlights note when currentTick reaches note end', () => {
    const notes = [
      { id: '1', start_tick: 960, duration_ticks: 480 }
    ];
    const result = computeHighlightedNotes(notes, 1440); // Exactly at end
    expect(result.size).toBe(0); // Note should be unhighlighted
  });
});
```

### Integration Tests

- Verify highlight state updates during actual playback
- Test pause/resume preserves highlight state
- Test stop clears highlight state
- Test seeking immediately updates highlights

### Performance Tests

- Measure computation time for 1000, 2000, 4000 notes
- Verify React renders complete within 16ms frame budget
- Profile with React DevTools Profiler

---

## Persistence

**Decision**: No persistence required

**Rationale**:
- Highlight state is ephemeral (only exists during playback)
- Completely derived from currentTick and notes array
- No user preferences or customization for highlights in initial version
- Can be added later if needed (e.g., user chooses highlight color)

---

## Future Extensions

### Potential Enhancements (Out of Scope for Initial Implementation)

1. **Highlight customization**:
   - User-configurable highlight colors
   - Multiple highlight styles (fill, outline, glow)
   - Per-instrument highlight colors (different colors for different voices)

2. **Performance optimizations**:
   - Spatial indexing for very large scores (10,000+ notes)
   - Web Workers for highlight computation (if needed)
   - Incremental updates (only recompute when currentTick crosses note boundaries)

3. **Advanced features**:
   - Highlight intensity based on note velocity/dynamics
   - Ghost highlights (show recently played notes with fade-out)
   - Ahead-of-time highlighting (show upcoming notes before they play)

4. **Accessibility**:
   - High-contrast mode support
   - User-defined highlight colors for color blindness
   - ARIA attributes for screen readers announcing current notes

These extensions would require additional data model changes (e.g., HighlightPreferences entity) but are not needed for the core functionality.

---

## Conclusion

The data model for playback note highlighting is intentionally minimal, leveraging existing entities and introducing only derived state (Set of highlighted note IDs). This approach:

- Maintains separation of concerns (domain vs. presentation)
- Avoids polluting the core music model with UI concerns
- Enables efficient computation and rendering
- Supports all required functional requirements (FR-001 through FR-014)
- Allows future enhancements without breaking changes

**Next Steps**: Phase 1 continues with contracts/ (TypeScript interfaces) and quickstart.md (implementation guide).
