# Feature Specification: Piano Practice Exercise

**Feature Branch**: `001-piano-practice`  
**Created**: 2026-02-22  
**Status**: Draft  
**Input**: User description: "Create a practice using piano recording - A new view displays a randomly generated exercise. One staff shows random notes (C3–C4, quarter notes). A second empty staff fills with user-played notes. When play is pressed, notes are highlighted one by one and the user must reproduce them. At the end, a report shows correct/wrong notes and a final score based on pitch and duration accuracy."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Play a generated exercise and receive results (Priority: P1)

A student opens the Practice Exercise view and sees a staff with randomly generated quarter notes in the C3–C4 range. They press Play to hear each note highlighted in sequence, attempt to reproduce the sequence on their piano (picked up by the microphone), and then receive a results report.

**Why this priority**: This is the complete end-to-end flow that delivers the core learning value. Every other story depends on at least part of it.

**Independent Test**: Can be fully tested by opening the Practice view, pressing Play, playing any notes into the microphone, and verifying a results report appears listing each note as Correct, Wrong pitch, Wrong timing, or Missed.

**Acceptance Scenarios**:

1. **Given** the user opens the Practice Exercise view, **When** the view loads, **Then** a staff is displayed with 8–16 randomly generated quarter notes drawn from the C3–C4 octave range, and a second empty staff is visible below it.
2. **Given** the exercise is loaded, **When** the user presses Play, **Then** each note on the exercise staff is highlighted in turn at the configured tempo, and an audible tone plays for each note.
3. **Given** playback is active, **When** the user plays a note on their piano that is detected by the microphone, **Then** that note appears on the second (response) staff in real time.
4. **Given** playback has finished and the user has played at least one note, **Then** a results report is displayed showing each target note, its status, and a final numeric score (0–100).

---

### User Story 2 — Receive a detailed per-note results report (Priority: P2)

After completing the exercise, the student sees a breakdown of every target note: which were played correctly, which had the right pitch but wrong timing, which were entirely missed, and which were extraneous. A numeric score summarises performance.

**Why this priority**: Without meaningful feedback the feature has no educational value beyond a first listen. Detailed results motivate continued practice.

**Independent Test**: Can be tested independently by completing an exercise and verifying the report data matches an expected vs. played note comparison, including the scoring formula.

**Acceptance Scenarios**:

1. **Given** the exercise is complete, **When** the report is shown, **Then** each target note has one of four statuses: ✅ Correct, ⚠️ Wrong pitch, ⏱ Wrong timing, or ❌ Missed.
2. **Given** the exercise is complete, **When** the report is shown, **Then** a total score (0–100) is displayed, calculated from pitch accuracy and timing accuracy weighted equally (50/50).
3. **Given** the user played more notes than were in the exercise, **When** the report is shown, **Then** extra notes are reported as Extraneous and reduce the score proportionally.
4. **Given** a perfect performance (all notes correct pitch and on-beat within tolerance), **When** the report is shown, **Then** the score is 100.
5. **Given** no notes were played at all, **When** the report is shown, **Then** all target notes are ❌ Missed and the score is 0.

---

### User Story 3 — Retry the same exercise or generate a new one (Priority: P3)

After reviewing the results, the student can either retry the same exercise (same note sequence) to try to improve their score, or generate a fresh random exercise.

**Why this priority**: Replayability is essential for practice — students need to attempt the same exercise multiple times to improve.

**Independent Test**: Can be tested by pressing "Try Again" after a report and verifying the same note sequence reappears with the response staff cleared, or pressing "New Exercise" and verifying a different sequence appears.

**Acceptance Scenarios**:

1. **Given** the results report is visible, **When** the user presses "Try Again", **Then** the response staff is cleared and the same exercise note sequence is ready to play again.
2. **Given** the results report is visible, **When** the user presses "New Exercise", **Then** a new random note sequence is generated and displayed, and the response staff is cleared.

---

### Edge Cases

