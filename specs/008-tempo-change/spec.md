# Feature Specification: Score Tempo Change Support

**Feature Branch**: `008-tempo-change`  
**Created**: 2026-02-09  
**Status**: Draft  
**Input**: User description: "Support to change the tempo for a score"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adjust Playback Tempo in Real-Time (Priority: P1)

When a user imports or views a musical score, they can adjust the playback tempo (speed) in real-time using UI controls. The tempo change affects playback speed without altering pitch, allowing users to slow down difficult passages for practice or speed up familiar sections.

**Why this priority**: This is the core value - musicians commonly need to practice at different tempos. Slower tempos help beginners learn difficult passages, while advanced players may want to gradually increase speed. This is the most frequently requested tempo feature.

**Independent Test**: Can be fully tested by importing any score, starting playback, adjusting the tempo control (slider or buttons), and verifying that playback speed changes immediately while pitch remains unchanged.

**Acceptance Scenarios**:

1. **Given** a score is loaded and playing, **When** the user moves a tempo slider to 80% (slower), **Then** playback continues at 80% of the original tempo without pitch change
2. **Given** a score with marked tempo of 120 BPM, **When** the user adjusts tempo to 150% (faster), **Then** playback speed increases to 180 BPM effective tempo
3. **Given** a user is adjusting tempo during playback, **When** the slider is released at a new value, **Then** playback continues smoothly without stopping or glitching
4. **Given** a score is paused, **When** the user changes tempo and resumes playback, **Then** playback uses the new tempo setting

---

### User Story 2 - Display Current and Target Tempo (Priority: P2)

When a user adjusts tempo, the UI displays both the original score tempo and the current effective tempo, helping users understand the relationship between the score's intended speed and their practice speed.

**Why this priority**: Visual feedback is essential for musicians to know exactly what tempo they're practicing at. This helps them track progress (e.g., "I can now play this at 90% tempo") and return to specific practice tempos.

**Independent Test**: Can be tested by loading a score with marked tempo (e.g., 120 BPM), adjusting the tempo control, and verifying that the UI shows both the original tempo and the adjusted tempo (e.g., "120 BPM → 96 BPM at 80%").

**Acceptance Scenarios**:

1. **Given** a score with marked tempo of 120 BPM, **When** the user views the score, **Then** the UI displays "Tempo: 120 BPM" in the playback controls
2. **Given** a score playing at 120 BPM, **When** the user adjusts tempo to 75%, **Then** the UI displays "90 BPM (75% of 120 BPM)" or similar indication
3. **Given** a score with no tempo marking, **When** the user views the score, **Then** the UI displays a default tempo (e.g., "Tempo: 120 BPM (default)")
4. **Given** a user adjusts tempo multiple times, **When** viewing the tempo display, **Then** it always shows the current effective tempo accurately

---

### User Story 3 - Persist Tempo Changes Per Score (Priority: P3)

When a user adjusts the tempo for a score and closes the application, the tempo preference is remembered the next time they open that specific score, allowing them to continue practicing at their chosen tempo.

**Why this priority**: Users often practice the same piece over multiple sessions at a consistent tempo. Remembering their tempo preference saves time and maintains practice continuity. This is lower priority because users can manually re-adjust tempo each session.

**Independent Test**: Can be tested by opening a score, adjusting tempo to 85%, closing and reopening the application, loading the same score, and verifying that tempo starts at 85%.

**Acceptance Scenarios**:

1. **Given** a user has set a score's tempo to 85%, **When** they close and reopen the application and load the same score, **Then** the tempo control shows 85% and playback uses that tempo
2. **Given** a user has adjusted tempo for Score A (85%) and Score B (110%), **When** switching between scores, **Then** each score maintains its own tempo setting
3. **Given** a user resets tempo to 100% (original), **When** closing and reopening the score, **Then** the tempo starts at 100% (no adjustment)

---

### User Story 4 - Reset Tempo to Original (Priority: P3)

When a user has adjusted the tempo, they can quickly reset it to the original score tempo (100%) with a single button or action, without manually sliding back to the original value.

**Why this priority**: After practicing at slower tempos, users need to test themselves at the original tempo. A reset button is a convenience feature that saves time compared to manually adjusting back to 100%.

**Independent Test**: Can be tested by adjusting tempo to any value (e.g., 70%), clicking a "Reset Tempo" or "100%" button, and verifying that tempo returns to original and playback reflects the change.

**Acceptance Scenarios**:

