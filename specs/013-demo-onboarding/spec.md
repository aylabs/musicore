# Feature Specification: Demo Music Onboarding

**Feature Branch**: `013-demo-onboarding`  
**Created**: 2026-02-10  
**Status**: Draft  
**Input**: User description: "The app must be started in stacked view mode, and the first time the app is used it must has the CanonD used as sample already music so the user can play with the app quickly."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Immediate Music Playback on First Launch (Priority: P1)

A new user opens Musicore for the first time on their tablet and immediately sees Canon D (Pachelbel's Canon in D) loaded and ready to play in stacked view mode. They can press play, adjust tempo, scroll through the score, and experience the app's core features without needing to import or search for music.

**Why this priority**: This is the most critical user journey because first impressions determine whether users continue to explore the app. Users can immediately understand the app's value proposition (intelligent music stand with playback, tempo control, score viewing) without any setup friction. This addresses the common onboarding problem where users abandon apps before discovering core functionality.

**Independent Test**: Can be fully tested by installing the app fresh (clearing local storage), launching it, and verifying that Canon D appears pre-loaded in stacked view mode with all playback features functional. Delivers immediate value by letting users play with a real musical score within seconds of opening the app.

**Acceptance Scenarios**:

1. **Given** a new user with no prior app data, **When** they launch Musicore for the first time, **Then** Canon D is loaded and displayed in stacked view mode showing all instruments
2. **Given** Canon D is pre-loaded on first launch, **When** the user taps the play button, **Then** playback starts immediately with tempo control and measure highlighting working
3. **Given** Canon D is displayed in stacked view, **When** the user scrolls through the score, **Then** all parts (violin, viola, cello, bass) are visible and properly aligned
4. **Given** the user is viewing the pre-loaded Canon D, **When** they adjust the tempo slider, **Then** playback speed changes smoothly and the new tempo persists

---

### User Story 2 - Persistent Stacked View Preference (Priority: P2)

A user who prefers stacked view mode (showing all instruments simultaneously) wants the app to remember this preference across sessions. After switching to stacked view once, the app always opens in stacked view mode, regardless of which score is loaded.

**Why this priority**: While less critical than first-run experience, view mode preference significantly impacts user satisfaction for returning users. Musicians often have a preferred viewing style (stacked for conductors/arrangers, single for performers), and remembering this choice reduces friction. This is P2 because it enhances the experience after the critical first impression.

**Independent Test**: Can be tested by setting the view mode to stacked, closing and reopening the app, and verifying the preference persists. Delivers value by eliminating repetitive mode switching for users with a preferred workflow.

**Acceptance Scenarios**:

1. **Given** a user has set their view mode to stacked view, **When** they close and reopen the app, **Then** the app opens in stacked view mode with the same score they were viewing
2. **Given** a user has stacked view as their default, **When** they import a new MusicXML file, **Then** the new score opens in stacked view mode automatically
3. **Given** a user switches from stacked to single-instrument view, **When** they exit and relaunch, **Then** the app opens in single-instrument view (the last-used mode)

---

### User Story 3 - Optional Demo Reset (Priority: P3)

A user who has imported their own music and customized the app wants to revisit the Canon D demo to show a friend or test a feature. They can access a "Load Demo" or "Reset to Demo" option that reloads Canon D without losing their imported music library.

**Why this priority**: This is a nice-to-have feature that adds convenience but isn't essential for core functionality. Users can always re-import Canon D manually if needed. It's P3 because it enhances discoverability and education but doesn't block primary use cases.

**Independent Test**: Can be tested by importing custom music, then using the "Load Demo" option and verifying Canon D loads while imported music remains accessible. Delivers value by providing a low-friction way to access the demo for demonstration or learning purposes.

**Acceptance Scenarios**:

1. **Given** a user has imported several MusicXML files, **When** they select "Load Demo" from settings or help menu, **Then** Canon D loads in stacked view without deleting their imported music
2. **Given** a user loads the demo after using custom music, **When** they navigate back to their music library, **Then** all previously imported scores remain accessible
3. **Given** a new user who deleted Canon D, **When** they select "Reload Demo", **Then** Canon D is re-downloaded or restored from bundled assets

---

### Edge Cases

- What happens when the user's device has insufficient storage for bundled Canon D assets?
- How does the system handle corrupted local storage preventing view mode preference persistence?
- What occurs if the user imports a Canon D MusicXML file that conflicts with the bundled demo version?
- How should the app behave if the user explicitly deletes Canon D and then triggers first-run initialization again (e.g., clearing app data)?
- What if the user's device orientation or screen size makes stacked view impractical (e.g., very small smartphone)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST detect first-run status (no previous local storage data or user activity)
- **FR-002**: On first run, the app MUST automatically load Canon D (Pachelbel's Canon in D) from bundled assets
- **FR-003**: On first run, the app MUST set the default view mode to stacked view (showing all instruments)
- **FR-004**: The app MUST persist the user's view mode preference (stacked or single-instrument) across sessions using local storage
- **FR-005**: When launching the app, the app MUST restore the last-used view mode preference before rendering the score
- **FR-006**: The bundled Canon D asset MUST include all required data for full playback: notes, timing, tempo markings, instrument parts, and measure structure
- **FR-007**: The app MUST provide a way to reload the Canon D demo without deleting user's imported music library (accessible via settings or help menu)
- **FR-008**: The app MUST handle first-run initialization gracefully if bundled Canon D assets are missing or corrupted, showing an appropriate error message
- **FR-009**: The view mode preference MUST apply to all scores, not just Canon D (i.e., it's a global setting)
- **FR-010**: The app MUST maintain the Canon D demo in the local music library after first run, allowing users to return to it like any other imported score

### Key Entities

- **First-Run Flag**: Boolean state indicating whether the app has been launched before; stored in local storage; determines whether to auto-load demo music
- **View Mode Preference**: User setting specifying default view mode (stacked or single-instrument); persisted in local storage; applied globally to all scores on launch
- **Demo Score (Canon D)**: Bundled MusicXML score included with app distribution; consists of instrument parts (violin, viola, cello, bass), measures, notes, and tempo information; stored in app assets and copied to local library on first run
- **Music Library**: Collection of user's loaded scores including both imported MusicXML files and bundled demo; persisted in local storage or IndexedDB; accessible for playback and viewing

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users can start playing Canon D within 5 seconds of launching the app for the first time
- **SC-002**: At least 80% of first-time users interact with playback controls (play, tempo adjustment, or scrolling) within their first session
- **SC-003**: View mode preference persists correctly across 100% of app restarts (no data loss or reset to default)
- **SC-004**: Canon D demo loads without errors in 99% of first-run initializations across supported devices and browsers
- **SC-005**: Users can switch between stacked and single-instrument views and have that preference remembered in 100% of subsequent sessions
- **SC-006**: The app bundle size increases by no more than 500KB due to bundled Canon D assets (ensuring fast download and installation)
- **SC-007**: Time from app launch to fully rendered stacked view of Canon D is under 3 seconds on mid-range tablets over 3G connection
