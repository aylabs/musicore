# Data Model: Stacked Staves View

**Phase**: 1 - Design & Contracts  
**Date**: 2026-02-09  
**Status**: Complete

## Overview

This document defines the component data model, state flows, and prop interfaces for the Stacked Staves View feature. No backend data model changes are required - this feature operates entirely on existing `Score` domain entities.

---

## Component Hierarchy

```
ScoreViewer (enhanced)
├─ ViewModeSelector (new)
├─ PlaybackControls (existing, shared)
├─ InstrumentList (existing, for individual view)
└─ StackedStaffView (new, for stacked view)
   └─ StaffGroup[] (new, one per staff)
      ├─ Staff Label
      └─ MultiVoiceStaff (new)
         └─ StaffNotation (existing, reused)
            └─ NotationRenderer (existing, reused)
```

---

## Component Data Models

### ViewModeSelector (New Component)

**Purpose**: Toggle between Individual and Stacked views

**Props**:
```typescript
interface ViewModeSelectorProps {
  currentMode: 'individual' | 'stacked';
  onChange: (mode: 'individual' | 'stacked') => void;
}
```

**State**: None (stateless controlled component)

**Events**:
- `onChange`: Fired when user clicks view mode button

**Responsibilities**:
- Render two buttons/tabs for view selection
- Highlight active view mode
- Emit mode change events

---

### StackedStaffView (New Component)

**Purpose**: Container for vertically stacked staff groups

**Props**:
```typescript
interface StackedStaffViewProps {
  score: Score;                     // Full score with all instruments
  currentTick?: number;             // Playback position (from usePlayback)
  playbackStatus?: PlaybackStatus;  // Playback state (from usePlayback)
  onSeekToTick?: (tick: number) => void;     // Click-to-seek callback
  onUnpinStartTick?: () => void;    // Deselect note callback
}
```

**State**:
```typescript
{
  visibleStaffIndices: number[];    // Virtualization: which staves to render
  scrollPosition: number;           // Current vertical scroll position
}
```

**Derived Data**:
- `allStaves: Staff[]` - Flatten score.instruments[].staves[] into single array
- `activeStaffIndex: number` - Index of topmost staff with notes at currentTick

**Responsibilities**:
- Flatten score into staff list ordered by instrument/staff hierarchy
- Track scroll position for virtualization
- Render visible StaffGroup components
- Auto-scroll to active staff during playback

---

### StaffGroup (New Component)

**Purpose**: Single staff with instrument name label

**Props**:
```typescript
interface StaffGroupProps {
  instrumentName: string;           // e.g., "Piano", "Violin I"
  staff: Staff;                     // Staff entity from Score
  staffIndex: number;               // Position in flattened staff list
  isFirstStaffOfInstrument: boolean; // Show label only for first staff
  currentTick?: number;             // For playback highlighting
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void;
  onUnpinStartTick?: () => void;
}
```

**State**: None (passes props down)

**Layout**:
- CSS Grid: `[Label 200px] [Staff 1fr]`
- Label spans multiple rows if instrument has multiple staves (e.g., Piano)

**Responsibilities**:
- Render instrument name label (with truncation)
- Render MultiVoiceStaff with playback integration
- Apply CSS bracket styling for multi-staff instruments

---

### MultiVoiceStaff (New Component)

**Purpose**: Merge all voices in a staff and render via StaffNotation

**Props**:
```typescript
interface MultiVoiceStaffProps {
  voices: Voice[];                  // All voices from staff
  clef: string;                     // Clef from staff structural events
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void;
  onUnpinStartTick?: () => void;
}
```

**Derived Data**:
```typescript
{
  mergedNotes: Note[];  // Concatenate voices[].interval_events[]
}
```

**Responsibilities**:
- Flatten all voice notes into single array
- Pass merged notes to StaffNotation for rendering
- Preserve note order by start_tick (sorted)

---

## State Management

### View Mode State (ScoreViewer)

```typescript
// In ScoreViewer component
const [viewMode, setViewMode] = useState<'individual' | 'stacked'>('individual');
```

**State Transitions**:
- User clicks "Individual" button → `setViewMode('individual')`
- User clicks "Stacked" button → `setViewMode('stacked')`
- View mode persists during playback (playback state unaffected)

**Conditional Rendering**:
```typescript
{viewMode === 'individual' && (
  <InstrumentList instruments={score.instruments} ... />
)}

{viewMode === 'stacked' && (
  <StackedStaffView score={score} ... />
)}
```

---

### Playback State (Existing, Unchanged)

Playback state managed by `usePlayback` hook in ScoreViewer:

```typescript
const playbackState = usePlayback(allNotes, initialTempo);

// Passed down to both views identically
<StackedStaffView 
  currentTick={playbackState.currentTick}
  playbackStatus={playbackState.status}
  onSeekToTick={playbackState.seekToTick}
  onUnpinStartTick={playbackState.unpinStartTick}
/>
```

