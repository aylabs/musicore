# Feature Specification: Play Score Plugin

**Feature Branch**: `033-play-score-plugin`  
**Created**: 2026-02-27  
**Status**: Draft  
**Input**: User description: "Convert Play Score view to a core preloaded plugin. Core plugin, full screen, load scores from preloaded scores and also loading new ones by Plugin API. Respect the current UX. Load score using the Rust Layout Engine and its current renderer. Migrate the toolbar at the top with Back button, title, Play/Pause/Stop, Timer, Tempo bar. Respect all interactions with the score container. Tap for Stop/Resume. Normal tap on a note to start playing from it. Large tap on a note to pin it so play/resume start from it. Large tap on a pinned note to unpin it. Large tap on a note when another note is pinned to define a region (loop) between both notes. Large tap on a region to remove it. Button at the bottom of the score to return to the start of the score."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Launch Play Score from the landing page (Priority: P1)

A user opens the app and sees the landing screen. They tap the "Play Score" button (a core plugin launch button). The plugin opens in full-screen mode. They see a score selection screen showing the preloaded library. They pick one, the score renders using the Rust layout engine, and the playback toolbar appears at the top.

**Why this priority**: This is the exact replacement of the current "Play Score" entry path. Without it the plugin delivers zero value.

**Independent Test**: Open app → tap "Play Score" → score selection opens → select a preloaded score → score renders full-screen with toolbar. No previous functionality is broken.

**Acceptance Scenarios**:

1. **Given** the app landing screen, **When** the user taps the "Play Score" core plugin button, **Then** the Play Score plugin fills the entire viewport (no header, no nav bar).
2. **Given** the plugin is open with no score loaded, **When** the score selection screen appears, **Then** all bundled preloaded scores are listed with their display names.
3. **Given** the user selects a preloaded score, **When** the score finishes loading, **Then** it is rendered via the Rust layout engine and the playback toolbar is shown at the top.
4. **Given** the plugin is open, **When** the user taps the "← Back" button in the toolbar, **Then** the plugin closes and the app returns to the landing screen.

---

### User Story 2 — Play, pause, stop and timer (Priority: P1)

A user has a score loaded. They press Play. The score scrolls and notes are highlighted as they play. The timer counts up. They press Pause — playback freezes at the current position. They press Play again — playback resumes from the same position. They press Stop — playback stops and the position resets to the beginning (or to the pinned start if one is set).

**Why this priority**: Playback controls are the core value of the feature; without them the plugin is just a static score viewer.

**Independent Test**: Load any preloaded score → press Play → notes highlighted, timer advances → press Pause → timer freezes → press Play → resumes from same position → press Stop → position returns to start.

**Acceptance Scenarios**:

1. **Given** a score is loaded and playback is stopped, **When** the user taps Play, **Then** notes are highlighted in sync with playback and the timer starts counting up.
2. **Given** playback is in progress, **When** the user taps Pause, **Then** playback halts immediately and the timer freezes.
3. **Given** playback is paused, **When** the user taps Play, **Then** playback resumes from exactly the paused position.
4. **Given** playback is in progress or paused, **When** the user taps Stop, **Then** playback stops and the position resets to the beginning (or the pinned start tick if set).
5. **Given** playback is in progress, **When** the user taps the score canvas (not a note), **Then** playback toggles between playing and paused.

---

### User Story 3 — Seek by tapping a note (Priority: P2)

A user wants to start playback from a specific point in the score. They tap a note (short tap). The playback position jumps to that note's tick. If playback was running, it continues from the new position; if stopped or paused, it stays at the new position ready to play from there.

**Why this priority**: Direct note-seeking is a key navigation shortcut users rely on for practice and review.

**Independent Test**: Load a score → tap a note at measure 8 → playback cursor jumps to measure 8 → press Play → playback starts from measure 8.

**Acceptance Scenarios**:

1. **Given** playback is stopped, **When** the user short-taps a note, **Then** the playback position moves to that note's tick and the score scrolls to keep it visible.
2. **Given** playback is in progress, **When** the user short-taps a note, **Then** playback continues from the tapped note's position without interruption.
3. **Given** playback is paused, **When** the user short-taps a note, **Then** the seek position updates but playback does not auto-resume.

---

### User Story 4 — Pin a start point and define a loop region (Priority: P2)

