## Summary

Fix the layout rendering of all 6 preloaded scores to match Musescore reference quality. Each score went through iterative musician review cycles (side-by-side comparison vs Musescore 4 exports) until approved as clean, readable, and consistent. See `specs/050-fix-layout-preloaded-scores/`.

## What's Included

### Foundational Layout Fixes (T015–T025)
- **Stem length**: Corrected from 35 units to 70 units (3.5 staff spaces, standard engraving)
- **Staff line stroke-width**: Updated to match Musescore weight for readability on tablets
- **Ledger line stroke-width**: Adjusted proportionally to staff line fix

### Notation Elements (T077–T082)
- **Augmentation dots**: Added `dot_count` field to domain `Note`, parsed from MusicXML `<dot/>`, rendered as SVG circles in layout engine
- **Staccato articulation**: Added `staccato` field to domain `Note`, parsed from MusicXML `<staccato/>`, positioned on notehead side (opposite stem)
- **Staccato playback**: Staccato notes play at half duration in both normal playback and practice mode

### Multi-Voice Support (T083–T084)
- **Voice separation**: MusicXML `<voice>` numbers now preserved through import; multi-voice staves produce separate `Voice` structs instead of merging into one
- **Forced stem direction**: Voice 0 → stems up, voice 1+ → stems down; applied across stems, beams, and staccato dots

### Clef & Accidental Fixes (T092, T101–T104)
- **System-start clef**: Incoming clef rendered correctly at system start
- **Mid-system clef changes**: Positioned after barlines instead of overlapping
- **Per-octave accidentals**: Accidental state keyed on full MIDI pitch (not just pitch class), so G#5 no longer suppresses G#4's sharp
- **Accidental state reset**: Proper reset at actual measure boundaries

### Measure Boundary Fix (T100)
- **Shortened measures**: Added `measure_end_ticks` computed from actual MusicXML content; fixed Für Elise m9 (2/8 first ending) where notes were assigned to wrong measures
- **Chord double-counting**: Fixed in both `compute_measure_end_ticks()` and `detect_pickup_ticks()`

### Beam Improvements (T088–T091, T105)
- **Stem direction rule**: Replaced majority-rule with farthest-note-from-middle (Gould, *Behind Bars*, p.17)
- **Beamed stem length**: Reduced initial beam positioning from 70 to 50 units (2.5 spaces) to avoid excessively long stems
- **Dotted eighth beaming**: Notes with explicit MusicXML beam annotations now included in beam groups regardless of duration
- **Chord stem/beam clearance**: `BeamableNote` tracks full `chord_y_range` so beams don't sit on noteheads

