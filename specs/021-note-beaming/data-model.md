# Data Model: Note Beaming (021)

**Generated**: 2026-02-15

## Entities

### BeamData (MusicXML import layer)

Represents a single beam annotation on a parsed MusicXML note.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| number | u8 | Beam level (1=8th, 2=16th, 3=32nd, 4=64th, 5=128th) | 1–8 |
| beam_type | BeamType | Beam state at this note for this level | Must be a valid BeamType variant |

### BeamType (enum)

| Variant | MusicXML Value | Description |
|---------|---------------|-------------|
| Begin | `"begin"` | Start of a beam group at this level |
| Continue | `"continue"` | Middle note — beam passes through |
| End | `"end"` | End of a beam group at this level |
| ForwardHook | `"forward hook"` | Partial beam extending forward (right) |
| BackwardHook | `"backward hook"` | Partial beam extending backward (left) |

### NoteData (extended — MusicXML import layer)

Existing entity with new field added.

| Field | Type | Description | New? |
|-------|------|-------------|------|
| pitch | Option\<PitchData\> | Note pitch (None for rests) | Existing |
| duration | i32 | Duration in MusicXML divisions | Existing |
| voice | usize | Voice number | Existing |
| staff | usize | Staff number | Existing |
| note_type | Option\<String\> | Duration name ("quarter", "eighth") | Existing |
| is_chord | bool | Part of a chord | Existing |
| **beams** | **Vec\<BeamData\>** | **Beam annotations parsed from `<beam>` elements** | **NEW** |

### NoteEvent (extended — layout layer)

Existing entity in the layout pipeline with new field added.

| Field | Type | Description | New? |
|-------|------|-------------|------|
| pitch | u8 | MIDI pitch | Existing |
| start_tick | u32 | Start position in ticks (960 PPQ) | Existing |
| duration_ticks | u32 | Duration in ticks | Existing |
| spelling | Option\<(char, i8)\> | Enharmonic spelling | Existing |
| **beam_info** | **Vec\<BeamData\>** | **Beam annotations from MusicXML (empty = needs algorithmic grouping)** | **NEW** |

### BeamGroup (layout computation)

A set of consecutive notes to be connected by beams. Computed during layout.

| Field | Type | Description |
|-------|------|-------------|
| notes | Vec\<BeamableNote\> | Notes in the group, ordered by tick |
| stem_direction | StemDirection | Uniform stem direction for the group |
| beam_count | u8 | Number of beam levels (1 for 8ths, 2 for 16ths, etc.) |

### BeamableNote (existing, extended)

Currently defined in `beams.rs`. Extended with beam level information.

| Field | Type | Description | New? |
|-------|------|-------------|------|
| x | f32 | Horizontal position (layout units) | Existing |
| y | f32 | Notehead Y position | Existing |
| stem_end_y | f32 | End of stem Y position | Existing |
| tick | u32 | Temporal position | Existing |
| duration_ticks | u32 | Note duration in ticks | Existing |
| **beam_levels** | **u8** | **Number of beam levels this note participates in** | **NEW** |
| **beam_types** | **Vec\<BeamType\>** | **Beam type per level (Begin/Continue/End/Hook)** | **NEW** |

### Beam (existing, extended for multi-level)

Currently defined in `beams.rs`. One `Beam` struct per beam line segment.

| Field | Type | Description | New? |
|-------|------|-------------|------|
| x_start | f32 | Left X coordinate | Existing |
| y_start | f32 | Left Y coordinate (at beam level) | Existing |
| x_end | f32 | Right X coordinate | Existing |
| y_end | f32 | Right Y coordinate (at beam level) | Existing |
| thickness | f32 | Beam thickness (10.0 = 0.5 staff spaces) | Existing |
| **level** | **u8** | **Beam level (1=primary, 2=secondary, etc.)** | **NEW** |
| **is_hook** | **bool** | **True if this is a partial beam (hook)** | **NEW** |

### Stem (existing, unchanged)

Already complete in `stems.rs`. No changes needed.

| Field | Type | Description |
|-------|------|-------------|
| x | f32 | X position |
| y_start | f32 | Start Y (at notehead) |
| y_end | f32 | End Y (at beam or standard length) |
| direction | StemDirection | Up or Down |
| thickness | f32 | Line thickness (1.5 units) |

### StemDirection (existing, unchanged)

| Variant | Description |
|---------|-------------|
| Up | Stem extends upward from notehead |
| Down | Stem extends downward from notehead |

## Entity Relationships

```
MusicXML File
    │
    ▼ parse_note()
NoteData (with beams: Vec<BeamData>)
    │
    ▼ extract_instruments()
NoteEvent (with beam_info: Vec<BeamData>)
    │
    ▼ position_glyphs_for_staff()
    ├── BeamGroup (computed from beam_info or algorithmic grouping)
    │     ├── notes: Vec<BeamableNote>
    │     └── stem_direction: StemDirection
    │
    ▼ stems::create_stem() per beamed note
    ├── Stem → encoded as Glyph (codepoint U+0000)
    │
    ▼ beams::create_beams() per group per level
    └── Beam → encoded as Glyph (codepoint U+0001)
```

## State Transitions

### Beam Group Formation

```
Notes with beam_info present (MusicXML):
  Begin  → Start new group, add note
  Continue → Add note to current group
  End    → Add note, finalize group
  ForwardHook → Add partial beam marker
  BackwardHook → Add partial beam marker

Notes without beam_info (algorithmic):
  Note at beat start → Start new group
  Note within same beat → Add to current group
  Note at next beat → Finalize current group, start new group
  Rest encountered → Finalize current group
  Quarter note or longer → Skip (not beamable)
  Single note in group → Discard group (render with flag)
```

## Validation Rules

- Beam number must be 1–8
- BeamType must be a valid variant
- A BeamGroup must contain at least 2 notes (single-note groups render with flags)
- All notes in a BeamGroup must be in the same measure (no cross-barline beams)
- All notes in a BeamGroup must have `duration_ticks ≤ 480` (eighth note or shorter)
- Beam slope must be clamped to `MAX_SLOPE = 0.5` staff spaces per note
- Minimum stem length for beamed notes: 50.0 units (2.5 staff spaces)
- Inter-beam gap: 5.0 units (0.25 staff spaces)
- Beam hook length: 15.0 units (0.75 staff spaces)

## Constants (New)

| Constant | Value | Units | Location |
|----------|-------|-------|----------|
| INTER_BEAM_GAP | 5.0 | layout units | beams.rs |
| MIN_BEAMED_STEM_LENGTH | 50.0 | layout units | stems.rs |
| MIN_LEDGER_STEM_LENGTH | 60.0 | layout units | stems.rs |
| BEAM_HOOK_LENGTH | 15.0 | layout units | beams.rs |
| BEAM_THICKNESS | 10.0 | layout units | beams.rs (existing) |
| MAX_SLOPE | 0.5 | spaces/note | beams.rs (existing) |
| STEM_THICKNESS | 1.5 | layout units | stems.rs (existing) |
