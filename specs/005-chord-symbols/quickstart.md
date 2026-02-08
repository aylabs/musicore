# Quickstart Guide: Chord Symbol Visualization

**Feature**: 005-chord-symbols  
**Date**: 2026-02-08  
**Reference**: [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md)

## Overview

This guide walks through the development, testing, and integration of chord symbol visualization for the Musicore editor. Estimated implementation: **3-5 days** for P1/P2 (Display + Recognition).

---

## Prerequisites

### Local Environment

```bash
# Verify Node.js and npm
node --version  # Expected: v20.x or higher
npm --version   # Expected: v10.x or higher

# Verify Rust toolchain (for full stack, but P1/P2 frontend-only)
rustc --version # Expected: 1.82 or higher
cargo --version # Expected: 1.82 or higher

# Clone repository (if not already)
git clone https://github.com/your-org/musicore.git
cd musicore
```

### Branch Setup

```bash
# Checkout feature branch
git checkout 005-chord-symbols

# Pull latest changes
git pull origin 005-chord-symbols
```

### Install Dependencies

```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies (not needed for P1/P2, but good hygiene)
cd ../backend
cargo build

# Return to project root
cd ..
```

---

## Development Workflow

### Step 1: Create Type Definitions (30 min)

**File**: `frontend/src/types/chord.ts`

```typescript
// Copy type definitions from data-model.md
export type ChordType = 'major' | 'minor' | 'diminished' | 'augmented' | 'dominant7' | 'major7' | 'minor7';

export interface ChordGroup {
  tick: number;
  notes: Note[];
  chordType: ChordType | null;
  rootPitch: number;
  symbol: string;
}

export interface ChordPattern {
  type: ChordType;
  intervals: number[];
  symbolSuffix: string;
}

// ... (see data-model.md for complete types)
```

**Test**: Import in another file to verify no TypeScript errors.

---

### Step 2: Implement ChordDetector Service (1-2 hours)

**File**: `frontend/src/services/chord/ChordDetector.ts`

**Implementation Order**:
1. `groupByTick(notes: Note[]): Map<number, Note[]>`
   - Use `notes.reduce()` to build Map
   - Key: `note.start_tick`, Value: array of notes
2. `filterChordCandidates(groups: Map<number, Note[]>): Array<{tick, notes}>`
   - Filter groups with `notes.length >= 2`

**Test-First Approach**:

```typescript
// frontend/src/services/chord/ChordDetector.test.ts
import { describe, it, expect } from 'vitest';
import { ChordDetector } from './ChordDetector';

describe('ChordDetector', () => {
  const detector = new ChordDetector();

  it('groups notes by tick position', () => {
    const notes = [
      { id: '1', start_tick: 0, pitch: 60 },
      { id: '2', start_tick: 0, pitch: 64 },
      { id: '3', start_tick: 960, pitch: 67 },
    ];
    const groups = detector.groupByTick(notes);
    expect(groups.get(0)).toHaveLength(2);
    expect(groups.get(960)).toHaveLength(1);
  });

  it('filters groups with 2+ notes', () => {
    const groups = new Map([
      [0, [note1, note2, note3]],
      [960, [note4]],
      [1920, [note5, note6]],
    ]);
    const candidates = detector.filterChordCandidates(groups);
    expect(candidates).toHaveLength(2); // tick 0 and 1920
  });
});
```

**Run Tests**:
```bash
cd frontend
npm test -- ChordDetector.test.ts
```

---

### Step 3: Implement ChordAnalyzer Service (2-3 hours)

**File**: `frontend/src/services/chord/ChordAnalyzer.ts`

**Implementation Order**:
1. `findRoot(pitches: number[]): number`
   - Return `Math.min(...pitches)` (lowest pitch = root for P2)
2. `calculateIntervals(pitches: number[], root: number): number[]`
   - Convert to pitch classes: `pitches.map(p => (p - root) % 12)`
   - Sort and deduplicate
