//! Beam Module
//!
//! Handles beam grouping and geometry generation for connecting eighth notes and shorter durations.
//! Beams are horizontal or slightly sloped rectangular regions connecting stem endpoints.
//!
//! Grouping rules:
//! - Eighth notes (480 ticks) beamed within same beat (960 tick intervals)
//! - Beams have 0.5 staff space thickness (10 logical units)
//! - Beam slope clamped to ±0.5 staff spaces per note

use serde::{Deserialize, Serialize};
use super::stems::StemDirection;

/// Beam geometry representation
///
/// Encoded as special glyph with codepoint U+0001 for rendering pipeline.
/// The beam is a filled rectangle connecting stem endpoints.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Beam {
    /// X position of left edge
    pub x_start: f32,
    /// Y position of left edge (at first stem endpoint)
    pub y_start: f32,
    /// X position of right edge
    pub x_end: f32,
    /// Y position of right edge (at last stem endpoint)
    pub y_end: f32,
    /// Beam thickness in logical units
    pub thickness: f32,
}

impl Beam {
    /// Standard beam thickness (0.5 staff spaces = 10 logical units)
    pub const BEAM_THICKNESS: f32 = 10.0;
    
    /// Maximum beam slope in staff spaces per note
    pub const MAX_SLOPE: f32 = 0.5;
}

/// Note group eligible for beaming
#[derive(Debug, Clone)]
pub struct BeamableNote {
    pub x: f32,
    pub y: f32,
    pub stem_end_y: f32,
    pub tick: u32,
    pub duration_ticks: u32,
}

/// Group notes that should be beamed together
///
/// # Arguments
/// * `notes` - Vector of notes with positions and timing
/// * `ticks_per_beat` - Ticks per beat (typically 960 for quarter note)
///
/// # Returns
/// Vector of note groups, where each group should be connected with a beam
///
/// # Rules
/// - Only eighth notes (480 ticks) or shorter are beamed
/// - Notes must be in the same beat (within 960 tick interval)
/// - Groups require at least 2 notes
pub fn group_beamable_notes(
    notes: &[BeamableNote],
    ticks_per_beat: u32,
) -> Vec<Vec<BeamableNote>> {
    let mut groups: Vec<Vec<BeamableNote>> = Vec::new();
    let mut current_group: Vec<BeamableNote> = Vec::new();
    let mut current_beat: Option<u32> = None;
    
    for note in notes {
        // Only beam eighth notes (480 ticks) or shorter
        if note.duration_ticks > 480 {
            // Finish current group if exists
            if current_group.len() >= 2 {
                groups.push(current_group.clone());
            }
            current_group.clear();
            current_beat = None;
            continue;
        }
        
        // Calculate which beat this note belongs to
        let beat = note.tick / ticks_per_beat;
        
        // Check if same beat as current group
        match current_beat {
            None => {
                // Start new group
                current_group.push(note.clone());
                current_beat = Some(beat);
            }
            Some(current) if current == beat => {
                // Add to current group
                current_group.push(note.clone());
            }
            Some(_) => {
                // Different beat - finish current group and start new
                if current_group.len() >= 2 {
                    groups.push(current_group.clone());
                }
                current_group.clear();
                current_group.push(note.clone());
                current_beat = Some(beat);
            }
        }
    }
    
    // Add final group if valid
    if current_group.len() >= 2 {
        groups.push(current_group);
    }
    
    groups
}

/// Compute beam slope with clamping
///
/// # Arguments
/// * `notes` - Notes in the beamed group (sorted by x position)
/// * `units_per_space` - Logical units per staff space (typically 20)
///
/// # Returns
/// Clamped slope in logical units per horizontal unit
///
/// # Rules
/// - Calculate average pitch difference between first and last note
/// - Clamp to ±0.5 staff spaces (±10 logical units) per note
/// - Distribute slope evenly across horizontal span
pub fn compute_beam_slope(notes: &[BeamableNote], units_per_space: f32) -> f32 {
    if notes.len() < 2 {
        return 0.0;
    }
    
    let first = &notes[0];
    let last = &notes[notes.len() - 1];
    
    // Calculate natural slope from stem endpoints
    let dy = last.stem_end_y - first.stem_end_y;
    let dx = last.x - first.x;
    
    if dx == 0.0 {
        return 0.0;
    }
    
    let natural_slope = dy / dx;
    
    // Clamp slope to ±0.5 staff spaces per note
    let max_slope_units = Beam::MAX_SLOPE * units_per_space; // 0.5 * 20 = 10 units
    let max_slope_per_unit = max_slope_units / dx;
    
    natural_slope.clamp(-max_slope_per_unit, max_slope_per_unit)
}

