# Feature Specification: Score File Persistence

**Feature Branch**: `004-save-load-scores`  
**Created**: 2026-02-07  
**Status**: Draft  
**Input**: User description: "Implement the load/save of scores from files using the simplest JSON format"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save Score to File (Priority: P1)

A user has created or edited a musical score and wants to save their work to a file so they can close the application and return to it later without losing their progress.

**Why this priority**: This is the most critical functionality - without the ability to save work, users cannot preserve their compositions. This provides immediate value and enables all other file-related workflows.

**Independent Test**: Create a new score with at least one instrument and several notes, click a "Save" button or menu option, choose a file location, verify that a JSON file is created at that location containing the score data in a readable format.

**Acceptance Scenarios**:

1. **Given** a user has created a score with multiple instruments and notes, **When** they save the score to a file path, **Then** a JSON file is created containing all score data (tempo, time signature, instruments, notes, clefs, etc.)
2. **Given** a user has an existing saved score file, **When** they modify the score and save it again to the same file path, **Then** the file is updated with the new score data
3. **Given** a user attempts to save to an invalid file path, **When** the save operation is attempted, **Then** an appropriate error message is displayed and the operation fails gracefully

---

### User Story 2 - Load Score from File (Priority: P2)

A user wants to open a previously saved musical score file so they can continue editing or view their composition.

**Why this priority**: Loading is the natural complement to saving. Once users can save scores, they need to be able to load them back. This completes the basic persistence workflow.

**Independent Test**: Given a valid JSON score file exists on disk, click a "Load" or "Open" button, select the file, verify that the score is displayed correctly with all instruments, notes, and musical attributes preserved.

**Acceptance Scenarios**:

1. **Given** a valid JSON score file exists, **When** the user loads the file, **Then** the score is displayed with all instruments, notes, tempo, time signatures, and clefs exactly as they were saved
2. **Given** the user has unsaved changes in the current score, **When** they attempt to load a different file, **Then** they are warned about losing unsaved changes and can choose to proceed or cancel
3. **Given** the user selects a file with invalid JSON format, **When** they attempt to load it, **Then** an error message is displayed explaining the file could not be loaded and suggesting the format may be corrupted

---

### User Story 3 - New Score Creation (Priority: P3)

A user wants to start working on a new score, clearing the current workspace.

**Why this priority**: This provides a clean slate for users and completes the standard file operations (New/Open/Save). Less critical than save/load but important for usability.

**Independent Test**: With a score currently displayed, click "New Score" button/menu, confirm any prompt about unsaved changes, verify that the workspace is cleared and shows an empty score with default settings.

**Acceptance Scenarios**:

1. **Given** the user is viewing a score, **When** they create a new score, **Then** the current score is cleared and a fresh empty score is displayed with default tempo (120 BPM) and time signature (4/4)
2. **Given** the user has unsaved changes, **When** they attempt to create a new score, **Then** they are warned about losing unsaved changes and can choose to proceed or cancel

---

### Edge Cases

- What happens when the file path specified for saving doesn't exist or is not writable?
- How does the system handle JSON files with missing or extra fields?
- What happens if the file is very large (hundreds of measures with many instruments)?
- How does the system handle concurrent access (file modified outside the application)?
- What if the JSON file contains invalid MIDI pitch values or negative durations?
- How is the current file path tracked after save/load for "Save" vs "Save As" functionality?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a mechanism to serialize the entire score (instruments, notes, tempo, time signatures, clefs) to JSON format
- **FR-002**: System MUST provide a mechanism to deserialize valid JSON files back into score objects
- **FR-003**: Users MUST be able to save the current score to a file path of their choosing
- **FR-004**: Users MUST be able to load a score from a JSON file, replacing the current score
- **FR-005**: System MUST validate JSON structure during load and provide clear error messages for invalid files
- **FR-006**: System MUST track the current file path after save/load operations for future save operations
- **FR-007**: System MUST warn users about unsaved changes before actions that would discard them (new score, load different file, close application)
- **FR-008**: Users MUST be able to create a new empty score, clearing the current workspace
- **FR-009**: JSON format MUST be human-readable and represent the score structure simply (no unnecessary nesting or encoding)
- **FR-010**: System MUST preserve all musical data with full fidelity (no data loss during save/load cycle)

### Key Entities *(include if feature involves data)*

- **Score File**: JSON representation of a score containing all musical data
  - File path (absolute path to JSON file on disk)
  - JSON structure mirroring the existing Score domain model (instruments array, global_structural_events array, etc.)
  - No additional wrapping or metadata beyond what's necessary
  
- **File State**: Application state tracking file operations
  - Current file path (null if unsaved new score)
  - Modified flag (true if score has unsaved changes)
  - Last saved timestamp (for future conflict detection)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save a score and reload it with 100% data fidelity (all notes, instruments, tempos, time signatures, clefs preserved exactly)
- **SC-002**: Save operation completes in under 1 second for scores with up to 100 measures and 10 instruments
- **SC-003**: Load operation completes in under 2 seconds for scores with up to 100 measures and 10 instruments
- **SC-004**: JSON file size is reasonable (under 1MB for typical scores with 50 measures and 5 instruments)
- **SC-005**: Users can read and understand the JSON structure without documentation (field names are clear, structure is intuitive)
- **SC-006**: System successfully loads valid JSON files 100% of the time
- **SC-007**: System detects and reports invalid JSON files with helpful error messages (not generic parsing errors)
- **SC-008**: Users receive clear warning before losing unsaved work in 100% of cases

## Assumptions

- The existing Score domain model in the backend already contains all necessary data and can be directly serialized to JSON
- File operations will be performed via browser APIs (File API, download links) for the frontend, not server-side storage
- Users are working on local files, not cloud storage or collaboration features (those may come later)
- The simplest JSON format means using the existing API response format (as returned by GET /api/v1/scores/:id) without additional wrapping
- "Save" functionality will use browser download mechanism initially (may evolve to File System Access API later)
- "Load" functionality will use file input element for file selection

## Out of Scope

- Cloud storage or synchronization
- Auto-save functionality
- File versioning or history
- Multiple file formats (MusicXML, MIDI export, PDF)
- Collaborative editing or file locking
- Encryption or password protection
- Compression of JSON files
- Recent files list or file management UI

## Dependencies

- Existing backend Score model and serialization (already implemented via REST API)
- Browser File API support (available in all modern browsers)
- Frontend score state management (already implemented in ScoreViewer component)
