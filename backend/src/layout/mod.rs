//! Layout Engine Module
//!
//! Converts a CompiledScore into a deterministic hierarchical spatial model
//! expressed in logical units. The output defines systems as the primary
//! virtualization boundary and provides bounding boxes for efficient rendering,
//! hit testing, and interaction.

use serde::{Deserialize, Serialize};

pub mod batcher;
pub mod breaker;
pub mod metrics;
pub mod positioner;
pub mod spacer;
pub mod types;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

pub use breaker::MeasureInfo;
pub use types::{
    BarLine, BarLineType, BoundingBox, BracketType, Color, GlobalLayout, Glyph, GlyphRun, Point,
    SourceReference, Staff, StaffGroup, StaffLine, System, TickRange,
};

/// Configuration for layout computation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutConfig {
    /// Maximum system width in logical units (default: 800.0)
    pub max_system_width: f32,
    /// Scaling factor: logical units per staff space (default: 10.0)
    pub units_per_space: f32,
    /// Vertical spacing between systems in logical units (default: 150.0)
    pub system_spacing: f32,
    /// System height in logical units (default: 200.0 for grand staff)
    pub system_height: f32,
}

impl Default for LayoutConfig {
    fn default() -> Self {
        Self {
            max_system_width: 800.0,
            units_per_space: 20.0, // SMuFL: font_size 80 = 4 spaces, so 1 space = 20 units
            system_spacing: 550.0, // Increased spacing to accommodate larger grand staff
            system_height: 480.0, // Height for grand staff with 14 staff spaces separation
        }
    }
}

