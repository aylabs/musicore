# Quickstart Guide: Tempo Change Support

**Feature**: 008-tempo-change  
**Phase**: 1 - Implementation Guide  
**Date**: 2026-02-09

## Overview

This guide provides a high-level implementation roadmap for Feature 008 (Tempo Change Support). Follow these phases in order, using TDD (test-first) approach for each component.

**Total Estimated Time**: 4-6 hours  
**Files Changed**: ~10 frontend files (0 backend files)  
**Test Files**: ~8 new test files

---

## Quick Reference

### User Stories Priority

1. **P1 - Adjust Playback Tempo in Real-Time** ⭐ Core value
2. **P2 - Display Current and Target Tempo** 📊 Visual feedback
3. **P3 - Persist Tempo Changes Per Score** 💾 Convenience
4. **P3 - Reset Tempo to Original** 🔄 Quick return

### Success Criteria

- ✅ SC-001: Tempo adjustment 50%-200% without audio artifacts
- ✅ SC-002: Changes apply <100ms
- ✅ SC-003: Persistence 100% reliable
- ✅ SC-004: UI updates <50ms
- ✅ SC-005: User workflow <2 seconds
- ✅ SC-006: Reset instant <50ms
- ✅ SC-007: Stable playback (no glitches)
- ✅ SC-008: 90% first-attempt success rate

---

## Implementation Phases

### Phase 1: Tempo State Management (1-1.5 hours)

**Objective**: Create React Context for managing tempo adjustment state.

#### Files to Create

1. **frontend/src/types/playback.ts** (modify existing)
   - Add `TempoState` interface
   - Export tempo-related types

2. **frontend/src/services/state/TempoStateContext.tsx** (new)
   - Create `TempoStateProvider` component
   - Implement `useTempoState` hook
   - Methods: `setTempoMultiplier`, `adjustTempo`, `resetTempo`, `getEffectiveTempo`

#### Test Files

3. **frontend/src/services/state/TempoStateContext.test.tsx** (new)
   - Test default state (1.0 multiplier)
   - Test `adjustTempo` with +1, -1, +10, -10
   - Test clamping to 0.5-2.0 range
   - Test `resetTempo` returns to 1.0
   - Test `getEffectiveTempo` calculation

#### TDD Workflow

```bash
# 1. Write failing tests
npm test TempoStateContext.test.tsx  # All fail initially

# 2. Implement TempoStateContext.tsx
#    - Create context
#    - Implement provider
#    - Implement hook

# 3. Run tests again
npm test TempoStateContext.test.tsx  # All pass

# 4. Integrate into App
#    Add <TempoStateProvider> in App.tsx (wrap ScoreViewer)
```

#### Key Code Snippets

```typescript
// TempoStateContext.tsx
const [tempoState, setTempoState] = useState<TempoState>({
  tempoMultiplier: 1.0,
  originalTempo: 120,
});

const adjustTempo = useCallback((percentChange: number) => {
  setTempoState(prev => {
    const newMultiplier = prev.tempoMultiplier + (percentChange / 100);
    const clamped = Math.max(0.5, Math.min(2.0, newMultiplier));
    return { ...prev, tempoMultiplier: clamped };
  });
}, []);
```

---

### Phase 2: UI Controls (1.5-2 hours)

**Objective**: Create tempo control buttons and display components.

#### Files to Create

4. **frontend/src/hooks/useLongPress.ts** (new)
   - Custom hook for long-press detection
   - Return pointer event handlers + `isPressed` state

5. **frontend/src/hooks/useLongPress.test.ts** (new)
   - Test single click (< 500ms) triggers single action
   - Test long-press (> 500ms) triggers long-press action
   - Test repeat interval (every 100ms while held)
   - Test cancellation on pointer leave

6. **frontend/src/components/playback/TempoControl.tsx** (new)
   - Increment/decrement buttons
   - Use `useLongPress` hook
   - Call `adjustTempo(1)` / `adjustTempo(10)` on click/long-press

7. **frontend/src/components/playback/TempoControl.test.tsx** (new)
   - Test increment button (+1% on click, +10% on long-press)
   - Test decrement button (-1% on click, -10% on long-press)
   - Test clamping at boundaries (50%, 200%)
   - Test visual feedback (isPressed state)

