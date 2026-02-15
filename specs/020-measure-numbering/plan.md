# Implementation Plan: Measure Numbering

**Branch**: `020-measure-numbering` | **Date**: 2026-02-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/020-measure-numbering/spec.md`

## Summary

Add measure numbering to score rendering. Each system displays the 1-based measure number of its first measure, positioned above the topmost staff line and horizontally aligned with the clef glyph (x=60.0). The layout engine computes the measure number and its position; the renderer displays it as plain text in a standard font. One measure number per system regardless of instrument count.

## Technical Context

**Language/Version**: Rust (latest stable) for backend layout engine; TypeScript + React for frontend renderer
**Primary Dependencies**: serde/serde_json (Rust serialization), wasm-bindgen/wasm-pack (WASM compilation), React 18+ (frontend)
**Storage**: N/A — computed at layout time, no persistence required
**Testing**: `cargo test` (Rust unit/integration), Vitest (frontend unit)
**Target Platform**: Tablet devices (iPad/Surface/Android) via PWA, WASM in-browser
**Project Type**: Web application — monorepo with `backend/` (Rust) and `frontend/` (React)
**Performance Goals**: Layout computation <100ms for typical scores; 60fps rendering
**Constraints**: All positioning computed in Rust layout engine (Principle VI). Renderer must not compute spatial coordinates. Deterministic output for same input.
**Scale/Scope**: Affects 3 Rust files (types.rs, mod.rs, breaker.rs), 2 frontend files (layout.ts, LayoutRenderer.tsx), plus tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Domain-Driven Design | PASS | Measure number is a music domain concept; modeled as explicit entity |
| II. Hexagonal Architecture | PASS | Layout engine (core) computes positions; renderer (adapter) only displays |
| III. PWA Architecture | PASS | Computed via WASM in-browser; no server dependency; works offline |
| IV. Precision & Fidelity | PASS | Measure numbering derived from tick positions using integer arithmetic (start_tick / 3840 + 1) |
| V. Test-First Development | PASS | Tests will be written for layout computation and rendering |
| VI. Layout Engine Authority | PASS | All positioning (x, y coordinates) computed in Rust layout engine; renderer receives pre-computed coordinates |
| VII. Regression Prevention | PASS | N/A for initial implementation; regression tests added if bugs found |

**Gate Result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/020-measure-numbering/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── layout/
│   │   ├── types.rs         # Add MeasureNumber struct, field on System
│   │   ├── mod.rs           # Compute measure number + position in compute_layout
│   │   ├── breaker.rs       # Initialize measure_number: None in create_system
│   │   └── positioner.rs    # (read-only reference for clef positioning)
│   └── ...
└── tests/
    ├── layout_test.rs                # Add measure numbering unit tests
    └── layout_integration_test.rs    # Add measure numbering integration tests

frontend/
├── src/
│   ├── wasm/
│   │   └── layout.ts               # Add MeasureNumber interface, update System
│   └── components/
│       └── LayoutRenderer.tsx       # Render measure number in renderSystem()
└── ...
```

**Structure Decision**: Web application structure (backend + frontend). Changes are minimal and confined to existing layout module files plus their TypeScript counterparts. No new directories or modules needed.
