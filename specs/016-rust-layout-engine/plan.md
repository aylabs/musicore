# Implementation Plan: Rust Layout Engine

**Branch**: `016-rust-layout-engine` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-rust-layout-engine/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Convert a CompiledScore into a deterministic hierarchical spatial model (GlobalLayout → Systems → StaffGroups → Staves → GlyphRuns → Glyphs) expressed in logical units. Layout engine computes bounding boxes for efficient rendering, hit testing, and interaction. Systems serve as primary virtualization boundary for long scores. Output is JSON-serializable for caching and deterministic (byte-identical for same inputs).

## Technical Context

**Language/Version**: Rust 1.93+  
**Primary Dependencies**: serde 1.0+, serde_json 1.0+, wasm-bindgen 0.2+  
**Storage**: N/A (stateless layout computation, output cached in IndexedDB by frontend)  
**Testing**: cargo test (unit tests), integration tests with real CompiledScore fixtures  
**Target Platform**: Tablet devices (iPad/Surface/Android) via WASM compilation (wasm-pack, target web)  
**Project Type**: Web (Rust backend with WASM bindings, React frontend)  
**Performance Goals**: <100ms layout for 50 measures, <200ms for 100 measures, <500KB JSON serialization, <300KB WASM gzipped  
**Constraints**: Deterministic (byte-identical outputs), resolution-independent (logical units), offline-capable via WASM  
**Scale/Scope**: 200-measure scores, 2000+ glyphs, 40-50 systems, supports piano (2 staves) and orchestral scores (8+ staves)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅

**Requirement**: Music entities modeled using ubiquitous language, clear bounded contexts, aggregates.

**Status**: **PASS**

**Evidence**:
- Layout entities use music domain terminology: `System` (music systems), `Staff` (5-line staff), `StaffGroup` (multi-staff instruments like piano), `Glyph` (musical symbols), `TickRange` (musical time)
- Entity hierarchy mirrors music notation structure: GlobalLayout → Systems → StaffGroups → Staves → GlyphRuns → Glyphs
- Bounded context: Layout is separate subdomain transforming CompiledScore (domain model) into spatial representation (layout model)
- No technical leakage: "systems" not "divs", "staff spaces" not "pixels", "SMuFL codepoint" not "Unicode character"

---

### II. Hexagonal Architecture ✅

**Requirement**: Core domain independent of frameworks, dependencies flow inward, ports & adapters pattern.

**Status**: **PASS**

**Evidence**:
- Layout engine is pure Rust domain logic with no framework dependencies (no tokio, no warp, no actix)
- Core dependencies are serialization (serde) only, no I/O, no database, no HTTP
- WASM bindings act as adapter layer: `wasm-bindgen` exports translate between Rust and JavaScript
- Input port: `compute_layout(score: CompiledScore, config: LayoutConfig) -> GlobalLayout`
- Output: Pure data structures serializable to JSON
- Testable in isolation: No mocking required, pass `CompiledScore` fixtures directly

---

### III. Progressive Web Application Architecture ✅

**Requirement**: Tablet-optimized PWA, WASM deployment, offline-first, client-side processing.

**Status**: **PASS**

**Evidence**:
- Deployment: Rust layout engine compiled to WASM via wasm-pack, executed in-browser
- Offline-capable: Layout computation happens entirely client-side, no network requests
- Target platform: Tablet devices (iPad, Surface, Android) with modern browser support
- Performance: <100ms layout enables responsive PWA experience during score display
- Client-side processing: All layout logic (spacing, breaking, positioning) runs locally via WASM
- TypeScript contracts: Type-safe WASM bindings define contract between Rust and frontend

---

### IV. Precision & Fidelity ✅

**Requirement**: 960 PPQ resolution without precision loss, integer arithmetic for timing.

**Status**: **PASS**

**Evidence**:
- Layout operates on CompiledScore which maintains 960 PPQ precision
- System `tick_range` uses `u32` for exact `start_tick` and `end_tick` (no floating point)
- Spacing algorithm preserves timing: `spacing_width = base + (duration_ticks / quarter_ticks) * factor`
- Floating point used ONLY for spatial positions (x, y coordinates) after timing decisions made
- Source references link glyphs back to exact CompiledScore events preserving domain identity

---

### V. Test-First Development ✅

**Requirement**: Red-Green-Refactor, no code without tests, contract tests, domain tests in isolation.

**Status**: **PASS** (commitment to test-first)

**Evidence** (planning commitment):
- Unit tests for spacing algorithm (proportional spacing with duration-based separation)
- Unit tests for system breaking (measure boundary detection, width constraints)
- Unit tests for glyph positioning (pitch-to-y mapping, accidental collision avoidance)
- Integration tests with CompiledScore fixtures (50-measure piano, 200-measure orchestral)
- Determinism tests (byte-identical JSON output for repeated computations)
- Contract tests: TypeScript tests verify WASM bindings match expected interfaces
- All tests run via `cargo test` without infrastructure dependencies (pure domain testing)

---

**Constitution Check Summary**: All 5 principles satisfied. No violations, no complexity exceptions required. Layout engine aligns with project architecture as pure domain logic with WASM adapter layer.

## Project Structure

### Documentation (this feature)

```text
specs/016-rust-layout-engine/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── GlobalLayout.ts       # TypeScript interface for WASM output
│   ├── LayoutConfig.ts       # Configuration options for layout computation
│   └── SourceReference.ts    # Glyph-to-domain linking interface
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── layout/                    # NEW: Layout engine module
│   │   ├── mod.rs                # Public API: compute_layout(), LayoutConfig
│   │   ├── types.rs              # GlobalLayout, System, Staff, Glyph, BoundingBox, etc.
│   │   ├── spacer.rs             # Horizontal spacing algorithm (duration-proportional)
│   │   ├── breaker.rs            # System breaking algorithm (measure boundary detection)
│   │   ├── positioner.rs         # Glyph x,y computation (pitch-to-y, note columns)
│   │   ├── batcher.rs            # GlyphRun grouping (consecutive glyphs with same properties)
│   │   └── metrics.rs            # SMuFL font metrics (bounding boxes, baselines)
│   ├── domain/                   # EXISTING: CompiledScore domain model
│   └── ...                       # Other existing modules
├── tests/
│   ├── layout_test.rs            # NEW: Integration tests with CompiledScore fixtures
│   └── ...
└── Cargo.toml                    # Add wasm-bindgen dependency

frontend/
├── src/
│   ├── wasm/                     # NEW: WASM bindings and utilities
│   │   ├── layout.ts            # Typed wrapper for layout WASM exports
│   │   └── types.ts             # Re-export TypeScript interfaces from contracts/
│   └── ...                       # Existing frontend structure
└── package.json                  # Add wasm-pack build script

.github/
└── workflows/
    └── build-wasm.yml            # NEW: CI workflow to compile WASM module
```

**Structure Decision**: Web application (backend Rust + frontend React). Layout engine lives in `backend/src/layout/` as new domain module alongside existing `domain/` and other modules. WASM compilation creates bindings consumed by `frontend/src/wasm/`. TypeScript contracts in `specs/016-rust-layout-engine/contracts/` define interface between WASM and frontend, validated by tests on both sides.

---

**Plan Completed**: 2026-02-12 | **Next Step**: Run `/speckit.tasks` to generate tasks.md
