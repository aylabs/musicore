# Cycle 01 — Bach Invention No. 1: Baseline Analysis

## Score Characteristics

| Property         | Value                                                |
|------------------|------------------------------------------------------|
| MXL file         | `Bach_InventionNo1.mxl`                              |
| Format           | MusicXML (grand staff — treble + bass)               |
| Measures         | 22                                                   |
| Time signature   | 4/4                                                  |
| Key              | C major (0 accidentals)                              |
| Clefs            | Treble (G, line 2) + Bass (F, line 4)                |
| Dominant notes   | 16th notes (356), eighth notes (108)                 |
| Voices per staff | 1 (single melodic line each staff — imitative counterpoint traded between treble and bass) |
| Notes / measure  | ~21 events across both staves (16th-note dominant)   |

---

## Programmatic Analysis

| Metric           | MuseScore Reference (2 pages)    | Graditone Baseline               |
|------------------|----------------------------------|----------------------------------|
| Image dimensions | 1 240 × 1 754 px × 2 = 3 508 px total | 1 280 × 2 428 px            |
| Ink density      | 8.88 % (page 1)                  | 9.09 %                           |
| Height ratio     | 1× (total)                       | **0.69× total reference**        |
| Reference files  | `references/Bach_InventionNo1-{1,2}.png` | `cycle-01-graditone-baseline.png` |

Comparison image: `cycle-01-comparison.png` (MuseScore left / Graditone right)

Graditone renders the 22-measure piece in a **compact continuous scroll** at 2 428 px, which is
31 % shorter than the two-page MuseScore reference (3 508 px total). This is expected: Graditone
has no page breaks or per-page margins, so the continuous layout is more compact while preserving
musical correctness. Ink density match (9.09 % vs 8.88 %) confirms content volume is preserved.

---

## Visual Issues Identified

### Issue 04-A — No new layout issues (height resolved)

**Severity**: None  
**Description**: After the `minimum_spacing = 38` fix from Canon D (T047), the 16th-note-heavy
Bach Invention renders within acceptable bounds. No excessive height detected.

**Note on colour**: Graditone's warm-cream background (#FFF3E0) and themed note colours differ
intentionally from MuseScore's black-on-white. These are **not defects** — they reflect the
application theme.

### Issue 04-B — Stem direction: pitch-based only (informational)

**Severity**: Low / informational  
**Description**: `position_noteheads()` in `positioner.rs` determines stem direction purely from
pitch relative to the staff middle line. In the Bach Invention, each staff carries a single
melodic voice, so pitch-based stem rules are sufficient and produce correct results. No fix
required for this score.

If a future score places two simultaneous voices on the same staff, the engine would need
voice-number-aware stem direction (Voice 1 → stems up, Voice 2 → stems down, regardless of
pitch). This is tracked as a future enhancement only.

---

## Proposed Fixes for Cycle 02

No fixes required. Cycle 01 baseline is accepted.

---

## Screenshots

| File | Description |
|------|-------------|
| `cycle-01-graditone-baseline.png` | Graditone rendering (1 280 × 2 428 px) |
| `cycle-01-comparison.png` | Side-by-side: MuseScore (left) vs Graditone (right) |

---

## Approval Status

`cycle-01: pending_manual_review`
