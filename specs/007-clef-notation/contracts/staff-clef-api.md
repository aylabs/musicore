# API Contract: Staff Clef Serialization

**Feature**: 007-clef-notation  
**Date**: 2026-02-08  
**Endpoint**: `GET /api/v1/scores/{id}`  
**Enhancement**: Add `active_clef` field to Staff objects in response  
**Backward Compatibility**: Yes (additive change, graceful degradation)

---

## Overview

Enhance the existing score retrieval endpoint to include `active_clef` information for each staff, enabling the frontend to display correct clef symbols. This is an **additive, non-breaking change** to the existing API contract.

---

## Endpoint Details

### GET /api/v1/scores/{id}

**Description**: Retrieve a complete score by ID, including instruments, staves with active clef information, and events.

**Path Parameters**:
- `id` (string, required): Score UUID

**Authorization**: None (assumes public scores; add auth headers if needed)

**Response Status Codes**:
- `200 OK`: Score found and returned
- `404 Not Found`: Score with given ID does not exist
- `500 Internal Server Error`: Server error

---

## Response Schema Enhancement

### Before (Existing Contract - Feature 001-004)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Piano Sonata",
  "composer": "J. Composer",
  "instruments": [
    {
      "id": "inst-001",
      "name": "Piano",
      "midi_program": 0,
      "staves": [
        {
          "id": "staff-001",
          "voices": [
            {
              "id": "voice-001",
              "notes": [
                {
                  "id": "note-001",
                  "tick": 0,
                  "duration_ticks": 960,
                  "pitch": 60,
                  "velocity": 80
                }
              ]
            }
          ],
          "staff_structural_events": [
            {
              "type": "Clef",
              "tick": 0,
              "clef": "Treble"
            },
            {
              "type": "KeySignature",
              "tick": 0,
              "fifths": 0
            }
          ]
        }
      ]
    }
  ],
  "global_structural_events": [...]
}
```

### After (Enhanced Contract - Feature 007)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Piano Sonata",
  "composer": "J.  Composer",
  "instruments": [
    {
      "id": "inst-001",
      "name": "Piano",
      "midi_program": 0,
      "staves": [
        {
          "id": "staff-001",
          "active_clef": "Treble",  // 🟢 NEW FIELD
          "voices": [...],
          "staff_structural_events": [...]
        },
        {
          "id": "staff-002",
          "active_clef": "Bass",  // 🟢 NEW FIELD
          "voices": [...],
          "staff_structural_events": [...]
        }
      ]
    }
  ],
  "global_structural_events": [...]
}
```

---

## Field Specification: `active_clef`

### Staff Object Enhancement

```typescript
interface StaffResponse {
  id: string;
  
  /**
   * Active clef for this staff (Feature 007)
   * 
   * Derived from the first ClefEvent in staff_structural_events,
   * or defaults to "Treble" if no ClefEvent present.
   * 
   * Valid values: "Treble" | "Bass" | "Alto" | "Tenor"
   * 
   * @since Feature 007-clef-notation
   * @default "Treble"
   */
  active_clef: ClefType;
  
  voices: VoiceResponse[];
  staff_structural_events: StaffStructuralEventResponse[];
}

type ClefType = 'Treble' | 'Bass' | 'Alto' | 'Tenor';
```

### Field Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `active_clef` | `ClefType` | ✅ Yes (Feature 007+) | `"Treble"` | Current active clef for the staff |

### ClefType Enum Values

| Value | Description | SMuFL Glyph | Musical Meaning |
|-------|-------------|-------------|-----------------|
| `"Treble"` | G-clef on line 2 | U+E050 | G4 on second line from bottom |
| `"Bass"` | F-clef on line 4 | U+E062 | F3 on fourth line from bottom |
| `"Alto"` | C-clef on line 3 | U+E05C | C4 (middle C) on middle line |
| `"Tenor"` | C-clef on line 4 | U+E05D | C4 (middle C) on fourth line from bottom |

**Serialization**: PascalCase (matches backend `Clef` enum serialization via `serde`)

---

