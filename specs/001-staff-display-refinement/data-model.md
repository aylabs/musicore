# Data Model: Staff Display Refinement

**Feature**: 001-staff-display-refinement  
**Date**: 2026-02-11  
**Status**: N/A

## Data Model Changes

**This feature does not introduce or modify any data models.**

### Rationale

Staff Display Refinement is a **presentation-layer feature** that modifies visual styling only:
- CSS properties (opacity, margins)
- Configuration constants (staffSpace for sizing)
- SVG rendering attributes

No changes to:
- Domain entities (Score, Instrument, Staff, Voice, Note)
- Value objects (Tick, Pitch, Clef, BPM)
- Data structures or interfaces
- Storage schemas or persistence

### Affected Configuration

The only "data" change is a configuration constant:

**File**: `frontend/src/types/notation/config.ts`

```typescript
// BEFORE
export const DEFAULT_STAFF_CONFIG: StaffConfig = {
  staffSpace: 10,  // pixels between staff lines
  // ... other config
};

// AFTER
export const DEFAULT_STAFF_CONFIG: StaffConfig = {
  staffSpace: 12,  // pixels between staff lines (20% increase: 10 → 12)
  // ... other config
};
```

This is a presentation constant, not a domain model - it controls pixel spacing for visual rendering, not musical semantics.

### Related Documentation

- **Technical Design**: See [research.md](research.md) for implementation approach
- **Testing**: See [quickstart.md](quickstart.md) for validation procedures
