# Feature 021: Note Beaming

## Overview

Implements note beaming — connecting eighth notes and shorter durations with horizontal or sloped beam lines instead of individual flags. Uses MusicXML beam annotations when available, with algorithmic fallback grouping by beat.

**Key Achievement**: Beamed notes render with correct stem attachment, multi-level beams (8th, 16th, 32nd), slope support, and full chord compatibility.

## Problem Solved

Before this feature:
- ❌ Eighth and sixteenth notes displayed with individual flag glyphs
- ❌ No visual rhythmic grouping — scores looked amateurish
- ❌ Combined head+stem+flag SMuFL glyphs couldn't support beaming

After this feature:
- ✅ Beamed note groups with connecting beam lines
- ✅ Multi-level beams (primary for 8ths, secondary for 16ths, etc.)
- ✅ Beam hooks for partial beam segments
- ✅ Correct stem attachment at left/right notehead edges
- ✅ Stems extend to meet beam line at all pitches
- ✅ Chord notes properly handled (shared stems, no spurious flags)

## Core Features

### 1. Beam Grouping
- **MusicXML-driven**: Parse `<beam>` elements (Begin/Continue/End/ForwardHook/BackwardHook)
- **Algorithmic fallback**: Time-signature-aware beat grouping when no beam data present
- **Chord deduplication**: One beam entry per tick, all chord notes marked as beamed

### 2. Three-Phase Stem/Beam Pipeline
- **Phase 1**: Compute initial stems, calculate beam line with clamped slope, find offset for minimum stem lengths
- **Phase 2**: Extend all stems to reach the beam line at their X position
- **Phase 3**: Create beam glyphs at adjusted positions with slope encoding

### 3. Multi-Level Beams
- **Level stacking**: Secondary beams offset by `BEAM_THICKNESS + INTER_BEAM_GAP` toward noteheads
- **Sub-group detection**: Consecutive notes at each level form beam segments
- **Beam hooks**: Forward/backward partial beams for isolated sub-beat notes

### 4. Stem Geometry
- **Direction**: Majority rule for beam groups, individual pitch-based for unbeamed notes
- **Attachment**: Up-stems at right edge (`x + half_width`), down-stems at left edge (`x - half_width`)
- **Y correction**: Compensates for `dominant-baseline:middle` SVG text rendering offset

### 5. Rendering Pipeline
- **Pseudo-glyphs**: Stems encoded as U+0000 (SVG `<line>`), beams as U+0001 (SVG `<polygon>`)
- **Slope support**: Beam glyph encodes left-Y and right-Y for 4-point polygon rendering
- **Bare noteheads**: Beamed notes use `noteheadBlack` (U+E0A4) instead of combined glyphs

## Technical Implementation

### Backend (Rust)

**New Module**: `backend/src/layout/beams.rs`
- `Beam` struct with geometry, level, hook flag
- `BeamGroup` struct grouping notes with beam count
- `BeamableNote` struct with position, timing, beam annotations
- `build_beam_groups_from_musicxml()` — MusicXML-driven grouping
- `group_beamable_by_time_signature()` — algorithmic fallback
- `compute_group_stem_direction()` — majority rule
- `create_beam()` — primary beam from stem endpoints
- `create_multi_level_beams()` — secondary/tertiary beams
- `create_beam_hook()` — partial beam segments
- `compute_beam_slope()` — slope with clamping

**Modified Module**: `backend/src/layout/stems.rs`
- `NOTEHEAD_WIDTH = 11.8` — half-width for text-anchor:middle rendering
- Stem-up: `x + notehead_width` (right edge)
- Stem-down: `x - notehead_width` (left edge)
- `MIN_BEAMED_STEM_LENGTH = 50.0`, `MIN_LEDGER_STEM_LENGTH = 60.0`

**Modified Module**: `backend/src/layout/mod.rs`
- 3-phase stem/beam pipeline in `position_glyphs_for_staff()`
- Beam data extraction from MusicXML JSON
- Visual Y offset correction (`+0.5 * units_per_space`)
- Chord-aware tick-to-indices mapping for `beamed_note_indices`