/// Compute layout from a CompiledScore
///
/// This is the main entry point for the layout engine. Returns a `GlobalLayout`
/// containing the complete spatial model organized into systems.
///
/// # Determinism
///
/// Layout computation is deterministic - identical inputs always produce
/// byte-identical outputs, enabling aggressive caching.
pub fn compute_layout(score: &serde_json::Value, config: &LayoutConfig) -> GlobalLayout {
    // Extract measures from score (simplified - assumes 4/4 time)
    let measures = extract_measures(score);

    // Compute measure widths using spacer
    let spacing_config = spacer::SpacingConfig::default();
    let measure_infos: Vec<breaker::MeasureInfo> = measures
        .iter()
        .enumerate()
        .map(|(i, note_durations)| {
            let width = spacer::compute_measure_width(note_durations, &spacing_config);
            let start_tick = i as u32 * 3840; // 4/4 measure = 3840 ticks
            let end_tick = start_tick + 3840;
            breaker::MeasureInfo {
                width,
                start_tick,
                end_tick,
            }
        })
        .collect();

    // Break into systems
    let mut systems = breaker::break_into_systems(
        &measure_infos,
        config.max_system_width,
        config.system_height,
        config.system_spacing,
    );

    // Extract instruments from score
    let instruments = extract_instruments(score);

    // Populate staff_groups for each system with positioned and batched glyphs
    for system in &mut systems {
        let mut staff_groups = Vec::new();

        for instrument in &instruments {
            let mut staves = Vec::new();

            for (staff_index, staff_data) in instrument.staves.iter().enumerate() {
                // Calculate vertical offset for this staff (same formula as create_staff_lines)
                // Staff spacing: 14 staff spaces between staves (provides clear separation for piano grand staff)
                let staff_vertical_offset = staff_index as f32 * 14.0 * config.units_per_space;

                // Calculate left margin needed for structural glyphs
                // Clef (~60 units) + key sig (15 * sharps) + time sig (~50 units) + spacing (~60 units)
                let key_sig_width = staff_data.key_sharps.abs() as f32 * 15.0;
                let left_margin = 170.0 + key_sig_width;
                
                // Position glyphs for this staff within the system's tick range
                let glyphs = position_glyphs_for_staff(
                    staff_data,
                    &system.tick_range,
                    system.bounding_box.width,
                    config.units_per_space,
                    &instrument.id,
                    staff_index,
                    left_margin,
                    staff_vertical_offset,
                );

                // Batch glyphs for efficient rendering
                let glyph_runs = batcher::batch_glyphs(glyphs);

                // Create staff lines (5 lines evenly spaced)
                let staff_lines = create_staff_lines(
                    staff_index,
                    system.bounding_box.width,
                    config.units_per_space,
                );

                // T036-T037: Generate structural glyphs (clef, time sig, key sig) at system start
                let mut structural_glyphs = Vec::new();

                // Position clef at x=20 (left margin)
                let clef_glyph = positioner::position_clef(
                    &staff_data.clef,
                    20.0,
                    config.units_per_space,
                    staff_vertical_offset,
                );
                structural_glyphs.push(clef_glyph);

                // Position key signature after clef (x=80)
                let key_sig_glyphs = positioner::position_key_signature(
                    staff_data.key_sharps,
                    &staff_data.clef,
                    80.0,
                    config.units_per_space,
                    staff_vertical_offset,
                );
                structural_glyphs.extend(key_sig_glyphs);

                // Position time signature after key signature
                // Key sig takes ~15 units per accidental, so calculate dynamic x position
                let key_sig_width = staff_data.key_sharps.abs() as f32 * 15.0;
                let time_sig_x = 80.0 + key_sig_width + 20.0; // Add 20 unit gap
                let time_sig_glyphs = positioner::position_time_signature(
                    staff_data.time_numerator,
                    staff_data.time_denominator,
                    time_sig_x,
                    config.units_per_space,
                    staff_vertical_offset,
                );
                structural_glyphs.extend(time_sig_glyphs);

                // Create bar lines at measure boundaries
                let bar_lines = create_bar_lines(
                    &measure_infos,
                    &system.tick_range,
                    staff_index,
                    left_margin,
                    system.bounding_box.width,
                    config.units_per_space,
                );

                // Create staff with batched glyphs and structural glyphs
                let staff = Staff {
                    staff_lines,
                    glyph_runs,
                    structural_glyphs,
                    bar_lines,
                };

                staves.push(staff);
            }

            // Create staff group for this instrument
            let staff_group = StaffGroup {
                instrument_id: instrument.id.clone(),
                staves,
                bracket_type: if instrument.staves.len() > 1 {
                    BracketType::Brace
                } else {
                    BracketType::None
                },
            };

            staff_groups.push(staff_group);
        }

        system.staff_groups = staff_groups;
    }

    // Compute GlobalLayout dimensions
    let total_width = systems
        .iter()
        .map(|s| s.bounding_box.width)
        .max_by(|a, b| a.partial_cmp(b).unwrap())
        .unwrap_or(0.0);

    let total_height = if systems.is_empty() {
        0.0
    } else {
        let last_system = systems.last().unwrap();
        last_system.bounding_box.y + last_system.bounding_box.height
    };

    GlobalLayout {
        systems,
        total_width,
        total_height,
        units_per_space: config.units_per_space,
    }
}

/// Extract measures from CompiledScore JSON
///
/// Returns a Vec where each element is a Vec of note durations for that measure.
/// For multi-staff instruments, notes at the same timing position are counted only once
/// (e.g., treble + bass notes sounding together take one horizontal space).
fn extract_measures(score: &serde_json::Value) -> Vec<Vec<u32>> {
    let mut measures: Vec<Vec<u32>> = Vec::new();

    // Extract notes from all instruments
    if let Some(instruments) = score["instruments"].as_array() {
        
        for instrument in instruments {
            if let Some(staves) = instrument["staves"].as_array() {
                // Collect all unique timing positions across all staves
                // (treble + bass notes at same tick = one horizontal position)
                let mut all_notes_by_measure: std::collections::HashMap<
                    usize,
                    std::collections::HashSet<u32>,
                > = std::collections::HashMap::new();

                for staff in staves {
                    if let Some(voices) = staff["voices"].as_array() {
                        for voice in voices {
                            // Try both "interval_events" (Score format) and "notes" (converted format)
                            let notes_array = voice["interval_events"].as_array()
                                .or_else(|| voice["notes"].as_array());
                            
                            if let Some(notes) = notes_array {
                                
                                for note in notes {
                                    // Support multiple field name formats:
                                    // Format 1 (Score): start_tick, duration_ticks
                                    // Format 2 (LayoutView): tick, duration
                                    // Format 3 (nested): start_tick.value
                                    let start_tick = note["start_tick"].as_u64()
                                        .or_else(|| note["tick"].as_u64())
                                        .or_else(|| note["start_tick"]["value"].as_u64())
                                        .unwrap_or(0) as u32;
                                    
                                    let _duration = note["duration_ticks"].as_u64()
                                        .or_else(|| note["duration"].as_u64())
                                        .unwrap_or(960) as u32;

                                    // Determine which measure this note belongs to (4/4 = 3840 ticks per measure)
                                    let measure_index = (start_tick / 3840) as usize;

                                    // Track unique timing positions (deduplicate simultaneous notes)
                                    all_notes_by_measure
                                        .entry(measure_index)
                                        .or_insert_with(std::collections::HashSet::new)
                                        .insert(start_tick);
                                }
                            }
                        }
                    }
                }

                // Convert unique timing positions to measure durations
                // For simplicity, assume all notes have the same duration (eighth note = 480 ticks)
                for (measure_index, timing_positions) in all_notes_by_measure {
                    // Expand measures vector if needed
                    while measures.len() <= measure_index {
                        measures.push(Vec::new());
                    }

                    // Add one duration entry per unique timing position
                    for _ in 0..timing_positions.len() {
                        measures[measure_index].push(480); // Eighth note duration
                    }
                }
            }
        }
    }

    // If no measures found, return empty default measures
    if measures.is_empty() {
        vec![vec![960; 4]; 10] // 10 measures with 4 quarter notes each
    } else {
        measures
    }
}