3. `identify(notes: Note[]): ChordGroup | null`
   - Extract pitches, find root, calculate intervals
   - Match against CHORD_PATTERNS
   - Return ChordGroup with type and symbol

**Test-First Approach**:

```typescript
// frontend/src/services/chord/ChordAnalyzer.test.ts
describe('ChordAnalyzer', () => {
  const analyzer = new ChordAnalyzer();

  it('identifies C major triad', () => {
    const notes = [
      { pitch: 60 }, // C4
      { pitch: 64 }, // E4
      { pitch: 67 }, // G4
    ];
    const chord = analyzer.identify(notes);
    expect(chord?.chordType).toBe('major');
    expect(chord?.symbol).toBe('C');
  });

  it('identifies A minor triad', () => {
    const notes = [
      { pitch: 69 }, // A4
      { pitch: 72 }, // C5
      { pitch: 76 }, // E5
    ];
    const chord = analyzer.identify(notes);
    expect(chord?.chordType).toBe('minor');
    expect(chord?.symbol).toBe('Am');
  });

  it('identifies G dominant 7th', () => {
    const notes = [
      { pitch: 67 }, // G4
      { pitch: 71 }, // B4
      { pitch: 74 }, // D5
      { pitch: 77 }, // F5
    ];
    const chord = analyzer.identify(notes);
    expect(chord?.chordType).toBe('dominant7');
    expect(chord?.symbol).toBe('G7');
  });

  it('returns null for unrecognized pattern', () => {
    const notes = [{ pitch: 60 }, { pitch: 61 }]; // C + C#
    const chord = analyzer.identify(notes);
    expect(chord).toBeNull();
  });
});
```

**Run Tests**:
```bash
npm test -- ChordAnalyzer.test.ts
```

---

### Step 4: Implement ChordSymbolFormatter Service (30 min)

**File**: `frontend/src/services/chord/ChordSymbolFormatter.ts`

**Implementation**:
- `getNoteName(pitch: number): string`
  - Map pitch class to PITCH_CLASS_NAMES
- `format(root: number, type: ChordType): string`
  - Combine note name + chord suffix

**Test**:

```typescript
it('formats C major as "C"', () => {
  expect(formatter.format(60, 'major')).toBe('C');
});

it('formats A minor as "Am"', () => {
  expect(formatter.format(69, 'minor')).toBe('Am');
});

it('formats F# diminished as "F#dim"', () => {
  expect(formatter.format(66, 'diminished')).toBe('F#dim');
});
```

---

### Step 5: Create ChordSymbol Component (2-3 hours)

**File**: `frontend/src/components/ChordSymbol.tsx`

**Implementation Order**:
1. **Props interface** (from data-model.md)
2. **useMemo hook** for chord detection (performance optimization):
   ```typescript
   const chords = useMemo(() => {
     const detector = new ChordDetector();
     const analyzer = new ChordAnalyzer();
     const groups = detector.groupByTick(notes);
     const candidates = detector.filterChordCandidates(groups);
     return candidates
       .map(({ tick, notes }) => analyzer.identify(notes))
       .filter((c): c is ChordGroup => c !== null);
   }, [notes]);
   ```
3. **Layout calculation** (tick → x position, fixed y = staffTop - 30px)
4. **SVG rendering** (`<text>` elements)

**Component Test**:

```typescript
// frontend/src/components/ChordSymbol.test.tsx
import { render } from '@testing-library/react';

describe('ChordSymbol', () => {
  it('renders chord symbol for C major triad', () => {
    const notes = [
      { id: '1', start_tick: 0, pitch: 60 },
      { id: '2', start_tick: 0, pitch: 64 },
      { id: '3', start_tick: 0, pitch: 67 },
    ];
    const { container } = render(
      <svg>
        <ChordSymbol notes={notes} staffConfig={defaultConfig} viewportWidth={800} />
      </svg>
    );
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('C');
  });
});
```

---

### Step 6: Integrate with StaffNotation (1 hour)

