# IndexedDB Schema Contract

**Feature**: 025-offline-mode
**Purpose**: Reference document for IndexedDB schema (unchanged in this feature)
**Type**: Data schema contract

## Overview

This contract documents the IndexedDB schema used for offline score persistence. **No changes** are made to this schema in Feature 025 — this is a **reference document** for understanding offline data storage.

The IndexedDB database was established in **Feature 011** (WASM music engine + local storage).

---

## Database Structure

### Database Name

```typescript
const DB_NAME = 'musicore-db';
const DB_VERSION = 2; // Current version (schema v2)
```

### Object Stores

| Store Name | Key Path | Auto-Increment | Purpose |
|------------|----------|----------------|---------|
| `scores` | `id` | No | Store Score objects |

---

## Score Object Schema

### TypeScript Interface

```typescript
// Defined in: frontend/src/types/score.ts
interface Score {
  id: string;                    // UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")
  title?: string;                // Score title (e.g., "Canon in D")
  composer?: string;             // Composer name (e.g., "Pachelbel")
  arranger?: string;             // Arranger name (optional)
  instruments: Instrument[];     // Array of instruments in the score
  schema_version: number;        // Schema version (currently 2)
  isDemoScore?: boolean;         // Flag indicating this is the demo score (Feature 013)
}

interface Instrument {
  id: string;                    // UUID
  name: string;                  // Instrument name (e.g., "Violin I")
  midi_program?: number;         // MIDI program number (e.g., 40 for violin)
  staves: Staff[];               // Array of staves for this instrument
}

interface Staff {
  id: string;                    // UUID
  clef: Clef;                    // Clef type (treble, bass, etc.)
  voices: Voice[];               // Array of voices on this staff
}

interface Voice {
  id: string;                    // UUID
  voice_number: number;          // Voice number (1-based)
  measures: Measure[];           // Array of measures in this voice
}

interface Measure {
  id: string;                    // UUID
  measure_number: number;        // Measure number (1-based)
  time_signature?: TimeSignature; // Time signature (if changed in this measure)
  key_signature?: KeySignature;  // Key signature (if changed in this measure)
  tempo?: Tempo;                 // Tempo (if changed in this measure)
  notes: Note[];                 // Array of notes/rests in this measure
}

// ... other types (Note, TimeSignature, KeySignature, Tempo, etc.)
```

