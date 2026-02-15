# Implementation Plan: Playback Note Highlighting

**Branch**: `019-playback-note-highlight` | **Date**: 2026-02-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-playback-note-highlight/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Provide real-time visual feedback during music playback by highlighting notes as they are played. The system leverages the existing 60 Hz currentTick broadcast from the playback system to determine which notes are actively playing at any moment, then applies visual highlighting to those notes in the renderer. This creates a synchronized audio-visual experience that helps users follow along with the music, understand note-to-sound relationships, and learn musical content. The implementation focuses on maintaining tight synchronization (≤50ms lag) with the audio playback while ensuring smooth visual updates at 60fps without performance degradation.

## Technical Context

**Language/Version**: Rust (latest stable) for backend/WASM, TypeScript/React 19+ for frontend  
**Primary Dependencies**: React 19.2, Tone.js 14.9, wasm-bindgen 0.2, Vite (bundler)  
**Storage**: N/A (feature uses in-memory state, no persistence)  
**Testing**: Vitest (unit/integration), Playwright (E2E), cargo test (Rust)  
**Target Platform**: Tablet devices (iPad/Surface/Android tablets), Chrome 57+, Safari 11+, Edge 16+
**Project Type**: Web application (PWA) with frontend + backend (WASM)  
**Performance Goals**: 60 fps visual updates, <50ms audio-visual synchronization lag, offline-capable  
**Constraints**: ≤50ms audio-visual lag (FR-003), 60+ fps updates (FR-014), no UI jank on dense scores (SC-009)  
**Scale/Scope**: Scores up to 1000 measures, 10+ simultaneous notes, 40-240 BPM tempo range

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Domain-Driven Design ✅ PASS
This feature is a **presentation concern**, not a core domain feature. It applies visual styling to notes during playback based on timing state managed by the existing MusicTimeline domain logic. No new domain entities or domain logic required. Existing entities (Note, PlaybackState) are sufficient.

### Principle II: Hexagonal Architecture ✅ PASS
Implementation is **purely in the frontend presentation layer** (React components). The core playback domain logic (MusicTimeline, PlaybackScheduler) remains unchanged. Highlighting logic will consume playback state via existing React context/hooks (adapter pattern). No backend changes required.

### Principle III: Progressive Web Application Architecture ✅ PASS
Feature operates entirely **client-side** within the existing PWA structure. No network calls, no service worker changes. Works offline. Leverages existing React/WASM architecture. Fits within tablet-optimized UI constraints (touch-friendly, responsive, 60fps).

### Principle IV: Precision & Fidelity ✅ PASS
Uses existing **960 PPQ timing** from MusicTimeline. No new timing calculations or floating-point arithmetic. Highlighting logic determines note state using integer tick comparisons: `currentTick >= note.start_tick && currentTick < (note.start_tick + note.duration_ticks)`. Maintains deterministic timing precision.

### Principle V: Test-First Development ✅ PASS
Will follow **TDD workflow**: Write tests for note highlighting logic (which notes should be highlighted at given currentTick), React component tests for visual rendering, integration tests for playback synchronization. All code paired with tests before merge.

### Principle VI: Layout Engine Authority ✅ PASS
**Does not calculate or modify spatial geometry**. Highlighting applies CSS class or inline style to existing rendered SVG note elements. Renderer (LayoutRenderer component) receives highlight state as props and applies visual styling only. Spatial positioning remains controlled by layout engine output.

### Principle VII: Regression Prevention ✅ PASS
Will apply this principle throughout development. Any bugs discovered during implementation (timing synchronization issues, visual artifacts, performance problems) will result in failing tests before fixes. Tests become permanent regression prevention.

**GATE RESULT: ✅ ALL PRINCIPLES SATISFIED - Proceed to Phase 0**

## Project Structure

### Documentation (this feature)

