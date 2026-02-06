# Quickstart Guide: Staff Notation Visualization

**Feature**: 002-staff-notation-view  
**Audience**: Frontend developers implementing this feature  
**Time to Complete**: 15-20 minutes

This guide walks you through understanding and implementing the staff notation visualization feature from scratch.

---

## Prerequisites

### Required Knowledge

- **TypeScript 5.0+**: Strong typing, interfaces, generics
- **React 18+**: Functional components, hooks (useState, useMemo, useEffect)
- **SVG**: Basic understanding of `<svg>`, `<line>`, `<text>`, `<rect>` elements
- **Music notation**: Basic understanding of staff, clef, notes (see primer below)

### Installed Dependencies

```bash
# Verify your environment
node --version   # v18.0.0 or higher
npm --version    # v9.0.0 or higher

# From frontend/ directory
npm install      # Installs existing dependencies
```

### Music Notation Primer (2-minute read)

If you're not familiar with music notation:

- **Staff**: 5 horizontal lines where notes are placed
- **Clef**: Symbol at start of staff indicating pitch mapping (treble clef = higher pitches, bass clef = lower)
- **Note head**: Oval symbol representing a pitch
- **MIDI pitch**: Number 0-127 where 60 = middle C, each increment = 1 semitone
- **Staff position**: Line or space on staff (line 0 = bottom, line 4 = top)
- **Ledger lines**: Short lines added above/below staff for very high/low notes
- **Barline**: Vertical line dividing music into measures

**Visual reference**: Search "treble clef staff" for an image.

---

## Architecture Overview

### Three-Layer Design

```
┌──────────────────────────────────────────────────┐
│  MusicTimeline (Container Component)             │
│  • Fetches Score from API                        │
│  • Extracts Voice data                           │
│  • Passes notes to StaffNotation                 │
└──────────────┬───────────────────────────────────┘
               │ props: {notes, clef, keySignature, timeSignature}
               ▼
┌──────────────────────────────────────────────────┐
│  StaffNotation (Coordinator Component)           │
│  • Manages viewport state (scrollX, dimensions)  │
│  • Calculates layout with NotationLayoutEngine   │
│  • Passes geometry to NotationRenderer           │
└──────────────┬───────────────────────────────────┘
               │ props: {layout: LayoutGeometry}
               ▼
┌──────────────────────────────────────────────────┐
│  NotationRenderer (Presentational Component)     │
│  • Renders SVG elements from geometry            │
│  • Handles click events on notes                 │
│  • Applies CSS transforms for scrolling          │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  NotationLayoutEngine (Pure Service)             │
│  • No React, no DOM, no side effects             │
│  • Pure functions: same input → same output      │
│  • Calculates positions, ledger lines, barlines  │
│  • Fully testable without rendering              │
└──────────────────────────────────────────────────┘
```

**Key Principle**: Separation of concerns
- **Data** (MusicTimeline) is separate from **Geometry** (Layout Engine) is separate from **Rendering** (Renderer)

---

## Setup Instructions

### 1. Download Bravura Font

The Bravura font contains all musical symbols (SMuFL standard).

```bash
# From project root
cd frontend/public/fonts

# Download Bravura WOFF2 (tiny: ~50KB)
curl -L -o Bravura.woff2 \
  "https://github.com/steinbergmedia/bravura/releases/download/bravura-1.392/Bravura.woff2"

# Verify download
ls -lh Bravura.woff2
# Should show ~50K file size
```

### 2. Load Font in CSS

Add to `frontend/src/index.css` or `frontend/src/App.css`:

```css
/* Load Bravura music font */
@font-face {
  font-family: 'Bravura';
  src: url('/fonts/Bravura.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: block; /* Wait for font before rendering */
}

/* Apply to all music glyphs */
.music-glyph {
  font-family: 'Bravura', serif;
  font-size: 40px; /* Default: 4x staff space */
  line-height: 1;
}
```

### 3. Create Directory Structure

