/**
 * ChordSymbol Component
 * 
 * Renders chord symbols above staff notation.
 * Detects chords from notes and displays as SVG text elements.
 */

import React, { useMemo } from 'react';
import type { Note } from '../../types/score';
import type { StaffConfig } from '../../types/notation/config';
import type { ChordSymbolLayout } from '../../types/chord';
import type { NotePosition } from '../../types/notation/layout';
import { ChordDetector } from '../../services/chord/ChordDetector';
import { ChordAnalyzer } from '../../services/chord/ChordAnalyzer';

/**
 * ChordSymbolProps - Props for ChordSymbol component
 */
export interface ChordSymbolProps {
  /** Notes to analyze for chords */
  notes: Note[];
  
  /** Actual positioned notes from layout engine */
  notePositions: NotePosition[];
  
  /** Staff configuration for positioning */
  staffConfig: StaffConfig;
  
  /** Optional: Override default vertical offset (default: 15px above top staff line) */
  verticalOffset?: number;
  
  /** Optional: Font size in pixels (default: 14) */
  fontSize?: number;
}

/**
 * ChordSymbol - Component for rendering chord symbols above staff notation
 * 
 * Composes with StaffNotation, handles detection and rendering.
 * Uses useMemo for performance optimization.
 */
export const ChordSymbol: React.FC<ChordSymbolProps> = ({
  notes,
  notePositions,
  staffConfig,
  verticalOffset = 15,
  fontSize = 14,
}) => {
  // Service instances (stateless, can reuse)
  const detector = useMemo(() => new ChordDetector(), []);
  const analyzer = useMemo(() => new ChordAnalyzer(), []);

  // Detect chords from notes (memoized for performance)
  const chordLayouts = useMemo(() => {
    // Step 1: Group notes by tick
    const groups = detector.groupByTick(notes);
    
    // Step 2: Filter groups with 2+ notes (chord candidates)
    const candidates = detector.filterChordCandidates(groups);
    
    // Step 3: Analyze each candidate to create ChordGroup
    const chordGroups = candidates
      .map(({ notes: groupNotes }) => analyzer.identify(groupNotes))
      .filter((chord): chord is NonNullable<typeof chord> => chord !== null);
    
    // Step 4: Calculate layout for each chord
    const layouts: ChordSymbolLayout[] = chordGroups.map(chord => {
      // Get actual x position from layout engine for the first note in this chord
      // This ensures alignment with rendered notes (accounting for collision detection)
      const firstNoteInChord = chord.notes[0];
      const positionedNote = notePositions.find(pos => pos.id === firstNoteInChord.id);
      const x = positionedNote?.x ?? (chord.tick * staffConfig.pixelsPerTick + staffConfig.marginLeft);
      
      // Calculate y position (above staff, closer to center)
      // Staff center is at viewportHeight/2, top line at center - 2*staffSpace
      const staffCenter = staffConfig.viewportHeight / 2;
      const staffTopLine = staffCenter - 2 * staffConfig.staffSpace;
      const y = staffTopLine - verticalOffset;
      
      // Validate y position - skip if invalid
      if (!isFinite(y)) {
        return null;
      }
      
      // US2: Use full chord symbol (ChordAnalyzer now provides formatted symbol)
      const text = chord.symbol;
      
      return {
        x,
        y,
        text,
        tick: chord.tick,
        fontSize,
        fontWeight: 'bold' as const,
      };
    })
    .filter((layout): layout is NonNullable<typeof layout> => layout !== null);
    
    return layouts;
  }, [notes, notePositions, detector, analyzer, staffConfig, verticalOffset, fontSize]);
  
  // Render SVG text elements for each chord symbol
  return (
    <g className="chord-symbols">
      {chordLayouts.map((layout, index) => (
        <text
          key={`chord-${layout.tick}-${index}`}
          x={layout.x}
          y={layout.y}
          fontSize={layout.fontSize}
          fontWeight={layout.fontWeight}
          fontFamily="sans-serif"
          textAnchor="middle"
          fill="black"
        >
          {layout.text}
        </text>
      ))}
    </g>
  );
};
