# Feature Specification: Practice Complexity Levels

**Feature Branch**: `001-practice-complexity-levels`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "Introduce low/mid/high complexity levels to simplify the practice configuration. The user selects the level and based on it, the app configures the practice: low (Score C scale, 8 notes, Treble, 1 octave, 40 tempo), mid (random score, 16 notes, Treble, 1 octave, 80 tempo), high (random score, 20 notes, Bass, 2 octaves, 100 tempo)"

## Clarifications

### Session 2026-03-01

- Q: Should selecting a complexity level fully replace manual per-parameter configuration, supplement it via an Advanced toggle, or leave the UI decision to the planning phase? → A: Supplement — keep individual parameter controls accessible as an "Advanced" toggle or secondary screen.
- Q: Should the complexity level selection persist only within the current app session, or also across full page refreshes and app restarts? → A: Persist across app restarts.
- Q: Which specific octave anchors define the pitch range for note generation in each level? → A: Standard middle-register anchors — Treble levels: C4–C5 (1 octave); High (bass): C2–C4 (2 octaves).
- Q: When a user overrides a parameter via the Advanced panel after selecting a level, what should the level badge display? → A: Clear / unset the level badge — the user enters "custom" mode with no active level.
- Q: Does a random score / note generator already exist in the codebase, or does it need to be built as part of this feature? → A: Already exists — reuse the current generator; no new generation logic required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select Complexity Level Before Practicing (Priority: P1)

A user opens the practice configuration screen and, instead of manually adjusting individual settings (score, note count, clef, octave range, tempo), simply picks one of three preset complexity levels: Low, Mid, or High. The app immediately applies the corresponding configuration, and the user starts the practice session.

**Why this priority**: This is the core of the feature. Without this selection mechanism the entire feature has no value. All other stories depend on at least one level being selectable.

**Independent Test**: Open the practice configuration screen, select "Low", start practicing. Verify that the practice session uses a C-major-scale score, 8 notes, treble clef, 1-octave range and a tempo of 40 BPM.

**Acceptance Scenarios**:

1. **Given** the practice configuration screen is open, **When** the user selects "Low", **Then** the app configures a C major scale, 8 notes, treble clef, 1-octave range, tempo 40 BPM and the session is ready to start.
2. **Given** the practice configuration screen is open, **When** the user selects "Mid", **Then** the app configures a randomly generated score, 16 notes, treble clef, 1-octave range, tempo 80 BPM and the session is ready to start.
3. **Given** the practice configuration screen is open, **When** the user selects "High", **Then** the app configures a randomly generated score, 20 notes, bass clef, 2-octave range, tempo 100 BPM and the session is ready to start.
4. **Given** a complexity level has been selected, **When** the user starts the practice session, **Then** the session uses exactly the parameters associated with that level (no manual overrides required).

---

### User Story 2 - Switch Complexity Level Between Sessions (Priority: P2)

A user who has just finished a practice session wants to increase or decrease difficulty. They return to the practice configuration screen and select a different complexity level before starting a new session.

**Why this priority**: Progression and adaptation are key motivators for continued practice. Once the selection mechanism (P1) exists, enabling switching adds significant learning value with minimal additional effort.

**Independent Test**: Complete a practice session at "Low", return to configuration, select "High", start a new session. Verify the new session uses 20 notes, bass clef, 2-octave range, tempo 100 BPM.

**Acceptance Scenarios**:

1. **Given** a practice session was previously started with "Low", **When** the user navigates back to the configuration screen, **Then** the previously used complexity level is shown as the current selection.
2. **Given** "Low" is the current selection, **When** the user selects "High" and starts a new session, **Then** the new session uses the High-level parameters (20 notes, bass clef, 2 octaves, tempo 100 BPM).

---

### User Story 3 - Visual Differentiation of Levels (Priority: P3)

A new user sees the three complexity levels presented with clear labels and brief descriptions of what each level entails, allowing them to choose an appropriate starting point without prior knowledge of music theory.

**Why this priority**: Good labelling reduces confusion and improves first-time experience, but the feature delivers value even with plain text buttons.

**Independent Test**: Open the practice configuration screen and verify that each level option displays at minimum its name and a short summary of the practice parameters it applies.

**Acceptance Scenarios**:

