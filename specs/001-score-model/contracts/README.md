# API Contracts: Hierarchical Score Model

**Feature**: 001-score-model  
**Date**: 2026-02-06  
**Purpose**: Define REST API contracts for score domain operations

---

## Overview

This directory contains OpenAPI 3.0 specifications for the Musicore Score API. The API follows RESTful principles with JSON request/response bodies, exposing the hierarchical score domain model through HTTP endpoints.

**Design Principles**:
- **Resource-oriented URLs**: Endpoints map to domain entities (scores, instruments, staves, voices, notes)
- **Standard HTTP methods**: POST (create), GET (read), PUT/PATCH (update), DELETE (delete)
- **Hierarchical paths**: Reflect domain hierarchy (`/scores/{id}/instruments/{id}/staves/{id}/...`)
- **Contract-first**: API defined before implementation to enable parallel frontend/backend development
- **Validation at boundary**: Request validation enforces domain invariants (FR-017 through FR-024)

---

## Files

### `score-api.yaml`

OpenAPI 3.0 specification defining all score management endpoints.

**Tags**:
- `scores` - Score aggregate root operations (create, retrieve, delete)
- `instruments` - Instrument entity operations within score
- `staves` - Staff entity operations within instrument
- `voices` - Voice entity operations within staff
- `notes` - Note interval event operations within voice
- `structural-events` - Global and staff-scoped structural event operations

**Base URL**: `http://localhost:8080/api/v1` (development)

---

## Endpoint Summary

### Score Operations

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/scores` | Create new score with defaults | 201, 400, 500 |
| GET | `/scores` | List all score IDs | 200, 500 |
| GET | `/scores/{scoreId}` | Retrieve full score hierarchy | 200, 404, 500 |
| DELETE | `/scores/{scoreId}` | Delete entire score | 204, 404, 500 |

### Instrument Operations

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/scores/{scoreId}/instruments` | Add instrument to score | 201, 400, 404, 500 |

### Staff Operations

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/scores/{scoreId}/instruments/{instrumentId}/staves` | Add staff to instrument | 201, 404, 500 |

### Voice Operations

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/scores/{scoreId}/instruments/{instrumentId}/staves/{staffId}/voices` | Add voice to staff | 201, 404, 500 |

### Note Operations

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/scores/{scoreId}/instruments/{instrumentId}/staves/{staffId}/voices/{voiceId}/notes` | Add note to voice | 201, 400, 404, 409*, 500 |
| GET | `/scores/{scoreId}/instruments/{instrumentId}/staves/{staffId}/voices/{voiceId}/notes` | Query notes (with range filter) | 200, 404, 500 |

*409 returned when note overlaps with same pitch in voice (FR-023 validation)

### Global Structural Event Operations

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/scores/{scoreId}/structural-events/tempo` | Add tempo event | 201, 400, 404, 409*, 500 |
| POST | `/scores/{scoreId}/structural-events/time-signature` | Add time signature event | 201, 400, 404, 409*, 500 |

*409 returned when duplicate structural event at same tick (FR-019 validation)

### Staff Structural Event Operations

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/scores/{scoreId}/instruments/{instrumentId}/staves/{staffId}/structural-events/clef` | Add clef event to staff | 201, 400, 404, 409*, 500 |
| POST | `/scores/{scoreId}/instruments/{instrumentId}/staves/{staffId}/structural-events/key-signature` | Add key signature event to staff | 201, 400, 404, 409*, 500 |

*409 returned when duplicate structural event at same tick (FR-019 validation)

---

## Contract Tests

Per constitution principle V (Test-First Development), all API endpoints require contract tests before implementation.

**Test Framework**: TBD (Phase 2 tasks generation) - candidates include `cargo test` with REST client assertions or dedicated contract testing tools

**Test Categories**:

1. **Happy Path Tests**:
   - Create score → verify defaults at tick 0
   - Add instrument → verify staff created with defaults
   - Add note → verify stored correctly
   - Query notes → verify retrieval

2. **Validation Tests** (enforce domain invariants):
   - Add note with duration_ticks = 0 → 400 Bad Request
   - Add note with pitch > 127 → 400 Bad Request
   - Add overlapping note with same pitch → 409 Conflict
   - Add duplicate tempo event at same tick → 409 Conflict

3. **Error Handling Tests**:
   - Request non-existent score → 404 Not Found
   - Malformed JSON body → 400 Bad Request
   - Server error simulation → 500 Internal Error

**Consumer-Driven Contracts** (if frontend developed in parallel):
- Frontend team defines expected request/response shapes
- Backend tests validate API satisfies frontend expectations
- Changes to API contract require negotiation between teams

---

## Validation Rules (API Boundary)

The API enforces these domain invariants at the HTTP boundary (before calling domain logic):

### Request Validation

**Note Creation** (FR-020, FR-021):
- `start_tick` ≥ 0 (enforced by schema `minimum: 0`)
- `duration_ticks` > 0 (enforced by schema `minimum: 1`)
- `pitch` in range 0-127 (enforced by schema `minimum: 0, maximum: 127`)

**Tempo Event** (research decisions):
- `bpm` in range 1-400 (enforced by schema `minimum: 1, maximum: 400`)

**Time Signature Event** (data model):
- `denominator` must be power of 2 (enforced by schema `enum: [1, 2, 4, 8, 16]`)

**Key Signature Event** (data model):
- `sharps` in range -7 to +7 (enforced by schema `minimum: -7, maximum: 7`)

### Domain Logic Validation

**Overlapping Notes** (FR-023):
- Domain layer checks: if same pitch overlaps in same voice → return DomainError
- API adapter maps DomainError::OverlappingNote → 409 Conflict response

**Duplicate Structural Events** (FR-019):
- Domain layer checks: if same event type at same tick → return DomainError
- API adapter maps DomainError::DuplicateStructuralEvent → 409 Conflict response

**Initial Structural Events** (FR-017, FR-018):
- Score::new() and Staff::new() automatically create required events at tick 0
- Deletion of tick 0 events rejected by domain → 400 Bad Request response

---

## Example Request/Response Flows

### Create Score with Instrument and Note

```http
# 1. Create score
POST /api/v1/scores
Content-Type: application/json