### Example Score Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Canon in D",
  "composer": "Johann Pachelbel",
  "arranger": null,
  "schema_version": 2,
  "isDemoScore": true,
  "instruments": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Violin I",
      "midi_program": 40,
      "staves": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "clef": { "clef_type": "Treble", "line": 2 },
          "voices": [
            {
              "id": "880e8400-e29b-41d4-a716-446655440003",
              "voice_number": 1,
              "measures": [
                {
                  "id": "990e8400-e29b-41d4-a716-446655440004",
                  "measure_number": 1,
                  "time_signature": { "beats": 4, "beat_type": 4 },
                  "key_signature": { "fifths": 2, "mode": "Major" },
                  "tempo": { "bpm": 60, "beat_unit": "Quarter" },
                  "notes": [
                    {
                      "id": "aa0e8400-e29b-41d4-a716-446655440005",
                      "pitch": { "step": "F", "octave": 4, "alter": 1 },
                      "duration": { "NoteDuration": "Quarter" },
                      "note_type": "Pitch"
                    }
                    // ... more notes
                  ]
                }
                // ... more measures
              ]
            }
          ]
        }
      ]
    }
    // ... more instruments
  ]
}
```

---

## Storage Operations

### Create/Update Score

**Function**: `saveScoreToIndexedDB(score: Score): Promise<void>`

**Location**: `frontend/src/services/storage/local-storage.ts`

**Behavior**:
```typescript
// Pseudocode
async function saveScoreToIndexedDB(score: Score): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['scores'], 'readwrite');
  const store = transaction.objectStore('scores');
  
  // Upsert: Insert if new, update if exists (key = score.id)
  await store.put(score);
  
  await transaction.complete;
}
```

**Contract**:
- MUST upsert (insert or update) based on `score.id`
- MUST be atomic (transaction succeeds or fails completely)
- MUST work offline (IndexedDB is local storage)

---

### Read Score by ID

**Function**: `loadScoreFromIndexedDB(id: string): Promise<Score | null>`

**Location**: `frontend/src/services/storage/local-storage.ts`

**Behavior**:
```typescript
// Pseudocode
async function loadScoreFromIndexedDB(id: string): Promise<Score | null> {
  const db = await openDatabase();
  const transaction = db.transaction(['scores'], 'readonly');
  const store = transaction.objectStore('scores');
  
  const score = await store.get(id);
  
  return score || null;
}
```

**Contract**:
- MUST return `Score` object if found
- MUST return `null` if not found
- MUST NOT throw error if not found (null is success)
- MUST work offline (IndexedDB is local storage)

---

### Read All Scores

**Function**: `getAllScoresFromIndexedDB(): Promise<Score[]>`

**Location**: `frontend/src/services/storage/local-storage.ts`

**Behavior**:
```typescript
// Pseudocode
async function getAllScoresFromIndexedDB(): Promise<Score[]> {
  const db = await openDatabase();
  const transaction = db.transaction(['scores'], 'readonly');
  const store = transaction.objectStore('scores');
  
  const allScores = await store.getAll();
  
  // Filter by schema version (backwards compatibility)
  return allScores.filter(score => score.schema_version === 2);
}
```

**Contract**:
- MUST return array of all scores (empty array if none)
- MUST filter by current `schema_version` (ignore old versions)
- MUST work offline (IndexedDB is local storage)

---

### Delete Score

**Function**: `deleteScoreFromIndexedDB(id: string): Promise<void>`

**Location**: `frontend/src/services/storage/local-storage.ts`

**Behavior**:
```typescript
// Pseudocode
async function deleteScoreFromIndexedDB(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['scores'], 'readwrite');
  const store = transaction.objectStore('scores');
  
  await store.delete(id);
  
  await transaction.complete;
}
```

**Contract**:
- MUST delete score by ID
- MUST be atomic (transaction succeeds or fails completely)
- MUST NOT throw error if ID doesn't exist (deletion is idempotent)
- MUST work offline (IndexedDB is local storage)

---

## Schema Versioning

### Current Version: 2

**Changelog**:

| Version | Change | Migration Path |
|---------|--------|----------------|
| **1** | Initial schema (Feature 011) | N/A (first version) |
| **2** | Added `isDemoScore` field (Feature 013) | Implicit: Old scores lack field (treated as `undefined` / `false`) |

**Migration Strategy**:
- **No explicit migration** — `isDemoScore` is optional, defaults to `undefined`
- **Backwards compatibility** — Old scores (v1) still readable (missing field treated as `false`)
- **Forward compatibility** — `getAllScoresFromIndexedDB()` filters by `schema_version === 2`

**Contract**:
- MUST set `schema_version: 2` when creating new scores
- MUST filter by `schema_version` when reading (ignore old versions)
- SHOULD NOT break old scores (additive changes only)

---

## Storage Quota

### Browser Limits

| Browser | Quota Type | Typical Limit | Notes |
|---------|------------|---------------|-------|
| **Chrome** | Group storage | 60% of disk space | Shared across all same-origin data |
| **Firefox** | Group storage | 10% of disk space | Shared across all same-origin data |
| **Safari** | Per-origin | 1GB | May prompt user for permission |
| **Edge** | Group storage | 60% of disk space | Same as Chrome (Chromium-based) |

**Contract**:
- App MUST handle quota exceeded errors gracefully
- SHOULD show clear error message: "Storage quota exceeded. Delete old scores to free space."
- SHOULD NOT assume unlimited storage

### Quota Management

**Best Practices**:
- Monitor storage usage: `navigator.storage.estimate()`
- Warn user when approaching quota (e.g., 80% full)
- Allow user to delete old scores to free space

**Contract**:
- MUST NOT silently fail when quota exceeded
- MUST provide user with actionable error message

---

## Concurrent Access

### Same-Tab Concurrency

**Contract**: IndexedDB handles concurrent transactions within the same tab automatically.

**Behavior**:
- Read transactions run concurrently
- Write transactions queue (serialized)
- No race conditions within a single tab

---

### Cross-Tab Concurrency

**Contract**: IndexedDB handles cross-tab concurrency automatically, but app MUST handle version change events.

**Scenario**: User opens two tabs, both access IndexedDB.

**Behavior**:
- Read transactions in both tabs succeed (concurrent reads OK)
- Write transactions in both tabs succeed (IndexedDB serializes writes)
- Database version changes (e.g., schema migration) trigger `onversionchange` event

**Contract**:
- App SHOULD listen for `onversionchange` event
- App SHOULD warn user to refresh if schema version changes

---

## Persistence Guarantees

### Data Durability

**Contract**: IndexedDB data persists until explicitly deleted or browser storage cleared.

**Guarantees**:
- ✅ Data survives page refresh
- ✅ Data survives browser restart
- ✅ Data survives offline/online transitions
- ❌ Data MAY be cleared if browser runs out of disk space (browser storage eviction policy)

**Best Practices**:
- Request persistent storage: `navigator.storage.persist()`
- Inform user that data is stored locally (privacy notice)

---

## Privacy and Security

### Same-Origin Policy

**Contract**: IndexedDB data is scoped to origin (protocol + domain + port).

**Guarantees**:
- ✅ `https://musicore.app` cannot access `https://other-site.com` IndexedDB
- ✅ `http://musicore.app` cannot access `https://musicore.app` IndexedDB (different protocol)
- ✅ `https://musicore.app:443` and `https://musicore.app:8080` are different origins (different port)

