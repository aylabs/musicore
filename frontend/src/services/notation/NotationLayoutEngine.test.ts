import { describe, it, expect } from 'vitest';
import { NotationLayoutEngine } from './NotationLayoutEngine';
import { DEFAULT_STAFF_CONFIG } from '../../types/notation/config';

/**
 * Test suite for NotationLayoutEngine
 * 
 * These tests verify the layout calculation algorithms that position
 * musical notation elements on a five-line staff. All tests follow
 * Test-First Development - they are written BEFORE implementation.
 */
describe('NotationLayoutEngine', () => {
  /**
   * T016: Unit test for midiPitchToStaffPosition()
   * 
   * This function converts MIDI pitch (0-127) to staff position.
   * Staff position is measured in half-steps from the middle line:
   * - Line positions: 0 (middle line), 2, 4, -2, -4
   * - Space positions: 1, 3, -1, -3
   * 
   * Reference pitches:
   * - Treble clef: Line 1 (bottom) = E4 (MIDI 64), Middle line = B4 (MIDI 71)
   * - Bass clef: Line 1 (bottom) = G2 (MIDI 43), Middle line = D3 (MIDI 50)
   */
  describe('midiPitchToStaffPosition', () => {
    it('should place middle C (MIDI 60) correctly in treble clef', () => {
      // Middle C is on a ledger line below the treble staff
      // Treble staff bottom line: E4 (64) at staffPosition -4
      // Space below: D4 (62) at staffPosition -5
      // Ledger line below: C4 (60) at staffPosition -6
      const result = NotationLayoutEngine.midiPitchToStaffPosition(60, 'Treble');
      expect(result).toBe(-6);
    });

    it('should place middle C (MIDI 60) correctly in bass clef', () => {
      // Bass clef: middle line = D3 (MIDI 50) at staffPosition 0
      // C4 (60) is 10 half-steps above D3
      // Diatonic: C4 is on ledger line above staff at staffPosition 6
      const result = NotationLayoutEngine.midiPitchToStaffPosition(60, 'Bass');
      expect(result).toBe(6);
    });

    it('should place E4 (MIDI 64) on bottom line in treble clef', () => {
      // E4 is on the bottom line of treble staff
      // Bottom line (line 1) is at staffPosition -4
      const result = NotationLayoutEngine.midiPitchToStaffPosition(64, 'Treble');
      expect(result).toBe(-4);
    });

    it('should place F5 (MIDI 77) on top line in treble clef', () => {
      // F5 is on the top line of treble staff
      // Top line (line 5) is at staffPosition 4
      const result = NotationLayoutEngine.midiPitchToStaffPosition(77, 'Treble');
      expect(result).toBe(4);
    });

    it('should place G2 (MIDI 43) on bottom line in bass clef', () => {
      // G2 is on the bottom line of bass staff
      // Bottom line (line 1) is at staffPosition -4
      const result = NotationLayoutEngine.midiPitchToStaffPosition(43, 'Bass');
      expect(result).toBe(-4);
    });

    it('should place A3 (MIDI 57) on top line in bass clef', () => {
      // A3 is on the top line of bass staff
      // Top line (line 5) is at staffPosition 4
      const result = NotationLayoutEngine.midiPitchToStaffPosition(57, 'Bass');
      expect(result).toBe(4);
    });

    it('should handle notes requiring ledger lines above treble staff', () => {
      // A5 (MIDI 81) is above the treble staff
      // F5 (77) is on top line at staffPosition 4
      // A5 is 2 diatonic steps above F5 (F→G→A), so staffPosition 4 + 2 = 6
      const result = NotationLayoutEngine.midiPitchToStaffPosition(81, 'Treble');
      expect(result).toBe(6);
    });

    it('should handle notes requiring ledger lines below bass staff', () => {
      // C2 (MIDI 36) is below the bass staff
      // G2 (43) is on bottom line at staffPosition -4
      // C2 is 7 half-steps below G2, so staffPosition -4 - 7 = -11
      const result = NotationLayoutEngine.midiPitchToStaffPosition(36, 'Bass');
      expect(result).toBe(-11);
    });
  });

  /**
   * T017: Unit test for staffPositionToY()
   * 
   * This function converts staff position to Y pixel coordinate.
   * With staffSpace = 10px:
   * - staffPosition 0 (middle line) → y = 100px (center of 200px viewport)
   * - staffPosition 2 (line above) → y = 90px (10px higher)
   * - staffPosition -2 (line below) → y = 110px (10px lower)
   */
  describe('staffPositionToY', () => {
    const config = DEFAULT_STAFF_CONFIG;
    const centerY = config.viewportHeight / 2; // 100px

    it('should place staffPosition 0 at viewport center', () => {
      const result = NotationLayoutEngine.staffPositionToY(0, config);
      expect(result).toBe(centerY);
    });

    it('should place staffPosition 2 above center', () => {
      // staffPosition 2 = 1 staff space above middle line
      // 1 staff space = 10px, going up means lower Y
      const result = NotationLayoutEngine.staffPositionToY(2, config);
      expect(result).toBe(centerY - config.staffSpace);
    });

    it('should place staffPosition 4 (top line) correctly', () => {
      // staffPosition 4 = 2 staff spaces above middle line = 20px higher
      const result = NotationLayoutEngine.staffPositionToY(4, config);
      expect(result).toBe(centerY - 2 * config.staffSpace);
    });

    it('should place staffPosition -2 below center', () => {
      // staffPosition -2 = 1 staff space below middle line
      // Going down means higher Y
      const result = NotationLayoutEngine.staffPositionToY(-2, config);
      expect(result).toBe(centerY + config.staffSpace);
    });

    it('should place staffPosition -4 (bottom line) correctly', () => {
      // staffPosition -4 = 2 staff spaces below middle line = 20px lower
      const result = NotationLayoutEngine.staffPositionToY(-4, config);
      expect(result).toBe(centerY + 2 * config.staffSpace);
    });

    it('should handle ledger line positions below staff', () => {
      // staffPosition -6 = 3 staff spaces below middle line (ledger line)
      const result = NotationLayoutEngine.staffPositionToY(-6, config);
      expect(result).toBe(centerY + 3 * config.staffSpace);
    });

    it('should handle ledger line positions above staff', () => {
      // staffPosition 8 = 4 staff spaces above middle line
      const result = NotationLayoutEngine.staffPositionToY(8, config);
      expect(result).toBe(centerY - 4 * config.staffSpace);
    });

    it('should handle ledger line positions below staff', () => {
      // staffPosition -11 = 5.5 staff spaces below middle line
      const result = NotationLayoutEngine.staffPositionToY(-11, config);
      expect(result).toBe(centerY + 5.5 * config.staffSpace);
    });
  });

  /**
   * T018: Unit test for calculateStaffLines()
   * 
   * This function generates the five horizontal staff lines.
   * Lines are numbered 1-5 from bottom to top.
   * Staff positions: -4, -2, 0, 2, 4
   */
  describe('calculateStaffLines', () => {
    const config = DEFAULT_STAFF_CONFIG;

    it('should generate exactly 5 staff lines', () => {
      const lines = NotationLayoutEngine.calculateStaffLines(1000, config);
      expect(lines).toHaveLength(5);
    });

    it('should position lines at correct Y coordinates', () => {
      const lines = NotationLayoutEngine.calculateStaffLines(1000, config);
      const centerY = config.viewportHeight / 2;

      // Lines from bottom to top: staffPosition -4, -2, 0, 2, 4
      expect(lines[0].y).toBe(centerY + 2 * config.staffSpace); // Line 1 (bottom)
      expect(lines[1].y).toBe(centerY + 1 * config.staffSpace); // Line 2
      expect(lines[2].y).toBe(centerY); // Line 3 (middle)
      expect(lines[3].y).toBe(centerY - 1 * config.staffSpace); // Line 4
      expect(lines[4].y).toBe(centerY - 2 * config.staffSpace); // Line 5 (top)
    });

    it('should set correct line numbers', () => {
      const lines = NotationLayoutEngine.calculateStaffLines(1000, config);
      expect(lines[0].lineNumber).toBe(1); // Bottom line
      expect(lines[1].lineNumber).toBe(2);
      expect(lines[2].lineNumber).toBe(3); // Middle line
      expect(lines[3].lineNumber).toBe(4);
      expect(lines[4].lineNumber).toBe(5); // Top line
    });

    it('should span full width', () => {
      const totalWidth = 1000;
      const lines = NotationLayoutEngine.calculateStaffLines(totalWidth, config);
      
      lines.forEach(line => {
        expect(line.x1).toBe(0);
        expect(line.x2).toBe(totalWidth);
      });
    });

    it('should use default stroke width', () => {
      const lines = NotationLayoutEngine.calculateStaffLines(1000, config);
      
      lines.forEach(line => {
        expect(line.strokeWidth).toBe(1);
      });
    });
  });

  /**
   * T019: Unit test for calculateClefPosition()
   * 
   * This function determines clef symbol position and SMuFL codepoint.
   * - Treble clef: U+E050, positioned to center around G4 (line 2)
   * - Bass clef: U+E062, positioned to center around F3 (line 4)
   */
  describe('calculateClefPosition', () => {
    const config = DEFAULT_STAFF_CONFIG;

    it('should use correct SMuFL codepoint for treble clef', () => {
      const clef = NotationLayoutEngine.calculateClefPosition('Treble', config);
      expect(clef.glyphCodepoint).toBe('\uE050');
    });

    it('should use correct SMuFL codepoint for bass clef', () => {
      const clef = NotationLayoutEngine.calculateClefPosition('Bass', config);
      expect(clef.glyphCodepoint).toBe('\uE062');
    });

    it('should position treble clef at left margin', () => {
      const clef = NotationLayoutEngine.calculateClefPosition('Treble', config);
      expect(clef.x).toBe(config.marginLeft / 2);
    });

    it('should position bass clef at left margin', () => {
      const clef = NotationLayoutEngine.calculateClefPosition('Bass', config);
      expect(clef.x).toBe(config.marginLeft / 2);
    });

    it('should center treble clef vertically on staff', () => {
      const clef = NotationLayoutEngine.calculateClefPosition('Treble', config);
      const centerY = config.viewportHeight / 2;
      expect(clef.y).toBe(centerY);
    });

    it('should center bass clef vertically on staff', () => {
      const clef = NotationLayoutEngine.calculateClefPosition('Bass', config);
      const centerY = config.viewportHeight / 2;
      expect(clef.y).toBe(centerY);
    });

    it('should set correct clef type', () => {
      const trebleClef = NotationLayoutEngine.calculateClefPosition('Treble', config);
      expect(trebleClef.type).toBe('Treble');

      const bassClef = NotationLayoutEngine.calculateClefPosition('Bass', config);
      expect(bassClef.type).toBe('Bass');
    });

    it('should use glyph font size multiplier', () => {
      const clef = NotationLayoutEngine.calculateClefPosition('Treble', config);
      expect(clef.fontSize).toBe(config.staffSpace * config.glyphFontSizeMultiplier);
    });
  });

  /**
   * T020: Unit test for calculateNotePositions()
   * 
   * This function positions note heads based on pitch and timing.
   * It handles:
   * - Sorting notes by start_tick
   * - Converting MIDI pitch to staff position
   * - Calculating X position from tick
   * - Determining SMuFL note head codepoint (U+E0A4 for quarter notes)
   */
  describe('calculateNotePositions', () => {
    const config = DEFAULT_STAFF_CONFIG;

    it('should sort notes by start_tick', () => {
      const notes = [
        { id: '1', start_tick: 1920, duration_ticks: 960, pitch: 60 },
        { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 },
        { id: '3', start_tick: 960, duration_ticks: 960, pitch: 67 },
      ];

      const positioned = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        config
      );

      expect(positioned[0].id).toBe('2'); // start_tick 0
      expect(positioned[1].id).toBe('3'); // start_tick 960
      expect(positioned[2].id).toBe('1'); // start_tick 1920
    });

    it('should calculate X position from tick', () => {
      const notes = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
        { id: '2', start_tick: 960, duration_ticks: 960, pitch: 64 },
      ];

      const positioned = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        config
      );

      // x = marginLeft + clefWidth + (start_tick * pixelsPerTick)
      const expectedX1 = config.marginLeft + config.clefWidth + (0 * config.pixelsPerTick);
      const expectedX2 = config.marginLeft + config.clefWidth + (960 * config.pixelsPerTick);

      expect(positioned[0].x).toBe(expectedX1);
      expect(positioned[1].x).toBe(expectedX2);
    });

    it('should convert pitch to staff position using clef', () => {
      const notes = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // Middle C
      ];

      const treblePositioned = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        config
      );
      expect(treblePositioned[0].staffPosition).toBe(-6);

      const bassPositioned = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Bass',
        config
      );
      expect(bassPositioned[0].staffPosition).toBe(6);
    });

    it('should calculate Y position from staff position', () => {
      const notes = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 71 }, // B4 (staffPosition 0 in treble)
      ];

      const positioned = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        config
      );

      const centerY = config.viewportHeight / 2;
      expect(positioned[0].y).toBe(centerY);
    });

    it('should use quarter note head glyph (U+E0A4)', () => {
      const notes = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
      ];

      const positioned = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        config
      );

      expect(positioned[0].glyphCodepoint).toBe('\uE0A4');
    });

    it('should preserve note properties', () => {
      const notes = [
        { id: 'test-note', start_tick: 480, duration_ticks: 1920, pitch: 72 },
      ];

      const positioned = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        config
      );

      expect(positioned[0].id).toBe('test-note');
      expect(positioned[0].pitch).toBe(72);
      expect(positioned[0].start_tick).toBe(480);
      expect(positioned[0].duration_ticks).toBe(1920);
    });

    it('should use glyph font size multiplier', () => {
      const notes = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
      ];

      const positioned = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        config
      );

      expect(positioned[0].fontSize).toBe(config.staffSpace * config.glyphFontSizeMultiplier);
    });

    it('should handle empty note array', () => {
      const positioned = NotationLayoutEngine.calculateNotePositions(
        [],
        'Treble',
        config
      );

      expect(positioned).toEqual([]);
    });
  });

  /**
   * T021: Unit test for calculateLedgerLines()
   * 
   * This function generates ledger lines for notes outside the staff range.
   * Ledger lines are needed when:
   * - staffPosition > 4 (above top line)
   * - staffPosition < -4 (below bottom line)
   * - staffPosition is even (on a line position)
   */
  describe('calculateLedgerLines', () => {
    const config = DEFAULT_STAFF_CONFIG;

    it('should not generate ledger lines for notes within staff range', () => {
      const notes = [
        { id: '1', x: 100, y: 100, staffPosition: 0, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 71, start_tick: 0, duration_ticks: 960 },
        { id: '2', x: 200, y: 90, staffPosition: 2, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 74, start_tick: 960, duration_ticks: 960 },
      ];

      const ledgerLines = NotationLayoutEngine.calculateLedgerLines(notes, config);
      expect(ledgerLines).toHaveLength(0);
    });

    it('should generate ledger line for note on C4 (staffPosition -6) in treble clef', () => {
      // C4 is one ledger line below treble staff
      // staffPosition -6 is on a line (even number)
      const centerY = config.viewportHeight / 2;
      const y = centerY + 3 * config.staffSpace; // staffPosition -6

      const notes = [
        { id: '1', x: 100, y, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 60, start_tick: 0, duration_ticks: 960 },
      ];

      const ledgerLines = NotationLayoutEngine.calculateLedgerLines(notes, config);
      expect(ledgerLines.length).toBeGreaterThan(0);
      expect(ledgerLines[0].y).toBe(y);
      expect(ledgerLines[0].noteId).toBe('1');
    });

    it('should generate multiple ledger lines for notes far from staff', () => {
      // A5 in treble (staffPosition 8) needs 2 ledger lines at positions 6 and 8
      const centerY = config.viewportHeight / 2;
      const y = centerY - 4 * config.staffSpace; // staffPosition 8

      const notes = [
        { id: '1', x: 100, y, staffPosition: 8, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 81, start_tick: 0, duration_ticks: 960 },
      ];

      const ledgerLines = NotationLayoutEngine.calculateLedgerLines(notes, config);
      expect(ledgerLines.length).toBe(2); // Lines at staffPosition 6 and 8
    });

    it('should not generate ledger lines for notes in spaces (odd staffPosition)', () => {
      // staffPosition -5 is in a space, no ledger line needed
      const centerY = config.viewportHeight / 2;
      const y = centerY + 2.5 * config.staffSpace;

      const notes = [
        { id: '1', x: 100, y, staffPosition: -5, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 61, start_tick: 0, duration_ticks: 960 },
      ];

      const ledgerLines = NotationLayoutEngine.calculateLedgerLines(notes, config);
      expect(ledgerLines).toHaveLength(0);
    });

    it('should set correct ledger line width', () => {
      const centerY = config.viewportHeight / 2;
      const y = centerY + 3 * config.staffSpace;

      const notes = [
        { id: '1', x: 100, y, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 60, start_tick: 0, duration_ticks: 960 },
      ];

      const ledgerLines = NotationLayoutEngine.calculateLedgerLines(notes, config);
      
      ledgerLines.forEach(line => {
        const expectedWidth = config.staffSpace * 2.5;
        expect(line.x2 - line.x1).toBe(expectedWidth);
      });
    });

    it('should center ledger lines on note head X position', () => {
      const centerY = config.viewportHeight / 2;
      const y = centerY + 3 * config.staffSpace;
      const noteX = 150;

      const notes = [
        { id: '1', x: noteX, y, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 60, start_tick: 0, duration_ticks: 960 },
      ];

      const ledgerLines = NotationLayoutEngine.calculateLedgerLines(notes, config);
      
      ledgerLines.forEach(line => {
        const lineWidth = line.x2 - line.x1;
        const lineCenterX = line.x1 + lineWidth / 2;
        expect(lineCenterX).toBe(noteX);
      });
    });

    it('should generate unique IDs for each ledger line', () => {
      const centerY = config.viewportHeight / 2;

      const notes = [
        { id: '1', x: 100, y: centerY + 3 * config.staffSpace, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 60, start_tick: 0, duration_ticks: 960 },
        { id: '2', x: 200, y: centerY - 4 * config.staffSpace, staffPosition: 8, glyphCodepoint: '\uE0A4', fontSize: 40, pitch: 81, start_tick: 960, duration_ticks: 960 },
      ];

      const ledgerLines = NotationLayoutEngine.calculateLedgerLines(notes, config);
      const ids = ledgerLines.map(line => line.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length); // All IDs are unique
    });
  });

  /**
   * T034: Unit test for calculateBarlines()
   * 
   * Barlines divide music into measures. Position is determined by:
   * ticksPerMeasure = PPQ * (4/denominator) * numerator
   * For 4/4 time at 960 PPQ: 960 * (4/4) * 4 = 3840 ticks per measure
   * For 3/4 time at 960 PPQ: 960 * (4/4) * 3 = 2880 ticks per measure
   */
  describe('calculateBarlines', () => {
    const config = { ...DEFAULT_STAFF_CONFIG };

    it('should generate barlines at correct intervals for 4/4 time', () => {
      const timeSignature = { numerator: 4, denominator: 4 };
      const maxTick = 10000; // About 2.6 measures
      
      const barlines = NotationLayoutEngine.calculateBarlines(timeSignature, maxTick, config);
      
      // Expected barlines at ticks: 3840 (end of measure 1), 7680 (end of measure 2)
      // No barline at tick 0
      expect(barlines.length).toBe(2);
      expect(barlines[0].tick).toBe(3840);
      expect(barlines[0].measureNumber).toBe(1);
      expect(barlines[1].tick).toBe(7680);
      expect(barlines[1].measureNumber).toBe(2);
    });

    it('should generate barlines at correct intervals for 3/4 time', () => {
      const timeSignature = { numerator: 3, denominator: 4 };
      const maxTick = 7000; // About 2.4 measures
      
      const barlines = NotationLayoutEngine.calculateBarlines(timeSignature, maxTick, config);
      
      // Expected: ticksPerMeasure = 960 * (4/4) * 3 = 2880
      // Barlines at: 2880 (end of measure 1), 5760 (end of measure 2)
      // No barline at tick 0
      expect(barlines.length).toBe(2);
      expect(barlines[0].tick).toBe(2880);
      expect(barlines[1].tick).toBe(5760);
    });

    it('should calculate correct X coordinates from ticks', () => {
      const timeSignature = { numerator: 4, denominator: 4 };
      const maxTick = 5000;
      
      const barlines = NotationLayoutEngine.calculateBarlines(timeSignature, maxTick, config);
      
      // X coord = marginLeft + clefWidth + (tick * pixelsPerTick)
      // First barline at end of measure 1 (tick 3840)
      const expectedX0 = config.marginLeft + config.clefWidth + (3840 * config.pixelsPerTick);
      
      expect(barlines[0].x).toBe(expectedX0);
    });

    it('should set correct Y coordinates spanning staff height', () => {
      const timeSignature = { numerator: 4, denominator: 4 };
      const maxTick = 5000;
      
      const barlines = NotationLayoutEngine.calculateBarlines(timeSignature, maxTick, config);
      
      // Y coordinates should span from top line to bottom line
      const centerY = config.viewportHeight / 2;
      const expectedY1 = centerY - 2 * config.staffSpace; // Top line
      const expectedY2 = centerY + 2 * config.staffSpace; // Bottom line
      
      barlines.forEach(barline => {
        expect(barline.y1).toBe(expectedY1);
        expect(barline.y2).toBe(expectedY2);
      });
    });

    it('should assign unique IDs to each barline', () => {
      const timeSignature = { numerator: 4, denominator: 4 };
      const maxTick = 10000;
      
      const barlines = NotationLayoutEngine.calculateBarlines(timeSignature, maxTick, config);
      
      const ids = barlines.map(b => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  /**
   * T035: Unit test for proportional spacing
   * 
   * Notes should be spaced proportionally by their tick positions:
   * - Note at tick 960 should be at baseX + 96px (960 * 0.1)
   * - Note at tick 1920 should be at baseX + 192px (1920 * 0.1)
   * - Gap between them should be roughly 2x the gap from 0 to 960
   */
  describe('proportional spacing', () => {
    it('should space notes proportionally by tick position', () => {
      const notes = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
        { id: '2', start_tick: 960, duration_ticks: 960, pitch: 64 },
        { id: '3', start_tick: 1920, duration_ticks: 960, pitch: 67 },
        { id: '4', start_tick: 3840, duration_ticks: 960, pitch: 72 },
      ];

      const timeSignature = { numerator: 4, denominator: 4 };
      const positions = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        DEFAULT_STAFF_CONFIG,
        timeSignature
      );

      const baseX = DEFAULT_STAFF_CONFIG.marginLeft + DEFAULT_STAFF_CONFIG.clefWidth;
      const barlineNoteSpacing = DEFAULT_STAFF_CONFIG.minNoteSpacing * 1.5; // Extra spacing after barlines
      
      // Verify proportional spacing
      expect(positions[0].x).toBe(baseX + 0 * DEFAULT_STAFF_CONFIG.pixelsPerTick);
      expect(positions[1].x).toBe(baseX + 960 * DEFAULT_STAFF_CONFIG.pixelsPerTick);
      expect(positions[2].x).toBe(baseX + 1920 * DEFAULT_STAFF_CONFIG.pixelsPerTick);
      // Note at tick 3840 (measure boundary) gets extra spacing after barline
      expect(positions[3].x).toBe(baseX + 3840 * DEFAULT_STAFF_CONFIG.pixelsPerTick + barlineNoteSpacing);
      
      // Verify gap ratios (except for measure boundary)
      const gap1 = positions[1].x - positions[0].x; // 0 to 960
      const gap2 = positions[2].x - positions[1].x; // 960 to 1920
      
      expect(gap1).toBe(gap2); // Equal tick intervals = equal gaps
    });
  });

  /**
   * T036: Unit test for minimum spacing enforcement
   * 
   * Even when proportional spacing would place notes very close together,
   * the minNoteSpacing (default 15px) should be enforced to prevent overlap.
   */
  describe('minimum spacing enforcement', () => {
    it('should enforce minimum spacing for closely-timed notes', () => {
      const notes = [
        { id: '1', start_tick: 0, duration_ticks: 10, pitch: 60 },
        { id: '2', start_tick: 10, duration_ticks: 10, pitch: 64 },
      ];

      const positions = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        DEFAULT_STAFF_CONFIG
      );

      const gap = positions[1].x - positions[0].x;
      
      // Proportional spacing would be 10 * 0.1 = 1px
      // But minNoteSpacing (15px) should be enforced
      expect(gap).toBeGreaterThanOrEqual(DEFAULT_STAFF_CONFIG.minNoteSpacing);
    });

    it('should not affect notes that naturally have enough spacing', () => {
      const notes = [
        { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
        { id: '2', start_tick: 1000, duration_ticks: 960, pitch: 64 },
      ];

      const positions = NotationLayoutEngine.calculateNotePositions(
        notes,
        'Treble',
        DEFAULT_STAFF_CONFIG
      );

      const baseX = DEFAULT_STAFF_CONFIG.marginLeft + DEFAULT_STAFF_CONFIG.clefWidth;
      
      // Proportional spacing is 1000 * 0.1 = 100px (already > minNoteSpacing)
      // So positions should be exactly proportional
      expect(positions[0].x).toBe(baseX);
      expect(positions[1].x).toBe(baseX + 1000 * DEFAULT_STAFF_CONFIG.pixelsPerTick);
    });
  });

  /**
   * T048: Unit test for calculateVisibleNoteIndices()
   * 
   * Virtual scrolling optimization: only render notes visible in viewport.
   * Uses binary search to find notes within scrollX to scrollX + viewportWidth.
   * Includes renderBuffer on both sides to prevent pop-in during scrolling.
   */
  describe('calculateVisibleNoteIndices', () => {
    it('should return all notes when viewport covers entire score', () => {
      const notePositions = [
        { id: '1', x: 100, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
        { id: '2', x: 200, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
        { id: '3', x: 300, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
      ];

      const config = {
        ...DEFAULT_STAFF_CONFIG,
        scrollX: 0,
        viewportWidth: 1200,
        renderBuffer: 200,
      };

      const result = NotationLayoutEngine.calculateVisibleNoteIndices(notePositions, config);

      // All notes should be visible (x: 100-300, viewport: 0-1200)
      expect(result.startIdx).toBe(0);
      expect(result.endIdx).toBe(3);
    });

    it('should exclude notes outside visible range', () => {
      const notePositions = [
        { id: '1', x: 100, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
        { id: '2', x: 500, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
        { id: '3', x: 1000, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
        { id: '4', x: 1500, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
        { id: '5', x: 2000, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
      ];

      const config = {
        ...DEFAULT_STAFF_CONFIG,
        scrollX: 800,  // Scrolled to middle of score
        viewportWidth: 600,  // Visible range: 800-1400 (+ buffer: 600-1600)
        renderBuffer: 200,
      };

      const result = NotationLayoutEngine.calculateVisibleNoteIndices(notePositions, config);

      // Should include notes within scrollX - buffer to scrollX + viewportWidth + buffer
      // Range: 800 - 200 to 800 + 600 + 200 = 600 to 1600
      // Notes in range: x=1000 (idx 2), x=1500 (idx 3)
      // Note at x=500 (idx 1) is outside (< 600)
      // Note at x=2000 (idx 4) is outside (> 1600)
      expect(result.startIdx).toBe(2);
      expect(result.endIdx).toBe(4);
    });

    it('should handle scrolled to end of score', () => {
      const notePositions = [
        { id: '1', x: 100, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
        { id: '2', x: 2000, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
        { id: '3', x: 2500, y: 130, pitch: 60, start_tick: 0, duration_ticks: 960, staffPosition: -6, glyphCodepoint: '\uE0A4', fontSize: 40 },
      ];

      const config = {
        ...DEFAULT_STAFF_CONFIG,
        scrollX: 2000,
        viewportWidth: 1200,
        renderBuffer: 200,
      };

      const result = NotationLayoutEngine.calculateVisibleNoteIndices(notePositions, config);

      // Visible range: 2000 - 200 to 2000 + 1200 + 200 = 1800 to 3400
      // Notes in range: x=2000 (idx 1), x=2500 (idx 2)
      expect(result.startIdx).toBe(1);
      expect(result.endIdx).toBe(3);
    });

    it('should return empty range for empty notes array', () => {
      const notePositions: any[] = [];

      const config = {
        ...DEFAULT_STAFF_CONFIG,
        scrollX: 0,
        viewportWidth: 1200,
        renderBuffer: 200,
      };

      const result = NotationLayoutEngine.calculateVisibleNoteIndices(notePositions, config);

      expect(result.startIdx).toBe(0);
      expect(result.endIdx).toBe(0);
    });
  });
});
