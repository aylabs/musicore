# Feature Specification: Plugin Architecture with Virtual Keyboard Sample Plugin

**Feature Branch**: `001-plugin-architecture`
**Created**: 2026-02-25
**Status**: Draft
**Input**: User description: "plugin architecture with virtual keyboard sample plugin — virtual keyboard view where touching keys shows notes on a staff; plugin assets in frontend/plugins/virtual-keyboard; same internal architecture as the rest of the project; plugins added via plugin importer controller; built-in repo plugins available by default; new navigation entry per installed plugin; plugins restricted to the Musicore Plugin API"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play Virtual Keyboard (Priority: P1)

A user opens the Musicore app and finds the Virtual Keyboard plugin already available in the navigation. They tap individual piano keys and see the played notes rendered on a music staff in real time, giving them an interactive way to explore music notation while playing by ear.

**Why this priority**: This is the core visible value of the entire feature. It proves the plugin architecture works end-to-end and delivers immediate musical utility without any setup required from the user.

**Independent Test**: Can be fully tested by opening the app, navigating to the Virtual Keyboard plugin view, clicking piano keys, and verifying notes appear on the staff — no imports or configuration required.

**Acceptance Scenarios**:

1. **Given** the user has opened the app for the first time, **When** they look at the navigation, **Then** the Virtual Keyboard plugin is listed as a default navigation entry.
2. **Given** the Virtual Keyboard view is open, **When** the user taps a white key (e.g., middle C), **Then** the corresponding note appears on the staff within 100 ms of the tap.
3. **Given** the Virtual Keyboard view is open, **When** the user taps a black key (sharp/flat), **Then** the note with its correct accidental symbol appears on the staff.
4. **Given** the user has played several notes in sequence, **When** they look at the staff, **Then** all played notes are shown in the order they were played.
5. **Given** the Virtual Keyboard view is open on a touch device, **When** the user touches a key, **Then** the key shows a pressed visual state and the note appears on the staff.

---

### User Story 2 - Import a Third-Party Plugin (Priority: P2)

A user who wants to extend Musicore beyond its defaults opens the plugin importer, selects a plugin package from their device, and adds it to the app. The new plugin immediately appears as a navigation entry they can access.

**Why this priority**: This validates the extensibility mechanism. Without it, the plugin architecture is a build-time concept only — the importer is what makes it a live platform.

**Independent Test**: Can be fully tested by accessing the plugin importer, uploading a valid plugin package, and confirming a new navigation entry appears — independently of the virtual keyboard plugin.

**Acceptance Scenarios**:

1. **Given** the user is on the plugin importer screen, **When** they select a valid plugin package from their device, **Then** the plugin is installed and a confirmation message is shown.
2. **Given** a plugin has been successfully imported, **When** the user returns to the main navigation, **Then** a new entry for the imported plugin is visible.
3. **Given** the user taps the new navigation entry, **When** the plugin view loads, **Then** the plugin's interface is displayed correctly.
4. **Given** the user uploads an invalid or malformed plugin package, **When** the import is attempted, **Then** the system rejects it with a clear error message and no partial installation occurs.
5. **Given** a previously imported plugin exists, **When** the user closes and reopens the app (PWA reload), **Then** the plugin is still present in the navigation and functional.

---

### User Story 3 - Navigate Between Installed Plugins (Priority: P3)

A user who has the default Virtual Keyboard plugin plus one imported plugin can navigate freely between both plugin views and the rest of the app. Each plugin is reachable from a consistent place in the app UI.

**Why this priority**: Navigation cohesion ensures plugins feel like first-class citizens rather than bolted-on extras. Depends on P1 and P2 being functional.

**Independent Test**: Can be tested with only the built-in virtual keyboard plugin in navigation, confirming it can be accessed and the user can return to other app views without issues.

**Acceptance Scenarios**:

1. **Given** one or more plugins are installed, **When** the user opens the navigation, **Then** each installed plugin has exactly one entry listed.
2. **Given** the user is in a plugin view, **When** they tap a non-plugin navigation entry, **Then** the plugin view is dismissed and the selected view loads correctly.
3. **Given** multiple plugins are installed, **When** the user switches between plugin views, **Then** each plugin view renders its own independent state without interference from others.

---

### User Story 4 - Plugin Developer Builds with the Plugin API (Priority: P4)

A plugin developer writes a new Musicore plugin using only the documented Plugin API. They can complete the plugin from scratch using the API reference and the virtual keyboard plugin as an example, without needing access to Musicore's internal source code.

**Why this priority**: This ensures the Plugin API contract is robust and documented. It is the lowest priority as it serves developers rather than end users and depends on all prior stories being complete.

**Independent Test**: Can be validated by confirming the Plugin API documentation covers all capabilities used by the virtual keyboard plugin, and that no undocumented internal APIs are referenced within `frontend/plugins/virtual-keyboard`.

**Acceptance Scenarios**:

1. **Given** a developer reads the Plugin API documentation, **When** they build a plugin using only documented API methods, **Then** the plugin installs and runs correctly without errors.
2. **Given** the virtual keyboard plugin codebase, **When** a developer reviews it, **Then** every Musicore-specific call goes through the Plugin API with no direct access to app internals.
3. **Given** a plugin that attempts to call a non-Plugin-API internal, **When** the plugin is loaded, **Then** the call fails with a descriptive error rather than silently accessing private state.

---

### Edge Cases

