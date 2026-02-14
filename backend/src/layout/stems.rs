//! Stem Module
//!
//! Handles stem direction calculation and stem geometry generation for noteheads.
//! Stems extend 35 logical units (3.5 staff spaces) from the notehead.
//!
//! Direction rules:
//! - Notes on or above middle line (B4 for treble): stem down
//! - Notes below middle line: stem up
//! - Stems up attach to right side of notehead
//! - Stems down attach to left side of notehead

use serde::{Deserialize, Serialize};

/// Stem direction relative to notehead
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StemDirection {
    Up,
    Down,
}

/// Stem geometry representation
///
/// Encoded as special glyph with codepoint U+0000 for rendering pipeline.
/// The stem is a vertical line from notehead to stem end.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stem {
    /// X position (center of stem line)
    pub x: f32,
    /// Y position of stem start (at notehead)
    pub y_start: f32,
    /// Y position of stem end (35 units away)
    pub y_end: f32,
    /// Stem direction (Up or Down)
    pub direction: StemDirection,
    /// Line thickness in logical units
    pub thickness: f32,
}

impl Stem {
    /// Standard stem length in logical units (3.5 staff spaces)
    pub const STEM_LENGTH: f32 = 35.0;

    /// Standard stem thickness in logical units
    pub const STEM_THICKNESS: f32 = 1.5;
}

/// Compute stem direction based on notehead pitch position
///
/// # Arguments
/// * `notehead_y` - Vertical position of notehead in logical units
/// * `staff_middle_y` - Vertical position of staff middle line (B4 for treble, D3 for bass)
///
/// # Returns
/// StemDirection::Up if note below middle, StemDirection::Down if on or above middle
///
/// # Rules (SMuFL standard)
/// - Middle line or above → stem down (to left side of notehead)
/// - Below middle line → stem up (to right side of notehead)
pub fn compute_stem_direction(notehead_y: f32, staff_middle_y: f32) -> StemDirection {
    if notehead_y >= staff_middle_y {
        StemDirection::Down
    } else {
        StemDirection::Up
    }
}

/// Create stem geometry for a notehead
///
/// # Arguments
/// * `notehead_x` - Horizontal position of notehead center
/// * `notehead_y` - Vertical position of notehead center
/// * `direction` - Stem direction (computed from pitch)
/// * `notehead_width` - Width of notehead glyph (for attachment point calculation)
///
/// # Returns
/// Stem struct with calculated geometry
///
/// # Attachment Logic
/// - Stems up: attach to right edge of notehead (x + width/2)
/// - Stems down: attach to left edge of notehead (x - width/2)
/// - Stem extends 35 logical units (3.5 staff spaces) from notehead
pub fn create_stem(
    notehead_x: f32,
    notehead_y: f32,
    direction: StemDirection,
    notehead_width: f32,
) -> Stem {
    // Calculate stem x position based on direction
    let stem_x = match direction {
        StemDirection::Up => notehead_x + (notehead_width / 2.0),
        StemDirection::Down => notehead_x - (notehead_width / 2.0),
    };

    // Calculate stem y positions (stems go up = negative y, down = positive y)
    let (y_start, y_end) = match direction {
        StemDirection::Up => (notehead_y, notehead_y - Stem::STEM_LENGTH),
        StemDirection::Down => (notehead_y, notehead_y + Stem::STEM_LENGTH),
    };

    Stem {
        x: stem_x,
        y_start,
        y_end,
        direction,
        thickness: Stem::STEM_THICKNESS,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// T041: Unit test for compute_stem_direction() based on pitch relative to middle line
    #[test]
    fn test_compute_stem_direction_below_middle() {
        let staff_middle_y = 80.0; // Middle line of staff (assuming 0=top, 160=bottom)

        // Note below middle line (e.g., A4) should have stem up
        let notehead_y = 60.0;
        assert_eq!(
            compute_stem_direction(notehead_y, staff_middle_y),
            StemDirection::Up,
            "Notes below middle line should have stem up"
        );
    }

    #[test]
    fn test_compute_stem_direction_on_middle() {
        let staff_middle_y = 80.0;

        // Note on middle line (e.g., B4 for treble) should have stem down
        let notehead_y = 80.0;
        assert_eq!(
            compute_stem_direction(notehead_y, staff_middle_y),
            StemDirection::Down,
            "Notes on middle line should have stem down"
        );
    }

    #[test]
    fn test_compute_stem_direction_above_middle() {
        let staff_middle_y = 80.0;

        // Note above middle line (e.g., C5) should have stem down
        let notehead_y = 90.0;
        assert_eq!(
            compute_stem_direction(notehead_y, staff_middle_y),
            StemDirection::Down,
            "Notes above middle line should have stem down"
        );
    }

    /// T042: Unit test for create_stem() verifying 35 logical unit length and attachment point
    #[test]
    fn test_create_stem_up() {
        let notehead_x = 100.0;
        let notehead_y = 60.0;
        let notehead_width = 10.0;
        let direction = StemDirection::Up;

        let stem = create_stem(notehead_x, notehead_y, direction, notehead_width);

        // Verify stem attaches to right side of notehead
        assert_eq!(
            stem.x, 105.0,
            "Stem up should attach to right edge (x + width/2)"
        );

        // Verify stem extends 35 units upward (negative y direction)
        assert_eq!(stem.y_start, 60.0, "Stem should start at notehead y");
        assert_eq!(stem.y_end, 25.0, "Stem should extend 35 units up (60 - 35)");

        assert_eq!(stem.direction, StemDirection::Up);
        assert_eq!(stem.thickness, Stem::STEM_THICKNESS);
    }

    #[test]
    fn test_create_stem_down() {
        let notehead_x = 100.0;
        let notehead_y = 100.0;
        let notehead_width = 10.0;
        let direction = StemDirection::Down;

        let stem = create_stem(notehead_x, notehead_y, direction, notehead_width);

        // Verify stem attaches to left side of notehead
        assert_eq!(
            stem.x, 95.0,
            "Stem down should attach to left edge (x - width/2)"
        );

        // Verify stem extends 35 units downward (positive y direction)
        assert_eq!(stem.y_start, 100.0, "Stem should start at notehead y");
        assert_eq!(
            stem.y_end, 135.0,
            "Stem should extend 35 units down (100 + 35)"
        );

        assert_eq!(stem.direction, StemDirection::Down);
        assert_eq!(stem.thickness, Stem::STEM_THICKNESS);
    }

    #[test]
    fn test_stem_length_constant() {
        assert_eq!(
            Stem::STEM_LENGTH,
            35.0,
            "Stem length should be 35 logical units (3.5 staff spaces)"
        );
    }
}
