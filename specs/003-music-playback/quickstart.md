# Quickstart Guide: Music Playback

**Feature**: 003-music-playback | **Audience**: Developers implementing this feature  
**Prerequisites**: Features 001 (score-model) and 002 (staff-notation-view) completed

## Overview

This guide helps you implement interactive music playback with Play/Pause/Stop controls. You'll add an Instrument entity to the backend, create playback timing services in the frontend, and integrate Tone.js for audio synthesis.

**Estimated Time**: 4-6 hours for MVP implementation

---

## Architecture Quick Reference

```
┌──────────────────────────────────────────────────────────────┐
│ Frontend: PlaybackControls.tsx (UI)                         │
│   ├─ Play Button   → usePlayback.play()                     │
│   ├─ Pause Button  → usePlayback.pause()                    │
│   └─ Stop Button   → usePlayback.stop()                     │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ MusicTimeline.ts (State Management)                         │
│   - Playback state: stopped/playing/paused                  │
│   - Current tick position tracking                          │
│   - Delegates to scheduler for audio events                 │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ PlaybackScheduler.ts (Timing Calculation)                   │
│   - Convert ticks → seconds: ticksToSeconds()               │
│   - Schedule all notes as audio events                      │
│   - Track scheduled events for cancellation                 │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ ToneAdapter.ts (Audio Synthesis)                            │
│   - Initialize Tone.js (handle autoplay policy)             │
│   - PolySynth for piano sounds                              │
│   - playNote(pitch, duration, time)                         │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
                      Tone.js Web Audio API
```

---

## Step 1: Backend - Add Instrument Entity (15 min)

### 1.1 Create Instrument Model

Create `backend/src/models/instrument.rs`:

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Instrument {
    pub id: String,
    pub instrument_type: String,
}

impl Default for Instrument {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            instrument_type: "piano".to_string(),
        }
    }
}
```

### 1.2 Update Score Model

In `backend/src/models/score.rs`, add instruments field:

```rust
use crate::models::instrument::Instrument;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Score {
    // ... existing fields
    pub instruments: Vec<Instrument>,
}

impl Score {
    pub fn new(title: String, tempo: u16, time_signature: (u8, u8)) -> Self {
        Self {
            // ... existing initialization
            instruments: vec![Instrument::default()], // Add default piano
        }
    }
}
```

### 1.3 Update Module Exports

In `backend/src/models/mod.rs`:

```rust
mod instrument;
pub use instrument::Instrument;
```

**Test**: Run `cargo test` in backend/ to ensure Score serialization/deserialization works with instruments field.

---

## Step 2: Frontend - Install & Configure Tone.js (10 min)

### 2.1 Install Dependency

```bash
cd frontend
npm install tone@^14.7.0
```

### 2.2 Update Score Type

In `frontend/src/types/score.ts`:

```typescript
export interface Instrument {
  id: string;
  instrument_type: string;
}

export interface Score {
  // ... existing fields
  instruments: Instrument[];
}

export function getScoreInstrument(score: Score): Instrument {
  return score.instruments[0] || { id: 'default', instrument_type: 'piano' };
}
```

---

## Step 3: Frontend - Create Playback Services (90 min)

### 3.1 ToneAdapter (Audio Layer)

Create `frontend/src/services/playback/ToneAdapter.ts`:

```typescript
import * as Tone from 'tone';

export class ToneAdapter {
  private polySynth: Tone.PolySynth | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    await Tone.start(); // Handle browser autoplay policy
    
    this.polySynth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 16,
      voice: {
        envelope: {
          attack: 0.005,
          decay: 0.3,
          sustain: 0.5,
          release: 1.0,
        },
      },
    }).toDestination();
    
    this.initialized = true;
  }

  playNote(midiPitch: number, durationSeconds: number, time: number): void {
    if (!this.polySynth) throw new Error('ToneAdapter not initialized');
    
    if (midiPitch < 21 || midiPitch > 108) {
      console.warn(`Pitch ${midiPitch} out of range, skipping`);
      return;
    }
    
    const noteName = Tone.Frequency(midiPitch, 'midi').toNote();
    this.polySynth.triggerAttackRelease(noteName, durationSeconds, time);
  }

  stopAll(): void {
    Tone.Transport.cancel();
    this.polySynth?.releaseAll();
  }

  getCurrentTime(): number {
    return Tone.now();
  }
}
```

### 3.2 PlaybackScheduler (Timing Logic)

Create `frontend/src/services/playback/PlaybackScheduler.ts`:

```typescript
import { Note } from '../../types/score';
import { ToneAdapter } from './ToneAdapter';