{}

→ 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "global_structural_events": [
    { "tick": 0, "bpm": 120 },
    { "tick": 0, "numerator": 4, "denominator": 4 }
  ],
  "instruments": []
}

# 2. Add piano instrument
POST /api/v1/scores/550e8400-e29b-41d4-a716-446655440000/instruments
Content-Type: application/json

{ "name": "Piano" }

→ 201 Created
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

# 3. Add note (Middle C, quarter note)
POST /api/v1/scores/550e8400-e29b-41d4-a716-446655440000/instruments/6ba7b810-9dad-11d1-80b4-00c04fd430c8/staves/7c9e6679-7425-40de-944b-e07fc1f90ae7/voices/886313e1-3b8a-5372-9b90-0c9aee199e5d/notes
Content-Type: application/json

{
  "start_tick": 0,
  "duration_ticks": 960,
  "pitch": 60
}

→ 201 Created
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "start_tick": 0,
  "duration_ticks": 960,
  "pitch": 60
}
```

### Validation Error Example

```http
POST /api/v1/scores/550e8400-e29b-41d4-a716-446655440000/instruments/6ba7b810-9dad-11d1-80b4-00c04fd430c8/staves/7c9e6679-7425-40de-944b-e07fc1f90ae7/voices/886313e1-3b8a-5372-9b90-0c9aee199e5d/notes
Content-Type: application/json

{
  "start_tick": 0,
  "duration_ticks": 0,
  "pitch": 60
}

→ 400 Bad Request
{
  "error": "Invalid note duration: must be > 0"
}
```

---

## Frontend Integration

The React frontend consumes this API through service modules:

**Example Service** (TypeScript):
```typescript
// frontend/src/services/score-api.ts
export interface Score {
  id: string;
  global_structural_events: GlobalStructuralEvent[];
  instruments: Instrument[];
}

export class ScoreApiClient {
  constructor(private baseUrl: string = 'http://localhost:8080/api/v1') {}

  async createScore(): Promise<Score> {
    const response = await fetch(`${this.baseUrl}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error(`Failed to create score: ${response.statusText}`);
    return response.json();
  }

  async getScore(scoreId: string): Promise<Score> {
    const response = await fetch(`${this.baseUrl}/scores/${scoreId}`);
    if (!response.ok) throw new Error(`Failed to get score: ${response.statusText}`);
    return response.json();
  }

  // ... other methods
}
```

**Type Generation**: Consider using tools like `openapi-typescript` to auto-generate TypeScript types from OpenAPI spec for type safety.

---

## Future Extensions (Out of Scope for This Feature)

- **Pagination**: For large score lists, add `?page=1&per_page=20` query params
- **Partial Updates**: PATCH endpoints for updating note properties without full replacement
- **Bulk Operations**: Batch note creation/update for performance
- **Real-time Updates**: WebSocket or Server-Sent Events for collaborative editing
- **Query Optimization**: GraphQL endpoints for flexible frontend data fetching

---

## Tooling

**OpenAPI Validation**: Use `openapi-generator` or `swagger-ui` to validate spec and generate documentation

**Mock Server**: Use `prism` or `swagger-mock-server` to create mock API for frontend development before backend implementation

**Code Generation**: Consider `openapi-generator` to generate Rust server stubs (though hexagonal architecture may prefer manual port/adapter implementation for control)

---

## Summary

**Endpoints**: 13 total (4 score, 1 instrument, 1 staff, 1 voice, 2 note, 4 structural event)  
**Status Codes**: 200, 201, 204, 400, 404, 409, 500  
**Validation**: Schema-based (OpenAPI) + domain-based (Rust logic)  
**Testing**: Contract tests required before implementation (TDD)  
**Frontend**: React service layer consumes JSON API  

**Next Phase**: Generate quickstart.md with integration scenarios, then update agent context.
