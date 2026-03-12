# Research: Key Signatures

**Branch**: `046-key-signatures` | **Date**: 2026-03-12

## Summary

The key signature rendering pipeline is almost entirely in place. Two pre-existing bugs block correct display. All unknowns are now resolved through direct codebase investigation.

---

## Finding 1: Full Pipeline Already Wired

The rendering pipeline for key signatures is already complete end-to-end:

```
Score (staff_structural_events with KeySignatureEvent)
  ↓  LayoutView.tsx → convertScoreToLayoutFormat()
JSON: { key_signature: { sharps: N }, clef: "Bass" }
  ↓  compute_layout() [WASM] → backend/src/layout/mod.rs
position_key_signature(sharps, clef_type, x_start, ...)
  ↓  Returns Vec<Glyph> → appended to structural_glyphs
LayoutRenderer.tsx → iterates structural_glyphs → SVG <text> elements
```

**Sources**:
- `backend/src/layout/mod.rs:472` — `compute_layout()` calls `position_key_signature(staff_data.key_sharps, &staff_data.clef, 120.0, ...)`
- `frontend/src/components/LayoutRenderer.tsx:930` — already renders all `structural_glyphs` via `renderGlyph()`
- `frontend/src/components/layout/LayoutView.tsx:127–154` — already extracts key signature from `staff_structural_events` and converts to `{ sharps: N }`

**Decision**: No new WASM exports, no new rendering code, no new components needed.

---

## Finding 2: Bug — `position_key_signature()` Ignores Clef Type

**File**: `backend/src/layout/positioner.rs:464`

```rust
pub fn position_key_signature(
    sharps: i8,
    _clef_type: &str,   // ← underscore prefix = intentionally unused
    x_start: f32,
    units_per_space: f32,
    staff_vertical_offset: f32,
) -> Vec<Glyph> {
    // Always uses treble positions regardless of _clef_type
    let treble_sharp_positions = vec![-10.0, 20.0, -20.0, 10.0, 40.0, 0.0, 30.0];
    let treble_flat_positions  = vec![30.0, 0.0, 40.0, 10.0, 50.0, 20.0, 60.0];
    ...
```

The function receives the clef type (`compute_layout` passes `&staff_data.clef`, which is `"Treble"`, `"Bass"`, `"Alto"`, or `"Tenor"`) but ignores it. For treble clef staves, key signatures display correctly. For bass, alto, and tenor staves, accidentals appear at treble-clef positions — wrong by 0–6 staff positions depending on the pitch.

**Fix**: Remove the underscore prefix, add a `match clef_type { ... }` dispatch that returns the correct position tables for each clef.

---

## Finding 3: Bug — Frontend Key Signature Extraction May Have Type Mismatch

**File**: `frontend/src/components/layout/LayoutView.tsx:127–154`

```typescript
const keySig = firstKeySigEvent.KeySignature.key;   // runtime type needs verification
const keyMap: { [key: string]: number } = {
  'CMajor': 0, 'GMajor': 1, ...
};
keySharps = keyMap[keySig] || 0;   // always 0 if keySig is a number
```

**Root cause**: `KeySignature` in Rust is `pub struct KeySignature(i8)` with `#[derive(Serialize)]`. Rust serde serializes newtype structs transparently — `KeySignature(1)` → JSON `1` (just a number). The TypeScript type `KeySignature = "CMajor" | "GMajor" | ...` (a string union) does NOT match this runtime format.

**Effect**: `keyMap[1]` evaluates to `keyMap["1"]` (JS auto-converts number key), which is `undefined`. So `keySharps = undefined || 0 = 0` always. All key signatures are silently treated as C major (no accidentals) regardless of the actual score.

> **Note for implementation**: Verify the actual JSON by logging `firstKeySigEvent` in development with a non-C-major score (e.g., Chopin Nocturne in Eb major). If the value is a number, apply the fix below. If it's somehow a named string, the fix still doesn't hurt.

**Fix**: Update the extraction to handle numeric values directly:
```typescript
const keySig = firstKeySigEvent.KeySignature.key;
// Handle numeric serialization from Rust: KeySignature(i8) → JSON number
keySharps = typeof keySig === 'number'
  ? keySig
  : (keyMap[keySig as string] ?? 0);
```

Also update `frontend/src/types/score.ts` type to match backend serialization:
```typescript
// Before (wrong): export type KeySignature = "CMajor" | "GMajor" | ...
// After (correct): KeySignature is a number from -7 to +7
export type KeySignature = number;
```

---

## Finding 4: Correct Accidental Positions Per Clef

**Coordinate system** (from `create_staff_lines()`):
- Top staff line (line 0): `y = staff_vertical_offset`
- Each successive line: `y += units_per_space` (default: 20)
- Glyphs are positioned 10 units (= 0.5 spaces) ABOVE the pitch center (empirically confirmed from treble values)

**Treble clef** (G clef; lines from top to bottom: F5, D5, B4, G4, E4):

| Order | Note | Position | y (adjusted) |
|-------|------|----------|--------------|
| Sharp 1 | F5 | top line | -10 |
| Sharp 2 | C5 | space 2 from top | 20 |
| Sharp 3 | G5 | space above staff | -20 |
| Sharp 4 | D5 | line 2 from top | 10 |
| Sharp 5 | A4 | space 3 from top | 40 |
| Sharp 6 | E5 | space 1 from top | 0 |
| Sharp 7 | B4 | line 3 (middle) | 30 |
| Flat 1 | B4 | line 3 (middle) | 30 |
| Flat 2 | E5 | space 1 from top | 0 |
| Flat 3 | A4 | space 3 from top | 40 |
| Flat 4 | D5 | line 2 from top | 10 |
| Flat 5 | G4 | line 4 from top | 50 |
| Flat 6 | C5 | space 2 from top | 20 |
| Flat 7 | F4 | space 4 from top | 60 |

