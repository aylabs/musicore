# API Contracts: Chord Symbol Visualization

**Feature**: 005-chord-symbols  
**Date**: 2026-02-08  
**Reference**: [spec.md](../spec.md), [research.md](../research.md)

## Overview

This feature implements **frontend-only chord detection and visualization** for Priority 1 (Display Chord Symbols) and Priority 2 (Recognize Standard Chord Types). No backend API changes are required.

---

## Backend API Status

### No Changes Required ✅

**Rationale**:
- Chord detection is a **derived visualization** from existing `Note` data
- Notes already contain all required data: `pitch` (MIDI value), `start_tick` (timing), `duration`
- Chord symbols are computed **on-demand during rendering** (not persisted)
- P1/P2 scope focuses on visualization, not chord data management

**Existing APIs Used**:
- `GET /api/scores/:id` - Fetch score with notes (unchanged)
- `POST /api/scores/:id/notes` - Add notes (unchanged)
- `DELETE /api/scores/:id/notes/:noteId` - Remove notes (unchanged)

**No New Endpoints**: ✅  
**No Modified Endpoints**: ✅  
**No Database Changes**: ✅

---

## Frontend Data Flow

Chord symbols are computed **client-side** from note data:

```
1. User loads score
   ↓
2. Frontend fetches /api/scores/:id
   ↓
3. Response includes notes array with pitch + start_tick
   ↓
4. ChordDetector groups notes by tick (no API call)
   ↓
5. ChordAnalyzer identifies chord types (no API call)
   ↓
6. ChordSymbol component renders SVG text (no API call)
```

**Network Requests**: 0 additional API calls for chord visualization

---

## Future Backend Integration (Post-P2)

If backend chord analysis becomes necessary for performance or advanced features, consider these potential endpoints:

### Potential Future Endpoint

**Not Implemented Yet** - Design for discussion only.

#### `POST /api/scores/:id/analyze-chords`

**Purpose**: Server-side chord analysis for large scores (optimization).

**Request**:
```json
{
  "tick_range": {
    "start": 0,
    "end": 96000
  },
  "voice_ids": ["voice-1", "voice-2"] // Optional: analyze specific voices
}
```

**Response**:
```json
{
  "chords": [
    {
      "tick": 0,
      "chord_type": "major",
      "root_pitch": 60,
      "symbol": "C",
      "notes": ["note-id-1", "note-id-2", "note-id-3"]
    },
    {
      "tick": 960,
      "chord_type": "minor",
      "root_pitch": 69,
      "symbol": "Am",
      "notes": ["note-id-4", "note-id-5", "note-id-6"]
    }
  ],
  "analysis_time_ms": 12
}
```

**Benefits**:
- Offload computation for scores with 10,000+ notes
- Centralized pattern database (easier updates)
- Potential for ML-based chord recognition

**Trade-offs**:
- Network latency (50-200ms)
- Requires backend changes (violates SC-007 for P1/P2)
- Complexity for caching, invalidation

**Decision**: Defer to Priority 3 or later. P1/P2 frontend-only sufficient for typical scores (<1000 notes).

---

## Persistence Considerations

### Why Chord Symbols Are Not Persisted

**Rationale**:
1. **Chords are derived data** - Computable from notes, storing violates DRY principle
2. **Sync complexity** - If user edits note, must invalidate/recompute chord (easy to get out of sync)
3. **Storage overhead** - Chord data duplicates information already in notes
4. **Flexibility** - User preferences (symbol style, inversion notation) can change without re-analysis

**Exception**: If user **manually corrects** a chord symbol (e.g., changes "C" to "Cadd9"), that override should be persisted:

```json
{
  "tick": 0,
  "manual_override": "Cadd9",
  "detected_symbol": "C"
}
```

This would require new backend storage. **Not in scope for P1/P2.**

---

## Constitution Compliance: API-First Principle

**Gate III. API-First Development**: ⚠️ PASS with Justification

**Concern**: Feature does not define API before implementation.

**Justification**:
- This is a **pure visualization feature** with no backend component
- All data sources (notes) already have well-defined APIs
- No new domain entities are introduced that require persistence
- Frontend-only features are exempt from API-first when they don't create new data

**Validation**: Constitution check passes (see [plan.md](../plan.md)).

