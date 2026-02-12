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
    BoundingBox, BracketType, Color, GlobalLayout, Glyph, GlyphRun, Point, SourceReference, Staff,
    StaffGroup, StaffLine, System, TickRange,
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
            units_per_space: 10.0,
            system_spacing: 150.0,
            system_height: 200.0,
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
                // Position glyphs for this staff within the system's tick range
                let glyphs = position_glyphs_for_staff(
                    staff_data,
                    &system.tick_range,
                    system.bounding_box.width,
                    config.units_per_space,
                    &instrument.id,
                    staff_index,
                );

                // Batch glyphs for efficient rendering
                let glyph_runs = batcher::batch_glyphs(glyphs);

                // Create staff lines (5 lines evenly spaced)
                let staff_lines = create_staff_lines(
                    staff_index,
                    system.bounding_box.width,
                    config.units_per_space,
                );

                // Create staff with batched glyphs
                let staff = Staff {
                    staff_lines,
                    glyph_runs,
                    structural_glyphs: vec![], // TODO: Add clefs, key sigs, time sigs
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
                            if let Some(notes) = voice["interval_events"].as_array() {
                                for note in notes {
                                    let _duration =
                                        note["duration_ticks"].as_u64().unwrap_or(960) as u32;
                                    let start_tick =
                                        note["start_tick"]["value"].as_u64().unwrap_or(0) as u32;

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

    if let Some(instruments_array) = score["instruments"].as_array() {
        for instrument in instruments_array {
            let id = instrument["id"].as_str().unwrap_or("unknown").to_string();
            let mut staves = Vec::new();

            if let Some(staves_array) = instrument["staves"].as_array() {
                for staff in staves_array {
                    let mut voices = Vec::new();

                    if let Some(voices_array) = staff["voices"].as_array() {
                        for voice in voices_array {
                            let mut notes = Vec::new();

                            if let Some(interval_events) = voice["interval_events"].as_array() {
                                for event in interval_events {
                                    let pitch =
                                        event["pitch"]["value"].as_u64().unwrap_or(60) as u8;
                                    let start_tick =
                                        event["start_tick"]["value"].as_u64().unwrap_or(0) as u32;
                                    let duration_ticks =
                                        event["duration_ticks"].as_u64().unwrap_or(960) as u32;

                                    notes.push(NoteEvent {
                                        pitch,
                                        start_tick,
                                        duration_ticks,
                                    });
                                }
                            }

                            voices.push(VoiceData { notes });
                        }
                    }

                    staves.push(StaffData { voices });
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
        let tick_span = (tick_range.end_tick - tick_range.start_tick) as f32;
        let horizontal_offsets: Vec<f32> = notes_in_range
            .iter()
            .map(|(_, start_tick, _)| {
                let relative_tick = (*start_tick - tick_range.start_tick) as f32;
                let position_ratio = relative_tick / tick_span;
                position_ratio * system_width
            })
            .collect();

        // Position noteheads using positioner module
        let glyphs = positioner::position_noteheads(
            &notes_in_range,
            &horizontal_offsets,
            units_per_space,
            instrument_id,
            staff_index,
            voice_index,
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
    // Staff spacing: 10 staff spaces (100 logical units at default scale)
    let staff_vertical_offset = staff_index as f32 * 10.0 * units_per_space;

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
