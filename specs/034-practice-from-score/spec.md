# Feature Specification: Practice from Score

**Feature Branch**: `034-practice-from-score`  
**Created**: 2026-02-28  
**Status**: Draft  
**Input**: User description: "Load practice notes from a score. Add a new third option to the practice plugin (Random, C4 Scale, Score). If selected the number of notes specified will be loaded from a score loaded using the same dialog than in the play score plugin."

## Clarifications

### Session 2026-02-28

- Q: When notes are extracted from a score, are their original durations preserved or normalised to quarter notes? → A: Normalised to quarter notes — only MIDI pitch is carried over from the score; durations are discarded.
- Q: At what level does note data cross the plugin/host boundary — does the host extract a flat note list, or does the plugin receive full score data and extract itself? → A: Host extracts and returns a flat note list — the Plugin API exposes a new score-selection capability that resolves to `{ midiPitch: number }[]`; the plugin receives pitches only and performs no score parsing.
- Q: When the Score preset is active, are the clef and octave range selectors hidden or kept visible but disabled? → A: Visible but disabled — controls remain visible, greyed out, with a short label indicating they are determined by the loaded score.
- Q: When a chord (multiple simultaneous notes) appears in the score's primary voice, which pitch is used for the exercise? → A: Top note (highest pitch) — lower simultaneous notes are discarded.
- Q: For multi-staff parts (e.g. grand staff piano scores), which staff is used for extraction and clef display? → A: Always the topmost staff (staff index 0) of the first part — its clef drives the exercise display and its notes are extracted.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Select a Score as the Practice Source (Priority: P1)

A user opens the Practice plugin and sees the existing two preset options in the sidebar (Random, C4 Scale). They now see a third option: **Score**. They select it and a score selection dialog opens — the same one used in the Play Score plugin. They choose a preloaded score (or load a score file). Once the score is loaded, the practice plugin extracts the configured number of notes from it and displays them on the exercise staff, ready to practice.

**Why this priority**: This is the core deliverable of the entire feature. It enables a real musical context for practice exercises, replacing artificially generated patterns with actual repertoire.

**Independent Test**: Open Practice plugin → select "Score" preset → score selection dialog appears → choose a preloaded score → exercise staff populates with notes from the score → exercise is ready to start.

**Acceptance Scenarios**:

1. **Given** the Practice plugin is open with a score loaded, **When** the user opens the sidebar, **Then** three preset options are shown: Random, C4 Scale, and Score.
2. **Given** the user selects the Score preset and no score has been loaded yet, **When** the selection happens, **Then** the score selection dialog opens automatically.
3. **Given** the score selection dialog is open, **When** the user selects a preloaded score, **Then** the dialog closes, the score is loaded, and the exercise staff displays exactly the number of notes configured in the Notes slider, extracted sequentially from the beginning of the score's first melodic part.
4. **Given** the Score preset is active and a score is already loaded, **When** the user changes the Notes count in the sidebar, **Then** the exercise updates immediately with the new note count (taken sequentially from the already-loaded score).
5. **Given** the Score preset is active and a score is already loaded, **When** the user wants to change the score, **Then** a "Change score" button is available next to the preset selector that re-opens the score selection dialog.
6. **Given** the Score preset is selected and an exercise is ready, **When** the user starts the exercise (via Play or pressing a note), **Then** the practice session proceeds identically to the Random and C4 Scale presets.

---

### User Story 2 — Load a Custom Score File for Practice (Priority: P2)

A user wants to practice notes from a score not in the preloaded library. From the score selection dialog, they choose "Load from file" and pick a MusicXML file from their device. Once parsed, the first N notes of the score's primary melody line are extracted and used as the exercise.

**Why this priority**: Extends the feature to personal repertoire, maximising practice relevance without requiring scores to be bundled in the app.

**Independent Test**: Open Practice plugin → select "Score" preset → dialog opens → tap "Load from file" → pick a MusicXML file → exercise staff loads notes from that file → exercise ready to start.

**Acceptance Scenarios**:

1. **Given** the score selection dialog is open, **When** the user taps "Load from file", **Then** the system file picker opens and the user can select a MusicXML file.
2. **Given** the user selects a valid MusicXML file, **When** the file is parsed successfully, **Then** the exercise is populated with the configured number of notes from the file's primary melody line.
3. **Given** the user selects a file that cannot be parsed, **When** parsing fails, **Then** an error message is shown inside the dialog and the preset reverts to the previously active preset (or Random if none was set).

---

### User Story 3 — Switch Between Presets Without Losing Score State (Priority: P3)

A user has the Score preset active with a score loaded. They temporarily switch to the Random preset to warm up, then switch back to the Score preset. The previously loaded score is still available — no need to re-open the dialog.

**Why this priority**: Preserves context when users briefly switch modes, reducing friction.

**Independent Test**: Select Score preset → load a score → switch to Random preset → switch back to Score preset → exercise staff re-populates from the same score without opening the dialog again.

**Acceptance Scenarios**:

1. **Given** the Score preset was previously active with a score loaded, **When** the user switches away and then returns to the Score preset, **Then** the exercise repopulates from the cached score without opening the selection dialog.
2. **Given** no score has ever been loaded in this session, **When** the user selects the Score preset, **Then** the score selection dialog opens automatically.

---

### Edge Cases

