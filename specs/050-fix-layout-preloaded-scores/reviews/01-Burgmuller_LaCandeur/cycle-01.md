# Review: Burgmuller La Candeur — Cycle 1

**Date**: 2026-03-15
**Status**: approved
**Approved by**: musician

## Reference

- MuseScore: [references/Burgmuller_LaCandeur-1.png](../../references/Burgmuller_LaCandeur-1.png) · [page 2](../../references/Burgmuller_LaCandeur-2.png)
- Graditone baseline: [cycle-01-graditone-baseline.png](cycle-01-graditone-baseline.png)
- Side-by-side composite: [cycle-01-comparison.png](cycle-01-comparison.png)

## Programmatic Analysis Summary

| Metric | MuseScore | Graditone | Finding |
|--------|-----------|-----------|---------|
| Image size | 1275×1650 (full page, 150 DPI) | 1375×1217 (browser viewport) | Different format — not directly comparable area |
| Ink density (dark px%) | **6.34%** | **3.38%** | Graditone = 53% of MuseScore density |
| Staff-line spacing | ~8 px/space (150 DPI) | 10 px/space (screen) | Both physically ~1.3 mm/space ✓ |
| Grand-staff treble→bass (origins) | — | 80 px = 8 spaces | Matches `intra_staff_multiplier=8.0` ✓ |
| Systems visible | — | 6 systems | With correct spacing should be 3–4 for this content |
| Measures per system | ~4–5 | ~1–2 (estimated) | ← Confirms horizontal spacing is too wide |

---

## Issues Found

### [01-01-A] Horizontal note spacing too wide — roughly 2× MuseScore

- **Layer**: layout-engine
- **Severity**: major
- **Scope**: generic (affects all 6 scores)
- **Description**:
  `spacer.rs` spacing formula: `spacing = base_spacing + duration_factor × √(ticks / reference)`
  For a quarter note (960 ticks), current constants give `40 + 40 × 1 = 80 units = 4 staff spaces`.
  MuseScore standard for a quarter note is approximately **1.5 staff spaces (~30 units)**.
  This results in ~2.5× wider note placement, causing:
  - Only 1–2 measures visible per system (vs 4–5 expected for La Candeur in 4/4)
  - Overall ink density ~53% of MuseScore (fewer note symbols per unit area)
  - Excessive horizontal whitespace between notes
- **Fix candidate**: Reduce `base_spacing` and `duration_factor` in `backend/src/layout/spacer.rs`.
  Starting point (needs visual tuning): `base_spacing = 15.0`, `duration_factor = 20.0`
  → Quarter note spacing: 15 + 20 = 35 units = 1.75 spaces (closer to standard)
  → Whole note: 15 + 40 = 55 units = 2.75 spaces
  → Eighth note: 15 + 14.1 = 29.1 units = 1.46 spaces
  Final values must be confirmed by visual comparison with MuseScore reference.
- **Test**: `backend/src/layout/spacer.rs::tests::test_quarter_note_spacing_standard` (to be written — T029)
- **Status**: open

### [01-01-B] Ink density gap partially explained by pre-cycle fixes (reference only)

- **Layer**: layout-engine + renderer
- **Severity**: major (resolved in Phase 2)
- **Scope**: generic
- **Description**: Two fixes applied in Phase 2 also contribute to lower ink density vs MuseScore.
  These are already resolved and present in the current baseline.
- **Fix**: See Fixes Applied This Cycle table below.
- **Test**: `backend/src/layout/stems.rs::tests::test_stem_length_standard_note` ✅  
  `frontend/src/components/LayoutRenderer.test.tsx::[T022]` ✅
- **Status**: fixed

---

## Fixes Applied This Cycle

| Issue | File | Change | Status |
|-------|------|--------|--------|
| Phase 2 — STEM_LENGTH | `backend/src/layout/stems.rs` | `35.0 → 70.0` (1.75 sp → 3.5 sp) | ✅ done |
| Phase 2 — Staff line stroke | `frontend/src/components/LayoutRenderer.tsx` | `STAFF_LINE_STROKE_WIDTH: 1 → 1.5` | ✅ done |
| Phase 2 — Ledger line stroke | `frontend/src/components/LayoutRenderer.tsx` | `LEDGER_LINE_STROKE_WIDTH: 1.5 → 2.0` | ✅ done |
| **01-01-A** — Horizontal spacing | `backend/src/layout/spacer.rs` | `base_spacing/duration_factor TBD` | ⏳ T029–T031 |

## Propagation

**01-01-A** is `scope: generic` — once fixed, all 6 preloaded scores will automatically benefit.
Verify no regressions on scores 2–6 before marking 01-01-A fixed.

## Approval

- [x] Approved — Musician sign-off date: 2026-03-15

---

_Analysis generated programmatically 2026-03-15. Pixel-level diff composite at `cycle-01-comparison.png`. Visual review by musician required before marking approved._