/// Represents an instrument with its staves extracted from CompiledScore
#[derive(Debug, Clone)]
struct InstrumentData {
    id: String,
    staves: Vec<StaffData>,
}

/// Represents a staff with voices and notes
#[derive(Debug, Clone)]
struct StaffData {
    voices: Vec<VoiceData>,
    clef: String,           // e.g., "Treble", "Bass", "Alto", "Tenor"
    time_numerator: u8,     // e.g., 4 for 4/4 time
    time_denominator: u8,   // e.g., 4 for 4/4 time
    key_sharps: i8,         // Positive for sharps, negative for flats, 0 for C major
}

/// Represents a voice with interval events (notes)
#[derive(Debug, Clone)]
struct VoiceData {
    notes: Vec<NoteEvent>,
}

/// Represents a single note event
#[derive(Debug, Clone)]
struct NoteEvent {
    pitch: u8,
    start_tick: u32,
    duration_ticks: u32,
}

/// Extract instruments from CompiledScore JSON
fn extract_instruments(score: &serde_json::Value) -> Vec<InstrumentData> {
    let mut instruments = Vec::new();

    // DEBUG: Log the entire input to see what we're receiving
    eprintln!("[extract_instruments] Input score: {}", serde_json::to_string_pretty(score).unwrap_or_else(|_| "cannot serialize".to_string()));

    if let Some(instruments_array) = score["instruments"].as_array() {
        eprintln!("[extract_instruments] Found {} instruments", instruments_array.len());
        for instrument in instruments_array {
            let id = instrument["id"].as_str().unwrap_or("unknown").to_string();
            let mut staves = Vec::new();

            if let Some(staves_array) = instrument["staves"].as_array() {
                for staff in staves_array {
                    let mut voices = Vec::new();

                    // Extract structural metadata (with defaults)
                    let clef = staff["clef"].as_str().unwrap_or("Treble").to_string();
                    let time_numerator = staff["time_signature"]["numerator"].as_u64().unwrap_or(4) as u8;
                    let time_denominator = staff["time_signature"]["denominator"].as_u64().unwrap_or(4) as u8;
                    let key_sharps = staff["key_signature"]["sharps"].as_i64().unwrap_or(0) as i8;

                    if let Some(voices_array) = staff["voices"].as_array() {
                        eprintln!("[extract_instruments] Found {} voices in staff", voices_array.len());
                        for voice in voices_array {
                            let mut notes = Vec::new();

                            // T008-T009: Support both "notes" (LayoutView format) and "interval_events" (CompiledScore format)
                            // Check "notes" first for frontend fixtures, fall back to "interval_events" for backward compatibility
                            eprintln!("[extract_instruments] Voice keys: {:?}", voice.as_object().map(|o| o.keys().collect::<Vec<_>>()));
                            
                            let note_array = voice["notes"].as_array()
                                .or_else(|| voice["interval_events"].as_array());

                            if let Some(notes_data) = note_array {
                                eprintln!("[extract_instruments] Found {} notes in voice", notes_data.len());
                                for note_item in notes_data {
                                    // Handle both formats:
                                    // Format 1 (notes): {tick: 0, duration: 960, pitch: 60}
                                    // Format 2 (interval_events): {start_tick: {value: 0}, duration_ticks: 960, pitch: {value: 60}}
                                    
                                    let pitch = if let Some(p) = note_item["pitch"].as_u64() {
                                        p as u8  // Format 1: direct value
                                    } else {
                                        note_item["pitch"]["value"].as_u64().unwrap_or(60) as u8  // Format 2: nested
                                    };
                                    
                                    let start_tick = if let Some(t) = note_item["tick"].as_u64() {
                                        t as u32  // Format 1: "tick"
                                    } else {
                                        note_item["start_tick"]["value"].as_u64().unwrap_or(0) as u32  // Format 2: nested
                                    };
                                    
                                    let duration_ticks = if let Some(d) = note_item["duration"].as_u64() {
                                        d as u32  // Format 1: "duration"
                                    } else {
                                        note_item["duration_ticks"].as_u64().unwrap_or(960) as u32  // Format 2
                                    };

                                    notes.push(NoteEvent {
                                        pitch,
                                        start_tick,
                                        duration_ticks,
                                    });
                                }
                                eprintln!("[extract_instruments] Extracted {} notes from voice", notes.len());
                            } else {
                                eprintln!("[extract_instruments] WARNING: No 'notes' or 'interval_events' array found in voice");
                            }

                            voices.push(VoiceData { notes });
                        }
                    }

                    staves.push(StaffData {
                        voices,
                        clef,
                        time_numerator,
                        time_denominator,
                        key_sharps,
                    });
                }
            }

            instruments.push(InstrumentData { id, staves });
        }
    }

    instruments
}

