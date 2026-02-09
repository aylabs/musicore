# Research: Tempo Change Support

**Feature**: 008-tempo-change  
**Phase**: 0 - Research & Technical Decisions  
**Date**: 2026-02-09

## Overview

This document captures research findings and technical decisions for implementing tempo adjustment (50%-200% range) in the Musicore playback system. Research focuses on time-stretching techniques, long-press UI patterns, tempo state management, and integration with existing PlaybackScheduler.

## Research Areas

### 1. Tone.js Time-Stretching & Pitch Preservation

**Question**: How does Tone.js handle tempo changes while preserving pitch? What APIs should we use?

**Research Status**: COMPLETE ✅

#### Findings

**Decision**: Musicore uses **absolute time scheduling** with `Tone.Transport.schedule()`, not Tone.js Transport.bpm. Tempo adjustment implemented by **modifying scheduled times** during note scheduling.

**Current Architecture** (from PlaybackScheduler.ts and ToneAdapter.ts):
- `ToneAdapter.playNote(pitch, duration, absoluteTime)` schedules notes at specific absolute times
- `PlaybackScheduler.scheduleNotes()` converts tick positions to absolute times using `ticksToSeconds()`
- Tone.js Transport is used only for scheduling, not for tempo/time-stretching
- No dependency on `Tone.Transport.bpm` API

**Implementation Approach**:
```typescript
// Current formula (PlaybackScheduler.ticksToSeconds):
seconds = ticks / ((tempo / 60) * PPQ)

// With tempo multiplier:
adjustedTime = ticksToSeconds(ticks, tempo) / tempoMultiplier

// Example: 2.0x speed (200%)
adjustedTime = 1.0 second / 2.0 = 0.5 seconds (plays twice as fast)

// Example: 0.5x speed (50%)
adjustedTime = 1.0 second / 0.5 = 2.0 seconds (plays half speed)
```

**Pitch Preservation**:
- Pitch is determined by MIDI note number (`pitch` parameter), not by timing
- Time-stretching is **not needed** because we're changing the absolute time spacing between notes, not the audio playback rate
- Tone.js Sampler and PolySynth maintain pitch regardless of when notes are scheduled

**Key Insight**: This is **time-domain tempo adjustment**, not audio time-stretching. We adjust *when* notes play, not *how* they sound. Pitch preservation is automatic.

**Alternatives Considered**:
1. ❌ `Tone.Transport.bpm` - Not used in current architecture
2. ❌ Audio `playbackRate` - Changes pitch (undesirable)
3. ✅ **Modify absolute times** - Clean, precise, works with existing infrastructure

---

### 2. Long-Press Button Detection in React

**Question**: What's the best practice for implementing long-press behavior with different behavior for click vs hold?

**Research Status**: COMPLETE ✅

#### Findings

**Decision**: Implement **custom React hook** (`useLongPress`) with mouse and touch event handlers. No third-party library needed for this simple use case.

**Implementation Pattern**:
```typescript
// useLongPress.ts
export function useLongPress(
  onSingleClick: () => void,
  onLongPress: () => void,
  options = {
    longPressThreshold: 500, // ms before triggering long-press
    repeatInterval: 100,     // ms between repeat triggers
  }
) {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const handlePointerDown = () => {
    setIsPressed(true);
    // Start timer for initial long-press threshold
    timerRef.current = window.setTimeout(() => {
      onLongPress(); // First long-press trigger
      // Start repeat interval
      intervalRef.current = window.setInterval(onLongPress, options.repeatInterval);
    }, options.longPressThreshold);
  };

  const handlePointerUp = () => {
    // If released before threshold, it's a single click
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      onSingleClick();
    }
    cleanup();
  };

  const handlePointerLeave = () => {
    cleanup(); // Cancel on leave (no action)
  };

  const cleanup = () => {
    setIsPressed(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    isPressed,
  };
}
```

