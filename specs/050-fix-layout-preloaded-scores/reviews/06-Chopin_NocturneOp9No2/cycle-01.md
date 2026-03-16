# Cycle 01 — Chopin Nocturne Op. 9 No. 2: Baseline Analysis

## Score Characteristics

| Property         | Value                                                      |
|------------------|------------------------------------------------------------|
| MXL file         | `Chopin_NocturneOp9No2.mxl`                                |
| Format           | MusicXML (grand staff — treble + bass)                     |
| Measures         | 38                                                         |
| Time signature   | 12/8                                                       |
| Key              | E♭ major (3 flats: B♭, E♭, A♭)                            |
| Clefs            | Treble (G, line 2) + Bass (F, line 4)                      |
| Dominant notes   | Eighth notes (924), 32nd notes (92), 16th notes (146), quarter notes (81) |
| Voices per staff | 1–2 (melodic RH over pulsing LH arpeggios and chords)     |
| Notes / measure  | ~35 events across both staves (12/8 with rich texture)     |

---

## Programmatic Analysis

| Metric           | MuseScore Reference (4 pages)                    | Graditone Baseline                       |
|------------------|--------------------------------------------------|------------------------------------------|
| Image dimensions | 1 240 × 1 754 px × 4 = 7 016 px total            | 1 280 × 4 168 px                         |
| Ink density      | 8.22 % (page 1)                                  | 9.64 %                                   |
| Height ratio     | 1× (total)                                       | **0.59× total reference**                |
| Reference files  | `references/Chopin_NocturneOp9No2-{1,2,3,4}.png` | `cycle-01-graditone-baseline.png`         |

Comparison image: `cycle-01-comparison.png` (MuseScore left, page 1 / Graditone right)

Graditone renders 38 measures in 4 168 px continuous scroll vs 7 016 px paginated reference
(41 % shorter). This compact ratio is expected: continuous scroll has no page-break margins
and the `minimum_spacing = 38` fix causes the 12/8 eighth-note content to pack tightly.

Ink density is slightly higher in Graditone (9.64 % vs 8.22 % on MuseScore page 1), consistent
with more measures per vertical unit of space.

**Note on colour**: Graditone's warm-cream background and themed notation colours differ
intentionally from MuseScore's black-on-white. These are **not defects**.

---

## Visual Issues Identified

### Issue 06-A — No excessive height (informational)

**Severity**: None  
**Description**: At 0.59× the total MuseScore reference height, the 12/8 Nocturne layout is
compact and within acceptable bounds. The `minimum_spacing = 38` fix propagates correctly to
this score.

### Issue 06-B — 12/8 beaming handled correctly (informational)

**Severity**: None  
**Description**: `compute_beat_boundaries(12, 8)` correctly returns [0, 1 440, 2 880, 4 320],
producing 4 beam groups of 3 eighth notes each per measure (one dotted-quarter beat per group).
This matches standard 12/8 engraving rules. Additionally, the Chopin MXL file contains explicit
MusicXML beam tags, so `build_beam_groups_from_musicxml()` is used, bypassing the algorithmic
fallback entirely.

### Issue 06-C — E♭ major key signature (3 flats) — to verify manually

**Severity**: TBD  
**Description**: The E♭ major key signature places flats at B♭ (treble: 3rd line), E♭ (treble:
4th space), and A♭ (treble: 2nd space). `position_key_signature()` in `positioner.rs` handles
negative `key_sharps` values via the flat-order array `[B, E, A, D, G, C, F]`. Taking the first
3 entries covers B♭, E♭, A♭. Manual inspection of the first system's key signature is needed
to confirm correct staff-line placement in both clefs.

### Issue 06-D — Ornaments not rendered (known limitation)

**Severity**: Low / known  
**Description**: The Nocturne contains trills, turns, and grace notes throughout. Graditone's
layout engine has no implementation for ornament or grace-note glyphs (`grep` for `grace`,
`trill`, `ornament` returns no matches in `backend/src/layout/`). These are omitted from the
rendered output. This is a known missing feature, not a regression introduced by this
specification.

### Issue 06-E — Cross-staff notes — to verify manually

**Severity**: TBD  
**Description**: Some measures in the Nocturne contain notes that cross from the treble to the
bass staff (or vice versa) for playability. The layout engine places each note on its written
staff. Manual inspection is needed to confirm no visible overlap or collision between
adjacent-staff content.

---

## Proposed Fixes for Cycle 02

No layout-engine fixes required for this score. The 3/8 beaming fix (T058) from Für Elise
does not affect Chopin's 12/8 beaming path.

---

## Screenshots

| File | Description |
|------|-------------|
| `cycle-01-graditone-baseline.png` | Graditone rendering (1 280 × 4 168 px) |
| `cycle-01-comparison.png` | Side-by-side: MuseScore page 1 (left) vs Graditone (right) |

---

## Approval Status

`cycle-01: pending_manual_review`
