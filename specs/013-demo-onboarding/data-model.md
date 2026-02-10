# Data Model: Demo Music Onboarding

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)  
**Date**: 2026-02-10

## Overview

This document defines the data structures and entities for first-run detection, view mode preferences, and demo music loading. All models are technology-agnostic specifications; TypeScript contracts implementing these models are defined in `contracts/`.

---

## Entities

### 1. First-Run State

**Purpose**: Tracks whether the user has launched the application before to trigger onboarding.

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `isFirstRun` | Boolean | Yes | True if user has never launched app, false otherwise |
| `firstRunDate` | ISO 8601 DateTime | No | Timestamp when first run was completed (for analytics) |
| `firstRunVersion` | String | No | App version during first run (for migration tracking) |

**Lifecycle**:
- **Creation**: On first app launch, defaults to `isFirstRun = true`
- **Update**: Set to `false` after successful first-run completion (demo loaded, view mode set)
- **Deletion**: Never deleted (persists across sessions for analytics)
- **Reset**: Only on explicit user action (clear browser data) or developer testing

**Invariants**:
- `firstRunDate` MUST NOT be set if `isFirstRun` is `true`
- `firstRunDate` MUST be set if `isFirstRun` is `false`
- `firstRunDate` MUST NOT change once set (immutable timestamp)

**Storage**: Browser Local Storage (key: `musicore_firstRun`)

---

### 2. View Mode Preference

**Purpose**: Persists user's preferred score viewing mode (stacked or single-instrument) across sessions.

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | Enum: `"stacked"` \| `"single"` | Yes | Current view mode preference |
| `lastUpdated` | ISO 8601 DateTime | Yes | Timestamp of last preference change |
| `source` | Enum: `"default"` \| `"user"` \| `"onboarding"` | No | How preference was set (for analytics) |

**Valid Values**:
- `mode`:
  - `"stacked"`: Display all instruments simultaneously (default for first-run)
  - `"single"`: Display one instrument at a time (user can switch)

**Lifecycle**:
- **Creation**: On first run, set to `{ mode: "stacked", source: "onboarding" }`
- **Update**: When user explicitly changes view mode via UI
- **Deletion**: Never deleted (persists indefinitely)
- **Reset**: On browser data clear or user preference reset action

**Invariants**:
- `mode` MUST be one of the defined enum values
- `lastUpdated` MUST be updated whenever `mode` changes
- Default value (if no preference stored) MUST be `"stacked"` per spec.md requirement

**Relationships**:
- Applies globally to ALL scores (not per-score preference)
- Independent of which score is currently loaded
- Used by stacked view components from Feature 010

**Storage**: Browser Local Storage (key: `musicore_viewMode`)

---

### 3. Demo Score Metadata

**Purpose**: Identifies the bundled demo music (Canon D) within the user's music library.

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` |UUID | Yes | Unique identifier for demo score in library |
| `title` | String | Yes | "Canon in D" |
| `composer` | String | Yes | "Johann Pachelbel" |
| `isDemoScore` | Boolean | Yes | True to identify bundled demo vs user imports |
| `sourceType` | Enum: `"bundled"` \| `"imported"` | Yes | `"bundled"` for demo, `"imported"` for user files |
| `bundledPath` | String | No | `/demo/CanonD.musicxml` (path to bundled asset) |
| `loadedDate` | ISO 8601 DateTime | Yes | When demo was first loaded into library |

**Lifecycle**:
- **Creation**: On first run, after parsing Canon D MusicXML
- **Update**: Never (demo score metadata immutable)
- **Deletion**: User can delete demo from library (same as any score)
- **Reload**: If deleted, "Reload Demo" feature recreates with new UUID

**Invariants**:
- `isDemoScore = true` implies `sourceType = "bundled"`
- `bundledPath` MUST be set if `sourceType = "bundled"`
- Demo score MUST have at least 4 instruments (violin, viola, cello, bass) - validated during parsing
- Demo score follows same storage schema as user-imported scores (from Feature 011)

**Relationships**:
- Extends/implements `Score` entity from Feature 011 (MusicXML import)
- Stored in same IndexedDB as user-imported scores (reuses existing storage port)
- Flagged with `isDemoScore` to enable special handling (prevent accidental edits, show "demo" badge)

**Storage**: IndexedDB (same `scores` object store from Feature 011)

---

### 4. Onboarding Configuration

**Purpose**: Static configuration for onboarding behavior (not persisted, code constants).

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `defaultViewMode` | Enum: `"stacked"` \| `"single"` | Yes | Default mode for first run (always `"stacked"`) |
| `demoBundlePath` | String | Yes | Path to Canon D asset (`"/demo/CanonD.musicxml"`) |
| `enableDemoReload` | Boolean | Yes | Whether to show "Reload Demo" UI (false for MVP/P1, true for P3) |
| `firstRunTimeoutMs` | Number | Yes | Max time to wait for demo loading before showing error (e.g., 5000ms) |

**Source**: Defined as TypeScript constants in codebase, not stored in browser

**Validation**:
- `demoBundlePath` MUST resolve to valid MusicXML file at build time (checked via integration test)
- `defaultViewMode`  MUST match spec.md requirement (`"stacked"`)

---

## Data Flows

### Flow 1: First-Run Onboarding

```
1. App Launch
   ↓
2. Read Local Storage for first-run flag
   ↓
