//! Horizontal spacing algorithm
//!
//! Implements duration-proportional spacing with minimum separation constraint.

/// Configuration for horizontal spacing algorithm
#[derive(Debug, Clone)]
pub struct SpacingConfig {
    /// Minimum space for any note in logical units (default: 20.0 = 2 staff spaces)
    pub base_spacing: f32,
    /// Multiplier for duration-based spacing (default: 40.0, quarter note = 4 staff spaces)
    pub duration_factor: f32,
    /// Collision prevention minimum in logical units (default: 20.0 = 2 staff spaces)
    pub minimum_spacing: f32,
}

impl Default for SpacingConfig {
    fn default() -> Self {
        Self {
            base_spacing: 20.0,
            duration_factor: 40.0,
            minimum_spacing: 20.0,
        }
    }
}

/// Compute horizontal spacing for a note based on duration
///
/// Uses formula: `spacing_width = max(base + duration/960 * factor, minimum) + flag_spacing`
///
/// Flag spacing is added for eighth and sixteenth notes to prevent flag overlap:
/// - Eighth notes (480-959 ticks): +15 units for single flag clearance
/// - Sixteenth notes (<480 ticks): +20 units for double flag clearance
///
/// # Arguments
/// * `duration_ticks` - Note duration in ticks (960 = quarter note at 960 PPQ)
/// * `config` - Spacing configuration parameters
///
/// # Returns
/// Horizontal spacing width in logical units
pub fn compute_note_spacing(duration_ticks: u32, config: &SpacingConfig) -> f32 {
    let duration_based =
        config.base_spacing + (duration_ticks as f32 / 960.0) * config.duration_factor;
    let base_spacing = duration_based.max(config.minimum_spacing);
    
    // Add extra spacing for notes with flags to prevent flag overlap
    let flag_spacing = if duration_ticks < 480 {
        // Sixteenth notes and shorter: double flag needs more clearance
        20.0
    } else if duration_ticks < 960 {
        // Eighth notes: single flag needs clearance
        15.0
    } else {
        // Quarter notes and longer: no flags
        0.0
    };
    
    base_spacing + flag_spacing
}

/// Compute total width of a measure
///
/// Sums spacing for all note events in the measure plus padding for clefs/accidentals
///
/// # Arguments
/// * `note_durations` - Array of note durations in ticks for all events in measure
/// * `config` - Spacing configuration parameters
///
/// # Returns
/// Total measure width in logical units
pub fn compute_measure_width(note_durations: &[u32], config: &SpacingConfig) -> f32 {
    if note_durations.is_empty() {
        // Empty measure: return default minimum width
        return 200.0;
    }

    // Sum spacing for all notes
    let total_note_spacing: f32 = note_durations
        .iter()
        .map(|&duration| compute_note_spacing(duration, config))
        .sum();

    // Add padding for clef/key/time signatures at measure start (40 logical units)
    // and end barline (10 logical units)
    let padding = 50.0;

    total_note_spacing + padding
}