```bash
# From frontend/ directory
mkdir -p src/components/notation
mkdir -p src/services/notation
mkdir -p src/types/notation

# Expected structure:
# frontend/
#   src/
#     components/
#       notation/
#         StaffNotation.tsx        # Coordinator component
#         NotationRenderer.tsx      # SVG renderer
#         index.ts                  # Barrel export
#     services/
#       notation/
#         NotationLayoutEngine.ts   # Pure layout service
#         index.ts
#     types/
#       notation/
#         layout.ts                 # LayoutGeometry, NotePosition, etc.
#         config.ts                 # StaffConfig, defaults
#         index.ts
```

---

## Implementation Roadmap

Follow this sequence to implement the feature incrementally.

### Phase 1: Type Definitions (5 min)

Create `frontend/src/types/notation/config.ts`:

```typescript
export interface StaffConfig {
  staffSpace: number;
  pixelsPerTick: number;
  minNoteSpacing: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  marginLeft: number;
  clefWidth: number;
  keySignatureWidthPerAccidental: number;
  barlineWidth: number;
  renderBuffer: number;
  glyphFontSizeMultiplier: number;
}

export const DEFAULT_STAFF_CONFIG: StaffConfig = {
  staffSpace: 10,
  pixelsPerTick: 0.1,
  minNoteSpacing: 15,
  viewportWidth: 1200,
  viewportHeight: 200,
  scrollX: 0,
  marginLeft: 60,
  clefWidth: 40,
  keySignatureWidthPerAccidental: 15,
  barlineWidth: 2,
  renderBuffer: 200,
  glyphFontSizeMultiplier: 4.0
};
```

Create `frontend/src/types/notation/layout.ts`:

```typescript
export interface NotePosition {
  id: string;
  x: number;
  y: number;
  pitch: number;
  start_tick: number;
  duration_ticks: number;
  staffPosition: number;
  glyphCodepoint: string;
  fontSize: number;
}

export interface StaffLine {
  y: number;
  x1: number;
  x2: number;
  lineNumber: number;
  strokeWidth: number;
}

export interface Barline {
  id: string;
  x: number;
  tick: number;
  y1: number;
  y2: number;
  measureNumber: number;
  strokeWidth: number;
}

export interface LedgerLine {
  id: string;
  x1: number;
  x2: number;
  y: number;
  noteId: string;
  strokeWidth: number;
}

export interface ClefPosition {
  type: 'Treble' | 'Bass' | 'Alto' | 'Tenor';
  x: number;
  y: number;
  glyphCodepoint: string;
  fontSize: number;
}

export interface LayoutGeometry {
  notes: NotePosition[];
  staffLines: StaffLine[];
  barlines: Barline[];
  ledgerLines: LedgerLine[];
  clef: ClefPosition;
  keySignatureAccidentals: any[]; // MVP: empty array
  totalWidth: number;
  totalHeight: number;
  marginLeft: number;
  visibleNoteIndices: {startIdx: number; endIdx: number};
}
```

**Test**: Run `npm run build` to verify TypeScript compiles.

---

### Phase 2: Layout Engine (10 min)

Create `frontend/src/services/notation/NotationLayoutEngine.ts`:

