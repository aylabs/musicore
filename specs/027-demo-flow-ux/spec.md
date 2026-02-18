# Feature Specification: Demo Flow UX

**Feature Branch**: `027-demo-flow-ux`  
**Created**: 2026-02-18  
**Status**: Draft  
**Input**: User description: "Demo user flow — full-screen play view, return arrow navigation, remove blue instrument-count bar, move tempo control to right of timer, remove zoom control (tablet users use pinch-to-zoom), move title to left of playback buttons, improve pitch-to-play (note tap = seek only, no auto-start, use proper hitbox), improve pause/resume on touch (tap empty area), center bracket between clefs, improve note highlight visibility (possibly vertical slicing bar), change Instrument View button to return arrow"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Immersive Full-Screen Play View (Priority: P1)

A user navigating from the Instruments screen to the Play screen wants the score to fill the entire display so they can read notation comfortably on a tablet. When they are done, they expect a clear and immediate way to go back using either a visible return arrow or the device's native back gesture.

**Why this priority**: The full-screen play view defines the quality of the demo experience. All other UX improvements are secondary unless the score fills the screen cleanly.

**Independent Test**: Navigate Instruments → Play, verify score occupies the full screen, tap the return arrow, verify return to Instruments. Deliver value without any other story being implemented.

**Acceptance Scenarios**:

1. **Given** the user is on the Instruments screen, **When** they tap Play, **Then** the app invokes the browser Fullscreen API (`requestFullscreen`) and the Play screen occupies the full display with OS chrome and browser navigation hidden. On browsers where the Fullscreen API is unsupported, the app falls back to hiding all app-level UI chrome instead.
2. **Given** the user is on the full-screen Play screen, **When** they tap the return arrow, **Then** the app navigates back to the Instruments screen.
3. **Given** the user is on the full-screen Play screen, **When** they perform the device back gesture, **Then** the app navigates back to the Instruments screen.
4. **Given** an "Instruments View" button previously existed on the Play screen, **When** the user views the updated Play screen, **Then** that button is replaced by a return arrow icon in a consistent position.

---

### User Story 2 — Precise Score Touch Interaction (Priority: P1)

A user watching the score during playback wants to tap a note to seek to that position in the piece without triggering automatic playback. When the score is paused, tapping an empty area of the score (not a note) should toggle play/pause. Note tap targets must match the visible note head so accidental misses are rare.

**Why this priority**: The current behaviour (note tap starts playback) breaks the demo flow for presenters. Fixing touch semantics is critical for a usable demo.

**Independent Test**: With playback paused, tap a note head — verify position seeks without auto-playing. Tap an empty region — verify playback toggles. Delivers correct interaction model independently.

**Acceptance Scenarios**:

1. **Given** `playback is paused`, **When** the user taps a note head, **Then** the playback position seeks to that note's time and playback remains paused.
2. **Given** `playback is active`, **When** the user taps a note head, **Then** the playback position seeks to that note's time and playback continues without interruption.
3. **Given** `playback is paused`, **When** the user taps an empty area of the score (not on a note), **Then** playback begins from the current position.
4. **Given** `playback is active`, **When** the user taps an empty area of the score, **Then** playback pauses.
5. **Given** the score is displayed, **When** the user attempts to tap a visible note head, **Then** the tap is recognised as hitting the note at least 95% of the time (hitbox matches the visual note head).

---

### User Story 3 — Consolidated Playback Strip (Priority: P2)

A user operating the playback controls on a tablet wants a clean, uncluttered toolbar that shows only essential controls. The blue instrument-count bar adds visual noise without value during playback. The title should be readable next to the playback buttons, and the tempo control should be visible beside the timer without requiring a separate interaction area. The zoom control should be removed entirely since tablet users can pinch-to-zoom natively.

**Why this priority**: Reduces visual clutter and consolidates the control strip into one coherent row. Depends on the Play screen existing (US1) but adds no core functionality — pure UX polish.

**Independent Test**: Open the Play screen and verify: no blue bar, title visible left of playback buttons, tempo control visible right of the timer, no zoom control present. Independently testable by visual inspection.

**Acceptance Scenarios**:

1. **Given** the Play screen is open, **When** the user views the playback toolbar, **Then** no blue instrument-count bar is displayed anywhere on the screen.
2. **Given** the Play screen is open, **When** the user views the playback toolbar, **Then** the score title is displayed to the left of the play/pause/stop buttons.
3. **Given** the Play screen is open, **When** the user views the playback toolbar, **Then** the tempo control (BPM) is displayed to the right of the playback timer.
4. **Given** the Play screen is open, **When** the user views the playback toolbar, **Then** no zoom control (buttons or slider) is present in the UI.
5. **Given** the score title is long, **When** the playback toolbar is rendered on a 10-inch tablet in portrait orientation, **Then** all remaining controls remain visible without truncation or overflow.

---

### User Story 4 — Improved Note Highlight Visibility (Priority: P3)

A user watching a score during playback wants to instantly know which note or beat is currently playing. The current highlight colour and size can be missed on complex scores with many notes. The mandatory improvement is to make the existing note highlight significantly more visible (stronger colour, larger indicator, or increased opacity). A full-height vertical bar at the current beat position is a stretch goal, deferred unless the enhanced highlight alone fails SC-005.

**Why this priority**: Enhances the demo experience visually but does not affect interaction. Lower priority than functional correctness (US1, US2) and layout cleanup (US3).

**Independent Test**: Start playback on a multi-staff score and verify the currently playing note highlight is identifiable at a glance from 60 cm away without a vertical bar present.

**Acceptance Scenarios**:

