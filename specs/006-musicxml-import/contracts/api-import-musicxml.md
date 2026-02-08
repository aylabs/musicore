# API Contract: MusicXML Import

**Feature**: 006-musicxml-import  
**API Version**: v1  
**Date**: 2026-02-08  

## Endpoint

```
POST /api/v1/scores/import-musicxml
```

Import a MusicXML file (exported from MuseScore or other notation software) and convert it to a musicore Score.

---

## Request

### Content Type

```
Content-Type: multipart/form-data
```

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | MusicXML file (.musicxml, .xml, or .mxl compressed format) |
| `validate` | Boolean | No | If true, only validate without importing (default: false) |
| `include_warnings` | Boolean | No | Include detailed warnings in response (default: true) |

### Example Request

```http
POST /api/v1/scores/import-musicxml HTTP/1.1
Host: localhost:3000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="simple_melody.musicxml"
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  ...
</score-partwise>
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="include_warnings"

true
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/v1/scores/import-musicxml \
  -F "file=@simple_melody.musicxml" \
  -F "include_warnings=true"
```

---

## Response

### Success Response (200 OK)

```json
{
  "score": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Simple Melody",
    "instruments": [
      {
        "id": "inst-1",
        "name": "Piano",
        "staves": [
          {
            "id": "staff-1",
            "clef": "treble",
            "voices": [
              {
                "id": "voice-1",
                "events": [
                  {
                    "type": "note",
                    "tick": 0,
                    "duration": 960,
                    "midi": 60,
                    "velocity": 80
                  },
                  {
                    "type": "note",
                    "tick": 960,
                    "duration": 960,
                    "midi": 62,
                    "velocity": 80
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "timeline": {
      "tempo_events": [
        {
          "tick": 0,
          "bpm": 120.0
        }
      ],
      "time_signature_events": [
        {
          "tick": 0,
          "numerator": 4,
          "denominator": 4
        }
      ],
      "key_signature_events": [
        {
          "tick": 0,
          "key": "C_Major"
        }
      ]
    }
  },
  "metadata": {
    "file_name": "simple_melody.musicxml",
    "version": "3.1",
    "source_software": "MuseScore 3.6.2",
    "imported_at": "2026-02-08T14:23:45.123Z",
    "source_divisions": 480
  },
  "statistics": {
    "note_count": 24,
    "instrument_count": 1,
    "staff_count": 1,
    "voice_count": 1,
    "measure_count": 4,
    "import_duration_ms": 42,
    "warning_counts": {
      "timing_precision_loss": 0,
      "unsupported_element": 2,
      "missing_attribute": 1
    }
  },
  "warnings": [
    {
      "type": "unsupported_element",
      "severity": "info",
      "message": "Slur element skipped (not supported)",
      "measure": 2,
      "context": "note in voice 1"
    },
    {
      "type": "missing_attribute",
      "severity": "warning",
      "message": "Tempo not specified, using default 120 BPM",
      "location": "measure 1"
    }
  ]
}
```

### Validation-Only Response (200 OK)

When `validate=true` is set:

```json
{
  "valid": true,
  "metadata": {
    "file_name": "simple_melody.musicxml",
    "version": "3.1",
    "source_software": "MuseScore 3.6.2",
    "source_divisions": 480
  },
  "statistics": {
    "note_count": 24,
    "instrument_count": 1,
    "staff_count": 1,
    "voice_count": 1,
    "measure_count": 4
  },
  "warnings": [
    {
      "type": "unsupported_element",
      "severity": "info",
      "message": "Slur element will be skipped during import",
      "measure": 2
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request - Missing File

```json
{
  "error": {
    "code": "MISSING_FILE",
    "message": "No file provided in multipart form data",
    "details": "The 'file' field is required"
  }
}
```

### 400 Bad Request - Unsupported File Type

```json
{
  "error": {
    "code": "UNSUPPORTED_FILE_TYPE",
    "message": "File type '.pdf' is not supported",
    "details": "Supported formats: .musicxml, .xml, .mxl (compressed)",
    "supported_extensions": [".musicxml", ".xml", ".mxl"]
  }
}
```

### 400 Bad Request - Invalid MusicXML

```json
{
  "error": {
    "code": "INVALID_MUSICXML",
    "message": "Failed to parse MusicXML file",
    "details": "XML parsing error at line 42, column 15: unexpected closing tag",
    "line": 42,
    "column": 15
  }
}
```

### 422 Unprocessable Entity - Invalid Structure

```json
{
  "error": {
    "code": "INVALID_STRUCTURE",
    "message": "MusicXML file has invalid structure",
    "details": "Missing required <part-list> element",
    "validation_errors": [
      "Root element must be <score-partwise> or <score-timewise>",
      "At least one <part> element is required"
    ]
  }
}
```

### 422 Unprocessable Entity - Domain Validation Failed

```json
{
  "error": {
    "code": "DOMAIN_VALIDATION_FAILED",
    "message": "Imported score does not satisfy domain invariants",
    "details": "The converted score failed musicore's validation rules",
    "validation_errors": [
      "Staff 1 is missing clef at tick 0",
      "Voice 2 has notes with non-monotonic tick values"
    ]
  }
}
```

### 413 Payload Too Large

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size",
    "details": "Maximum file size is 10 MB",
    "file_size_mb": 15.2,
    "max_size_mb": 10.0
  }
}
```

### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal error occurred during import",
    "details": "Failed to convert timing: tick overflow",
    "request_id": "req_abc123"
  }
}
```

---

## Response Schema

### Score Object

See main musicore API documentation for complete Score schema. Key fields:

```typescript
interface Score {
  id: string;
  title?: string;
  instruments: Instrument[];
  timeline: Timeline;
}

interface Instrument {
  id: string;
  name: string;
  staves: Staff[];
}

interface Staff {
  id: string;
  clef: ClefType;
  voices: Voice[];
}

interface Voice {
  id: string;
  events: Event[];
}

type Event = NoteEvent | RestEvent | ClefEvent | KeySignatureEvent | TimeSignatureEvent | TempoEvent;
```

### Warning Object

```typescript
interface Warning {
  type: WarningType;
  severity: "info" | "warning";
  message: string;
  measure?: number;
  context?: string;
  location?: string;
}

type WarningType = 
  | "unsupported_element"
  | "timing_precision_loss"
  | "missing_attribute"
  | "large_file";
```

### Metadata Object

```typescript
interface ImportMetadata {
  file_name: string;
  version: string;  // MusicXML version
  source_software?: string;
  imported_at: string;  // ISO 8601 timestamp
  source_divisions: number;
}
```

### Statistics Object

```typescript
interface ImportStatistics {
  note_count: number;
  instrument_count: number;
  staff_count: number;
  voice_count: number;
  measure_count: number;
  import_duration_ms: number;
  warning_counts: Record<string, number>;
}
```

---

## Performance Characteristics

| Scenario | Expected Response Time | Notes |
|----------|------------------------|-------|
| Small file (<100 notes) | <100ms | Includes parsing, conversion, validation |
| Medium file (500 notes) | <3s | Per SC-002 success criteria |
| Large file (2000 notes) | <10s | May include progress events in future |
| Validation only | <50ms | Skips domain conversion |

---

## File Size Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Maximum file size | 10 MB | Prevents memory exhaustion |
| Maximum notes | 10,000 | Prevents timeout on conversion |
| Maximum instruments | 50 | Reasonable orchestra size |
| Maximum staves per instrument | 4 | Piano + divisi |

Files exceeding these limits will return 413 Payload Too Large.

---

## Behavior Notes

### Unsupported Elements

The following MusicXML elements will be **skipped with warnings**:
- Lyrics (`<lyric>`)
- Articulations (`<articulations>`)
- Dynamics (`<dynamics>`)
- Ornaments (`<ornaments>`)
- Slurs and ties that span measures
- Repeat signs

### Default Values

When elements are missing, the following defaults are used:
- **Tempo**: 120 BPM
- **Time Signature**: 4/4
- **Key Signature**: C Major / A Minor
- **Clef**: Inferred from instrument name (treble for melody, bass for bass instruments)
- **Voice**: Voice 1 if `<voice>` element absent

### Timing Conversion

- All timing values are converted from source file's `divisions` to 960 PPQ
- Conversion uses rational arithmetic to minimize precision loss
- If rounding is required, warnings are included
- Per SC-003, ±1 tick accuracy is maintained for 99% of notes

### Compressed Files (.mxl)

- `.mxl` files are ZIP archives containing:
  - `META-INF/container.xml` - manifest
  - Root MusicXML file (e.g., `score.musicxml`)
- Images and fonts are ignored
- Decompression adds ~50-100ms overhead

---

## Security Considerations

1. **File Type Validation**: Only `.musicxml`, `.xml`, `.mxl` extensions accepted
2. **XML Entity Expansion**: Parser configured to prevent XXE attacks
3. **Memory Limits**: File size limited to 10 MB
4. **Timeout**: Import operations timeout after 30 seconds
5. **Sanitization**: No user input is executed; all data is parsed as static XML

---

## Example Usage Scenarios

### Scenario 1: Import Simple Melody

```bash
curl -X POST http://localhost:3000/api/v1/scores/import-musicxml \
  -F "file=@simple_melody.musicxml"