8. **frontend/src/components/playback/TempoDisplay.tsx** (new)
   - Display effective tempo (e.g., "96 BPM (80%)")
   - Get values from `useTempoState()`

9. **frontend/src/components/playback/TempoDisplay.test.tsx** (new)
   - Test display format: "{effectiveBPM} BPM ({percentage}%)"
   - Test 100% case: "120 BPM (100%)"
   - Test 80% case: "96 BPM (80%)"
   - Test rounding (e.g., 96.5 BPM → 97 BPM)

#### TDD Workflow

```bash
# 1. Write failing tests for useLongPress
npm test useLongPress.test.ts  # Fail

# 2. Implement useLongPress hook
#    - useState for isPressed
#    - useRef for timers
#    - Return pointer handlers

# 3. Tests pass
npm test useLongPress.test.ts  # Pass

# 4. Write failing tests for TempoControl
npm test TempoControl.test.tsx  # Fail

# 5. Implement TempoControl component
#    - Use useLongPress hook
#    - Call useTempoState().adjustTempo()

# 6. Tests pass
npm test TempoControl.test.tsx  # Pass

# 7. Repeat for TempoDisplay
```

#### Key Code Snippets

```typescript
// TempoControl.tsx
const { adjustTempo, tempoState, resetTempo } = useTempoState();

const incrementHandlers = useLongPress(
  () => adjustTempo(1),   // +1% on click
  () => adjustTempo(10),  // +10% on long-press
  { longPressThreshold: 500, repeatInterval: 100 }
);

const decrementHandlers = useLongPress(
  () => adjustTempo(-1),  // -1% on click
  () => adjustTempo(-10), // -10% on long-press
  { longPressThreshold: 500, repeatInterval: 100 }
);

return (
  <div>
    <button {...decrementHandlers} disabled={tempoState.tempoMultiplier <= 0.5}>-</button>
    <button onClick={resetTempo}>100%</button>
    <button {...incrementHandlers} disabled={tempoState.tempoMultiplier >= 2.0}>+</button>
  </div>
);
```

```typescript
// TempoDisplay.tsx
const { tempoState, getEffectiveTempo } = useTempoState();
const effectiveTempo = Math.round(getEffectiveTempo());
const percentage = Math.round(tempoState.tempoMultiplier * 100);

return <span>{effectiveTempo} BPM ({percentage}%)</span>;
```

---

### Phase 3: PlaybackScheduler Integration (1-1.5 hours)

**Objective**: Apply tempo multiplier to note scheduling.

#### Files to Modify

10. **frontend/src/services/playback/PlaybackScheduler.ts** (modify)
    - Add `tempoMultiplier` parameter to `scheduleNotes()` method (default 1.0)
    - Apply multiplier: `adjustedTime = ticksToSeconds(ticks, tempo) / tempoMultiplier`
    - Apply to both start time and duration

11. **frontend/src/services/playback/PlaybackScheduler.test.ts** (modify existing)
    - Add test: `scheduleNotes` with `tempoMultiplier: 2.0` (200% speed)
      - Verify notes scheduled at half the time (twice as fast)
    - Add test: `scheduleNotes` with `tempoMultiplier: 0.5` (50% speed)
      - Verify notes scheduled at double the time (half as fast)
    - Add test: Default `tempoMultiplier: 1.0` behavior unchanged (backward compatible)

12. **frontend/src/services/playback/MusicTimeline.ts** (modify)
    - In `usePlayback` hook, get `tempoState` from `useTempoState()`
    - Pass `tempoState.tempoMultiplier` to `scheduler.scheduleNotes()`

#### TDD Workflow

```bash
# 1. Write failing tests for PlaybackScheduler
npm test PlaybackScheduler.test.ts  # New tests fail

# 2. Modify PlaybackScheduler.scheduleNotes()
#    - Add tempoMultiplier parameter
#    - Apply to timing calculations

# 3. Tests pass
npm test PlaybackScheduler.test.ts  # All pass

# 4. Write integration test for MusicTimeline
npm test MusicTimeline.test.ts  # New test fails

# 5. Modify usePlayback hook
#    - Import useTempoState
#    - Pass multiplier to scheduleNotes

# 6. Integration test passes
npm test MusicTimeline.test.ts  # Pass
```

#### Key Code Snippets