1. **Given** the practice configuration screen is open, **When** the user views the complexity selector, **Then** each level (Low, Mid, High) is labelled and accompanied by a brief summary of its parameters (e.g., clef, note count, tempo).
2. **Given** a complexity level is selected, **When** the user looks at the selector, **Then** the current selection is visually distinct from unselected levels.
3. **Given** a complexity level is active, **When** the user changes any individual parameter via the Advanced panel, **Then** the level badge is cleared and no level is shown as selected (custom mode).

---

### Edge Cases

- What happens when the app cannot generate a random score for Mid/High? The app falls back to a predefined score and notifies the user that a preset score is being used.
- What if the user navigates away from the configuration screen without confirming a level? The previously saved level (or the default) remains active.
- What is the default complexity level on first launch? The app defaults to "Low" so new users receive the most approachable configuration.
- What happens to the level badge after a user changes a parameter via the Advanced panel? The badge is cleared and the configuration enters custom mode (no level active); re-selecting a level resets all parameters to that level's preset values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The practice configuration screen MUST present exactly three complexity level options: Low, Mid, and High.
- **FR-002**: When "Low" is selected, the app MUST apply the following practice configuration: C major scale score, 8 notes, treble clef, pitch range C4–C5 (1 octave), tempo 40 BPM.
- **FR-003**: When "Mid" is selected, the app MUST apply the following practice configuration: randomly generated score, 16 notes, treble clef, pitch range C4–C5 (1 octave), tempo 80 BPM.
- **FR-004**: When "High" is selected, the app MUST apply the following practice configuration: randomly generated score, 20 notes, bass clef, pitch range C2–C4 (2 octaves), tempo 100 BPM.
- **FR-005**: Selecting a complexity level MUST pre-fill all practice parameters (score type, note count, clef, octave range, tempo) so that users do NOT need to configure them individually. Individual parameter controls MUST remain accessible via an "Advanced" toggle or secondary screen for users who wish to override the preset values.
- **FR-006**: The complexity level selection MUST persist across navigation, page refreshes, and app restarts, so that returning to the app or the configuration screen always shows the last chosen level.
- **FR-007**: On first launch (no prior saved selection), the app MUST default to the "Low" complexity level.
- **FR-008**: When the user starts a practice session after selecting a level, the session MUST be configured with exactly the parameters defined for that level (FR-002 through FR-004).
- **FR-009**: When a user modifies any individual parameter via the Advanced panel while a complexity level is active, the active level badge MUST be cleared and the configuration MUST enter "custom" mode (no level shown as selected). Re-selecting a complexity level MUST reset all parameters to that level's preset values.

### Key Entities

- **Complexity Level**: A named preset (Low, Mid, High) that encapsulates a full set of practice parameters (score type, note count, clef, octave range, tempo).
- **Practice Configuration**: The aggregated set of parameters that governs a practice session. Under this feature, it is derived entirely from the selected Complexity Level.
- **Practice Session**: A single run of the practice activity, configured by the active Complexity Level at start time.

### Assumptions

- The random score / note generator already exists in the codebase; this feature reuses it by passing the level's pitch-range bounds and note-count parameters. No new generation logic is in scope.
- "C scale" for the Low level means the C major scale (C, D, E, F, G, A, B, C) spanning one octave, presented in ascending order.
- "1 octave" means the pitch range C4–C5 (treble levels); "2 octaves" means C2–C4 (high/bass level). These are fixed anchors, not configurable at runtime.
- The existing practice configuration UI supports the clef, note count, octave range, and tempo parameters; this feature groups them behind level presets while keeping the underlying controls accessible.
- Manual per-parameter configuration remains accessible via an "Advanced" toggle or secondary screen; by default the complexity level selector is the primary (and sufficient) entry point.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with no prior app experience can select a complexity level and begin a practice session within 15 seconds of opening the practice configuration screen.
- **SC-002**: All three complexity levels produce practice sessions with parameter values that exactly match the specifications in FR-002, FR-003, and FR-004 — verified across 100% of test runs.
- **SC-003**: The number of steps required to start a practice session is reduced to 2 (select level → start) compared to the previous per-parameter configuration flow.
- **SC-004**: The previously selected complexity level is correctly restored on 100% of return visits to the configuration screen, including after a full page refresh or app restart.