```typescript
import { NotePosition, LayoutGeometry, StaffLine, Barline, LedgerLine, ClefPosition } from '../../types/notation/layout';
import { StaffConfig } from '../../types/notation/config';
import { Note, ClefType } from '../../types/score'; // Your existing types

export class NotationLayoutEngine {
  /**
   * Main entry point: calculate complete layout geometry
   */
  static calculateLayout(input: {
    notes: Note[];
    clef: ClefType;
    timeSignature: {numerator: number; denominator: number};
    config: StaffConfig;
  }): LayoutGeometry {
    const { notes, clef, timeSignature, config } = input;
    
    // Sort notes by start_tick
    const sortedNotes = [...notes].sort((a, b) => a.start_tick - b.start_tick);
    
    // Calculate note positions
    const notePositions = this.calculateNotePositions(sortedNotes, clef, config);
    
    // Calculate auxiliary elements
    const staffLines = this.calculateStaffLines(config);
    const barlines = this.calculateBarlines(timeSignature, sortedNotes, config);
    const ledgerLines = this.calculateLedgerLines(notePositions, config);
    const clefPosition = this.calculateClefPosition(clef, config);
    
    // Calculate total dimensions
    const totalWidth = notePositions.length > 0
      ? Math.max(...notePositions.map(n => n.x)) + 100
      : config.marginLeft + config.clefWidth + 100;
    const totalHeight = config.viewportHeight;
    
    // Calculate visible indices for windowing
    const visibleNoteIndices = this.calculateVisibleNoteIndices(notePositions, config);
    
    return {
      notes: notePositions,
      staffLines,
      barlines,
      ledgerLines,
      clef: clefPosition,
      keySignatureAccidentals: [], // MVP: no key signatures
      totalWidth,
      totalHeight,
      marginLeft: config.marginLeft,
      visibleNoteIndices
    };
  }
  
  // Copy algorithms from data-model.md here:
  // - calculateNotePositions
  // - midiPitchToStaffPosition
  // - staffPositionToY
  // - calculateStaffLines
  // - calculateBarlines
  // - calculateLedgerLines
  // - calculateClefPosition
  // - calculateVisibleNoteIndices
}
```

**Reference**: See `data-model.md` for complete algorithm implementations.

**Test**: Create a unit test in `NotationLayoutEngine.test.ts`:

```typescript
import { NotationLayoutEngine } from './NotationLayoutEngine';
import { DEFAULT_STAFF_CONFIG } from '../../types/notation/config';

describe('NotationLayoutEngine', () => {
  it('calculates layout for empty notes array', () => {
    const layout = NotationLayoutEngine.calculateLayout({
      notes: [],
      clef: 'Treble',
      timeSignature: {numerator: 4, denominator: 4},
      config: DEFAULT_STAFF_CONFIG
    });
    
    expect(layout.notes).toHaveLength(0);
    expect(layout.staffLines).toHaveLength(5);
    expect(layout.clef.type).toBe('Treble');
  });
});
```

Run: `npm test -- NotationLayoutEngine.test.ts`

---

### Phase 3: Renderer Component (10 min)

Create `frontend/src/components/notation/NotationRenderer.tsx`:

```typescript
import React from 'react';
import { LayoutGeometry } from '../../types/notation/layout';

interface NotationRendererProps {
  layout: LayoutGeometry;
  onNoteClick?: (noteId: string) => void;
  selectedNoteId?: string | null;
}

export const NotationRenderer: React.FC<NotationRendererProps> = ({
  layout,
  onNoteClick,
  selectedNoteId
}) => {
  return (
    <svg
      width={layout.totalWidth}
      height={layout.totalHeight}
      xmlns="http://www.w3.org/2000/svg"
      style={{display: 'block'}}
    >
      {/* Staff lines */}
      {layout.staffLines.map((line, idx) => (
        <line
          key={`staff-line-${idx}`}
          x1={line.x1}
          y1={line.y}
          x2={line.x2}
          y2={line.y}
          stroke="black"
          strokeWidth={line.strokeWidth}
          data-testid="staff-line"
        />
      ))}
      
      {/* Clef symbol */}
      <text
        x={layout.clef.x}
        y={layout.clef.y}
        className="music-glyph"
        fontSize={layout.clef.fontSize}
        fill="black"
        data-testid="clef-symbol"
      >
        {layout.clef.glyphCodepoint}
      </text>
      
      {/* Barlines */}
      {layout.barlines.map(barline => (
        <line
          key={barline.id}
          x1={barline.x}
          y1={barline.y1}
          x2={barline.x}
          y2={barline.y2}
          stroke="black"
          strokeWidth={barline.strokeWidth}
        />
      ))}
      
      {/* Ledger lines */}
      {layout.ledgerLines.map(ledger => (
        <line
          key={ledger.id}
          x1={ledger.x1}
          y1={ledger.y}
          x2={ledger.x2}
          y2={ledger.y}
          stroke="black"
          strokeWidth={ledger.strokeWidth}
        />
      ))}
      
      {/* Note heads */}
      {layout.notes
        .slice(layout.visibleNoteIndices.startIdx, layout.visibleNoteIndices.endIdx)
        .map(note => (
          <text
            key={note.id}
            x={note.x}
            y={note.y}
            className="music-glyph"
            fontSize={note.fontSize}
            fill={selectedNoteId === note.id ? 'blue' : 'black'}
            textAnchor="middle"
            cursor="pointer"
            onClick={() => onNoteClick?.(note.id)}
            data-testid="note-head"
          >
            {note.glyphCodepoint}
          </text>
        ))}
    </svg>
  );
};
```

