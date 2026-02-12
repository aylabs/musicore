//! Glyph positioning
//!
//! Positions glyphs based on pitch (vertical) and timing (horizontal).

use crate::layout::metrics::get_glyph_bbox;
use crate::layout::types::{BoundingBox, Glyph, Point, SourceReference};

/// Convert pitch to y-coordinate on staff
///
/// Uses standard music notation positioning:
/// - Middle C (60) is below the treble staff, on first ledger line below
/// - Each half-step moves by 0.5 staff spaces (5 logical units at default scale)
/// - Staff lines are at y = 0, 10, 20, 30, 40 (for 5-line staff)
///
/// # Arguments
/// * `pitch` - MIDI pitch number (60 = middle C, 69 = A440)
/// * `units_per_space` - Scaling factor (default: 10.0 logical units = 1 staff space)
///
/// # Returns
/// Y-coordinate in logical units (system-relative, positive = downward)
pub fn pitch_to_y(pitch: u8, units_per_space: f32) -> f32 {
    // Reference pitch: C5 (MIDI 72) = top line of treble staff (y = 0)
    // Each half-step down = +0.5 staff spaces (positive y goes downward)
    let c5_line = 0.0; // Top line of treble staff
    let semitones_from_c5 = 72i32 - pitch as i32;
    let staff_spaces_offset = semitones_from_c5 as f32 * 0.5;
    c5_line + staff_spaces_offset * units_per_space
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
        .map(|(i, ((pitch, _start, _duration), &x))| {
            let y = pitch_to_y(*pitch, units_per_space);
            let position = Point { x, y };

            // Choose notehead based on duration (simplified - always black for now)
            let glyph_name = "noteheadBlack";
            let bounding_box = compute_glyph_bounding_box(
                glyph_name,
                &position,
                40.0, // Standard font size
                units_per_space,
            );

            Glyph {
                position,
                bounding_box,
                codepoint: '\u{E0A4}', // SMuFL noteheadBlack
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
