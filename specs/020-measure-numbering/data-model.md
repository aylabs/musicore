# Data Model: Measure Numbering

**Feature**: 020-measure-numbering  
**Date**: 2026-02-15

## Entities

### MeasureNumber

A positioned text element representing the 1-based measure number at the start of a system.

| Field | Type | Description |
|-------|------|-------------|
| `number` | `u32` | 1-based measure number (derived from `tick_range.start_tick / 3840 + 1`) |
| `position` | `Point` | Absolute (x, y) coordinates for rendering. x = clef x-position (60.0); y = topmost staff line y - 30.0 |

**Relationships**:
- Belongs to `System` (one per system, stored as `Option<MeasureNumber>`)
- Derived from `System.tick_range.start_tick`
- Horizontally aligned with `Glyph` (clef structural glyph, x=60.0)

**Validation rules**:
- `number` must be ≥ 1
- `position.x` must equal the clef x-position (60.0)
- `position.y` must be less than the topmost staff line y-position (above the staff)

### System (modified)

Existing entity. A horizontal group of staves fitting on one visual line.

| Field | Type | Change |
|-------|------|--------|
| `index` | `usize` | Existing — no change |
| `bounding_box` | `BoundingBox` | Existing — no change |
| `staff_groups` | `Vec<StaffGroup>` | Existing — no change |
| `tick_range` | `TickRange` | Existing — no change |
| `measure_number` | `Option<MeasureNumber>` | **NEW** — The positioned measure number for this system |

**State transitions**: None. `MeasureNumber` is computed once during layout and is immutable.

## Derivation Logic

```
For each system:
  measure_index = system.tick_range.start_tick / 3840   (0-based, integer division)
  measure_number = measure_index + 1                     (1-based)
  
  position.x = 60.0                                      (clef x-position)
  position.y = system.bounding_box.y - 30.0              (above topmost staff line)
```

## Existing Entities Referenced (unchanged)

| Entity | Role in this feature |
|--------|---------------------|
| `Point` | Reused for `MeasureNumber.position` (fields: `x: f32`, `y: f32`) |
| `BoundingBox` | Referenced for system and staff positioning (fields: `x`, `y`, `width`, `height`) |
| `TickRange` | Source of measure derivation (fields: `start_tick: u32`, `end_tick: u32`) |
| `Glyph` | Structural glyph for clef — provides horizontal alignment reference (x=60.0) |