3a. Flag NOT exists (first run)
   ↓
   4a. Fetch /demo/CanonD.musicxml
   ↓
   5a. Parse via WASM engine (reuse Feature 011)
   ↓
   6a. Store Score in IndexedDB with isDemoScore=true
   ↓
   7a. Set view mode preference to "stacked"
   ↓
   8a. Write first-run flag to Local Storage (isFirstRun=false)
   ↓
   9a. Render app with Canon D in stacked view
   
3b. Flag exists (returning user)
   ↓
   4b. Read view mode preference from Local Storage
   ↓
   5b. Render app with stored preference (may be "stacked" or "single")
```

### Flow 2: View Mode Switching

```
1. User clicks ViewModeSelector toggle (Feature 010 UI)
   ↓
2. Update React state (viewMode: "stacked" → "single" or vice versa)
   ↓
3. Trigger preference persistence useEffect
   ↓
4. Write updated preference to Local Storage
   ↓
5. Re-render score with new view mode
```

### Flow 3: Demo Reload (P3 - Optional)

```
1. User clicks "Reload Demo" button
   ↓
2. Check if demo already exists in library
   ↓
3a. Demo exists → Navigate to existing demo score
   
3b. Demo not exists (deleted)
   ↓
   4b. Re-run demo loading flow (steps 4a-6a from Flow 1)
   ↓
   5b. Navigate to newly loaded demo score
```

---

## Storage Schema

### Local Storage Keys

| Key | Value Type | Example | Purpose |
|-----|------------|---------|---------|
| `musicore_firstRun` | JSON String ({isFirstRun, firstRunDate}) | `'{"isFirstRun":false,"firstRunDate":"2026-02-10T14:30:00Z"}'` | First-run detection |
| `musicore_viewMode` | JSON String ({mode, lastUpdated, source}) | `'{"mode":"stacked","lastUpdated":"2026-02-10T14:35:00Z","source":"onboarding"}'` | View mode preference |

**Encoding**: All Local Storage values stored as JSON strings for type safety and extensibility

**Versioning**: Not required for MVP (simple structures), but keys namespaced with `musicore_` prefix to avoid conflicts

### IndexedDB Schema (Feature 011 Extension)

**Object Store**: `scores` (already exists from Feature 011)

**New Fields Added to Score Documents**:
| Field | Type | Description |
|-------|------|-------------|
| `isDemoScore` | Boolean | True for bundled demo, false for user imports (defaults to false) |
| `sourceType` | String | "bundled" or "imported" |
| `bundledPath` | String (optional) | Original bundle path for re-loading |

**Query Pattern**: 
```typescript
// Find demo score (if exists)
const demoScore = await db.scores
  .where('isDemoScore')
  .equals(true)
  .first();
```

**Backward Compatibility**: Existing scores without `isDemoScore` field default to `false` (treat as user imports)

---

## Validation Rules

### First-Run State Validation

- ✅ MUST persist across browser sessions (localStorage durability)
- ✅ MUST be readable synchronously (no async DB calls during init)
- ✅ MUST handle corrupted localStorage (invalid JSON → treat as first run)
- ✅ MUST handle missing localStorage (private mode → treat as first run, don't persist)

### View Mode Preference Validation

- ✅ MUST be one of defined enum values (`"stacked"` or `"single"`)
- ✅ MUST default to `"stacked"` if preference not found
- ✅ MUST persist immediately on user change (write-through, not debounced)
- ✅ MUST be independent of currently loaded score

### Demo Score Validation

- ✅ MUST pass same MusicXML validation as user imports (reuse Feature 011 parser)
- ✅ MUST contain at least 4 instrument parts (requirement for stacked view demo)
- ✅ MUST be <500KB uncompressed (bundle size constraint)
- ✅ MUST NOT override existing user score with same title (UUID prevents collisions)

---

## Error States

| Error Condition | Data State | Recovery Strategy |
|-----------------|------------|-------------------|
| localStorage disabled (private mode) | First-run flag not persisted | Treat every session as first-run (demo loads each time) |
| Canon D fetch fails (404) | Demo not loaded | Show error notification, allow user to import music |
| WASM parser error (invalid XML) | Demo not loaded | Log error, fallback to empty library state |
| IndexedDB quota exceeded | Demo not stored | Show quota error, prompt user to delete old scores |
| Corrupted preference JSON | Preference unreadable | Default to "stacked", log warning |

---

## Migrations

**Not Required for MVP** - This is the first version implementing onboarding.

**Future Migrations** (if data structure changes):
- Preference schema version field could be added for migration tracking
- Demo score could be updated (new version of Canon D) by checking `loadedDate` against bundle version

---

## Domain Boundaries

**What This Feature DOES NOT Change**:
- ❌ Score domain model (Feature 001, 002, etc.) - demo is just another Score instance
- ❌ MusicXML parsing logic (Feature 011) - reuses existing WASM parser
- ❌ Stacked view rendering (Feature 010) - reuses existing components
- ❌ Playback engine (Feature 008, 009) - demo plays like any score
- ❌ Storage service interface (Feature 011) - reuses existing IndexedDB port

**What This Feature ADDS**:
- ✅ Application-layer first-run detection (infrastructure concern)
- ✅ User preference persistence layer (infrastructure concern)
- ✅ Demo asset bundling strategy (deployment concern)
- ✅ Onboarding initialization logic (application workflow)

---

**Data Model Complete**: All entities and data flows defined. Ready for contract generation (Phase 1).