/// Position glyphs for a single staff within a system's tick range
fn position_glyphs_for_staff(
    staff_data: &StaffData,
    tick_range: &TickRange,
    system_width: f32,
    units_per_space: f32,
    instrument_id: &str,
    staff_index: usize,
    left_margin: f32,
    staff_vertical_offset: f32,
) -> Vec<Glyph> {
    let mut all_glyphs = Vec::new();

    for (voice_index, voice) in staff_data.voices.iter().enumerate() {
        // Filter notes that fall within this system's tick range
        let notes_in_range: Vec<(u8, u32, u32)> = voice
            .notes
            .iter()
            .filter(|note| {
                note.start_tick >= tick_range.start_tick && note.start_tick < tick_range.end_tick
            })
            .map(|note| (note.pitch, note.start_tick, note.duration_ticks))
            .collect();

        if notes_in_range.is_empty() {
            continue;
        }

        // Calculate horizontal offsets for notes based on their tick positions
        // Notes start after the left margin (structural glyphs)
        let tick_span = (tick_range.end_tick - tick_range.start_tick) as f32;
        let available_width = system_width - left_margin;
        let horizontal_offsets: Vec<f32> = notes_in_range
            .iter()
            .map(|(_, start_tick, _)| {
                let relative_tick = (*start_tick - tick_range.start_tick) as f32;
                let position_ratio = relative_tick / tick_span;
                left_margin + (position_ratio * available_width)
            })
            .collect();

        // Position noteheads using positioner module
        let glyphs = positioner::position_noteheads(
            &notes_in_range,
            &horizontal_offsets,
            &staff_data.clef,  // Pass clef type for correct pitch positioning
            units_per_space,
            instrument_id,
            staff_index,
            voice_index,
            staff_vertical_offset,
        );

        all_glyphs.extend(glyphs);
    }

    all_glyphs
}

/// Create staff lines for a single staff
fn create_staff_lines(
    staff_index: usize,
    system_width: f32,
    units_per_space: f32,
) -> [StaffLine; 5] {
    // Each staff is vertically offset based on its index
    // Staff spacing: 14 staff spaces (280 logical units at default scale of 20)
    let staff_vertical_offset = staff_index as f32 * 14.0 * units_per_space;

    // Create 5 evenly spaced lines (2 staff spaces apart = 20 logical units)
    let mut lines = Vec::new();
    for line_index in 0..5 {
        let y_position = staff_vertical_offset + (line_index as f32 * 2.0 * units_per_space);
        lines.push(StaffLine {
            y_position,
            start_x: 0.0,
            end_x: system_width,
        });
    }

    // Convert Vec to array (guaranteed to have exactly 5 elements)
    lines.try_into().unwrap()
}

