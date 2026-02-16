# Implementation Plan: Multi-Instrument Play View

**Branch**: `023-multi-instrument-play` | **Date**: 2026-02-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-multi-instrument-play/spec.md`

## Summary

Enable the Play View to render all instruments from a score instead of only the first, with correct vertical spacing between instrument staff groups, instrument name labels at the start of each system, and playback highlighting across all instruments. The approach fixes the frontend's `convertScoreToLayoutFormat` to pass all instruments, corrects the Rust layout engine's vertical offset accumulation across instruments, adds `instrument_name` to `StaffGroup` in both Rust and TypeScript types, and renders instrument name labels in the SVG renderer.

## Technical Context

**Language/Version**: Rust (latest stable) + TypeScript 5.x / React 18+  
**Primary Dependencies**: wasm-pack, wasm-bindgen, serde, serde_json (backend); Vite, Tone.js (frontend)  
**Storage**: IndexedDB (offline-first PWA, no changes needed for this feature)  
**Testing**: `cargo test` (Rust unit/integration), Vitest (frontend unit), Playwright (e2e)  
**Target Platform**: Tablet devices (iPad/Surface/Android) via PWA, WASM in-browser  
**Project Type**: Web application (monorepo: `backend/` Rust + `frontend/` React)  
**Performance Goals**: 60fps rendering, <100ms WASM layout computation, <200ms initial render  
**Constraints**: Offline-first, tablet-optimized (44×44px touch targets), <500KB WASM bundle gzipped  
**Scale/Scope**: Scores up to 10,000+ events, up to 20+ instruments per score

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Domain-Driven Design | ✅ PASS | Uses existing domain entities (`Instrument`, `Staff`, `StaffGroup`). `instrument_name` is a domain concept already present on `Instrument.name`. |
| II | Hexagonal Architecture | ✅ PASS | Layout engine (core domain) remains framework-independent. WASM bindings (adapter) unchanged. Renderer (infrastructure) only reads layout output. |
| III | Progressive Web Application | ✅ PASS | No network dependency. All layout computation is local WASM. Offline-first preserved. |
| IV | Precision & Fidelity | ✅ PASS | Integer pulse (960 PPQ) arithmetic unchanged. Vertical spacing uses float coordinates consistent with existing layout engine. |
| V | Test-First Development | ✅ PASS | Plan includes Rust unit tests for multi-instrument layout, TypeScript tests for `convertScoreToLayoutFormat`, and integration tests for end-to-end rendering. |
| VI | Layout Engine Authority | ✅ PASS | All spatial positioning (vertical offsets, instrument label positions, system heights) computed in Rust. Renderer only displays geometry. No frontend spatial calculations added. |
| VII | Regression Prevention | ✅ PASS | Existing single-instrument tests preserved. New tests cover multi-instrument scenarios. |

**Gate Result**: ✅ ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/023-multi-instrument-play/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── layout-types.md  # Rust ↔ TypeScript type contracts
│   └── wasm-api.md      # WASM function contracts
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── layout/
│   │   ├── mod.rs           # compute_layout() — vertical offset + system height fixes
│   │   └── types.rs         # StaffGroup.instrument_name added
│   └── domain/
│       └── instrument.rs    # Existing Instrument struct (unchanged)
└── tests/
    └── layout_test.rs       # Multi-instrument layout tests

frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── LayoutView.tsx      # convertScoreToLayoutFormat all instruments
│   │   └── LayoutRenderer.tsx      # Instrument name label rendering
│   └── wasm/
│       └── layout.ts               # StaffGroup TypeScript type update
└── src/__tests__/
    └── (relevant test files)       # Multi-instrument rendering tests
```

**Structure Decision**: Web application structure (Option 2). Changes are confined to the existing `backend/src/layout/` module (Rust layout engine) and `frontend/src/components/` (React renderer). No new directories or modules needed.

## Constitution Check — Post-Design Re-evaluation

*Re-checked after Phase 1 design completion.*

| # | Principle | Status | Post-Design Notes |
|---|-----------|--------|-------------------|
| I | Domain-Driven Design | ✅ PASS | `NameLabel` is a layout-domain concept. `instrument_name` from existing `Instrument.name`. No domain model leakage. |
| II | Hexagonal Architecture | ✅ PASS | Layout engine = core domain. WASM binding = pass-through adapter. LayoutRenderer = infrastructure adapter — reads geometry only. |
| III | Progressive Web Application | ✅ PASS | All local WASM computation. Offline-first preserved. Negligible bundle size increase. |
| IV | Precision & Fidelity | ✅ PASS | 960 PPQ unchanged. Float coordinates consistent with existing engine. |
| V | Test-First Development | ✅ PASS | Rust unit, TS unit, contract, and integration tests specified. |
| VI | Layout Engine Authority | ✅ PASS | `NameLabel` position computed entirely in Rust. Renderer places `<text>` at Rust-provided coordinates — no spatial calculations in frontend. |
| VII | Regression Prevention | ✅ PASS | Single-instrument tests preserved. Regression tests mandated for any discovered bugs. |

**Post-Design Gate Result**: ✅ ALL PASS. No violations. No complexity justifications needed.

## Complexity Tracking

> No constitution violations. No complexity justifications needed.
