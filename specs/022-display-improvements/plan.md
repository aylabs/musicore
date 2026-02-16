# Implementation Plan: Display Improvements

**Branch**: `022-display-improvements` | **Date**: 2026-02-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/022-display-improvements/spec.md`

## Summary

Three complementary display improvements to the Musicore UI: (1) a real-time playback timer showing elapsed/total time in MM:SS format across all views, (2) score title extraction from MusicXML metadata (work-title > movement-title > filename) displayed in the score header, and (3) adding the existing TempoControl component to the Layout View alongside the zoom controls. All changes are frontend-only except for MusicXML title extraction which requires a small Rust parser enhancement.

## Technical Context

**Language/Version**: Rust (stable), TypeScript 5.x, React 18+  
**Primary Dependencies**: React, Tone.js (playback), wasm-pack/wasm-bindgen (WASM bindings), Vite  
**Storage**: N/A (all state is in-memory React state/context)  
**Testing**: Vitest (frontend unit/integration), Playwright (E2E), cargo test (backend)  
**Target Platform**: Tablet devices (iPad/Surface/Android) via PWA, Chrome 57+, Safari 11+  
**Project Type**: Web application (monorepo: backend/ + frontend/)  
**Performance Goals**: Timer updates at ≥1 Hz visually (60 Hz available), 60 fps UI rendering, <100ms WASM operations  
**Constraints**: Offline-first, touch targets ≥44×44px, must work in compact mode (stacked/layout views)  
**Scale/Scope**: 3 independent UI improvements, frontend components + 1 small Rust parser change

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Assessment |
|-----------|--------|------------|
| I. Domain-Driven Design | ✅ PASS | Timer uses domain concepts (ticks, PPQ, tempo). Title is score metadata per music domain. No new domain abstractions needed. |
| II. Hexagonal Architecture | ✅ PASS | Title extraction in Rust parser (domain layer) exposed via WASM adapter. Frontend is a presentation adapter. No architecture violations. |
| III. PWA Architecture | ✅ PASS | All changes work offline. No network dependency. Timer computed client-side from existing tick data. |
| IV. Precision & Fidelity | ✅ PASS | Timer derived from 960 PPQ integer ticks via existing `ticksToSeconds()`. No new floating-point timing introduced. |
| V. Test-First Development | ✅ PASS | Plan includes unit tests for time formatting, title extraction, duration calculation. Component tests for UI. |
| VI. Layout Engine Authority | ✅ PASS | No spatial geometry calculations in renderer. Tempo control placement uses standard CSS layout, not spatial calculations. |
| VII. Regression Prevention | ✅ PASS | No bugs to fix; new feature. Will document any issues discovered during implementation. |

**Gate result: ALL PASS — proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/022-display-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── playback-timer.ts
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── domain/
│       └── importers/
│           └── musicxml/
│               ├── mod.rs           # MODIFY: populate work_title from parsed data
│               ├── parser.rs        # MODIFY: extract <work-title>, <movement-title>
│               └── types.rs         # MODIFY: add title fields to MusicXMLDocument
│   └── adapters/
│       └── wasm/
│           └── bindings.rs          # MODIFY: pass work_title through WASM bindings
└── tests/
    └── musicxml_import_test.rs      # MODIFY: add title extraction tests

frontend/
├── src/
│   ├── components/
│   │   ├── playback/
│   │   │   ├── PlaybackControls.tsx # MODIFY: add PlaybackTimer
│   │   │   ├── PlaybackTimer.tsx    # NEW: timer display component
│   │   │   └── TempoControl.tsx     # NO CHANGE (reused in Layout View)
│   │   ├── layout/
│   │   │   └── LayoutView.tsx       # MODIFY: add TempoControl alongside zoom
│   │   └── ScoreViewer.tsx          # MODIFY: display title, pass timer data
│   ├── pages/
│   │   └── ScoreViewer.tsx          # MODIFY: accept TempoControl render slot
│   ├── services/
│   │   ├── playback/
│   │   │   └── MusicTimeline.ts     # MODIFY: expose totalDurationTicks
│   │   └── import/
│   │       └── MusicXMLImportService.ts  # MODIFY: consume work_title from WASM result
│   ├── utils/
│   │   └── timeFormatting.ts        # NEW: MM:SS / H:MM:SS formatting utilities
│   └── types/
│       ├── playback.ts              # MODIFY: add timer-related types
│       └── score.ts                 # MODIFY: add title to Score or state
└── tests/
    └── (unit tests for new utilities and components)
```

**Structure Decision**: Web application structure (backend/ + frontend/). Changes span both layers: minor Rust parser enhancement for title extraction, bulk of work in frontend React components and utilities.

## Constitution Check — Post-Design Re-evaluation

*Re-checked after Phase 1 design completion.*

| Principle | Status | Post-Design Assessment |
|-----------|--------|----------------------|
| I. Domain-Driven Design | ✅ PASS | Title is music metadata (ubiquitous language). `MusicXMLDocument` extended with domain-relevant fields. Timer uses domain concepts (ticks, PPQ). |
| II. Hexagonal Architecture | ✅ PASS | Title extraction in domain layer (`parser.rs`), exposed via WASM adapter (`bindings.rs`). Frontend is a presentation adapter consuming the port. Dependency rule respected — core has no UI dependencies. |
| III. PWA Architecture | ✅ PASS | All computation client-side via WASM. No network calls added. Offline capability unchanged. |
| IV. Precision & Fidelity | ✅ PASS | `totalDurationTicks` calculated with integer arithmetic on `start_tick + duration_ticks`. Conversion to seconds only at display time via existing `ticksToSeconds()`. No new floating-point timing logic. |
| V. Test-First Development | ✅ PASS | Plan includes: (1) Rust tests for title extraction, (2) unit tests for `formatPlaybackTime()`, (3) component tests for PlaybackTimer, (4) integration tests for title display. |
| VI. Layout Engine Authority | ✅ PASS | No spatial calculations in renderer. Tempo control positioned via CSS flexbox, not coordinate math. Zoom controls unchanged. |
| VII. Regression Prevention | ✅ PASS | No existing bugs addressed. New tests will prevent regression on the new features. |

**Post-design gate result: ALL PASS — no violations, no complexity tracking needed.**