A user wants to practise a specific section. They long-press a note — a green pin marker appears. They long-press a second note — a highlighted loop region overlay appears between the two notes. Playback automatically loops within the region. They long-press the region to clear it. They long-press a pinned note to unpin it. The Stop button resets to the pinned tick when no full loop region is set.

**Why this priority**: Loop regions are a differentiating practice feature that must survive the migration intact.

**Independent Test**: Load score → long-press note A → green pin visible → long-press note B → loop region overlay appears → press Play → playback loops → long-press region → loop clears.

**Acceptance Scenarios**:

1. **Given** no pins are set, **When** the user long-presses a note, **Then** a green pin marker appears on that note and the playback position seeks to it if not playing.
2. **Given** one pin is set, **When** the user long-presses the same pinned note, **Then** the pin is removed.
3. **Given** one pin is set, **When** the user long-presses a different note, **Then** a loop region is created between the two ticks (ordered) and the region overlay is displayed.
4. **Given** a loop region is active, **When** the user long-presses anywhere inside the region, **Then** both pins are cleared and the overlay is removed.
5. **Given** a single pin is set (no region), **When** the user presses Stop, **Then** the playback position resets to the pinned tick.
6. **Given** a loop region is active during playback, **When** playback reaches the region's end tick, **Then** playback immediately wraps to the region's start tick.

---

### User Story 5 — Return to score start with a bottom button (Priority: P2)

A user is deep in a score and wants to jump back to the very beginning in one tap. A button at the bottom of the score area seeks to tick 0 (or the pinned start tick if set) regardless of playback state.

**Why this priority**: Completes the navigation UX; avoids having to scroll back manually.

**Independent Test**: Load score → scroll to measure 20 → tap bottom "back to start" button → score scrolls to measure 1 and playback position is at start.

**Acceptance Scenarios**:

1. **Given** the score is scrolled past measure 1, **When** the user taps the "back to start" button, **Then** the score scrolls to the beginning and the playback position is set to tick 0 (or pinned start tick).
2. **Given** playback is in progress, **When** the user taps the button, **Then** playback restarts from the beginning (or pin) without stopping.

---

### User Story 6 — Load a user-provided score file (Priority: P3)

A user wants to play a score not in the preloaded library. From the score selection screen they choose "Load from file" and pick a MusicXML file. The file is parsed, rendered, and playback controls become available.

**Why this priority**: Extends the plugin beyond the bundled catalogue; important for advanced users but not blocking for MVP.

**Independent Test**: Open plugin → choose "Load from file" → pick a valid .mxl file → score renders and is playable.

**Acceptance Scenarios**:

1. **Given** the score selection screen is open, **When** the user selects "Load from file" and picks a valid MusicXML file, **Then** the score is parsed and rendered.
2. **Given** the user loads an invalid or corrupt file, **When** parsing fails, **Then** a clear error message is shown and any previously loaded score remains visible.

---

### User Story 7 — Tempo control (Priority: P3)

A user can adjust the playback tempo using the tempo control in the toolbar. The BPM display reflects the current value. Changes take effect immediately without restarting playback.

**Why this priority**: Useful for practice but secondary to core playback controls.

**Independent Test**: Load score → press Play → adjust tempo control → notes play noticeably faster/slower and BPM display updates.

**Acceptance Scenarios**:

1. **Given** a score is loaded, **When** the user adjusts the tempo control, **Then** the BPM value in the toolbar updates immediately.
2. **Given** playback is in progress, **When** the user changes the tempo, **Then** subsequent notes play at the new tempo without restarting playback.

---

### Edge Cases

