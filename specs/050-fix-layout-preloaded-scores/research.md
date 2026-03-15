# Research: Fix Layout Preloaded Scores

**Feature Branch**: `050-fix-layout-preloaded-scores`
**Phase**: 0 — Technical Investigation
**Date**: 2026-03-15

---

## Architecture Overview

The rendering pipeline is two-tier:

1. **Layout Engine** (`backend/src/layout/`, compiled to WASM): sole authority over all geometric coordinates. Entry point: `compute_layout(score, config) → GlobalLayout`. Produces a tree of `GlobalLayout → System[] → StaffGroup[] → Staff[] → GlyphRun[]|StructuralGlyph[]|StaffLine[]|BarLine[]|LedgerLine[]`.
2. **Renderer** (`frontend/src/components/LayoutRenderer.tsx`): reads the `GlobalLayout` JSON, emits SVG DOM. Must NOT recalculate positions (Constitution Principle VI).

All 6 preloaded scores are `.mxl` files parsed by the Rust backend. The parsed `CompiledScore` JSON is passed to `compute_layout()` from the React frontend via the WASM binding at `frontend/src/services/wasm/layoutService.ts`.

---

## Decision Log

### D-001: Fix Layer Priority

**Decision**: Investigate geometry (layout engine) before visual style (renderer).

**Rationale**: A renderer fix applied on top of incorrect geometry is fragile — the correction is undone the moment the geometry changes. Establishing correct engine constants first ensures the visual layer only needs style decisions.

**Alternatives considered**: Fix renderer first (faster prototype) — rejected because it masks the root cause.

---

### D-002: Reference Image Format

**Decision**: PNG screenshots exported from Musescore 4.x, captured at 150–200 DPI, stored in `specs/050-fix-layout-preloaded-scores/references/`. One image per score showing the full score; additional region crops for dense passages.

**Rationale**: Spec clarification Q1 confirmed PNG/PDF stored in repo. PNG is pixel-comparable without lossy compression artifacts during comparison.

**Alternatives considered**: PDF vector export — acceptable but harder to annotate; PNG chosen for simpler side-by-side screenshot workflow.

---

### D-003: Spacing Formula

**Decision**: The sqrt spacing formula in `spacer.rs` (`compute_note_spacing`) is the primary horizontal spacing mechanism. It produces proportional but non-optical spacing. Musescore uses optical (near-logarithmic) spacing. Adjusting `base_spacing` and `duration_factor` constants can tune the proportions without changing the formula.

**Rationale**: Changing the formula would break all existing layout tests. Constant tuning is forward-compatible. Visual comparison for Burgmuller LaCandeur (first score, primarily quarter-note density) will calibrate these values.

**Constants to tune** (baseline):
- `base_spacing = 40.0` (2 staff spaces)
- `duration_factor = 40.0` (2 staff spaces)
- `minimum_spacing = 40.0` (2 staff spaces)

---

### D-004: Glyph Font Size for Noteheads

**Decision**: Investigate `batcher.rs` to determine whether `GlyphRun.font_size` is explicitly set for note glyphs. The renderer fallback `run.font_size || 40` may indicate the engine does not set the value, resulting in undersized noteheads.

**Rationale**: In Bravura SMuFL, the em square = 4 staff spaces. With `units_per_space = 20`, correct rendering requires `font-size = 80`. At `font-size = 40` (2 staff spaces = 0.5em), noteheads are half the expected size.

**Evidence**: `NOTEHEAD_WIDTH = 11.8` in `stems.rs` = 0.59 staff spaces. SMuFL spec notehead width ≈ 1.18 staff spaces = 23.6 units at `units_per_space=20`. The current constant is exactly 50% of standard, consistent with a font-size=40 rendering.

**Status**: ✅ RESOLVED — `batcher.rs` `extract_glyph_properties()` (line ~90) explicitly sets `font_size: 80.0` for all note GlyphRuns. The renderer fallback `run.font_size || 40` is never reached. Noteheads render at the correct SMuFL size (1em = 4 staff spaces). No code fix required.

---

### D-005: Staff Line Stroke-Width

**Decision**: Staff lines are rendered with hardcoded `stroke-width='1'` in `LayoutRenderer.tsx`. Ledger lines use `stroke-width='1.5'`. The layout engine's `StaffLine` struct does not export a `stroke_width` field to the renderer.

