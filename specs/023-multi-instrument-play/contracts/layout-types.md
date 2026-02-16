# Contract: Layout Types (Rust ↔ TypeScript)

**Feature**: 023-multi-instrument-play  
**Date**: 2026-02-16  
**Type**: WASM serialization contract (serde_json ↔ JSON ↔ TypeScript)

## Overview

The Rust layout engine serializes `GlobalLayout` via `serde_json` / `serde_wasm_bindgen`. TypeScript types in `frontend/src/wasm/layout.ts` must mirror the Rust struct shapes exactly. This contract documents the changes for multi-instrument support.

---

## Changed Types

### StaffGroup

**Rust** (`backend/src/layout/types.rs`):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffGroup {
    pub instrument_id: String,
    pub instrument_name: String,         // ADDED
    pub staves: Vec<Staff>,
    pub bracket_type: BracketType,
    pub bracket_glyph: Option<BracketGlyph>,
    pub name_label: Option<NameLabel>,   // ADDED
}
```

**TypeScript** (`frontend/src/wasm/layout.ts`):
```typescript
export interface StaffGroup {
  instrument_id: string;
  instrument_name: string;         // ADDED
  staves: Staff[];
  bracket_type: BracketType;
  bracket_glyph?: BracketGlyph;
  name_label?: NameLabel;          // ADDED
}
```

**JSON wire format** (example):
```json
{
  "instrument_id": "abc-123",
  "instrument_name": "Piano",
  "staves": [...],
  "bracket_type": "Brace",
  "bracket_glyph": { ... },
  "name_label": {
    "text": "Piano",
    "position": { "x": 30.0, "y": 210.0 },
    "font_size": 14.0,
    "font_family": "serif",
    "color": { "r": 0, "g": 0, "b": 0, "a": 255 }
  }
}
```

---

### NameLabel (New)

**Rust** (`backend/src/layout/types.rs`):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NameLabel {
    pub text: String,
    pub position: Point,
    pub font_size: f32,
    pub font_family: String,
    pub color: Color,
}
```

**TypeScript** (`frontend/src/wasm/layout.ts`):
```typescript
export interface NameLabel {
  text: string;
  position: Point;
  font_size: number;
  font_family: string;
  color: Color;
}
```

---

## Unchanged Types (reference)

These types are NOT modified but are referenced by the changed types:

- `GlobalLayout` — unchanged (systems, total_width, total_height, units_per_space)
- `System` — unchanged structurally (height computed differently but same fields)
- `Staff` — unchanged
- `BracketType` — unchanged (`Brace` | `Bracket` | `None`)
- `BracketGlyph` — unchanged
- `Point` — unchanged (`x: f32, y: f32`)
- `Color` — unchanged (`r: u8, g: u8, b: u8, a: u8`)
- `SourceReference` — unchanged (already contains `instrument_id`)

---

## Contract Test Requirements

A contract test MUST verify:

1. **Rust serialization**: `StaffGroup` serializes to JSON with `instrument_name` and `name_label` fields present
2. **TypeScript deserialization**: `computeLayout()` return value has `instrument_name` and `name_label` on each `StaffGroup`
3. **Multi-instrument layout**: A 2-instrument score produces 2 `StaffGroup` entries per system
4. **Backward compatibility**: Single-instrument scores still produce valid layout with 1 `StaffGroup` per system
5. **Field completeness**: `name_label.position`, `name_label.font_size`, `name_label.text` are all present and non-null when `name_label` is set

---

## Breaking Changes

| Change | Impact | Migration |
|--------|--------|-----------|
| `StaffGroup.instrument_name` added | Non-breaking (additive field) | None — `serde` includes it in JSON automatically |
| `StaffGroup.name_label` added | Non-breaking (`Option` / `?` field) | None — `None` serializes as `null` or omitted |
| System height increase | Visual change | None — scroll/zoom automatically adapts |
| Multiple `StaffGroup`s per system | Renderer must handle it | Already handled — renderer iterates `staff_groups` |

All changes are **additive**. No existing fields are removed or renamed. No version bump required for the WASM API contract.
