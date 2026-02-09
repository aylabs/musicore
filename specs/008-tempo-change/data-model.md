# Data Model: Tempo Change Support

**Feature**: 008-tempo-change  
**Phase**: 1 - Data Model & Type Definitions  
**Date**: 2026-02-09

## Overview

This document defines the data structures, interfaces, and type definitions for the tempo adjustment feature. All types are frontend-only (TypeScript/React) as this feature requires no backend changes.

---

## Core Types

### TempoState

**Purpose**: Represents the current tempo adjustment state in the application.

**Location**: `frontend/src/types/playback.ts` (extend existing file)

```typescript
/**
 * Tempo adjustment state
 * 
 * Feature 008 - Tempo Change: Manages playback tempo multiplier
 * Separate from score's TempoEvent (domain model) - this is playback adapter state
 */
export interface TempoState {
  /**
   * Tempo multiplier applied to playback
   * - 1.0 = 100% (no change)
   * - 0.5 = 50% (half speed)
   * - 2.0 = 200% (double speed)
   * Range: 0.5 to 2.0
   */
  tempoMultiplier: number;

  /**
   * Original tempo from score (in BPM)
   * Used to calculate effective tempo for display
   * Example: 120 BPM * 0.8 multiplier = 96 BPM effective
   */
  originalTempo: number;
}
```

**Validation**:
- `tempoMultiplier`: Must be ≥ 0.5 and ≤ 2.0
- `originalTempo`: Must be > 0 (validated by domain BPM value object, range 20-400)

**Derived Values**:
```typescript
// Effective tempo (for display)
effectiveTempo = originalTempo * tempoMultiplier

// Percentage (for display)
percentage = tempoMultiplier * 100  // e.g., 0.8 * 100 = 80%
```

---

### TempoStateContextValue

**Purpose**: React Context value interface for tempo state management.

**Location**: `frontend/src/services/state/TempoStateContext.tsx` (new file)

```typescript
/**
 * Context value for tempo state management
 */
export interface TempoStateContextValue {
  /**
   * Current tempo state
   */
  tempoState: TempoState;

  /**
   * Set tempo multiplier directly
   * Automatically clamps to 0.5-2.0 range
   * 
   * @param multiplier - New tempo multiplier (0.5 to 2.0)
   */
  setTempoMultiplier: (multiplier: number) => void;

  /**
   * Adjust tempo by percentage change
   * Used by increment/decrement buttons
   * 
   * @param percentChange - +1, -1, +10, or -10
   * 
   * @example
   * adjustTempo(1);   // +1% (single click on increment)
   * adjustTempo(-1);  // -1% (single click on decrement)
   * adjustTempo(10);  // +10% (long-press on increment)
   * adjustTempo(-10); // -10% (long-press on decrement)
   */
  adjustTempo: (percentChange: number) => void;

  /**
   * Reset tempo to 100% (1.0 multiplier)
   */
  resetTempo: () => void;

  /**
   * Get effective tempo in BPM
   * Calculated as originalTempo * tempoMultiplier
   * 
   * @returns Effective tempo in beats per minute
   */
  getEffectiveTempo: () => number;

  /**
   * Update original tempo when score changes
   * Called when new score loaded or tempo marking encountered
   * 
   * @param tempo - Original tempo in BPM (from score)
   */
  setOriginalTempo: (tempo: number) => void;
}
```

---

### TempoPreference (localStorage)

**Purpose**: Persistent tempo preference for a specific score.

**Location**: `frontend/src/services/playback/TempoPreferences.ts` (new file)

```typescript
/**
 * Tempo preference stored in browser localStorage
 * 
 * Key format: "musicore:tempo:{scoreId}"
 * Example: "musicore:tempo:d5f8a9c2-4b3e-11ef-9a1b-0242ac110002"
 */
export interface TempoPreference {
  /**
   * Unique identifier for the score
   * Matches Score.id from backend API
   */
  scoreId: string;

  /**
   * Saved tempo multiplier (0.5 to 2.0)
   */
  tempoMultiplier: number;

  /**
   * When this preference was last saved (Unix timestamp in milliseconds)
   * Used for cleanup of old preferences
   */
  timestamp: number;

  /**
   * Schema version for future migrations
   * Current version: 1
   */
  version: number;
}
```

**Storage Example**:
```json
{
  "musicore:tempo:abc-123": {
    "scoreId": "abc-123",
    "tempoMultiplier": 0.8,
    "timestamp": 1738368000000,
    "version": 1
  }
}
```

