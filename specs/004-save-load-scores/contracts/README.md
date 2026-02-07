# Score File Contracts

**Date**: 2026-02-07  
**Feature**: [spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)  
**Phase**: Phase 1 - Design

## Overview

This directory contains the JSON schema/structure for score file persistence. The format is **exactly the same** as the backend API response from `GET /api/v1/scores/:id`.

## File Format

**Extension**: `.json` or `.musicore.json`  
**Encoding**: UTF-8  
**Pretty-printing**: 2-space indentation (for human readability)  
**MIME Type**: `application/json`

## Example File

See [score-file.json](./score-file.json) for a complete example with:
- 2 instruments (Piano with 2 staves, Violin with 1 staff)
- 4 measures (3840 ticks = 4 measures at 4/4 time)
- Global tempo and time signature events
- Staff-level clef and key signature events
- Multiple voices with notes

## Schema Structure

### Root Object

```typescript
interface ScoreFile {
  id: string;                              // UUID
  global_structural_events: GlobalEvent[]; // Tempo & time signature events
  instruments: Instrument[];               // Array of instruments
}
```

### Global Structural Events

**Tempo Event**:
```typescript
{
  "Tempo": {
    "tick": number,  // Position in timeline (0+)
    "bpm": number    // Beats per minute (20-300)
  }
}
```

**Time Signature Event**:
```typescript
{
  "TimeSignature": {
    "tick": number,      // Position in timeline (0+)
    "numerator": number, // Top number (1-32)
    "denominator": number // Bottom number (1, 2, 4, 8, 16, 32)
  }
}
```

### Instruments

```typescript
interface Instrument {
  id: string;         // UUID
  name: string;       // Human-readable name (e.g., "Piano", "Violin")
  staves: Staff[];    // Array of staves (1+ for monophonic, 2 for piano)
}
```

### Staves

```typescript
interface Staff {
  id: string;                      // UUID
  clef_events: ClefEvent[];        // Clef changes
  key_signature_events: KeySignatureEvent[]; // Key signature changes
  voices: Voice[];                 // Array of voices (1+ per staff)
}
```

**Clef Event**:
```typescript
{
  "tick": number,  // Position in timeline (0+)
  "clef": "Treble" | "Bass" | "Alto" | "Tenor"
}
```

**Key Signature Event**:
```typescript
{
  "tick": number,  // Position in timeline (0+)
  "sharps": number // -7 to 7 (negative = flats, positive = sharps)
}
```

### Voices

```typescript
interface Voice {
  id: string;      // UUID
  notes: Note[];   // Array of notes
}
```

### Notes

```typescript
interface Note {
  start_tick: number;      // Start position (0+)
  duration_ticks: number;  // Duration in ticks (1+ at 960 PPQ)
  pitch: number;           // MIDI pitch (21-108, A0 to C8)
}
```

## Validation Rules

### Required Fields
- Root: `id`, `global_structural_events`, `instruments`
- Instrument: `id`, `name`, `staves`
- Staff: `id`, `clef_events`, `key_signature_events`, `voices`
- Voice: `id`, `notes`
- Note: `start_tick`, `duration_ticks`, `pitch`
- Events: `tick` plus event-specific fields

### Field Constraints

| Field | Type | Range/Format | Notes |
|-------|------|-------------|-------|
| `id` | string | UUID v4 | 36 chars with hyphens |
| `tick` | number | 0+ | Integer, 960 PPQ resolution |
| `bpm` | number | 20-300 | Integer, reasonable tempo range |
| `numerator` | number | 1-32 | Integer, time signature top |
| `denominator` | number | 1, 2, 4, 8, 16, 32 | Power of 2 only |
| `pitch` | number | 21-108 | MIDI standard (A0 to C8) |
| `duration_ticks` | number | 1+ | Integer, must be positive |
| `sharps` | number | -7 to 7 | Integer, flats negative |
| `clef` | string | "Treble", "Bass", "Alto", "Tenor" | Exact case |
| `name` | string | 1-255 chars | Non-empty |

### Default Values (New Score)

A newly created score has:
```json
{
  "id": "[generated-uuid]",
  "global_structural_events": [
    {
      "Tempo": {
        "tick": 0,
        "bpm": 120
      }
    },
    {
      "TimeSignature": {
        "tick": 0,
        "numerator": 4,
        "denominator": 4
      }
    }
  ],
  "instruments": []
}
```

## Data Fidelity

**Guarantee**: 100% round-trip fidelity (SC-001)

A score loaded from a file and then saved should produce **byte-for-byte identical JSON** (except for whitespace/formatting differences).

**Test Case**:
1. Load `score-file.json`
2. Parse and validate
3. Serialize to JSON
4. Parse again
5. Assert: All fields match original

## File Size Expectations

Based on SC-004 target (<1MB for typical scores):

| Score Size | Notes | File Size (estimate) |
|------------|-------|---------------------|
| Small (10 measures, 1 instrument) | ~40 notes | ~15 KB |
| Typical (50 measures, 5 instruments) | ~500 notes | ~200 KB |
| Large (100 measures, 10 instruments) | ~2000 notes | ~700 KB |

**Worst case**: 100 measures, 10 instruments, polyphonic = ~700-900 KB (under 1MB target)

## Browser Compatibility

The File API used for save/load is supported in:
- Chrome 90+ (released Apr 2021)
- Firefox 88+ (released Apr 2021)
- Safari 14+ (released Sep 2020)
- Edge 90+ (released Apr 2021)

**Coverage**: ~98% of global desktop browser traffic (as of Feb 2026)

## Contract Tests

See `frontend/tests/integration/file-persistence.test.tsx` for tests verifying:
- ✅ Valid JSON files load correctly
- ✅ All fields preserved after save/load cycle
- ✅ Invalid JSON files rejected with clear errors
- ✅ Missing required fields rejected
- ✅ Out-of-range values rejected
- ✅ File size meets targets

## Future Extensions

**Out of scope for MVP**, but considered for future versions:
- **Compression**: Gzip JSON for smaller files (complicates human-readability)
- **Binary format**: MessagePack or similar (faster but not human-readable)
- **Versioning**: `"version": "1.0.0"` field for format evolution
- **Metadata**: `"created"`, `"modified"`, `"author"` fields
- **MusicXML export**: Cross-application compatibility (requires separate converter)

## References

- Backend Score model: `backend/src/domain/score.rs`
- API handler: `backend/src/adapters/api/handlers.rs::get_score()`
- Rust Serialize impl: Automatically derived via `#[derive(Serialize)]`
- Spec FR-009: "JSON format MUST be human-readable"
- Spec SC-001: "100% data fidelity"
- Spec SC-004: "File size <1MB for typical scores"