## Derivation Logic (Backend Implementation)

**File**: `backend/src/adapters/api/responses.rs` (or `models/staff.rs`)

```rust
impl From<&Staff> for StaffResponse {
    fn from(staff: &Staff) -> Self {
        // Extract active clef from first ClefEvent, or default to Treble
        let active_clef = staff
            .staff_structural_events
            .iter()
            .find_map(|event| match event {
                StaffStructuralEvent::Clef(clef_event) => Some(clef_event.clef()),
                _ => None,
            })
            .unwrap_or(Clef::Treble);  // Default fallback
        
        StaffResponse {
            id: staff.id.to_string(),
            active_clef,  // NEW
            voices: staff.voices.iter().map(VoiceResponse::from).collect(),
            staff_structural_events: staff.staff_structural_events.iter()
                .map(StaffStructuralEventResponse::from)
                .collect(),
        }
    }
}
```

**Rules**:
1. Search `staff_structural_events` for first `ClefEvent`
2. If found, use `clef_event.clef()` value
3. If not found, default to `Clef::Treble`
4. Serialize using `PascalCase` (automatic via `serde`)

---

## Example Scenarios

### Scenario 1: Piano Grand Staff (Treble + Bass)

**Request**:
```http
GET /api/v1/scores/piano-sonata-001 HTTP/1.1
```

**Response** (200 OK):
```json
{
  "id": "piano-sonata-001",
  "title": "Piano Sonata No. 1",
  "instruments": [
    {
      "id": "piano-inst",
      "name": "Piano",
      "staves": [
        {
          "id": "piano-rh",
          "active_clef": "Treble",  // Right hand
          "staff_structural_events": [
            { "type": "Clef", "tick": 0, "clef": "Treble" }
          ],
          "voices": [...]
        },
        {
          "id": "piano-lh",
          "active_clef": "Bass",  // Left hand
          "staff_structural_events": [
            { "type": "Clef", "tick": 0, "clef": "Bass" }
          ],
          "voices": [...]
        }
      ]
    }
  ]
}
```

### Scenario 2: String Quartet (Mixed Clefs)

**Request**:
```http
GET /api/v1/scores/quartet-op1 HTTP/1.1
```

**Response** (200 OK):
```json
{
  "id": "quartet-op1",
  "title": "String Quartet Op. 1",
  "instruments": [
    {
      "id": "violin1",
      "name": "Violin I",
      "staves": [{ "active_clef": "Treble", ... }]
    },
    {
      "id": "violin2",
      "name": "Violin II",
      "staves": [{ "active_clef": "Treble", ... }]
    },
    {
      "id": "viola",
      "name": "Viola",
      "staves": [{ "active_clef": "Alto", ... }]  // Alto clef
    },
    {
      "id": "cello",
      "name": "Cello",
      "staves": [{ "active_clef": "Bass", ... }]
    }
  ]
}
```

### Scenario 3: Legacy Score (No ClefEvent)

**Request**:
```http
GET /api/v1/scores/legacy-score HTTP/1.1
```

**Response** (200 OK):
```json
{
  "id": "legacy-score",
  "title": "Old Score (Pre-Feature-006)",
  "instruments": [
    {
      "id": "melody",
      "staves": [
        {
          "id": "staff-001",
          "active_clef": "Treble",  // Defaulted (no ClefEvent in events)
          "staff_structural_events": [
            // No ClefEvent present
            { "type": "KeySignature", "tick": 0, "fifths": 0 }
          ],
          "voices": [...]
        }
      ]
    }
  ]
}
```

---

## Frontend Contract

### Expected Behavior

**File**: `frontend/src/components/notation/StaffNotation.tsx`

```typescript
interface StaffData {
  id: string;
  active_clef: ClefType;  // NEW: Expected from API
  voices: Voice[];
  staff_structural_events: StaffStructuralEvent[];
}

// Component usage
<StaffNotation
  notes={staff.voices[0].notes}
  clef={staff.active_clef}  // Pass API-provided clef
/>
```

