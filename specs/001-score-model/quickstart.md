# Quickstart Guide: Hierarchical Score Model

**Feature**: 001-score-model  
**Date**: 2026-02-06  
**Purpose**: Practical integration scenarios for developers and testers

---

## Prerequisites

- Rust toolchain (1.75+) installed
- Backend API server running on `http://localhost:8080`
- curl or HTTP client (Postman, Insomnia, httpie) for testing

---

## Scenario 1: Create Simple Score with One Note (MVP)

**Goal**: Validate User Story 1 (P1) - Create basic score structure

**Steps**:

### 1. Create a new score

```bash
curl -X POST http://localhost:8080/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "global_structural_events": [
    { "tick": 0, "bpm": 120 },
    { "tick": 0, "numerator": 4, "denominator": 4 }
  ],
  "instruments": []
}
```

**Validation**:
- ✓ Score has unique UUID
- ✓ Default tempo (120 BPM) at tick 0 (FR-017)
- ✓ Default time signature (4/4) at tick 0 (FR-017)
- ✓ Instruments list is empty initially

### 2. Add a Piano instrument

```bash
curl -X POST http://localhost:8080/api/v1/scores/550e8400-e29b-41d4-a716-446655440000/instruments \
  -H "Content-Type: application/json" \
  -d '{"name": "Piano"}'
```

**Expected Response** (201 Created):
```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": "Piano",
  "staves": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "staff_structural_events": [
        { "tick": 0, "clef": "Treble" },
        { "tick": 0, "sharps": 0 }
      ],
      "voices": [
        {
          "id": "886313e1-3b8a-5372-9b90-0c9aee199e5d",
          "interval_events": []
        }
      ]
    }
  ]
}
```

**Validation**:
- ✓ Instrument created with unique ID
- ✓ One staff automatically created (FR-003)
- ✓ Default clef (Treble) at tick 0 (FR-018)
- ✓ Default key signature (C major, 0 sharps) at tick 0 (FR-018)
- ✓ One voice automatically created (FR-004)

### 3. Add a note (Middle C, quarter note)

```bash
curl -X POST http://localhost:8080/api/v1/scores/550e8400-e29b-41d4-a716-446655440000/instruments/6ba7b810-9dad-11d1-80b4-00c04fd430c8/staves/7c9e6679-7425-40de-944b-e07fc1f90ae7/voices/886313e1-3b8a-5372-9b90-0c9aee199e5d/notes \
  -H "Content-Type: application/json" \
  -d '{
    "start_tick": 0,
    "duration_ticks": 960,
    "pitch": 60
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "start_tick": 0,
  "duration_ticks": 960,
  "pitch": 60
}
```

**Validation**:
- ✓ Note created at tick 0 (start of score)
- ✓ Duration 960 ticks = 1 quarter note at 960 PPQ (FR-014)
- ✓ Pitch 60 = MIDI Middle C
- ✓ Note stored in voice (FR-013, FR-027)

### 4. Retrieve the complete score

```bash
curl http://localhost:8080/api/v1/scores/550e8400-e29b-41d4-a716-446655440000
```

