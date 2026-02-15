# WASM Layout Contract: Measure Numbering

**Feature**: 020-measure-numbering  
**Date**: 2026-02-15  
**Contract type**: WASM interface (Rust → TypeScript via JSON serialization)

## Contract Description

The layout engine (Rust/WASM) produces a `GlobalLayout` JSON that the frontend renderer consumes. This contract defines the additions to the existing `System` interface and the new `MeasureNumber` type.

## Interface Changes

### New Type: `MeasureNumber`

**Rust** (`backend/src/layout/types.rs`):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasureNumber {
    pub number: u32,
    #[serde(serialize_with = "round_f32")]
    pub position: Point,
}
```

**TypeScript** (`frontend/src/wasm/layout.ts`):
```typescript
export interface MeasureNumber {
  number: number;
  position: Point;
}
```

### Modified Type: `System`

**Rust** — add field:
```rust
pub struct System {
    pub index: usize,
    pub bounding_box: BoundingBox,
    pub staff_groups: Vec<StaffGroup>,
    pub tick_range: TickRange,
    pub measure_number: Option<MeasureNumber>,  // NEW
}
```

**TypeScript** — add field:
```typescript
export interface System {
  index: number;
  bounding_box: BoundingBox;
  staff_groups: StaffGroup[];
  tick_range: TickRange;
  measure_number?: MeasureNumber;  // NEW
}
```

## JSON Wire Format

### Example: System with measure number

```json
{
  "index": 0,
  "bounding_box": { "x": 0.0, "y": 0.0, "width": 1600.0, "height": 600.0 },
  "staff_groups": [ "..." ],
  "tick_range": { "start_tick": 0, "end_tick": 15360 },
  "measure_number": {
    "number": 1,
    "position": { "x": 60.0, "y": -30.0 }
  }
}
```

### Example: System 2 starting at measure 5

```json
{
  "index": 1,
  "bounding_box": { "x": 0.0, "y": 800.0, "width": 1600.0, "height": 600.0 },
  "staff_groups": [ "..." ],
  "tick_range": { "start_tick": 15360, "end_tick": 30720 },
  "measure_number": {
    "number": 5,
    "position": { "x": 60.0, "y": 770.0 }
  }
}
```

### Example: System without measure number (empty score)

```json
{
  "index": 0,
  "bounding_box": { "x": 0.0, "y": 0.0, "width": 1600.0, "height": 600.0 },
  "staff_groups": [],
  "tick_range": { "start_tick": 0, "end_tick": 0 },
  "measure_number": null
}
```

## Backward Compatibility

- `measure_number` is `Option<T>` / optional field
- Existing JSON without the field deserializes to `None` / `undefined`
- Existing tests and fixtures are not broken
- Renderer handles missing `measure_number` gracefully (nothing rendered)

## Rendering Contract

The renderer MUST:
1. Read `system.measure_number` from the layout data
2. If present, render a `<text>` SVG element at the given `position` coordinates
3. Use a standard text font (`system-ui, sans-serif`), NOT the SMuFL/Bravura font
4. Use a small font size (14px) appropriate for measure number display
5. NOT compute or derive any positioning — use coordinates as provided

The renderer MUST NOT:
1. Calculate measure numbers from tick ranges
2. Modify the x or y position from the layout engine
3. Use the SMuFL font for measure number text
4. Render more than one measure number per system