**Usage in TempoControl Component**:
```tsx
const incrementHandlers = useLongPress(
  () => adjustTempo(1),   // +1% on click
  () => adjustTempo(10),  // +10% on long-press (repeated)
);

<button {...incrementHandlers}>+</button>
```

**Timing Thresholds**:
- **Initial threshold**: 500ms (standard for long-press recognition)
- **Repeat interval**: 100ms (fast enough for user control, not too fast)
- **Rationale**: 
  - 500ms is iOS/Android standard for long-press
  - 100ms repeat feels responsive without being overwhelming
  - User can hold for precise control (10% per 100ms = 100% per second)

**Accessibility Considerations**:
- Use `onPointerDown`/`onPointerUp` (works for mouse, touch, pen)
- Fallback to keyboard: `onKeyDown` (Space/Enter triggers single click)
- No hover-based interactions (touch-friendly)
- Visual feedback: Change button style when `isPressed` is true

**Alternatives Considered**:
1. ❌ Third-party library (react-use, use-long-press)
   - Rejected: Adds dependency for simple functionality
   - 15KB+ package for ~30 lines of custom code
2. ❌ CSS `:active` pseudo-class
   - Rejected: No programmatic control over timing
   - Can't distinguish click vs long-press
3. ✅ **Custom hook** - Full control, type-safe, no dependencies

---

### 3. localStorage Schema for Tempo Preferences

**Question**: How should we structure tempo preferences in localStorage? Key format, versioning, migration strategy?

**Research Status**: COMPLETE ✅

#### Findings

**Decision**: Use **per-score keys** with namespaced format `"musicore:tempo:{scoreId}"`. Simple JSON serialization with versioning field for future migrations.

**Schema Definition**:
```typescript
// TempoPreference interface
interface TempoPreference {
  scoreId: string;           // Unique identifier for the score
  tempoMultiplier: number;   // 0.5 to 2.0 (50% to 200%)
  timestamp: number;         // Unix timestamp (milliseconds)
  version: number;           // Schema version (currently 1)
}

// Storage key format
const key = `musicore:tempo:${scoreId}`;

// Example storage entry
{
  "musicore:tempo:d5f8a9c2-4b3e-11ef-9a1b-0242ac110002": {
    "scoreId": "d5f8a9c2-4b3e-11ef-9a1b-0242ac110002",
    "tempoMultiplier": 0.8,
    "timestamp": 1738368000000,
    "version": 1
  }
}
```