**Expected Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "global_structural_events": [
    { "tick": 0, "bpm": 120 },
    { "tick": 0, "numerator": 4, "denominator": 4 }
  ],
  "instruments": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Piano",
      "staves": [
        {
          "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
          "staff_structural_events": [
            { "tick": 0, "clef": "Treble" },
            { "tick": 0, "sharps": 0 }
          ],
          "voices": [
            {
              "id": "886313e1-3b8a-5372-9b90-0c9aee199e5d",
              "interval_events": [
                {
                  "id": "123e4567-e89b-12d3-a456-426614174000",
                  "start_tick": 0,
                  "duration_ticks": 960,
                  "pitch": 60
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Validation**:
- ✓ Full hierarchy retrieved (Score → Instrument → Staff → Voice → Note)
- ✓ All structural events present
- ✓ Note correctly stored in voice

**Success Criteria Validated**: SC-001 (create score and add notes), SC-004 (hierarchy navigation)

---

## Scenario 2: Multi-Staff Piano Score

**Goal**: Validate User Story 2 (P2) - Multi-staff instruments

**Steps**:

### 1. Create score and piano (reuse Scenario 1 steps 1-2)

### 2. Add bass clef staff to piano

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves \
  -H "Content-Type: application/json"
```

**Expected Response** (201 Created):
```json
{
  "id": "8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d",
  "staff_structural_events": [
    { "tick": 0, "clef": "Treble" },
    { "tick": 0, "sharps": 0 }
  ],
  "voices": [
    {
      "id": "9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
      "interval_events": []
    }
  ]
}
```

### 3. Change second staff to bass clef

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d/structural-events/clef \
  -H "Content-Type: application/json" \
  -d '{
    "tick": 0,
    "clef": "Bass"
  }'
```

**Expected Response** (409 Conflict):
```json
{
  "error": "Duplicate structural event of type Clef at tick 0"
}
```

**Why?** Staff already has treble clef at tick 0 from initialization. This validates FR-019 (no duplicate structural events at same tick).

**Note**: In real implementation, consider adding PUT endpoint to replace structural events at tick 0, or allow deletion + re-creation.

### 4. Add bass clef at tick 1 (workaround)

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d/structural-events/clef \
  -H "Content-Type: application/json" \
  -d '{
    "tick": 1,
    "clef": "Bass"
  }'
```

**Expected Response** (201 Created):
```json
{
  "tick": 1,
  "clef": "Bass"
}
```

**Validation**:
- ✓ Piano now has two staves with different clefs
- ✓ Each staff maintains independent structural events (FR-011)
- ✓ Notes can be added to voices in both staves independently

**Success Criteria Validated**: User Story 2 acceptance scenarios

---

## Scenario 3: Polyphonic Voices (Chord)

**Goal**: Validate User Story 3 (P3) - Multiple notes at same time

**Steps**:

### 1. Add first note (C, pitch 60) to voice

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/{STAFF_ID}/voices/{VOICE_ID}/notes \
  -H "Content-Type: application/json" \
  -d '{
    "start_tick": 0,
    "duration_ticks": 960,
    "pitch": 60
  }'
```

**Expected**: 201 Created

### 2. Add second note (E, pitch 64) at same tick (forms C major chord)

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/{STAFF_ID}/voices/{VOICE_ID}/notes \
  -H "Content-Type: application/json" \
  -d '{
    "start_tick": 0,
    "duration_ticks": 960,
    "pitch": 64
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": "aaaa1111-bbbb-2222-cccc-333344445555",
  "start_tick": 0,
  "duration_ticks": 960,
  "pitch": 64
}
```

**Validation**:
- ✓ Two notes with different pitches overlap in same voice (FR-022)
- ✓ Forms a chord (C + E)

### 3. Add third note (G, pitch 67) at same tick

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/{STAFF_ID}/voices/{VOICE_ID}/notes \
  -H "Content-Type: application/json" \
  -d '{
    "start_tick": 0,
    "duration_ticks": 960,
    "pitch": 67
  }'
```

**Expected**: 201 Created (C major triad: C-E-G)

### 4. Attempt to add duplicate C (pitch 60) at same tick

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/{STAFF_ID}/voices/{VOICE_ID}/notes \
  -H "Content-Type: application/json" \
  -d '{
    "start_tick": 0,
    "duration_ticks": 480,
    "pitch": 60
  }'
```

**Expected Response** (409 Conflict):
```json
{
  "error": "Overlapping notes with same pitch 60 at ticks 0-960"
}
```

**Validation**:
- ✓ System rejects overlapping notes with same pitch in same voice (FR-023)
- ✓ Validation prevents invalid state

**Success Criteria Validated**: User Story 3 acceptance scenarios

---

## Scenario 4: Tempo and Time Signature Changes

**Goal**: Validate User Story 4 (P4) - Global structural events

**Steps**:

### 1. Add tempo change at measure 5 (tick 3840 in 4/4 time)

**Calculation**: 4 beats/measure × 960 ticks/beat = 3840 ticks/measure  
Measure 5 starts at tick 3840 (measures 1-4 = 0-3839)

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/structural-events/tempo \
  -H "Content-Type: application/json" \
  -d '{
    "tick": 3840,
    "bpm": 80
  }'
```

**Expected Response** (201 Created):
```json
{
  "tick": 3840,
  "bpm": 80
}
```

**Validation**:
- ✓ Tempo changes from 120 BPM (default) to 80 BPM at tick 3840
- ✓ Change applies globally to all instruments (FR-010)

### 2. Add time signature change at measure 10 (tick 7680)

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/structural-events/time-signature \
  -H "Content-Type: application/json" \
  -d '{
    "tick": 7680,
    "numerator": 3,
    "denominator": 4
  }'
```

**Expected Response** (201 Created):
```json
{
  "tick": 7680,
  "numerator": 3,
  "denominator": 4
}
```

**Validation**:
- ✓ Time signature changes from 4/4 to 3/4 at tick 7680
- ✓ Change applies globally (FR-010)
- ✓ After tick 7680: 3 beats/measure × 960 ticks/beat = 2880 ticks/measure

### 3. Attempt to add duplicate tempo event at tick 3840

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/structural-events/tempo \
  -H "Content-Type: application/json" \
  -d '{
    "tick": 3840,
    "bpm": 100
  }'
```

**Expected Response** (409 Conflict):
```json
{
  "error": "Duplicate structural event of type Tempo at tick 3840"
}
```

**Validation**:
- ✓ System prevents duplicate structural events at same tick (FR-019)

**Success Criteria Validated**: User Story 4 acceptance scenarios

---

## Scenario 5: Staff-Scoped Structural Events

**Goal**: Validate User Story 5 (P5) - Staff-specific clef/key changes

**Steps**:

### 1. Add key signature change to first staff (D major, 2 sharps)

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/{STAFF_1_ID}/structural-events/key-signature \
  -H "Content-Type: application/json" \
  -d '{
    "tick": 1920,
    "sharps": 2
  }'
```

**Expected Response** (201 Created):
```json
{
  "tick": 1920,
  "sharps": 2
}
```

### 2. Retrieve full score and verify isolation

```bash
curl http://localhost:8080/api/v1/scores/{SCORE_ID}
```

**Validation**:
- ✓ First staff has key signature change at tick 1920
- ✓ Second staff (if exists) maintains its own key signature (C major)
- ✓ Staff-scoped events do not affect other staves (FR-011)

**Success Criteria Validated**: User Story 5 acceptance scenarios

---

## Validation Tests

### Test Case 1: Invalid Note Duration (FR-021)

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/{STAFF_ID}/voices/{VOICE_ID}/notes \
  -H "Content-Type: application/json" \
  -d '{
    "start_tick": 0,
    "duration_ticks": 0,
    "pitch": 60
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": "Invalid note duration: must be > 0"
}
```

### Test Case 2: Invalid Pitch (outside 0-127 range)

```bash
curl -X POST http://localhost:8080/api/v1/scores/{SCORE_ID}/instruments/{INSTRUMENT_ID}/staves/{STAFF_ID}/voices/{VOICE_ID}/notes \
  -H "Content-Type: application/json" \
  -d '{
    "start_tick": 0,
    "duration_ticks": 960,
    "pitch": 128
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": "Invalid pitch value: 128 (must be 0-127)"
}
```

### Test Case 3: Navigation Performance (SC-004)

```bash
# Retrieve score with 1000 notes
time curl http://localhost:8080/api/v1/scores/{SCORE_ID}
```

**Expected**: Response time < 200ms (per success criteria SC-003)

---

## Frontend Integration Example

**React Component** (TypeScript):

```typescript
import React, { useEffect, useState } from 'react';
import { ScoreApiClient, Score } from '../services/score-api';

export const ScoreViewer: React.FC<{ scoreId: string }> = ({ scoreId }) => {
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiClient = new ScoreApiClient();

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const fetchedScore = await apiClient.getScore(scoreId);
        setScore(fetchedScore);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch score');
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [scoreId]);

  if (loading) return <div>Loading score...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!score) return <div>Score not found</div>;

  return (
    <div>
      <h1>Score: {score.id}</h1>
      <h2>Tempo: {score.global_structural_events.find(e => 'bpm' in e)?.bpm} BPM</h2>
      {score.instruments.map(instrument => (
        <div key={instrument.id}>
          <h3>{instrument.name}</h3>
          {instrument.staves.map(staff => (
            <div key={staff.id}>
              <p>Clef: {staff.staff_structural_events.find(e => 'clef' in e)?.clef}</p>
              {staff.voices.map(voice => (
                <div key={voice.id}>
                  <p>Notes: {voice.interval_events.length}</p>
                  <ul>
                    {voice.interval_events.map(note => (
                      <li key={note.id}>
                        Pitch {note.pitch} at tick {note.start_tick}, duration {note.duration_ticks}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

**Validation**:
- ✓ Frontend retrieves full score hierarchy
- ✓ React components render score structure
- ✓ API client handles success and error states
- ✓ Type safety via TypeScript interfaces matching API schemas

---

## Performance Testing

### Load Test: 100 Notes in 30 Seconds (SC-001)

```bash
#!/bin/bash
SCORE_ID="550e8400-e29b-41d4-a716-446655440000"
INSTRUMENT_ID="6ba7b810-9dad-11d1-80b4-00c04fd430c8"
STAFF_ID="7c9e6679-7425-40de-944b-e07fc1f90ae7"
VOICE_ID="886313e1-3b8a-5372-9b90-0c9aee199e5d"

start_time=$(date +%s)

for i in {0..99}; do
  TICK=$((i * 960))  # Quarter notes spaced 960 ticks apart
  PITCH=$((60 + (i % 12)))  # Cycle through pitches 60-71
  
  curl -X POST "http://localhost:8080/api/v1/scores/$SCORE_ID/instruments/$INSTRUMENT_ID/staves/$STAFF_ID/voices/$VOICE_ID/notes" \
    -H "Content-Type: application/json" \
    -d "{\"start_tick\": $TICK, \"duration_ticks\": 960, \"pitch\": $PITCH}" \
    > /dev/null 2>&1
done

end_time=$(date +%s)
elapsed=$((end_time - start_time))

echo "Added 100 notes in $elapsed seconds"
```

**Expected**: Elapsed time < 30 seconds (success criteria SC-001)

---

## Troubleshooting

### Issue: "Entity not found" errors

**Cause**: UUID in URL path does not match existing entity

**Solution**: Use `GET /scores` to list all scores, then use valid IDs from response

### Issue: 409 Conflict when adding structural events

**Cause**: Duplicate structural event at same tick position

**Solution**: Check existing events at tick, either:
- Use different tick value
- Delete existing event first (if not at tick 0)
- Implement PUT endpoint for replacement

### Issue: Slow query performance

**Cause**: Large number of events, inefficient storage adapter

**Solution**: 
- Profile persistence adapter (in-memory should be fast)
- Consider indexing strategy if using database
- Implement pagination for large result sets

---

## Summary

**Scenarios Covered**: 5 user stories (P1-P5)  
**Validation Tests**: 3 invariant checks (duration, pitch, overlap)  
**Performance Tests**: 1 load test (100 notes in <30s)  
**Frontend Integration**: React TypeScript example  

**Next Phase**: Generate tasks.md with implementation breakdown (use `/speckit.tasks` command).
