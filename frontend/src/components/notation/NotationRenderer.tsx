import React from 'react';
import type { LayoutGeometry } from '../../types/notation/layout';
import type { Note } from '../../types/score';
import { ChordSymbol } from './ChordSymbol';

/**
 * NotationRenderer - Pure presentational component that renders notation SVG
 * 
 * This component takes pre-calculated layout geometry and renders it as SVG elements.
 * It has no business logic or state - all positioning is determined by the layout engine.
 * 
 * Responsibilities:
 * - Render staff lines (horizontal lines)
 * - Render clef symbol (Music font glyph)
 * - Render note heads (positioned SMuFL glyphs)
 * - Render ledger lines (short lines for notes outside staff range)
 * - Handle note click events (User Story 3)
 * - Apply selection highlighting (User Story 3)
 */

export interface NotationRendererProps {
  /** Pre-calculated layout geometry */
  layout: LayoutGeometry;
  
  /** ID of currently selected note (User Story 3) */
  selectedNoteId?: string | null;
  
  /** Callback when note is clicked (User Story 3) */
  onNoteClick?: (noteId: string) => void;
  
  /** Current horizontal scroll position (for fixed clef positioning) */
  scrollX?: number;
  
  /** Whether to show the clef (Feature 009: hide during auto-scroll to prevent flickering) */
  showClef?: boolean;
  
  /** Notes for chord symbol detection (T032) */
  notes?: Note[];
  
  /** Pixels per tick for chord positioning */
  pixelsPerTick?: number;
  
  /** Feature 009 - US2 - T021: IDs of currently playing notes to highlight */
  highlightedNoteIds?: string[];
}

/**
 * NotationRenderer (Internal) - Pure presentational component
 * Wrapped with React.memo for performance optimization (T066)
 */
const NotationRendererComponent: React.FC<NotationRendererProps> = ({
  layout,
  selectedNoteId = null,
  onNoteClick,
  scrollX = 0,
  showClef = true,
  notes = [],
  pixelsPerTick = 0.1,
  highlightedNoteIds = [], // T021: Default to empty array
}) => {
  const handleNoteClick = (noteId: string) => {
    if (onNoteClick) {
      onNoteClick(noteId);
    }
  };

  return (
    <svg
      width={layout.totalWidth}
      height={layout.totalHeight}
      xmlns="http://www.w3.org/2000/svg"
      data-testid="notation-svg"
      style={{
        display: 'block',
        userSelect: 'none',
      }}
    >
      {/* Staff lines (5 horizontal lines) */}
      {layout.staffLines.map((line) => (
        <line
          key={`staff-line-${line.lineNumber}`}
          data-testid={`staff-line-${line.lineNumber}`}
          x1={line.x1}
          x2={line.x2}
          y1={line.y}
          y2={line.y}
          stroke="black"
          strokeWidth={line.strokeWidth}
        />
      ))}

      {/* Ledger lines (short lines for notes outside staff range) */}
      {layout.ledgerLines.map((ledger) => (
        <line
          key={ledger.id}
          data-testid={ledger.id}
          x1={ledger.x1}
          x2={ledger.x2}
          y1={ledger.y}
          y2={ledger.y}
          stroke="black"
          strokeWidth={ledger.strokeWidth}
        />
      ))}

      {/* Clef symbol - Feature 009: Hide during auto-scroll to prevent flickering */}
      {showClef && (
        <g style={{ transform: `translateX(${scrollX}px)`, willChange: 'transform' }}>
          <text
            data-testid={`clef-${layout.clef.type}`}
            x={layout.clef.x}
            y={layout.clef.y}
            fontSize={layout.clef.fontSize}
            fontFamily="Bravura"
            fill="black"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {layout.clef.glyphCodepoint}
          </text>
        </g>
      )}

      {/* Note heads (positioned SMuFL glyphs) - T055: Virtual scrolling */}
      {layout.notes
        .slice(layout.visibleNoteIndices.startIdx, layout.visibleNoteIndices.endIdx)
        .map((note) => (
        <React.Fragment key={note.id}>
          {/* Accidental (sharp/flat) if needed - positioned before note head */}
          {note.accidental && (
            <text
              data-testid={`${note.id}-accidental`}
              x={note.x - note.fontSize * 0.35} // Position closer to note head (avoids barline collisions)
              y={note.y}
              fontSize={note.fontSize * 0.65} // Smaller to fit between barline and note
              fontFamily="Bravura"
              fill={selectedNoteId === note.id ? 'blue' : 'black'}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {note.accidental === 'sharp' ? '\uE262' : '\uE260'}
            </text>
          )}
          
          {/* Note head */}
          <text
            data-testid={note.id}
            className={`note-head${highlightedNoteIds.includes(note.id) ? ' highlighted' : ''}`}
            x={note.x}
            y={note.y}
            fontSize={note.fontSize}
            fontFamily="Bravura"
            fill={selectedNoteId === note.id ? 'blue' : 'black'}
            textAnchor="middle"
            dominantBaseline="central"
            onClick={() => handleNoteClick(note.id)}
            style={{ cursor: 'pointer' }}
          >
            {note.glyphCodepoint}
          </text>
        </React.Fragment>
      ))}

      {/* Barlines (User Story 2) */}
      {layout.barlines.map((barline) => (
        <line
          key={barline.id}
          data-testid={barline.id}
          x1={barline.x}
          x2={barline.x}
          y1={barline.y1}
          y2={barline.y2}
          stroke="black"
          strokeWidth={barline.strokeWidth}
        />
      ))}

      {/* Key signature accidentals (User Story 5 - not yet implemented) */}
      {layout.keySignatureAccidentals.map((accidental, index) => (
        <text
          key={`accidental-${index}`}
          data-testid={`accidental-${index}`}
          x={accidental.x}
          y={accidental.y}
          fontSize={accidental.fontSize}
          fontFamily="Bravura"
          fill="black"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {accidental.glyphCodepoint}
        </text>
      ))}

      {/* Chord symbols (T033: Chord symbol layer) */}
      {notes.length > 0 && (
        <ChordSymbol
          notes={notes}
          notePositions={layout.notes}
          staffConfig={{
            pixelsPerTick,
            marginLeft: layout.marginLeft,
            staffSpace: 10,
          } as any}
        />
      )}
    </svg>
  );
};

/**
 * NotationRenderer - Memoized version for performance
 * 
 * T066: Wrapped with React.memo to prevent unnecessary re-renders
 * Only re-renders when props actually change (layout, selectedNoteId, scrollX, showClef, notes)
 */
export const NotationRenderer = React.memo(NotationRendererComponent);
