# Contract: Beam Layout Data (021)

**Generated**: 2026-02-15  
**Boundary**: Backend Rust layout engine → Frontend TypeScript renderer (via WASM JSON)

## Overview

This contract defines how beam and stem data flows from the Rust layout engine to the TypeScript frontend renderer through the existing `GlobalLayout` JSON structure. **No new TypeScript interfaces are needed** — beams and stems are encoded as `Glyph` objects with special codepoints, which the renderer already handles.

## Existing Interface (Unchanged)

```typescript
// frontend/src/wasm/layout.ts — NO CHANGES
interface Glyph {
  position: Point;        // { x, y }
  bounding_box: BoundingBox;  // { x, y, width, height }
  codepoint: string;      // Single character — the glyph to render
  source_reference?: SourceReference;
}

interface GlyphRun {
  glyphs: Glyph[];
  font_family: string;
  font_size: number;
  color: Color;
  opacity: number;
}
```

## Beam Encoding Convention

Beams and stems use **reserved codepoints** within the existing `Glyph` interface:

### Stem Glyph (codepoint `\u0000`)

A vertical line from notehead to beam (or standard length for unbeamed notes).

| Glyph Field | Encoding |
|-------------|----------|
| `codepoint` | `'\u0000'` (null character) |
| `position.x` | Stem X coordinate (right edge of notehead for stem-up, left edge for stem-down) |
| `position.y` | `min(y_start, y_end)` — top of stem line |
| `bounding_box.x` | `stem.x - stem.thickness / 2` |
| `bounding_box.y` | `min(y_start, y_end)` |
| `bounding_box.width` | `stem.thickness` (1.5 units) |
| `bounding_box.height` | `abs(y_end - y_start)` — stem length |

**Renderer behavior**: Draw SVG `<line>` from `(position.x, position.y)` to `(position.x, position.y + bounding_box.height)` with `stroke-width = bounding_box.width`.

### Beam Glyph (codepoint `\u0001`)

A thick line connecting stem endpoints across a beam group. One `Glyph` per beam line segment.

| Glyph Field | Encoding |
|-------------|----------|
| `codepoint` | `'\u0001'` (SOH character) |
| `position.x` | `beam.x_start` |
| `position.y` | `beam.y_start` |
| `bounding_box.x` | `beam.x_start` |
| `bounding_box.y` | `min(beam.y_start, beam.y_end)` |
| `bounding_box.width` | `beam.x_end - beam.x_start` |
| `bounding_box.height` | `beam.thickness` (10.0 units) |

**Renderer behavior**: Draw SVG `<polygon>` with 4 points:
```
(x_start, y_start)
(x_end, y_end)
(x_end, y_end + thickness)
(x_start, y_start + thickness)
```

Note: `y_start` and `y_end` may differ (sloped beam). The `bounding_box` provides the axis-aligned bounding rectangle for culling purposes. The `position` provides the actual left endpoint for rendering.

### Notehead Glyph (for beamed notes)

When a note participates in a beam group, it uses a **bare notehead** glyph instead of a combined head+stem+flag glyph:

| Duration | Current Codepoint | Beamed Codepoint | Glyph Name |
|----------|-------------------|-------------------|------------|
| Quarter (960) | `U+E1D5` (noteheadBlackWithStem) | `U+E1D5` (unchanged — not beamed) | n/a |
| Eighth (480) | `U+E1D7` (noteEighthUp) | `U+E0A4` (noteheadBlack) | `noteheadBlack` |
| Sixteenth (240) | `U+E1D9` (noteSixteenthUp) | `U+E0A4` (noteheadBlack) | `noteheadBlack` |
| 32nd (120) | `U+E1DB` (note32ndUp) | `U+E0A4` (noteheadBlack) | `noteheadBlack` |
| 64th (60) | `U+E1DD` (note64thUp) | `U+E0A4` (noteheadBlack) | `noteheadBlack` |
| 128th (30) | `U+E1DF` (note128thUp) | `U+E0A4` (noteheadBlack) | `noteheadBlack` |

## Multi-Level Beam Layout

For a beam group with mixed durations (e.g., two eighths + two sixteenths), multiple beam `Glyph` objects are emitted:

```
Level 1 (primary beam): spans all notes in the group
  → 1 beam Glyph with codepoint \u0001

Level 2 (secondary beam): spans only sixteenth-note subsets
  → 1 or more beam Glyphs with codepoint \u0001
  → Hooks: shorter beam segments (BEAM_HOOK_LENGTH = 15.0)
```

Each beam level is offset vertically by `BEAM_THICKNESS + INTER_BEAM_GAP = 15.0` units from the previous level.

## Data Flow

```
Rust compute_layout()
  ├── position_noteheads()
  │     └── Beamed notes emit Glyph(codepoint=U+E0A4)
  │         Unbeamed notes emit Glyph(codepoint=U+E1D7 etc.)
  ├── create_stem() per beamed note
  │     └── Emit Glyph(codepoint=\u0000)
  ├── create_beams() per beam group per level
  │     └── Emit Glyph(codepoint=\u0001)
  └── batch_glyphs() groups by codepoint
        └── Stems form separate GlyphRun
        └── Beams form separate GlyphRun
        └── Noteheads form separate GlyphRun
              ↓
         JSON serialization via WASM
              ↓
Frontend LayoutRenderer.tsx
  └── renderGlyphRun() → renderGlyph()
        ├── \u0000 → SVG <line> (stem)
        ├── \u0001 → SVG <polygon> (beam)  ← CHANGED from <rect>
        └── other  → SVG <text> (notehead)
```

## Backward Compatibility

- Scores rendered **without** beaming (e.g., scores with only quarter notes and longer) produce the **exact same JSON output** as before. No beam or stem glyphs are emitted for unbeamed notes.
- The Frontend renderer changes are **additive** — the existing `<rect>` beam rendering is replaced with `<polygon>`, which is visually equivalent for flat beams and adds slope support.
- The `GlobalLayout`, `GlyphRun`, `Glyph`, and all TypeScript interfaces remain **unchanged**.
