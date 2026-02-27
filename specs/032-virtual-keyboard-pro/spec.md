# Feature Specification: Virtual Keyboard Pro Plugin

**Feature Branch**: `032-virtual-keyboard-pro`
**Created**: 2026-02-27
**Status**: Draft
**Input**: User description: "Create a new plugin to be imported. A new version Pro of the Virtual Keyboard is developed. The new plugin must be based in the current Virtual Keyboard one at the start, but implemented as a totally new plugin. The plugin must be packed as zip file to be imported."

## Clarifications

### Session 2026-02-27

- Q: Which Pro features are in scope for this plugin? → A: Accept the full assumed feature set — three-octave range (C3–B5), octave shifting, note name label toggle, and horizontal scroll on small screens.
- Q: What are the minimum and maximum octave-shift bounds? → A: ±2 octaves from the default position (extremes: C1–B7 at maximum up-shift, C1–B3 at maximum down-shift).
- Q: What is the default state of the note labels toggle, and is the preference persisted across sessions? → A: Labels are off by default; preference is not persisted (resets to off each session).
- Q: Where should the Virtual Keyboard Pro plugin source live in the repository? → A: In a standalone directory `plugins-external/virtual-keyboard-pro/`, explicitly separated from the built-in plugins under `frontend/plugins/`.
- Q: What does the staff show before the user plays any notes? → A: An empty staff — clef and time signature are visible, but no notes are rendered (matches built-in Virtual Keyboard behaviour).

---

## Assumptions

- **Pro features**: Confirmed in-scope Pro enhancements: expanded range (three octaves C3–B5 instead of two), configurable octave shifting, note name label toggle, and horizontally scrollable layout on small screens.
- **Zip packaging**: The plugin is distributed as a zip file following the importable plugin format defined in PLUGINS.md. A build script in `plugins-external/virtual-keyboard-pro/` produces the zip from source.
- **Source location**: Plugin source lives in `plugins-external/virtual-keyboard-pro/`, explicitly separated from the built-in plugins directory (`frontend/plugins/`). The built-in plugins directory is not modified.
- **Plugin ID**: `virtual-keyboard-pro` — distinct from the built-in `virtual-keyboard` to avoid conflicts.
- **API version**: Targets the current Plugin API version (`"2"`) as defined in PLUGINS.md.
- **No modification of existing plugin**: The built-in Virtual Keyboard plugin (`frontend/plugins/virtual-keyboard`) is left completely unchanged.
- **Plugin size**: The deliverable zip stays within the 5 MB import limit enforced by the host importer.

---

## User Scenarios & Testing *(mandatory)*

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import the Pro Plugin (Priority: P1)

A user who has downloaded the `virtual-keyboard-pro.zip` package opens the Musicore plugin importer, selects the file, and installs the Virtual Keyboard Pro plugin. After a brief confirmation, a new "Virtual Keyboard Pro" entry appears in the navigation alongside the built-in Virtual Keyboard plugin.

**Why this priority**: The zip import is the entire distribution mechanism for this plugin. If users cannot install it, nothing else matters. Successfully installing it proves the package is valid, correctly structured, and within size limits.

**Independent Test**: Can be fully tested by opening the plugin importer, uploading the zip file, confirming the success message, and verifying a "Virtual Keyboard Pro" navigation entry appears — independently of any Pro-specific capabilities.

**Acceptance Scenarios**:

1. **Given** the user has the `virtual-keyboard-pro.zip` file, **When** they open the plugin importer and select the file, **Then** the plugin installs successfully and a confirmation is shown.
2. **Given** the plugin has been imported, **When** the user views the navigation bar, **Then** "Virtual Keyboard Pro" appears as a distinct entry separate from the built-in "Virtual Keyboard".
3. **Given** the app is closed and reopened after importing, **When** the user views the navigation, **Then** the Virtual Keyboard Pro plugin is still listed and accessible.
4. **Given** the zip file is corrupted or missing required fields, **When** the user attempts to import it, **Then** the importer rejects it with a descriptive error and no partial installation takes place.
5. **Given** a different valid plugin is already installed, **When** the user imports the Virtual Keyboard Pro zip, **Then** neither the existing plugin nor the built-in Virtual Keyboard is affected.

---

### User Story 2 - Play on the Extended Keyboard (Priority: P2)

A user opens the Virtual Keyboard Pro view and finds a wider, three-octave keyboard spanning C3 through B5. They play notes across the full range and see each note rendered on the music staff, just as in the standard plugin — but covering a broader range without octave switching.