---

### UseLongPressOptions

**Purpose**: Configuration options for long-press button detection.

**Location**: `frontend/src/hooks/useLongPress.ts` (new file)

```typescript
/**
 * Options for useLongPress hook
 */
export interface UseLongPressOptions {
  /**
   * Time in milliseconds before long-press is triggered
   * Standard: 500ms (matches iOS/Android behavior)
   */
  longPressThreshold: number;

  /**
   * Time in milliseconds between repeated long-press triggers
   * While button is held, action repeats every N ms
   * Recommended: 100ms for responsive feedback
   */
  repeatInterval: number;
}

/**
 * Return value from useLongPress hook
 */
export interface UseLongPressReturn {
  /**
   * Pointer down event handler
   */
  onPointerDown: () => void;

  /**
   * Pointer up event handler
   */
  onPointerUp: () => void;

  /**
   * Pointer leave event handler (cancels press)
   */
  onPointerLeave: () => void;

  /**
   * Whether button is currently pressed
   * Used for visual feedback (styling)
   */
  isPressed: boolean;
}
```

---

## Modified Types

### PlaybackScheduler.scheduleNotes()

**Purpose**: Extended to accept tempo multiplier parameter.

**Location**: `frontend/src/services/playback/PlaybackScheduler.ts` (modified)

**Before**:
```typescript
public scheduleNotes(notes: Note[], tempo: number, currentTick: number): void
```

**After**:
```typescript
public scheduleNotes(
  notes: Note[], 
  tempo: number, 
  currentTick: number,
  tempoMultiplier: number = 1.0  // NEW: Default to 100% (no change)
): void
```

**Parameter**:
- `tempoMultiplier`: Multiplier applied to timing calculations (0.5 to 2.0)
- Default: 1.0 (backward compatible - existing callers unchanged)

---

## Constants

**Location**: `frontend/src/services/playback/TempoPreferences.ts` (new file)

```typescript
/**
 * Tempo multiplier constants
 */
export const TEMPO_CONSTANTS = {
  /** Minimum tempo multiplier: 50% (half speed) */
  MIN_MULTIPLIER: 0.5,
  
  /** Maximum tempo multiplier: 200% (double speed) */
  MAX_MULTIPLIER: 2.0,
  
  /** Default tempo multiplier: 100% (no change) */
  DEFAULT_MULTIPLIER: 1.0,
  
  /** Single click adjustment: ±1% */
  SINGLE_CLICK_PERCENT: 1,
  
  /** Long-press adjustment: ±10% */
  LONG_PRESS_PERCENT: 10,
  
  /** Long-press initial threshold: 500ms */
  LONG_PRESS_THRESHOLD: 500,
  
  /** Long-press repeat interval: 100ms */
  LONG_PRESS_REPEAT_INTERVAL: 100,
  
  /** localStorage key prefix */
  STORAGE_PREFIX: 'musicore:tempo:',
  
  /** localStorage schema version */
  STORAGE_VERSION: 1,
  
  /** Max age for cleanup: 90 days */
  MAX_AGE_MS: 90 * 24 * 60 * 60 * 1000,
} as const;
```

---

## State Flow Diagram

```
┌─────────────────────┐
│  User Interaction   │
│  (Button Click)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ TempoControl        │
│ Component           │
│                     │
│ useLongPress hook   │
│ ↓                   │
│ adjustTempo(±1/±10) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ TempoStateContext   │
│                     │
│ tempoMultiplier     │
│ 0.5 ← 1.0 → 2.0    │
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐
│ TempoDisplay        │  │ usePlayback Hook    │
│ Component           │  │                     │
│                     │  │ scheduleNotes()     │
│ Show: 96 BPM (80%)  │  │ with multiplier     │
└─────────────────────┘  └──────────┬──────────┘
           │                        │
           │                        ▼
           │             ┌─────────────────────┐
           │             │ PlaybackScheduler   │
           │             │                     │
           │             │ Apply multiplier    │
           │             │ to timing           │
           │             └──────────┬──────────┘
           │                        │
           │                        ▼
           │             ┌─────────────────────┐
           │             │ ToneAdapter         │
           │             │                     │
           │             │ Schedule notes at   │
           │             │ adjusted times      │
           │             └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ TempoPreferences    │
│ localStorage        │
│                     │
│ Save per scoreId    │
└─────────────────────┘
```

---

## Validation Rules

### Input Validation

