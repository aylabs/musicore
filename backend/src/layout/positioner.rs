//! Glyph positioning
//!
//! Positions glyphs based on pitch (vertical) and timing (horizontal).

use crate::layout::metrics::get_glyph_bbox;
use crate::layout::types::{BoundingBox, Glyph, Point, SourceReference};

/// Convert pitch to y-coordinate on staff
///
/// Uses standard music notation positioning for treble clef based on diatonic scale degrees.
/// Staff lines represent the diatonic scale (C-D-E-F-G-A-B), not chromatic semitones.
///
/// Treble clef (G clef) positions:
/// - F5 (MIDI 77) = top line (y=0)
/// - E5 (MIDI 76) = space (y=20)
/// - D5 (MIDI 74) = 2nd line (y=40)
/// - C5 (MIDI 72) = space (y=60)
/// - B4 (MIDI 71) = middle line (y=80)
/// - A4 (MIDI 69) = space (y=100)
/// - G4 (MIDI 67) = 4th line (y=120)
/// - F4 (MIDI 65) = space (y=140)
/// - E4 (MIDI 64) = bottom line (y=160)
///
/// # Arguments
/// * `pitch` - MIDI pitch number (60 = middle C, 69 = A440)
/// * `units_per_space` - Scaling factor (default: 20.0 logical units = 1 staff space)
///
/// # Returns
/// Y-coordinate in logical units (system-relative, positive = downward)
pub fn pitch_to_y(pitch: u8, units_per_space: f32) -> f32 {
    // Convert MIDI pitch to diatonic staff position
    // Each octave has 7 diatonic notes (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
    
    // Map chromatic pitch classes to diatonic letter positions
    // Accidentals (sharps/flats) sit on the same line as their natural note
    // C and C# both at position 0, D and D# at position 1, etc.
    const DIATONIC_POSITIONS: [f32; 12] = [
        0.0, // C
        0.0, // C# (same Y position as C, sharp drawn separately)
        1.0, // D
        1.0, // D# (same Y position as D, sharp drawn separately)
        2.0, // E
        3.0, // F
        3.0, // F# (same Y position as F, sharp drawn separately)
        4.0, // G
        4.0, // G# (same Y position as G, sharp drawn separately)
        5.0, // A
        5.0, // A# (same Y position as A, sharp drawn separately)
        6.0, // B
    ];
    
    let pitch_class = (pitch % 12) as usize;
    // MIDI octave: C(-1) = 0, C0 = 12, C1 = 24, C5 = 60, etc.
    // So octave number = (pitch / 12) - 1, but we count from C(-1) as octave 0 for calculation
    let octave = (pitch / 12) as i32;
    
    // Calculate diatonic position within octave
    let diatonic_pos_in_octave = DIATONIC_POSITIONS[pitch_class];
    
    // Total diatonic steps from C(-1) (MIDI 0)
    let diatonic_steps_from_c_minus1 = (octave * 7) as f32 + diatonic_pos_in_octave;
    
    // Reference: F5 (MIDI 77) = top line at y=0
    // MIDI 77: octave = 77/12 = 6, pitch_class = 77%12 = 5 (F)
    // Diatonic position: 6 * 7 + 3 (F=3) = 45 diatonic steps from C(-1)
    let f5_diatonic = 6.0 * 7.0 + 3.0; // = 45
    
    // Staff spaces from F5 (down = positive)
    // Each diatonic step = 1 staff space
    let staff_spaces_from_f5 = f5_diatonic - diatonic_steps_from_c_minus1;
    
    // Convert to logical units, offset by -0.5 spaces to center noteheads on staff lines  
    // This compensates for SMuFL glyph baseline positioning
    (staff_spaces_from_f5 - 0.5) * units_per_space
}

/// Compute glyph bounding box using SMuFL metrics
///
/// Fetches glyph metrics from embedded Bravura font and scales to font size
///
/// # Arguments
/// * `glyph_name` - SMuFL glyph name (e.g., "noteheadBlack")
/// * `position` - (x, y) coordinates of glyph anchor point
/// * `font_size` - Font size in logical units (typically 40.0 = 4 staff spaces)
/// * `units_per_space` - Scaling factor
///
/// # Returns
/// Bounding box in logical units relative to system coordinates
pub fn compute_glyph_bounding_box(
    glyph_name: &str,
    position: &Point,
    font_size: f32,
    units_per_space: f32,
) -> BoundingBox {
    let metrics_bbox = get_glyph_bbox(glyph_name);

    // Scale metrics bbox by font size / units_per_space
    let scale = font_size / (4.0 * units_per_space); // Font size is in 4 staff spaces

    BoundingBox {
        x: position.x + metrics_bbox.x * scale,
        y: position.y + metrics_bbox.y * scale,
        width: metrics_bbox.width * scale,
        height: metrics_bbox.height * scale,
    }
}

