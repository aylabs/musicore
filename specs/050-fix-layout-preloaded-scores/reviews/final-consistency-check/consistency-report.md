# Cross-Score Consistency Report

**Date**: 2026-03-15
**Branch**: `050-fix-layout-preloaded-scores`
**Method**: Programmatic layout analysis + visual screenshot comparison

## Scope

All 6 preloaded scores reviewed for uniform visual constants:
staff line weight, clef size, time-signature size, notehead size, stem length, barline weight,
and system bounding-box correctness (required for viewport virtualization).

## Screenshots Captured (T066)

Each screenshot was taken at **1280×960** viewport, same zoom/scale across all scores.

| Score | Screenshot |
|-------|-----------|
| Burgmüller — La Candeur | `01-LaCandeur.png` |
| Burgmüller — Arabesque | `02-Arabesque.png` |
| Pachelbel — Canon in D | `03-CanonD.png` |
| Bach — Invention No. 1 | `04-Invention.png` |
| Beethoven — Für Elise | `05-FurElise.png` |
| Chopin — Nocturne Op. 9 No. 2 | `06-Nocturne.png` |

## Programmatic Consistency Analysis (T067)

Regression test: `backend/tests/cross_score_consistency_test.rs` (5 tests).
All tests pass as of 2026-03-15.

### Visual Constant Measurements

| Constant | Expected | All 6 Scores | Verdict |
|----------|----------|-------------|---------|
| **Glyph font_size** | 80.0 units | 80.0 ✓ | CONSISTENT |
| **Stem length (standard)** | ≥ 50.0 units | 50.0–70.0 ✓ | CONSISTENT |
| **Barline thin stroke** | 1.5 units | 1.5 ✓ | CONSISTENT |
| **Barline thick stroke** | 4.0 units | 4.0 ✓ | CONSISTENT |
| **Clef glyph present** | U+E050–U+E07F | ✓ all scores | CONSISTENT |
| **Time sig present** | U+E080–U+E089 | ✓ all scores | CONSISTENT |
| **Noteheads present** | U+E0A0–U+E0AF | ✓ all scores | CONSISTENT |
| **System bbox coverage** | All glyphs inside | 0 outside ✓ | CONSISTENT |

### Note on Staff/Ledger Line Stroke Widths

These are set in the renderer (`LayoutRenderer.tsx`), not the layout engine:
- Staff lines: `STAFF_LINE_STROKE_WIDTH = 1.5` (all scores use same renderer)
- Ledger lines: `LEDGER_LINE_STROKE_WIDTH = 2.0` (all scores use same renderer)

Since the renderer constants are global, they are by definition consistent across all scores.

## Inconsistencies Found (T068/T069)

**None.** All measured constants are consistent across all 6 scores.
No layout-engine or renderer fixes required at this stage.

## Score-Specific Regressions

The bounding-box coverage test (`bounding_boxes_contain_all_glyphs_across_scores`)
serves as a regression guard for the beam-cut fix applied to Canon D (commit fixing
`backend/src/layout/mod.rs`). All 6 scores pass this check, confirming the fix is
generic and not score-specific.

## Approved Scores

| Score | Cycle Doc | Status |
|-------|-----------|--------|
| 01 — Burgmüller La Candeur | `reviews/01-Burgmuller_LaCandeur/cycle-01.md` | Approved 2026-03-15 |
| 02 — Burgmüller Arabesque | `reviews/02-Burgmuller_Arabesque/cycle-01.md` | Approved 2026-03-15 |
| 03 — Pachelbel Canon in D | `reviews/03-Pachelbel_CanonD/cycle-01.md` | Approved 2026-03-15 |
| 04 — Bach Invention No. 1 | `reviews/04-Bach_InventionNo1/cycle-01.md` | Approved 2026-03-15 |
| 05 — Beethoven Für Elise | `reviews/05-Beethoven_FurElise/cycle-01.md` | Approved 2026-03-15 |
| 06 — Chopin Nocturne Op. 9 No. 2 | `reviews/06-Chopin_NocturneOp9No2/cycle-01.md` | Approved 2026-03-15 |

## Overall Status

**PASS** — All 6 scores are visually consistent. No regressions detected.

- [x] Consistency panel reviewed
- [x] All programmatic tests pass (`cargo test`)
- [x] All 6 screenshots captured and reviewed
- [x] Musician sign-off: **2026-03-15**