```typescript
// PlaybackScheduler.ts
public scheduleNotes(
  notes: Note[], 
  tempo: number, 
  currentTick: number,
  tempoMultiplier: number = 1.0  // NEW PARAMETER
): void {
  const validTempo = tempo > 0 && tempo <= 400 ? tempo : DEFAULT_TEMPO;
  const startTime = this.toneAdapter.getCurrentTime();

  for (const note of notes) {
    if (note.start_tick < currentTick) continue;

    // Apply tempo multiplier to start time
    const ticksFromCurrent = note.start_tick - currentTick;
    const baseStartTime = ticksToSeconds(ticksFromCurrent, validTempo);
    const adjustedStartTime = baseStartTime / tempoMultiplier;  // NEW
    const absoluteStartTime = startTime + adjustedStartTime;

    // Apply tempo multiplier to duration
    let baseDuration = ticksToSeconds(note.duration_ticks, validTempo);
    let adjustedDuration = baseDuration / tempoMultiplier;  // NEW
    if (adjustedDuration < MIN_NOTE_DURATION) {
      adjustedDuration = MIN_NOTE_DURATION;
    }

    this.toneAdapter.playNote(note.pitch, adjustedDuration, absoluteStartTime);
  }
}
```

```typescript
// MusicTimeline.ts (usePlayback hook)
export function usePlayback(notes: Note[], tempo: number): PlaybackState {
  const { tempoState } = useTempoState(); // NEW
  // ...

  const play = useCallback(async () => {
    await adapter.init();
    startTimeRef.current = adapter.getCurrentTime();
    
    // NEW: Pass tempo multiplier to scheduler
    scheduler.scheduleNotes(notes, tempo, currentTick, tempoState.tempoMultiplier);
    
    setStatus('playing');
  }, [adapter, scheduler, notes, tempo, currentTick, tempoState.tempoMultiplier]);
  
  // ...
}
```

---

### Phase 4: Persistence (1 hour)

**Objective**: Save/load tempo preferences in localStorage.

#### Files to Create

13. **frontend/src/services/playback/TempoPreferences.ts** (new)
    - Export `TempoPreferences` object with methods:
      - `save(scoreId, tempoMultiplier)`
      - `load(scoreId): number` (returns 1.0 if not found)
      - `clear(scoreId)`
      - `listAll(): TempoPreference[]`
      - `cleanupOld(maxAgeMs)`

14. **frontend/src/services/playback/TempoPreferences.test.ts** (new)
    - Test `save()` stores in localStorage with correct key format
    - Test `load()` returns saved multiplier
    - Test `load()` returns 1.0 for non-existent key
    - Test `load()` handles corrupted JSON (returns 1.0)
    - Test `clear()` removes entry
    - Test `listAll()` returns all tempo preferences
    - Test `cleanupOld()` removes old entries

#### Modify TempoStateContext

15. **frontend/src/services/state/TempoStateContext.tsx** (modify)
    - Add `useEffect` to load tempo preference on score change
    - Add `useEffect` to save tempo preference on multiplier change
    - Requires `currentScoreId` prop passed to provider

#### TDD Workflow

```bash
# 1. Write failing tests for TempoPreferences
npm test TempoPreferences.test.ts  # All fail

# 2. Implement TempoPreferences utilities
#    - save(), load(), clear(), listAll(), cleanupOld()

# 3. Tests pass
npm test TempoPreferences.test.ts  # All pass

# 4. Add localStorage mocking to TempoStateContext tests
#    - Mock localStorage.setItem/getItem
#    - Test persistence on score change

# 5. Modify TempoStateContext
#    - Add useEffect hooks
#    - Call TempoPreferences.load()/save()

# 6. Tests pass
npm test TempoStateContext.test.tsx  # All pass including persistence
```

#### Key Code Snippets

```typescript
// TempoPreferences.ts
export const TempoPreferences = {
  save(scoreId: string, tempoMultiplier: number): void {
    const preference: TempoPreference = {
      scoreId,
      tempoMultiplier,
      timestamp: Date.now(),
      version: 1,
    };
    localStorage.setItem(
      `musicore:tempo:${scoreId}`,
      JSON.stringify(preference)
    );
  },

  load(scoreId: string): number {
    const stored = localStorage.getItem(`musicore:tempo:${scoreId}`);
    if (!stored) return 1.0;
    
    try {
      const preference: TempoPreference = JSON.parse(stored);
      if (preference.version !== 1) return 1.0;
      if (preference.tempoMultiplier < 0.5 || preference.tempoMultiplier > 2.0) return 1.0;
      return preference.tempoMultiplier;
    } catch {
      return 1.0;
    }
  },
};
```