**Storage Utilities** (TempoPreferences.ts):
```typescript
export const TempoPreferences = {
  // Save tempo preference for a score
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

  // Load tempo preference for a score (returns 1.0 if not found)
  load(scoreId: string): number {
    const key = `musicore:tempo:${scoreId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return 1.0; // Default: 100% tempo
    }

    try {
      const preference: TempoPreference = JSON.parse(stored);
      
      // Validate version (migration point)
      if (preference.version !== 1) {
        return 1.0; // Unknown version, use default
      }

      // Validate range
      const multiplier = preference.tempoMultiplier;
      if (multiplier < 0.5 || multiplier > 2.0) {
        return 1.0; // Out of range, use default
      }

      return multiplier;
    } catch {
      return 1.0; // Parse error, use default
    }
  },

  // Clear tempo preference for a score
  clear(scoreId: string): void {
    localStorage.removeItem(`musicore:tempo:${scoreId}`);
  },

  // List all tempo preferences (for cleanup)
  listAll(): TempoPreference[] {
    const preferences: TempoPreference[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('musicore:tempo:')) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            preferences.push(JSON.parse(stored));
          } catch {
            // Skip invalid entries
          }
        }
      }
    }
    return preferences;
  },

  // Cleanup old preferences (older than 90 days)
  cleanupOld(maxAgeMs = 90 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const preferences = TempoPreferences.listAll();
    
    for (const pref of preferences) {
      if (now - pref.timestamp > maxAgeMs) {
        TempoPreferences.clear(pref.scoreId);
      }
    }
  },
};
```

**Size Considerations**:
- **Per entry**: ~100 bytes (UUID + JSON structure)
- **100 scores**: ~10KB
- **localStorage limit**: 5-10MB (browser-dependent)
- **Conclusion**: No size concerns for typical usage

**Migration Strategy**:
- Version field allows schema changes in future
- Example v1 → v2 migration:
  ```typescript
  if (preference.version === 1) {
    // Upgrade to v2 schema
    const upgradedPreference = {
      ...preference,
      version: 2,
      // Add new fields with defaults
    };
    TempoPreferences.save(upgradedPreference);
  }
  ```

**Cleanup Strategy**:
- Manual: User can clear preferences via Settings
- Automatic: Optional cleanup of preferences older than 90 days
- On new score: No automatic reset (preserves user preference if score re-loaded)

**Alternatives Considered**:
1. ❌ Single key with all scores `{ [scoreId: string]: number }`
   - Rejected: Harder to update single score, larger payload, harder to clean up
2. ❌ IndexedDB for structured storage
   - Rejected: Overkill for simple key-value preferences, adds complexity
3. ❌ Session storage (ephemeral)
   - Rejected: User Story 3 requires persistence across sessions
4. ✅ **Per-score keys** - Simple, scalable, easy to manage

---

### 4. PlaybackScheduler Integration Points

**Question**: Where in the PlaybackScheduler should we apply the tempo multiplier? How to maintain timing precision?

**Research Status**: COMPLETE ✅

#### Findings

**Decision**: Add `tempoMultiplier` parameter to **`PlaybackScheduler.scheduleNotes()`** method. Apply multiplier after tick→time conversion to preserve integer tick precision.

**Current Implementation** (PlaybackScheduler.ts lines 153-184):
```typescript
public scheduleNotes(notes: Note[], tempo: number, currentTick: number): void {
  const validTempo = tempo > 0 && tempo <= 400 ? tempo : DEFAULT_TEMPO;
  const startTime = this.toneAdapter.getCurrentTime();

  for (const note of notes) {
    if (note.start_tick < currentTick) continue;

    // Calculate start time
    const ticksFromCurrent = note.start_tick - currentTick;
    const startTimeSeconds = ticksToSeconds(ticksFromCurrent, validTempo);
    const absoluteStartTime = startTime + startTimeSeconds;

    // Calculate duration
    let durationSeconds = ticksToSeconds(note.duration_ticks, validTempo);
    if (durationSeconds < MIN_NOTE_DURATION) {
      durationSeconds = MIN_NOTE_DURATION;
    }

    this.toneAdapter.playNote(note.pitch, durationSeconds, absoluteStartTime);
  }
}
```

**Modified Implementation**:
```typescript
// Add tempoMultiplier parameter (default 1.0)
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

    // Calculate start time (APPLY MULTIPLIER AFTER CONVERSION)
    const ticksFromCurrent = note.start_tick - currentTick;
    const baseStartTime = ticksToSeconds(ticksFromCurrent, validTempo);
    const adjustedStartTime = baseStartTime / tempoMultiplier;  // NEW
    const absoluteStartTime = startTime + adjustedStartTime;

    // Calculate duration (APPLY MULTIPLIER TO DURATION TOO)
    let baseDuration = ticksToSeconds(note.duration_ticks, validTempo);
    let adjustedDuration = baseDuration / tempoMultiplier;  // NEW
    if (adjustedDuration < MIN_NOTE_DURATION) {
      adjustedDuration = MIN_NOTE_DURATION;
    }

    this.toneAdapter.playNote(note.pitch, adjustedDuration, absoluteStartTime);
  }
}
```

**Integration Points**:

1. **scheduleNotes() method** ✅
   - Location: PlaybackScheduler.ts line 153
   - Change: Add `tempoMultiplier` parameter, apply to time calculations
   - Precision: Integer ticks preserved, multiplier applied to float seconds

2. **usePlayback hook** (MusicTimeline.ts line 92) ✅
   - Change: Pass `tempoMultiplier` to `scheduler.scheduleNotes()`
   - Source: Get multiplier from tempo state/context

3. **Helper functions** (unchanged) ✅
   - `ticksToSeconds()` and `secondsToTicks()` remain unchanged
   - Multiplier applied at call site, not in conversion functions
   - Rationale: Keep conversion functions pure, tempo adjustment is higher-level concern

**Precision Verification**:
```typescript
// Example: Quarter note at 120 BPM with 2.0x tempo
const ticks = 960; // Quarter note
const tempo = 120; // BPM

