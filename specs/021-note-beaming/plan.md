# Implementation Plan: Note Beaming

**Branch**: `021-note-beaming` | **Date**: 2026-02-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/021-note-beaming/spec.md`

## Summary

Implement note beaming — connecting eighth notes and shorter with thick beam lines instead of individual flags. The system already has disabled beam/stem infrastructure in the Rust layout engine (`beams.rs`, `stems.rs`, commented-out integration in `mod.rs`). The implementation requires: (1) parsing `<beam>` elements from MusicXML, (2) threading beam group information through the layout pipeline, (3) re-enabling and extending the existing stem/beam code to support multi-level beams and partial beams, (4) switching beamed notes from combined head+stem+flag glyphs (U+E1D7 etc.) to bare notehead glyphs (U+E0A4) with separately drawn stems and beams. The frontend renderer already handles stem (`U+0000` → `<line>`) and beam (`U+0001` → `<rect>`) codepoints, though sloped beams may need `<polygon>` rendering.

## Technical Context

**Language/Version**: Rust (latest stable) for backend/layout engine; TypeScript + React 18 for frontend  
**Primary Dependencies**: `quick-xml` (MusicXML parsing), `wasm-bindgen`/`wasm-pack` (WASM bridge), `serde`/`serde_json` (serialization), Bravura SMuFL font (glyph rendering)  
**Storage**: N/A (in-memory layout computation; scores loaded from MusicXML files)  
**Testing**: `cargo test` (Rust unit/integration); `vitest` (frontend unit); Playwright (e2e)  
**Target Platform**: Tablet devices (iPad/Surface/Android) via PWA with WASM  
**Project Type**: Web application (monorepo: `backend/` Rust + `frontend/` React)  
**Performance Goals**: 60fps scrolling target (30fps minimum); layout computation ≤50% overhead vs current combined-glyph approach; per-frame render ≤33ms  
**Constraints**: Offline-first; ≤200ms initial score render; viewport-based virtualization for large scores; WASM bundle <500KB gzipped  
**Scale/Scope**: Scores with 10+ staves, 100+ measures, 10,000+ events; up to 5 beam levels (128th notes)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Domain-Driven Design | ✅ PASS | Beam groups, stems, beam hooks are music domain entities modeled with ubiquitous language (beam, stem direction, beam level). `BeamableNote`, `Beam`, `StemDirection` use domain terminology. |
| II. Hexagonal Architecture | ✅ PASS | All beam computation occurs in the backend layout engine (core domain). Frontend renderer is a pure adapter that displays geometry without spatial decisions. MusicXML parser is an inbound adapter. |
| III. PWA Architecture | ✅ PASS | All beam computation runs in WASM via the existing layout engine. No server calls required. Offline capability preserved. |
| IV. Precision & Fidelity | ✅ PASS | Beam grouping uses integer tick positions (960 PPQ). Beat boundaries at exact tick multiples (960 for quarter, 480 for eighth). No floating-point timing. |
| V. Test-First Development | ✅ PASS | Existing beam tests (T043, T044) and stem tests (T041, T042) provide foundation. New tests required for: MusicXML beam parsing, multi-level beams, beam hooks, integration tests with full layout pipeline. |
| VI. Layout Engine Authority | ✅ PASS | Beam positions, slopes, stem endpoints all computed in backend Rust layout engine. Frontend renderer only draws geometry — no spatial calculations for beams. |
| VII. Regression Prevention | ✅ PASS | All existing tests (T041-T044, etc.) must continue passing. Any bugs found during implementation get regression tests per this principle. |

**Gate result**: All 7 principles PASS. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/021-note-beaming/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── beam-layout.md   # Beam-related layout contract additions
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/
│   │   └── importers/
│   │       └── musicxml/
│   │           ├── parser.rs        # MODIFY: Add <beam> element parsing
│   │           └── types.rs         # MODIFY: Add BeamData to NoteData
│   └── layout/
│       ├── mod.rs                   # MODIFY: Re-enable stem/beam pipeline, thread beam info
│       ├── beams.rs                 # MODIFY: Add multi-level beams, beam hooks
│       ├── stems.rs                 # EXISTING: Stem direction + creation (already complete)
│       ├── positioner.rs            # MODIFY: Switch beamed notes to bare noteheads
│       ├── batcher.rs               # EXISTING: Already separates by codepoint (no changes)
│       ├── metrics.rs               # EXISTING: Glyph bounding boxes (no changes)
│       └── types.rs                 # MODIFY: Add beam-related fields to Glyph if needed
└── tests/
    ├── layout_test.rs               # MODIFY: Add beam integration tests
    └── musicxml_import_test.rs      # MODIFY: Add beam parsing tests

frontend/
├── src/
│   ├── components/
│   │   └── LayoutRenderer.tsx       # MODIFY: Upgrade beam rendering from <rect> to <polygon> for slopes
│   └── types/
│       └── notation/
│           └── config.ts            # EXISTING: Already has NOTEHEAD_BLACK (U+E0A4)
└── tests/                           # ADD: Beam rendering unit tests
```

**Structure Decision**: Existing monorepo structure (backend Rust + frontend React). Changes span both projects. Backend is the primary target — all beam logic lives in the layout engine. Frontend changes are minimal (slope rendering upgrade).

## Constitution Check — Post-Design Re-evaluation

*Re-checked after Phase 1 design artifacts (data-model.md, contracts/, quickstart.md).*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Domain-Driven Design | ✅ PASS | Data model uses ubiquitous language: `BeamGroup`, `BeamType::Begin/Continue/End`, `BeamHook`, `StemDirection`. Entity relationships follow domain concepts (beam groups contain beamable notes, produce beam lines). No technical leakage in entity naming. |
| II. Hexagonal Architecture | ✅ PASS | Contract confirms: all spatial computation (beam positioning, slope, stem endpoints) remains in backend Rust layout engine. Frontend is a pure rendering adapter: `<polygon>` draws geometry from `Glyph` data without spatial decisions. MusicXML `<beam>` parsing is an inbound adapter. TypeScript interfaces unchanged. |
| III. PWA Architecture | ✅ PASS | No new network requirements. All beam computation runs locally in WASM. Contract uses existing `GlobalLayout` JSON format — no API changes. WASM bundle size increase is negligible (beam/stem code is ~600 lines of Rust, compiled to ~few KB of WASM). |
| IV. Precision & Fidelity | ✅ PASS | Data model enforces integer ticks for grouping (960 PPQ). `BeamableNote.tick` is `u32`. Beat boundaries computed with integer arithmetic. Beam slope and positions use f32 (appropriate for spatial geometry — not timing). |
| V. Test-First Development | ✅ PASS | Quickstart defines clear test sequence: MusicXML beam parsing tests → stem tests (existing T041-T042) → beam tests (existing T043-T044 + new multi-level) → integration tests → performance benchmarks. Each phase has testable deliverables. |
| VI. Layout Engine Authority | ✅ PASS | Contract explicitly states: frontend receives beam geometry as `Glyph` objects with pre-computed positions. Renderer draws `<polygon>` from provided coordinates — no spatial calculation in frontend. Beam slope, attachment points, and offsets are all backend-computed. |
| VII. Regression Prevention | ✅ PASS | Quickstart includes regression check commands (`cargo test -p musicore_backend layout`). Existing T041-T044 tests serve as regression guards for stem/beam infrastructure. Any implementation bugs will produce regression tests per this principle. |

**Post-design gate result**: All 7 principles PASS. Design is constitution-compliant. No new violations introduced by Phase 1 artifacts.
