//! Layout Engine Module
//!
//! Converts a CompiledScore into a deterministic hierarchical spatial model
//! expressed in logical units. The output defines systems as the primary
//! virtualization boundary and provides bounding boxes for efficient rendering,
//! hit testing, and interaction.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub mod batcher;
pub mod beams;
pub mod breaker;
pub mod metrics;
pub mod positioner;
pub mod spacer;
pub mod stems;
pub mod types;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

pub use breaker::MeasureInfo;
pub use types::{
    BarLine, BarLineSegment, BarLineType, BoundingBox, BracketGlyph, BracketType, Color,
    GlobalLayout, Glyph, GlyphRun, Point, SourceReference, Staff, StaffGroup, StaffLine, System,
    TickRange,
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
            system_spacing: 200.0, // Spacing between systems (gap after system_height)
            system_height: 600.0, // Height for grand staff with 20 staff spaces separation
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

            // Calculate left margin (same for all staves in this instrument)
            let key_sig_width = instrument.staves.first()
                .map(|s| s.key_sharps.abs() as f32 * 15.0)
                .unwrap_or(0.0);
            let left_margin = 210.0 + key_sig_width;

            // Compute unified note positions across all staves in this instrument (Principle VI)
            // This ensures notes at the same tick align horizontally between treble/bass staves
            let note_positions = compute_unified_note_positions(
                &instrument.staves,
                &system.tick_range,
                system.bounding_box.width,
                left_margin,
                &spacing_config,
            );

            for (staff_index, staff_data) in instrument.staves.iter().enumerate() {
                // Calculate vertical offset for this staff relative to system position
                // Staff spacing: 20 staff spaces between staves (provides clear separation for piano grand staff)
                let staff_vertical_offset = system.bounding_box.y + (staff_index as f32 * 20.0 * config.units_per_space);
                
                // Position glyphs for this staff using unified note positions
                let glyphs = position_glyphs_for_staff(
                    staff_data,
                    &system.tick_range,
                    config.units_per_space,
                    &instrument.id,
                    staff_index,
                    staff_vertical_offset,
                    &note_positions,
                );

                // Batch glyphs for efficient rendering
                let glyph_runs = batcher::batch_glyphs(glyphs);

                // Create staff lines (5 lines evenly spaced)
                let staff_lines = create_staff_lines(
                    staff_index,
                    system.bounding_box.width,
                    config.units_per_space,
                    system.bounding_box.y,
                );

                // T036-T037: Generate structural glyphs (clef, time sig, key sig) at system start
                let mut structural_glyphs = Vec::new();

                // Position clef at x=60 (left margin with room for brace and glyph extent)
                let clef_glyph = positioner::position_clef(
                    &staff_data.clef,
                    60.0,
                    config.units_per_space,
                    staff_vertical_offset,
                );
                structural_glyphs.push(clef_glyph);

                // Position key signature after clef (x=120)
                let key_sig_glyphs = positioner::position_key_signature(
                    staff_data.key_sharps,
                    &staff_data.clef,
                    120.0,
                    config.units_per_space,
                    staff_vertical_offset,
                );
                structural_glyphs.extend(key_sig_glyphs);

                // Position time signature after key signature
                // Key sig takes ~15 units per accidental, so calculate dynamic x position
                let key_sig_width = staff_data.key_sharps.abs() as f32 * 15.0;
                let time_sig_x = 120.0 + key_sig_width + 20.0; // Add 20 unit gap
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
                    system.bounding_box.y,
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

            // Calculate bracket glyph geometry if multi-staff instrument
            let bracket_type = if instrument.staves.len() > 1 {
                BracketType::Brace
            } else {
                BracketType::None
            };
            
            let bracket_glyph = if instrument.staves.len() > 1 {
                Some(create_bracket_glyph(&staves, &bracket_type, config))
            } else {
                None
            };

            // Create staff group for this instrument
            let staff_group = StaffGroup {
                instrument_id: instrument.id.clone(),
                staves,
                bracket_type,
                bracket_glyph,
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

/// Compute unified note positions across all staves in a staff group
/// 
/// For multi-staff instruments (e.g., piano), notes at the same tick must align
/// horizontally across all staves. This function collects all unique tick positions
/// from all staves and computes a unified spacing map.
///
/// # Arguments
/// * `staves` - All staves in the staff group (e.g., treble + bass for piano)
/// * `tick_range` - Tick range for this system
/// * `system_width` - Total system width in logical units
/// * `left_margin` - Left margin for note area
/// * `spacing_config` - Spacing configuration
///
/// # Returns
/// HashMap mapping tick positions to x-coordinates (Principle VI: Layout Engine Authority)
fn compute_unified_note_positions(
    staves: &[StaffData],
    tick_range: &TickRange,
    system_width: f32,
    left_margin: f32,
    spacing_config: &spacer::SpacingConfig,
) -> HashMap<u32, f32> {
    // Collect all unique (tick, duration) pairs from all staves
    let mut tick_durations: Vec<(u32, u32)> = Vec::new();
    
    for staff_data in staves {
        for voice in &staff_data.voices {
            for note in &voice.notes {
                if note.start_tick >= tick_range.start_tick && note.start_tick < tick_range.end_tick {
                    tick_durations.push((note.start_tick, note.duration_ticks));
                }
            }
        }
    }
    
    if tick_durations.is_empty() {
        return HashMap::new();
    }
    
    // Sort by tick position and remove duplicates
    tick_durations.sort_by_key(|(tick, _)| *tick);
    tick_durations.dedup_by_key(|(tick, _)| *tick);
    
    // Calculate cumulative spacing based on durations
    let mut cumulative_spacing = Vec::new();
    let mut current_position = 0.0;
    let mut last_tick = tick_range.start_tick;
    
    for (start_tick, duration_ticks) in &tick_durations {
        if *start_tick > last_tick {
            let gap_duration = (*start_tick - last_tick).min(*duration_ticks);
            current_position += spacer::compute_note_spacing(gap_duration, spacing_config);
        }
        cumulative_spacing.push(current_position);
        last_tick = *start_tick;
    }
    
    // Calculate total natural width including space for notehead and barline clearance
    // Add right margin (20 units = 1 staff space) to prevent noteheads from overlapping barlines
    let right_margin = 20.0;
    let total_natural_width = if let Some(&last_pos) = cumulative_spacing.last() {
        let (_, last_duration) = tick_durations.last().unwrap();
        last_pos + spacer::compute_note_spacing(*last_duration, spacing_config) + right_margin
    } else {
        spacing_config.minimum_spacing + right_margin
    };
    
    // Scale positions to fit available width
    let available_width = system_width - left_margin;
    let scale_factor = if total_natural_width > 0.0 {
        available_width / total_natural_width
    } else {
        1.0
    };
    
    // Build position map: tick -> x_position
    let mut position_map = HashMap::new();
    for (i, (tick, _)) in tick_durations.iter().enumerate() {
        let x_position = left_margin + (cumulative_spacing[i] * scale_factor);
        position_map.insert(*tick, x_position);
    }
    
    position_map
}

/// Position glyphs for a single staff within a system's tick range
///
/// Uses pre-computed unified note positions to ensure horizontal alignment
/// across all staves in a staff group (e.g., piano treble/bass).
///
/// # Arguments
/// * `staff_data` - Staff data containing voices and notes
/// * `tick_range` - Tick range for this system
/// * `units_per_space` - Scaling factor (20 units = 1 staff space)
/// * `instrument_id` - Instrument identifier
/// * `staff_index` - Index of this staff within the instrument
/// * `staff_vertical_offset` - Vertical offset for this staff
/// * `note_positions` - Pre-computed tick -> x_position map (unified across staves)
fn position_glyphs_for_staff(
    staff_data: &StaffData,
    tick_range: &TickRange,
    units_per_space: f32,
    instrument_id: &str,
    staff_index: usize,
    staff_vertical_offset: f32,
    note_positions: &HashMap<u32, f32>,
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

        // Use pre-computed positions from unified spacing (Principle VI)
        let horizontal_offsets: Vec<f32> = notes_in_range
            .iter()
            .map(|(_, start_tick, _)| {
                *note_positions.get(start_tick).unwrap_or(&0.0)
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
        
        // T056-T058: Stem/beam generation disabled - using combined notehead+stem glyphs
        // SMuFL provides U+E1D3/U+E1D5 which include stems in the glyph
        // TODO: Restore beam generation for eighth notes in future phase
        
        /*
        // DISABLED: Generate stems for notes (except whole notes which have duration >= 3840 ticks)
        let mut stem_glyphs = Vec::new();
        let mut beamable_notes = Vec::new();
        
        for (i, (pitch, start_tick, duration_ticks)) in notes_in_range.iter().enumerate() {
            // Skip whole notes (no stems)
            if *duration_ticks >= 3840 {
                continue;
            }
            
            #[cfg(target_arch = "wasm32")]
            {
                use web_sys::console;
                console::log_1(&format!(
                    "[Stem Gen] pitch={}, duration={} ticks (generating stem)",
                    pitch, duration_ticks
                ).into());
            }
            
            let notehead_x = horizontal_offsets[i];
            // IMPORTANT: Add staff_vertical_offset to match notehead positioning
            let notehead_y = positioner::pitch_to_y(*pitch, &staff_data.clef, units_per_space) + staff_vertical_offset;
            
            // Compute stem direction
            let direction = stems::compute_stem_direction(notehead_y, staff_middle_y);
            
            // Create stem (assuming notehead width of 10 logical units)
            let notehead_width = 10.0;
            let stem = stems::create_stem(notehead_x, notehead_y, direction, notehead_width);
            
            // Encode stem as special glyph (U+0000)
            let stem_glyph = Glyph {
                codepoint: '\u{0000}'.to_string(),
                position: Point {
                    x: stem.x,
                    y: stem.y_start,
                },
                bounding_box: BoundingBox {
                    x: stem.x - (stem.thickness / 2.0),
                    y: stem.y_start.min(stem.y_end),
                    width: stem.thickness,
                    height: (stem.y_end - stem.y_start).abs(),
                },
                source_reference: SourceReference {
                    instrument_id: instrument_id.to_string(),
                    staff_index,
                    voice_index,
                    event_index: i,
                },
            };
            stem_glyphs.push(stem_glyph);
            
            // Track beamable notes (eighth notes and shorter: <= 480 ticks)
            if *duration_ticks <= 480 {
                beamable_notes.push(beams::BeamableNote {
                    x: notehead_x,
                    y: notehead_y,
                    stem_end_y: stem.y_end,
                    tick: *start_tick,
                    duration_ticks: *duration_ticks,
                });
            }
        }
        
        all_glyphs.extend(stem_glyphs);
        
        // Generate beams for grouped eighth notes
        let beam_groups = beams::group_beamable_notes(&beamable_notes, 960); // 960 ticks per beat (quarter note)
        
        for (group_index, group) in beam_groups.iter().enumerate() {
            let slope = beams::compute_beam_slope(group, units_per_space);
            if let Some(beam) = beams::create_beam(group, slope) {
                // Encode beam as special glyph (U+0001)
                let beam_glyph = Glyph {
                    codepoint: '\u{0001}'.to_string(),
                    position: Point {
                        x: beam.x_start,
                        y: beam.y_start,
                    },
                    bounding_box: BoundingBox {
                        x: beam.x_start,
                        y: beam.y_start.min(beam.y_end),
                        width: beam.x_end - beam.x_start,
                        height: (beam.y_end - beam.y_start).abs().max(beam.thickness),
                    },
                    source_reference: SourceReference {
                        instrument_id: instrument_id.to_string(),
                        staff_index,
                        voice_index,
                        event_index: group_index,
                    },
                };
                all_glyphs.push(beam_glyph);
            }
        }
        */
    }

    all_glyphs
}

/// Create staff lines for a single staff
fn create_staff_lines(
    staff_index: usize,
    system_width: f32,
    units_per_space: f32,
    system_y_position: f32,
) -> [StaffLine; 5] {
    // Each staff is vertically offset based on its index, relative to system
    // Staff spacing: 20 staff spaces (400 logical units at default scale of 20)
    let staff_vertical_offset = system_y_position + (staff_index as f32 * 20.0 * units_per_space);

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
/// * `system_y_position` - Vertical position of the system
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
    system_y_position: f32,
) -> Vec<BarLine> {
    let mut bar_lines = Vec::new();
    
    // Calculate staff vertical offset relative to system
    let staff_vertical_offset = system_y_position + (staff_index as f32 * 20.0 * units_per_space);
    
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
    
    // Calculate total width of measures in this system
    let total_measure_width: f32 = measures_in_system.iter().map(|m| m.width).sum();
    let available_width = system_width - left_margin;
    
    // Scale factor to fit measures into available width
    let scale = if total_measure_width > 0.0 {
        available_width / total_measure_width
    } else {
        1.0
    };
    
    // Add bar lines at the end of each measure using cumulative widths
    let mut cumulative_x = left_margin;
    for measure in measures_in_system.iter() {
        // Add this measure's width (scaled to fit available space)
        let scaled_width = measure.width * scale;
        cumulative_x += scaled_width;
        
        // Skip barline if measure extends beyond system
        if measure.end_tick > tick_range.end_tick {
            continue;
        }
        
        // Determine bar line type
        let bar_type = if measure.end_tick == tick_range.end_tick {
            // Check if this is the very last measure in the entire score
            let is_last_measure = measure_infos.last().map(|m| m.end_tick) == Some(measure.end_tick);
            if is_last_measure {
                BarLineType::Final
            } else {
                BarLineType::Single
            }
        } else {
            BarLineType::Single
        };
        
        // Create bar line segments with explicit geometry (Principle VI: Layout Engine Authority)
        let segments = create_bar_line_segments(cumulative_x, y_start, y_end, &bar_type);
        
        bar_lines.push(BarLine {
            segments,
            bar_type,
        });
    }
    
    bar_lines
}

/// Creates bar line segments with explicit geometry for each line
/// This ensures the renderer doesn't calculate positions (Principle VI compliance)
fn create_bar_line_segments(
    x_position: f32,
    y_start: f32,
    y_end: f32,
    bar_type: &BarLineType,
) -> Vec<BarLineSegment> {
    const THIN_WIDTH: f32 = 1.5;
    const THICK_WIDTH: f32 = 4.0;
    const DOUBLE_SPACING: f32 = 4.0;  // Space between double bar lines
    const FINAL_SPACING: f32 = 4.0;   // Space between thin and thick in final bar
    
    match bar_type {
        BarLineType::Single => {
            vec![BarLineSegment {
                x_position,
                y_start,
                y_end,
                stroke_width: THIN_WIDTH,
            }]
        }
        BarLineType::Double => {
            vec![
                BarLineSegment {
                    x_position: x_position - DOUBLE_SPACING / 2.0,
                    y_start,
                    y_end,
                    stroke_width: THIN_WIDTH,
                },
                BarLineSegment {
                    x_position: x_position + DOUBLE_SPACING / 2.0,
                    y_start,
                    y_end,
                    stroke_width: THIN_WIDTH,
                },
            ]
        }
        BarLineType::Final => {
            vec![
                BarLineSegment {
                    x_position: x_position - FINAL_SPACING - THICK_WIDTH / 2.0,
                    y_start,
                    y_end,
                    stroke_width: THIN_WIDTH,
                },
                BarLineSegment {
                    x_position: x_position + THICK_WIDTH / 2.0,
                    y_start,
                    y_end,
                    stroke_width: THICK_WIDTH,
                },
            ]
        }
    }
}

/// Creates bracket/brace glyph with calculated geometry for multi-staff groups
fn create_bracket_glyph(
    staves: &[Staff],
    bracket_type: &BracketType,
    config: &LayoutConfig,
) -> BracketGlyph {
    let first_staff = &staves[0];
    let last_staff = &staves[staves.len() - 1];
    
    // Calculate gap center between first staff bottom and last staff top
    let first_staff_bottom = first_staff.staff_lines[4].y_position;
    let last_staff_top = last_staff.staff_lines[0].y_position;
    let gap_center = (first_staff_bottom + last_staff_top) / 2.0;
    
    // Brace parameters (fine-tuned for visual centering)
    let extension = 280.0; // Distance from gap center to top/bottom of brace
    let centerY = gap_center + 54.0; // Offset to account for SMuFL glyph baseline
    let height = extension * 2.0;
    const BRACE_NATURAL_HEIGHT: f32 = 320.0; // SMuFL brace U+E000 at fontSize 80
    let scale_y = height / BRACE_NATURAL_HEIGHT;
    
    let codepoint = match bracket_type {
        BracketType::Brace => "\u{E000}".to_string(),
        BracketType::Bracket => "\u{E002}".to_string(),
        BracketType::None => String::new(),
    };
    
    let x_position = 15.0; // Left margin
    let top_y = gap_center - extension;
    let bottom_y = gap_center + extension;
    
    BracketGlyph {
        codepoint,
        x: x_position,
        y: centerY,
        scale_y,
        bounding_box: BoundingBox {
            x: x_position - 5.0,
            y: top_y,
            width: 20.0,
            height,
        },
    }
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

        let lines = create_staff_lines(staff_index, system_width, units_per_space, 0.0);

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

        // First staff (staff_index = 0) in system at y=0
        let staff_0 = create_staff_lines(0, system_width, units_per_space, 0.0);
        assert_eq!(staff_0[0].y_position, 0.0);
        assert_eq!(staff_0[4].y_position, 160.0);

        // Second staff (staff_index = 1) - should be offset by 20 staff spaces (400 units)
        let staff_1 = create_staff_lines(1, system_width, units_per_space, 0.0);
        let expected_offset = 20.0 * units_per_space; // 400 units
        assert_eq!(staff_1[0].y_position, expected_offset);
        assert_eq!(staff_1[4].y_position, expected_offset + 160.0);
    }

    /// T011: Unit test for different units_per_space values
    #[test]
    fn test_create_staff_lines_scale_independence() {
        let system_width = 1200.0;
        let staff_index = 0;

        // Test with different scale (units_per_space = 10)
        let lines_scale_10 = create_staff_lines(staff_index, system_width, 10.0, 0.0);
        assert_eq!(lines_scale_10[0].y_position, 0.0);
        assert_eq!(lines_scale_10[1].y_position, 20.0);  // 2 * 10
        assert_eq!(lines_scale_10[4].y_position, 80.0);  // 4 * 2 * 10

        // Test with different scale (units_per_space = 25)
        let lines_scale_25 = create_staff_lines(staff_index, system_width, 25.0, 0.0);
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

    /// T063: Integration test for piano layout verifying 2 staves with correct vertical spacing
    #[test]
    fn test_piano_multi_staff_layout() {
        let score = serde_json::json!({
            "instruments": [{
                "id": "piano",
                "staves": [
                    {
                        "clef": "Treble",
                        "time_signature": { "numerator": 4, "denominator": 4 },
                        "key_signature": { "sharps": 0 },
                        "voices": [{
                            "notes": [
                                { "pitch": 72, "tick": 0, "duration": 960 }
                            ]
                        }]
                    },
                    {
                        "clef": "Bass",
                        "time_signature": { "numerator": 4, "denominator": 4 },
                        "key_signature": { "sharps": 0 },
                        "voices": [{
                            "notes": [
                                { "pitch": 48, "tick": 0, "duration": 960 }
                            ]
                        }]
                    }
                ]
            }]
        });

        let config = LayoutConfig::default();
        let layout = compute_layout(&score, &config);

        // Verify system exists
        assert!(!layout.systems.is_empty(), "Should have at least one system");
        let system = &layout.systems[0];

        // Verify staff group exists
        assert!(!system.staff_groups.is_empty(), "Should have at least one staff group");
        let staff_group = &system.staff_groups[0];

        // Verify 2 staves exist (treble + bass)
        assert_eq!(staff_group.staves.len(), 2, "Piano should have 2 staves");

        // Verify vertical spacing between staves
        let treble_staff = &staff_group.staves[0];
        let bass_staff = &staff_group.staves[1];
        
        let treble_top = treble_staff.staff_lines[0].y_position;
        let bass_top = bass_staff.staff_lines[0].y_position;
        
        // Vertical spacing should be 20 staff spaces (400 units at default units_per_space=20)
        let expected_spacing = 20.0 * config.units_per_space; // 400 units
        assert_eq!(bass_top - treble_top, expected_spacing, 
            "Staff vertical spacing should be 20 staff spaces (400 units)");

        // Verify bracket type is Brace for piano
        assert_eq!(staff_group.bracket_type, BracketType::Brace,
            "Piano should have Brace bracket type");

        // Verify bracket glyph exists
        assert!(staff_group.bracket_glyph.is_some(),
            "Piano staff group should have bracket glyph");
    }

    /// T064: Unit test for brace/bracket positioning and vertical scaling
    #[test]
    fn test_create_bracket_glyph_brace() {
        let config = LayoutConfig::default();
        
        // Create two dummy staves at different vertical positions
        let staff_0_lines = create_staff_lines(0, 1200.0, config.units_per_space, 0.0);
        let staff_1_lines = create_staff_lines(1, 1200.0, config.units_per_space, 0.0);
        
        let staff_0 = Staff {
            staff_lines: staff_0_lines,
            glyph_runs: vec![],
            structural_glyphs: vec![],
            bar_lines: vec![],
        };
        
        let staff_1 = Staff {
            staff_lines: staff_1_lines,
            glyph_runs: vec![],
            structural_glyphs: vec![],
            bar_lines: vec![],
        };
        
        let staves = vec![staff_0, staff_1];
        let bracket_type = BracketType::Brace;
        
        let bracket_glyph = create_bracket_glyph(&staves, &bracket_type, &config);
        
        // Verify brace codepoint
        assert_eq!(bracket_glyph.codepoint, "\u{E000}", 
            "Brace should use SMuFL codepoint U+E000");
        
        // Verify x position (left margin)
        assert_eq!(bracket_glyph.x, 15.0, "Brace should be at x=15");
        
        // Verify vertical scaling is applied
        assert!(bracket_glyph.scale_y > 0.0, "Brace should have positive vertical scale");
        
        // Verify bounding box spans both staves
        let first_staff_top = staves[0].staff_lines[0].y_position;
        let last_staff_bottom = staves[1].staff_lines[4].y_position;
        
        // Brace should extend to cover both staves
        assert!(bracket_glyph.bounding_box.y <= first_staff_top,
            "Brace bounding box should start at or above first staff");
        assert!(bracket_glyph.bounding_box.y + bracket_glyph.bounding_box.height >= last_staff_bottom,
            "Brace bounding box should extend to or below last staff");
    }

    /// T064: Unit test for square bracket positioning (ensemble scores)
    #[test]
    fn test_create_bracket_glyph_bracket() {
        let config = LayoutConfig::default();
        
        let staff_0_lines = create_staff_lines(0, 1200.0, config.units_per_space, 0.0);
        let staff_1_lines = create_staff_lines(1, 1200.0, config.units_per_space, 0.0);
        
        let staff_0 = Staff {
            staff_lines: staff_0_lines,
            glyph_runs: vec![],
            structural_glyphs: vec![],
            bar_lines: vec![],
        };
        
        let staff_1 = Staff {
            staff_lines: staff_1_lines,
            glyph_runs: vec![],
            structural_glyphs: vec![],
            bar_lines: vec![],
        };
        
        let staves = vec![staff_0, staff_1];
        let bracket_type = BracketType::Bracket;
        
        let bracket_glyph = create_bracket_glyph(&staves, &bracket_type, &config);
        
        // Verify bracket codepoint
        assert_eq!(bracket_glyph.codepoint, "\u{E002}", 
            "Bracket should use SMuFL codepoint U+E002");
    }

    /// T074: Test notes on both staves render correctly relative to their respective staff lines
    #[test]
    fn test_notes_on_multi_staff() {
        let score = serde_json::json!({
            "instruments": [{
                "id": "piano",
                "staves": [
                    {
                        "clef": "Treble",
                        "time_signature": { "numerator": 4, "denominator": 4 },
                        "key_signature": { "sharps": 0 },
                        "voices": [{
                            "notes": [
                                { "pitch": 72, "tick": 0, "duration": 960 }
                            ]
                        }]
                    },
                    {
                        "clef": "Bass",
                        "time_signature": { "numerator": 4, "denominator": 4 },
                        "key_signature": { "sharps": 0 },
                        "voices": [{
                            "notes": [
                                { "pitch": 48, "tick": 0, "duration": 960 }
                            ]
                        }]
                    }
                ]
            }]
        });

        let config = LayoutConfig::default();
        let layout = compute_layout(&score, &config);

        let system = &layout.systems[0];
        let staff_group = &system.staff_groups[0];
        
        // Both staves should have glyph runs (noteheads)
        assert!(!staff_group.staves[0].glyph_runs.is_empty(), 
            "Treble staff should have glyphs");
        assert!(!staff_group.staves[1].glyph_runs.is_empty(), 
            "Bass staff should have glyphs");

        // Verify treble staff note is positioned relative to treble staff lines
        let treble_line_0 = staff_group.staves[0].staff_lines[0].y_position;
        let treble_glyph = &staff_group.staves[0].glyph_runs[0].glyphs[0];
        assert!(treble_glyph.position.y >= treble_line_0 - 100.0, 
            "Treble note should be near treble staff");

        // Verify bass staff note is positioned relative to bass staff lines
        let bass_line_0 = staff_group.staves[1].staff_lines[0].y_position;
        let bass_glyph = &staff_group.staves[1].glyph_runs[0].glyphs[0];
        assert!(bass_glyph.position.y >= bass_line_0 - 100.0, 
            "Bass note should be near bass staff");
        
        // Verify bass staff is below treble staff
        assert!(bass_line_0 > treble_line_0, 
            "Bass staff should be below treble staff");
    }
}