```text
specs/019-playback-note-highlight/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (research note highlighting approaches)
├── data-model.md        # Phase 1 output (highlight state model)
├── quickstart.md        # Phase 1 output (implementation guide)
├── contracts/           # Phase 1 output (TypeScript interfaces)
│   └── HighlightState.ts
└── checklists/
    └── requirements.md  # ✅ Already completed during /speckit.specify
```

### Source Code (repository root)

```text
backend/
└── (No changes - feature is frontend-only)

frontend/
├── src/
│   ├── components/
│   │   └── score/
│   │       ├── LayoutRenderer.tsx        # UPDATED: Accept highlightedNoteIds prop
│   │       ├── LayoutRenderer.test.tsx   # UPDATED: Add highlight rendering tests
│   │       └── NoteElement.tsx           # UPDATED: Apply highlight class/style
│   ├── services/
│   │   ├── playback/
│   │   │   ├── useNoteHighlight.ts       # NEW: Hook for determining highlighted notes
│   │   │   ├── useNoteHighlight.test.ts  # NEW: Unit tests for highlight logic
│   │   │   └── MusicTimeline.ts          # REVIEWED: Already broadcasts currentTick at 60 Hz
│   │   └── state/
│   │       └── HighlightStateContext.tsx # NEW: React context for highlight state (if needed)
│   ├── types/
│   │   └── highlight.ts                  # NEW: TypeScript interfaces for highlight state
│   └── App.tsx                           # UPDATED: Wire up highlight state to renderer
└── tests/
    ├── integration/
    │   └── note-highlight-integration.test.tsx  # NEW: E2E playback + highlight sync
    └── unit/
        └── useNoteHighlight.test.ts      # NEW: Unit tests for highlight logic
```

**Structure Decision**: This is a **frontend-only feature** within an existing web application. No backend changes required since the feature consumes existing playback state (currentTick from MusicTimeline) and applies visual styling to rendered notes. The implementation follows React component architecture with hooks for state management and context for sharing highlight state between playback controls and renderer.

## Complexity Tracking

No constitution violations to justify. All principles satisfied (see Constitution Check above).

---

## Post-Design Constitution Re-Check

*Phase 1 Complete - Final validation after research, data model, and contracts*

### Re-validation Results

After completing Phase 0 (Research) and Phase 1 (Design, Contracts, Quickstart):

✅ **Principle I: Domain-Driven Design** - CONFIRMED PASS
- Research confirmed no domain entities needed
- Data model shows clear separation: derived state (Set<string>) for UI, not domain
- No changes to core music entities (Note, Timeline)

✅ **Principle II: Hexagonal Architecture** - CONFIRMED PASS
- Design maintains frontend-only implementation
- useNoteHighlight hook acts as adapter consuming playback state
- No backend/WASM changes in any design artifact

✅ **Principle III: PWA Architecture** - CONFIRMED PASS
- Offline-capable (no network dependencies)
- Leverages existing React/Tone.js infrastructure
- Performance validated: <2ms computation, <7ms total per frame

✅ **Principle IV: Precision & Fidelity** - CONFIRMED PASS
- Research confirmed integer-only tick comparisons
- No floating-point arithmetic introduced
- Uses existing 960 PPQ timing without modification

✅ **Principle V: Test-First Development** - CONFIRMED PASS
- Quickstart includes comprehensive test examples
- Contracts define testable interfaces
- Test-first approach detailed in implementation guide

✅ **Principle VI: Layout Engine Authority** - CONFIRMED PASS
- Design confirms CSS class application only (no geometry calculation)
- Quickstart shows NoteElement receives isHighlighted flag, applies styling
- No spatial calculations in any design artifact

✅ **Principle VII: Regression Prevention** - CONFIRMED PASS
- Quickstart includes test templates for all functionality
- Manual test checklist included
- Edge cases documented with test coverage

**FINAL GATE RESULT: ✅ ALL PRINCIPLES SATISFIED**

Design is complete and ready for Phase 2 (tasks.md via `/speckit.tasks`).