/// Create beam connecting a group of notes
///
/// # Arguments
/// * `notes` - Notes in the beamed group (must be sorted by x position)
/// * `slope` - Computed slope from compute_beam_slope()
///
/// # Returns
/// Beam struct with calculated geometry
pub fn create_beam(notes: &[BeamableNote], slope: f32) -> Option<Beam> {
    if notes.len() < 2 {
        return None;
    }
    
    let first = &notes[0];
    let last = &notes[notes.len() - 1];
    
    let x_start = first.x;
    let y_start = first.stem_end_y;
    let x_end = last.x;
    let y_end = first.stem_end_y + (slope * (x_end - x_start));
    
    Some(Beam {
        x_start,
        y_start,
        x_end,
        y_end,
        thickness: Beam::BEAM_THICKNESS,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// T043: Unit test for group_beamable_notes() grouping by beat
    #[test]
    fn test_group_beamable_notes_same_beat() {
        let notes = vec![
            BeamableNote {
                x: 100.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 0,
                duration_ticks: 480, // Eighth note
            },
            BeamableNote {
                x: 140.0,
                y: 70.0,
                stem_end_y: 35.0,
                tick: 480,
                duration_ticks: 480,
            },
            BeamableNote {
                x: 180.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 960,
                duration_ticks: 480,
            },
            BeamableNote {
                x: 220.0,
                y: 80.0,
                stem_end_y: 45.0,
                tick: 1440,
                duration_ticks: 480,
            },
        ];
        
        let groups = group_beamable_notes(&notes, 960);
        
        // Should create 2 groups: [0,480] in beat 0, [960,1440] split across beats
        assert_eq!(groups.len(), 2, "Should create 2 beamed groups");
        assert_eq!(groups[0].len(), 2, "First group should have 2 notes");
        assert_eq!(groups[1].len(), 2, "Second group should have 2 notes");
    }

    #[test]
    fn test_group_beamable_notes_quarter_notes_excluded() {
        let notes = vec![
            BeamableNote {
                x: 100.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 0,
                duration_ticks: 960, // Quarter note - should not beam
            },
            BeamableNote {
                x: 140.0,
                y: 70.0,
                stem_end_y: 35.0,
                tick: 960,
                duration_ticks: 960,
            },
        ];
        
        let groups = group_beamable_notes(&notes, 960);
        
        assert_eq!(groups.len(), 0, "Quarter notes should not be beamed");
    }

    #[test]
    fn test_group_beamable_notes_single_eighth() {
        let notes = vec![
            BeamableNote {
                x: 100.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 0,
                duration_ticks: 480,
            },
        ];
        
        let groups = group_beamable_notes(&notes, 960);
        
        assert_eq!(groups.len(), 0, "Single eighth note should not be beamed");
    }

    /// T044: Unit test for compute_beam_slope() clamping to ±0.5 staff spaces per note
    #[test]
    fn test_compute_beam_slope_flat() {
        let notes = vec![
            BeamableNote {
                x: 100.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 0,
                duration_ticks: 480,
            },
            BeamableNote {
                x: 140.0,
                y: 70.0,
                stem_end_y: 25.0, // Same stem height
                tick: 480,
                duration_ticks: 480,
            },
        ];
        
        let slope = compute_beam_slope(&notes, 20.0);
        
        assert_eq!(slope, 0.0, "Flat beam should have zero slope");
    }

    #[test]
    fn test_compute_beam_slope_ascending() {
        let notes = vec![
            BeamableNote {
                x: 100.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 0,
                duration_ticks: 480,
            },
            BeamableNote {
                x: 140.0,
                y: 70.0,
                stem_end_y: 35.0, // 10 units higher
                tick: 480,
                duration_ticks: 480,
            },
        ];
        
        let slope = compute_beam_slope(&notes, 20.0);
        
        // Natural slope: (35 - 25) / (140 - 100) = 10 / 40 = 0.25
        // Max slope: 10 / 40 = 0.25 (within limit)
        assert_eq!(slope, 0.25, "Ascending beam within limit");
    }

    #[test]
    fn test_compute_beam_slope_clamping() {
        let notes = vec![
            BeamableNote {
                x: 100.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 0,
                duration_ticks: 480,
            },
            BeamableNote {
                x: 120.0, // Short distance
                y: 90.0,
                stem_end_y: 85.0, // Very steep: 60 units over 20 pixels
                tick: 480,
                duration_ticks: 480,
            },
        ];
        
        let slope = compute_beam_slope(&notes, 20.0);
        
        // Natural slope: (85 - 25) / (120 - 100) = 60 / 20 = 3.0
        // Max slope: 10 / 20 = 0.5
        // Should be clamped to 0.5
        assert_eq!(slope, 0.5, "Steep beam should be clamped to max slope");
    }

    #[test]
    fn test_create_beam() {
        let notes = vec![
            BeamableNote {
                x: 100.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 0,
                duration_ticks: 480,
            },
            BeamableNote {
                x: 140.0,
                y: 70.0,
                stem_end_y: 35.0,
                tick: 480,
                duration_ticks: 480,
            },
        ];
        
        let slope = 0.25; // From compute_beam_slope
        let beam = create_beam(&notes, slope).expect("Should create beam");
        
        assert_eq!(beam.x_start, 100.0, "Beam should start at first note x");
        assert_eq!(beam.y_start, 25.0, "Beam should start at first stem end");
        assert_eq!(beam.x_end, 140.0, "Beam should end at last note x");
        assert_eq!(beam.y_end, 35.0, "Beam end should follow slope: 25 + 0.25 * 40 = 35");
        assert_eq!(beam.thickness, Beam::BEAM_THICKNESS);
    }

    #[test]
    fn test_create_beam_single_note() {
        let notes = vec![
            BeamableNote {
                x: 100.0,
                y: 60.0,
                stem_end_y: 25.0,
                tick: 0,
                duration_ticks: 480,
            },
        ];
        
        let beam = create_beam(&notes, 0.0);
        
        assert!(beam.is_none(), "Cannot create beam with single note");
    }
}