**Modified Module**: `backend/src/domain/events/note.rs`
- `NoteBeamData` struct with number and beam type
- `NoteBeamType` enum (Begin, Continue, End, ForwardHook, BackwardHook)
- `Note::with_beams()` builder method

**Modified Module**: `backend/src/domain/importers/musicxml/`
- Parser: Extract `<beam>` elements with number and type
- Types: `BeamData` struct, `BeamType` enum
- Converter: Map beam data to domain `NoteBeamData`

### Frontend (TypeScript)

**Modified**: `frontend/src/components/LayoutRenderer.tsx`
- Stem rendering: SVG `<line>` for codepoint U+0000
- Beam rendering: SVG `<polygon>` with 4 points for slope support
- Highlight/selection support for stems and beams

**Modified**: `frontend/src/types/score.ts`
- `NoteBeamData` interface with number and beam_type

**Modified**: `frontend/src/components/layout/LayoutView.tsx`
- Forward beam data through `convertScoreToLayoutFormat()`

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `BEAM_THICKNESS` | 10.0 | 0.5 staff spaces |
| `INTER_BEAM_GAP` | 5.0 | 0.25 staff spaces between beam levels |
| `MAX_SLOPE` | 0.5 | Maximum beam slope in staff spaces per note |
| `BEAM_HOOK_LENGTH` | 15.0 | 0.75 staff spaces for partial beams |
| `STEM_LENGTH` | 35.0 | 3.5 staff spaces default |
| `MIN_BEAMED_STEM_LENGTH` | 50.0 | 2.5 staff spaces minimum for beamed notes |
| `NOTEHEAD_WIDTH` | 11.8 | Half-width of noteheadBlack at font-size 80 |

## Test Results

✅ **Backend**: 282 tests passing (0 failures)
✅ **Frontend**: 789 tests passing
✅ **WASM Module**: Built successfully (404K module, 36K JS bindings)
✅ **Pre-commit**: cargo fmt, clippy, TypeScript type check all passing

## Files Changed

| File | Change |
|------|--------|
| `backend/src/layout/beams.rs` | New: beam grouping, geometry, multi-level |
| `backend/src/layout/stems.rs` | Modified: stem constants, attachment points |
| `backend/src/layout/mod.rs` | Modified: 3-phase pipeline, beam data extraction |
| `backend/src/layout/positioner.rs` | Modified: bare notehead for beamed notes |
| `backend/src/domain/events/note.rs` | Modified: beam data types |
| `backend/src/domain/importers/musicxml/parser.rs` | Modified: parse beam elements |
| `backend/src/domain/importers/musicxml/types.rs` | Modified: beam types |
| `backend/src/domain/importers/musicxml/converter.rs` | Modified: beam conversion |
| `backend/tests/layout_test.rs` | Modified: beam-related tests |
| `backend/tests/musicxml_import_test.rs` | Modified: beam import tests |
| `frontend/src/components/LayoutRenderer.tsx` | Modified: stem/beam SVG rendering |
| `frontend/src/components/layout/LayoutView.tsx` | Modified: forward beam data |
| `frontend/src/types/score.ts` | Modified: NoteBeamData interface |
| `frontend/public/wasm/musicore_backend_bg.wasm` | Rebuilt |
| `specs/021-note-beaming/` | New: full speckit (spec, plan, tasks, contracts) |

## Spec Tasks

All 55 tasks completed across 7 phases:
- **Phase 1 (Setup)**: Project structure, dependencies, configuration
- **Phase 2 (Foundational)**: Stem direction, beam grouping, slope calculation
- **Phase 3 (US1 MVP)**: Eighth note beaming with MusicXML integration
- **Phase 4 (US2)**: Multi-level beams for 16th/32nd notes
- **Phase 5 (US3)**: Group stem direction with majority rule
- **Phase 6 (US4)**: Performance validation and edge cases
- **Phase 7 (Polish)**: Minimum stem length, degenerate groups, final validation
