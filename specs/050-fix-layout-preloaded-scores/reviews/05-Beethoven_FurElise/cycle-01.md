# Cycle 01 — Beethoven Für Elise: Baseline Analysis

## Score Characteristics

| Property         | Value                                                      |
|------------------|------------------------------------------------------------|
| MXL file         | `Beethoven_FurElise.mxl`                                   |
| Format           | MusicXML (grand staff — treble + bass)                     |
| Measures         | 106                                                        |
| Time signature   | 3/8                                                        |
| Key              | A minor (0 key-signature accidentals)                      |
| Clefs            | Treble (G, line 2) + Bass (F, line 4)                      |
| Dominant notes   | 16th notes (792), eighth notes (185), 32nd notes (67)      |
| Voices per staff | 1–2 (melody in treble, accompaniment in bass)              |
| Notes / measure  | ~10 events across both staves (3/8 compound meter)         |

---

## Programmatic Analysis

| Metric           | MuseScore Reference (4 pages)         | Graditone Baseline                    |
|------------------|---------------------------------------|---------------------------------------|
| Image dimensions | 1 275 × 1 650 px × 4 = 6 600 px total | 1 280 × 5 380 px                      |
| Ink density      | 11.73 % (page 1)                      | 8.51 %                                |
| Height ratio     | 1× (total)                            | **0.82× total reference**             |
| Reference files  | `references/Beethoven_FurElise-{1,2,3,4}.png` | `cycle-01-graditone-baseline.png` |

Comparison image: `cycle-01-comparison.png` (MuseScore left, page 1 / Graditone right)

Graditone renders 106 measures in 5 380 px continuous scroll vs 6 600 px paginated reference
(18 % shorter). This is expected for a continuous-scroll renderer without per-page margins.

The ink density of Graditone (8.51 %) is lower than the MuseScore page-1 reference (11.73 %).
The reference page 1 is unusually dense; later pages are lighter. The overall average across
all 4 MuseScore pages would be lower than 11.73 %. Additionally, MuseScore renders dynamic
markings, slur curves, and per-note accent lines that contribute to ink density; these
decorations are not yet implemented in Graditone, which accounts for most of the gap.

**Note on colour**: Graditone's warm-cream background and themed notation colours differ
intentionally from MuseScore's black-on-white. These are **not defects**.

---

## Visual Issues Identified

### Issue 05-A — No excessive height (informational)

**Severity**: None  
**Description**: At 0.82× the total MuseScore reference height, the 3/8 Für Elise layout is
within acceptable bounds. The `minimum_spacing = 38` fix from Canon D propagates correctly
to this score.

### Issue 05-B — Latent bug: `compute_beat_boundaries()` mishandles 3/8 meter (fallback path)

**Severity**: Low (does not affect this score — MusicXML beam data present)  
**Description**: `compute_beat_boundaries(3, 8)` in `backend/src/layout/beams.rs` falls into
the default branch and returns beat boundaries at [0, 960, 1 920] ticks. For a 3/8 measure
(1 440 ticks total), this causes the third eighth note (at tick 960) to be assigned to a
**different beat group** than the first two. As a result, the algorithmic-fallback path
(`group_beamable_by_time_signature`) would only beam the first 2 eighth notes together and
leave the 3rd unbeamed, violating standard engraving rules for 3/8 (all 3 eighths form a
single dotted-quarter beat and should beam as one group).

**Why it doesn't affect this score**: Für Elise's `.mxl` file contains explicit MusicXML
`<beam>begin/continue/end</beam>` tags at all beam junctions. Graditone uses the
`build_beam_groups_from_musicxml()` path (which faithfully reads these tags), bypassing the
buggy fallback entirely.

**Impact**: Any 3/8 score whose MusicXML lacks beam tags (e.g., manually entered data, certain
import paths) would show incorrect beaming.

**Proposed fix**: Add `(3, 8) =>` case to `compute_beat_boundaries()` returning no
additional boundaries (one dotted-quarter beat per measure), so all 3 eighth notes beam
together.

### Issue 05-C — Ornaments not rendered (known limitation)

**Severity**: Low / known  
**Description**: Für Elise contains trills, grace notes, and dynamic markings. Graditone's
layout engine has no implementation for ornament or grace-note glyphs. These are omitted
from the rendered output. This is a known missing feature, not a regression introduced by
this specification.

---

## Proposed Fixes for Cycle 02

| Fix   | Component                                    | Description                                          |
|-------|----------------------------------------------|------------------------------------------------------|
| T058a | `backend/src/layout/beams.rs`                | Add `(3, 8)` to `compute_beat_boundaries()` so that the algorithmic fallback treats 3/8 as a single dotted-quarter beat per measure (all 3 eighths beam together). |

---

## Screenshots

| File | Description |
|------|-------------|
| `cycle-01-graditone-baseline.png` | Graditone rendering (1 280 × 5 380 px) |
| `cycle-01-comparison.png` | Side-by-side: MuseScore page 1 (left) vs Graditone (right) |

---

## Approval Status

`cycle-01: pending_manual_review`
