## Summary

Final layout validation pass for all 6 preloaded scores (`001-preloaded-scores-checks`). Resolves two defects discovered during Nocturne Op. 9 No. 2 review: staccato dot placement on M2 and stem direction on M36 32nd-note groups. Also improves beamed-stem clearance for 16th/32nd note groups across all scores.

## What's Included

### Nocturne M29–M37 Defects (T001–T002 from previous cycle)
Previously committed fixes carried into this branch:
- Double-flat/natural rendering (M29), 8va bracket (M30), accidentals (M34), rest centering (M34–M36), slur (M37), LH/RH vertical alignment

### M2 LH Staccato Dot Placement (T013-A)
- **Root cause**: `convertScoreToLayoutFormat()` in `LayoutView.tsx` silently dropped the `stem_down` field during JSON conversion, so the annotation engine received `explicit_stem=None` and placed staccato dots on the wrong side of noteheads
- **Fix**: Added `stem_down?: boolean` to the `Note` interface in `score.ts`; forwarded the value in `LayoutView.tsx` to the WASM layout call
- **Regression test**: `frontend/e2e/nocturne-m2-staccato-verify.spec.ts` — asserts staccato dot `cy` values are above noteheads (stem-down notes, treble clef M2)
- **Commits**: `b83b4f5`, `f79bc38`

### MusicXML Stem Direction Honored for Beamed Notes (T013-B)
- **Root cause**: `position_glyphs_for_staff()` in `note_layout.rs` never consulted `NoteEvent.stem_down` for beam group direction or standalone chord stem direction; the geometric pitch-heuristic chose the wrong side for above-middle-line notes in M36
- **Fix**:
  - Beam group direction now checks if all notes in a group share the same explicit `stem_down`; if they do, that overrides the geometric heuristic (`note_layout.rs`)
  - Chord stem direction now checks `NoteEvent.stem_down` before falling back to farthest-note-from-middle rule (`note_layout.rs`)
  - `position_noteheads()` in `positioner.rs` accepts a new `explicit_stem_downs: &[Option<bool>]` parameter and uses it for unbeamed notehead glyph selection (note8thUp/Down, etc.)
- **All tests pass** (423 Rust unit tests, 0 failures)
- **Commit**: `606e020`

### Beamed Stem Length Extension for 16th/32nd Groups (T013-C)
- **Problem**: With 3 beam levels (32nds), the fixed `MIN_BEAMED_STEM_LENGTH=50u` left only 5 logical units of clearance between notehead and innermost beam
- **Fix**: Added `beam_level_extra = (max_beam_levels − 1) × 5.0` at both beam layout phases in `note_layout.rs`; grace-note scale applied
  - 8th notes (1 beam): **50u — unchanged**
  - 16th notes (2 beams): **55u (+5u)**
  - 32nd notes (3 beams): **60u (+10u)**
- **Commit**: `0cd14bd`

## Score Reviews

| Score | Status |
|-------|--------|
| Burgmüller – La Candeur | ✅ Review file created (`reviews/01-LaCandeur-final.md`) |
| Burgmüller – Arabesque | ✅ Review file created (`reviews/02-Arabesque-final.md`) |
| Pachelbel – Canon in D | ✅ Review file created (`reviews/03-CanonD-final.md`) |
| Bach – Invention No. 1 | ✅ Review file created (`reviews/04-Invention-final.md`) |
| Beethoven – Für Elise | ✅ Review file created (`reviews/05-FurElise-final.md`) |
| Chopin – Nocturne Op. 9 No. 2 | ✅ Review file created (`reviews/06-Nocturne-final.md`) |

## Files Changed

| File | Change |
|------|--------|
| `backend/src/layout/note_layout.rs` | Beam group + chord stem direction honors MusicXML `stem_down`; per-beam-level stem extension |
| `backend/src/layout/positioner.rs` | `position_noteheads()` accepts `explicit_stem_downs` param for unbeamed glyph selection |
| `frontend/src/types/score.ts` | Added `stem_down?: boolean` to `Note` interface |
| `frontend/src/components/layout/LayoutView.tsx` | Forward `stem_down` in `convertScoreToLayoutFormat()` |
| `frontend/e2e/nocturne-m2-staccato-verify.spec.ts` | New — staccato dot placement regression test |
| `frontend/e2e/nocturne-m36-stem-verify.spec.ts` | New — M36 stem direction screenshot test |
| `frontend/public/wasm/musicore_backend_bg.wasm` | Rebuilt WASM binary |
| `specs/001-preloaded-scores-checks/reviews/` | All 6 per-score review files |
| `specs/001-preloaded-scores-checks/tasks.md` | T007–T013 marked completed; T013-A/B/C remediation subtasks documented |

## Test Results

- `cargo test`: **423 passed, 0 failed**
- `npm run test -- --run`: all vitest suites pass
- Pre-push E2E gate: **2 passed, 0 failures**