```typescript
/**
 * Validate tempo multiplier range
 */
function validateTempoMultiplier(multiplier: number): number {
  return Math.max(
    TEMPO_CONSTANTS.MIN_MULTIPLIER,
    Math.min(TEMPO_CONSTANTS.MAX_MULTIPLIER, multiplier)
  );
}

/**
 * Validate original tempo (delegate to domain BPM validation)
 */
function validateOriginalTempo(tempo: number): number {
  // Backend BPM value object validates range 20-400
  // Frontend assumes backend validation, uses 120 as fallback
  return tempo > 0 && tempo <= 400 ? tempo : 120;
}

/**
 * Validate localStorage TempoPreference
 */
function validateTempoPreference(pref: unknown): TempoPreference | null {
  if (!pref || typeof pref !== 'object') return null;
  
  const p = pref as Record<string, unknown>;
  
  // Version check
  if (p.version !== TEMPO_CONSTANTS.STORAGE_VERSION) return null;
  
  // Type checks
  if (typeof p.scoreId !== 'string') return null;
  if (typeof p.tempoMultiplier !== 'number') return null;
  if (typeof p.timestamp !== 'number') return null;
  
  // Range check
  if (p.tempoMultiplier < 0.5 || p.tempoMultiplier > 2.0) return null;
  
  return p as TempoPreference;
}
```

---

## Type Safety Notes

1. **Immutability**: All state updates use immutable patterns (spread operator, new objects)
2. **Type Guards**: localStorage parsing includes full type validation (null checks, range checks)
3. **Default Values**: All functions with tempo multiplier default to 1.0 (backward compatible)
4. **Clamping**: UI inputs automatically clamp to 0.5-2.0 range (no user-facing errors)
5. **Precision**: Tempo multiplier stored as float (0.5-2.0), calculations use float, ticks remain integer

---

## Dependencies

### Frontend Type Dependencies

```typescript
// Existing types (no changes)
import type { Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';

// New types (this feature)
import type { TempoState } from '../../types/playback'; // NEW
import type { TempoStateContextValue } from '../../services/state/TempoStateContext'; // NEW
import type { TempoPreference } from '../../services/playback/TempoPreferences'; // NEW
import type { UseLongPressOptions, UseLongPressReturn } from '../../hooks/useLongPress'; // NEW
```

### Backend Types

**No backend changes required.** Feature uses existing backend types:
- `Score`: Contains tempo events, id field for localStorage key
- `TempoEvent`: Domain entity (unchanged - represents score's intended tempo)
- `BPM`: Value object (unchanged - validates 20-400 range)

---

## Test Data

### Example TempoState Values

```typescript
// Default state (no adjustment)
{ tempoMultiplier: 1.0, originalTempo: 120 }
// Effective: 120 BPM (100%)

// Slow tempo (practice mode)
{ tempoMultiplier: 0.8, originalTempo: 120 }
// Effective: 96 BPM (80%)

// Fast tempo (review mode)
{ tempoMultiplier: 1.5, originalTempo: 120 }
// Effective: 180 BPM (150%)

// Minimum tempo
{ tempoMultiplier: 0.5, originalTempo: 120 }
// Effective: 60 BPM (50%)

// Maximum tempo
{ tempoMultiplier: 2.0, originalTempo: 120 }
// Effective: 240 BPM (200%)
```

### Example localStorage Entries

```json
{
  "musicore:tempo:canon-in-d-123": {
    "scoreId": "canon-in-d-123",
    "tempoMultiplier": 0.7,
    "timestamp": 1738368000000,
    "version": 1
  },
  "musicore:tempo:fugue-456": {
    "scoreId": "fugue-456",
    "tempoMultiplier": 1.2,
    "timestamp": 1738454400000,
    "version": 1
  }
}
```

---

## Migration Path (Future)

### Version 1 → Version 2 (Example)

If future requirements add new fields to TempoPreference:

```typescript
// Version 2 schema (hypothetical)
interface TempoPreferenceV2 {
  scoreId: string;
  tempoMultiplier: number;
  timestamp: number;
  version: 2; // Incremented
  presets?: number[]; // New field: saved tempo presets
}

// Migration function
function migrateV1ToV2(v1: TempoPreference): TempoPreferenceV2 {
  return {
    ...v1,
    version: 2,
    presets: [0.7, 1.0, 1.5], // Default presets
  };
}
```

**Current Status**: Version 1 only. Migration path documented for future reference.
