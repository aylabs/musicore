# Implementation Plan: Playback Scroll and Highlight

**Branch**: `009-playback-scroll-highlight` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-playback-scroll-highlight/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Synchronize notation display viewport with music playback by automatically scrolling horizontally to keep the current playback position visible, and visually highlighting notes as they play. Users can follow along without manual scrolling, with precise note-level feedback showing exactly which notes are currently sounding. Support manual scroll override with quick return to auto-scroll mode.

**Technical Approach**: Frontend-only feature (100%). Extend existing playback system (MusicTimeline) to track currentTick position and broadcast to notation components. Extend NotationLayoutEngine to maintain tick→pixel coordinate mapping. Add ScrollController service to calculate target viewport position based on playback tick and smooth-scroll the notation container. Add NoteHighlightService to identify currently playing notes by tick range and apply CSS highlighting classes. Integrate with Feature 008 (tempo change) for dynamic scroll speed adjustment. No backend changes required.

## Technical Context

**Language/Version**: 
- Backend: Rust 1.82+ (no changes required)
- Frontend: TypeScript 5.9, React 19.2

**Primary Dependencies**: 
- Frontend: React 19.2 (component lifecycle, hooks), Tone.js 14.9 (playback position tracking), existing NotationLayoutEngine (tick→pixel mapping)
- CSS animations for smooth scrolling and highlight transitions

**Storage**: N/A (no data persistence - scroll/highlight state is ephemeral playback state)

**Testing**: 
- Frontend: Vitest unit tests for timing calculations, React Testing Library for component integration
- Performance testing: Frame rate monitoring during scroll (target 60 FPS)

**Target Platform**: Web application (modern browsers with smooth scrolling APIs, intersection observers)

**Project Type**: Web (frontend-only modifications to existing monorepo)

**Performance Goals**: 
- 60 FPS scroll animation (16.67ms frame time budget)
- <50ms synchronization accuracy between audio and visual feedback
- Highlight updates at 30+ Hz for responsive visual feedback
- Support scores with 1000+ measures without performance degradation

**Constraints**: 
- Must not disrupt ongoing playback when scrolling
- Manual scroll override must disable auto-scroll temporarily without stopping audio
- Scroll position calculations must account for dynamic viewport sizes (responsive)
- Must integrate with tempo multiplier (Feature 008) for correct scroll speed
- Highlight must work across multiple simultaneous notes (chords) and multiple staves

**Scale/Scope**: 
- Single-user application (one simultaneous playback session)
- Typical scores: 50-500 measures (200-2000 notes)
- Viewport widths: 768px-4K (384px-3840px)
- Support zoom levels from 50%-200%

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅

**Status**: COMPLIANT

- Playback scroll and highlight are **presentation concerns**, not domain modifications
- Domain model (Score, Note, Timeline) remains unchanged - no new entities required
- Clear bounded context: Visual playback feedback lives entirely in presentation layer
- **Ubiquitous language preserved**: "playback position" (domain concept via currentTick) maps to "viewport scroll" (view concern)
- Scroll/highlight state is ephemeral view state, not domain state requiring persistence

### II. Hexagonal Architecture ✅

**Status**: COMPLIANT

- **Core domain**: No changes to Score, Note, or Timeline domain models
- **Application layer**: No new use cases in domain logic
- **Adapter layer**: Scroll and highlight implemented as view services (presentation adapters)
- **Dependency rule**: View services depend on domain concepts (currentTick from playback state), not vice versa
- **Port/Adapter separation**: MusicTimeline exposes currentTick (port), ScrollController/HighlightService consume it (adapters)

### III. API-First Development ✅

**Status**: COMPLIANT

- **No backend API changes** - feature is entirely frontend presentation logic
- Frontend and backend remain independently deployable
- No contract modifications required (score data structure unchanged)
- Feature uses existing playback state APIs (MusicTimeline currentTick)

### IV. Precision & Fidelity ✅

**Status**: COMPLIANT

