# Data Model: Music Playback

**Feature**: 003-music-playback | **Date**: 2026-02-07  
**Input**: [spec.md](spec.md) requirements + [research.md](research.md) decisions

## Overview

This feature extends the existing Score domain model (Feature 001) with an Instrument entity and adds frontend playback state types. Backend changes are minimal (1 new entity, 1 field addition). Frontend implements playback timing and scheduling logic without modifying backend domain model.

## Backend Domain Model (Rust)

### New Entity: Instrument

**Location**: `backend/src/models/instrument.rs`

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents a musical instrument associated with a score.
/// MVP: Always type "piano", future iterations support multiple instrument types.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Instrument {
    /// Unique identifier for the instrument
    pub id: String,
    
    /// Type of instrument (e.g., "piano", "guitar")
    /// MVP constraint: Always "piano"
    pub instrument_type: String,
}

impl Instrument {
    /// Create a new instrument with specified type
    pub fn new(instrument_type: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            instrument_type,
        }
    }
}

impl Default for Instrument {
    /// Default instrument is piano
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            instrument_type: "piano".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_instrument_is_piano() {
        let instrument = Instrument::default();
        assert_eq!(instrument.instrument_type, "piano");
        assert!(!instrument.id.is_empty());
    }

    #[test]
    fn test_create_custom_instrument() {
        let instrument = Instrument::new("guitar".to_string());
        assert_eq!(instrument.instrument_type, "guitar");
    }
}
```

**Validation Rules**:
- `id`: Must be non-empty string (auto-generated UUID)
- `instrument_type`: Must be non-empty string, MVP validates equals "piano"

**Relationships**:
- Belongs to: **Score** (1:1 for MVP, 1:N in future)

---

### Updated Entity: Score

**Location**: `backend/src/models/score.rs`

```rust
// Existing imports...
use crate::models::instrument::Instrument;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Score {
    pub id: String,
    pub title: String,
    pub tempo: u16,              // BPM (beats per minute), default 120
    pub time_signature: (u8, u8), // Numerator, denominator (e.g., 4/4)
    pub instruments: Vec<Instrument>, // NEW: Associated instruments
    // ... existing fields (voices, structural_events, etc.)
}

impl Score {
    pub fn new(title: String, tempo: u16, time_signature: (u8, u8)) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            tempo,
            time_signature,
            instruments: vec![Instrument::default()], // NEW: Default piano
            // ... initialize other fields
        }
    }
}
```

**Changes**:
- **Added field**: `instruments: Vec<Instrument>`
- **Default behavior**: New scores get one default piano instrument
- **Backward compatibility**: Existing scores without instruments get empty vec (frontend defaults to piano)

**Migration Strategy**:
- No database migration needed (in-memory storage)
- Deserialization: Missing `instruments` field defaults to empty vector
- Frontend: If `score.instruments.length === 0`, assume piano

---

## Frontend Data Model (TypeScript)

### Updated Type: Score

**Location**: `frontend/src/types/score.ts`

```typescript
import { Note, Voice, StructuralEvent } from './notation';

export interface Instrument {
  id: string;
  instrument_type: string; // "piano", "guitar", etc.
}

export interface Score {
  id: string;
  title: string;
  tempo: number;            // BPM
  time_signature: [number, number]; // [numerator, denominator]
  instruments: Instrument[]; // NEW: Array of instruments
  voices: Voice[];
  structural_events: StructuralEvent[];
  // ... existing fields
}
```

**Default Instrument Helper**:

```typescript
export function getScoreInstrument(score: Score): Instrument {
  if (score.instruments.length === 0) {
    // Backward compatibility: no instruments → default piano
    return { id: 'default', instrument_type: 'piano' };
  }
  return score.instruments[0]; // MVP: Use first instrument only
}
```

---

### New Types: Playback State

**Location**: `frontend/src/types/playback.ts`

```typescript
export type PlaybackStatus = 'stopped' | 'playing' | 'paused';

export interface PlaybackState {
  status: PlaybackStatus;
  currentTick: number;      // Current playback position in ticks (0 to max)
  startTime?: number;       // Tone.now() timestamp when playback started
  pausedAt?: number;        // Tick position when paused
}