- What happens when the user plays no notes at all before playback ends? → All target notes are ❌ Missed and the score is 0.
- What happens when the user presses Play while playback is already running? → The current playback restarts from the beginning.
- What if microphone permission is denied? → The response staff shows "Microphone access required to record your response"; the exercise notes still play and highlights still advance.
- What if all generated notes happen to be the same pitch? → Valid outcome; the exercise is displayed and scored normally.
- What if the user plays significantly early or late (outside tolerance)? → The note is classified as Wrong timing rather than Correct.
- What happens on a slow device where audio processing lags? → The system tolerates up to 300 ms of latency in note onset detection before marking timing as wrong.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Practice Exercise view MUST be accessible via a button in the Instrument view that is only visible when the application is running in debug mode, consistent with the existing Record View button pattern.
- **FR-002**: On entering the Practice Exercise view, the system MUST automatically generate between 8 and 16 quarter-note pitches, randomly selected from the range C3–C4 inclusive (pitches: C3, D3, E3, F3, G3, A3, B3, C4), and display them on a treble-clef staff.
- **FR-003**: A second empty treble-clef staff MUST be displayed below the exercise staff to receive the user's played notes in real time.
- **FR-004**: The system MUST provide a Play button. When pressed, it MUST highlight each note in the exercise staff sequentially at the configured tempo (default 80 BPM) and simultaneously produce an audible synthesised tone matching each note.
- **FR-005**: While playback is active, the system MUST use microphone input to detect pitches played by the user and display them on the response staff as they are played.
- **FR-006**: The system MUST align each user-played note to the nearest beat slot in the exercise sequence for comparison. A beat slot is defined as the ±200 ms window around each target note's expected onset time at the current tempo.
- **FR-007**: When playback completes (all notes have been highlighted), or the user presses Stop, the system MUST generate and display a results report containing: (a) a per-note comparison table and (b) a final numeric score from 0 to 100.
- **FR-008**: The per-note comparison MUST classify each target note slot using one of four statuses: Correct (right pitch within timing tolerance), Wrong pitch (note detected in the right slot but wrong pitch), Wrong timing (right pitch detected outside the beat window), or Missed (no note detected for that slot).
- **FR-009**: Extra notes played by the user that do not correspond to any target beat slot MUST be recorded as Extraneous and MUST reduce the final score.
- **FR-010**: The final score MUST be computed with 50% weight on pitch accuracy and 50% weight on timing accuracy, normalised to 0–100.
- **FR-011**: The results view MUST provide a "Try Again" button that clears the response staff and restores the same exercise sequence, ready to play again.
- **FR-012**: The results view MUST provide a "New Exercise" button that generates a new random note sequence and clears the response staff.
- **FR-013**: If microphone access is unavailable or denied, the view MUST display a clear error message and still allow the user to view and listen to the exercise notes via the Play button.
- **FR-014**: The feature MUST reuse the existing pitch detection service used by the Recording view; no duplicate pitch-detection logic should be introduced.
- **FR-015**: The default exercise configuration MUST be: 8 notes, quarter-note duration, 80 BPM, pitch range C3–C4.

### Key Entities

- **Exercise**: An ordered, immutable list of target notes (pitch + beat position) generated randomly for a session. Fixed once the view loads until "New Exercise" is pressed.
- **Response**: The ordered list of pitches detected from the user's microphone during playback, each with a measured onset timestamp.
- **NoteComparison**: The pairing of one target beat slot with zero or one detected response note, carrying a status (Correct / Wrong pitch / Wrong timing / Missed / Extraneous).
- **ExerciseResult**: The complete set of NoteComparisons for one attempt, plus the computed score (0–100).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student can load the view, play back an exercise, perform a response, and read a results report in under 2 minutes from first opening the view.
- **SC-002**: The scoring algorithm always produces 100 for a perfectly reproduced exercise and 0 for a completely missed one, with no exceptions.
- **SC-003**: Note onset detection correctly identifies pitch and assigns the correct beat slot for inputs that are within ±200 ms of the target beat, in at least 90% of cases during manual testing across the C3–C4 range.
- **SC-004**: The view is fully usable on a tablet in portrait orientation without horizontal scrolling, consistent with the rest of the application.
- **SC-005**: "Try Again" restores the same exercise and clears the response staff within 500 ms of being pressed.

---

## Assumptions

- The feature targets the same debug-only audience as the Recording view; general-release polish is out of scope for this iteration.
- All exercise notes are quarter notes in the initial version; mixed durations are out of scope.
- "C3–C4 inclusive" means C3, D3, E3, F3, G3, A3, B3, C4 (8 candidate pitches).
- The audible playback of exercise notes uses synthesised tones (OscillatorNode), consistent with the note-playback implementation already present in RecordingStaff.
- A timing tolerance of ±200 ms per beat at 80 BPM (~±quarter-note/3) is sufficient for the initial version.
- The random generator does not currently guarantee against repeated adjacent pitches.
- Score weighting (50% pitch / 50% timing) can be made configurable in a later iteration.

---

## Known Issues & Regression Tests *(if applicable)*

*No issues recorded yet. This section will be updated as issues are discovered during implementation.*

