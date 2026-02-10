# Implementation Plan: Remove Editing Interface

**Branch**: `014-remove-edit-ui` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-remove-edit-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Remove all editing UI elements from the application to create a clean, read-only score viewing and playback experience. This addresses the current architectural gap where editing controls rely on REST API endpoints that are unavailable in the PWA deployment on GitHub Pages. By removing non-functional editing buttons (New Score, Save, Add Note/Voice/Staff, Add Instrument input), the interface becomes focused on what actually works: viewing scores, playback, file import, and demo onboarding.

**Technical Approach**: This is a UI-removal feature with no data model or API changes. Implementation consists of:
1. Conditional rendering logic to hide editing buttons in React components
2. Remove keyboard shortcuts for edit operations (Ctrl+S, Ctrl+N)
3. Remove unsaved changes warning (no editing means no unsaved state)
4. Preserve all view/playback functionality and file import capabilities

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, WASM music engine (backend Rust compiled via wasm-pack)  
**Storage**: IndexedDB for offline score storage (already implemented)  
**Testing**: Vitest, @testing-library/react  
**Target Platform**: Tablet devices (iPad/Surface/Android tablets), Chrome 57+, Safari 11+, Edge 16+, PWA deployed on GitHub Pages  
**Project Type**: Web application (frontend/ React PWA + backend/ Rust WASM)  
**Performance Goals**: Offline-capable, 60fps UI responsiveness, <200ms score rendering  
**Constraints**: Offline-first PWA, tablet-optimized touch targets, GitHub Pages static hosting (no REST API available)  
**Scale/Scope**: Single-page application, 4 main UI components affected (ScoreViewer, InstrumentList, NoteDisplay, App header)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Domain-Driven Design
**Status**: PASS (No domain changes)  
**Rationale**: This feature only affects UI visibility. No music domain entities (Timeline, Events, Score model) are modified. UI removal does not introduce new terminology or change domain language.

### ✅ II. Hexagonal Architecture
**Status**: PASS (No architecture changes)  
**Rationale**: UI removal is purely at the adapter layer (React components). No changes to core domain, ports, or backend service logic. Dependency flow remains inward-pointing.

### ✅ III. Progressive Web Application Architecture
**Status**: PASS (Aligns with PWA constraints)  
**Rationale**: This feature directly addresses PWA architectural reality: editing UI relies on REST API unavailable in static GitHub Pages deployment. Removing broken UI improves offline-first experience by focusing on WASM-powered capabilities (score rendering, playback, import parsing) that work offline.

### ✅ IV. Precision & Fidelity
**Status**: PASS (No timing changes)  
**Rationale**: No changes to music timeline, PPQ resolution, or timing calculations. Playback and rendering fidelity preserved.

### ✅ V. Test-First Development
**Status**: PASS (Tests planned for each component modification)  
**Rationale**: Each UI component change will have corresponding tests verifying buttons are not rendered. Existing playback/view tests ensure functionality preservation.

## Project Structure

### Documentation (this feature)

```text
specs/014-remove-edit-ui/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - N/A (no research needed for UI removal)
├── data-model.md        # Phase 1 output - N/A (no data model changes)
├── quickstart.md        # Phase 1 output - N/A (no API contracts)
├── contracts/           # Phase 1 output - N/A (no API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ScoreViewer.tsx         # Remove: New Score button, Save button, score name input, keyboard shortcuts
│   │   ├── InstrumentList.tsx      # Remove: Add Voice button, Add Staff button
│   │   ├── NoteDisplay.tsx         # Remove: Add Note button
│   │   └── App.tsx                 # No changes (landing in ScoreViewer, not separate component)
│   ├── services/
│   │   └── state/
│   │       └── FileStateContext.tsx # Consider deprecating or simplifying (no save operations)
│   └── test/
│       └── components/              # Add tests for removed UI elements
└── package.json

backend/
└── (no changes - backend Rust code unaffected)
```

**Structure Decision**: Web application (Option 2) with React frontend and Rust backend. This feature only modifies frontend React components. No backend changes required since we're removing UI that called backend APIs, not modifying backend logic.

## Complexity Tracking

> **No violations detected** - All constitution checks pass without justification needed. This is a straightforward UI removal feature.