---

## Testing with Existing APIs

Chord visualization testing uses **existing score/note APIs**:

### Test Setup

```typescript
// Create test score with notes
const response = await fetch('http://localhost:8080/api/scores', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Chord Test Score',
    instruments: [{
      name: 'Piano',
      staves: [{
        voices: [{
          notes: [
            { pitch: 60, start_tick: 0, duration: 960 }, // C
            { pitch: 64, start_tick: 0, duration: 960 }, // E
            { pitch: 67, start_tick: 0, duration: 960 }, // G
          ]
        }]
      }]
    }]
  })
});
const score = await response.json();
```

### Verification

```typescript
// Frontend renders chord symbols from score.notes
<ChordSymbol notes={score.instruments[0].staves[0].voices[0].notes} />

// Verify "C" symbol appears in DOM
expect(document.querySelector('text[data-chord-symbol]')?.textContent).toBe('C');
```

**No mocking required** - Uses real backend APIs for integration testing.

---

## Performance Impact on Existing APIs

Chord detection **does not slow down existing API responses**:

| API | Without Chords | With Chords | Impact |
|-----|----------------|-------------|--------|
| GET /api/scores/:id | 50ms | 50ms | 0ms (no change) |
| POST /api/scores/:id/notes | 30ms | 30ms | 0ms (no change) |
| DELETE /api/scores/:id/notes/:id | 20ms | 20ms | 0ms (no change) |

**Frontend processing adds**:
- Chord detection: ~10ms (client-side)
- Chord rendering: ~50ms (client-side)
- **Total**: 60ms additional client-side processing

**Acceptable**: Still under 100ms target (SC-002).

---

## Error Handling

Since no new APIs are introduced, error handling focuses on **graceful degradation**:

### Scenario: Invalid Note Data

```typescript
// Backend returns note with missing pitch
{ id: 'note-1', start_tick: 0, duration: 960 /* pitch missing */ }
```

**Handling**:
```typescript
// ChordAnalyzer filters invalid notes
const validNotes = notes.filter(n => typeof n.pitch === 'number');
if (validNotes.length < 2) return null; // Don't render chord
```

### Scenario: Unrecognized Chord Pattern

```typescript
// Notes don't match any CHORD_PATTERNS
const notes = [C, C#]; // Not a standard chord
```

**Handling**:
```typescript
// ChordAnalyzer.identify() returns null
// Component renders individual notes (no chord symbol)
```

**No error thrown** - Fail silently, display notes as-is.

---

## Security Considerations

### No New Attack Surface ✅

- **No new endpoints** = no new injection vectors
- **Client-side only** = no server-side code execution risk
- **Read-only analysis** = no data modification

### Input Validation

Chord detection operates on **already-validated note data** from backend:
- `pitch` validated by backend (0-127 MIDI range)
- `start_tick` validated by backend (non-negative integer)
- Frontend code does not accept user input for chord analysis

**Conclusion**: No additional security measures required.

---

## Monitoring & Observability

### Metrics to Track (Frontend)

```typescript
// Optional: Add analytics events
analytics.track('chord_symbol_rendered', {
  chord_type: 'major',
  note_count: 3,
  render_time_ms: 45,
});

analytics.track('chord_detection_performance', {
  total_notes: 1200,
  chords_detected: 45,
  detection_time_ms: 8,
});
```

### No Backend Metrics Required

Since feature is frontend-only, backend dashboards (response times, error rates) are unaffected.

---

## Migration Path (If Backend Needed Later)

If future priorities require backend chord analysis:

1. **Phase 1**: Add `POST /api/scores/:id/analyze-chords` endpoint (optional optimization)
2. **Phase 2**: Add chord override storage (if manual correction feature added)
3. **Phase 3**: Add chord progression analysis (if composition assistant added)

**Current State**: None of these phases implemented. P1/P2 requires **zero backend work**.

---

## Summary

✅ **No Backend API Changes**  
✅ **No Database Schema Changes**  
✅ **No New Endpoints**  
✅ **No Security Risk**  
✅ **Constitution Compliant** (API-First exemption for visualization)  
✅ **Ready for Frontend Implementation**

**Next Steps**: Proceed with frontend implementation per [quickstart.md](../quickstart.md).

