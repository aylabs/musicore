# API Contracts: Tempo Change Support

**Feature**: 008-tempo-change  
**Phase**: 1 - API Contracts  
**Date**: 2026-02-09

## Status: No API Contracts Required

### Rationale

Feature 008 (Tempo Change Support) is a **frontend-only feature** with no backend API changes. All functionality is implemented in the browser:

1. **Tempo adjustment**: Applied during playback scheduling (frontend PlaybackScheduler)
2. **State management**: React Context in frontend (TempoStateContext)
3. **Persistence**: Browser localStorage (per-score tempo preferences)
4. **Audio playback**: Tone.js in browser (Web Audio API)

### No Backend Changes

The backend API remains unchanged:
- ✅ No new REST endpoints
- ✅ No modifications to existing endpoints
- ✅ No database schema changes
- ✅ No domain model changes (Score/TempoEvent unchanged)

### Existing API (Unchanged)

Frontend continues to use existing API:
- `GET /api/scores` - List scores
- `GET /api/scores/{id}` - Get score details (includes tempo events)
- `POST /api/scores/import/musicxml` - Import MusicXML files
- Other endpoints for score editing (unchanged)

### Component Contracts (Frontend-Only)

While there are no REST API contracts, the feature does define internal TypeScript contracts:

#### 1. PlaybackScheduler Contract

```typescript
// Modified method signature
public scheduleNotes(
  notes: Note[], 
  tempo: number, 
  currentTick: number,
  tempoMultiplier: number = 1.0  // NEW: Optional parameter (default 1.0)
): void
```

**Contract**:
- `tempoMultiplier` defaults to 1.0 (100%, no change) for backward compatibility
- Existing callers without tempo multiplier continue to work
- New callers can pass multiplier to adjust playback tempo
- Range validation: Callers expected to clamp 0.5-2.0

#### 2. TempoStateContext Contract

```typescript
interface TempoStateContextValue {
  tempoState: TempoState;
  setTempoMultiplier: (multiplier: number) => void;
  adjustTempo: (percentChange: number) => void;
  resetTempo: () => void;
  getEffectiveTempo: () => number;
  setOriginalTempo: (tempo: number) => void;
}
```

**Contract**:
- Consumers call `useTempoState()` hook
- `adjustTempo()` accepts +1, -1, +10, -10 for percentage changes
- `setTempoMultiplier()` automatically clamps to 0.5-2.0 range
- Context must be wrapped in `<TempoStateProvider>`

#### 3. TempoPreferences Contract (localStorage)

```typescript
interface TempoPreference {
  scoreId: string;
  tempoMultiplier: number;
  timestamp: number;
  version: number;
}

// Key format
key = `musicore:tempo:${scoreId}`
```

**Contract**:
- Keys namespaced with `musicore:tempo:` prefix
- JSON serialization/deserialization
- Version field for future migrations (currently v1)
- Invalid entries return default (1.0) instead of throwing errors

### Future API Considerations

If tempo preferences are moved to server-side storage in the future (outside current scope):

**Potential REST endpoints** (not implemented now):
```
GET    /api/preferences/tempo/{scoreId}    # Get saved tempo preference
PUT    /api/preferences/tempo/{scoreId}    # Save tempo preference
DELETE /api/preferences/tempo/{scoreId}    # Clear tempo preference
```

**JSON payload** (same as localStorage schema):
```json
{
  "scoreId": "abc-123",
  "tempoMultiplier": 0.8,
  "timestamp": 1738368000000,
  "version": 1
}
```

**Why not implemented now**:
- ❌ Adds backend complexity (database model, API endpoints)
- ❌ Requires user authentication (preferences are per-user)
- ❌ localStorage is sufficient for single-user desktop application
- ✅ Future enhancement if multi-device sync needed

---

## Architecture Decision

**Frontend/Backend Boundary**: This feature respects the hexagonal architecture principle by keeping tempo adjustment in the **adapter layer** (playback). The domain layer (Score, TempoEvent) remains pure and unchanged.

**Domain vs Playback**:
- **Domain**: `TempoEvent` represents the composer's intended tempo (120 BPM)
- **Playback**: `tempoMultiplier` represents the user's practice speed adjustment (80%)
- **Clear separation**: Domain defines "what", adapter layer adjusts "how"

This is documented here to clarify architectural decision, even though no API contracts exist.