// Step 1: Convert ticks to time (integer → float)
const baseTime = ticksToSeconds(960, 120); // 0.5 seconds

// Step 2: Apply tempo multiplier (float → float)
const adjustedTime = 0.5 / 2.0; // 0.25 seconds (twice as fast)

// Integer ticks (960) never modified ✅
// Floating-point math only applies to real-time seconds ✅
```

**Dynamic Tempo Changes During Playback** (Future Enhancement):
- **Current**: Tempo multiplier applied at playback start
- **Future** (if needed): 
  - Re-schedule remaining notes with new multiplier
  - Clear existing schedule (`scheduler.clearSchedule()`)
  - Call `scheduleNotes()` again with updated multiplier
  - Recalculate `currentTick` from elapsed time

**Alternatives Considered**:
1. ❌ Modify `ticksToSeconds()` to accept tempoMultiplier
   - Rejected: Breaks function purity, affects all callers
2. ❌ Apply multiplier in `usePlayback` before calling `scheduleNotes()`
   - Rejected: Awkward to pre-multiply tempo (120 * 2.0 = 240 BPM doesn't capture intent)
3. ✅ **Parameter to scheduleNotes()** - Clean, explicit, localized change

---

### 5. Tempo State Management Strategy

**Question**: Where should tempo adjustment state live? React Context, Zustand, or component state?

**Research Status**: COMPLETE ✅

#### Findings

**Decision**: Use **React Context** pattern matching existing `FileStateContext`. Create dedicated context for tempo state that integrates with `usePlayback` hook.

**Rationale**:
- Musicore frontend uses React Context for state (FileStateContext.tsx exists)
- No evidence of Zustand or Redux in codebase
- Tempo state needs to be accessible by:
  1. TempoControl component (increment/decrement buttons)
  2. TempoDisplay component (show BPM + percentage)
  3. usePlayback hook (pass multiplier to scheduler)
  4. localStorage utilities (persist/restore)

**Implementation Pattern** (following FileStateContext.tsx):
```typescript
// TempoStateContext.tsx
interface TempoState {
  tempoMultiplier: number;      // 0.5 to 2.0 (50% to 200%)
  originalTempo: number;        // Base tempo from score (e.g., 120 BPM)
}

interface TempoStateContextValue {
  tempoState: TempoState;
  setTempoMultiplier: (multiplier: number) => void;
  adjustTempo: (percentChange: number) => void;  // +1, -1, +10, -10
  resetTempo: () => void;                        // Set to 100%
  getEffectiveTempo: () => number;               // originalTempo * multiplier
}

export const TempoStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tempoState, setTempoState] = useState<TempoState>({
    tempoMultiplier: 1.0,
    originalTempo: 120,
  });

  const setTempoMultiplier = useCallback((multiplier: number) => {
    // Clamp to 0.5-2.0 range (50%-200%)
    const clamped = Math.max(0.5, Math.min(2.0, multiplier));
    setTempoState(prev => ({ ...prev, tempoMultiplier: clamped }));
  }, []);

  const adjustTempo = useCallback((percentChange: number) => {
    setTempoState(prev => {
      const newMultiplier = prev.tempoMultiplier + (percentChange / 100);
      // Clamp to 0.5-2.0
      const clamped = Math.max(0.5, Math.min(2.0, newMultiplier));
      return { ...prev, tempoMultiplier: clamped };
    });
  }, []);

  const resetTempo = useCallback(() => {
    setTempoState(prev => ({ ...prev, tempoMultiplier: 1.0 }));
  }, []);

  const getEffectiveTempo = useCallback(() => {
    return tempoState.originalTempo * tempoState.tempoMultiplier;
  }, [tempoState]);

  return (
    <TempoStateContext.Provider value={{ tempoState, setTempoMultiplier, adjustTempo, resetTempo, getEffectiveTempo }}>
      {children}
    </TempoStateContext.Provider>
  );
};

