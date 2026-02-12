# Implementation Plan: Layout-Driven Renderer

**Branch**: `017-layout-renderer` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-layout-renderer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a new Canvas-based renderer that displays instrument voices using exact glyph positions computed by the Rust Layout Engine (Feature 016). The renderer accepts GlobalLayout as input and renders glyphs, staff lines, and brackets without performing any layout calculations. Includes visual comparison test harness to validate parity with existing TypeScript renderer (<5% pixel difference tolerance). Leverages layout engine's system virtualization for 60fps scrolling performance with long scores.

## Technical Context

**Language/Version**: TypeScript 5.0+, React 19  
**Primary Dependencies**: Canvas 2D API (browser native), Feature 016 WASM bindings (musicore_backend), layoutUtils.ts (47 unit tests)  
**Storage**: N/A (stateless rendering, layout cached in IndexedDB by parent component)  
**Testing**: Vitest (unit tests), Playwright (visual comparison screenshots), Chrome DevTools Performance (60fps validation)  
**Target Platform**: Tablet devices (iPad/Surface/Android) via PWA, Chrome 57+, Safari 11+, modern browser Canvas 2D support  
**Project Type**: Web (React frontend addition, no backend changes)  
**Performance Goals**: 60fps scrolling (≤16ms frame time), <1ms visible system query, <10 draw calls per system via GlyphRun batching  
**Constraints**: ±2 pixel positioning tolerance after logical→pixel conversion, <5% visual difference vs current renderer, offline-capable (no network dependencies)  
**Scale/Scope**: 100-measure scores (40 systems), 2000+ glyphs, side-by-side comparison test harness

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅

**Requirement**: Music entities modeled using ubiquitous language, clear bounded contexts, aggregates.

**Status**: **PASS**

**Evidence**:
- Renderer operates on layout domain entities: GlobalLayout, System, StaffGroup, Staff, GlyphRun, Glyph
- Clear bounded context: Rendering is separate from layout computation (Feature 016) and domain model (CompiledScore)
- Uses music terminology: "staff lines", "glyphs", "noteheads", "brace/bracket", "system", "staff space"
- No technical leakage: Speaks in terms of logical units, SMuFL codepoints, staff positions (not pixels, canvas coordinates until conversion)

---

### II. Hexagonal Architecture ✅

**Requirement**: Core domain independent of frameworks, dependencies flow inward, ports & adapters pattern.

**Status**: **PASS**

**Evidence**:
- Renderer is an adapter layer: Converts layout domain (GlobalLayout) into visual representation (Canvas calls)
- No domain logic in renderer: All positions, spacing, breaking computed by layout engine (Feature 016 core domain)
- Testable in isolation: Accepts GlobalLayout directly, produces canvas output, no framework coupling
- Dependencies flow inward: Renderer depends on layout domain types, not vice versa
- Port pattern: RenderConfig interface defines rendering behavior without implementation details

---

### III. Progressive Web Application Architecture ✅

**Requirement**: PWA targeting tablets, WASM deployment, offline-first, client-side processing.

**Status**: **PASS**

**Evidence**:
- Target platform: Tablet devices (iPad, Surface, Android) with Canvas 2D support
- WASM integration: Uses Feature 016's WASM-compiled layout engine via computeLayout()
- Offline-capable: All rendering operations work without network (Canvas API is browser-native, layout precomputed locally)
- Client-side processing: Rendering happens entirely in browser via Canvas 2D API
- Tablet-optimized: Touch-friendly viewport scrolling, 60fps performance requirement

---

### IV. Precision & Fidelity ✅

**Requirement**: 960 PPQ resolution without precision loss, integer arithmetic for timing.

**Status**: **PASS**

**Evidence**:
- Renderer respects layout engine's 960 PPQ precision: Uses TickRange from GlobalLayout without modification
- No timing calculations in renderer: All tick-based logic delegated to layout engine (already validated in Feature 016)
- Floating point only for spatial positions: x, y coordinates in logical units (acceptable per Feature 016 design)
- Coordinate conversion maintains precision: logical→pixel conversion uses formula with minimal rounding (±2 pixel tolerance acceptable for visual display)

---

### V. Test-First Development ✅

**Requirement**: Red-Green-Refactor, no code without tests, contract tests, domain tests in isolation.

**Status**: **PASS** (commitment to test-first)

**Evidence** (planning commitment):
- Unit tests for LayoutRenderer class (single-voice rendering, multi-staff rendering, coordinate conversion)
- Integration tests with real GlobalLayout fixtures (10-measure, 8-measure piano)
- Visual comparison tests using Playwright (screenshot capture, pixel diff validation)
- Performance tests with Chrome DevTools (60fps validation, frame time measurement)
- Contract tests: TypeScript interfaces validate renderer adheres to GlobalLayout structure
- All tests written before implementation (TDD workflow required per spec)