**Assessment**: Standard engraving staff lines are ~0.10–0.13 staff spaces or ~2–2.6 units at `units_per_space=20`. The current value of 1 (0.05 staff spaces) may produce staff lines that are too thin on high-DPI displays. Musescore typically uses ~0.12 staff spaces.

**Principle VI compliance**: Because stroke-weight is a visual style property (not a geometric coordinate), hardcoding it in the renderer is permissible. However, adding `stroke_width` to the layout engine would be cleaner. Defer to visual comparison: if 1.0 looks acceptable vs Musescore, no change needed.

---

### D-006: Barline Stroke-Width

**Decision**: Barlines use `segment.stroke_width` from the layout engine — `THIN_WIDTH = 1.5`, `THICK_WIDTH = 4.0`. The renderer reads these values verbatim (correct Principle VI compliance). No change expected here.

**Note**: Earlier code analysis found a potential discrepancy where `renderBarLine` was believed to hardcode `stroke-width='2'`. Current source inspection confirms it uses `segment.stroke_width.toString()`. No issue.

---

### D-007: Beam Geometry

**Decision**: Beam thickness = 10.0 units (0.5 staff spaces). Beam slope clamped to ±0.5 staff spaces per note. These values match professional engraving conventions and Musescore defaults.

**Possible issue**: Beam gap (`INTER_BEAM_GAP = 5.0` = 0.25 staff spaces) between secondary beams. Musescore default is approximately 0.25 staff spaces. No change expected.

---

### D-008: Clef and Time Signature Sizing

**Decision**: Structural glyphs (clef, time sig, key sig) use `font_size = glyph.font_size ?? 80`. At 80 (= 1em = 4 staff spaces), these glyphs are correctly sized per SMuFL convention.

**Rationale**: Clef glyphs in Bravura are designed at 1em → match staff height exactly. No change expected unless visual comparison reveals scaling issues.

---

### D-009: Intra-Staff and Inter-Staff Vertical Spacing

**Decision**: 
- Staves within same instrument: `intra_staff_multiplier = 8.0` staff spaces between origins
- Staves from different instruments: additional `inter_instrument_multiplier = 5.0` staff spaces

**Assessment**: The effective gap between stave centrelines = 8.0 staff spaces = 160 units at `units_per_space=20`. Musescore default for piano grand staff is approximately 7 staff spaces between treble/bass staff origins. **This is a potential spacing excess.** Visual comparison with LaCandeur (piano, 2 staves) will determine if the vertical spacing is too large.

---

## Identified Risk Areas (Priority Order)

| # | Area | Confidence | Layer |
|---|---|---|---|
| 1 | Notehead font_size (40 vs 80) | ✅ RESOLVED — `batcher.rs` sets `font_size: 80.0` | Layout Engine |
| 2 | ~~STEM_LENGTH (35 vs 70 units)~~ | ✅ RESOLVED — fixed to 70.0 in T021 | Layout Engine |
| 3 | Horizontal spacing constants (base_spacing, duration_factor) | Medium — formula differs from Musescore | Layout Engine |
| 4 | Inter-staff vertical spacing (8.0 sp) | Low-Medium — may be too loose for some scores | Layout Engine |
| 5 | Staff line stroke-width (1.0 → 1.5) | ✅ RESOLVED — fixed in T023 | Renderer |
| 6 | Beaming (algorithmic vs MusicXML grouping) | Low — MusicXML path used when data exists | Layout Engine |
| 7 | Accidental collision avoidance | Low — needs dense passage check (Chopin) | Layout Engine |

---

## Measurements: Constants vs Standards (T016–T019)

### M-001: STEM_LENGTH

| Constant | Location | Current | Standard | Status |
|----------|----------|---------|----------|--------|
| `Stem::STEM_LENGTH` | `backend/src/layout/stems.rs` | `35.0` units (1.75 sp at ups=20) | `70.0` units (3.5 sp at ups=20) | ⚠️ DEFECT — fixed in T021 |

**Analysis**: The module comment reads "Stems extend 35 logical units (3.5 staff spaces)" which is internally inconsistent. At `units_per_space=20`, 3.5 sp = 70 units, not 35. The comment reflects the intended value; the constant itself is wrong. Standard engraving (Gould §3, Musescore default) requires stems of 3.5 staff spaces on unbeamed notes.