- What happens when the score has fewer notes than the configured note count? The exercise uses all available notes from the score without padding; the Notes slider maximum is capped to the available note count once a score is loaded.
- What happens when the user starts an exercise with the Score preset and then the score selection dialog is opened mid-exercise? The dialog must not open during an active exercise; the "Change score" option is disabled while an exercise is in progress.
- What happens when a score contains notes from multiple parts/instruments? Only the first melodic part (topmost staff, first voice) is used by default.
- What happens when a chord appears in the primary voice? Only the highest-pitched note of the chord is used; all lower simultaneous notes are discarded.
- What happens when a score's first voice contains rests at the start? Rests are skipped; only pitched notes are counted toward the note pool.
- What happens when the user cancels the score selection dialog without choosing a score? If no score has been loaded yet, the preset reverts to Random. If a score was already loaded, the current score and preset remain unchanged.
- What happens when the Practice plugin is navigated away from while the score selection dialog is open? The dialog is closed and any in-progress load is cancelled cleanly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The practice plugin sidebar MUST display three preset options: "Random", "C4 Scale", and "Score", where "Score" is the new addition.
- **FR-002**: When the user selects the "Score" preset and no score is currently loaded in the practice session, the system MUST automatically display the score selection dialog.
- **FR-003**: The Plugin API MUST expose a new score-selection capability that opens a score selection dialog (presenting both the preloaded library and a "Load from file" option) and resolves to an ordered flat list of pitched notes `{ midiPitch: number }[]`. All score parsing and note extraction are performed by the host; the plugin receives pitches only.
- **FR-004**: Once a score is selected or loaded, the system MUST extract exactly the number of pitched notes equal to the configured note count, taken sequentially from the **topmost staff (staff index 0), first voice** of the score's first part. Only the MIDI pitch value of each note is retained; original note durations are discarded and all exercise notes are treated as quarter notes. When a chord (multiple simultaneous pitches) is encountered, only the highest pitch is used; lower simultaneous notes are discarded. The clef of the topmost staff determines the clef used for the exercise staff display.
- **FR-005**: Rests encountered during note extraction MUST be skipped; only pitched note events count toward the configured note count.
- **FR-006**: If the score contains fewer pitched notes than the configured note count, the system MUST use all available pitched notes and MUST cap the Notes slider maximum to the available count for the currently loaded score.
- **FR-007**: The extracted notes MUST be displayed on the exercise staff and the practice flow (countdown, playing, results) MUST proceed identically to the Random and C4 Scale presets.
- **FR-008**: A "Change score" control MUST be available in the sidebar when the Score preset is active, allowing the user to re-open the score selection dialog without changing the preset.
- **FR-009**: The "Change score" control MUST be disabled while an exercise is in progress (countdown, playing phases).
- **FR-010**: When the user switches away from the Score preset and later returns to it within the same session, the previously loaded score MUST be reused without opening the selection dialog.
- **FR-011**: When the score selection dialog is cancelled with no previously loaded score, the preset MUST revert to "Random".
- **FR-012**: When a MusicXML file fails to parse, the system MUST display an error message in the dialog and MUST NOT corrupt the current exercise state.
- **FR-013**: When the Score preset is active, the clef and octave range selectors in the sidebar MUST remain visible but be rendered as disabled (greyed out). A short inline label MUST be shown indicating these values are determined by the loaded score.

### Key Entities

- **ScorePreset source**: A loaded score (preloaded or user-provided) held in the practice session; stores the full ordered list of pitched notes (MIDI pitch values only, duration discarded) available for extraction.
- **Extracted exercise notes**: The first N pitched notes taken sequentially from the score's primary voice, each treated as a quarter note. N equals the current `noteCount` configuration. Onset timings follow the same formula as all other presets: `expectedOnsetMs = slotIndex × (60_000 / bpm)`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can select the Score preset, choose a preloaded score, and reach a ready-to-start exercise without any additional steps or dialogs in under 15 seconds.
- **SC-002**: Switching between the Score preset and any other preset and back within the same session requires zero additional dialogs if a score was already loaded.
- **SC-003**: 100% of the existing practice exercise functionality (flow mode, step mode, MIDI input, microphone input, scoring, results) remains fully available when using the Score preset.
- **SC-004**: When a score has been loaded, changing the Notes count updates the exercise instantly (no additional dialog or navigation required).
- **SC-005**: Loading a user-provided MusicXML file and starting a practice exercise from it can be accomplished in under 30 seconds from opening the dialog.

## Assumptions

- The score note extraction always uses the **topmost staff (staff index 0), first voice** of the first part. For grand staff scores (e.g. piano with treble + bass staves), only the treble staff is used. Multi-part / multi-voice support is out of scope for this feature.
- Extracted notes retain their original MIDI pitch values from the score; no transposition is applied. Note durations from the score are discarded — all extracted exercise notes are treated as quarter notes, consistent with the Random and C4 Scale presets.
- The BPM setting in the practice sidebar drives exercise tempo independently of any tempo markings in the source score.
- The Plugin API will be extended with a new score-selection capability. The host is responsible for displaying the selection dialog, parsing the chosen score, extracting pitched notes from its first melodic voice, filtering out rests, and returning a flat `{ midiPitch: number }[]` list to the plugin. The dialog UI is shared with the Play Score plugin. This API extension is in scope for this feature.
- The clef and octave range selectors in the practice sidebar are visible but disabled when the Score preset is active. They display a short label indicating the values are determined by the loaded score. The clef used for the exercise staff display is the clef of the topmost staff of the score's first part.
- After a score is loaded in a practice session it is held in memory for the duration of the session; it is not persisted across app reloads.