/// Position noteheads for a set of notes
///
/// Creates Glyph structs for noteheads using pitch-to-y mapping and horizontal spacing
///
/// # Arguments
/// * `notes` - Note events with pitch, start_tick, duration
/// * `horizontal_offsets` - Pre-computed x offsets for each note
/// * `units_per_space` - Scaling factor
/// * `instrument_id` - Instrument ID for source reference
/// * `staff_index` - Staff index for source reference
/// * `voice_index` - Voice index for source reference
///
/// # Returns
/// Vector of positioned glyph structs
pub fn position_noteheads(
    notes: &[(u8, u32, u32)], // (pitch, start_tick, duration)
    horizontal_offsets: &[f32],
    units_per_space: f32,
    instrument_id: &str,
    staff_index: usize,
    voice_index: usize,
) -> Vec<Glyph> {
    notes
        .iter()
        .zip(horizontal_offsets.iter())
        .enumerate()
        .map(|(i, ((pitch, _start, duration), &x))| {
            let y = pitch_to_y(*pitch, units_per_space);
            let position = Point { x, y };

            // T021-T022: Choose notehead codepoint based on duration_ticks
            // Duration mapping (assuming 960 PPQ = 1 beat):
            // - Whole note (4 beats): 3840+ ticks → U+E0A2 noteheadWhole
            // - Half note (2 beats): 1920-3839 ticks → U+E0A3 noteheadHalf
            // - Quarter note and shorter: <1920 ticks → U+E0A4 noteheadBlack
            let (codepoint, glyph_name) = if *duration >= 3840 {
                ('\u{E0A2}', "noteheadWhole")
            } else if *duration >= 1920 {
                ('\u{E0A3}', "noteheadHalf")
            } else {
                ('\u{E0A4}', "noteheadBlack")
            };
            
            // DEBUG: Log codepoint assignment (only in WASM builds for browser console)
            #[cfg(target_arch = "wasm32")]
            if i == 0 {
                web_sys::console::log_1(&format!(
                    "[WASM position_noteheads] First glyph: duration={}, codepoint='{}' (U+{:04X}), glyph_name={}", 
                    duration, codepoint, codepoint as u32, glyph_name
                ).into());
            }

            let bounding_box = compute_glyph_bounding_box(
                glyph_name,
                &position,
                40.0, // Standard font size
                units_per_space,
            );

            Glyph {
                position,
                bounding_box,
                codepoint: codepoint.to_string(),
                source_reference: SourceReference {
                    instrument_id: instrument_id.to_string(),
                    staff_index,
                    voice_index,
                    event_index: i,
                },
            }
        })
        .collect()
}

/// Position accidentals before noteheads with minimum separation
///
/// Stub for now - will be implemented when needed
pub fn position_accidentals() {
    // Stub implementation - accidentals positioning is complex
    // For MVP, we'll skip accidentals and implement this in future iterations
}