export const useTempoState = () => {
  const context = useContext(TempoStateContext);
  if (!context) {
    throw new Error('useTempoState must be used within TempoStateProvider');
  }
  return context;
};
```

**Integration with usePlayback**:
```typescript
// MusicTimeline.ts (usePlayback hook)
export function usePlayback(notes: Note[], tempo: number): PlaybackState {
  const { tempoState } = useTempoState(); // NEW: Get tempo multiplier
  const [status, setStatus] = useState<PlaybackStatus>('stopped');
  // ...

  const play = useCallback(async () => {
    await adapter.init();
    startTimeRef.current = adapter.getCurrentTime();
    
    // NEW: Pass tempoMultiplier to scheduler
    scheduler.scheduleNotes(notes, tempo, currentTick, tempoState.tempoMultiplier);
    
    setStatus('playing');
  }, [adapter, scheduler, notes, tempo, currentTick, tempoState.tempoMultiplier]);
  // ...
}
```

**Provider Hierarchy**:
```tsx
// App.tsx
<FileStateProvider>
  <TempoStateProvider>  {/* NEW */}
    <ScoreViewer />
  </TempoStateProvider>
</FileStateProvider>
```

**Persistence Integration**:
```typescript
// In TempoStateProvider
useEffect(() => {
  // Load tempo preference when score changes
  if (currentScoreId) {
    const savedMultiplier = TempoPreferences.load(currentScoreId);
    setTempoMultiplier(savedMultiplier);
  }
}, [currentScoreId, setTempoMultiplier]);

useEffect(() => {
  // Save tempo preference when multiplier changes
  if (currentScoreId && tempoState.tempoMultiplier !== 1.0) {
    TempoPreferences.save(currentScoreId, tempoState.tempoMultiplier);
  }
}, [currentScoreId, tempoState.tempoMultiplier]);
```

**Alternatives Considered**:
1. ❌ Component state (useState in ScoreViewer)
   - Rejected: Too localized, hard to share between TempoControl and usePlayback
   - Prop drilling required to pass to multiple components
2. ❌ Zustand global store
   - Rejected: Not used in current codebase, adds new dependency
   - Would be valid choice for new projects
3. ❌ Extend FileStateContext
   - Rejected: Concerns not related (file state vs playback state)
   - Violates single responsibility principle
4. ✅ **Dedicated TempoStateContext** - Follows existing pattern, clear separation of concerns

---

## Summary of Decisions

**Status**: COMPLETE ✅ - All research areas finalized

| Decision Area | Chosen Approach | Rationale |
|--------------|-----------------|-----------|
| **Time-stretching** | Modify absolute scheduling times (no audio time-stretching needed) | Musicore uses absolute time scheduling with Tone.Transport.schedule(). Pitch preservation is automatic because pitch is determined by MIDI note number, not timing. Clean integration with existing ticksToSeconds() function. |
| **Long-press detection** | Custom React hook (useLongPress) with 500ms threshold + 100ms repeat | Custom implementation gives full control over timing and behavior. No third-party dependency needed for simple use case (~30 lines). Standard 500ms threshold matches mobile OS behavior. 100ms repeat provides responsive feedback without overwhelming user. |
| **localStorage schema** | Per-score keys with format `musicore:tempo:{scoreId}` and versioned JSON | Namespaced keys prevent collisions. Per-score storage simplifies CRUD operations and cleanup. Version field enables future schema migrations. ~100 bytes per entry scales well within 5-10MB localStorage limits. |
| **PlaybackScheduler integration** | Add `tempoMultiplier` parameter to `scheduleNotes()` method | Apply multiplier after tick→time conversion preserves integer tick precision (960 PPQ). Single parameter makes tempo adjustment explicit. Localized change minimizes impact on codebase. Formula: `adjustedTime = ticksToSeconds(ticks, tempo) / tempoMultiplier`. |
| **State management** | React Context (TempoStateContext) following FileStateContext pattern | Matches existing architecture (FileStateContext.tsx). No new dependencies (Zustand/Redux). Provides tempo state to TempoControl, TempoDisplay, and usePlayback hook. Integrates cleanly with localStorage persistence via useEffect. |

---

## Technical Specifications

### Constants & Ranges

```typescript
// Tempo multiplier range
const MIN_TEMPO_MULTIPLIER = 0.5;  // 50% (half speed)
const MAX_TEMPO_MULTIPLIER = 2.0;  // 200% (double speed)
const DEFAULT_TEMPO_MULTIPLIER = 1.0; // 100% (no change)