---

### Encryption

**Contract**: IndexedDB data is NOT encrypted by the app (relies on browser security).

**Guarantees**:
- ✅ Data is protected by OS-level file permissions (browser profile directory)
- ✅ Data is NOT encrypted at rest by Musicore (browser may encrypt, but not guaranteed)
- ❌ Data is readable by anyone with filesystem access to browser profile

**Recommendation**: If storing sensitive data (e.g., proprietary compositions), consider client-side encryption (future enhancement).

---

## Offline Behavior (Feature 025)

### Changes in Feature 025

**No schema changes** — IndexedDB schema remains unchanged.

**Usage changes**:
1. **Demo scores**: Now have `isDemoScore: true` flag (already implemented in Feature 013, no change)
2. **Backend sync removed**: Scores no longer synced to REST API (Feature 025 removes `syncLocalScoreToBackend`)
3. **IndexedDB is single source of truth**: No REST API fallback (Feature 025 removes `apiClient.getScore` fallback)

---

### IndexedDB as Offline Storage

**Contract**: IndexedDB is the **primary and only** persistent storage for scores.

**Before Feature 025**:
- IndexedDB = local cache
- REST API = source of truth
- Sync logic kept them in sync

**After Feature 025**:
- IndexedDB = source of truth
- REST API = REMOVED
- No sync needed

**Assertion**: IndexedDB must be **reliable** and **durable** because there is no backend fallback.

---

## Testing Contract

### Test Coverage

**Required tests** (Feature 011, still valid):
- Save score → Read back → Assert equal
- Save score → Delete → Read back → Assert null
- Save multiple scores → Get all → Assert count
- Schema version filtering → Old scores ignored

**Additional tests** (Feature 025):
- Demo score has `isDemoScore: true` flag
- `getAllScoresFromIndexedDB()` returns demo score
- Demo score in IndexedDB triggers fast path (no fetch)

---

## Summary

**Schema**: Single object store (`scores`) with `id` as key path, storing `Score` objects.

**Operations**: Create/update (upsert), read by ID, read all, delete.

**Offline**: All operations work offline (IndexedDB is local storage).

**Versioning**: Current schema v2, backwards compatible with v1.

**Quota**: Browser-dependent, MUST handle quota exceeded errors.

**Security**: Same-origin policy enforced, no encryption at rest (rely on browser security).

**Feature 025 Impact**: No schema changes — IndexedDB is now the single source of truth (no REST API fallback).