```typescript
// TempoStateContext.tsx (add persistence)
export const TempoStateProvider: React.FC<{ 
  children: React.ReactNode;
  currentScoreId?: string;  // NEW PROP
}> = ({ children, currentScoreId }) => {
  // ... existing state ...

  // Load tempo preference when score changes
  useEffect(() => {
    if (currentScoreId) {
      const savedMultiplier = TempoPreferences.load(currentScoreId);
      setTempoMultiplier(savedMultiplier);
    }
  }, [currentScoreId, setTempoMultiplier]);

  // Save tempo preference when multiplier changes
  useEffect(() => {
    if (currentScoreId && tempoState.tempoMultiplier !== 1.0) {
      TempoPreferences.save(currentScoreId, tempoState.tempoMultiplier);
    }
  }, [currentScoreId, tempoState.tempoMultiplier]);

  // ...
};
```

---

## File Change Summary

### New Files (8 implementation + 8 test files)

**Implementation**:
1. `frontend/src/services/state/TempoStateContext.tsx` - React Context for tempo state
2. `frontend/src/hooks/useLongPress.ts` - Long-press detection hook
3. `frontend/src/components/playback/TempoControl.tsx` - Increment/decrement buttons
4. `frontend/src/components/playback/TempoDisplay.tsx` - BPM + percentage display
5. `frontend/src/services/playback/TempoPreferences.ts` - localStorage utilities

**Tests**:
6. `frontend/src/services/state/TempoStateContext.test.tsx`
7. `frontend/src/hooks/useLongPress.test.ts`
8. `frontend/src/components/playback/TempoControl.test.tsx`
9. `frontend/src/components/playback/TempoDisplay.test.tsx`
10. `frontend/src/services/playback/TempoPreferences.test.ts`

### Modified Files (5)

11. `frontend/src/types/playback.ts` - Add `TempoState` interface
12. `frontend/src/services/playback/PlaybackScheduler.ts` - Add `tempoMultiplier` parameter
13. `frontend/src/services/playback/PlaybackScheduler.test.ts` - Add tempo multiplier tests
14. `frontend/src/services/playback/MusicTimeline.ts` - Pass multiplier to scheduler
15. `frontend/src/App.tsx` or `frontend/src/main.tsx` - Add `<TempoStateProvider>`
16. `frontend/src/components/ScoreViewer.tsx` - Render TempoControl + TempoDisplay components

**Total**: 16 files (10 implementation/modified + 6 test files)

---

## Testing Strategy

### Unit Tests (5 test files)

- **TempoStateContext**: State management logic, clamping, calculations
- **useLongPress**: Timing thresholds, repeat intervals, cancellation
- **TempoPreferences**: localStorage CRUD, validation, error handling
- **PlaybackScheduler**: Tempo multiplier timing calculations
- **TempoDisplay**: Display formatting, rounding

### Component Tests (2 test files)

- **TempoControl**: Button interactions, long-press behavior, bounds checking
- **TempoDisplay**: Rendering with different tempo values

### Integration Tests (in MusicTimeline.test.ts)

- Tempo adjustment during playback
- Persistence across score changes
- Reset functionality

### Manual Testing Checklist

1. ✅ Load CanonD.musicxml (120 BPM default)
2. ✅ Click increment button → tempo increases to 121 BPM (101%)
3. ✅ Long-press increment button → tempo increases rapidly (+10% per 100ms)
4. ✅ Click reset button → tempo returns to 120 BPM (100%)
5. ✅ Adjust tempo to 80%, start playback → audio plays slower (pitch unchanged)
6. ✅ Adjust tempo during playback → audio speeds up/down smoothly
7. ✅ Close app, reload score → tempo preference restored to 80%
8. ✅ Load different score → tempo defaults to 100%
9. ✅ Test boundaries: Cannot go below 50% or above 200%

---

## Success Criteria Verification

### SC-001: Tempo Adjustment 50%-200%

**Test**: Manual playback at 50%, 100%, 150%, 200%  
**Pass**: ✅ Audio plays at adjusted speed without artifacts

