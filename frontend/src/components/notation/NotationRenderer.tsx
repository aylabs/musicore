import React from 'react';
import type { LayoutGeometry } from '../../types/notation/layout';

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
  
  /** Current horizontal scroll position (User Story 4 - T057) */
  scrollX?: number;
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

      {/* Clef symbol (SMuFL glyph) */}
      {/* T057: Fixed clef margin - add scrollX to keep clef visible while scrolling */}
      <text
        data-testid={`clef-${layout.clef.type}`}
        x={layout.clef.x + scrollX}
        y={layout.clef.y}
        fontSize={layout.clef.fontSize}
        fontFamily="Bravura"
        fill="black"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {layout.clef.glyphCodepoint}
      </text>

      {/* Note heads (positioned SMuFL glyphs) */}
      {/* T055: Virtual scrolling - render only notes within visibleNoteIndices range */}
      {layout.notes
        .slice(layout.visibleNoteIndices.startIdx, layout.visibleNoteIndices.endIdx)
        .map((note) => (
        <text
          key={note.id}
          data-testid={note.id}
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
    </svg>
  );
};

/**
 * NotationRenderer - Memoized version for performance
 * 
 * T066: Wrapped with React.memo to prevent unnecessary re-renders
 * Only re-renders when props actually change (layout, selectedNoteId, scrollX)
 */
export const NotationRenderer = React.memo(NotationRendererComponent);
