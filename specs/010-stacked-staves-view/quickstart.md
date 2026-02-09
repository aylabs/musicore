# Quickstart: Stacked Staves View

**Feature**: 010-stacked-staves-view  
**Date**: 2026-02-09  
**Audience**: Developers implementing this feature

## Overview

Add a toggleable full-score view to the Musicore frontend that displays all staves vertically stacked with multi-voice rendering, instrument labels, and synchronized playback. This is a frontend-only feature requiring no backend changes.

---

## Prerequisites

- ✅ Feature 009 (Playback Scroll & Highlight) completed
- ✅ Existing `usePlayback` hook functional
- ✅ `StaffNotation` component rendering individual staves
- ✅ Score data model with instruments → staves → voices → notes hierarchy

---

## Quick Implementation Steps

### Step 1: Add View Mode State (5 minutes)

**File**: `frontend/src/components/ScoreViewer.tsx`

```typescript
// Add state for view mode
const [viewMode, setViewMode] = useState<'individual' | 'stacked'>('individual');
```

**Test**: State toggles between modes without errors

---

### Step 2: Create ViewModeSelector Component (15 minutes)

**File**: `frontend/src/components/stacked/ViewModeSelector.tsx`

```typescript
interface ViewModeSelectorProps {
  currentMode: 'individual' | 'stacked';
  onChange: (mode: 'individual' | 'stacked') => void;
}

export function ViewModeSelector({ currentMode, onChange }: ViewModeSelectorProps) {
  return (
    <div className="view-mode-selector">
      <button 
        className={currentMode === 'individual' ? 'active' : ''}
        onClick={() => onChange('individual')}
      >
        Individual View
      </button>
      <button 
        className={currentMode === 'stacked' ? 'active' : ''}
        onClick={() => onChange('stacked')}
      >
        Stacked View
      </button>
    </div>
  );
}
```

**Test**: Clicking buttons fires onChange with correct mode

---

### Step 3: Create MultiVoiceStaff Component (30 minutes)

**File**: `frontend/src/components/stacked/MultiVoiceStaff.tsx`

```typescript
interface MultiVoiceStaffProps {
  voices: Voice[];
  clef: string;
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void;
  onUnpinStartTick?: () => void;
}

export function MultiVoiceStaff({ 
  voices, 
  clef, 
  currentTick, 
  playbackStatus,
  onSeekToTick,
  onUnpinStartTick
}: MultiVoiceStaffProps) {
  // Merge all voice notes into single array, sorted by start_tick
  const mergedNotes = useMemo(() => {
    const allNotes = voices.flatMap(v => v.interval_events);
    return allNotes.sort((a, b) => a.start_tick - b.start_tick);
  }, [voices]);

  return (
    <StaffNotation
      notes={mergedNotes}
      clef={clef}
      currentTick={currentTick}
      playbackStatus={playbackStatus}
      onNoteClick={onSeekToTick}
      onNoteDeselect={onUnpinStartTick}
    />
  );
}
```

**Test**: Multi-voice staff renders all notes without overlap

---

### Step 4: Create StaffGroup Component (30 minutes)

**File**: `frontend/src/components/stacked/StaffGroup.tsx`

```typescript
interface StaffGroupProps {
  instrumentName: string;
  staff: Staff;
  isFirstStaffOfInstrument: boolean;
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void;
  onUnpinStartTick?: () => void;
}

export function StaffGroup({
  instrumentName,
  staff,
  isFirstStaffOfInstrument,
  currentTick,
  playbackStatus,
  onSeekToTick,
  onUnpinStartTick
}: StaffGroupProps) {
  // Extract clef from staff structural events
  const clef = staff.staff_structural_events.find(e => 'Clef' in e)?.Clef?.clef || 'Treble';

  return (
    <div className="staff-group">
      {isFirstStaffOfInstrument && (
        <div className="staff-label">{instrumentName}</div>
      )}
      <div className="staff-content">
        <MultiVoiceStaff
          voices={staff.voices}
          clef={clef}
          currentTick={currentTick}
          playbackStatus={playbackStatus}
          onSeekToTick={onSeekToTick}
          onUnpinStartTick={onUnpinStartTick}
        />
      </div>
    </div>
  );
}
```

**CSS** (`StaffGroup.css`):
```css
.staff-group {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

.staff-label {
  text-align: right;
  padding-right: 10px;
  font-weight: 600;
  font-size: 1.1em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.staff-content {
  flex: 1;
}
```

**Test**: Staff label appears left-aligned, staff renders on right

---

### Step 5: Create StackedStaffView Component (45 minutes)

**File**: `frontend/src/components/stacked/StackedStaffView.tsx`

```typescript
interface StackedStaffViewProps {
  score: Score;
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void;
  onUnpinStartTick?: () => void;
}

export function StackedStaffView({
  score,
  currentTick,
  playbackStatus,
  onSeekToTick,
  onUnpinStartTick
}: StackedStaffViewProps) {
  // Flatten instruments into staff list
  const flattenedStaves = useMemo(() => {
    const staves: FlattenedStaff[] = [];
    score.instruments.forEach((instrument, instIdx) => {
      instrument.staves.forEach((staff, staffIdx) => {
        staves.push({
          instrumentName: instrument.name,
          instrumentIndex: instIdx,
          staff,
          staffIndex: staffIdx,
          isFirstStaffOfInstrument: staffIdx === 0
        });
      });
    });
    return staves;
  }, [score]);

  return (
    <div className="stacked-staff-view">
      {flattenedStaves.map((item, index) => (
        <StaffGroup
          key={`${item.instrumentIndex}-${item.staffIndex}`}
          instrumentName={item.instrumentName}
          staff={item.staff}
          isFirstStaffOfInstrument={item.isFirstStaffOfInstrument}
          currentTick={currentTick}
          playbackStatus={playbackStatus}
          onSeekToTick={onSeekToTick}
          onUnpinStartTick={onUnpinStartTick}
        />
      ))}
    </div>
  );
}
```

