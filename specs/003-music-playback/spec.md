# Feature Specification: Music Playback

**Feature Branch**: `003-music-playback`  
**Created**: 2026-02-07  
**Status**: Draft  
**Input**: User description: "Add music playback for an instrument. Add the instrument entity to the Score. Using the Web Audio API add a start/pause/stop button in the score gui, play the notes associated to the score with the related instrument. Tone.js seems to be the best option to implement it. In the first iteration always use piano as the instrument. The basic architecture is: MusicTimeline → Playback Scheduler → Tone.js events"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Playback Controls (Priority: P1)

As a user reviewing a musical score, I want to start, pause, and stop playback so that I can hear how the music sounds and control when it plays.

**Why this priority**: This is the foundation of music playback - without basic controls, users cannot interact with audio playback at all. This represents the minimum viable product.

**Independent Test**: Can be fully tested by clicking the play button to start audio, pause button to temporarily stop, and stop button to reset playback. Delivers immediate value by allowing users to control playback even if only a single note plays.

**Acceptance Scenarios**:

1. **Given** a score with notes is loaded, **When** user clicks the "Play" button, **Then** playback begins from the start
2. **Given** playback is in progress, **When** user clicks the "Pause" button, **Then** playback pauses at the current position
3. **Given** playback is paused, **When** user clicks the "Play" button again, **Then** playback resumes from the paused position
4. **Given** playback is in progress or paused, **When** user clicks the "Stop" button, **Then** playback stops and resets to the beginning
5. **Given** an empty score with no notes, **When** user clicks "Play", **Then** no audio plays and the interface indicates no content to play

---

### User Story 2 - Accurate Note Timing (Priority: P2)

As a user listening to playback, I want notes to play at their correct timing positions with accurate durations so that the music sounds as intended.

**Why this priority**: Accurate timing is essential for music to sound correct. Without this, the playback would be musically meaningless. This builds on P1 controls.

**Independent Test**: Can be tested by creating a score with known rhythmic patterns (e.g., quarter notes at 120 BPM) and measuring actual playback timing against expected timing. Delivers musical accuracy.

**Acceptance Scenarios**:

1. **Given** a score with notes at different tick positions, **When** playback starts, **Then** each note plays at its correct time based on its start_tick value
2. **Given** notes with different durations, **When** those notes play, **Then** each note sounds for its specified duration_ticks length
3. **Given** notes scheduled simultaneously (same start_tick), **When** playback reaches that tick, **Then** all notes play together in sync
4. **Given** a tempo setting in the score, **When** playback occurs, **Then** timing reflects the correct tempo (e.g., 120 BPM means 960 ticks = 500ms)

---

### User Story 3 - Piano Sound Synthesis (Priority: P3)

As a user hearing playback, I want notes to sound like a piano instrument so that the music has a recognizable, pleasant timbre.

**Why this priority**: While playback timing is critical, the sound quality enhances the user experience. Piano is chosen for the first iteration as a universally recognized, pleasant instrument. This completes the feature.

**Independent Test**: Can be tested by playing any note and verifying it produces a piano-like sound (harmonically rich with attack and decay). Delivers musical realism and pleasant user experience.

**Acceptance Scenarios**:

1. **Given** playback is active, **When** a note plays, **Then** it produces a piano-like sound (not a simple sine wave or beep)
2. **Given** different pitches in the score, **When** those notes play, **Then** each produces the correct piano pitch (e.g., MIDI 60 = middle C)
3. **Given** notes with different velocities, **When** playback occurs, **Then** louder velocities produce stronger piano sounds
4. **Given** overlapping notes (polyphony), **When** multiple notes play simultaneously, **Then** all notes are audible and blend naturally

---

### Edge Cases

