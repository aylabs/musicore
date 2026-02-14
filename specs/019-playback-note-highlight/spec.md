# Feature Specification: Playback Note Highlighting

**Feature Branch**: `019-playback-note-highlight`  
**Created**: 2026-02-15  
**Status**: Draft  
**Input**: User description: "While playing, highlight the notes that are being played"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Note Highlighting During Playback (Priority: P1)

A user loads a musical score and presses play. As each note sounds, that note is visually highlighted on the score display, allowing the user to follow along and see exactly which note is currently producing sound. When the note stops sounding, the highlight is removed.

**Why this priority**: This is the core value proposition - providing immediate visual feedback synchronized with audio playback. Without this, the feature has no value. This enables users to learn music, follow along with performances, and understand the relationship between notation and sound.

**Independent Test**: Can be fully tested by loading a simple single-voice melody (e.g., C major scale), pressing play, and observing that each note becomes highlighted when its sound begins and unhighlighted when the sound ends. Delivers immediate value for following along with simple melodies.

**Acceptance Scenarios**:

1. **Given** a score is loaded and displayed, **When** the user starts playback, **Then** notes become highlighted as they are played and unhighlighted when they stop
2. **Given** playback is active with notes highlighted, **When** the user pauses playback, **Then** the currently highlighted notes remain visible but playback stops
3. **Given** playback is paused with notes highlighted, **When** the user resumes playback, **Then** highlighting continues from the paused position
4. **Given** playback is active, **When** the user stops playback, **Then** all note highlights are removed and the playback position resets to the beginning
5. **Given** playback is active, **When** the user seeks to a different position in the score, **Then** highlighting immediately updates to reflect notes playing at the new position

---

### User Story 2 - Multiple Simultaneous Note Highlighting (Priority: P2)

A user plays a score containing chords or multiple voices/instruments playing simultaneously. All notes that are sounding at any given moment are highlighted together, allowing the user to see the full harmonic content and voice relationships in real-time.

**Why this priority**: Most musical scores contain polyphony (multiple notes at once). While P1 proves the concept works, this expands the feature to handle realistic musical content including chords, harmonies, and multiple instrumental parts.

**Independent Test**: Can be tested independently by loading a score with simple chord progressions (e.g., C-F-G-C triads), playing it, and verifying that all notes in each chord are highlighted simultaneously. Delivers value for understanding harmony and chord structures.

**Acceptance Scenarios**:

1. **Given** a score with chord notation is loaded, **When** a chord is played, **Then** all notes in the chord are highlighted simultaneously
2. **Given** a multi-staff score with multiple instruments is loaded, **When** notes on different staves play simultaneously, **Then** all concurrent notes across all staves are highlighted
3. **Given** multiple notes are highlighted, **When** individual notes within a chord stop sounding (e.g., different duration), **Then** only those specific notes are unhighlighted while others remain visible
4. **Given** a dense passage with many simultaneous notes, **When** playback occurs, **Then** all playing notes remain visually distinguishable with clear highlighting

---

### User Story 3 - Highlight Visual Clarity and Accessibility (Priority: P3)

A user with specific visual needs or preferences can clearly distinguish highlighted notes from non-highlighted notes under various conditions (different background colors, score density, screen sizes). The highlighting provides sufficient contrast and visual distinction to be useful in all typical usage scenarios.

**Why this priority**: While P1 and P2 establish the functional behavior, this ensures the feature is actually usable and accessible to all users. Without clear visual distinction, the feature fails its purpose even if technically correct.

**Independent Test**: Can be tested by loading scores with different visual complexity levels (sparse single staff, dense piano music, full orchestral scores) and verifying that highlighted notes are clearly identifiable in each context. Delivers value by ensuring the feature is practically useful in real-world scenarios.

**Acceptance Scenarios**:

1. **Given** a score with many notes in close proximity, **When** some notes are highlighted, **Then** users can clearly distinguish which notes are highlighted and which are not
2. **Given** a score displayed on different screen sizes, **When** notes are highlighted, **Then** the highlighting remains clearly visible and does not obscure note details
3. **Given** playback is active with highlights, **When** the score scrolls to follow playback, **Then** highlighted notes remain clearly visible throughout the scroll transition
4. **Given** multiple voices or staves with simultaneous notes, **When** notes are highlighted, **Then** users can identify which notes belong to which staff/voice

