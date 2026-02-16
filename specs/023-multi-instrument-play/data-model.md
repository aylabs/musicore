# Data Model: Multi-Instrument Play View

**Feature**: 023-multi-instrument-play  
**Date**: 2026-02-16

## Entity Changes

### 1. StaffGroup (Modified)

**Location**: `backend/src/layout/types.rs` (Rust) + `frontend/src/wasm/layout.ts` (TypeScript)

#### Rust Definition (after change)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffGroup {
    pub instrument_id: String,
    pub instrument_name: String,       // NEW — FR-009
    pub staves: Vec<Staff>,
    pub bracket_type: BracketType,
    pub bracket_glyph: Option<BracketGlyph>,
    pub name_label: Option<NameLabel>,  // NEW — FR-003: Position/text for rendering
}
```

#### TypeScript Definition (after change)

```typescript
interface StaffGroup {
  instrument_id: string;
  instrument_name: string;       // NEW — FR-009
  staves: Staff[];
  bracket_type: BracketType;
  bracket_glyph?: BracketGlyph;
  name_label?: NameLabel;        // NEW — FR-003
}
```

#### New Fields

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `instrument_name` | `String` / `string` | Human-readable instrument name | `Instrument.name` from domain model |
| `name_label` | `Option<NameLabel>` / `NameLabel?` | Positioned text element for the instrument name. Computed by the layout engine (Principle VI). | Computed in `compute_layout()` |

---

### 2. NameLabel (New)

**Location**: `backend/src/layout/types.rs` (Rust) + `frontend/src/wasm/layout.ts` (TypeScript)

#### Rust Definition

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

#### TypeScript Definition

```typescript
interface NameLabel {
  text: string;
  position: Point;
  font_size: number;
  font_family: string;
  color: Color;
}
```

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `text` | `String` / `string` | The instrument name text to render |
| `position` | `Point` | X,Y coordinates for the label (computed by layout engine) |
| `font_size` | `f32` / `number` | Font size in layout units |
| `font_family` | `String` / `string` | Font family (e.g., "serif") |
| `color` | `Color` | RGBA text color |

---

### 3. InstrumentData (Modified — internal)

**Location**: `backend/src/layout/mod.rs` (internal struct, not serialized)

#### After Change

```rust
struct InstrumentData {
    id: String,
    name: String,    // NEW — extracted from score JSON
    staves: Vec<StaffData>,
}
```

#### New Field

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `name` | `String` | Instrument name from score | `instrument["name"]` in score JSON |

---

### 4. System (Unchanged — behavioral change only)

**Location**: `backend/src/layout/types.rs`

```rust
pub struct System {
    pub index: usize,
    pub bounding_box: BoundingBox,     // Height NOW accounts for all instruments
    pub staff_groups: Vec<StaffGroup>, // Already supports multiple
    pub tick_range: TickRange,
    pub measure_number: Option<MeasureNumber>,
}
```

**Behavioral change**: `bounding_box.height` will now be computed as:
```
total_staves = sum(instrument.staves.len() for each instrument)
intra_staff_height = (total_staves - 1 within each instrument) × 20.0 × units_per_space
inter_instrument_gap = (num_instruments - 1) × 30.0 × units_per_space
system_content_height = intra_staff_height + inter_instrument_gap + 8.0 × units_per_space + 40.0
```

---

### 5. ConvertedScore (Modified — frontend)

**Location**: `frontend/src/components/layout/LayoutView.tsx` (inline interface)

#### After Change

```typescript
interface ConvertedScore {
  instruments: Array<{   // NOW contains ALL instruments, not just [0]
    id: string;
    name: string;
    staves: Array<{
      clef: string;
      time_signature: { numerator: number; denominator: number };
      key_signature: { sharps: number };
      voices: Array<{
        notes: Array<{
          tick: number; duration: number; pitch: number;
          articulation: null; spelling?: { step: string; alter: number };
        }>;
      }>;
    }>;
  }>;
  tempo_changes: unknown[];
  time_signature_changes: unknown[];
}
```

**Behavioral change**: The `instruments` array will contain ALL instruments from `score.instruments`, not just the first.

---

## Entity Relationships

```
Score
 └── instruments: Instrument[]  (1..N)
       ├── id: string (UUID)
       ├── name: string
       └── staves: Staff[] (1..N)

   ↓ convertScoreToLayoutFormat (frontend)

ConvertedScore.instruments[]  (1..N, was 1)
   ↓ compute_layout_wasm (Rust WASM)

GlobalLayout
 └── systems: System[]  (1..N)
       └── staff_groups: StaffGroup[]  (1 per instrument per system)
             ├── instrument_id: string
             ├── instrument_name: string (NEW)
             ├── name_label: NameLabel (NEW, positioned text)
             ├── staves: Staff[]
             └── bracket_glyph?: BracketGlyph

   ↓ LayoutRenderer (frontend SVG)

SVG output with:
  - <text> elements for instrument names
  - All instrument staves rendered per system
  - Correct vertical spacing between instruments
```

## Validation Rules

1. `instrument_name` MUST NOT be empty — defaults to `"Instrument"` if missing from score JSON
2. `name_label.position.x` MUST be < bracket x position (name appears before bracket)
3. `name_label.position.y` MUST be vertically centered within the staff group's bounding box
4. System `bounding_box.height` MUST be >= sum of all staff group heights + inter-instrument gaps
5. No two staff groups within a system may have overlapping y-ranges

## State Transitions

Not applicable — layout is stateless (pure function from score → geometry). No state machines or lifecycle transitions.