- What happens when playback is started while already playing? (Should restart from beginning or be ignored if already playing)
- How does system handle notes with extremely short durations (< 50ms)? (Should still trigger sound even if very brief)
- What happens if audio context is blocked by browser (user hasn't interacted with page)? (Should show warning/prompt user to enable audio)
- How does system handle notes outside piano range (below MIDI 21 or above MIDI 108)? (Should clamp to playable range or skip silently)
- What happens when pausing at the exact moment a note starts? (Note should pause mid-sound and resume cleanly)
- How does system handle simultaneous start/stop button clicks? (Should process in order or debounce)
- What if user navigates away during playback? (Should stop playback gracefully)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add an Instrument entity to the Score data model with at minimum an instrument type field
- **FR-002**: System MUST provide three playback controls in the score GUI: Start (Play), Pause, and Stop buttons
- **FR-003**: System MUST use Tone.js library for audio synthesis and scheduling
- **FR-004**: System MUST implement a MusicTimeline component that manages the musical timeline and current playback position
- **FR-005**: System MUST implement a Playback Scheduler that converts MusicTimeline events into Tone.js scheduled audio events
- **FR-006**: System MUST play each note at its specified start_tick position with tempo-based timing
- **FR-007**: System MUST sustain each note for its specified duration_ticks length
- **FR-008**: System MUST use a piano instrument (e.g., Tone.Sampler or Tone.PolySynth) in the first iteration
- **FR-009**: System MUST map MIDI pitch numbers from notes to correct piano pitches via Tone.js
- **FR-010**: System MUST support polyphonic playback (multiple simultaneous notes)
- **FR-011**: System MUST clear/cancel scheduled events when Stop is pressed
- **FR-012**: System MUST pause ongoing notes and resume them when Play is pressed after Pause
- **FR-013**: System MUST initialize Tone.js audio context (handle browser autoplay policies)
- **FR-014**: System MUST calculate timing based on PPQ (960 ticks per quarter note) and tempo (default 120 BPM if not specified)
- **FR-015**: System MUST visually indicate playback state (playing, paused, stopped) on the control buttons

### Key Entities *(include if feature involves data)*

- **Instrument**: Represents the instrument used for playback. For this iteration, will contain an instrument type field (e.g., "piano"). Future iterations may include additional configuration like volume, pan, effects.
  - Attributes: type (string, default "piano")
  - Relationship: Associated with Score (one instrument per score in first iteration)

- **Score** (updated): Existing entity, now includes an Instrument
  - New field: instrument (Instrument entity)
  - Existing fields: tempo, timeSignature, notes array, etc.

- **Note** (existing): Already contains pitch, start_tick, duration_ticks which are needed for playback
  - pitch: MIDI note number (21-108 for piano)
  - start_tick: When note starts in musical time
  - duration_ticks: How long note lasts in musical time

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can start playback and hear notes playing within 500ms of clicking the Play button
- **SC-002**: Note timing accuracy is within ±20ms of intended timing for tempos between 60-180 BPM
- **SC-003**: System accurately sustains notes for their specified duration within ±50ms
- **SC-004**: Playback controls (Play/Pause/Stop) respond to user clicks within 100ms
- **SC-005**: System successfully plays polyphonic music with up to 10 simultaneous notes without audio glitches
- **SC-006**: Pause functionality maintains exact playback position and resumes without timing drift
- **SC-007**: Piano sound produces harmonically rich tone (not simple sine wave) recognizable as a piano timbre
- **SC-008**: System handles scores with 0 notes gracefully (no errors, no audio)
- **SC-009**: Audio initialization completes successfully on first user interaction in 95% of common browsers (Chrome, Firefox, Safari, Edge)
- **SC-010**: Stopping playback fully releases audio resources and returns to initial state within 200ms

## Assumptions

- **A-001**: Tempo is stored in or derivable from the Score entity (default to 120 BPM if not present)
- **A-002**: All notes in the score are within the MIDI range 21-108 (standard piano range), or out-of-range notes will be skipped
- **A-003**: The Score entity structure is already established from Feature 001 (score-model)
- **A-004**: The frontend is using React (based on existing staff notation view component)
- **A-005**: Tone.js library can be added as a dependency via npm
- **A-006**: Browser supports Web Audio API (modern browsers from ~2015+)
- **A-007**: Users will interact with the page (click/touch) before playback, satisfying browser autoplay policies
- **A-008**: PPQ (Pulses Per Quarter note) is 960 ticks, consistent with Feature 002 (staff-notation-view)
- **A-009**: One instrument per score is sufficient for the first iteration (no multi-track support needed yet)
- **A-010**: Playback controls will be added to the existing score GUI interface

## Dependencies

- **Feature 001 (score-model)**: Requires Score and Note entities to be already defined
- **Feature 002 (staff-notation-view)**: Visual staff notation component exists and likely shares the same score data
- **External Dependency**: Tone.js library (https://tonejs.github.io/) for Web Audio API abstraction and audio scheduling

## Out of Scope

- Multi-track playback (multiple instruments playing simultaneously) - future iteration
- Real-time recording of user-played notes - future feature
- Audio effects (reverb, delay, compression) - future enhancement
- Instrument selection UI (changing from piano to other instruments) - future iteration  
- Visual playback cursor on staff notation - future enhancement (would require coordination with Feature 002)
- Tempo changes mid-score - future enhancement
- Export to audio file - future feature
- MIDI file import/export - separate feature
- Volume control slider - future enhancement
- Metronome click track - future enhancement