- What happens when no score is loaded and the user presses Play? → Play button is disabled; a prompt suggests selecting a score.
- What happens when the MusicXML file contains no playable notes? → Score renders but Play is disabled with an indicator.
- What happens if the device denies file access permissions? → A user-friendly message is shown; the preloaded library remains accessible.
- What happens when the loop region start tick equals the end tick? → Treated as unpin, not loop creation.
- What happens when the user presses Back while playback is in progress? → Playback stops and audio resources are released before the plugin closes.
- What happens when WASM is still initialising? → A loading indicator is shown; all controls are disabled until rendering is ready.
- What happens if the score contains multiple tempo changes? → The toolbar reflects the tempo at the current playback tick, updating as playback passes each change marker.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Play Score plugin MUST be registered as a `type: 'core'`, `view: 'full-screen'` builtin plugin, appearing as a launch button on the app landing screen.
- **FR-002**: The plugin MUST fill the entire viewport when open — no app header, no nav bar; the plugin provides its own toolbar with a "← Back" button that calls `context.close()`.
- **FR-003**: On first open (no score loaded), the plugin MUST show a score selection screen listing all preloaded scores by display name.
- **FR-004**: The plugin MUST render scores using the Rust WASM layout engine and the existing rendering path — no alternative renderer may be introduced.
- **FR-005**: The plugin MUST provide a top toolbar containing: Back button, score title, Play/Pause toggle button, Stop button, elapsed timer, and Tempo control.
- **FR-006**: A single tap on the score canvas (not on a note) MUST toggle playback between playing and paused.
- **FR-007**: A short tap on a rendered note MUST seek the playback position to that note's tick.
- **FR-008**: A long press (≥ 500 ms) on a note MUST implement pin/loop logic: no pins → set start pin; one pin on same note → unpin; one pin on different note → create loop region; inside active loop region → clear region.
- **FR-009**: An active loop region MUST cause playback to wrap to the region's start tick when the end tick is reached.
- **FR-010**: A "back to start" button MUST be accessible at the bottom of the score area; tapping it seeks to tick 0, or the pinned start tick if one is set.
- **FR-011**: The Stop button MUST reset the playback position to the pinned start tick (if set) or to tick 0.
- **FR-012**: The plugin MUST support loading a user-provided MusicXML (`.mxl` / `.xml`) file via the score selection screen.
- **FR-013**: The plugin MUST read the preloaded score catalogue from the existing `PRELOADED_SCORES` manifest; no score paths may be hardcoded in plugin source code.
- **FR-014**: Exiting the plugin via Back or `context.close()` MUST stop all active playback and release audio resources before control returns to the host.
- **FR-015**: The tempo control MUST allow the user to change playback BPM; changes take effect from the next scheduled note without restarting playback.
- **FR-016**: The plugin MUST NOT import directly from `src/components/`, `src/services/`, or `src/wasm/`; all host capabilities are accessed via `context.*` or host-injected components.

### Key Entities

- **Score**: A parsed musical document with measures, notes (each with a tick position and MIDI pitch), and tempo change events; identified by a string ID.
- **PlaybackPosition**: The current playback tick, used for note highlighting and scrolling.
- **PinState**: A value `{ noteId, tick }` marking the user-selected loop start point.
- **LoopRegion**: A value `{ startTick, endTick }` derived from two `PinState` values sorted by tick; governs playback wrap-around.
- **PreloadedScore**: A catalogue entry with `id`, `displayName`, and a URL `path` for the score file.
- **TempoState**: The BPM at the current playback tick; may vary throughout the score at tempo-change markers.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from the landing screen to a note playing in 3 taps or fewer (launch plugin → select score → press Play).
- **SC-002**: All playback interactions (play, pause, stop, seek, pin, loop, tempo) behave identically to the current ScoreViewer — zero observable regression.
- **SC-003**: The plugin renders a preloaded score and is ready to play in under 3 seconds on a mid-range device (after WASM initialisation).
- **SC-004**: The plugin is self-contained: removing `ScoreViewer.tsx` from the host app does not break TypeScript compilation or any automated tests.
- **SC-005**: No audio continues after the user exits the plugin — verified by an automated test asserting `stopPlayback()` (or equivalent) is called on close.
- **SC-006**: The existing Playwright e2e tests covering the Play Score flow pass against the migrated plugin (adapted to the plugin's `data-testid` attributes).

---

## Assumptions

- The existing `PluginContext` API (`playNote`, `stopPlayback`, `components.StaffViewer`, `close`, `midi`) will need to be extended for this feature. New capabilities needed include: score loading, tick-seek, playback-status subscription, loop region control, and a full score renderer component. These extensions will be defined in a Plugin API v3 contract during the foundational phase.
- The `PRELOADED_SCORES` manifest and score files remain bundled with the app and served from the same base URL.
- Long-press detection threshold (≥ 500 ms) matches the current ScoreViewer implementation and is acceptable to users.
- The existing `ScoreViewer.tsx` is retained in the codebase during transition and removed in a follow-up feature once the plugin fully replaces it.
- `context.components.StaffViewer` will be supplemented by a new host-provided `context.components.ScoreRenderer` component that accepts a full parsed score document, since the current `StaffViewer` interface is scoped to single-staff notation snippets used by the Practice and VirtualKeyboard plugins.

