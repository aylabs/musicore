# Quickstart: Note Beaming (021)

**Generated**: 2026-02-15  
**Branch**: `021-note-beaming`

## What This Feature Does

Replaces individual note flags with beam lines connecting groups of eighth notes and shorter durations. This is the standard way music is engraved — flagged eighth notes are only used when isolated; when multiple short notes are adjacent, they are connected by thick horizontal/sloped lines called "beams."

Before: Each eighth note has its own flag (♪♪♪♪ — separate flags)  
After:  Groups of eighth notes are connected by beams (━━━━ — shared beam line)

## Architecture Overview

```
MusicXML File
    │
    ▼
parser.rs ─── NEW: Parse <beam> elements → Vec<BeamData>
    │
    ▼
mod.rs (layout engine) ─── RE-ENABLE: Stem/beam pipeline
    │
    ├── positioner.rs ─── MODIFY: Bare noteheads for beamed notes
    ├── stems.rs ────── EXISTING: Create stem geometry
    ├── beams.rs ────── MODIFY: Multi-level beams, hooks, time-sig-aware grouping
    └── batcher.rs ──── EXISTING: Auto-batches by codepoint (no changes)
    │
    ▼
GlobalLayout JSON (via WASM)
    │
    ▼
LayoutRenderer.tsx ─── MODIFY: <polygon> for sloped beams (was <rect>)
```

## Key Files to Modify

### Backend (Rust)

| File | Change Type | What |
|------|-------------|------|
| `backend/src/domain/importers/musicxml/types.rs` | Add | `BeamType` enum, `BeamData` struct, `beams` field on `NoteData` |
| `backend/src/domain/importers/musicxml/parser.rs` | Add | Parse `<beam>` elements in `parse_note()` |
| `backend/src/layout/mod.rs` | Re-enable + modify | Uncomment stem/beam pipeline (~lines 736–830), thread beam_info from NoteEvent |
| `backend/src/layout/positioner.rs` | Modify | Accept beam group info, emit bare noteheads (U+E0A4) for beamed notes |
| `backend/src/layout/beams.rs` | Extend | Multi-level beams, beam hooks, time-signature-aware grouping, new constants |
| `backend/src/layout/stems.rs` | Minor update | Add `MIN_BEAMED_STEM_LENGTH = 50.0` constant |

### Frontend (TypeScript)

| File | Change Type | What |
|------|-------------|------|
| `frontend/src/components/LayoutRenderer.tsx` | Modify | Change U+0001 handler from `<rect>` to `<polygon>` |

### Tests

| File | Change Type | What |
|------|-------------|------|
| `backend/src/layout/beams.rs` | Add | Multi-level beam tests, hook tests, time-sig grouping tests |
| `backend/tests/musicxml_import_test.rs` | Add | Beam parsing tests |
| `backend/tests/layout_test.rs` | Add | Integration tests: beamed layout output verification |
| `frontend/tests/` | Add | Beam rendering visual tests |

## Development Sequence

1. **Parse MusicXML beams** — Add `BeamData` to types, parse `<beam>` in parser, write tests
2. **Thread beam info through layout** — Add `beam_info` to `NoteEvent`, pass through pipeline
3. **Switch beamed notes to bare noteheads** — Modify `position_noteheads()` to emit U+E0A4
4. **Re-enable stem generation** — Uncomment stem code in `mod.rs`, verify stem tests pass
5. **Re-enable beam generation** — Uncomment beam code, extend for multi-level + hooks
6. **Add algorithmic fallback** — Time-sig-aware grouping when no `<beam>` elements present
7. **Upgrade frontend rendering** — Change `<rect>` → `<polygon>` in LayoutRenderer
8. **Performance validation** — Run benchmarks, verify SC-004/SC-005

## Quick Verification

```bash
# Run existing beam/stem unit tests (should pass as-is)
cargo test -p musicore_backend test_group_beamable_notes
cargo test -p musicore_backend test_compute_beam_slope
cargo test -p musicore_backend test_create_beam
cargo test -p musicore_backend test_compute_stem_direction
cargo test -p musicore_backend test_create_stem

# Run all layout tests (regression check)
cargo test -p musicore_backend layout

# Run MusicXML import tests
cargo test -p musicore_backend musicxml

# Run full backend test suite
cargo test -p musicore_backend

# Run benchmarks
cargo bench -p musicore_backend

# Frontend tests
cd frontend && npm test
```

## Key Constants (Engraving Standards)

| Constant | Value | Meaning |
|----------|-------|---------|
| `BEAM_THICKNESS` | 10.0 | 0.5 staff spaces — beam line height |
| `INTER_BEAM_GAP` | 5.0 | 0.25 staff spaces — gap between beam levels |
| `BEAM_HOOK_LENGTH` | 15.0 | 0.75 staff spaces — partial beam length |
| `MIN_BEAMED_STEM_LENGTH` | 50.0 | 2.5 staff spaces — minimum stem for beamed notes |
| `MAX_SLOPE` | 0.5 | Maximum slope (staff spaces per note) |
| `STEM_THICKNESS` | 1.5 | Stem line width |

## Out of Scope

- Cross-staff beaming (piano treble/bass)
- Fan beams (feathered accelerando/ritardando)
- Tremolo slashes (semantically different from beams)
- Grace note beaming
- Vocal beaming rules (one syllable = one flag)
