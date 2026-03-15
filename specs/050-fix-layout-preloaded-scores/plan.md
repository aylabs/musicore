# Implementation Plan: Fix Layout Preloaded Scores

**Branch**: `050-fix-layout-preloaded-scores` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/050-fix-layout-preloaded-scores/spec.md`

## Summary

Iterative musician-driven layout quality campaign across 6 preloaded scores. Work proceeds one score at a time in priority order. For each score: export Musescore 4.x reference screenshots → compare side-by-side with Graditone rendering → attribute each visual defect to the layout engine (Rust/WASM geometry) or the rendering layer (React/SVG style) → write a failing regression test, apply the fix, verify the test passes → re-compare until the musician approves — then advance to the next score.

Generic fixes (spacing constants, glyph sizing, staff proportions) are propagated immediately to all remaining scores and verified before advancing.

---

## Technical Context

**Language/Version**: Rust 1.x stable (layout engine, WASM); TypeScript 5.x / React 18 (renderer)
**Primary Dependencies**:
- Backend: `wasm-pack`, `wasm-bindgen`, `serde_json`, Bravura SMuFL metrics (`backend/assets/bravura_metadata.json`)
- Frontend: React 18, Vite, Bravura webfont, `LayoutRenderer.tsx` SVG renderer
**Storage**: Score files in `scores/*.mxl`; review artifacts in `specs/050-fix-layout-preloaded-scores/reviews/`; reference images in `specs/050-fix-layout-preloaded-scores/references/`
**Testing**: `cargo test` (Rust unit + integration), `vitest` (TypeScript unit), Playwright (E2E)
**Target Platform**: Tablet PWA (iPad, Surface, Android), Chrome 57+ / Safari 11+ / Edge 16+
**Project Type**: Web monorepo (`backend/` Rust + `frontend/` React)
**Performance Goals**: Layout rendering <100ms for typical scores (already met); visual quality matching Musescore at tablet reading distance
**Constraints**:
- **Constitution Principle VI**: All geometric positions, spacing, bounding boxes MUST come from `compute_layout()` in `backend/src/layout/mod.rs`. TypeScript renderer changes are restricted to visual properties (stroke-width, font-size on GlyphRuns, colours) — no coordinate recalculations.
- **Constitution Principle VII**: Every layout defect found during review MUST have a failing test created BEFORE the fix is applied.
- **Constitution Principle V**: Test-driven; no code change without a corresponding test.
**Scale/Scope**: 6 scores, 2 code layers, iterative review cycles. All changes on single branch; no new APIs, no schema changes.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|---|---|---|
| **I. Domain-Driven Design** | All layout entities (`StaffData`, `NoteEvent`, `VoiceData`, `BarLine`, `GlyphRun`) use music domain terminology throughout. | ✅ PASS |
| **II. Hexagonal Architecture** | `compute_layout()` has zero UI dependencies. WASM binding is the adapter layer. `LayoutRenderer` is the presentation adapter. | ✅ PASS |
| **III. PWA Architecture** | All layout computation runs client-side via WASM. No server requests for rendering. | ✅ PASS |
| **IV. Precision & Fidelity** | 960 PPQ maintained throughout. `tick_to_measure_index()` uses integer division. Timing unchanged by this feature. | ✅ PASS |
| **V. Test-First Development** | Every layout fix must be preceded by a failing test (enforced in review protocol). | ⚠️ REQUIRES DISCIPLINE — enforced per review cycle |
| **VI. Layout Engine Authority** | Staff line `stroke-width` in renderer is currently hardcoded to `'1'`. Acceptable because stroke-weight is a visual style property, not a geometric coordinate. Any future fix must not introduce coordinate calculations into the renderer. | ⚠️ MONITOR — renderer changes must stay in visual-style territory |
| **VII. Regression Prevention** | Each discovered defect adds ≥1 new test to `backend/tests/layout_test.rs` or frontend. The existing 6 tests + integration tests form the regression baseline. | ⚠️ REQUIRES DISCIPLINE — enforced per fix cycle |

**Gate Result**: PASS with monitoring conditions on Principles V, VI, and VII. No blockers.

---

## Project Structure

### Documentation (this feature)

```text
specs/050-fix-layout-preloaded-scores/
├── plan.md                         # This file (speckit.plan output)
├── spec.md                         # Feature specification
├── research.md                     # Phase 0 — technical findings
├── data-model.md                   # Phase 1 — review workflow entities
├── quickstart.md                   # Phase 1 — how to run a review cycle
├── contracts/
│   └── review-protocol.md          # Phase 1 — review cycle protocol
├── references/                     # Musescore PNG exports (one per score)
│   ├── Burgmuller_LaCandeur.png
│   ├── Burgmuller_Arabesque.png
│   ├── Pachelbel_CanonD.png
│   ├── Bach_InventionNo1.png
│   ├── Beethoven_FurElise.png
│   └── Chopin_NocturneOp9No2.png
├── reviews/                        # Per-score review cycle artifacts
│   ├── 01-Burgmuller_LaCandeur/
│   │   ├── cycle-01.md             # Issues, fixes, approval record
│   │   └── cycle-01-comparison.png # Side-by-side screenshot
│   ├── 02-Burgmuller_Arabesque/
│   ├── 03-Pachelbel_CanonD/
│   ├── 04-Bach_InventionNo1/
│   ├── 05-Beethoven_FurElise/
│   └── 06-Chopin_NocturneOp9No2/
└── tasks.md                        # Phase 2 output (speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/layout/
│   ├── mod.rs            # compute_layout() — main entry, system layout, staff positioning
│   ├── spacer.rs         # Horizontal spacing: base_spacing, duration_factor, minimum_spacing
│   ├── positioner.rs     # Pitch→Y coordinates, clef/key/time-sig glyph positioning
│   ├── stems.rs          # Stem geometry: STEM_LENGTH=35, NOTEHEAD_WIDTH=11.8
│   ├── beams.rs          # Beam grouping and beam geometry: BEAM_THICKNESS=10
│   ├── breaker.rs        # Measure→system line breaking (greedy)
│   ├── batcher.rs        # Glyph run batching (sets GlyphRun.font_size)
│   ├── metrics.rs        # Bravura SMuFL metrics from bravura_metadata.json
│   └── types.rs          # GlobalLayout → System → StaffGroup → Staff → GlyphRun → Glyph
└── tests/
    ├── layout_test.rs              # Unit tests: ≥2 module-level + many in mod tests blocks
    ├── layout_integration_test.rs  # Integration tests: 4+
    └── rest_layout.rs              # Rest rendering tests

frontend/
└── src/
    ├── components/
    │   └── LayoutRenderer.tsx      # Primary SVG renderer — renderStaff(), renderGlyphRun(), renderBarLine()
    ├── types/
    │   └── RenderConfig.ts         # { fontSize, fontFamily, backgroundColor, staffLineColor, glyphColor }
    └── utils/
        └── renderUtils.ts          # createDefaultConfig(): fontSize=20, fontFamily='Bravura'

scores/
├── Burgmuller_LaCandeur.mxl
├── Burgmuller_Arabesque.mxl
├── Pachelbel_CanonD.mxl
├── Bach_InventionNo1.mxl
├── Beethoven_FurElise.mxl
└── Chopin_NocturneOp9No2.mxl
```

---

## Phase 0: Research Findings

*Full details in [research.md](research.md). Summary of key findings:*

### Architecture

The rendering pipeline is two-tier: `compute_layout()` (Rust/WASM) produces `GlobalLayout` JSON with all geometric coordinates. `LayoutRenderer.tsx` (React/SVG) reads this JSON and emits SVG — it must not calculate positions.

### Layout Engine Constants

| Constant | Value | Unit | Standard | Status |
|---|---|---|---|---|
| `units_per_space` | 20.0 | logical units | reference | ✅ baseline |
| `STEM_LENGTH` | 35.0 | 1.75 sp | 3.5 sp standard | ⚠️ short by 2× — investigate |
| `NOTEHEAD_WIDTH` | 11.8 | 0.59 sp | ~1.18 sp | ⚠️ consistent with fontSize=40 half-sizing |
| `base_spacing` | 40.0 | 2.0 sp | visual compare | 🔍 check vs Musescore |
| `duration_factor` | 40.0 | 2.0 sp | visual compare | 🔍 check vs Musescore |
| `minimum_spacing` | 40.0 | 2.0 sp | visual compare | 🔍 check vs Musescore |
| `BEAM_THICKNESS` | 10.0 | 0.5 sp | 0.5 sp | ✅ ok |
| `THIN_WIDTH` (barline) | 1.5 | 0.075 sp | ~0.12 sp | 🔍 thin — check vs Musescore |
| `intra_staff_multiplier` | 8.0 sp | between stave origins | ~7 sp (Musescore piano) | ⚠️ may be too loose |
| Structural glyph font-size | 80 | 1em = 4 sp | ✅ correct for SMuFL | ✅ ok |
| Note glyph font-size (fallback) | 40 | 0.5em = 2 sp | should be 80 | ⚠️ CRITICAL — check batcher.rs |

### Priority Investigation Items (first review cycle)

1. **Note glyph font_size** — does `batcher.rs` set `GlyphRun.font_size = 80` or let it default to 40 in the renderer? If 40, noteheads are half-sized.
2. **Horizontal spacing** — sqrt formula tuning vs Musescore visual proportions.
3. **Intra-staff vertical spacing** — 8.0 sp multiplier may produce over-spaced piano grand staves.
4. **Staff line stroke-weight** — hardcoded 1.0 in renderer; Musescore uses ~2.4 units (0.12 sp).
5. **Stem length** — STEM_LENGTH=35.0 = 1.75 sp. Standard is 3.5 sp. May also be affected by the font_size factor.

---

## Phase 1: Design & Contracts

*Review workflow entities defined in [data-model.md](data-model.md). Full protocol in [contracts/review-protocol.md](contracts/review-protocol.md). Onboarding in [quickstart.md](quickstart.md).*

### Design Summary

No new database schema, API endpoints, or runtime data structures are needed. The design is a documentation workflow:

- **Reference images** stored in `references/` (PNG from Musescore)
- **Review artifacts** stored in `reviews/0N-ScoreName/cycle-NN.md` + screenshots
- **Code fixes** in `backend/src/layout/` (geometry) or `frontend/src/components/LayoutRenderer.tsx` (style)
- **Regression tests** added to `backend/tests/layout_test.rs` per Constitution VII

### Constitution Check Post-Design

| Principle | Post-Design Verdict |
|---|---|
| **VI. Layout Engine Authority** | Staff line `stroke-width='1'` in renderer is a style-only property — permissible. Any fix to note glyph `font_size` must originate in `batcher.rs` (layout engine), not in the renderer's `run.font_size \|\| 40` fallback. Renderer-side `|| 40` must become `|| 80` ONLY after confirming the engine does not already set the value. If the engine already sets it to 40, the fix goes in `batcher.rs`. |
| **VII. Regression Prevention** | The `reviews/0N-ScoreName/cycle-NN.md` document for each score is the enforcement point. Every issue record must include a `test_ref` field linking to the added test. |

---

## Phase 2: Implementation Workflow

*The implementation is driven by the iterative review process, not by a fixed coding sequence.*

### Score Review Queue

| Priority | Score | Status |
|---|---|---|
| 1 | La Candeur (Burgmuller) | `pending` |
| 2 | Arabesque (Burgmuller) | `pending` |
| 3 | Canon in D (Pachelbel) | `pending` |
| 4 | Invention No. 1 (Bach) | `pending` |
| 5 | Für Elise (Beethoven) | `pending` |
| 6 | Nocturne Op. 9 No. 2 (Chopin) | `pending` |

### Per-Score Workflow (see [contracts/review-protocol.md](contracts/review-protocol.md))

```
For each score in queue:
  Phase A (once):
    A1 — Export Musescore reference PNG to references/<ScoreName>.png
    A2 — Capture Graditone baseline screenshot

  Phase B (repeat until approved):
    B1 — Side-by-side visual comparison
    B2 — Document LayoutIssues in reviews/0N-Name/cycle-NN.md
    B3 — For each issue:
          [ ] Write failing regression test  ← Constitution VII mandatory
          [ ] Confirm test fails
          [ ] Apply fix in correct layer (engine or renderer)
          [ ] Run cargo test + vitest — must all pass
          [ ] If generic: verify all 6 scores
    B4 — Capture post-fix Graditone screenshot
    B5 — Musician review → approval or next cycle

  Phase C:
    C1 — Commit all fix + test code
    C2 — Mark score approved in cycle-NN.md
    C3 — Advance queue
```

### Fix Layer Rules

| Fix type | File | Constraint |
|---|---|---|
| Note position (X/Y) | `backend/src/layout/positioner.rs` | Engine only |
| Horizontal spacing | `backend/src/layout/spacer.rs` | Engine only |
| Stem geometry | `backend/src/layout/stems.rs` | Engine only |
| Beam geometry | `backend/src/layout/beams.rs` | Engine only |
| System line breaking | `backend/src/layout/breaker.rs` | Engine only |
| Glyph font_size | `backend/src/layout/batcher.rs` | Engine only |
| Vertical staff spacing | `backend/src/layout/mod.rs` (multipliers) | Engine only |
| Staff line stroke-weight | `frontend/src/components/LayoutRenderer.tsx` | Renderer (style-only) |
| Background/line colour | `frontend/src/components/LayoutRenderer.tsx` | Renderer (style-only) |

### Known Risk Areas (from Phase 0)

1. **Notehead font_size (CRITICAL)**: `batcher.rs` likely outputs `font_size = 40` for note GlyphRuns. Correct value per SMuFL = 80 (1em = 4 staff spaces). Fix in `batcher.rs`. Add test asserting `glyph_run.font_size == 80` for notehead runs.

2. **Horizontal spacing**: sqrt spacing differs from Musescore optical spacing. Calibrate `base_spacing` / `duration_factor` to match Musescore proportions visually for La Candeur (simple quarter-note density = good calibration target). Each constant change requires a test update.

3. **Intra-staff spacing**: `intra_staff_multiplier = 8.0` may produce excessive gaps for piano scores. Musescore piano grand staff uses ~7 sp. Reduce if confirmed visually on La Candeur.

4. **Stem length**: `STEM_LENGTH = 35.0` = 1.75 sp. Standard notation uses 3.5 sp. However, if note glyphs are rendered at fontSize=40 (half-size), the stems appear proportionally correct at half scale. Analysing the notehead font_size will clarify whether stem length also needs correction.

5. **Für Elise (3/8)**: compound-meter beaming. Score uses MusicXML beam data, so the `build_beam_groups_from_musicxml()` path will be used. Verify beaming is correct across all 3/8 measure groups.

6. **Chopin Nocturne (12/8)**: most complex score. Complex rhythms, ornaments, accidentals. Defer to last; earlier score fixes should propagate improvements.

---

## Completion Criteria

This plan is complete when:

1. All 6 scores have `approval_status = approved` in their `cycle-NN.md` review documents.
2. All layout fixes have corresponding regression tests in `backend/tests/layout_test.rs` or frontend test files.
3. `cargo test` and `vitest` pass without errors on the branch.
4. No previously-approved score has regressed (verified against reference images after each generic fix).
5. Any known limitations are documented in `spec.md#Known Issues & Regression Tests`.