---

**Constitution Check Summary**: All 5 principles satisfied. No violations, no complexity exceptions required. Renderer is a pure adapter layer that transforms layout domain into visual output using browser Canvas API.

## Project Structure

### Documentation (this feature)

```text
specs/017-layout-renderer/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technical decisions (completed)
├── data-model.md        # Phase 1: Entity definitions (completed)
├── quickstart.md        # Phase 1: Developer guide (completed)
├── contracts/           # Phase 1: TypeScript interfaces (completed)
│   ├── LayoutRenderer.ts       # Core renderer interface
│   ├── RenderConfig.ts         # Configuration interface
│   ├── VisualComparison.ts     # Testing interface
│   └── Viewport.ts             # Viewport definition
└── tasks.md             # Phase 2: Task breakdown (NOT yet created, run /speckit.tasks)
```

### Source Code (repository root)

**Structure Decision**: Feature 017 is frontend-only (Web application - Option 2). No backend changes required since layout computation is already provided by Feature 016 WASM bindings.

```text
frontend/
├── src/
│   ├── components/
│   │   └── LayoutRenderer.tsx          # NEW: Core renderer component
│   ├── types/
│   │   ├── LayoutRenderer.ts           # NEW: From contracts/
│   │   ├── RenderConfig.ts             # NEW: From contracts/
│   │   ├── VisualComparison.ts         # NEW: From contracts/
│   │   └── Viewport.ts                 # NEW: From contracts/
│   ├── utils/
│   │   ├── layoutUtils.ts              # EXISTING: From Feature 016 (47 tests)
│   │   └── renderUtils.ts              # NEW: Coordinate conversion, viewport helpers
│   └── pages/
│       └── ScoreViewer.tsx             # MODIFIED: Integrate LayoutRenderer
└── tests/
    ├── unit/
    │   ├── LayoutRenderer.test.ts      # NEW: 15 unit tests (coordinate conversion, config validation)
    │   └── renderUtils.test.ts         # NEW: 8 utility tests
    ├── integration/
    │   └── VisualComparison.test.ts    # NEW: 10 visual comparison tests (pixel diff)
    └── performance/
        └── ScrollPerformance.test.ts   # NEW: 4 performance tests (60fps validation)

backend/
└── [No changes - Feature 017 uses existing Feature 016 layout engine]
```

**Key Files**:

1. **frontend/src/components/LayoutRenderer.tsx** (NEW, ~350 lines)
   - Main renderer class
   - Methods: render(), renderSystem(), renderStaffGroup(), renderStaff(), renderGlyphRun(), logicalToPixels()
   - Uses Canvas 2D API, Feature 016 GlobalLayout

2. **frontend/src/types/** (NEW, 4 files)
   - TypeScript interfaces copied from contracts/ directory
   - Exported for use in ScoreViewer component

3. **frontend/src/utils/renderUtils.ts** (NEW, ~150 lines)
   - Coordinate conversion helpers
   - Viewport utilities (createViewportFromCanvas, intersectsViewport, getVisibleSystems)
   - Config factories (createDefaultConfig, createDarkModeConfig)

4. **frontend/src/pages/ScoreViewer.tsx** (MODIFIED, +50 lines)
   - Integrate LayoutRenderer component
   - Add scroll event handling
   - Replace existing renderer with new Canvas renderer

5. **frontend/tests/** (NEW, 37 tests)
   - Unit tests: LayoutRenderer class, renderUtils functions
   - Integration tests: Visual comparison with existing renderer
   - Performance tests: 60fps scrolling, system query <1ms

---

**File Count Summary**:
- NEW: 11 files (1 component, 4 types, 2 utils, 4 test files)
- MODIFIED: 1 file (ScoreViewer.tsx)
- UNCHANGED: Feature 016 files (backend layout engine, layoutUtils.ts)

---

**Dependencies**:
- Existing: Feature 016 WASM bindings (backend/src/layout/, frontend/src/wasm/)
- Existing: layoutUtils.ts (47 tests from Feature 016)
- New: No external packages needed (Canvas 2D is browser native)

## Complexity Tracking

> **No complexity exceptions needed** - Constitution Check passed all 5 principles without violations.

**Empty**: No violations to justify.

---

## Plan Complete

**Status**: ✅ All sections filled

**Phase 0 (Research)**: ✅ research.md generated (7 technical decisions documented)  
**Phase 1 (Design)**: ✅ data-model.md, contracts/, quickstart.md generated  
**Agent Context**: ✅ Updated with TypeScript 5.0+, Canvas 2D API, Feature 016 dependencies

**Next Command**: `/speckit.tasks` to generate task breakdown (tasks.md)