---

### Edge Cases

- What happens when playback tempo is changed during playback? (Highlighting should maintain synchronization at the new tempo)
- What happens when a user seeks to a position mid-note? (Notes already sounding at that position should be immediately highlighted)
- What happens with very rapid note sequences (e.g., 32nd notes at fast tempo)? (Each note should receive highlighting even if brief, maintaining accuracy)
- What happens when the score display is scrolled manually during playback? (Highlighting continues to update but may be outside visible area)
- What happens with tied notes that span multiple measures? (The entire tied note duration should show highlighting across all tied noteheads)
- What happens with grace notes and ornaments? (These should be highlighted during their brief playback duration)
- What happens when there are more simultaneous notes than can be clearly displayed? (All notes should still be highlighted, even if visually crowded)
- What happens when playback loops or repeats? (Highlighting should accurately reflect the performance order including repeats, da capo, etc.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST apply a visual indicator to each note at the moment its sound begins during playback
- **FR-002**: System MUST remove the visual indicator from each note at the moment its sound ends during playback
- **FR-003**: System MUST maintain synchronization between audio playback and note highlighting with a maximum lag of 50 milliseconds
- **FR-004**: System MUST support highlighting multiple notes simultaneously when they are played at the same time (polyphonic playback)
- **FR-005**: System MUST maintain note highlighting accuracy during playback control operations (pause, resume, stop, seek)
- **FR-006**: System MUST immediately update highlighting when the user seeks to a different position during playback
- **FR-007**: System MUST clear all highlighting when playback is stopped
- **FR-008**: System MUST preserve highlighting state when playback is paused (highlighted notes remain visible while paused)
- **FR-009**: System MUST handle tempo changes during playback by maintaining accurate synchronization at the new tempo
- **FR-010**: System MUST highlight notes with sufficient visual contrast to be distinguishable from non-highlighted notes in all score contexts
- **FR-011**: System MUST support highlighting for all note types including grace notes, ornaments, and tied notes
- **FR-012**: System MUST accurately reflect performance order including repeats, da capo, dal segno, and other navigation markings
- **FR-013**: System MUST maintain highlighting accuracy for rapid note sequences regardless of tempo
- **FR-014**: System MUST handle highlighting updates at 60 frames per second or higher to ensure smooth visual feedback

### Key Entities

- **Note**: A musical event with a defined start time, duration, and pitch. During playback, a note transitions through states: not-yet-played, currently-playing (highlighted), and finished-playing
- **Playback Position**: The current moment in time within the musical timeline, measured from the start of the score. Determines which notes should be highlighted at any given moment
- **Highlight State**: A visual property applied to a note indicating whether it is currently producing sound. Can be active (note is playing) or inactive (note is not playing)
- **Playback Event**: A time-based notification that occurs when a note should start or stop playing, triggering corresponding highlight state changes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visual note highlighting appears within 50 milliseconds of the corresponding audio event starting
- **SC-002**: Visual note highlighting is removed within 50 milliseconds of the corresponding audio event ending
- **SC-003**: Users can correctly identify which notes are currently playing with 95% accuracy during testing
- **SC-004**: System maintains accurate highlighting for scores containing at least 10 simultaneous notes without visual degradation
- **SC-005**: Highlighting remains synchronized with audio across tempo changes ranging from 40 BPM to 240 BPM
- **SC-006**: Highlighting updates occur at a minimum rate of 60 visual updates per second during active playback
- **SC-007**: Users can distinguish highlighted notes from non-highlighted notes within 200 milliseconds of visual inspection
- **SC-008**: Seek operations result in correct highlighting state within 100 milliseconds of seeking to any position in the score
- **SC-009**: Feature operates without user-perceivable performance degradation on scores up to 1000 measures in length
- **SC-010**: 90% of test users report that highlighting improves their ability to follow along with musical playback

## Known Issues & Regression Tests *(if applicable)*

<!--
  CONSTITUTION REQUIREMENT: Principle VII (Regression Prevention)
  
  This section will be populated as issues are discovered during implementation, testing, or production.
  For each issue, we will:
  1. Document the issue here
  2. Create a failing test that reproduces it
  3. Fix the issue
  4. Verify the test passes
  5. Keep this documentation as a record
  
  Initially empty - will grow organically during development.
-->

No issues discovered yet. This section will be updated as the feature is developed and tested.