/// Create bar lines for a single staff at measure boundaries
///
/// # Arguments
/// * `measure_infos` - All measures with their tick ranges and widths
/// * `tick_range` - The system's tick range
/// * `staff_index` - Index of staff for vertical positioning
/// * `left_margin` - Left margin where music content starts
/// * `system_width` - Total width of the system
/// * `units_per_space` - Scaling factor
///
/// # Returns
/// Vector of bar lines positioned at measure boundaries
fn create_bar_lines(
    measure_infos: &[breaker::MeasureInfo],
    tick_range: &TickRange,
    staff_index: usize,
    left_margin: f32,
    system_width: f32,
    units_per_space: f32,
) -> Vec<BarLine> {
    let mut bar_lines = Vec::new();
    
    // Calculate staff vertical offset
    let staff_vertical_offset = staff_index as f32 * 14.0 * units_per_space;
    
    // Y positions for top and bottom staff lines
    let y_start = staff_vertical_offset; // Top line (line 0)
    let y_end = staff_vertical_offset + (4.0 * 2.0 * units_per_space); // Bottom line (line 4)
    
    // Find measures that overlap with this system's tick range
    let measures_in_system: Vec<&breaker::MeasureInfo> = measure_infos
        .iter()
        .filter(|m| m.start_tick < tick_range.end_tick && m.end_tick > tick_range.start_tick)
        .collect();
    
    if measures_in_system.is_empty() {
        return bar_lines;
    }
    
    // Calculate available width for measures (excluding left margin)
    let available_width = system_width - left_margin;
    let tick_span = (tick_range.end_tick - tick_range.start_tick) as f32;
    
    // Add bar lines at the end of each measure
    for measure in &measures_in_system {
        let measure_end_tick = measure.end_tick;
        
        // Skip if measure end is beyond system range
        if measure_end_tick > tick_range.end_tick {
            continue;
        }
        
        // Calculate x position based on tick position
        let relative_tick = (measure_end_tick - tick_range.start_tick) as f32;
        let position_ratio = relative_tick / tick_span;
        let x_position = left_margin + (position_ratio * available_width);
        
        // Determine bar line type
        let bar_type = if measure_end_tick == tick_range.end_tick {
            // Check if this is the very last measure in the entire score
            let is_last_measure = measure_infos.last().map(|m| m.end_tick) == Some(measure_end_tick);
            if is_last_measure {
                BarLineType::Final
            } else {
                BarLineType::Single
            }
        } else {
            BarLineType::Single
        };
        
        bar_lines.push(BarLine {
            x_position,
            y_start,
            y_end,
            bar_type,
        });
    }
    
    bar_lines
}

#[cfg(test)]
mod tests {
    use super::*;

    /// T011: Unit test for create_staff_lines() verifying 5 lines with 20-unit spacing
    #[test]
    fn test_create_staff_lines_spacing() {
        let units_per_space = 20.0;
        let system_width = 1200.0;
        let staff_index = 0;

        let lines = create_staff_lines(staff_index, system_width, units_per_space);

        // Verify exactly 5 lines
        assert_eq!(lines.len(), 5, "Should have exactly 5 staff lines");

        // Verify y-positions with 40-unit spacing (2 * units_per_space)
        assert_eq!(lines[0].y_position, 0.0, "Line 0 should be at y=0");
        assert_eq!(lines[1].y_position, 40.0, "Line 1 should be at y=40");
        assert_eq!(lines[2].y_position, 80.0, "Line 2 should be at y=80");
        assert_eq!(lines[3].y_position, 120.0, "Line 3 should be at y=120");
        assert_eq!(lines[4].y_position, 160.0, "Line 4 should be at y=160");

        // Verify all lines span full system width
        for (i, line) in lines.iter().enumerate() {
            assert_eq!(line.start_x, 0.0, "Line {} should start at x=0", i);
            assert_eq!(line.end_x, system_width, "Line {} should end at system_width", i);
        }
    }

