# Feature Specification: Migrate Practice Layout to Rust Layout Engine

**Feature Branch**: `001-practice-rust-layout`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: Migrate the Practice Layout to Rust Layout Engine — serialize exercise notes → WASM input JSON, swap NotationLayoutEngine → computeLayout + LayoutRenderer, express highlightedSlotIndex as a note id rather than an array index.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Exercise Staff Renders via Rust Engine (Priority: P1)

A user opens the Piano Practice view and sees the exercise staff. The staff is rendered using the same Rust layout engine that powers all other score views in the application — producing consistent barlines, note spacing, and visual quality identical to the score viewer.

**Why this priority**: This is the core of the migration. All other improvements depend on it. Without it, the practice view remains on an isolated, divergent layout path.

**Independent Test**: Open the practice view, generate an exercise with multiple measures (e.g., 16 notes), and verify the staff appears visually correct — correctly spaced barlines, no note/barline overlap, consistent glyph sizes. Can be tested independently of highlight or response staff.

**Acceptance Scenarios**:

1. **Given** the practice view loads, **When** an exercise is generated, **Then** the exercise staff is rendered by the Rust layout engine and shows the same glyph quality as the main score viewer.
2. **Given** an exercise spanning multiple measures, **When** the staff is displayed, **Then** barlines appear at correct measure boundaries without overlapping notes.
3. **Given** exercise notes of varying durations, **When** the staff is displayed, **Then** note spacing reflects the Rust engine's proportional spacing rules.
4. **Given** the practice view is open, **When** `NotationLayoutEngine` is removed as a dependency, **Then** no layout functionality regresses.

---

### User Story 2 — Highlighted Note Tracks Current Slot by Note ID (Priority: P1)

A user is doing a flow-mode or step-mode exercise. As the exercise plays, the current note is visually highlighted on the exercise staff. The highlight correctly follows the active slot throughout the full exercise duration, including near the end.

**Why this priority**: Highlight is a core UX element of the practice feature. It must work correctly with the new layout. It is P1 alongside Story 1 because Story 1 alone without a working highlight is not yet a shippable slice.

**Independent Test**: Run a flow-mode exercise and observe that each note lights up in sequence at the correct beat. Test also with more than 8 notes to exercise edge cases. Can be tested without the response staff being migrated.

**Acceptance Scenarios**:

1. **Given** a flow-mode exercise is playing, **When** the playback cursor reaches a new note, **Then** that note's glyph is highlighted and all others are not.
2. **Given** a step-mode exercise is in progress, **When** the user plays the correct note for slot N, **Then** the highlight advances to slot N+1.
3. **Given** an exercise near the last note, **When** the final slot is active, **Then** the highlight appears on the last note without visual error.
4. **Given** the user presses Stop, **When** the exercise is reset, **Then** no note remains highlighted.

---

### User Story 3 — Response Staff Also Rendered via Rust Engine (Priority: P2)

A user completes a flow-mode exercise. The response staff (showing the notes the user actually played) is rendered using the same Rust layout engine — sharing visual consistency with the exercise staff above it.

**Why this priority**: The response staff is only visible in flow mode after completion. It is not required for the core practice loop (step mode or flow mode during playback), making it lower priority than Stories 1 and 2.

**Independent Test**: Complete a flow-mode exercise, verify the response staff renders with correct note positions. Can be tested entirely independently after Story 1 is done.

**Acceptance Scenarios**:

1. **Given** a flow-mode exercise is completed, **When** the results are shown, **Then** the response staff renders via the Rust engine with the same visual style as the exercise staff.
2. **Given** the response staff is empty (no notes detected), **When** the results are shown, **Then** an empty staff is displayed without errors.
3. **Given** the response has notes of varying pitches, **When** displayed, **Then** note positions on the response staff match the correct staff lines for those pitches.

---

### Edge Cases

- What happens if the WASM module has not yet initialised when the exercise is generated? The practice view must wait for WASM readiness before attempting layout computation.
- What happens if the exercise has only one note (single-measure, no barlines)? The layout must still render a valid single-measure staff.
- What happens if the exercise spans more measures than the staff width? The staff must remain scrollable horizontally as before.
- What happens if `computeLayout` returns a multi-system (line-wrapped) layout? The practice view requires all notes in one scrollable system; `max_system_width` must be set large enough to prevent line-breaking.
- What happens when auto-scroll looks up the x-position of a highlighted note and the note id is not found in the `GlobalLayout`? The scroll must fail gracefully without throwing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Exercise notes MUST be serialized into the Rust layout engine's JSON input format: `{ instruments: [{ id, name, staves: [{ clef, time_signature, key_signature, voices: [{ notes: [{ tick, duration, pitch }] }] }] }] }` before layout computation.
- **FR-002**: The practice view MUST call `computeLayout` (WASM) to obtain a `GlobalLayout` for the exercise staff, replacing `NotationLayoutEngine.calculateLayout`.
- **FR-003**: The exercise staff MUST be rendered using `LayoutRenderer` instead of `NotationRenderer`.
- **FR-004**: Each exercise note MUST be assigned a stable string identifier (e.g., `"ex-{slotIndex}"`) at exercise generation time, stored on the `ExerciseNote` type.
- **FR-005**: The active slot MUST be expressed as a set of note ids (e.g., `["ex-{highlightedSlotIndex}"]`) and passed to `LayoutRenderer` via its `highlightedNoteIds` prop.
- **FR-006**: The `max_system_width` passed to the Rust layout engine MUST be derived from the practice staff container width so that all exercise notes render in a single horizontal system.
- **FR-007**: Auto-scroll on highlight change MUST be preserved: the practice view MUST locate the highlighted note's x-position within the `GlobalLayout` glyph tree and scroll the staff container to center it.
- **FR-008**: In flow mode, the response staff MUST also be rendered via `computeLayout` + `LayoutRenderer` using the recorded response notes.
- **FR-009**: `NotationLayoutEngine` MUST NOT be imported by `PracticeView` after this migration is complete.
- **FR-010**: WASM initialisation MUST be awaited before layout; a loading state MUST be shown to the user if the layout is not yet ready when the view first renders.

### Key Entities

- **ExerciseNote**: A single note in the generated exercise. Gains a stable `id: string` field alongside existing `pitch`, `startTick`, `durationTicks`.
- **Exercise**: The container for the generated exercise. Its `notes: ExerciseNote[]` array is the source for layout serialization.
- **Layout Input JSON**: The intermediate structure built from `Exercise` that satisfies the Rust engine's `instruments/staves/voices/notes` schema.
- **GlobalLayout**: The Rust engine's output — a tree of systems → staff groups → staves → glyph runs → glyphs. The practice view reads note glyph x-positions from this tree for auto-scroll and for verifying single-system output.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After migration, `PracticeView.tsx` imports zero symbols from `NotationLayoutEngine` or `NotationRenderer`.
- **SC-002**: Exercise staves with 8–20 notes render barlines at correct measure boundaries with no note/barline overlap at any exercise length, without any TypeScript-side position correction.
- **SC-003**: The highlighted note glyph visually tracks the active slot throughout a complete exercise (verified by unit and e2e tests) with no missed or stuck highlights.
- **SC-004**: All existing `PracticeView` unit tests pass after being adapted to mock `computeLayout` instead of `NotationLayoutEngine`.
- **SC-005**: A 20-note exercise renders the last note fully visible without clipping, as a direct consequence of using the Rust engine rather than a TypeScript workaround.
- **SC-006**: The delay between pressing "New Exercise" and the staff appearing is not perceptibly longer than before the migration (WASM is already initialised by the time the practice view is opened).


