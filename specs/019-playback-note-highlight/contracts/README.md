# Contracts: Playback Note Highlighting

**Feature**: 019-playback-note-highlight  
**Purpose**: Define TypeScript interfaces and type contracts

## Overview

This directory contains TypeScript interface definitions that specify the contracts between:

1. **Playback State Management** (MusicTimeline, usePlayback)
2. **Highlight Calculation Logic** (useNoteHighlight hook)
3. **Rendering Components** (LayoutRenderer, NoteElement)

## File Structure

```
contracts/
├── README.md                    # This file
└── HighlightInterfaces.ts       # TypeScript interfaces
```

## Contract Files

### HighlightInterfaces.ts

Defines the following contracts:

**Core Interfaces**:
- `UseNoteHighlightReturn` - Return type for the useNoteHighlight hook
- `UseNoteHighlightParams` - Input parameters for highlight calculation
- `NoteElementHighlightProps` - Props for individual note rendering
- `LayoutRendererHighlightProps` - Props for the layout renderer component

**Function Signatures**:
- `ComputeHighlightedNotesFn` - Pure function for highlight computation
- `IsNotePlayingFn` - Helper to check if a note is playing

**Future Extensions**:
- `HighlightConfig` - Configuration options (reserved for future use)
- `HighlightPerformanceMetrics` - Performance profiling data

**Validation Helpers**:
- `ValidateHighlightStateFn` - Development-time validation
- `AssertHighlightInvariantsFn` - Invariant checking

## Usage Examples

### In useNoteHighlight Hook

```typescript
import { UseNoteHighlightParams, UseNoteHighlightReturn } from './contracts/HighlightInterfaces';

export function useNoteHighlight(
  notes: Note[],
  currentTick: number,
  status: PlaybackStatus
): UseNoteHighlightReturn {
  const highlightedNoteIds = useMemo(() => {
    if (status === 'stopped') {
      return new Set<string>();
    }
    
    return computeHighlightedNotes(notes, currentTick);
  }, [notes, currentTick, status]);

  return { highlightedNoteIds };
}
```

### In LayoutRenderer Component

```typescript
import { LayoutRendererHighlightProps } from './contracts/HighlightInterfaces';

interface LayoutRendererProps extends LayoutRendererHighlightProps {
  layoutData: LayoutData;
  // ... other props
}

export function LayoutRenderer({ 
  layoutData, 
  highlightedNoteIds 
}: LayoutRendererProps) {
  return (
    <>
      {layoutData.notes.map(note => (
        <NoteElement
          key={note.id}
          note={note}
          isHighlighted={highlightedNoteIds.has(note.id)}
        />
      ))}
    </>
  );
}
```

### In NoteElement Component

```typescript
import { NoteElementHighlightProps } from './contracts/HighlightInterfaces';

interface NoteElementProps extends NoteElementHighlightProps {
  note: Note;
  // ... other props
}

export const NoteElement = React.memo(({ 
  note, 
  isHighlighted 
}: NoteElementProps) => {
  return (
    <g className={isHighlighted ? 'note highlighted' : 'note'}>
      {/* SVG rendering */}
    </g>
  );
}, (prev, next) => 
  prev.isHighlighted === next.isHighlighted && 
  prev.note.id === next.note.id
);
```

## Contract Guarantees

### Type Safety

- All interfaces use TypeScript's strict mode
- No `any` types (promotes type safety across the system)
- Clear documentation for each property and function

### API Stability

- Breaking changes to these interfaces require:
  - Update to contract file with version comment
  - Update to all consuming code
  - Tests to verify contract compliance

### Testing

- Unit tests should reference these contracts
- Integration tests verify contracts are honored at runtime
- TypeScript compiler enforces contracts at build time

## Contract Validation

During development, these contracts can be validated using:

1. **TypeScript Compiler**: Catches type mismatches at build time
2. **Validation Functions**: Runtime checks in development mode (see `ValidateHighlightStateFn`)
3. **Unit Tests**: Explicitly test contract conformance

Example validation:

```typescript
// In development mode only
if (process.env.NODE_ENV === 'development') {
  validateHighlightState(notes, highlightedNoteIds);
  assertHighlightInvariants(status, highlightedNoteIds, 'computed');
}
```

## Implementation Notes

### Import Paths

When implementing these contracts in the actual codebase:

```typescript
// Spec contract (documentation)
import type { UseNoteHighlightReturn } from '../specs/019-playback-note-highlight/contracts/HighlightInterfaces';

// Actual implementation (copy to frontend/src/types/highlight.ts)
import type { UseNoteHighlightReturn } from '../types/highlight';
```

**Process**:
1. Contracts defined here during planning phase
2. Copied to `frontend/src/types/highlight.ts` during implementation
3. Spec contracts remain as documentation reference

### Evolution

As the feature evolves:

- Add new interfaces as needed
- Mark deprecated interfaces with `@deprecated` JSDoc tag
- Document breaking changes with version comments
- Keep backward compatibility where possible

## References

- **Spec**: [../spec.md](../spec.md) - Feature requirements
- **Data Model**: [../data-model.md](../data-model.md) - Entity relationships
- **Research**: [../research.md](../research.md) - Design decisions
- **Quickstart**: [../quickstart.md](../quickstart.md) - Implementation guide

## Next Steps

1. **Phase 1**: Copy interfaces to `frontend/src/types/highlight.ts`
2. **Phase 1**: Implement `useNoteHighlight` hook conforming to contracts
3. **Phase 1**: Update LayoutRenderer and NoteElement with new props
4. **Phase 2**: Create tasks (tasks.md) for implementation
5. **Phase 3**: Write tests that verify contract compliance