**Key Invariant**: Playback state is global (not view-specific). Switching views does NOT reset:
- `playbackState.status` (playing/paused/stopped)
- `playbackState.currentTick` (current position)
- `pinnedStartTickRef` (persistent start position from selected note)

---

### Scroll State (StackedStaffView)

```typescript
const [scrollPosition, setScrollPosition] = useState(0);

// Track scroll events
useEffect(() => {
  const handleScroll = () => setScrollPosition(container.scrollTop);
  container.addEventListener('scroll', handleScroll);
  return () => container.removeEventListener('scroll', handleScroll);
}, []);

// Virtualization: Compute visible staff indices
const visibleStaffIndices = useMemo(() => {
  const staffHeight = 200; // pixels per staff
  const startIndex = Math.floor(scrollPosition / staffHeight) - 2; // buffer
  const endIndex = startIndex + 10; // render ~10 staves
  return range(Math.max(0, startIndex), Math.min(allStaves.length, endIndex));
}, [scrollPosition, allStaves.length]);
```

---

## Data Flow Diagrams

### View Mode Switch Flow

```
User clicks "Stacked" button
  ↓
ViewModeSelector.onChange('stacked')
  ↓
ScoreViewer.setViewMode('stacked')
  ↓
ScoreViewer re-renders
  ↓
StackedStaffView component mounts
  ↓
Playback state preserved (no interruption)
```

### Playback Integration Flow

```
PlaybackControls: User clicks Play
  ↓
playbackState.play() → starts 60 Hz tick updates
  ↓
ScoreViewer re-renders with new currentTick
  ↓
StackedStaffView receives updated currentTick prop
  ↓
For each visible StaffGroup:
  ↓
  MultiVoiceStaff receives currentTick
    ↓
    StaffNotation highlights notes at currentTick (green)
```

### Click-to-Seek Flow

```
User clicks note in any staff
  ↓
StaffNotation.onNoteClick(noteId)
  ↓
Find clicked note → onSeekToTick(note.start_tick)
  ↓
playbackState.seekToTick(tick) → updates currentTick + pins position
  ↓
All StaffGroups re-render with new currentTick
  ↓
Clicked note highlighted across all staves (if present at that tick)
```

---

## Key Entities (Frontend)

### ViewMode (Type Alias)
```typescript
type ViewMode = 'individual' | 'stacked';
```
- **Purpose**: Discriminator for which view is active
- **Lifecycle**: Ephemeral session state, not persisted

### FlattenedStaff (Derived Entity)
```typescript
interface FlattenedStaff {
  instrumentName: string;
  instrumentIndex: number;
  staff: Staff;
  staffIndex: number;
  isFirstStaffOfInstrument: boolean;
}
```
- **Purpose**: Simplified representation for stacked rendering
- **Source**: Derived from `Score.instruments[].staves[]` in StackedStaffView
- **Lifecycle**: Computed on every render (memoized)

---

## Validation Rules

### Multi-Voice Rendering
- **Rule**: All voices within a staff MUST render on same canvas
- **Validation**: Verify no visual overlap by testing with 2+ voice staff
- **Test Case**: Piano treble staff with 3 voices, verify stems direction alternates

### Playback State Preservation
- **Rule**: View mode switch MUST NOT alter playback state
- **Validation**: Switch views during playback, verify:
  - `currentTick` unchanged
  - `status` unchanged (playing → still playing)
  - Audio continues without interruption

### Staff Order
- **Rule**: Staves MUST appear in same order as `score.instruments[]` array
- **Validation**: Load score with 3 instruments, verify stacked view order matches

---

## Performance Constraints

### Rendering Budget
- **Target**: 16ms per frame (60fps)
- **Allocation**:
  - Staff virtualization: 1ms (compute visible indices)
  - Canvas rendering: 10-12ms (5-8 visible staves × 1.5ms each)
  - React reconciliation: 2-3ms
  - Total: <16ms ✅

### Memory Constraints
- **FlattenedStaff array**: O(n) where n = total staves (~50 max = ~10KB)
- **Virtualization**: Only render visible staves (5-8 typical) = ~80% memory savings vs rendering all 50

---

## Open Questions for Implementation

1. **Clef Positioning**: Should clef symbols appear at the start of each staff or only when clef changes?
   - **Decision deferred**: Follow existing StaffNotation behavior

2. **Empty Staves**: Should staves with no notes be hidden or shown?
   - **Decision deferred**: Initial implementation shows all staves (FR-002)

3. **Bracket Styling**: How to render piano grand staff bracket?
   - **Decision deferred**: CSS border or SVG line, determined during UI implementation

---

## Next Steps

- **Phase 1 Complete**: Data model defined, no API contracts needed
- **Phase 2 (Tasks)**: Break down into atomic implementation tasks with tests
- **Update Agent Context**: Add ViewMode, StackedStaffView to copilot context