// Long-press timing
const LONG_PRESS_THRESHOLD = 500;  // ms before first long-press trigger
const LONG_PRESS_REPEAT_INTERVAL = 100; // ms between repeat triggers

// Tempo adjustment increments
const SINGLE_CLICK_PERCENT = 1;    // ±1%
const LONG_PRESS_PERCENT = 10;     // ±10%

// localStorage
const TEMPO_PREF_PREFIX = 'musicore:tempo:';
const TEMPO_PREF_VERSION = 1;
const TEMPO_PREF_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
```

### Type Definitions

```typescript
// Tempo state
interface TempoState {
  tempoMultiplier: number;   // 0.5 to 2.0
  originalTempo: number;     // Base tempo from score (BPM)
}

// localStorage schema
interface TempoPreference {
  scoreId: string;
  tempoMultiplier: number;
  timestamp: number;
  version: number;
}

// Long-press hook options
interface UseLongPressOptions {
  longPressThreshold: number;
  repeatInterval: number;
}
```

### Formula Reference

```typescript
// Tempo multiplier to time adjustment
adjustedTime = ticksToSeconds(ticks, tempo) / tempoMultiplier

// Effective tempo calculation (for display)
effectiveTempo = originalTempo * tempoMultiplier

// Percentage to multiplier conversion
tempoMultiplier = currentMultiplier + (percentChange / 100)

// Examples:
// 120 BPM * 2.0 = 240 BPM (200% speed, twice as fast)
// 120 BPM * 0.5 = 60 BPM (50% speed, half as fast)
// 120 BPM * 0.8 = 96 BPM (80% speed, 20% slower for practice)
```

---

## Next Steps

**Phase 0 Status**: ✅ COMPLETE - All research completed and documented

**Proceed to Phase 1**: Generate design documents

1. **data-model.md** - Type definitions and state structures:
   - TempoState interface
   - TempoPreference interface (localStorage)
   - UseLongPressOptions interface
   - TempoStateContextValue interface
   - Modified PlaybackScheduler.scheduleNotes() signature

2. **contracts/** - API contracts (if needed):
   - **Likely empty** - Feature is frontend-only with no backend API changes
   - Potential: Document internal contracts between components/hooks

3. **quickstart.md** - Implementation guide:
   - 4-phase implementation plan (State → UI → Integration → Persistence)
   - File change summary (~8-10 frontend files, 0 backend files)
   - Testing strategy (TDD approach: write tests first, then implement)
   - Success criteria verification steps

4. **Update agent context** - Run `.specify/scripts/bash/update-agent-context.sh copilot`
   - Add new technologies: useLongPress hook pattern, TempoStateContext pattern
   - Document tempo multiplier integration approach

5. **Re-evaluate Constitution Check** - Verify Phase 1 design maintains architectural compliance
   - Confirm no domain model changes (DDD ✅)
   - Confirm adapter layer only (Hexagonal ✅)
   - Confirm no backend API changes (API-First ✅)
   - Confirm 960 PPQ precision preserved (Precision ✅)
   - Confirm TDD approach followed (TDD ✅)
