# Feature Specification: Landing Screen Redesign

**Feature Branch**: `001-landing-redesign`  
**Created**: 2026-02-22  
**Status**: Draft  
**Input**: User description: "Landing screen redesign: cover full width, random note moving around screen starting behind banner, note changes each second, color cycles black/orange/green, clicking note resets movement"

## Clarifications

### Session 2026-02-22

- Q: What is the movement path type of the animated note? → A: Fixed looping path — a single pre-defined trajectory that loops and restarts identically on click-reset.
- Q: When does the note color change — same tick as the symbol or independently? → A: Same 1-second tick — color and symbol change simultaneously every second.
- Q: What is the exact reduced-motion fallback behaviour? → A: Static position — note remains fixed at the initial position behind the banner; symbol and color still update every second, but no positional movement occurs.
- Q: What musical note symbols make up the Note Symbol Set? → A: Five standard duration glyphs — whole note, half note, quarter note, eighth note, sixteenth note.
- Q: What is the landing screen height? → A: Full viewport height (100vh) — landing screen fills the entire screen on load.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full-Width Landing Layout (Priority: P1)

A visitor opens the application and is greeted by a landing screen that spans the entire available viewport width and height (full-screen hero), creating an immersive, professional first impression without any unused space.

**Why this priority**: The full-width layout is the foundation of the redesign; all other visual elements (animated note, banner) are placed within it. Without this, the rest of the feature lacks context.

**Independent Test**: Can be fully tested by loading the app at various browser sizes (mobile, tablet, desktop) and verifying the landing screen fills 100% of both available width and height with no gaps or clipping.

**Acceptance Scenarios**:

1. **Given** the user opens the app in a wide desktop browser, **When** the landing screen loads, **Then** the landing area fills 100% of the viewport width AND height with no blank margins.
2. **Given** the user resizes the browser window, **When** the dimensions change, **Then** the landing screen dynamically adjusts to always fill the full available width and height.
3. **Given** the user opens the app on a mobile device, **When** the landing screen renders, **Then** it fills the full screen width and height without scrollbars.

---

### User Story 2 - Animated Note Behind the Banner (Priority: P2)

A visitor sees a single musical note symbol animating across the landing screen. The note starts its journey from behind the banner (the headline/logo area), creating a sense of depth where the note appears to emerge from and return to the banner.

**Why this priority**: This is the core visual differentiator of the redesign. It establishes the musical identity of the product through dynamic motion.

**Independent Test**: Can be fully tested by loading the landing screen and observing that a note symbol begins its path at a position overlapping or hidden behind the banner, then moves across the screen continuously.

**Acceptance Scenarios**:

1. **Given** the landing screen has just loaded, **When** the page is displayed, **Then** a musical note symbol is visible, starting at a position behind or beneath the banner element.
2. **Given** the note has started moving, **When** the animation plays, **Then** the note moves continuously along a fixed looping path in a smooth, fluid motion.
3. **Given** the note completes its movement cycle, **When** it returns to the start, **Then** it resumes from behind the banner without a visible jump or flicker, following the identical path.

---

### User Story 3 - Changing Note Symbol and Color Each Second (Priority: P3)

As the note moves, it simultaneously changes to a different random musical note symbol and a different color every second, giving the impression that the music is actively playing and evolving.

**Why this priority**: The changing note symbol adds vitality and reinforces the musical theme. It can be layered on top of the basic animation (User Story 2).

**Independent Test**: Can be tested independently by observing the note symbol over a 5-second window and verifying that the displayed symbol changes at least 5 times to different note glyphs.

**Acceptance Scenarios**:

1. **Given** the note animation is running, **When** one second elapses, **Then** the note glyph AND color both change simultaneously in the same update tick.
2. **Given** the note changed to a symbol and color, **When** the next second elapses, **Then** the new symbol is different from the immediately preceding one (no immediate repeats).
3. **Given** the animation runs over 10 seconds, **When** each tick is observed, **Then** all five symbols (whole, half, quarter, eighth, sixteenth note) appear at least once across those changes.

---

### User Story 4 - Color Cycling for the Note (Priority: P4)

The animated note cycles through three colors — black, orange, and green — changing simultaneously with each symbol swap every second, matching the color palette already used in the play view and creating visual consistency between the landing screen and the core experience.

**Why this priority**: Color consistency strengthens brand cohesion. It can be added independently on top of the moving note.

**Independent Test**: Can be tested by observing the note over several cycles and confirming it displays only black, orange, and green, matching the exact shades used in the play view.

**Acceptance Scenarios**:

1. **Given** the note animation is running, **When** one second elapses, **Then** the color changes simultaneously with the symbol change to one of the three defined colors: black, orange, or green.
2. **Given** the note is displaying one color, **When** the color changes, **Then** the new color is different from the current one (no immediate repeats).
3. **Given** the app's play view defines specific shades of orange and green, **When** the landing note uses those colors, **Then** the exact same shades are used on both screens.