**Fallback Strategy** (if `active_clef` missing):
```typescript
const clef = staff.active_clef ?? 'Treble';  // Default to Treble for old API versions
```

---

## Validation & Testing

### Contract Tests (Backend)

**File**: `backend/tests/integration/api_clef_serialization_test.rs`

```rust
#[tokio::test]
async fn test_get_score_includes_active_clef() {
    let app = test_app().await;
    
    // Setup: Create score with Bass clef staff
    let score_id = create_test_score_with_bass_clef(&app).await;
    
    // Act: GET request
    let response = app.get(&format!("/api/v1/scores/{}", score_id)).await;
    
    // Assert: Response includes active_clef
    assert_eq!(response.status(), 200);
    let body: ScoreResponse = response.json().await;
    
    let staff = &body.instruments[0].staves[0];
    assert_eq!(staff.active_clef, "Bass");
}

#[tokio::test]
async fn test_default_clef_when_no_clef_event() {
    let app = test_app().await;
    
    // Setup: Create score without ClefEvent
    let score_id = create_test_score_without_clef(&app).await;
    
    // Act & Assert
    let response = app.get(&format!("/api/v1/scores/{}", score_id)).await;
    let body: ScoreResponse = response.json().await;
    
    let staff = &body.instruments[0].staves[0];
    assert_eq!(staff.active_clef, "Treble");  // Default
}
```

### Frontend Integration Tests

**File**: `frontend/tests/integration/clef-display.test.tsx`

```typescript
describe('Clef Display from API', () => {
  it('displays Bass clef when API returns active_clef: Bass', async () => {
    // Mock API response
    mockFetch('/api/v1/scores/test', {
      instruments: [{
        staves: [{
          id: 'staff-1',
          active_clef: 'Bass',  // API contract
          voices: [...]
        }]
      }]
    });
    
    // Render
    render(<ScoreViewer scoreId="test" />);
    
    // Assert: Bass clef glyph rendered
    const clefGlyph = screen.getByTestId('clef-Bass');
    expect(clefGlyph).toHaveTextContent('\uE062');  // Bass clef Unicode
  });
  
  it('defaults to Treble clef if active_clef missing', async () => {
    // Mock old API (no active_clef field)
    mockFetch('/api/v1/scores/legacy', {
      instruments: [{
        staves: [{
          id: 'staff-1',
          // active_clef: Missing
          voices: [...]
        }]
      }]
    });
    
    render(<ScoreViewer scoreId="legacy" />);
    
    // Assert: Treble clef displayed by default
    const clefGlyph = screen.getByTestId('clef-Treble');
    expect(clefGlyph).toBeInTheDocument();
  });
});
```

---

## Backward Compatibility

### For Frontend Clients

| Frontend Version | Backend Version | Behavior |
|------------------|-----------------|----------|
| Pre-Feature-007 | Pre-Feature-007 | No clef display (existing behavior) |
| Pre-Feature-007 | Feature-007+ | Ignores `active_clef` field (no breaking change) |
| Feature-007+ | Pre-Feature-007 | Defaults to Treble (graceful degradation) |
| Feature-007+ | Feature-007+ | Full clef display (enhanced experience) |

### Migration Path

1. **Phase 1**: Deploy backend with `active_clef` field (non-breaking, additive)
2. **Phase 2**: Deploy frontend with clef rendering (consumes new field, falls back if missing)
3. **Phase 3**: All clients see correct clefs for new scores; old scores show Treble default

**No breaking changes required**. Incremental rollout safe.

---

## Contract Summary

| Aspect | Details |
|--------|---------|
| **Endpoint** | `GET /api/v1/scores/{id}` (existing, enhanced) |
| **New Field** | `staff.active_clef: ClefType` |
| **Valid Values** | `"Treble"`, `"Bass"`, `"Alto"`, `"Tenor"` |
| **Default** | `"Treble"` (if no ClefEvent present) |
| **Breaking Change** | ❌ No (additive field) |
| **Validation** | Contract tests, integration tests |
| **Rollout** | Backend → Frontend (safe incremental) |

**Contract Status**: ✅ Finalized - Ready for implementation