*(Already implemented — verified by existing tests in positioner.rs:1395–1465)*

**Bass clef** (F clef; lines from top to bottom: A3, F3, D3, B2, G2):

| Order | Note | Position | y (adjusted) |
|-------|------|----------|--------------|
| Sharp 1 | F3 | line 2 from top | 10 |
| Sharp 2 | C3 | space 3 from top | 40 |
| Sharp 3 | G3 | space 1 from top | 0 |
| Sharp 4 | D3 | line 3 (middle) | 30 |
| Sharp 5 | A3 | top line | -10 |
| Sharp 6 | E3 | space 2 from top | 20 |
| Sharp 7 | B2 | line 4 from top | 50 |
| Flat 1 | B2 | line 4 from top | 50 |
| Flat 2 | E3 | space 2 from top | 20 |
| Flat 3 | A3 | top line | -10 |
| Flat 4 | D3 | line 3 (middle) | 30 |
| Flat 5 | G3 | space 1 from top | 0 |
| Flat 6 | C3 | space 3 from top | 40 |
| Flat 7 | F3 | line 2 from top | 10 |

**Alto clef** (C clef on middle line; lines from top to bottom: G4, E4, C4, A3, F3):

| Order | Note | Position | y (adjusted) |
|-------|------|----------|--------------|
| Sharp 1 | F4 | line 5 (bottom) | 70 |
| Sharp 2 | C4 | line 3 (middle) | 30 |
| Sharp 3 | G4 | top line | -10 |
| Sharp 4 | D4 | space 1 from top | 10 |
| Sharp 5 | A3 | line 4 from top | 50 |
| Sharp 6 | E4 | line 2 from top | 10 |
| Sharp 7 | B3 | space 2 from top | 20 |
| Flat 1 | B3 | space 2 from top | 20 |
| Flat 2 | E4 | line 2 from top | 10 |
| Flat 3 | A3 | line 4 from top | 50 |
| Flat 4 | D4 | space 1 from top | 10 |
| Flat 5 | G4 | top line | -10 |
| Flat 6 | C4 | line 3 (middle) | 30 |
| Flat 7 | F4 | line 5 (bottom) | 70 |

> **Implementation note**: Alto and tenor clef positions should be verified against a notation engraving reference (e.g., SMuFL standard or Lilypond source) before implementing. The tables above are derived from the coordinate system and clef definitions; unit tests will serve as the acceptance criterion.

**Tenor clef** (C clef on 4th line from bottom; lines from top to bottom: D4, B3, G3, E3, C3):

| Order | Note | Position | y (adjusted) |
|-------|------|----------|--------------|
| Sharp 1 | F3 | space 4 from top | 70 |
| Sharp 2 | C4 | line 2 from top | 10 |
| Sharp 3 | G3 | space 2 from top | 30 |
| Sharp 4 | D4 | top line | -10 |
| Sharp 5 | A3 | space 3 from top | 50 |
| Sharp 6 | E3 | line 4 from top | 50 |
| Sharp 7 | B3 | line 2 from top | 20 |
| Flat 1 | B3 | line 2 from top | 20 |
| Flat 2 | E3 | line 4 from top | 50 |
| Flat 3 | A3 | space 3 from top | 50 |
| Flat 4 | D4 | top line | -10 |
| Flat 5 | G3 | space 2 from top | 30 |
| Flat 6 | C4 | line 2 from top | 10 |
| Flat 7 | F3 | space 4 from top | 70 |

> **Alto/tenor implementation note**: The above positions are approximate — they must be verified by an implementation engineer against a canonical music engraving reference. The Rust unit tests for these clefs will serve as the acceptance gate.

---

## Finding 5: No WASM Bridge Changes Needed

The WASM `compute_layout()` function in `frontend/src/wasm/layout.ts` takes `key_signature: { sharps: number }` as input per staff and returns `structural_glyphs` in the `LayoutStaff`. This contract is already correct and complete. No new WASM exports are needed.

The WASM binary (`frontend/src/wasm/musicore_backend_bg.wasm`) must be recompiled after the Rust `position_key_signature()` fix — this is standard workflow (`wasm-pack build`).

---

## Finding 6: Old Rendering Path (NotationRenderer.tsx) Is Not Affected

`NotationRenderer.tsx` maps over `layout.keySignatureAccidentals` (from `NotationLayoutEngine.ts`). This is the OLD, deprecated TypeScript layout engine path (prohibited by Principle VI). It currently returns `keySignatureAccidentals: []` and will continue to do so. This feature does NOT modify that path — the correct path (Rust `compute_layout` → `structural_glyphs` → `LayoutRenderer.tsx`) is what this feature uses and fixes.

---

## Decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Where to compute key sig positions | Rust `position_key_signature()` | Mandated by Principle VI — single layout authority |
| How to fix clef dispatch | `match clef_type { "Treble" => ..., "Bass" => ..., ... }` | Follows existing pattern in `position_clef()` |
| Frontend type for KeySignature | `number` (-7 to +7) | Matches Rust `KeySignature(i8)` serde serialization |
| Frontend extraction logic | `typeof keySig === 'number' ? keySig : keyMap[keySig]` | Backward-compatible; handles both current (number) and potential future (string) formats |
| Alto/tenor position source | Standard engraving tables, verified by unit tests | Tests are the acceptance criterion; reference: Lilypond source or Elaine Gould "Behind Bars" |
| Note accidental suppression | Out of scope | Explicitly clarified in session 2026-03-12 |
| Mid-piece key changes | Silently ignored; only initial key shown | Explicitly clarified in session 2026-03-12 |