---

### User Story 5 - Click to Reset Note Animation (Priority: P5)

A visitor who clicks on the moving note sees it immediately snap back to its starting position (behind the banner) and restart its animation from the beginning, providing an interactive element that rewards curiosity.

**Why this priority**: Interactivity enhances engagement and gives users an element to explore. It builds on all previous stories and is a nice-to-have enhancement.

**Independent Test**: Can be tested by waiting until the note has moved noticeably away from its starting position, clicking it, and verifying that it immediately returns to the initial position behind the banner and resumes its path from there.

**Acceptance Scenarios**:

1. **Given** the note is mid-animation somewhere on screen, **When** the user clicks or taps on it, **Then** the note immediately returns to its starting position behind the banner.
2. **Given** the note has been reset by a click, **When** the animation resumes, **Then** it follows the exact same fixed looping path from the initial position, identical to the behavior on first load.
3. **Given** the user clicks the note multiple times in succession, **When** each click is registered, **Then** each click resets the animation to the initial state without errors or visual glitches.
4. **Given** the user is on a touch device, **When** the user taps the note, **Then** the tap registers and resets the animation.

---

### Edge Cases

- What happens when the browser tab is hidden (background tab)? The animation should pause to avoid unnecessary resource consumption.
- How does the system handle very small screen sizes where the banner occupies most of the viewport? The note's initial position should still be visually behind the banner without going fully off-screen.
- What happens if the user's system has reduced motion preferences enabled? The note remains fixed at its initial position behind the banner; symbol and color changes continue every second but no positional movement occurs.
- What happens during the first second before the first symbol change? The note should display a valid random symbol from the very start of the animation.
- What happens if the user clicks the note while it is mid-color-transition? The animation resets cleanly regardless of the current color transition state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing screen MUST fill 100% of the available viewport width and height (full-screen, 100vw × 100vh) at all times, including on window resize.
- **FR-002**: The landing screen MUST display one animated musical note symbol that moves continuously along a fixed, looping path across the screen.
- **FR-003**: The note's initial position MUST be behind (visually beneath or overlapping) the landing screen banner element.
- **FR-004**: The note MUST change to a different random musical note symbol every second during the animation; this change MUST occur simultaneously with the color change.
- **FR-005**: The note symbol displayed after each change MUST be different from the immediately preceding symbol (no immediate repeats).
- **FR-006**: The note MUST change to a different color from the set {black, orange, green} simultaneously with each symbol change every second, using the exact color values defined in the play view; the new color MUST differ from the immediately preceding color.
- **FR-007**: When a user clicks or taps the animated note, the note MUST immediately return to its initial position and restart from the beginning of the fixed looping path, following the identical trajectory.
- **FR-008**: The animation MUST pause when the browser tab or window is not visible (background tab).
- **FR-009**: When the user's system-level reduced motion preference is active, the note MUST remain fixed at its initial position (no positional animation); symbol and color changes MUST continue every second as normal.
- **FR-010**: The landing screen layout MUST be responsive and function correctly on mobile, tablet, and desktop viewport widths.

### Key Entities

- **Landing Screen**: The full-viewport (100vw × 100vh) entry view of the application, containing the banner and the animated note layer.
- **Banner**: The header/logo/tagline area of the landing screen; defines the visual layer reference point that the note starts behind.
- **Animated Note**: A single musical note glyph that moves, changes symbol, and cycles colors on the landing screen.
- **Note Symbol Set**: The fixed set of five standard duration glyphs available for random selection each second: whole note, half note, quarter note, eighth note, sixteenth note. All five glyphs are sourced from the Bravura music font already in the product's asset library.
- **Play View Color Palette**: The canonical set of colors (black, orange, green) already defined in the play view, reused here for visual consistency.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The landing screen occupies 100% of the available viewport width AND height across all tested browser sizes (320×568 through 2560×1440) with no overflow, gaps, or scrollbars.
- **SC-002**: The animated note changes both symbol and color simultaneously at least once per second, verified over a 10-second observation window with 10 distinct synchronised changes recorded.
- **SC-003**: The note color at any given moment is exclusively one of the three defined colors (black, orange, green); color changes occur on the same tick as symbol changes, with no other color ever displayed.
- **SC-004**: Clicking the note resets the animation to the starting position within 100ms of the click event, with no visible glitch or intermediate state shown.
- **SC-005**: The animation pauses within one animation frame of the browser tab becoming inactive, and resumes when the tab regains focus.
- **SC-006**: With reduced motion preferences enabled, the note does not change position (remains fixed at the initial position behind the banner), while symbol and color continue updating every second.
- **SC-007**: The landing screen fully renders and the note animation begins within 2 seconds of the initial page load on a standard connection.