### Chord Layout (T106–T107, T110, T112–T114)
- **Direction-aware displacement**: Stem-down chords displace lower note LEFT (standard engraving), not always right
- **Unbeamed chord stems**: All chord durations < whole note now use bare noteheads + explicit stem + flag glyph (fixes misalignment from combined glyphs)
- **Augmentation dot de-collision**: Walk top-to-bottom in chord, push duplicate-position dots down by one staff space
- **Dot x-position in chord seconds**: Dots shift right to follow displaced noteheads
- **Accidental collision avoidance**: Post-processing staggers vertically-close accidentals horizontally; displaced accidentals move left of undisplaced column
- **Diatonic chord-second detection**: Replaced chromatic MIDI interval check with diatonic staff-position comparison (fixes Bb4→C#5 augmented second detection)

### Grace Notes (T109)
- **Grace note rendering**: `is_grace` forwarded through frontend conversion; 0.6x scaling and 0.5 opacity applied to noteheads, stems, and beams

### Slur Rendering (T094–T097, T111)
- **Full slur pipeline**: MusicXML `<slur>` parsing → `resolve_slur_chains()` → arc generation (same-system, cross-system outgoing/incoming) → SVG Bézier rendering
- **Tapered crescent shape**: Replaced stroked line with filled lens-shaped crescent for professional appearance
- **Auto-curvature**: Arc height uses `3.5×√span` clamped [12, 50] for consistent curvature
- **Direction fix**: Only explicit `placement` attribute sets direction; removed incorrect `bezier-y` sign inference

### Tie Arcs (T093, T095)
- **Cross-system ties**: Added outgoing partial arc (note → system right edge) and incoming partial arc (system left edge → target note)
- **Incoming arc visibility**: Start position moved left of `unified_left_margin` with min-span guarantee

### Staccato Dot Precision (T090)
- **Beam-aware placement**: Pre-computed beam group directions used for staccato positioning; priority: multi-voice override > beam group direction > per-chord rule

### First System Clipping Fix (T086)
- Added 4-staff-space top margin (80 units) so stems/beams above first staff are not clipped by viewport y=0

## Scores Reviewed

| Score | Status |
|-------|--------|
| Burgmüller – La Candeur | ✅ Approved |
| Burgmüller – Arabesque | ✅ Approved |
| Pachelbel – Canon in D | ✅ Approved |
| Bach – Invention No. 1 | ✅ Approved |
| Beethoven – Für Elise | ✅ Approved |
| Chopin – Nocturne Op. 9 No. 2 | ✅ Approved |

## Files Changed

| File | Change |
|------|--------|
| `backend/src/domain/events/note.rs` | `staccato`, `dot_count` fields on `Note` |
| `backend/src/domain/importers/musicxml/converter.rs` | Voice separation, `NotesByVoice`, `resolve_slur_chains()`, `compute_measure_end_ticks()` |
| `backend/src/domain/importers/musicxml/parser.rs` | `<staccato/>`, `<dot/>`, `<slur>` parsing; removed `bezier-y` inference |
| `backend/src/domain/importers/musicxml/types.rs` | `SlurInfo`, `SlurType`, `slur_above` field |
| `backend/src/layout/annotations.rs` | `render_notation_dots()` with de-collision and chord-second detection |
| `backend/src/layout/batcher.rs` | Grace note glyph scaling |
| `backend/src/layout/beams.rs` | Farthest-note stem direction rule; beam clearance |
| `backend/src/layout/extraction.rs` | `get_clef_before_tick()` helper |
| `backend/src/layout/mod.rs` | Staccato/dot/slur/tie generation; grace note scaling; beam group direction lookup; top margin |
| `backend/src/layout/note_layout.rs` | Direction-aware displacement; diatonic chord-second detection; `diatonic_staff_pos()` helper; unbeamed chord stem+flag |
| `backend/src/layout/positioner.rs` | Per-octave accidentals; accidental collision post-processing; `forced_stem_down` |
| `backend/src/layout/structural.rs` | Incoming clef; mid-system clef changes; measure boundaries |
| `backend/src/layout/types.rs` | `NotationDot`, `slur_arcs` on `Staff` |
| `backend/tests/chord_dots_test.rs` | New — dot de-collision regression tests |
| `backend/tests/clef_diag_test.rs` | New — clef positioning diagnostic tests |
| `backend/tests/grace_note_layout_test.rs` | New — grace note size/opacity regression tests |
| `backend/tests/slur_direction_test.rs` | New — slur direction regression tests |
| `frontend/src/components/LayoutRenderer.tsx` | Staff/ledger stroke-width; dot circles; slur Bézier; flag `dominant-baseline` |
| `frontend/src/components/layout/LayoutView.tsx` | Forward `staccato`, `dot_count`, `is_grace`, `measure_end_ticks` |
| `frontend/src/components/layout/LayoutView.grace.test.ts` | New — grace note frontend test |
| `frontend/src/types/score.ts` | `staccato`, `dot_count`, `is_grace` on `Note` |
| `frontend/public/wasm/musicore_backend_bg.wasm` | Rebuilt WASM binary |
| `backend/assets/bravura_metadata.json` | Flag glyph bounding boxes |

## Test Results

- **295+ Rust backend tests** — all passing
- **1610 frontend unit tests** — all passing (25 skipped)
- **Clippy** — clean (0 warnings)

## Tasks

114 tasks completed (T001–T076 planned + T077–T114 unplanned) across 6 phases.
See `specs/050-fix-layout-preloaded-scores/tasks.md` for full task list.
