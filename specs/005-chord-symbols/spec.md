# Feature Specification: Chord Symbol Visualization

**Feature Branch**: `005-chord-symbols`  
**Created**: 2026-02-08  
**Status**: Draft  
**Input**: User description: "Support visualization of chords. Now when several notes with different pitches are added at the same time, they are visualized with independent notes that are displaced. We need to use chord symbols!"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Display Chord Symbols (Priority: P1)

When a musician adds multiple notes with different pitches at the same tick position, the system displays them as a standard chord symbol (e.g., "C", "Am", "G7") above the staff notation instead of showing individual displaced notes.

**Why this priority**: This is the core functionality that solves the current visualization problem. Musicians are accustomed to reading chord symbols and find them much clearer than displaced individual notes. This delivers immediate value by making chord-heavy scores readable.

**Independent Test**: Load or create a score, add 3+ notes with different pitches at the same tick position (e.g., C4, E4, G4 at tick 0), and verify that a "C" chord symbol appears above the staff instead of three separate displaced notes.

**Acceptance Scenarios**:

1. **Given** a score with an instrument and voice, **When** user adds notes C4, E4, and G4 at tick 0, **Then** a "C" chord symbol appears above the staff at that position
2. **Given** a score with existing individual notes, **When** user adds more notes at the same tick to form a chord, **Then** the system updates the display to show a chord symbol
3. **Given** a score with a chord, **When** the score is played back, **Then** all notes in the chord sound simultaneously as expected
4. **Given** a score with multiple chords in sequence, **When** user views the score, **Then** each chord displays its appropriate symbol (C, Am, F, G, etc.)

---

### User Story 2 - Recognize Standard Chord Types (Priority: P2)

The system recognizes and displays common chord types including major, minor, diminished, augmented, and seventh chords with appropriate symbols.

**Why this priority**: Once basic chord display works, supporting standard chord vocabulary is essential for professional use. Musicians expect to see "Cm7" not just "C", making scores immediately readable.

**Independent Test**: Create chords of each type (major, minor, seventh, diminished, augmented) and verify correct symbol display for each.

**Acceptance Scenarios**:

1. **Given** notes C4, Eb4, G4 at the same tick, **When** displayed, **Then** shows "Cm" (C minor)
2. **Given** notes C4, E4, G4, Bb4 at the same tick, **When** displayed, **Then** shows "C7" (C dominant seventh)
3. **Given** notes C4, Eb4, Gb4 at the same tick, **When** displayed, **Then** shows "Cdim" (C diminished)
4. **Given** notes C4, E4, G#4 at the same tick, **When** displayed, **Then** shows "Caug" (C augmented)
5. **Given** notes C4, E4, G4, B4 at the same tick, **When** displayed, **Then** shows "Cmaj7" (C major seventh)

---

### User Story 3 - Manual Note View Option (Priority: P3)

Users can toggle between chord symbol view and individual note view for specific measures or the entire score, allowing them to see the actual notes when needed for detailed editing or learning.

**Why this priority**: While chord symbols are great for reading, some users may need to see individual notes for teaching, transcription, or editing purposes. This provides flexibility without removing the chord symbol benefit.

**Independent Test**: Display a score with chords, toggle view mode, and verify individual notes appear in traditional notation, then toggle back to see chord symbols again.

**Acceptance Scenarios**:

1. **Given** a score displaying chord symbols, **When** user toggles to "note view" mode, **Then** individual notes appear as traditional notation
2. **Given** a score in note view mode, **When** user toggles to "chord view" mode, **Then** chord symbols replace individual note display
3. **Given** a chord being edited, **When** user is in note view mode, **Then** they can add/remove individual notes and see them immediately
4. **Given** a score with both solo melody and accompaniment chords, **When** in chord view, **Then** melody notes remain as individual notes while accompaniment shows as chord symbols

---

### Edge Cases

- What happens when notes don't form a recognizable chord pattern (e.g., C, D#, F#)?
  - Display as individual notes or show as "unrecognized chord" depending on note count
- How does the system handle incomplete chords (only 2 notes)?
  - Display as interval notation (e.g., "C-E" for third) or individual notes for simplicity
- What happens when the same chord appears in different inversions?
  - Recognize and display the root chord symbol (e.g., C/E for first inversion C chord)