export interface ScheduledNote {
  noteId: string;           // Note entity ID for tracking
  pitch: number;            // MIDI pitch (21-108 for piano)
  startTick: number;        // Musical time position
  durationTicks: number;    // Musical duration
  startTime: number;        // Real-time scheduled time (Tone.now() + offset)
  durationSeconds: number;  // Real-time duration in seconds
}
```

**Usage**:
- `PlaybackState`: Managed by `usePlayback` hook in MusicTimeline
- `ScheduledNote`: Internal to PlaybackScheduler, tracks scheduled events for cancellation

---

## Entity Relationships

```
┌─────────────────────────────────────────┐
│ Score (Backend)                         │
│ ┌─────────────────────────────────────┐ │
│ │ id: String                          │ │
│ │ title: String                       │ │
│ │ tempo: u16 (BPM)                    │ │
│ │ time_signature: (u8, u8)            │ │
│ │ instruments: Vec<Instrument>  ◄─────┼─┼─┐
│ │ voices: Vec<Voice>                  │ │ │
│ └─────────────────────────────────────┘ │ │
└─────────────────────────────────────────┘ │
                                             │
                            ┌────────────────┘
                            │ 1:N (MVP uses first only)
                            │
                            ▼
                  ┌──────────────────────┐
                  │ Instrument (Backend) │
                  │ ┌──────────────────┐ │
                  │ │ id: String       │ │
                  │ │ instrument_type  │ │
                  │ │ (e.g., "piano")  │ │
                  │ └──────────────────┘ │
                  └──────────────────────┘
                            │
                            │ Serialized via API
                            │
                            ▼
                  ┌──────────────────────┐
                  │ Score (Frontend)     │
                  │ ┌──────────────────┐ │
                  │ │ instruments:     │ │
                  │ │ Instrument[]     │ │
                  │ └──────────────────┘ │
                  └──────────────────────┘
                            │
                            │ Used by
                            │
                            ▼
                  ┌──────────────────────┐
                  │ PlaybackScheduler    │
                  │ (Timing Calculation) │
                  └──────────────────────┘
                            │
                            │ Schedules
                            │
                            ▼
                  ┌──────────────────────┐
                  │ ToneAdapter          │
                  │ (Audio Synthesis)    │
                  └──────────────────────┘
```

**Key Relationships**:
1. **Score → Instrument** (1:N, MVP uses 1:1): Score contains instruments (backend domain)
2. **Score → Note** (1:N, existing): Notes are played by instrument (via Voice → Note hierarchy)
3. **Frontend Components → PlaybackState** (1:1): MusicTimeline manages single playback state
4. **PlaybackScheduler → ScheduledNote** (1:N): Scheduler tracks scheduled events for cancellation

---

## Data Flow: Playback Lifecycle

### 1. Initialization (Component Mount)

```
GET /api/scores/{id}
  ↓
Backend Score (with instruments array)
  ↓
Frontend Score type (instruments: Instrument[])
  ↓
getScoreInstrument(score) → First instrument or default piano
```

### 2. Play Button Click

```
User clicks Play
  ↓
usePlayback.play()
  ↓
PlaybackScheduler.scheduleNotes({
  notes: score.voices[0].notes,
  tempo: score.tempo,
  currentTick: playbackState.currentTick
})
  ↓
For each note:
  - Calculate startTime = Tone.now() + ticksToSeconds(note.start_tick - currentTick, tempo)
  - Calculate durationSeconds = ticksToSeconds(note.duration_ticks, tempo)
  - ToneAdapter.playNote(note.pitch, durationSeconds, startTime)
  ↓
Return array of ScheduledNote objects (for cancellation)
  ↓
Update PlaybackState: status='playing', startTime=Tone.now()
```

### 3. Pause Button Click

```
User clicks Pause
  ↓
usePlayback.pause()
  ↓
Calculate currentTick based on elapsed time
  ↓
PlaybackScheduler.clearSchedule() → Cancel all scheduled events
  ↓
Update PlaybackState: status='paused', pausedAt=currentTick
```

### 4. Stop Button Click

```
User clicks Stop
  ↓
usePlayback.stop()
  ↓
PlaybackScheduler.clearSchedule()
  ↓
ToneAdapter.stopAll() → Tone.Transport.cancel() + clear all
  ↓
