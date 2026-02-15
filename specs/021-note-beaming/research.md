# Research: Note Beaming (021)

**Generated**: 2026-02-15  
**Status**: Complete — all NEEDS CLARIFICATION resolved

## R1: SVG Rendering Approach for Sloped Beams

**Decision**: Use `<polygon>` with 4 computed corner points for beam rendering

**Rationale**: The current `<rect>` element cannot represent sloped beams (it is always axis-aligned). A `<polygon>` directly maps to the beam geometry — a parallelogram defined by `(x_start, y_start)`, `(x_end, y_end)`, and `thickness`. This is the approach used by **Verovio** (the gold-standard open-source engraver) and produces clean, anti-aliased rendering. The vertical thickness simplification (instead of perpendicular thickness) is standard practice since beam slopes are small (≤18°).

**Alternatives considered**:
- `<rect>` + CSS `transform: rotate()` — Requires careful origin math; rotation affects bounding box calculations; anti-aliasing artifacts at small angles. Rejected.
- `<path>` with `M`/`L`/`Z` — Functionally equivalent to `<polygon>` but slightly more complex syntax. Overkill for straight beams. Rejected.
- Canvas rendering — Would require a complete rendering pipeline rewrite. Out of scope. Rejected.

**Implementation**: In `LayoutRenderer.tsx`, replace the beam `<rect>` block (U+0001 handler) with `<polygon>` using 4 points: `(x1,y1) (x2,y2) (x2,y2+thickness) (x1,y1+thickness)`. Backend `Beam` struct already provides `x_start, y_start, x_end, y_end, thickness`.

---

## R2: SMuFL Engraving Constants for Beams

**Decision**: Use standard SMuFL/Gould engraving values

**Rationale**: These values are industry-standard, defined in the SMuFL specification and Elaine Gould's "Behind Bars" reference. The existing codebase already uses correct `BEAM_THICKNESS = 10.0` (0.5 staff spaces at 20 units/space).

| Parameter | Staff Spaces | Units (20u/space) | Status |
|-----------|-------------|-------------------|--------|
| Beam thickness | 0.5 | 10.0 | ✅ Already defined (`Beam::BEAM_THICKNESS`) |
| Inter-beam gap | 0.25 | 5.0 | ❌ New constant needed |
| Beam-to-beam pitch | 0.75 | 15.0 | Derived: thickness + gap |
| Minimum stem length (beamed) | 2.5 | 50.0 | ❌ Differs from current `STEM_LENGTH = 35.0` |
| Minimum stem length (ledger lines) | 3.0 | 60.0 | ❌ New constant needed |
| Beam hook length | 0.75 | 15.0 | ❌ New constant needed |
| Maximum beam slope | 0.5 spaces/note | 10.0 units/note | ✅ Already defined (`Beam::MAX_SLOPE`) |
| Stem thickness | 0.12 | 2.4 | ⚠️ Current `STEM_THICKNESS = 1.5` is slightly thin |

**Alternatives considered**:
- Custom values — Rejected. Standard values ensure visual compatibility with reference engravers.
- Bravura metadata `engravingDefaults` — The project already loads `bravura_metadata.json`. The values `beamSpacing` and `beamThickness` from this file could be used, but hardcoded constants are simpler and sufficient.

---

## R3: MusicXML `<beam>` Element Parsing

**Decision**: Parse `<beam>` elements with `number` attribute and text content; store as `Vec<BeamData>` on `NoteData`

**Rationale**: The MusicXML `<beam>` element is the authoritative source for beaming intent from the original notation editor. Parsing it avoids the need for algorithmic guessing and preserves the composer/editor's beaming decisions exactly.

**MusicXML format**:
```xml
<beam number="1">begin</beam>     <!-- Start primary beam -->
<beam number="1">continue</beam>  <!-- Continue primary beam -->
<beam number="1">end</beam>       <!-- End primary beam -->
<beam number="2">begin</beam>     <!-- Start secondary beam (16ths) -->
<beam number="2">forward hook</beam>   <!-- Partial beam forward -->
<beam number="2">backward hook</beam>  <!-- Partial beam backward -->
```

- `number` range: 1–8 (levels; 1=8th, 2=16th, 3=32nd, etc.)
- A note can have **multiple** `<beam>` elements (one per beam level)
- Fan beams (`fan` attribute: `accel`/`rit`) are out of scope for this feature

**Data model addition**:
```rust
pub enum BeamType { Begin, Continue, End, ForwardHook, BackwardHook }
pub struct BeamData { pub number: u8, pub beam_type: BeamType }
// Added to NoteData: pub beams: Vec<BeamData>
```

**Alternatives considered**:
- Ignore MusicXML beams and use only algorithmic beaming — Rejected. Would lose user intent and produce incorrect groupings in complex music.
- Parse only level 1 beams — Rejected. Multi-level beaming is required for sixteenth notes, which are very common.

