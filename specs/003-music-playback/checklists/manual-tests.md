# Manual Test Checklist - Music Playback (Feature 003)

**Purpose**: Manual validation tests for piano sound quality and playback features  
**Test Date**: _______________  
**Tester**: _______________  
**Environment**: Browser: _______________  OS: _______________

---

## User Story 3: Piano Sound Synthesis

### T045 - US3: Piano Sound Quality Tests

#### Test 1: Piano Timbre (SC-007)
**Goal**: Verify piano sound is harmonically rich, not a simple sine wave

- [ ] Play middle C (MIDI 60 - C4)
- [ ] Sound has attack and decay characteristics 
- [ ] Sound is not a simple beep/sine wave
- [ ] Sound resembles a piano tone
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

#### Test 2: Different Pitches
**Goal**: Verify pitch mapping is accurate across the piano range

- [ ] Play low A (MIDI 21 - A0) - lowest piano note
- [ ] Play middle C (MIDI 60 - C4)
- [ ] Play concert A (MIDI 69 - A4 @ 440Hz)
- [ ] Play high C (MIDI 108 - C8) - highest piano note
- [ ] All notes sound at correct pitch
- [ ] No distortion or clipping
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

#### Test 3: Polyphonic Playback (SC-005)
**Goal**: Verify 10 simultaneous notes can play without issues

**Setup**: Create a 10-note chord (e.g., C major scale + 3 harmony notes)

- [ ] Add 10 notes with same start_tick to create a chord
- [ ] Click Play
- [ ] All 10 notes sound simultaneously
- [ ] No notes are dropped or missing
- [ ] No audio glitches or crackling
- [ ] Sound quality remains clear
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

#### Test 4: Out-of-Range Pitches
**Goal**: Verify notes outside piano range are handled gracefully

- [ ] Attempt to add note with MIDI pitch < 21 (below A0)
- [ ] Browser console shows warning message
- [ ] Playback continues without crash
- [ ] Attempt to add note with MIDI pitch > 108 (above C8)
- [ ] Browser console shows warning message
- [ ] Playback continues without crash
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

#### Test 5: Sample Loading
**Goal**: Verify Salamander piano samples load correctly

- [ ] Create new score and add notes
- [ ] Click Play for the first time
- [ ] Notice 1-2 second delay while samples load (expected)
- [ ] Playback begins after loading complete
- [ ] Subsequent plays start immediately (samples cached)
- [ ] No console errors during sample loading
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

---

## User Story 1 & 2: Basic Playback Controls & Timing

### Test 6: Play/Pause/Stop Controls
**Goal**: Verify basic playback controls work correctly

- [ ] Play button starts playback (changes to Pause)
- [ ] Pause button pauses playback
- [ ] Resume (Play again) continues from paused position
- [ ] Stop button resets playback to beginning
- [ ] Visual status indicator updates correctly
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

### Test 7: Timing Accuracy (SC-001, SC-002)
**Goal**: Verify notes play at correct times with accurate durations

**Setup**: Create 4 quarter notes at 120 BPM (960 ticks apart)

- [ ] Notes play at 0s, 0.5s, 1.0s, 1.5s (±10ms tolerance)
- [ ] Each note duration is 0.5s (±10ms tolerance)
- [ ] No timing drift over longer scores
- [ ] Playback starts within 500ms of clicking Play (SC-001)
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

### Test 8: Empty Score Handling
**Goal**: Verify graceful handling when no notes exist

- [ ] Create new score (no instruments or notes)
- [ ] Play button is disabled OR shows "No notes to play"
- [ ] No errors in browser console
- [ ] Add notes, Play button becomes enabled
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

---

## Performance & Responsiveness

### Test 9: Playback Start Performance (SC-001, SC-004)
**Goal**: Verify playback performance meets requirements

- [ ] Playback starts within 500ms of clicking Play
- [ ] Play/Pause/Stop respond within 100ms of click
- [ ] No UI freezing during playback
- [ ] No audio stuttering or dropouts
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

### Test 10: Browser Autoplay Policy (SC-008)
**Goal**: Verify autoplay policy is handled correctly

- [ ] Initial page load does NOT auto-play (compliance)
- [ ] First Play click initializes audio (user interaction required)
- [ ] If browser blocks audio, clear error message shown
- [ ] Subsequent plays work without re-initialization
- **Status**: ⬜ PASS ⬜ FAIL  
- **Notes**: _______________________________________

---

## Overall Assessment

### Success Criteria Met
- [ ] SC-001: Playback starts within 500ms
- [ ] SC-002: Notes play at correct times (±10ms)
- [ ] SC-004: Controls respond within 100ms
- [ ] SC-005: 10 simultaneous notes play correctly
- [ ] SC-007: Piano sound is harmonically rich
- [ ] SC-008: Autoplay policy compliance

### Critical Issues Found
- _______________________________________________
- _______________________________________________

### Non-Critical Issues Found
- _______________________________________________
- _______________________________________________

### Recommendations
- _______________________________________________
- _______________________________________________

---

**Final Status**: ⬜ APPROVED FOR RELEASE ⬜ NEEDS FIXES

**Tester Signature**: _______________  **Date**: _______________