/// Position structural glyphs (clefs, key sigs, time sigs) at system start
///
/// Stub for now - will be implemented when needed
pub fn position_structural_glyphs() {
    // Stub implementation - structural glyphs positioning
    // For MVP, we'll skip structural glyphs and implement this in future iterations
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::layout::types::Point;

    /// T017: Unit test for pitch_to_y() with correct treble clef positions
    #[test]
    fn test_pitch_to_y_treble_staff() {
        let units_per_space = 20.0;

        // Treble staff lines (from top to bottom), with -0.5 offset for glyph centering:
        // F5 (MIDI 77) = top line at y=-10
        assert_eq!(pitch_to_y(77, units_per_space), -10.0, "F5 should be on top line (y=-10)");

        // D5 (MIDI 74) = 2nd line at y=30
        assert_eq!(pitch_to_y(74, units_per_space), 30.0, "D5 should be on 2nd line (y=30)");

        // B4 (MIDI 71) = 3rd line at y=70
        assert_eq!(pitch_to_y(71, units_per_space), 70.0, "B4 should be on 3rd line (y=70)");

        // G4 (MIDI 67) = 4th line at y=110
        assert_eq!(pitch_to_y(67, units_per_space), 110.0, "G4 should be on 4th line (y=110)");

        // E4 (MIDI 64) = bottom line at y=150
        assert_eq!(pitch_to_y(64, units_per_space), 150.0, "E4 should be on bottom line (y=150)");

        // C5 (MIDI 72) = space between 2nd and 3rd lines at y=50
        assert_eq!(pitch_to_y(72, units_per_space), 50.0, "C5 should be in space (y=50)");

        // Middle C4 (MIDI 60) = ledger line below staff at y=190
        assert_eq!(pitch_to_y(60, units_per_space), 190.0, "Middle C should be below staff (y=190)");

        // G5 (MIDI 79) = space above top line at y=-30
        assert_eq!(pitch_to_y(79, units_per_space), -30.0, "G5 should be above staff (y=-30)");
    }

    /// T017: Test pitch_to_y() with different units_per_space values
    #[test]
    fn test_pitch_to_y_scale_independence() {
        let pitch = 60; // Middle C4 (ledger line below treble staff)

        // With units_per_space = 20, C4 should be 9.5 spaces below F5 = 190 units
        assert_eq!(pitch_to_y(pitch, 20.0), 190.0);

        // With units_per_space = 10, C4 should be 9.5 spaces below F5 = 95 units
        assert_eq!(pitch_to_y(pitch, 10.0), 95.0);

        // With units_per_space = 25, C4 should be 9.5 spaces below F5 = 237.5 units
        assert_eq!(pitch_to_y(pitch, 25.0), 237.5);
    }

    /// T018: Unit test for notehead codepoint selection based on duration
    #[test]
    fn test_notehead_codepoint_by_duration() {
        // Define test cases: (duration_ticks, expected_codepoint, note_name)
        let test_cases = vec![
            (3840, '\u{E0A2}', "whole note"),     // 4 beats at 960 PPQ
            (1920, '\u{E0A3}', "half note"),      // 2 beats at 960 PPQ
            (960, '\u{E0A4}', "quarter note"),    // 1 beat at 960 PPQ
            (480, '\u{E0A4}', "eighth note"),     // 0.5 beat (should use filled notehead)
            (240, '\u{E0A4}', "sixteenth note"),  // 0.25 beat (should use filled notehead)
        ];

        for (duration_ticks, expected_codepoint, note_name) in test_cases {
            let codepoint = get_notehead_codepoint(duration_ticks);
            assert_eq!(codepoint, expected_codepoint, 
                       "{} (duration={}) should use codepoint {:?}", 
                       note_name, duration_ticks, expected_codepoint);
        }
    }

    /// T018: Helper function for notehead codepoint selection
    /// This will be integrated into position_noteheads() in T021-T022
    fn get_notehead_codepoint(duration_ticks: u32) -> char {
        if duration_ticks >= 3840 {
            '\u{E0A2}' // U+E0A2 noteheadWhole
        } else if duration_ticks >= 1920 {
            '\u{E0A3}' // U+E0A3 noteheadHalf
        } else {
            '\u{E0A4}' // U+E0A4 noteheadBlack (quarter, eighth, sixteenth, etc.)
        }
    }

    /// T019: Integration test for notehead positioning
    #[test]
    fn test_position_noteheads_integration() {
        let units_per_space = 20.0;
        let notes = vec![
            (60, 0, 960),    // Middle C, quarter note
            (62, 960, 960),  // D4, quarter note
            (64, 1920, 960), // E4, quarter note
        ];
        let horizontal_offsets = vec![0.0, 100.0, 200.0];

        let glyphs = position_noteheads(
            &notes,
            &horizontal_offsets,
            units_per_space,
            "test-instrument",
            0,
            0,
        );

        // Verify correct number of glyphs
        assert_eq!(glyphs.len(), 3, "Should produce 3 noteheads");

        // Verify first notehead (Middle C4 at x=0)
        // C4 = ledger line below staff, 9.5 staff spaces below F5
        assert_eq!(glyphs[0].position.x, 0.0, "First note x-position");
        assert_eq!(glyphs[0].position.y, 190.0, "Middle C4 should be at y=190");
        assert_eq!(glyphs[0].codepoint, String::from('\u{E0A4}'), "Quarter note uses black notehead");

        // Verify second notehead (D4 at x=100)
        // D4 = 8.5 staff spaces below F5
        assert_eq!(glyphs[1].position.x, 100.0, "Second note x-position");
        assert_eq!(glyphs[1].position.y, 170.0, "D4 should be at y=170");

        // Verify third notehead (E4 at x=200)
        // E4 = bottom line, 7.5 staff spaces below F5
        assert_eq!(glyphs[2].position.x, 200.0, "Third note x-position");
        assert_eq!(glyphs[2].position.y, 150.0, "E4 should be on bottom line (y=150)");
    }
}
