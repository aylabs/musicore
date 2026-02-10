# Feature Specification: Remove Editing Interface

**Feature Branch**: `014-remove-edit-ui`  
**Created**: 2026-02-10  
**Status**: Draft  
**Input**: User description: "Remove all editing interface - Remove New button from landing page and Score view, Remove Save button and field name field, Remove Add note/Voice/Staff buttons"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read-Only Score Viewing (Priority: P1)

Users open the app to view and play music scores without being presented with non-functional editing controls. The interface is clean, focused on playback and viewing functionality.

**Why this priority**: The editing interface currently relies on REST API which is unavailable in the PWA deployment on GitHub Pages. Removing broken UI elements improves user experience by eliminating confusion and focusing on what actually works.

**Independent Test**: Load demo score or imported MusicXML file, verify no editing buttons are visible, confirm playback and view mode switching work normally.

**Acceptance Scenarios**:

1. **Given** user opens the app for the first time, **When** demo loads, **Then** user sees playback controls and view mode toggle but no "New Score" or "Add Instrument" buttons
2. **Given** user is viewing a score, **When** looking at the UI, **Then** user does not see "Save", "Add Note", "Add Voice", or "Add Staff" buttons
3. **Given** user imports a MusicXML file, **When** file loads successfully, **Then** user can play and view the score without any editing prompts

---

### User Story 2 - Simplified Landing Experience (Priority: P1)

Users see a streamlined landing page focused on loading existing scores (demo or import) rather than creating new ones.

**Why this priority**: Creating empty scores requires editing functionality which is not yet fully migrated to WASM. Removing this option prevents users from entering a broken workflow.

**Independent Test**: Open app homepage, verify "New Score" button is not present, confirm demo and file import options are available.

**Acceptance Scenarios**:

1. **Given** user opens the app home page, **When** viewing available actions, **Then** user sees "Demo" button and file upload but no "New Score" button
2. **Given** user has no scores loaded, **When** viewing the empty state, **Then** message guides them to try the demo or import a file

---

### Edge Cases

- What happens when user tries to use browser back button while viewing a score? (Should not break, remain on score view)
- How does system handle imported files with empty measures or missing data? (Display as-is, no editing available)
- What if user expects to edit after import? (Clear messaging that app is view/playback only)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST hide "New Score" button from landing page
- **FR-002**: System MUST hide "New Score" button from score viewer header
- **FR-003**: System MUST hide "Save" button from score viewer
- **FR-004**: System MUST hide score name input field from score viewer
- **FR-005**: System MUST hide "Add Note" button from note display components
- **FR-006**: System MUST hide "Add Voice" button from instrument list
- **FR-007**: System MUST hide "Add Staff" button from instrument list
- **FR-008**: System MUST hide "Add Instrument" input and button when score has instruments (keep only for empty scores created from demo/import edge cases)
- **FR-009**: System MUST preserve all playback controls (play/pause, tempo, metronome)
- **FR-010**: System MUST preserve view mode switching (individual/stacked)
- **FR-011**: System MUST preserve file import functionality
- **FR-012**: System MUST preserve demo loading functionality

### Key Entities *(not applicable - UI removal only)*

No data model changes required. This feature only affects UI visibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users cannot access any score editing functions from the UI
- **SC-002**: App loads without errors on GitHub Pages deployment
- **SC-003**: All view and playback features remain functional after UI removal
- **SC-004**: Demo onboarding experience works without edit button clutter
- **SC-005**: Users can import MusicXML files and view them without editing prompts

## Assumptions *(optional)*

- Users understand this is a viewer/player app, not an editor
- Future WASM migration (separate feature) will re-enable editing if needed
- Current focus is reliable playback and viewing on tablets/mobile devices

## Dependencies *(optional)*

**Depends on**:
- Feature 011: WASM music engine (for playback)
- Feature 013: Demo onboarding (provides content to view)

**Blocks**: None

**Related**: Future feature for complete WASM editing migration (will re-enable editing with offline-first architecture)

## Out of Scope *(optional)*

- Re-implementing editing with WASM (separate feature)
- Backend REST API modifications (not used in PWA deployment)
- Changing playback or viewing functionality
- Removing file import capability
