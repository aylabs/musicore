# Contract: WASM Layout API

**Feature**: 023-multi-instrument-play  
**Date**: 2026-02-16  
**Type**: WASM function contract (Rust → JavaScript)

## Overview

The layout engine is exposed to the frontend via a single WASM function. This contract documents the input/output format and behavioral changes for multi-instrument support.

---

## Function: `compute_layout_wasm`

**Rust signature** (`backend/src/layout/wasm.rs`):
```rust
#[wasm_bindgen]
pub fn compute_layout_wasm(score_json: &str, config_json: &str) -> Result<JsValue, JsValue>
```

**TypeScript wrapper** (`frontend/src/wasm/layout.ts`):
```typescript
export async function computeLayout(score: any, config?: LayoutConfig): Promise<GlobalLayout>
```

**No signature changes required.** The function accepts a score JSON string and returns a `GlobalLayout` object. The multi-instrument change is entirely in the data flowing through this function.

---

## Input Contract: Score JSON

### Before (single instrument consumed)
```json
{
  "instruments": [
    {
      "id": "piano-1",
      "name": "Piano",
      "staves": [
        { "clef": "Treble", "voices": [{ "notes": [...] }] },
        { "clef": "Bass", "voices": [{ "notes": [...] }] }
      ]
    }
  ]
}
```

### After (all instruments consumed)
```json
{
  "instruments": [
    {
      "id": "piano-1",
      "name": "Piano",
      "staves": [
        { "clef": "Treble", "voices": [{ "notes": [...] }] },
        { "clef": "Bass", "voices": [{ "notes": [...] }] }
      ]
    },
    {
      "id": "violin-1",
      "name": "Violin",
      "staves": [
        { "clef": "Treble", "voices": [{ "notes": [...] }] }
      ]
    }
  ]
}
```

**Change**: The `instruments` array now contains ALL instruments. Previously, the frontend truncated this to 1 element before sending.

**Required fields per instrument**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string (UUID) | Yes | Unique instrument identifier |
| `name` | string | Yes | Human-readable name (NEW: now consumed by engine) |
| `staves` | array | Yes | 1+ staves per instrument |

**Required fields per staff**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `clef` | string | Yes | `"Treble"` or `"Bass"` |
| `voices` | array | Yes | 1+ voices (only voice 0 is rendered) |

---

## Output Contract: GlobalLayout

### Before (single StaffGroup per system)
```json
{
  "systems": [{
    "index": 0,
    "bounding_box": { "x": 20, "y": 0, "width": 2400, "height": 600 },
    "staff_groups": [{
      "instrument_id": "piano-1",
      "staves": [...],
      "bracket_type": "Brace",
      "bracket_glyph": { ... }
    }],
    "tick_range": { "start_tick": 0, "end_tick": 3840 },
    "measure_number": { "number": 1, "position": { "x": 210, "y": -10 } }
  }],
  "total_width": 2440,
  "total_height": 800,
  "units_per_space": 20
}
```

### After (multiple StaffGroups per system)
```json
{
  "systems": [{
    "index": 0,
    "bounding_box": { "x": 20, "y": 0, "width": 2400, "height": 1400 },
    "staff_groups": [
      {
        "instrument_id": "piano-1",
        "instrument_name": "Piano",
        "staves": [...],
        "bracket_type": "Brace",
        "bracket_glyph": { ... },
        "name_label": {
          "text": "Piano",
          "position": { "x": 30, "y": 210 },
          "font_size": 14,
          "font_family": "serif",
          "color": { "r": 0, "g": 0, "b": 0, "a": 255 }
        }
      },
      {
        "instrument_id": "violin-1",
        "instrument_name": "Violin",
        "staves": [...],
        "bracket_type": "None",
        "bracket_glyph": null,
        "name_label": {
          "text": "Violin",
          "position": { "x": 30, "y": 810 },
          "font_size": 14,
          "font_family": "serif",
          "color": { "r": 0, "g": 0, "b": 0, "a": 255 }
        }
      }
    ],
    "tick_range": { "start_tick": 0, "end_tick": 3840 },
    "measure_number": { "number": 1, "position": { "x": 210, "y": -10 } }
  }],
  "total_width": 2440,
  "total_height": 1600,
  "units_per_space": 20
}
```

**Changes in output**:
| Aspect | Before | After |
|--------|--------|-------|
| `staff_groups` per system | 1 | 1 per instrument (N) |
| `StaffGroup.instrument_name` | absent | present (string) |
| `StaffGroup.name_label` | absent | present (NameLabel object) |
| `System.bounding_box.height` | single instrument height | all instruments + inter-instrument gaps |
| `GlobalLayout.total_height` | smaller | larger (sum of taller systems) |
| Stave y-positions | overlap for multi-instrument | correctly spaced |

---

## Config Contract: LayoutConfig

**No changes required.** Existing config fields are sufficient:

```json
{
  "max_system_width": 2400.0,
  "units_per_space": 20.0,
  "system_spacing": 200.0,
  "system_height": 600.0
}
```

Note: `system_height` in config becomes a fallback/minimum. The actual system height is dynamically computed based on instrument count.

---

## Error Cases

| Condition | Behavior |
|-----------|----------|
| Empty `instruments` array | Returns layout with 0 systems (existing behavior) |
| Instrument with empty `name` | Uses `"Instrument"` as default name |
| Instrument with 0 staves | Skipped (not rendered) |
| Instrument with 0 notes in all voices | Staff lines rendered, no note glyphs |
| 20+ instruments | System height grows; no hard limit |