- **Domain timing unchanged**: Score remains at 960 PPQ resolution
- Scroll calculations use integer tick values from domain model (no precision loss)
- Tick→pixel mapping uses consistent scaling (pixelsPerTick maintained from layout engine)
- Highlight determination based on exact tick ranges (start_tick, duration_ticks)
- No floating-point timing mutations introduced

### V. Test-First Development ✅

**Status**: COMPLIANT (TDD Required)

- **Unit tests**: Tick→pixel conversion, visible note identification, highlight state calculation
- **Component tests**: Scroll behavior during playback, highlight application, manual override
- **Integration tests**: Scroll synchronization with audio, tempo change integration
- **Performance tests**: Frame rate monitoring, synchronization accuracy measurement
- All tests written before implementation (red-green-refactor cycle)

## Project Structure

### Documentation (this feature)

```text
specs/009-playback-scroll-highlight/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) [EMPTY - no API changes]
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
└── (no changes - frontend-only feature)

frontend/
├── src/
│   ├── components/
│   │   └── notation/
│   │       ├── StaffNotation.tsx                    # MODIFIED: Add playback position prop
│   │       ├── StaffNotation.test.tsx               # MODIFIED: Add scroll/highlight tests
│   │       ├── NotationRenderer.tsx                 # MODIFIED: Apply highlight styles
│   │       └── NotationRenderer.test.tsx            # MODIFIED: Test highlight rendering
│   ├── services/
│   │   ├── notation/
│   │   │   ├── NotationLayoutEngine.ts              # MODIFIED: Expose tick→pixel mapping
│   │   │   └── NotationLayoutEngine.test.ts         # MODIFIED: Test coordinate mapping
│   │   ├── playback/
│   │   │   ├── MusicTimeline.ts                     # MODIFIED: Broadcast currentTick updates
│   │   │   ├── ScrollController.ts                  # NEW: Viewport scroll synchronization
│   │   │   ├── ScrollController.test.ts             # NEW: Scroll calculation tests
│   │   │   ├── NoteHighlightService.ts              # NEW: Identify playing notes
│   │   │   └── NoteHighlightService.test.ts         # NEW: Highlight logic tests
│   │   └── hooks/
│   │       ├── usePlaybackScroll.ts                 # NEW: Hook for scroll integration
│   │       └── usePlaybackScroll.test.ts            # NEW: Hook tests
│   ├── types/
│   │   ├── notation/
│   │   │   └── layout.ts                            # MODIFIED: Add highlight state types
│   │   └── playback.ts                              # MODIFIED: Add scroll state types
│   └── App.css                                      # MODIFIED: Add highlight animation styles
└── tests/
    └── integration/
        ├── playback-scroll.test.tsx                 # NEW: Scroll synchronization tests
        └── playback-highlight.test.tsx              # NEW: Highlight accuracy tests
```

**Structure Decision**:

This is a **web application** (monorepo with `frontend/` and `backend/` directories). The feature is **frontend-only**, modifying existing notation and playback services:

1. **`components/notation/`**: Existing components updated to receive playback position and apply highlight states
   - `StaffNotation.tsx`: Accept currentTick prop, wire up scroll/highlight hooks
   - `NotationRenderer.tsx`: Apply CSS classes to highlighted notes

2. **`services/playback/`**: New services for scroll and highlight logic
   - `ScrollController.ts`: Calculate viewport scroll position from currentTick
   - `NoteHighlightService.ts`: Identify notes within current playback tick range

3. **`hooks/`**: Custom React hooks for integration
   - `usePlaybackScroll.ts`: Coordinate scroll behavior with playback state

**Integration Points**:
- MusicTimeline → usePlaybackScroll → ScrollController → StaffNotation viewport
- MusicTimeline → NoteHighlightService → NotationRenderer note styles
- NotationLayoutEngine provides tick→pixel coordinate mapping
- Tempo multiplier (Feature 008) affects scroll speed calculations

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Feature adheres to all constitution principles:
- Pure presentation layer concern (DDD compliant)
- No domain model changes (hexagonal architecture maintained)
- No API modifications (API-first principles preserved)
- Integer tick arithmetic preserved (precision maintained)
- Test-first development enforced