- How does system handle very complex jazz chords (9ths, 11ths, 13ths, altered chords)?
  - Support extended chord symbols (e.g., "Cmaj9", "G13", "D7#9") for comprehensive coverage
- What happens when chords span multiple octaves or have doubled notes?
  - Recognize the unique pitches and display appropriate symbol, ignoring octave duplication
- How does the system handle chords with non-standard voicings?
  - Analyze pitch classes and display recognized pattern, fall back to individual notes if ambiguous

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect when multiple notes with different pitches exist at the same tick position within a voice
- **FR-002**: System MUST analyze detected note groups to identify chord type (major, minor, diminished, augmented, seventh variations)
- **FR-003**: System MUST display chord symbols above the staff at the appropriate horizontal position corresponding to the note tick
- **FR-004**: System MUST render chord symbols using standard music notation conventions (e.g., "C", "Am", "G7", "Fdim")
- **FR-005**: System MUST preserve the underlying note data (pitch, duration, tick position) when displaying as chord symbols
- **FR-006**: System MUST continue playing all notes in the chord during audio playback regardless of display mode
- **FR-007**: System MUST support at minimum these chord types: major, minor, diminished, augmented, dominant seventh, major seventh, minor seventh
- **FR-008**: System MUST handle chord roots for all 12 chromatic pitches (C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B)
- **FR-009**: System MUST update chord symbol display dynamically when notes are added or removed from a chord
- **FR-010**: Users MUST be able to save and load scores with chord symbol display preferences retained
- **FR-011**: System MUST display individual notes normally (not as chord symbols) when they do not form a recognized chord pattern
- **FR-012**: System MUST handle chords across multiple voices by analyzing notes in a combined context for the same instrument staff
- **FR-013**: System MUST position chord symbols to avoid overlapping with other notation elements (clefs, time signatures, notes)

### Key Entities

- **Chord Group**: A collection of notes that occur at the same tick position with different pitches, representing a harmonic structure
  - Attributes: tick position, constituent notes (pitches), identified chord type, root note, display symbol
  - Relationship: Contains multiple Note entities, belongs to a Voice

- **Chord Type**: The harmonic classification of a chord group
  - Attributes: name (major, minor, seventh, etc.), symbol notation (e.g., "m", "7", "dim"), required intervals
  - Relationship: Referenced by Chord Groups for display purposes

- **Display Mode**: User preference for how simultaneous notes are visualized
  - Attributes: mode type (chord symbols vs. individual notes), scope (entire score, per-measure, per-staff)
  - Relationship: Affects rendering of Chord Groups

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view scores containing chords without seeing displaced individual notes - chords display as recognizable symbols
- **SC-002**: System correctly identifies and displays at least 95% of common chord types (major, minor, seventh chords) in standard voicings
- **SC-003**: Chord symbol display renders in under 100ms when adding notes to form a chord, providing immediate visual feedback
- **SC-004**: Musicians can read chord progressions 3x faster compared to the current displaced note visualization (measured by time to identify 10 chords)
- **SC-005**: Playback quality remains identical - all notes in chords sound correctly regardless of visualization mode
- **SC-006**: Chord symbols are positioned without overlapping other notation elements in at least 98% of typical score layouts
- **SC-007**: Users successfully create, edit, and save chord-based compositions with chord symbols persisting across session reload

## Assumptions

- Users are familiar with standard Western music chord notation conventions
- The score rendering system can support text/symbol overlay above staff notation
- The existing note model (pitch, tick, duration) provides sufficient data to identify chords
- Chord detection will focus on vertical harmony (simultaneous notes) rather than implied harmony from arpeggios or broken chords
- Default behavior is to show chord symbols when detected; users can opt-in to see individual notes if needed
- Chord symbols will use English/international notation (C, D, E, etc.) as default, with potential for localization later
- The system will use simplified enharmonic spelling (e.g., C# over Db) based on key signature or most common usage

## Out of Scope

- Automatic chord progression suggestion or generation
- Analysis of harmonic function (I, IV, V analysis) or Roman numeral notation
- Lead sheet generation with lyrics and chord symbols combined
- Audio-to-chord detection or automatic chord transcription from MIDI import
- Chord voicing recommendations or automatic voice leading
- Guitar chord diagrams or instrument-specific chord fingerings
- Advanced music theory analysis (secondary dominants, modal interchange, etc.)