---

## R4: Performance Impact Assessment

**Decision**: The increased SVG element count (~42% in viewport) is acceptable with current virtualization

**Rationale**: Switching from combined glyphs to separate noteheads + stems + beams increases elements per beamed note from 1 to ~2.5 (1 notehead + 1 stem + ~0.5 beam share). For a typical viewport (10 staves × 4 measures):

| Metric | Current | With Beams | Change |
|--------|---------|------------|--------|
| Note elements | 240 `<text>` | 240 `<text>` | Same |
| Stem elements | 0 | ~180 `<line>` | +180 |
| Beam elements | 0 | ~40 `<polygon>` | +40 |
| Total viewport elements | ~520 | ~740 | **+42%** |

Modern browsers handle 5,000+ SVG elements at 60fps. The increase from 520 → 740 is well within budget. The existing viewport virtualization (`getVisibleSystems()`) limits rendering to visible systems only.

Unbeamed notes (quarter notes, whole notes, isolated flagged notes) continue using combined glyphs (FR-005), which limits the element increase to only the beamed portion.

**Alternatives considered**:
- Batching multiple stems into a single `<path>` — Possible future optimization if needed, but premature at this stage.
- Switching to Canvas rendering — Out of scope; SVG provides resolution independence critical for tablet displays.

**Recommendation**: Implement beaming without special optimization. Add a performance benchmark (using existing bench infrastructure in `backend/benches/layout_bench.rs`) to validate SC-004/SC-005 during development.

---

## R5: Algorithmic Beaming Rules (Fallback)

**Decision**: Group by beat position using time-signature-aware beat duration. Default beat groupings for common time signatures.

**Rationale**: When MusicXML files lack `<beam>` elements, the system must produce correct beaming automatically. The standard rule is: **beam groups must not cross beat boundaries**.

| Time Signature | Beat Type | Beat Duration (ticks) | Grouping Example (8ths) |
|----------------|-----------|----------------------|------------------------|
| 4/4, 2/4, 3/4 | Simple | 960 (quarter) | Groups of 2 |
| 6/8, 9/8, 12/8 | Compound | 1440 (dotted quarter) | Groups of 3 |
| 2/2 (cut time) | Simple | 1920 (half) | Groups of 4 |
| 3/8 | Compound | 1440 (dotted quarter) | Group of 3 |
| 5/8 | Asymmetric | 1440 + 960 (3+2) | Group of 3, then group of 2 |
| 7/8 | Asymmetric | 960 + 960 + 1440 (2+2+3) | Groups of 2, 2, 3 |

**Current gap**: The existing `group_beamable_notes()` hardcodes `ticks_per_beat = 960`. This must be parameterized with time signature awareness.

**Algorithm**: 
1. Determine beat boundaries from time signature
2. For each note with duration ≤ 480 ticks (eighth or shorter): assign to beat group based on start tick
3. Notes at beat boundaries start new groups
4. Rests break groups
5. Single-note groups fall back to flagged rendering

**Alternatives considered**:
- Half-bar beaming (e.g., 4 eighths beamed together in 4/4) — This is a valid modern style but not the default convention. Rejected as default; could be added as an option later.
- Context-sensitive grouping (vocal vs instrumental) — Vocal beaming traditionally avoids beaming across syllables. Out of scope.
- User-configurable groupings — Future feature. For now, use standard defaults.

---

## R6: Notehead Glyph Selection for Beamed vs Unbeamed Notes

**Decision**: Use bare notehead glyphs (`U+E0A4` noteheadBlack, `U+E0A3` noteheadHalf) for beamed notes; keep combined glyphs for unbeamed notes

**Rationale**: Beamed notes must not have flags (the beam replaces flags). The combined SMuFL glyphs (U+E1D7 `noteEighthUp`) include an integrated flag that cannot be removed. Therefore, beamed notes must use standalone notehead glyphs with separately drawn stems.

**Glyph selection logic**:
```
if note is in a beam group AND duration < 960:
    use noteheadBlack (U+E0A4) for filled noteheads
    use noteheadHalf (U+E0A3) for open noteheads (should not occur for beamed notes, but defensive)
else:
    use existing combined glyphs (U+E1D5, U+E1D7, U+E1D9, etc.)
```

The `position_noteheads()` function in `positioner.rs` needs a new parameter indicating which notes are part of beam groups, so it can select the appropriate glyph.

**Alternatives considered**:
- Always use bare noteheads + drawn stems (even for quarter notes, unbeamed eighths) — Would be more consistent but degrade visual quality for unbeamed notes and increase element count unnecessarily. Rejected per FR-005.
- Use combined stem-up/stem-down variants based on beam group direction — The combined glyphs include flags, so they can't be used for beamed notes regardless of direction. Not applicable.
