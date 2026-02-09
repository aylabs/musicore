# Implementation Plan: Stacked Staves View

**Branch**: `010-stacked-staves-view` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-stacked-staves-view/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a new view mode in the frontend that displays all musical staves vertically stacked (full score view), with multi-voice rendering per staff, instrument name labels, and complete playback integration. Users can toggle between the existing individual instrument view and the new stacked view via a UI selector. This is a frontend-only feature requiring no backend changes.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2  
**Primary Dependencies**: React, Vite (bundler), Vitest (testing), Tone.js (audio playback)  
**Storage**: N/A (frontend only, uses existing backend API)  
**Testing**: Vitest with @testing-library/react, happy-dom for DOM testing  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (frontend component of monorepo)  
**Performance Goals**: 60 fps rendering for stacked view, <16ms update cycle for playback highlighting across all staves, <500ms view switching transition  
**Constraints**: Must maintain existing playback precision (960 PPQ), must not degrade performance with up to 50 staves, must preserve all existing playback features (click-to-seek, auto-scroll, tempo control)  
**Scale/Scope**: Single new view mode, ~5-8 new React components, reuse existing playback, notation rendering, and scroll logic

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Domain-Driven Design ✅ PASS
- **Assessment**: Feature uses existing domain entities (Score, Instrument, Staff, Voice, Note) without modification
- **Ubiquitous Language**: Component names will follow domain terminology (StackedStaffView, StaffGroup, etc.)
- **Impact**: No changes to domain model; pure presentation layer addition

### Principle II: Hexagonal Architecture ✅ PASS
- **Assessment**: Frontend feature only; backend core domain unchanged
- **Ports/Adapters**: Reuses existing API client (apiClient) without modification
- **Impact**: No new adapters or ports required

### Principle III: API-First Development ✅ PASS
- **Assessment**: No API contract changes required
- **Backend Changes**: None - feature consumes existing GET /scores/{id} endpoint
- **Impact**: Frontend-only implementation; no backend coupling introduced

### Principle IV: Precision & Fidelity ✅ PASS
- **Assessment**: Reuses existing 960 PPQ playback system without modification
- **Timing Integrity**: No floating-point arithmetic introduced; tick-based positioning preserved
- **Impact**: Playback precision maintained across view modes

### Principle V: Test-First Development ✅ PASS
- **Commitment**: All new components will follow TDD workflow (test → implement → refactor)
- **Test Coverage**: Unit tests for ViewModeSelector, StackedStaffView; integration tests for view switching during playback
- **Impact**: No implementation without corresponding tests

### Technical Standards Compliance ✅ PASS
- **Technology Stack**: Uses existing React 19.2 + TypeScript 5.9 + Vite
- **Code Quality**: ESLint/Prettier already configured; will apply to new components
- **Dependencies**: No new dependencies required; reuses Tone.js, existing notation components
- **Performance**: Targets 60fps (16ms budget) per constitution's frontend responsiveness requirement

**GATE RESULT**: ✅ **ALL CHECKS PASS** - Proceed to Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/010-stacked-staves-view/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - N/A for this feature
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ScoreViewer.tsx              # Enhanced: Add view mode state
│   │   ├── ScoreViewer.css              # Enhanced: Add stacked view styles
│   │   ├── InstrumentList.tsx           # Existing: Reused for individual view
│   │   ├── NoteDisplay.tsx              # Existing: Reused for individual view  
│   │   ├── notation/
│   │   │   ├── StaffNotation.tsx        # Existing: Reused for staff rendering
│   │   │   ├── NotationRenderer.tsx     # Existing: Reused for note rendering
│   │   │   └── ...                      # Other notation components
│   │   ├── playback/
│   │   │   └── PlaybackControls.tsx     # Existing: Shared across views
│   │   └── stacked/                     # NEW: Stacked view components
│   │       ├── ViewModeSelector.tsx     # NEW: Toggle between views
│   │       ├── ViewModeSelector.test.tsx
│   │       ├── ViewModeSelector.css
│   │       ├── StackedStaffView.tsx     # NEW: Main stacked view container
│   │       ├── StackedStaffView.test.tsx
│   │       ├── StackedStaffView.css
│   │       ├── StaffGroup.tsx           # NEW: Single staff with label
│   │       ├── StaffGroup.test.tsx
│   │       ├── StaffGroup.css
│   │       ├── MultiVoiceStaff.tsx      # NEW: Renders voices together
│   │       ├── MultiVoiceStaff.test.tsx
│   │       └── MultiVoiceStaff.css
│   ├── hooks/
│   │   └── usePlayback.ts               # Existing: Reused without changes
│   ├── services/
│   │   └── playback/
│   │       └── MusicTimeline.ts         # Existing: Reused without changes
│   └── types/
│       ├── score.ts                     # Existing: Reused without changes
│       └── playback.ts                  # Existing: Reused without changes
└── tests/
    └── components/
        └── stacked/                     # NEW: Integration tests
            └── view-switching.test.tsx  # NEW: Test playback during view switch
```

**Structure Decision**: Web application monorepo structure. This feature adds a new `stacked/` directory under `frontend/src/components/` containing 4 new components (ViewModeSelector, StackedStaffView, StaffGroup, MultiVoiceStaff) with corresponding tests and styles. Existing components (ScoreViewer, PlaybackControls, StaffNotation, NotationRenderer) are reused with minimal modifications. No backend changes required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: ✅ No constitution violations detected. This feature:
- Uses existing domain model without modifications
- Requires no new dependencies
- Follows established React component patterns
- Reuses existing playback, notation, and scroll logic
- Maintains test-first development workflow

No complexity justification required.