**Test**: Create `NotationRenderer.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { NotationRenderer } from './NotationRenderer';

describe('NotationRenderer', () => {
  it('renders staff lines', () => {
    const mockLayout = {
      staffLines: [{y: 50, x1: 0, x2: 100, lineNumber: 0, strokeWidth: 1}],
      clef: {type: 'Treble', x: 10, y: 70, glyphCodepoint: '\uE050', fontSize: 40},
      barlines: [],
      ledgerLines: [],
      notes: [],
      keySignatureAccidentals: [],
      totalWidth: 200,
      totalHeight: 200,
      marginLeft: 60,
      visibleNoteIndices: {startIdx: 0, endIdx: 0}
    };
    
    render(<NotationRenderer layout={mockLayout} />);
    expect(screen.getByTestId('staff-line')).toBeInTheDocument();
    expect(screen.getByTestId('clef-symbol')).toBeInTheDocument();
  });
});
```

---

### Phase 4: Coordinator Component (10 min)

Create `frontend/src/components/notation/StaffNotation.tsx`:

```typescript
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Note, ClefType } from '../../types/score';
import { StaffConfig, DEFAULT_STAFF_CONFIG } from '../../types/notation/config';
import { NotationLayoutEngine } from '../../services/notation/NotationLayoutEngine';
import { NotationRenderer } from './NotationRenderer';

interface StaffNotationProps {
  notes: Note[];
  clef: ClefType;
  timeSignature: {numerator: number; denominator: number};
}

export const StaffNotation: React.FC<StaffNotationProps> = ({
  notes,
  clef,
  timeSignature
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(1200);
  
  // Measure viewport width on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setViewportWidth(containerRef.current.clientWidth);
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Calculate layout geometry (memoized)
  const layout = useMemo(() => {
    const config: StaffConfig = {
      ...DEFAULT_STAFF_CONFIG,
      scrollX,
      viewportWidth
    };
    
    return NotationLayoutEngine.calculateLayout({
      notes,
      clef,
      timeSignature,
      config
    });
  }, [notes, clef, timeSignature, scrollX, viewportWidth]);
  
  // Handle horizontal scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollX(e.currentTarget.scrollLeft);
  };
  
  // Handle note selection
  const handleNoteClick = (noteId: string) => {
    setSelectedNoteId(noteId === selectedNoteId ? null : noteId);
  };
  
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '200px',
        overflowX: 'auto',
        overflowY: 'hidden',
        border: '1px solid #ccc'
      }}
      onScroll={handleScroll}
    >
      <NotationRenderer
        layout={layout}
        onNoteClick={handleNoteClick}
        selectedNoteId={selectedNoteId}
      />
    </div>
  );
};
```

---

### Phase 5: Integration (5 min)

Update your existing `MusicTimeline` component to use `StaffNotation`:

```typescript
// In MusicTimeline.tsx (or wherever you display notes)
import { StaffNotation } from './notation/StaffNotation';

// Inside component:
const voice = score.voices[0]; // Get first voice
const notes = voice.interval_events; // Your existing Note[] array
const clef = voice.structural_events.find(e => e.clef)?.clef || 'Treble';
const timeSignature = {numerator: 4, denominator: 4}; // Get from score

return (
  <div>
    {/* Your existing UI */}
    
    <h2>Staff Notation</h2>
    <StaffNotation
      notes={notes}
      clef={clef}
      timeSignature={timeSignature}
    />
  </div>
);
```

---

## Verification Checklist

After implementation, verify these success criteria:

### Visual Verification