Update PlaybackState: status='stopped', currentTick=0
```

---

## Validation Rules

### Backend: Instrument

| Field | Rule | Error Message |
|-------|------|---------------|
| `id` | Non-empty string, valid UUID format | "Instrument ID must be valid UUID" |
| `instrument_type` | Non-empty string, MVP validates === "piano" | "Only piano instrument supported in MVP" |

### Backend: Score (Updated)

| Field | Rule | Error Message |
|-------|------|---------------|
| `instruments` | Array with 0-10 items (0 = backward compat, 10 = future limit) | "Score cannot have more than 10 instruments" |

### Frontend: Playback State

| Field | Rule | Error Message |
|-------|------|---------------|
| `currentTick` | Non-negative integer, ≤ max score duration | "Playback position out of bounds" |
| `startTime` | Positive number (Tone.now() value) | "Invalid start time" |

---

## Test Data Examples

### Example 1: Score with Piano Instrument

```json
{
  "id": "score-001",
  "title": "Simple Scale",
  "tempo": 120,
  "time_signature": [4, 4],
  "instruments": [
    {
      "id": "inst-001",
      "instrument_type": "piano"
    }
  ],
  "voices": [
    {
      "id": "voice-001",
      "notes": [
        { "id": "note-001", "pitch": 60, "start_tick": 0, "duration_ticks": 960 },
        { "id": "note-002", "pitch": 62, "start_tick": 960, "duration_ticks": 960 },
        { "id": "note-003", "pitch": 64, "start_tick": 1920, "duration_ticks": 960 }
      ]
    }
  ]
}
```

**Expected Playback** (at 120 BPM):
- Note 1 (C4): Plays at 0.0s for 0.5s
- Note 2 (D4): Plays at 0.5s for 0.5s
- Note 3 (E4): Plays at 1.0s for 0.5s

### Example 2: Score with No Instruments (Backward Compatibility)

```json
{
  "id": "score-002",
  "title": "Legacy Score",
  "tempo": 120,
  "time_signature": [4, 4],
  "instruments": [],
  "voices": [...]
}
```

**Frontend Handling**: 
```typescript
const instrument = getScoreInstrument(score);
// Returns: { id: 'default', instrument_type: 'piano' }
```

### Example 3: Playback State Transitions

```typescript
// Initial state
const state: PlaybackState = {
  status: 'stopped',
  currentTick: 0
};

// After clicking Play
const playingState: PlaybackState = {
  status: 'playing',
  currentTick: 0,
  startTime: 123.456 // Tone.now() value
};

// After clicking Pause at 2 seconds (2400 ticks at 120 BPM)
const pausedState: PlaybackState = {
  status: 'paused',
  currentTick: 2400,
  pausedAt: 2400,
  startTime: undefined
};
```

---

## API Impact

### Updated Endpoint: GET /api/scores/:id

**Response Schema Change**:

```json
{
  "id": "string",
  "title": "string",
  "tempo": 120,
  "time_signature": [4, 4],
  "instruments": [
    {
      "id": "string",
      "instrument_type": "piano"
    }
  ],
  "voices": [...],
  "structural_events": [...]
}
```

**Breaking Change**: No (new field is optional, defaults to empty array)

**Contract Tests Required**: Yes (see [contracts/score-api.yml](contracts/score-api.yml))

---

## Performance Considerations

### Memory Usage

- **Instrument entity**: ~100 bytes per instrument (UUID + type string)
- **ScheduledNote array**: ~200 bytes per note × number of notes
  - Example: 1000 notes = 200KB in memory during playback
- **Tone.js PolySynth**: ~2MB heap allocation (Web Audio API nodes)

**Total Memory Impact**: <5MB for typical score (1000 notes). Acceptable for web application.

### Timing Accuracy

- **JavaScript Number precision**: 64-bit float, safe for integer ticks up to 2^53 (scores <100 hours)
- **Tone.js scheduling**: Uses Web Audio API clock (microsecond precision)
- **Expected accuracy**: ±5ms (measured), meets ±20ms requirement (SC-002)

---

## Future Extensions (Out of Scope)

1. **Multi-instrument support**: Expand `Score.instruments` from 1:1 to 1:N, assign voices to instruments
2. **Instrument configuration**: Add `volume`, `pan`, `midi_program` fields
3. **Sample-based synthesis**: Replace PolySynth with Tone.Sampler for realistic piano sound
4. **Dynamic tempo changes**: Support tempo structural events (currently assumes fixed tempo)
5. **Instrument presets**: Load instrument configurations from library (e.g., "Grand Piano", "Electric Piano")

**Migration Path**: All extensions are backward-compatible (additive fields, no breaking changes).
