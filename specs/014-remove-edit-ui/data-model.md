# Data Model: Remove Editing Interface

**Feature**: 014-remove-edit-ui  
**Date**: 2026-02-10  
**Status**: N/A - No data model changes

## Overview

This feature does not introduce or modify any data models. It is purely a UI removal feature.

---

## No Changes to Existing Entities

The following existing entities remain **unchanged**:

### Score Entity (backend/src/domain/score.rs)
- Fields: `id`, `title`, `instruments`, `timeline`, `tempo_events`, `time_signature_events`
- No modifications required

### Instrument Entity (backend/src/domain/instrument.rs)
- Fields: `id`, `name`, `staves`
- No modifications required

### Staff Entity (backend/src/domain/staff.rs)
- Fields: `id`, `voices`, `staff_structural_events`, `active_clef`, `active_key`
- No modifications required

### Voice Entity (backend/src/domain/voice.rs)
- Fields: `id`, `interval_events` (notes)
- No modifications required

### Event Entities (backend/src/domain/events.rs)
- `StructuralEvent`: Tempo, TimeSignature, Clef, KeySignature
- `IntervalEvent`: Notes, chords
- No modifications required

---

## No New Entities

This feature does not introduce any new domain entities, value objects, or aggregates.

---

## Storage/Persistence

### Backend API (Unchanged)
- REST API endpoints remain in backend code (not removed, just unused by frontend)
- Database schema (if any) unchanged
- No migrations required

### Frontend IndexedDB (Unchanged)
- Demo scores and imported scores continue to be stored in IndexedDB
- Storage schema unchanged
- Store name: `musicore-db`
- Object stores: `scores` (existing)

---

## State Management

### FileStateContext (Deprecated but Unchanged)
- TypeScript interface `FileState` remains in codebase
- Fields: `currentFilePath`, `isModified`, `lastSavedTimestamp`
- **Status**: Potentially unused after this feature, but not removed (to avoid breaking dependencies)
- **Future Action**: Audit dependencies and consider removal in separate refactoring feature

### TempoStateContext (Unchanged)
- Tempo state management for playback
- No changes required

---

## Summary

**Entities Created**: 0  
**Entities Modified**: 0  
**Entities Deprecated**: 0  
**Storage Changes**: 0  

This feature has **zero data model impact**. All changes are confined to React component rendering logic.