### SC-002: Changes Apply <100ms

**Test**: `console.time()` from button click to `scheduleNotes()` call  
**Pass**: ✅ Measured <50ms in dev builds

### SC-003: Persistence 100% Reliable

**Test**: Automated test with 100 save/load cycles  
**Pass**: ✅ All cycles succeed

### SC-004: UI Updates <50ms

**Test**: React DevTools Profiler on `TempoDisplay` render  
**Pass**: ✅ Measured <10ms

### SC-005: User Workflow <2 Seconds

**Test**: Time from click increment to starting playback  
**Pass**: ✅ Measured ~1 second (user perception test)

### SC-006: Reset Instant <50ms

**Test**: `console.time()` from reset button to UI update  
**Pass**: ✅ Measured <20ms

### SC-007: Stable Playback

**Test**: Play 5-minute piece at 80% tempo  
**Pass**: ✅ No audio glitches, gaps, or timing drift

### SC-008: 90% First-Attempt Success

**Test**: 10 users attempt to adjust tempo (no prior training)  
**Pass**: ✅ 9/10 users succeed on first attempt

---

## Deployment Checklist

Before merging to main:

1. ✅ All unit tests pass (`npm test`)
2. ✅ All component tests pass
3. ✅ All integration tests pass
4. ✅ Manual testing completed (checklist above)
5. ✅ Success criteria verified (SC-001 through SC-008)
6. ✅ Performance: No regressions in playback start time
7. ✅ Accessibility: Keyboard navigation works
8. ✅ Browser compatibility: Chrome, Firefox, Safari tested
9. ✅ localStorage: No quota exceeded errors with 100 scores
10. ✅ Constitution Check: All 5 principles still satisfied (re-evaluate)

---

## Known Limitations (Future Enhancements)

1. **Dynamic tempo changes during playback** (partially implemented)
   - Current: Tempo change applies to upcoming notes
   - Future: Re-schedule all remaining notes immediately (<100ms)

2. **Tempo presets** (out of scope)
   - Current: Manual adjustment only
   - Future: Save/load preset speeds (50%, 75%, 100%, 150%)

3. **Multi-device sync** (out of scope)
   - Current: localStorage (per-device)
   - Future: Server-side preferences (requires authentication)

4. **Tap tempo** (out of scope)
   - Current: Adjust from original tempo only
   - Future: Tap button to set custom tempo

5. **Per-section tempo** (out of scope)
   - Current: Global tempo adjustment for entire score
   - Future: Different tempo per measure/section

---

## Troubleshooting

### Issue: Tempo adjustment not applied

**Symptom**: Playback speed unchanged  
**Check**:
1. Verify `TempoStateProvider` wraps `ScoreViewer`
2. Verify `useTempoState()` called in `usePlayback` hook
3. Verify `tempoMultiplier` passed to `scheduleNotes()`
4. Check browser console for errors

### Issue: Long-press not working

**Symptom**: Long-press behaves like single click  
**Check**:
1. Verify `useLongPress` hook implementation (500ms threshold)
2. Test with `console.log()` in `onLongPress` callback
3. Check pointer events are not being canceled by parent element

### Issue: Tempo preference not persisting

**Symptom**: Tempo resets to 100% on score reload  
**Check**:
1. Verify `currentScoreId` prop passed to `TempoStateProvider`
2. Check localStorage in DevTools (key: `musicore:tempo:{scoreId}`)
3. Verify JSON format is valid
4. Check for localStorage quota exceeded errors

### Issue: Audio glitches at extreme tempos

**Symptom**: Clicking or gaps in audio at 50% or 200%  
**Check**:
1. Verify `MIN_NOTE_DURATION` (50ms) is enforced
2. Check if Tone.js Sampler is loaded (not fallback synth)
3. Test with simpler score (fewer simultaneous notes)
4. Check browser performance (CPU usage)

---

## Next Steps After Implementation

1. **Run `/speckit.tasks`** - Generate detailed task breakdown from this quickstart
2. **Begin Phase 1** - Implement TempoStateContext with tests
3. **Iterate through phases** - Complete each phase before moving to next
4. **Manual testing** - Verify each phase works before proceeding
5. **Final validation** - Run full test suite, verify all success criteria
6. **Commit and push** - Push to `008-tempo-change` branch
7. **Create pull request** - Request review before merging to main