const PPQ = 960; // Pulses per quarter note

export function ticksToSeconds(ticks: number, tempo: number): number {
  const beatsPerSecond = tempo / 60;
  const ticksPerSecond = beatsPerSecond * PPQ;
  return ticks / ticksPerSecond;
}

export class PlaybackScheduler {
  constructor(private toneAdapter: ToneAdapter) {}

  scheduleNotes(notes: Note[], tempo: number, currentTick: number): void {
    const now = this.toneAdapter.getCurrentTime();
    
    notes.forEach(note => {
      if (note.start_tick < currentTick) return; // Skip past notes
      
      const offsetTicks = note.start_tick - currentTick;
      const startTime = now + ticksToSeconds(offsetTicks, tempo);
      const duration = ticksToSeconds(note.duration_ticks, tempo);
      
      this.toneAdapter.playNote(note.pitch, duration, startTime);
    });
  }

  clearSchedule(): void {
    this.toneAdapter.stopAll();
  }
}
```

### 3.3 MusicTimeline Hook (State Management)

Create `frontend/src/services/playback/MusicTimeline.ts`:

```typescript
import { useState, useRef } from 'react';
import { Note } from '../../types/score';
import { ToneAdapter } from './ToneAdapter';
import { PlaybackScheduler } from './PlaybackScheduler';

export type PlaybackStatus = 'stopped' | 'playing' | 'paused';

export function usePlayback(notes: Note[], tempo: number) {
  const [status, setStatus] = useState<PlaybackStatus>('stopped');
  const [currentTick, setCurrentTick] = useState(0);
  
  const toneAdapter = useRef(new ToneAdapter());
  const scheduler = useRef(new PlaybackScheduler(toneAdapter.current));

  const play = async () => {
    await toneAdapter.current.init();
    scheduler.current.scheduleNotes(notes, tempo, currentTick);
    setStatus('playing');
  };

  const pause = () => {
    scheduler.current.clearSchedule();
    // TODO: Calculate currentTick based on elapsed time
    setStatus('paused');
  };

  const stop = () => {
    scheduler.current.clearSchedule();
    setCurrentTick(0);
    setStatus('stopped');
  };

  return { status, currentTick, play, pause, stop };
}
```

---

## Step 4: Frontend - Create UI Component (30 min)

### 4.1 PlaybackControls Component

Create `frontend/src/components/playback/PlaybackControls.tsx`:

```typescript
import React from 'react';
import { usePlayback } from '../../services/playback/MusicTimeline';
import { Note } from '../../types/score';