**Related constants**:
- `MIN_BEAMED_STEM_LENGTH = 50.0` (2.5 sp) — acceptable minimum; not changed in this spec
- `MIN_LEDGER_STEM_LENGTH = 60.0` (3.0 sp) — acceptable minimum; not changed in this spec

---

### M-002: NOTEHEAD_WIDTH

| Constant | Location | Current | Expected | Status |
|----------|----------|---------|----------|--------|
| `Stem::NOTEHEAD_WIDTH` | `backend/src/layout/stems.rs` | `11.8` units | `11.8` units (= 23.6 / 2) | ✅ CORRECT |

**Analysis**: `NOTEHEAD_WIDTH` is the **half-width** used for stem attachment with `text-anchor="middle"` rendering. The module comment explains: Bravura `bBoxNE[0] = 1.18 sp`, full width = 23.6 units, half-width = 11.8 for center-edge offset. This is correct and does NOT need a fix.

---

### M-003: intra_staff_multiplier

| Constant | Location | Current | Musescore Default | Status |
|----------|----------|---------|----------|--------|
| `intra_staff_multiplier` | `backend/src/layout/mod.rs:240` | `8.0` sp | ~7 sp (piano grand staff) | ⚠️ SLIGHT EXCESS — defer to visual review |

**Analysis**: Grand staff (piano treble + bass) uses `8.0 × ups` = 160 units between staff origins. Musescore default is approximately 7 staff spaces (140 units). The extra 20 units (~1 staff space) may produce visually loose grand staves. Defer to Phase 3 visual comparison with La Candeur reference.

---

### M-004: Staff Line Stroke-Width

| Attribute | Location | Current | Standard (~0.12 sp) | Status |
|-----------|----------|---------|----------|--------|
| Staff lines `stroke-width` | `LayoutRenderer.tsx:952` | `'1'` (0.05 sp) | `~2.4` units (0.12 sp) | ⚠️ DEFECT — fixed in T023 to `'1.5'` |
| Ledger lines `stroke-width` | `LayoutRenderer.tsx:973` | `'1.5'` (0.075 sp) | `~2.4` units (0.12 sp) | ⚠️ Proportional — fixed in T024 to `'2.0'` |

**Analysis**: Staff lines at `stroke-width='1'` are 0.05 sp — approximately half the Musescore standard of ~0.12 sp. On tablet screens this produces hairline staff lines that may be hard to read. T023 fixes to `'1.5'` (0.075 sp, a pragmatic improvement). T024 adjusts ledger lines to `'2.0'` to maintain the slight ledger-heavier-than-staff-line visual hierarchy.

---

## Existing Test Baseline

| File | Lines | `#[test]` (module-level) |
|---|---|---|
| `backend/tests/layout_test.rs` | 2017 | 2 (more inside `mod tests` blocks) |
| `backend/tests/layout_integration_test.rs` | 366 | 4 |
| `backend/tests/rest_layout.rs` | — | — |

The layout_test.rs file has substantial coverage in `mod tests` submodules. All existing tests must continue to pass after any constant change. New tests are written per Constitution Principle VII for each discovered defect.

---

## Score-by-Score Notes (Pre-review)

| # | Score | Key Sig | Time | Difficulty | Known Concerns |
|---|---|---|---|---|---|
| 1 | Burgmuller_LaCandeur.mxl | A major (3♯) | 3/4 | Elementary | Simple. Best first comparison target. |
| 2 | Burgmuller_Arabesque.mxl | C major | 2/4 | Elementary | Short note values — beaming test. |
| 3 | Pachelbel_CanonD.mxl | D major (2♯) | 4/4 | Intermediate | Repeated patterns — spacing uniformity. |
| 4 | Bach_InventionNo1.mxl | C major | 4/4 | Intermediate | Imitative counterpoint — 2 independent voices. |
| 5 | Beethoven_FurElise.mxl | A minor | 3/8 | Intermediate | 3/8 time — beaming in compound meter. |
| 6 | Chopin_NocturneOp9No2.mxl | E♭ major (3♭) | 12/8 | Advanced | Complex rhythms, ornaments, accidentals, cross-staff. |