- [ ] **Staff appears**: 5 horizontal lines visible
- [ ] **Clef renders**: Treble clef (𝄞) or bass clef (𝄢) in left margin
- [ ] **Notes appear**: Black note heads on/between staff lines
- [ ] **Higher pitches appear higher**: C5 (MIDI 72) above C4 (MIDI 60)
- [ ] **Ledger lines**: Very high/low notes show extra lines
- [ ] **Barlines**: Vertical lines every 4 beats (default 4/4 time)

### Interaction Verification

- [ ] **Click note**: Note head turns blue when clicked
- [ ] **Click again**: Deselects (turns black)
- [ ] **Horizontal scroll**: Staff scrolls left/right, clef stays fixed
- [ ] **No lag**: Scrolling feels smooth (60fps)

### Performance Verification (use Chrome DevTools Performance tab)

- [ ] **Render 100 notes**: Initial render <500ms
- [ ] **Scroll with 1000 notes**: Maintains 60fps
- [ ] **Click response**: <50ms from click to highlight change

---

## Debugging Tips

### Problem: Font not loading (blank characters)

**Symptom**: Rectangles or blank spaces instead of musical symbols.

**Fix**:
1. Open browser DevTools → Network tab
2. Reload page, look for `Bravura.woff2` request
3. Should show `200 OK` status
4. If `404 Not Found`: Check file is in `frontend/public/fonts/`
5. Verify CSS `@font-face` has correct path

**Test font in console**:
```javascript
document.fonts.check('40px Bravura');
// Should return true once loaded
```

---

### Problem: Notes at wrong vertical position

**Symptom**: All notes bunched at same Y-coordinate, or inverted (high notes low).

**Fix**:
1. Add debug logging to `staffPositionToY`:
   ```typescript
   console.log('pitch:', pitch, 'staffPos:', staffPosition, 'y:', y);
   ```
2. Verify `staffPosition` increases for higher pitches
3. Verify `y` decreases for higher staffPosition (SVG y-axis goes down)
4. Check `STAFF_TOP` constant is set correctly (e.g., 50px)

---

### Problem: Notes overlap horizontally

**Symptom**: Notes at different ticks have same X-position.

**Fix**:
1. Verify notes are sorted by `start_tick` before positioning
2. Check `pixelsPerTick` is not too small (default: 0.1)
3. Add debug logging:
   ```typescript
   console.log('note:', note.start_tick, 'proportionalX:', proportionalX, 'finalX:', x);
   ```
4. Verify `minNoteSpacing` is enforced (default: 15px)

---

### Problem: Performance lag with many notes

**Symptom**: Scrolling stutters, render takes >1 second.

**Fix**:
1. Verify virtual scrolling is active:
   ```typescript
   console.log('Rendering notes:', layout.visibleNoteIndices);
   ```
2. Should only render ~50-100 notes even if 1000 exist
3. Check `renderBuffer` is reasonable (200px, not 10000px)
4. Add `React.memo` to NotationRenderer if needed

---

## Next Steps

After completing this quickstart:

1. **Add tests**: Aim for >80% coverage of layout engine
2. **Tune spacing**: Adjust `pixelsPerTick` and `minNoteSpacing` for readability
3. **Add features**: Key signatures, accidentals, multiple voices (see spec P2-P5)
4. **Optimize**: Profile with 10k notes, tune windowing buffer

---

## Additional Resources

### Documentation

- **SMuFL Specification**: https://w3c.github.io/smufl/latest/
- **Bravura Font**: https://github.com/steinbergmedia/bravura
- **React SVG Guide**: https://react.dev/learn/svg-in-react
- **Feature Spec**: See `spec.md` in this directory for full requirements

### Code Examples

- **Layout Algorithms**: See `data-model.md` for detailed algorithm implementations
- **Type Definitions**: See `data-model.md` for all interfaces

### Getting Help

If stuck:
1. Re-read `data-model.md` for algorithm details
2. Check `spec.md` for functional requirements and edge cases
3. Run tests in watch mode: `npm test -- --watch`
4. Use Chrome DevTools to inspect SVG elements

---

**Quickstart Complete**: You should now have a working staff notation renderer. Happy coding! 🎵
