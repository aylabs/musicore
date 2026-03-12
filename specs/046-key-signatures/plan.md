# Implementation Plan: Key Signatures

**Branch**: `046-key-signatures` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/046-key-signatures/spec.md`

## Summary

Enable correct visual display of key signature accidentals (sharps and flats) for all 15 standard key signatures on staves using any of the four supported clef types (treble, bass, alto, tenor). The Rust layout engine already computes key signature glyph positions and the frontend renderer already displays `structural_glyphs` — but two bugs block correct rendering: (1) `position_key_signature()` ignores the clef type and always uses treble positions, and (2) the frontend key signature extraction in `LayoutView.tsx` uses a string map on what may be a numeric backend value.

Primary work: fix `position_key_signature()` in the Rust layout engine to dispatch on clef type, and fix the frontend key signature extraction. Scope is rendering only — no backend domain changes, no note accidental suppression, no mid-piece key changes.

## Technical Context

**Language/Version**: Rust 1.82+ (layout engine), TypeScript 5.9 (frontend), wasm-pack (WASM bridge)
**Primary Dependencies**: React, Bravura music font (SMuFL), Vite; backend: serde, wasm-bindgen
**Storage**: N/A — display-only feature; key signature data already stored in domain model
**Testing**: cargo test (Rust unit tests), Vitest + React Testing Library (frontend), playwright (e2e)
**Target Platform**: Tablet devices (iPad, Surface, Android tablets) via PWA — Chrome 57+, Safari 11+
**Project Type**: Web application — primarily backend Rust layout engine (80%), frontend fixes (20%)
**Performance Goals**: Key signature glyph positions computed inside `compute_layout()` — already within the 60fps rendering budget; no additional computation introduced
**Constraints**: Must use SMuFL-compliant Bravura font glyphs, maintain 960 PPQ precision (no timing impact), must NOT perform any spatial calculations in frontend TypeScript (Principle VI)
**Scale/Scope**: 15 key signatures × 4 clef types = 60 combinations; all must be tested and correct

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅
- **Ubiquitous Language**: Uses music domain terminology throughout: key signature, accidental, staff, clef, sharp, flat, fifths, staff position, structural glyph
- **Entity Modeling**: `KeySignature(i8)` and `KeySignatureEvent` are first-class domain entities; accidental positions are a rendering concern, appropriately separate from domain
- **Bounded Context**: Domain layer (Rust) stores and queries key signatures; layout layer computes positions; renderer displays glyphs — clear separation
- **Assessment**: PASS — no domain logic in presentation layer; terminology is consistent

### II. Hexagonal Architecture ✅
- **Core Domain**: `KeySignature`, `KeySignatureEvent`, `Staff.get_key_signature_at()` — no changes needed
- **Ports**: Existing `compute_layout()` port accepts key signature data and produces `structural_glyphs`; no new ports needed
- **Adapters**: `LayoutView.tsx` acts as the adapter mapping domain `Score` → layout input JSON; small fix needed for key sig extraction
- **Dependency Rule**: Frontend depends on layout output contract; domain is framework-agnostic; no violations
- **Assessment**: PASS — all changes are within the layout engine (adapter) and its data extraction (adapter bridge)

### III. Progressive Web Application Architecture ✅
- **Client-Side Processing**: All key signature position calculations happen in Rust/WASM `compute_layout()` — no server round-trips needed
- **Offline-First**: No network dependency; key sig data is already in the in-memory score model
- **WASM Deployment**: Changes to the Rust layout engine require WASM recompilation — standard project workflow
- **Assessment**: PASS — no architecture changes; stays within existing WASM computing model

### IV. Precision & Fidelity ✅
- **960 PPQ Preservation**: Key signature rendering is purely visual — no timing calculations affected
- **Music Accuracy**: Accidental positions must exactly match standard music engraving conventions for each clef (verified via tests against known-correct positions)
- **Assessment**: PASS — no timing impact; fidelity maintained through exact position tables per clef type

### V. Test-First Development ✅
- **Test Strategy**: Write Rust unit tests for `position_key_signature()` with each clef type BEFORE implementation. Write frontend integration tests for `LayoutView` key sig extraction BEFORE the fix.
- **Domain-Level Tests**: `position_key_signature()` takes primitive inputs → pure function → directly unit-testable
- **Integration Tests**: `LayoutView` test verifying a non-C-major score renders key sig glyphs in `structural_glyphs`
- **Coverage**: 15 key signatures × 4 clef types for core Rust function; representative cases for frontend
- **Assessment**: PASS — highly testable pure functions; clear test-first path

### VI. Layout Engine Authority ✅
- **Single Authority**: All key signature position calculations MUST remain in `position_key_signature()` inside the Rust layout engine — NO position calculations in frontend TypeScript
- **Renderer Role**: `LayoutRenderer.tsx` already renders `structural_glyphs` without spatial calculations — no changes needed here
- **EXPLICIT CHECK**: `NotationLayoutEngine.ts` (the old prohibited TypeScript layout engine) currently returns `keySignatureAccidentals: []`. This feature MUST NOT populate that array — it is the wrong path. The correct path is Rust `compute_layout()` → `structural_glyphs`
- **Assessment**: PASS — all position logic stays in Rust; renderer is passive

### VII. Regression Prevention ✅
- Every bug found during implementation must have a test BEFORE the fix
- The pre-existing bug (clef-type ignored, always treble positions) will be documented with a failing test before fixing
- The pre-existing frontend extraction bug will similarly have a failing test before fixing
- **Assessment**: PASS — test-first approach covers regression prevention

**GATE STATUS**: ✅ PASS — All 7 principles satisfied. No violations or justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/046-key-signatures/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── key-signature-layout.md   # position_key_signature() contract per clef
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── layout/
│       ├── positioner.rs         # ENHANCE: position_key_signature() — add bass/alto/tenor clef positions
│       └── mod.rs                # No changes needed; already calls position_key_signature correctly
└── tests/                        # Existing test suite; new tests added inside positioner.rs module

frontend/
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── LayoutView.tsx    # FIX: key signature extraction (string vs. number bug)
│   └── types/
│       └── score.ts              # FIX: KeySignature type — update to match backend serialization format
└── tests/ or frontend/src/components/layout/
    └── LayoutView.test.tsx       # ADD: non-C-major key signature integration tests
```

**Structure Decision**: Web application. Rust backend layout engine change is the primary work (80%). Frontend type fix and extraction fix are secondary (20%). No new files are needed — existing files are enhanced. No new WASM exports needed — `compute_layout()` already handles the full pipeline.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*(No violations — section not applicable)*