**Why this priority**: Extended range is the primary capability differentiating this plugin from the built-in version. It delivers immediate visible value and can be tested completely independently.

**Independent Test**: Can be fully tested by opening the Virtual Keyboard Pro view, pressing keys across all three octaves, and verifying notes across the full range (C3–B5) appear on the staff.

**Acceptance Scenarios**:

1. **Given** the Virtual Keyboard Pro view is first opened and no notes have been played, **When** the user looks at the staff, **Then** an empty staff showing only the clef and time signature is displayed (no notes).
2. **Given** the Virtual Keyboard Pro view is open, **When** the user looks at the keyboard, **Then** a three-octave keyboard from C3 to B5 is displayed (21 white keys, 15 black keys).
3. **Given** the Virtual Keyboard Pro view is open, **When** the user taps any key in the third octave (C5–B5), **Then** the corresponding note appears on the staff with the correct pitch.
4. **Given** the user plays notes from different octaves in sequence, **When** they look at the staff, **Then** all notes appear in order with correct pitch and accidentals.
5. **Given** the user taps a key, **When** they observe the keyboard, **Then** the pressed key shows a highlighted visual state during the press.

---

### User Story 3 - Toggle Note Labels on Keys (Priority: P3)

A user who is learning note names activates a "Show Labels" option within the Virtual Keyboard Pro view. Immediately, each piano key displays its note name (e.g., "C4", "F#3"). They can toggle this off to return to a clean keyboard appearance.

**Why this priority**: Note labels are an educational feature that meaningfully distinguishes the Pro plugin and is fully testable without any other Pro features.

**Independent Test**: Can be fully tested by toggling the label control and verifying note names appear and disappear on keys.

**Acceptance Scenarios**:

1. **Given** the Virtual Keyboard Pro view is first opened, **When** the user looks at the keyboard, **Then** no note labels are shown (labels are off by default).
2. **Given** labels are off, **When** the user activates "Show Labels", **Then** every key displays its note name.
3. **Given** labels are shown, **When** the user deactivates "Show Labels", **Then** note names disappear from all keys.
4. **Given** labels are shown and the user closes and reopens the plugin view, **When** the view loads again, **Then** labels are off (preference is not persisted).
5. **Given** labels are shown, **When** the user plays a key, **Then** the label remains readable during the pressed visual state.

---

### User Story 4 - Shift Octave Range (Priority: P4)

A user playing a melody that goes beyond the default three-octave range uses octave-shift controls (up/down) within the plugin view to scroll the displayed keyboard range by one octave at a time. The staff continues to show all notes with their correct absolute pitch.

**Why this priority**: Octave shifting enables unlimited range access without an impractically wide keyboard, and is testable independently of other Pro features.

**Independent Test**: Can be fully tested by pressing octave-shift controls, verifying key labels shift by one octave, and confirming played notes produce the correct pitch on the staff.

**Acceptance Scenarios**:

1. **Given** the default range is C3–B5, **When** the user presses the octave-up control, **Then** the displayed range becomes C4–B6 and key labels update accordingly.
2. **Given** the octave has been shifted up by one, **When** the user plays the key labeled "C4", **Then** the note played is C5 (one octave higher than without shifting).
3. **Given** the user presses the octave-down control from the default range, **When** they look at the keyboard, **Then** the displayed range becomes C2–B4.
4. **Given** the octave shift is at its minimum allowed position (−2 octaves, displaying C1–B3), **When** the user presses octave-down, **Then** the control appears disabled and no change occurs.
5. **Given** the octave shift is at its maximum allowed position (+2 octaves, displaying C5–B7), **When** the user presses octave-up, **Then** the control appears disabled and no change occurs.

---

### Edge Cases

- What does the staff show before the first note is played? → An empty staff with clef and time signature is displayed; no placeholder note or hint is shown.
- What happens if the plugin zip exceeds 5 MB? → The host importer rejects it with a size-limit error; no partial install occurs.
- What happens if the user imports Virtual Keyboard Pro while the built-in Virtual Keyboard is open? → Import proceeds normally; the built-in plugin remains unaffected.
- What happens at the octave-shift boundary? → The shift is bounded at ±2 octaves from the default (C3–B5 default; minimum C1–B3, maximum C5–B7); controls are visually disabled at the boundary.
- What happens if the user plays very rapidly across three octaves? → All notes are captured and rendered on the staff in play order; no notes are dropped.
- What happens on a small-screen device with a three-octave keyboard? → The keyboard container is horizontally scrollable so all keys remain reachable without overflow.


## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Virtual Keyboard Pro plugin MUST be packaged as a zip file containing a valid `plugin.json` manifest, a compiled JavaScript entry point, and all required assets.
- **FR-002**: The plugin's `plugin.json` MUST declare a unique `id` (`virtual-keyboard-pro`), a `name` ("Virtual Keyboard Pro"), a `version`, and a `pluginApiVersion` matching the current host Plugin API version.
- **FR-003**: The zip file MUST be importable via the host's existing plugin importer without any modification to the host application.
- **FR-004**: The zip file MUST NOT exceed 5 MB.
- **FR-005**: The plugin MUST be implemented as an entirely new plugin sourced from `plugins-external/virtual-keyboard-pro/`; the existing built-in `virtual-keyboard` plugin under `frontend/plugins/virtual-keyboard/` and its source files MUST NOT be modified.
- **FR-006**: The plugin MUST display a three-octave interactive piano keyboard as its default view.
- **FR-007**: When the user presses any key, the plugin MUST play the corresponding note through the host audio engine via the Plugin API and emit the note to the host layout pipeline.
- **FR-008**: The plugin MUST render played notes on a music staff using the host-provided `StaffViewer` component.
- **FR-009**: The plugin MUST provide a toggle control to show or hide note name labels on each key. Labels MUST default to hidden when the plugin view is first loaded or re-loaded; the preference is session-only and MUST NOT be persisted across sessions.
- **FR-010**: The plugin MUST provide octave-shift controls (up and down) that shift the displayed keyboard range by one octave at a time.
- **FR-011**: The plugin MUST communicate with the host exclusively through the Plugin API; it MUST NOT import any Musicore-internal modules directly.
- **FR-012**: A build script located in `plugins-external/virtual-keyboard-pro/` MUST produce the distributable zip file from that directory's source without requiring manual steps beyond running the script.
- **FR-013**: The plugin MUST include a `README.md` inside the zip describing installation steps and a feature summary.
- **FR-014**: When the host rejects the zip (invalid manifest, oversized, API version mismatch), the user MUST see a descriptive error message.
- **FR-015**: When the plugin view first loads and no notes have been played, the staff MUST display an empty state showing only the clef and time signature; no placeholder note or hint MUST be rendered.

### Key Entities

- **PluginPackage (zip)**: The distributable artifact. Contains `plugin.json`, compiled `index.js`, optional `style.css`, and `README.md`. Produced by the build script in `plugins-external/virtual-keyboard-pro/`.
- **PluginManifest (`plugin.json`)**: Declares `id`, `name`, `version`, `pluginApiVersion`, `entryPoint`, `description`, `type`, and `view`.
- **VirtualKeyboardPro component**: The root React component rendered when the plugin nav entry is active. Owns keyboard state (octave offset, labels toggle, pressed keys).
- **NoteDefinition**: Data record for each key — absolute MIDI number (adjusted for octave shift), display label, and key type (white/black).
- **OctaveShiftState**: Signed integer offset (range −2 to +2) applied to the base MIDI range (C3–B5), determining which notes are displayed and played. Value 0 = default C3–B5; +2 = C5–B7; −2 = C1–B3.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with no prior setup can install the plugin by selecting the zip in the importer in under 30 seconds, including confirmation.
- **SC-002**: After installation, the "Virtual Keyboard Pro" navigation entry appears within 2 seconds of confirming the import.
- **SC-003**: Notes played on the expanded keyboard appear on the staff within 150 ms of the key press.
- **SC-004**: The deliverable zip file is under 5 MB and passes the host importer's validation without errors on first attempt.
- **SC-005**: All three octaves of keys are interactable without horizontal scrolling on viewports 768 px wide or above.
- **SC-006**: The note labels toggle switches state within 100 ms with no perceptible layout shift.
- **SC-007**: The octave-shift controls respond within 100 ms and immediately update all key labels and pitch mappings.
- **SC-008**: The plugin remains installed and functional after a browser/PWA reload without requiring re-import.
- **SC-009**: The existing built-in Virtual Keyboard plugin continues to function correctly after the Pro plugin is imported (no regressions).

---

## Known Issues & Regression Tests *(if applicable)*

*This section is empty at specification time and will grow during development as issues are discovered.*