```

**Response**: Score with 1 instrument, 1 staff, 1 voice, 24 notes

### Scenario 2: Import Piano Score (Grand Staff)

```bash
curl -X POST http://localhost:3000/api/v1/scores/import-musicxml \
  -F "file=@piano_sonata.musicxml"
```

**Response**: Score with 1 instrument (Piano), 2 staves (treble + bass), 2 voices per staff

### Scenario 3: Import String Quartet

```bash
curl -X POST http://localhost:3000/api/v1/scores/import-musicxml \
  -F "file=@quartet.mxl"
```

**Response**: Score with 4 instruments (Violin I, Violin II, Viola, Cello), each with 1 staff

### Scenario 4: Validate Without Importing

```bash
curl -X POST http://localhost:3000/api/v1/scores/import-musicxml \
  -F "file=@large_score.musicxml" \
  -F "validate=true"
```

**Response**: Validation result with statistics and warnings, no Score object

---

## Testing Strategy

### Contract Tests

- Verify request/response schema compliance
- Test all error codes (400, 413, 422, 500)
- Validate multipart form data parsing

### Fixture Files

```
tests/fixtures/musicxml/
├── simple_melody.musicxml          # Basic single-staff
├── piano_grand_staff.musicxml      # 2-staff piano
├── string_quartet.mxl              # 4 instruments (compressed)
├── complex_rhythms.musicxml        # Triplets, tuplets
├── malformed.xml                   # Invalid XML
├── invalid_structure.musicxml      # Missing required elements
├── large_file.musicxml             # 2000+ notes
└── unsupported_elements.musicxml   # Lyrics, dynamics, etc.
```

### Integration Tests

```rust
#[tokio::test]
async fn test_import_simple_melody() {
    let client = TestClient::new();
    let form = multipart::Form::new()
        .file("file", "tests/fixtures/musicxml/simple_melody.musicxml");
    
    let response = client.post("/api/v1/scores/import-musicxml")
        .multipart(form)
        .send()
        .await
        .unwrap();
    
    assert_eq!(response.status(), 200);
    let result: ImportResult = response.json().await.unwrap();
    assert_eq!(result.statistics.note_count, 24);
    assert_eq!(result.score.instruments.len(), 1);
}
```

---

## Future Enhancements (Out of Scope for v1)

- **Streaming Import**: Progress events via Server-Sent Events for large files
- **Batch Import**: Import multiple files in one request
- **Export**: Convert musicore Score back to MusicXML
- **Diff**: Compare imported score with existing score
- **Preview**: Return rendered notation image without full import

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-02-08 | Initial API contract |

---

## See Also

- [CLI Contract](./cli-import.md) - Command-line import interface
- [Data Model](../data-model.md) - Type definitions
- [Research](../research.md) - Technical decisions
