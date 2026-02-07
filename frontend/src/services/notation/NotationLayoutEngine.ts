import type { ClefType, Note } from '../../types/score';
import type { StaffConfig } from '../../types/notation/config';
import { SMUFL_CODEPOINTS } from '../../types/notation/config';
import type {
  NotePosition,
  StaffLine,
  ClefPosition,
  LedgerLine,
  Barline,
  LayoutGeometry,
  LayoutInput,
} from '../../types/notation/layout';

/**
 * NotationLayoutEngine - Pure calculation functions for staff notation layout
 * 
 * This module contains algorithms that convert musical data (notes, clefs, etc.)
 * into geometric positions for rendering on a five-line staff. All functions are
 * pure (no side effects) and deterministic (same inputs always produce same outputs).
 * 
 * Coordinate System:
 * - Staff positions are measured in half-steps from the middle line (staffPosition = 0)
 * - Positive values go up (toward higher pitches), negative values go down
 * - Line positions: -4, -2, 0, 2, 4 (five staff lines)
 * - Space positions: -3, -1, 1, 3 (four spaces between lines)
 * - Y coordinates are in pixels, with lower Y values at the top of the screen
 */
export const NotationLayoutEngine = {
  /**
   * Convert MIDI pitch (0-127) to staff position relative to middle line
   * 
   * Coordinate system:
   * - staffPosition 0 = middle line (B4 in treble, D3 in bass)
   * - staffPosition -4, -2, 0, 2, 4 = five staff lines (even numbers)
   * - staffPosition -3, -1, 1, 3 = four spaces (odd numbers)
   * - Fractional positions = chromatic notes between diatonic positions
   * 
   * For exact diatonic positioning, this uses a lookup table for common notes
   * and falls back to chromatic approximation (semitones/2) for others.
   * 
   * @param pitch - MIDI pitch number (60 = middle C)
   * @param clef - Clef type determining pitch-to-position mapping
   * @returns Staff position (0 = middle line)
   */
  midiPitchToStaffPosition(pitch: number, clef: ClefType): number {
    // Exact mappings for common notes in treble clef (relative to B4 = 0)
    const trebleDiatonicMap: Record<number, number> = {
      71: 0,   // B4 (middle line)
      72: 1,   // C5 (space above middle)
      74: 2,   // D5 (line 4)
      76: 3,   // E5 (space)
      77: 4,   // F5 (top line)
      79: 5,   // G5 (space above)
      81: 6,   // A5 (first ledger line above)
      83: 7,   // B5 (space above first ledger)
      84: 8,   // C6 (second ledger line above)
      86: 9,   // D6 (space above second ledger)
      88: 10,  // E6 (third ledger line above)
      89: 11,  // F6 (space above third ledger)
      91: 12,  // G6 (fourth ledger line above)
      93: 13,  // A6
      95: 14,  // B6
      96: 15,  // C7
      69: -1,  // A4 (space below middle)
      67: -2,  // G4 (line 2)
      65: -3,  // F4 (space)
      64: -4,  // E4 (bottom line)
      62: -5,  // D4 (space below)
      60: -6,  // C4 (ledger line below)
      57: -7,  // A3
      55: -8,  // G3
    };
    
    // Exact mappings for common notes in bass clef (relative to D3 = 0)
    const bassDiatonicMap: Record<number, number> = {
      50: 0,   // D3 (middle line)
      52: 1,   // E3 (space above)
      53: 2,   // F3 (line 4)
      55: 3,   // G3 (space)
      57: 4,   // A3 (top line)
      59: 5,   // B3 (space above)
      60: 6,   // C4 (ledger line above staff)
      48: -1,  // C3 (space below)
      47: -2,  // B2 (line 2)
      45: -3,  // A2 (space)
      43: -4,  // G2 (bottom line)
      41: -5,  // F2 (space below)
      40: -6,  // E2 (ledger line)
      36: -11, // C2 (ledger line)
    };
    
    // Use diatonic mappings
    if (clef === 'Treble') {
      if (trebleDiatonicMap[pitch] !== undefined) return trebleDiatonicMap[pitch];
    } else if (clef === 'Bass') {
      if (bassDiatonicMap[pitch] !== undefined) return bassDiatonicMap[pitch];
    }
    
    // Fallback: For chromatic notes (sharps/flats), find the nearest diatonic note
    // Chromatic notes should be positioned at the same staff position as their natural note
    const diatonicMap = clef === 'Treble' ? trebleDiatonicMap : bassDiatonicMap;
    const diatonicPitches = Object.keys(diatonicMap).map(Number).sort((a, b) => a - b);
    
    // Find the closest diatonic note at or below this pitch
    let closestPitch = diatonicPitches[0];
    for (const diatonicPitch of diatonicPitches) {
      if (diatonicPitch <= pitch) {
        closestPitch = diatonicPitch;
      } else {
        break;
      }
    }
    
    // Use the staff position of the closest natural note
    return diatonicMap[closestPitch];
  },

  /**
   * Determine if a MIDI pitch needs an accidental (sharp/flat)
   * 
   * @param pitch - MIDI pitch number (0-127)
   * @param clef - Current clef type
   * @returns Accidental type or undefined if natural note
   */
  getAccidental(pitch: number, clef: ClefType): 'sharp' | 'flat' | undefined {
    // Diatonic (white key) pitches in treble clef
    const trebleDiatonicPitches = [55, 57, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96];
    
    // Diatonic (white key) pitches in bass clef
    const bassDiatonicPitches = [36, 40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60];
    
    const diatonicPitches = clef === 'Treble' ? trebleDiatonicPitches : bassDiatonicPitches;
    
    // If pitch is in the diatonic set, no accidental needed
    if (diatonicPitches.includes(pitch)) {
      return undefined;
    }
    
    // For chromatic notes, determine if sharp or flat
    // Using the "circle of fifths" convention: sharps for C#, D#, F#, G#, A#
    const pitchClass = pitch % 12;
    const sharpPitchClasses = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
    
    return sharpPitchClasses.includes(pitchClass) ? 'sharp' : 'flat';
  },

  /**
   * Convert staff position to Y pixel coordinate
   * 
   * In our coordinate system:
   * - staffPosition 0 = middle line (viewport center)
   * - Positive staff positions = higher pitches = lower Y values
   * - Negative staff positions = lower pitches = higher Y values
   * - Each staff position unit = 0.5 staff spaces (since lines are 2 units apart)
   * 
   * @param staffPosition - Position in half-steps from middle line
   * @param config - Staff configuration including viewport height and staff space
   * @returns Y coordinate in pixels
   */
  staffPositionToY(staffPosition: number, config: StaffConfig): number {
    const centerY = config.viewportHeight / 2;
    
    // Convert staff position to staff spaces
    // Staff positions: ..., -4, -2, 0, 2, 4, ... (lines are 2 apart)
    // Each staff space = 10px (config.staffSpace)
    // staffPosition 2 = 1 staff space above center = centerY - 10
    // staffPosition -2 = 1 staff space below center = centerY + 10
    const staffSpaceOffset = staffPosition / 2;
    
    // Y increases downward, so subtract for positive positions (higher pitches)
    return centerY - staffSpaceOffset * config.staffSpace;
  },

  /**
   * Generate the five horizontal staff lines
   * 
   * Lines are numbered 1-5 from bottom to top:
   * - Line 1 (bottom): staffPosition -4
   * - Line 2: staffPosition -2
   * - Line 3 (middle): staffPosition 0
   * - Line 4: staffPosition 2
   * - Line 5 (top): staffPosition 4
   * 
   * @param totalWidth - Width of the staff in pixels
   * @param config - Staff configuration
   * @returns Array of five StaffLine objects
   */
  calculateStaffLines(totalWidth: number, config: StaffConfig): StaffLine[] {
    const lines: StaffLine[] = [];
    const staffPositions = [-4, -2, 0, 2, 4]; // Five lines from bottom to top
    
    for (let i = 0; i < staffPositions.length; i++) {
      const staffPosition = staffPositions[i];
      const y = this.staffPositionToY(staffPosition, config);
      
      lines.push({
        y,
        x1: 0,
        x2: totalWidth,
        lineNumber: i + 1, // Lines are 1-indexed
        strokeWidth: 1,
      });
    }
    
    return lines;
  },

  /**
   * Calculate clef symbol position and determine SMuFL codepoint
   * 
   * SMuFL (Standard Music Font Layout) codepoints:
   * - Treble clef (G-clef): U+E050
   * - Bass clef (F-clef): U+E062
   * - Alto clef (C-clef): U+E05C
   * - Tenor clef (C-clef): U+E05C
   * 
   * @param clef - Clef type (Treble, Bass, Alto, Tenor)
   * @param config - Staff configuration
   * @returns ClefPosition with x, y, and glyph codepoint
   */
  calculateClefPosition(clef: ClefType, config: StaffConfig): ClefPosition {
    // SMuFL codepoints for clefs
    const codepoints: Record<ClefType, string> = {
      Treble: SMUFL_CODEPOINTS.TREBLE_CLEF,
      Bass: SMUFL_CODEPOINTS.BASS_CLEF,
      Alto: SMUFL_CODEPOINTS.ALTO_CLEF,
      Tenor: SMUFL_CODEPOINTS.TENOR_CLEF,
    };
    
    const centerY = config.viewportHeight / 2;
    
    return {
      type: clef,
      x: config.marginLeft / 2, // Center in the left margin
      y: centerY, // Vertically centered on staff
      glyphCodepoint: codepoints[clef],
      fontSize: config.staffSpace * config.glyphFontSizeMultiplier,
    };
  },

  /**
   * Calculate minimum visual width needed for a note glyph
   * Very short notes (32nd, 64th, 128th) have multiple flags and need more horizontal space
   * to render properly without being cut off or cramped.
   * 
   * @param duration_ticks - Note duration in MIDI ticks
   * @param config - Staff configuration
   * @returns Minimum width in pixels for this note
   */
  getMinimumNoteWidth(duration_ticks: number, config: StaffConfig): number {
    const PPQ = 960;
    
    // 128th notes (5 flags) need 4x standard spacing
    if (duration_ticks < PPQ / 16) {
      return config.minNoteSpacing * 4.0;
    }
    // 64th notes (4 flags) need 3.5x standard spacing
    else if (duration_ticks < PPQ / 8) {
      return config.minNoteSpacing * 3.5;
    }
    // 32nd notes (3 flags) need 2.5x standard spacing
    else if (duration_ticks < PPQ / 4) {
      return config.minNoteSpacing * 2.5;
    }
    
    // All other notes use standard minimum spacing
    return config.minNoteSpacing;
  },

  /**
   * Position note heads based on pitch and timing
   * 
   * Algorithm:
   * 1. Sort notes by start_tick (earliest first)
   * 2. Convert each note's pitch to staff position
   * 3. Calculate X position from tick (with clef offset) - PROPORTIONAL
   * 4. Avoid barline collisions (notes at measure boundaries get extra spacing)
   * 5. Enforce minimum spacing between consecutive notes (duration-aware for complex glyphs)
   * 6. Calculate Y position from staff position
   * 7. Assign SMuFL note head glyph (U+E0A4 for quarter note)
   * 
   * @param notes - Array of Note objects from the score
   * @param clef - Clef type for pitch-to-position mapping
   * @param config - Staff configuration
   * @param timeSignature - Time signature for barline collision detection
   * @returns Array of NotePosition objects with calculated x, y coordinates
   */
  calculateNotePositions(
    notes: Note[],
    clef: ClefType,
    config: StaffConfig,
    timeSignature?: { numerator: number; denominator: number }
  ): NotePosition[] {
    if (notes.length === 0) {
      return [];
    }
    
    // Sort notes by start_tick
    const sortedNotes = [...notes].sort((a, b) => a.start_tick - b.start_tick);
    
    const baseX = config.marginLeft + config.clefWidth;
    let previousX = baseX - config.minNoteSpacing; // Initialize to allow first note at baseX
    let previousDuration = 960; // Track previous note's duration for spacing calculation
    
    // Calculate barline positions to avoid collisions
    const PPQ = 960; // MIDI standard: Pulses Per Quarter note
    const ticksPerMeasure = timeSignature 
      ? PPQ * (4 / timeSignature.denominator) * timeSignature.numerator 
      : 3840; // Default 4/4 time
    const barlineNoteSpacing = config.minNoteSpacing * 1.5; // Extra spacing after barlines
    
    const positioned: NotePosition[] = sortedNotes.map((note) => {
      // Convert pitch to staff position
      const staffPosition = this.midiPitchToStaffPosition(note.pitch, clef);
      
      // Calculate proportional X position from tick
      let proportionalX = baseX + note.start_tick * config.pixelsPerTick;
      
      // Check if note would collide with a barline (at measure boundaries)
      // If note starts exactly at a measure boundary, add extra spacing
      if (note.start_tick > 0 && note.start_tick % ticksPerMeasure === 0) {
        proportionalX += barlineNoteSpacing;
      }
      
      // Enforce minimum spacing: consider BOTH previous and current note's space requirements
      // Use the maximum of: previous note's trailing space OR current note's leading space
      // Very short notes (32nd, 64th, 128th) with many flags need more horizontal space to render
      const prevNoteWidth = this.getMinimumNoteWidth(previousDuration, config);
      const currNoteWidth = this.getMinimumNoteWidth(note.duration_ticks, config);
      const minWidth = Math.max(prevNoteWidth, currNoteWidth);
      const x = Math.max(proportionalX, previousX + minWidth);
      previousX = x;
      previousDuration = note.duration_ticks;
      
      // Calculate Y position from staff position
      const y = this.staffPositionToY(staffPosition, config);
      
      // Determine if this note needs an accidental (sharp/flat)
      const accidental = this.getAccidental(note.pitch, clef);
      
      // Determine stem direction: notes below middle line get stem up, others get stem down
      // SMuFL convention: stem up for low notes, stem down for high notes
      const stemUp = staffPosition < 0;
      
      // Select note glyph based on duration (PPQ = 960)
      // Whole = 3840, Half = 1920, Quarter = 960, Eighth = 480, 16th = 240, 32nd = 120, 64th = 60, 128th = 30
      let glyphCodepoint: string;
      const PPQ = 960;
      
      if (note.duration_ticks >= PPQ * 4) {
        // Whole note (4 beats or more) - no stem
        glyphCodepoint = SMUFL_CODEPOINTS.WHOLE_NOTE;
      } else if (note.duration_ticks >= PPQ * 2) {
        // Half note (2 beats) - white note with stem
        glyphCodepoint = stemUp 
          ? SMUFL_CODEPOINTS.HALF_NOTE_UP 
          : SMUFL_CODEPOINTS.HALF_NOTE_DOWN;
      } else if (note.duration_ticks >= PPQ) {
        // Quarter note (1 beat) - black note with stem
        glyphCodepoint = stemUp 
          ? SMUFL_CODEPOINTS.QUARTER_NOTE_UP 
          : SMUFL_CODEPOINTS.QUARTER_NOTE_DOWN;
      } else if (note.duration_ticks >= PPQ / 2) {
        // Eighth note (1/2 beat) - black note with stem and 1 flag
        glyphCodepoint = stemUp 
          ? SMUFL_CODEPOINTS.EIGHTH_NOTE_UP 
          : SMUFL_CODEPOINTS.EIGHTH_NOTE_DOWN;
      } else if (note.duration_ticks >= PPQ / 4) {
        // Sixteenth note (1/4 beat) - black note with stem and 2 flags
        glyphCodepoint = stemUp 
          ? SMUFL_CODEPOINTS.SIXTEENTH_NOTE_UP 
          : SMUFL_CODEPOINTS.SIXTEENTH_NOTE_DOWN;
      } else if (note.duration_ticks >= PPQ / 8) {
        // 32nd note (1/8 beat) - black note with stem and 3 flags
        glyphCodepoint = stemUp 
          ? SMUFL_CODEPOINTS.THIRTYSECOND_NOTE_UP 
          : SMUFL_CODEPOINTS.THIRTYSECOND_NOTE_DOWN;
      } else if (note.duration_ticks >= PPQ / 16) {
        // 64th note (1/16 beat) - black note with stem and 4 flags
        glyphCodepoint = stemUp 
          ? SMUFL_CODEPOINTS.SIXTYFOURTH_NOTE_UP 
          : SMUFL_CODEPOINTS.SIXTYFOURTH_NOTE_DOWN;
      } else {
        // 128th note (1/32 beat or less) - black note with stem and 5 flags
        glyphCodepoint = stemUp 
          ? SMUFL_CODEPOINTS.ONETWENTYEIGHTH_NOTE_UP 
          : SMUFL_CODEPOINTS.ONETWENTYEIGHTH_NOTE_DOWN;
      }
      
      return {
        id: note.id,
        x,
        y,
        pitch: note.pitch,
        start_tick: note.start_tick,
        duration_ticks: note.duration_ticks,
        staffPosition,
        glyphCodepoint,
        fontSize: config.staffSpace * config.glyphFontSizeMultiplier,
        accidental,
      };
    });
    
    return positioned;
  },

  /**
   * Generate ledger lines for notes outside the staff range
   * 
   * Ledger lines are needed when:
   * - staffPosition > 4 (above top line)
   * - staffPosition < -4 (below bottom line)
   * - Ledger lines are always on line positions (even staff positions)
   * - Notes in spaces need ledger lines up to the nearest line toward the staff
   * 
   * @param notes - Array of positioned notes
   * @param config - Staff configuration
   * @returns Array of LedgerLine objects for notes requiring ledger lines
   */
  calculateLedgerLines(
    notes: NotePosition[],
    config: StaffConfig
  ): LedgerLine[] {
    const ledgerLines: LedgerLine[] = [];
    let ledgerLineIdCounter = 0;
    
    for (const note of notes) {
      // Only generate ledger lines for notes outside staff range (staffPosition < -4 or > 4)
      if (Math.abs(note.staffPosition) <= 4) {
        continue; // Note is within staff range
      }
      
      // Determine ledger line positions
      const ledgerLinePositions: number[] = [];
      
      if (note.staffPosition < -4) {
        // Below staff - generate ledger lines from -6 down to note position
        // If note is in a space (odd), stop at the line below it (round up to nearest even)
        const endPosition = note.staffPosition % 2 === 0 
          ? note.staffPosition  // Note on line: include this line
          : note.staffPosition + 1; // Note in space: stop at line below
        for (let pos = -6; pos >= endPosition; pos -= 2) {
          ledgerLinePositions.push(pos);
        }
      } else if (note.staffPosition > 4) {
        // Above staff - generate ledger lines from 6 up to note position
        // If note is in a space (odd), stop at the line below it (round down to nearest even)
        const endPosition = note.staffPosition % 2 === 0 
          ? note.staffPosition  // Note on line: include this line
          : note.staffPosition - 1; // Note in space: stop at line below
        for (let pos = 6; pos <= endPosition; pos += 2) {
          ledgerLinePositions.push(pos);
        }
      }
      
      // Create ledger line objects
      for (const pos of ledgerLinePositions) {
        const y = this.staffPositionToY(pos, config);
        const lineWidth = config.staffSpace * 2.5;
        const x1 = note.x - lineWidth / 2;
        const x2 = note.x + lineWidth / 2;
        
        ledgerLines.push({
          id: `ledger-${note.id}-${ledgerLineIdCounter++}`,
          x1,
          x2,
          y,
          noteId: note.id,
          strokeWidth: 1,
        });
      }
    }
    
    return ledgerLines;
  },

  /**
   * Calculate barline positions to divide music into measures
   * 
   * Barlines are vertical lines that separate measures. Position is determined by:
   * - ticksPerMeasure = PPQ * (4/denominator) * numerator
   * - For 4/4 time at 960 PPQ: 960 * (4/4) * 4 = 3840 ticks per measure
   * - For 3/4 time at 960 PPQ: 960 * (4/4) * 3 = 2880 ticks per measure
   * 
   * @param timeSignature - Time signature (numerator and denominator)
   * @param maxTick - Maximum tick value in the score (to determine how many barlines)
   * @param config - Staff configuration
   * @returns Array of Barline objects at measure boundaries
   */
  calculateBarlines(
    timeSignature: { numerator: number; denominator: number },
    maxTick: number,
    config: StaffConfig
  ): Barline[] {
    const PPQ = 960; // MIDI standard: Pulses Per Quarter note
    
    // Calculate ticks per measure
    // Formula: PPQ * (4/denominator) * numerator
    // Example 4/4: 960 * (4/4) * 4 = 3840 ticks
    // Example 3/4: 960 * (4/4) * 3 = 2880 ticks
    const ticksPerMeasure = PPQ * (4 / timeSignature.denominator) * timeSignature.numerator;
    
    const barlines: Barline[] = [];
    
    // Y coordinates span from top line to bottom line
    const centerY = config.viewportHeight / 2;
    const y1 = centerY - 2 * config.staffSpace; // Top line (staffPosition 4)
    const y2 = centerY + 2 * config.staffSpace; // Bottom line (staffPosition -4)
    
    // Generate barlines at measure boundaries (start at first measure END, not at tick 0)
    let measureNumber = 1;
    for (let tick = ticksPerMeasure; tick <= maxTick; tick += ticksPerMeasure) {
      // Calculate X position from tick
      const x = config.marginLeft + config.clefWidth + tick * config.pixelsPerTick;
      
      barlines.push({
        id: `barline-${measureNumber}`,
        x,
        tick,
        y1,
        y2,
        measureNumber,
        strokeWidth: config.barlineWidth,
      });
      
      measureNumber++;
    }
    
    return barlines;
  },

  /**
   * Calculate which notes are visible in the current viewport (User Story 4)
   * 
   * Virtual scrolling optimization: only render notes within viewport + buffer.
   * Uses binary search to efficiently find the start and end indices of notes
   * within the visible X range.
   * 
   * Algorithm:
   * 1. Calculate visible X range: [scrollX - buffer, scrollX + viewportWidth + buffer]
   * 2. Binary search for first note with x >= minX
   * 3. Linear scan forward to find last note with x <= maxX
   * 4. Return {startIdx, endIdx} for array slicing
   * 
   * Performance: O(log n) binary search + O(m) linear scan where m = visible notes
   * 
   * @param notePositions - Array of positioned notes (must be sorted by x)
   * @param config - Staff configuration with scrollX, viewportWidth, renderBuffer
   * @returns Object with startIdx and endIdx for slicing notePositions array
   */
  calculateVisibleNoteIndices(
    notePositions: NotePosition[],
    config: StaffConfig
  ): { startIdx: number; endIdx: number } {
    if (notePositions.length === 0) {
      return { startIdx: 0, endIdx: 0 };
    }

    const minX = config.scrollX - config.renderBuffer;
    const maxX = config.scrollX + config.viewportWidth + config.renderBuffer;

    // Binary search for first visible note (first note with x >= minX)
    let startIdx = 0;
    let left = 0;
    let right = notePositions.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (notePositions[mid].x < minX) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    startIdx = left;

    // Linear scan forward from startIdx to find last visible note
    let endIdx = startIdx;
    while (endIdx < notePositions.length && notePositions[endIdx].x <= maxX) {
      endIdx++;
    }

    return { startIdx, endIdx };
  },

  /**
   * Main orchestration function - calculates complete layout geometry
   * 
   * This ties all the layout algorithms together to produce a complete
   * LayoutGeometry object ready for rendering.
   * 
   * Algorithm:
   * 1. Calculate staff lines (horizontal lines)
   * 2. Calculate clef position (left margin)
   * 3. Position all notes (pitch → Y, tick → X)
   * 4. Calculate barlines (measure boundaries) - User Story 2
   * 5. Generate ledger lines for notes outside staff range
   * 6. Calculate total dimensions
   * 7. Identify visible notes (for virtual scrolling in US4)
   * 
   * @param input - LayoutInput with notes, clef, time signature, and config
   * @returns Complete LayoutGeometry with all positioned elements
   */
  calculateLayout(input: LayoutInput): LayoutGeometry {
    const { notes, clef, timeSignature, config } = input;
    
    // Find maximum tick to determine total width
    const maxTick = notes.length > 0
      ? Math.max(...notes.map(n => n.start_tick + n.duration_ticks))
      : 0;
    
    const totalWidth = config.marginLeft + config.clefWidth + maxTick * config.pixelsPerTick;
    const totalHeight = config.viewportHeight;
    
    // Calculate all layout components
    const staffLines = this.calculateStaffLines(totalWidth, config);
    const clefPosition = this.calculateClefPosition(clef as ClefType, config);
    const notePositions = this.calculateNotePositions(notes, clef as ClefType, config, timeSignature);
    const barlines = this.calculateBarlines(timeSignature, maxTick, config);
    const ledgerLines = this.calculateLedgerLines(notePositions, config);
    
    // Calculate visible note indices for virtual scrolling (User Story 4 - T052)
    const visibleNoteIndices = this.calculateVisibleNoteIndices(notePositions, config);
    
    return {
      notes: notePositions,
      staffLines,
      barlines,
      ledgerLines,
      clef: clefPosition,
      keySignatureAccidentals: [], // Key signatures implemented in User Story 5 (T058-T062)
      totalWidth,
      totalHeight,
      marginLeft: config.marginLeft,
      visibleNoteIndices,
    };
  },
};
