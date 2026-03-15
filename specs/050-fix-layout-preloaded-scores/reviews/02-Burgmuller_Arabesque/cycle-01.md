# Review: Burgmuller Arabesque — Cycle 1

**Date**: 2026-03-15
**Status**: in-review
**Approved by**: —

## Reference

- MuseScore: [references/Burgmuller_Arabesque-1.png](../../references/Burgmuller_Arabesque-1.png) · [page 2](../../references/Burgmuller_Arabesque-2.png)
- Graditone baseline: [cycle-01-graditone-baseline.png](cycle-01-graditone-baseline.png)
- Side-by-side composite: [cycle-01-comparison.png](cycle-01-comparison.png)

## Score Characteristics

| Property | Value |
|----------|-------|
| Time signature | 2/4 |
| Key signature | C major (0 sharps/flats) |
| Measures | ~16 |
| Dominant rhythm | Running sixteenth-note figures (main Arabesque motif) |
| Beamed groups | 28 eighth/sixteenth beam starts |
| Staves | Grand staff (treble + bass) |

## Programmatic Analysis Summary

| Metric | MuseScore (p.1) | Graditone | Finding |
|--------|-----------------|-----------|---------|
| Image size | 1275×1650 | 1375×1024 | Different format |
| Ink density (dark px%) | **6.51%** | **8.76%** | Graditone denser — fewer empty systems |
| Time sig | 2/4 | 2/4 | ✓ |
| Key sig | C major | C major | ✓ |

Graditone ink density (8.76%) exceeds MuseScore (6.51%), suggesting the generic spacing
improvements from La Candeur Cycle 1 have taken effect and notes are well-packed.

---

## Issues Found

### [02-01-A] Beaming of running sixteenth notes may not group correctly across beats

- **Layer**: layout-engine
- **Severity**: major
- **Scope**: score-specific (beaming logic in `backend/src/layout/beams.rs`)
- **Description**:
  Arabesque's primary motif consists of running sixteenth notes in 2/4.
  Standard engraving groups sixteenth notes per beat (4 per beat = 1 beam group of 4).
  The layout engine's `group_beamable_by_time_signature()` or `build_beam_groups_from_musicxml()`
  path must correctly group four 16ths per beat in 2/4.
  Visual inspection needed against reference to confirm.
- **Fix**: Review visual comparison; if beaming is incorrect, adjust beam grouping logic
  in `backend/src/layout/beams.rs` for 2/4 time.
- **Test**: `backend/tests/layout_test.rs::beaming_tests::test_arabesque_16th_beaming` (T039)
- **Status**: open — needs visual confirmation

### [02-01-B] Volta bracket display in repeated sections

- **Layer**: layout-engine
- **Severity**: minor
- **Scope**: score-specific
- **Description**:
  Arabesque has first/second endings (volta brackets). The layout engine renders
  volta brackets; visual confirmation needed that they appear correctly above the
  correct measures.
- **Fix**: Verify via comparison image; document if a limitation.
- **Test**: `backend/tests/volta_brackets_integration.rs::test_arabesque_volta_bracket_count` ✅ (pre-existing)
- **Status**: open — needs visual confirmation

### [02-01-C] Grand-staff overlap — treble and bass notes collide vertically

- **Layer**: layout-engine
- **Severity**: critical
- **Scope**: generic (affects all grand-staff scores)
- **Description**:
  With `intra_staff_multiplier = 8.0`, the origin-to-origin distance between treble and bass was
  160 units (8 staff-spaces). The old collision detector did not account for stem extents, so stems
  extending across the inter-staff gap were invisible to the avoidance algorithm.  
  Result: treble low notes (C4, D4) and bass notes whose stems reached above the bass top line
  visually overlapped.
- **Fix**:
  1. `intra_staff_multiplier`: `8.0 → 10.0` (200 units = standard grand-staff gap of ~6 spaces between edges)
  2. `min_clearance`: `1.0 → 2.0` staff-spaces
  3. `compute_staff_note_extents`: now includes stem tip y-values in the bounding box so the
     collision detector accounts for stems (notes above middle line → stem DOWN; on/below → stem UP)
- **Files**: `backend/src/layout/mod.rs`
- **Tests**: 3 unit tests + 1 integration test updated to reflect new 200-unit default spacing
- **Status**: ✅ fixed 2026-03-15

---

## Fixes Applied This Cycle

All generic fixes from La Candeur Cycle 1 are already present:

| Issue | File | Change | Status |
|-------|------|--------|--------|
| Generic — horizontal spacing | `backend/src/layout/spacer.rs` | `base=15, factor=25, min=45` | ✅ propagated |
| Generic — barline placement | `backend/src/layout/mod.rs` | midpoint between measures | ✅ propagated |
| Generic — system spacing | `frontend/src/components/layout/LayoutView.tsx` | `100→200` | ✅ propagated |
| Generic — ledger line width | `backend/src/layout/positioner.rs` | `0.7x→1.1x` | ✅ propagated |
| Generic — staff/ledger stroke | `frontend/src/components/LayoutRenderer.tsx` | `1→1.5 / 1.5→2.0` | ✅ propagated |
| Generic — grand-staff spacing + stem-aware extents | `backend/src/layout/mod.rs` | `intra_mult 8→10, clearance 1→2, stem extents` | ✅ applied 2026-03-15 |

---

## Propagation

This score is `scope: generic` for any new fixes found. Propagate to scores 3–6.

## Approval

- [ ] Approved — Musician sign-off date: ___
