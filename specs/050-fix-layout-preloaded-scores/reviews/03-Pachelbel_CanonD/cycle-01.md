# Cycle 01 — Pachelbel Canon in D: Baseline Analysis

## Score Characteristics

| Property         | Value                                      |
|------------------|--------------------------------------------|
| MXL file         | `Pachelbel_CanonD.mxl`                     |
| Format           | MusicXML (single part, grand staff)        |
| Measures         | 21                                         |
| Time signature   | 4/4                                        |
| Key              | D major (2 sharps: F♯, C♯)                |
| Clefs            | Treble (G, line 2) + Bass (F, line 4)      |
| Dominant note    | Eighth notes (dur = 480 ticks @ 960 PPQ)   |
| Notes / measure  | ~10 eighth-note events across both staves  |

---

## Programmatic Analysis

| Metric           | MuseScore Reference                  | Graditone Baseline                   |
|------------------|--------------------------------------|--------------------------------------|
| Image dimensions | 1 275 × 1 650 px                     | 1 280 × 3 000 px                     |
| Ink density      | 7.92 %                               | 4.50 %                               |
| Height ratio     | 1×                                   | **1.82× reference**                  |
| Reference file   | `references/Pachelbel_CanonD-1.png`  | `cycle-01-graditone-baseline.png`    |

Comparison image: `cycle-01-comparison.png` (MuseScore left / Graditone right)

---

## Visual Issues Identified

### Issue 01-C — Excessive score height (too many / too tall systems)

**Severity**: High  
**Description**: Graditone renders Canon D at 3 000 CSS px whereas MuseScore fits the full
21-measure piece on a single A4-like page of ~1 650 px. The extra height comes from a
combination of two sub-problems:

- **Sub-issue A — Too few measures per system**: The eighth-note spacer minimum (45 units) and
  the flag-clearance padding (5 units × 8 flagged notes per measure = 40 units, plus 30 units
  structural overhead) gives ~430 layout units per measure. With max_system_width ≈ 2 250 units
  at a 1 200 px container, only ~5 measures fit per system (5 × 430 = 2 150), so 21 measures
  spread over ~5 systems. MuseScore packs the same content in ~4 systems.

- **Sub-issue B — Excessive system spacing**: `system_spacing = 200` layout units (= 100 CSS px
  gap after each system). For a 5-system score this adds 500 CSS px of white space in the
  vertical direction on top of the actual staff content.

**Expected**: 4 systems, height ≈ 1 500–1 700 CSS px  
**Actual**: ~5+ systems, height = 3 000 CSS px  

### Issue 02-C — Low ink density

**Severity**: Medium (symptom of Issue 01-C)  
**Description**: Graditone ink density is 4.50 % vs MuseScore's 7.92 %. The larger canvas
spreads the same note content over greater area, so density appears low even if individual
note symbols are correctly sized. Resolving Issue 01-C should bring ink density closer to the
reference.

### Issue 03-C — Key-signature accidentals (to verify visually)

**Severity**: TBD  
**Description**: D major requires two sharps (F♯ and C♯) to appear on the correct staff lines
for both treble and bass clefs. With the current accidental x-offset (-25 units), check that
both sharps render without overlap and are correctly positioned in each system's key signature.

---

## Proposed Fixes for Cycle 02

| Fix | Parameter | Current | Proposed | Rationale |
|-----|-----------|---------|---------|-----------|
| Reduce system spacing | `system_spacing` in `LayoutView.tsx` | 200 | 140–150 | Tighter gap between systems; La Candeur/Arabesque were more forgiving due to shorter total height |
| Reduce minimum spacer | `minimum_spacing` in `spacer.rs` | 45 | 38–40 | Eighth notes currently hit the floor; reducing floor allows tighter packing matching MuseScore |
| Verify accidentals | Visual inspection | — | — | Confirm F♯/C♯ key-sig accidentals render cleanly |

---

## Screenshots

- Baseline (Graditone, 1 280 × 3 000): `cycle-01-graditone-baseline.png`
- Comparison: `cycle-01-comparison.png`

---

## Cycle 02 — After Fix

### Fix applied

Lowered `minimum_spacing` in [backend/src/layout/spacer.rs](../../../../../backend/src/layout/spacer.rs)  
from **45 → 38** layout units.

| Metric           | MuseScore Reference | Graditone Cycle-01 | Graditone Cycle-02 |
|------------------|---------------------|--------------------|--------------------|
| Image dimensions | 1 275 × 1 650 px    | 1 280 × 3 000 px   | 1 280 × 1 710 px   |
| Ink density      | 10.80 %             | 4.50 %             | 7.82 %             |
| Height ratio     | 1×                  | 1.82×              | **1.04×**          |

Height is now within **4 %** of the MuseScore reference (1 710 vs 1 650 px). ✓

### Screenshots
- Updated (Graditone, 1 280 × 1 710): `cycle-02-graditone.png`
- Updated comparison: `cycle-02-comparison.png`