1. **Given** a score with tempo adjusted to 60%, **When** the user clicks "Reset Tempo" or "100%", **Then** the tempo control returns to 100% and playback speed returns to original
2. **Given** a score already at 100% tempo, **When** the user clicks reset, **Then** nothing changes (button may be disabled or have no effect)

---

### Edge Cases

- What happens when tempo is adjusted to extreme values (e.g., 10% or 300%)?
  - System should enforce reasonable bounds (e.g., 25% to 200%) to maintain audio quality and usability
- How does the system handle scores with multiple tempo markings (tempo changes mid-piece)?
  - Tempo adjustment applies proportionally to all tempo markings (if score has 120 BPM → 80 BPM change, at 75% adjustment both become 90 BPM → 60 BPM)
- What if a score has no tempo marking?
  - System uses a default tempo (e.g., 120 BPM) as the baseline for adjustments
- What happens to tempo setting when a new score is loaded?
  - Tempo resets to 100% (original) for the new score, unless that score has a saved tempo preference (User Story 3)
- How does tempo adjustment interact with playback controls (play, pause, stop)?
  - Tempo can be adjusted at any time (before playback, during playback, while paused) and takes effect immediately during playback

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to adjust playback tempo from at least 50% to 200% of the original tempo
- **FR-002**: System MUST maintain pitch when adjusting tempo (time-stretching without pitch shift)
- **FR-003**: System MUST apply tempo changes immediately during playback without stopping or glitching
- **FR-004**: System MUST display the current effective tempo in BPM (beats per minute)
- **FR-005**: System MUST display the tempo adjustment percentage (e.g., "85%" or "x0.85")
- **FR-006**: System MUST provide increment/decrement buttons (+/- or up/down arrows) for tempo adjustment
- **FR-006a**: Tempo adjustment buttons MUST increase/decrease tempo by 1% per single click
- **FR-006b**: Tempo adjustment buttons MUST increase/decrease tempo by 10% when button is held pressed (long-press)
- **FR-007**: System MUST provide a reset/default button to return tempo to 100% (original)
- **FR-008**: System MUST persist tempo preferences per score across application sessions (User Story 3)
- **FR-009**: System MUST handle scores with no tempo marking by using a default tempo (e.g., 120 BPM)
- **FR-010**: System MUST apply tempo adjustment proportionally to all tempo markings within a score
- **FR-011**: System MUST enforce reasonable tempo bounds (suggested: 25% to 300%) to prevent audio degradation
- **FR-012**: System MUST reset tempo to 100% when loading a new score (unless a saved preference exists for that score)
- **FR-013**: Tempo adjustment MUST work regardless of playback state (stopped, playing, paused)

### Key Entities

- **Score**: Contains original tempo markings (BPM values at specific positions)
- **Playback State**: Includes current tempo adjustment factor (percentage/multiplier)
- **Tempo Preference**: Per-score setting storing user's preferred tempo adjustment for that score

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can adjust tempo from 50% to 200% without audio artifacts or pitch changes
- **SC-002**: Tempo changes apply within 100ms of user adjustment (imperceptible lag)
- **SC-003**: Tempo preference is persisted and restored correctly 100% of the time when reopening a score
- **SC-004**: UI displays current tempo and adjustment percentage with updates in real-time (<50ms after adjustment)
- **SC-005**: Users can complete tempo adjustment workflow (adjust slider → hear result) in under 2 seconds
- **SC-006**: Reset tempo action returns to 100% instantly (<50ms) with smooth playback continuation
- **SC-007**: System maintains stable playback at all tempo settings within the supported range without crashes or audio glitches
- **SC-008**: 90% of users successfully adjust tempo on first attempt without confusion (measured through usability testing)

## Assumptions *(optional)*

- The audio playback engine supports time-stretching (tempo change without pitch shift)
- The application already has a playback system with play/pause/stop controls
- Scores can have tempo markings (BPM) or use a default tempo
- Users understand basic tempo concepts (BPM, percentage adjustments)
- Tempo adjustment is per-score, not a global application setting

## Out of Scope *(optional)*

- **Tap tempo**: Allowing users to tap a button to set tempo by rhythm (separate feature)
- **Tempo curves**: Gradual tempo increases/decreases (accelerando/ritardando automation)
- **Metronome integration**: Visual/audio metronome clicking at the adjusted tempo (separate feature)
- **MIDI tempo editing**: Changing the score's actual tempo markings (this feature is about playback adjustment only)
- **Tempo presets**: Saving named tempo presets (e.g., "Practice: 70%", "Performance: 100%")
- **Per-section tempo**: Different tempo adjustments for different sections of the same score