**Test**: All staves render vertically, labels align correctly

---

### Step 6: Integrate into ScoreViewer (20 minutes)

**File**: `frontend/src/components/ScoreViewer.tsx`

```typescript
// Add imports
import { ViewModeSelector } from './stacked/ViewModeSelector';
import { StackedStaffView } from './stacked/StackedStaffView';

// In render, add ViewModeSelector before PlaybackControls
<ViewModeSelector 
  currentMode={viewMode} 
  onChange={setViewMode} 
/>

<PlaybackControls ... />

// Replace InstrumentList with conditional rendering
{viewMode === 'individual' && (
  <InstrumentList 
    instruments={score.instruments}
    scoreId={scoreId}
    onUpdate={...}
    onSeekToTick={playbackState.seekToTick}
    onUnpinStartTick={playbackState.unpinStartTick}
  />
)}

{viewMode === 'stacked' && (
  <StackedStaffView
    score={score}
    currentTick={playbackState.currentTick}
    playbackStatus={playbackState.status}
    onSeekToTick={playbackState.seekToTick}
    onUnpinStartTick={playbackState.unpinStartTick}
  />
)}
```

**Test**: View switches without breaking playback

---

## Testing Checklist

### Unit Tests (Add as you implement each component)

- [ ] **ViewModeSelector**: Renders both buttons, highlights active mode
- [ ] **MultiVoiceStaff**: Merges notes from multiple voices correctly
- [ ] **StaffGroup**: Renders label and staff, truncates long names
- [ ] **StackedStaffView**: Flattens score into staff list correctly

### Integration Tests

- [ ] **View Switching**: Toggle between views during playback, verify no interruption
- [ ] **Click-to-Seek**: Click note in stacked view, verify seek works
- [ ] **Playback Highlighting**: Play in stacked view, verify all active notes highlight green
- [ ] **Auto-Scroll**: (Future enhancement) Verify scroll keeps active staff visible

### Manual Testing

1. Load multi-instrument score (e.g., string quartet: 4 instruments)
2. Switch to stacked view → all 4 staves visible vertically
3. Click Play → notes highlight green across all staves
4. Click a note → playback seeks to that position
5. Switch back to individual view during playback → confirm no audio glitch

---

## Common Pitfalls

### ❌ Forgetting to Pass Playback State
**Symptom**: Stacked view doesn't highlight notes during playback  
**Fix**: Ensure `currentTick` and `playbackStatus` props passed down to all StaffGroup components

### ❌ Rendering All Staves Always
**Symptom**: Slow performance with 20+ staves  
**Fix**: Implement virtualization in Phase 2 (render only visible staves)

### ❌ Not Memoizing Flattened Staves
**Symptom**: Re-computing staff list every render causes lag  
**Fix**: Use `useMemo` for `flattenedStaves` computation

### ❌ Breaking Playback State on View Switch
**Symptom**: Playback stops when switching views  
**Fix**: Do NOT unmount `usePlayback` hook - keep it in ScoreViewer parent

---

## Performance Tips

### Phase 1 MVP (No Virtualization)
- Acceptable for scores with <10 instruments (20 staves)
- Each staff renders independently, ~2ms per staff

### Phase 2 Optimization (Virtualization)
- Add scroll tracking in StackedStaffView
- Compute visible staff indices based on scroll position
- Only render visible staves + 2 buffer above/below
- Target: 50 staves @ 60fps

---

## Files to Create

**New Components**:
1. `frontend/src/components/stacked/ViewModeSelector.tsx` + test + CSS
2. `frontend/src/components/stacked/MultiVoiceStaff.tsx` + test + CSS
3. `frontend/src/components/stacked/StaffGroup.tsx` + test + CSS
4. `frontend/src/components/stacked/StackedStaffView.tsx` + test + CSS

**Modified Components**:
5. `frontend/src/components/ScoreViewer.tsx` (add view mode state)
6. `frontend/src/components/ScoreViewer.css` (add view selector styles)

**Total Files**: 4 new, 2 modified (~600 lines of code total)

---

## Estimated Time

- **Setup & Planning**: 1 hour (reading specs, understanding existing code)
- **Component Implementation**: 3 hours (TDD: tests first, then implementation)
- **Integration & Testing**: 2 hours (manual testing, integration tests)
- **Polish & Documentation**: 1 hour (CSS styling, code comments)

**Total**: ~7 hours for complete implementation

---

## Next Steps After Implementation

1. **Run Full Test Suite**: `npm test` (all tests must pass)
2. **Manual Testing**: Load various scores, test all user stories
3. **Performance Profiling**: Use React DevTools to verify <16ms render time
4. **Code Review**: Ensure compliance with constitution (DDD, test-first)
5. **Merge to Main**: Create PR with tests, documentation, and demo video

---

## Support Resources

- **Spec**: [spec.md](spec.md) - User stories & requirements
- **Research**: [research.md](research.md) - Design decisions & alternatives
- **Data Model**: [data-model.md](data-model.md) - Component interfaces & state flows
- **Existing Playback**: Feature 009 (009-playback-scroll-highlight/tasks.md)
- **Constitution**: `.specify/memory/constitution.md` - Project principles