interface PlaybackControlsProps {
  notes: Note[];
  tempo: number;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({ 
  notes, 
  tempo 
}) => {
  const { status, play, pause, stop } = usePlayback(notes, tempo);

  return (
    <div className="playback-controls">
      <button 
        onClick={play} 
        disabled={status === 'playing'}
        aria-label="Play"
      >
        {status === 'paused' ? '▶️ Resume' : '▶️ Play'}
      </button>
      
      <button 
        onClick={pause} 
        disabled={status !== 'playing'}
        aria-label="Pause"
      >
        ⏸️ Pause
      </button>
      
      <button 
        onClick={stop} 
        disabled={status === 'stopped'}
        aria-label="Stop"
      >
        ⏹️ Stop
      </button>
      
      <span>Status: {status}</span>
    </div>
  );
};
```

### 4.2 Integrate with NotationRenderer

In `frontend/src/components/notation/NotationRenderer.tsx`, add controls above staff:

```typescript
import { PlaybackControls } from '../playback/PlaybackControls';

export const NotationRenderer: React.FC<Props> = ({ score }) => {
  const notes = score.voices[0]?.notes || [];
  
  return (
    <div>
      <PlaybackControls notes={notes} tempo={score.tempo} />
      {/* ... existing staff rendering */}
    </div>
  );
};
```

---

## Step 5: Testing (60 min)

### 5.1 Backend Tests

Create `backend/tests/unit/models/instrument_test.rs`:

```rust
use musicore::models::Instrument;

#[test]
fn test_default_instrument_is_piano() {
    let instrument = Instrument::default();
    assert_eq!(instrument.instrument_type, "piano");
}

#[test]
fn test_instrument_serialization() {
    let instrument = Instrument::default();
    let json = serde_json::to_string(&instrument).unwrap();
    assert!(json.contains("piano"));
}
```

### 5.2 Frontend Unit Tests

Create `frontend/src/services/playback/PlaybackScheduler.test.ts`:

```typescript
import { ticksToSeconds } from './PlaybackScheduler';

describe('ticksToSeconds', () => {
  test('converts quarter note at 120 BPM', () => {
    const result = ticksToSeconds(960, 120); // 1 quarter note
    expect(result).toBeCloseTo(0.5, 2); // 0.5 seconds
  });

  test('converts quarter note at 60 BPM', () => {
    const result = ticksToSeconds(960, 60);
    expect(result).toBeCloseTo(1.0, 2); // 1.0 seconds
  });
});
```

### 5.3 Manual Testing Checklist

1. ✅ Load a score with 3-5 notes
2. ✅ Click Play → Hear notes in sequence
3. ✅ Click Pause mid-playback → Audio stops
4. ✅ Click Play again → Resumes from paused position
5. ✅ Click Stop → Audio stops, position resets to start
6. ✅ Test with 10 simultaneous notes (chord) → All audible

---

## Step 6: Validation Against Success Criteria

| Criterion | Target | How to Validate |
|-----------|--------|-----------------|
| SC-001 | Playback starts <500ms | Open DevTools → Performance → Record → Click Play → Measure time to first audio |
| SC-002 | Timing accuracy ±20ms | Create 1-second notes at 60 BPM → Measure actual duration with audio editor |
| SC-003 | Duration accuracy ±50ms | Schedule 0.5s notes → Verify actual duration |
| SC-004 | Control response <100ms | Click button → Measure React state update time |
| SC-005 | 10 simultaneous notes | Create chord with 10 notes at same start_tick → Verify all audible |
| SC-007 | Piano-like sound | Listen → Should have attack/decay, not sine wave beep |

---

## Common Issues & Solutions

### Issue: "AudioContext was not allowed to start"

**Cause**: Browser autoplay policy blocks audio until user interaction.

**Solution**: Ensure `Tone.start()` is called inside button click handler (already done in `play()` method).

---

### Issue: Notes play at wrong times

**Cause**: Incorrect PPQ or tempo value.

**Solution**: Verify `PPQ = 960` and `score.tempo` is in BPM (not milliseconds).

---

### Issue: Audio glitches with many notes

**Cause**: Too many simultaneous voices or CPU throttling.

**Solution**: Reduce `maxPolyphony` to 8, or batch-schedule notes in chunks.

---

### Issue: Pause doesn't maintain position

**Cause**: `currentTick` not updated during playback.

**Solution**: Implement tick tracking with `requestAnimationFrame` or Tone.Transport callbacks (deferred to implementation).

---

## Next Steps

After completing MVP:

1. **Add visual feedback**: Highlight current note during playback
2. **Improve pause**: Calculate exact tick position based on elapsed time
3. **Add progress bar**: Show playback position as percentage
4. **Switch to Tone.Sampler**: Use realistic piano samples
5. **Multi-instrument support**: Handle multiple instruments in Score

---

## Reference Links

- [Tone.js Documentation](https://tonejs.github.io/docs/)
- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [Feature Spec](spec.md)
- [Data Model](data-model.md)
- [API Contract](contracts/score-api.yml)
- [Research Notes](research.md)

---

**Questions?** Refer to [research.md](research.md) for technical decisions or [data-model.md](data-model.md) for entity relationships.
