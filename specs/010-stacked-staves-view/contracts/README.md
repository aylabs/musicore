# API Contracts: Stacked Staves View

**Feature**: 010-stacked-staves-view  
**Date**: 2026-02-09

## Summary

**No API contracts required** for this feature.

## Rationale

This feature is **frontend-only**:
- Adds a new view mode (Individual vs Stacked) in the React frontend
- No new backend endpoints needed
- No modifications to existing endpoints
- No changes to request/response schemas

## Existing API Usage

The feature consumes the existing **GET /scores/{id}** endpoint from Feature 001:

**Endpoint**: `GET /api/v1/scores/{scoreId}`

**Response Schema** (unchanged):
```json
{
  "id": "uuid",
  "global_structural_events": [...],
  "instruments": [
    {
      "id": "uuid",
      "name": "string",
      "staves": [
        {
          "id": "uuid",
          "staff_structural_events": [...],
          "voices": [
            {
              "id": "uuid",
              "interval_events": [Note[]]
            }
          ]
        }
      ]
    }
  ]
}
```

The stacked view simply **re-arranges** this existing data visually - no backend involvement.

## Contract Testing

**Status**: N/A - no new contracts to test

The existing contract tests for Feature 001 (score retrieval) remain valid and unmodified.

---

**Compliance**: Constitution Principle III (API-First Development) ✅ PASS  
*Backend and frontend boundaries preserved; no coupling introduced.*