**File**: `frontend/src/components/StaffNotation.tsx`

**Change**:

```tsx
import { ChordSymbol } from './ChordSymbol';

export function StaffNotation({ score, ...props }) {
  return (
    <svg>
      {/* Existing staff lines, clefs, notes */}
      <g className="staff-elements">
        {/* ... */}
      </g>
      
      {/* NEW: Chord symbols layer */}
      <ChordSymbol
        notes={score.getAllNotes()} // Adjust based on actual API
        staffConfig={staffConfig}
        viewportWidth={800}
      />
    </svg>
  );
}
```

**Manual Test**:
1. Start dev server: `npm run dev`
2. Open `http://localhost:5173` (or configured port)
3. Load a score or create new
4. Add notes C4, E4, G4 at same tick
5. Verify "C" appears above staff

---

### Step 7: Performance Testing (1 hour)

**Benchmark Test**:

```typescript
// frontend/src/services/chord/performance.bench.ts
import { bench, describe } from 'vitest';

describe('Chord Detection Performance', () => {
  const notes = generateTestNotes(1000); // Helper to create large note array

  bench('detect chords in 1000 notes', () => {
    const detector = new ChordDetector();
    const analyzer = new ChordAnalyzer();
    const groups = detector.groupByTick(notes);
    const candidates = detector.filterChordCandidates(groups);
    candidates.forEach(({ notes }) => analyzer.identify(notes));
  });
});
```

**Run Benchmark**:
```bash
npm run test:bench
```

**Target**: <100ms total (70ms budgeted, 30ms buffer)

---

## Testing Strategy

### Unit Tests (TDD)

**Coverage Target**: 85%+ for chord services

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Watch mode during development
npm test -- --watch
```

**Files to Test**:
- `ChordDetector.ts`: Group and filter logic
- `ChordAnalyzer.ts`: All 7 chord types + edge cases
- `ChordSymbolFormatter.ts`: All 12 roots × 7 types
- `ChordSymbol.tsx`: Rendering and layout

### Integration Tests

**Scenarios** (from data-model.md):
1. Add C-E-G at tick 0 → "C" appears
2. Add C-Eb-G at tick 0 → "Cm" appears
3. Add C-E-G-Bb at tick 0 → "C7" appears
4. Add notes at different ticks → multiple symbols
5. Remove note from chord → symbol updates

**Manual Testing Checklist**:
- [ ] Symbol appears above staff (not overlapping staff lines)
- [ ] Symbol centered over note group
- [ ] Font readable (14px, sans-serif)
- [ ] Multiple chords don't overlap
- [ ] Handles clef/time signature collisions
- [ ] Updates when notes added/removed
- [ ] Performance smooth (60fps playback with symbols)

---

## File Structure

After implementation, your structure should look like:

```
frontend/src/
├── types/
│   └── chord.ts                        # Type definitions
├── services/
│   └── chord/
│       ├── ChordDetector.ts            # Tick grouping service
│       ├── ChordDetector.test.ts
│       ├── ChordAnalyzer.ts            # Pattern matching service
│       ├── ChordAnalyzer.test.ts
│       ├── ChordSymbolFormatter.ts     # Display formatting service
│       ├── ChordSymbolFormatter.test.ts
│       └── performance.bench.ts        # Performance benchmarks
├── components/
│   ├── ChordSymbol.tsx                 # Rendering component
│   ├── ChordSymbol.test.tsx
│   └── StaffNotation.tsx               # (modified for integration)
└── ...
```

---

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- ChordAnalyzer.test.ts

# Run tests with coverage report
npm test -- --coverage

# Run performance benchmarks
npm run test:bench

# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

---

## Debugging Tips

### Chord Not Detected

**Check**:
1. Are notes at exact same tick? Use `console.log(note.start_tick)`
2. Are there 2+ notes? Single notes ignored
3. Does pattern match? Try logging `calculateIntervals()` output

**Debug Helper**:

```typescript
// Add to ChordDetector
groupByTick(notes: Note[]): Map<number, Note[]> {
  console.log('[ChordDetector] Input notes:', notes.length);
  const groups = /* ... */;
  console.log('[ChordDetector] Groups formed:', groups.size);
  return groups;
}
```

### Symbol Not Rendering

**Check**:
1. Is `chordType` null? Check analyzer matching logic
2. Is `x` or `y` NaN? Verify layout calculation
3. Is SVG `<text>` present in DOM? Inspect with DevTools
4. Is color matching background? Try `fill="red"` temporarily

### Performance Issues

**Check**:
1. Are you using `useMemo` in component? Required for 1000+ notes
2. Is detection running every render? Should only run on `notes` change
3. Profile with React DevTools Profiler
4. Check console for warnings about missing deps in useMemo

---

## Success Criteria Validation

After implementation, verify against [spec.md](spec.md) success criteria:

| Criteria | How to Verify |
|----------|---------------|
| **SC-001**: 95% accuracy | Test all 7 chord types + edge cases, measure test pass rate |
| **SC-002**: <100ms detection | Run `npm run test:bench`, check reported time |
| **SC-003**: 3x faster reading | User study (out of scope for dev, but implement for testability) |
| **SC-004**: No overlap | Manual test: add many chords, verify no text collision |
| **SC-005**: All 7 types | Test coverage confirms all types in CHORD_PATTERNS work |
| **SC-006**: Real-time update | Manual test: add/remove notes, symbol updates without lag |
| **SC-007**: No backend change | Verify: no new API endpoints, frontend-only code changes |

---

## Troubleshooting

### TypeScript Errors

```bash
# Re-run type check
npm run type-check