    /// T011: Unit test for multi-staff layout with correct vertical offsetting
    #[test]
    fn test_create_staff_lines_multi_staff() {
        let units_per_space = 20.0;
        let system_width = 1200.0;

        // First staff (staff_index = 0)
        let staff_0 = create_staff_lines(0, system_width, units_per_space);
        assert_eq!(staff_0[0].y_position, 0.0);
        assert_eq!(staff_0[4].y_position, 160.0);

        // Second staff (staff_index = 1) - should be offset by 14 staff spaces (280 units)
        let staff_1 = create_staff_lines(1, system_width, units_per_space);
        let expected_offset = 14.0 * units_per_space; // 280 units
        assert_eq!(staff_1[0].y_position, expected_offset);
        assert_eq!(staff_1[4].y_position, expected_offset + 160.0);
    }

    /// T011: Unit test for different units_per_space values
    #[test]
    fn test_create_staff_lines_scale_independence() {
        let system_width = 1200.0;
        let staff_index = 0;

        // Test with different scale (units_per_space = 10)
        let lines_scale_10 = create_staff_lines(staff_index, system_width, 10.0);
        assert_eq!(lines_scale_10[0].y_position, 0.0);
        assert_eq!(lines_scale_10[1].y_position, 20.0);  // 2 * 10
        assert_eq!(lines_scale_10[4].y_position, 80.0);  // 4 * 2 * 10

        // Test with different scale (units_per_space = 25)
        let lines_scale_25 = create_staff_lines(staff_index, system_width, 25.0);
        assert_eq!(lines_scale_25[0].y_position, 0.0);
        assert_eq!(lines_scale_25[1].y_position, 50.0);  // 2 * 25
        assert_eq!(lines_scale_25[4].y_position, 200.0); // 4 * 2 * 25
    }

    /// T029: Integration test for structural glyph generation
    #[test]
    fn test_structural_glyphs_populated() {
        // Create a minimal score with clef, time sig, and key sig
        let score = serde_json::json!({
            "instruments": [{
                "id": "violin",
                "staves": [{
                    "clef": "Treble",
                    "time_signature": { "numerator": 4, "denominator": 4 },
                    "key_signature": { "sharps": 1 },  // G major (1 sharp)
                    "voices": [{
                        "notes": [
                            { "pitch": 60, "tick": 0, "duration": 960 }
                        ]
                    }]
                }]
            }]
        });

        let config = LayoutConfig::default();
        let layout = compute_layout(&score, &config);

        // Verify at least one system was created
        assert!(!layout.systems.is_empty(), "Should have at least one system");
        let system = &layout.systems[0];

        // Verify at least one staff group exists
        assert!(!system.staff_groups.is_empty(), "Should have at least one staff group");
        let staff_group = &system.staff_groups[0];

        // Verify at least one staff exists
        assert!(!staff_group.staves.is_empty(), "Should have at least one staff");
        let staff = &staff_group.staves[0];

        // Verify structural glyphs are populated
        assert!(
            !staff.structural_glyphs.is_empty(),
            "structural_glyphs should be populated with clef, time sig, and key sig"
        );

        // Should have at least:
        // - 1 clef
        // - 2 time signature digits (numerator + denominator)
        // - 1 key signature accidental (G major = 1 sharp)
        // Total: >= 4 glyphs
        assert!(
            staff.structural_glyphs.len() >= 4,
            "Expected at least 4 structural glyphs (clef + 2 time sig digits + 1 key sig accidental), got {}",
            staff.structural_glyphs.len()
        );

        // Verify first glyph is a clef (starts with 'E' in SMuFL codepoint range)
        let first_glyph = &staff.structural_glyphs[0];
        // Extract first Unicode scalar value from codepoint string
        if let Some(first_char) = first_glyph.codepoint.chars().next() {
            let clef_codepoint = first_char as u32;
            assert!(
                (0xE050..=0xE07F).contains(&clef_codepoint),
                "First glyph should be a clef (U+E050-U+E07F), got U+{:04X}",
                clef_codepoint
            );
        } else {
            panic!("Glyph codepoint is empty");
        }
    }
}