- What happens when the user imports a plugin with the same name as an already-installed plugin?
- What happens if a plugin package exceeds a maximum size threshold?
- What happens when the app is offline and the user tries to use the plugin importer?
- How does the system behave if a plugin crashes or throws an unhandled error during use?
- What happens if the user plays keys faster than the staff can render (rapid sequential tapping)?
- What happens on small screens that cannot fit a full piano keyboard?
- How does the Virtual Keyboard layout adapt when the device orientation changes?

## Requirements *(mandatory)*

### Functional Requirements

**Plugin System**

- **FR-001**: The app MUST define a Plugin API that is the exclusive interface through which plugins interact with Musicore functionality; plugins MUST NOT access any other internal application interfaces directly.
- **FR-002**: The Plugin API MUST be documented in human-readable form within the repository, covering all available operations a plugin may invoke.
- **FR-003**: Each plugin MUST be self-contained within a dedicated folder following the naming convention `frontend/plugins/[plugin-name]`; no plugin assets may reside outside its designated folder.
- **FR-004**: Plugins MUST follow the same internal architectural patterns applied throughout the rest of the Musicore frontend project (component structure, state management approach, testing conventions).
- **FR-005**: All plugins shipped within the Musicore repository MUST be available to the PWA by default without any user action; users MUST NOT need to manually import built-in plugins.
- **FR-006**: When a plugin becomes available (built-in or imported), the app navigation MUST gain exactly one new entry pointing to that plugin's view.
- **FR-007**: The app MUST provide a Plugin Importer that allows users to add external plugins to the PWA.
- **FR-008**: The Plugin Importer MUST accept a plugin package in the form of a ZIP archive containing a plugin manifest file and the plugin's assets.
- **FR-009**: The Plugin Importer MUST validate the uploaded package before activating it; packages that fail validation MUST be rejected with a descriptive error and leave the app state unchanged.
- **FR-010**: Imported plugins MUST persist across app reloads (PWA sessions); a plugin installed in one session MUST still be available in subsequent sessions without re-importing.
- **FR-011**: Users MUST be able to view a list of all currently installed plugins (both built-in and imported).

**Virtual Keyboard Plugin**

- **FR-012**: The Virtual Keyboard plugin MUST render a visual piano keyboard spanning at least two full octaves.
- **FR-013**: When a user presses a key on the virtual keyboard, the corresponding musical note MUST be displayed on a music staff within the plugin view.
- **FR-014**: All notes played during a session MUST accumulate on the staff in the order they were played, forming a growing notation sequence.
- **FR-015**: The virtual keyboard MUST visually indicate the pressed state of a key during a tap or click interaction.
- **FR-016**: The Virtual Keyboard plugin MUST display each played note on the staff within 100 ms of the key press.
- **FR-017**: All assets for the Virtual Keyboard plugin MUST reside within `frontend/plugins/virtual-keyboard`; the plugin MUST use only the Musicore Plugin API to render notation and access any app capability.

### Key Entities

- **Plugin**: A self-contained module with a manifest, a view component, and a defined set of declared capabilities, accessible exclusively through the Plugin API. Identified by a unique name and version.
- **Plugin Manifest**: A descriptor file bundled with a plugin that declares its name, version, entry point, and optionally the Plugin API operations it uses.
- **Plugin Registry**: The in-app record of all installed plugins (built-in and imported), persisted across sessions.
- **Musicore Plugin API**: The documented, versioned interface through which plugins access notation rendering and other Musicore capabilities without touching app internals.
- **Plugin Importer**: The UI controller that orchestrates package upload, validation, registration, and navigation entry creation.
- **Virtual Keyboard Plugin**: The reference plugin bundled with the repository, demonstrating the plugin architecture by displaying a piano keyboard that feeds played notes into a staff notation view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can access and play the Virtual Keyboard plugin within 30 seconds of opening the app, with no setup steps required.
- **SC-002**: Every note played on the virtual keyboard appears on the staff in under 100 ms of the key press, ensuring the interaction feels instantaneous.
- **SC-003**: A user can successfully import a valid third-party plugin in under 2 minutes from opening the plugin importer to seeing the new navigation entry.
- **SC-004**: 100% of the Virtual Keyboard plugin's Musicore-facing calls go through the documented Plugin API — zero direct internal API calls, verifiable by code review and static analysis.
- **SC-005**: An invalid plugin package is rejected with a descriptive error message in under 3 seconds of upload completion; the app remains fully functional after rejection.
- **SC-006**: All installed plugins (built-in and imported) remain available across PWA reloads with no data loss and no re-import required.
- **SC-007**: The Plugin API documentation covers every method used by the Virtual Keyboard plugin, enabling a developer to replicate the plugin from documentation alone without reading Musicore's internal source code.
- **SC-008**: Plugin API compliance is enforced by documentation and code review; all plugins, including the virtual keyboard reference, are verified to contain zero direct calls to app internals. No runtime sandboxing is required for this phase; the Plugin API boundary is a documented contract upheld by repository policy.

## Assumptions

- Plugin packages are distributed as ZIP archives containing a `plugin.json` manifest and the plugin's assets; this is the format the importer accepts.
- Notes played on the Virtual Keyboard accumulate onto the staff for the duration of the session; there is no note-by-note replacement or automatic scroll-off.
- The Plugin API will initially expose notation rendering (display a note on a staff) and key-event handling; audio playback and score export capabilities may be added in future iterations.
- Imported plugins are stored in the browser's local persistent storage after import, enabling offline access in subsequent sessions.
- The virtual keyboard layout presents a fixed set of keys; the number of visible octaves may adapt to available screen width, but individual key dimensions do not resize.
- Removing a plugin and its navigation entry is out of scope for this initial feature.
- The Plugin Importer is accessible from the app's settings or a dedicated management area; exact placement in the navigation is determined during planning.