1. **Given** playback is active, **When** a note is being played, **Then** the note highlight is rendered with clearly increased visibility compared to the previous style (stronger colour, larger indicator, or higher opacity).
2. **Given** a dense passage with many simultaneous notes, **When** playback is active, **Then** the highlighted note remains distinguishable from surrounding unhighlighted notes.
3. **Given** the enhanced highlight does not satisfy SC-005 after testing, **When** the team reviews results, **Then** a vertical beat-position bar spanning all staves is added as a follow-up task.

---

### User Story 5 — Bracket Centred Between Staves (Priority: P3)

A user viewing a multi-staff instrument (e.g., piano with treble and bass clef) wants the brace or bracket on the left of the system to appear visually centred between the two staves, avoiding a misaligned appearance.

**Why this priority**: Visual polish for multi-instrument scores. No functional impact; lowest priority.

**Independent Test**: Open a two-staff score (piano) and verify the bracket is vertically centred between the two staff lines.

**Acceptance Scenarios**:

1. **Given** a score with a two-staff instrument, **When** the score is rendered, **Then** the bracket or brace on the left of the system is visually centred between the top line of the upper staff and the bottom line of the lower staff.
2. **Given** the score is resized or reflowed, **When** the layout updates, **Then** the bracket remains correctly centred.

---

### Edge Cases

- What happens when the score title is very long (>40 characters) and must share the toolbar row with playback buttons and tempo?
- How should seek-on-tap behave if the user taps a rest rather than a note?
- What happens if the user performs a back gesture during active playback — should playback stop automatically on return to Instruments?
- On devices that do not support pinch-to-zoom (e.g., desktop browsers in the demo), is there any fallback for zoom since the zoom control is removed?
- How does the vertical beat indicator behave on a single-staff score versus a grand-staff instrument?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the user enters the Play screen, the app MUST invoke the browser Fullscreen API (`requestFullscreen`) to hide OS-level chrome and browser navigation. On browsers where the Fullscreen API is unsupported or denied, the app MUST fall back to hiding all app-level UI chrome (headers, nav bars) so the score occupies the maximum available area.
- **FR-002**: The Play screen MUST display a return arrow that navigates back to the Instruments screen when tapped.
- **FR-003**: The device back gesture MUST navigate from the Play screen to the Instruments screen.
- **FR-004**: Any "Instruments View" button that previously appeared on the Play screen MUST be removed and replaced by the return arrow (FR-002).
- **FR-005**: Tapping a note head on the score MUST seek playback to that note's time position without automatically starting or stopping playback.
- **FR-006**: The tap hitbox for each note MUST match the visible bounds of the note head so that deliberate taps on visible notes register correctly.
- **FR-007**: Tapping an empty area of the score (not on any note) MUST toggle playback between playing and paused states.
- **FR-008**: The blue instrument-count bar MUST be removed from the Play screen.
- **FR-009**: The score title MUST be displayed to the left of the playback control buttons (play, pause, stop) within the playback strip.
- **FR-010**: The tempo control MUST be displayed to the right of the playback timer within the playback strip.
- **FR-011**: The zoom control (buttons or slider) MUST be removed from the Play screen UI entirely.
- **FR-012**: The current-beat position MUST be indicated by an enhanced note highlight (increased colour contrast, size, or opacity relative to the current style). A full-height vertical bar spanning all staves is explicitly out of scope for this feature unless SC-005 is not met by the enhanced highlight alone, in which case it is added as a separate follow-up task.

### Assumptions

- Tablet users are expected to use native pinch-to-zoom for score magnification; therefore removing the zoom control is safe for the target device (tablet in demo context).
- The primary target platform for the demo is Android tablet; the Fullscreen API behaves reliably there. iOS Safari has partial `requestFullscreen` support — the fallback (hide app-level chrome) is the expected behaviour on iOS.
- "Empty area" means any touch target that does not resolve to a note head hitbox. Rests are treated as empty areas for pause/resume purposes.
- The return arrow replaces the "Instruments View" button and occupies a consistent position (e.g., top-left of the Play screen).
- If playback is active when the user navigates back via the return arrow or back gesture, playback stops automatically.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can navigate from the Instruments screen to the Play screen and back in under 5 seconds using the return arrow.
- **SC-002**: Deliberate taps on visible note heads register as note-tap events at least 95% of the time during manual testing.
- **SC-003**: The playback strip (title + controls + tempo + timer) fits within the toolbar row of a 10-inch tablet in portrait orientation without truncation or overflow.
- **SC-004**: After removing the zoom control and blue bar, the Play screen shows at least 15% more vertical space dedicated to the score.
- **SC-005**: The current-beat indicator is identified as "clearly visible" by at least 90% of observers viewing the screen from 60 cm.
- **SC-006**: Pause/resume toggles in response to an empty-area tap within 150 ms of touch release.
- **SC-007**: Seek-on-tap (note tap → playback position change) completes within 300 ms of touch release, including scheduler reset and audible output from the new position.

## Clarifications

### Session 2026-02-18

- Q: What mechanism should "full-screen mode" use — browser Fullscreen API, PWA standalone chrome removal, or both? → A: Invoke the browser Fullscreen API (`requestFullscreen`) on entry to the Play screen; degrade gracefully (hide app-level chrome) on browsers where the API is unsupported or denied (e.g., iOS Safari).
- Q: Is the vertical beat-position bar mandatory or optional — and how does that reconcile the contradiction between US4 ("optional") and FR-012 ("MUST span all staves")? → A: Enhanced highlight (colour/size/opacity) is mandatory for this feature. The vertical spanning bar is deferred: add it as a follow-up task only if the enhanced highlight does not satisfy SC-005 during testing.
- Q: What is the acceptable latency for seek-on-tap (note tap → jump to position)? → A: ≤300 ms from tap release to audible output from the new position (scheduler reset included).