# Common issues:
# - Missing import: Add `import type { Note } from '../types/score'`
# - Type mismatch: Check Note interface has start_tick and pitch
```

### Test Failures

```bash
# Run single test with verbose output
npm test -- ChordAnalyzer.test.ts --reporter=verbose

# Common issues:
# - Mock data incomplete: Ensure test notes have all required fields
# - Async issues: Use `await` for async operations
```

### Component Not Appearing

```bash
# Check React component tree
# 1. Open React DevTools in browser
# 2. Find <StaffNotation> component
# 3. Verify ChordSymbol is in children
# 4. Check props passed correctly
```

---

## Next Steps After Quickstart

1. **Code Review**: Submit PR, request review from team
2. **QA Testing**: Hand off to QA for manual testing checklist
3. **Performance Profiling**: Measure on real scores (100-1000 notes)
4. **Documentation**: Update user-facing docs with chord symbol feature
5. **Monitoring**: Add analytics event "chord_symbol_rendered" for usage tracking

---

## Estimated Timeline

| Task | Time | Owner |
|------|------|-------|
| Type definitions | 30 min | Dev |
| ChordDetector + tests | 2 hours | Dev |
| ChordAnalyzer + tests | 3 hours | Dev |
| ChordSymbolFormatter + tests | 30 min | Dev |
| ChordSymbol component + tests | 3 hours | Dev |
| Integration with StaffNotation | 1 hour | Dev |
| Performance testing | 1 hour | Dev |
| Manual QA testing | 2 hours | QA |
| Code review & fixes | 2 hours | Dev |
| **Total** | **15 hours (2 days)** | - |

Add 1-2 days buffer for unexpected issues, refactoring, and PR iterations.

---

## Resources

- **Music Theory**: [Chord intervals reference](https://en.wikipedia.org/wiki/Chord_(music))
- **SVG Text**: [MDN SVG <text> element](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text)
- **React Performance**: [useMemo documentation](https://react.dev/reference/react/useMemo)
- **Testing**: [Vitest API](https://vitest.dev/api/)

---

## Questions?

If you encounter issues not covered here:
1. Check [research.md](research.md) for technical decisions and alternatives
2. Review [data-model.md](data-model.md) for type definitions
3. Consult [spec.md](spec.md) for requirements and success criteria
4. Ask in team chat or create GitHub discussion

