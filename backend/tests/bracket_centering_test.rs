/// Feature 027: Demo Flow UX
/// T032 [BUG]: Bracket glyph y must use top_y (top anchor), not center_y
///
/// Root cause: create_bracket_glyph sets y = (top_y + bottom_y) / 2.0 which
/// is the typographic midpoint, not the SMuFL brace U+E000 visual top. This
/// makes the brace appear shifted down on screen.
///
/// Fix: y = top_y (T034 sets BracketGlyph.y = first_staff.staff_lines[0].y_position)
///
/// This test FAILS before T034, PASSES after T034.
///
/// @see specs/027-demo-flow-ux/tasks.md T032, T034
use musicore_backend::layout::{LayoutConfig, compute_layout};

fn piano_score() -> serde_json::Value {
    serde_json::json!({
        "instruments": [{
            "id": "piano-1",
            "name": "Piano",
            "staves": [
                {
                    "clef": "Treble",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 3840, "pitch": 60}
                        ]
                    }]
                },
                {
                    "clef": "Bass",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 3840, "pitch": 40}
                        ]
                    }]
                }
            ]
        }]
    })
}

/// T032 [BUG]: bracket_glyph.y must equal the top staff line y_position
///
/// The SMuFL brace glyph U+E000 is rendered with dominant-baseline="hanging"
/// so its visual top is anchored at the y coordinate. Therefore y must be
/// top_y (first staff, first line) — NOT center_y.
///
/// FAILS before T034 (y = center_y), PASSES after T034 (y = top_y).
#[test]
fn test_bracket_glyph_y_equals_top_staff_line() {
    let score = piano_score();
    let config = LayoutConfig::default();
    let layout = compute_layout(&score, &config);

    assert!(
        !layout.systems.is_empty(),
        "Should have at least one system"
    );

    for (sys_idx, system) in layout.systems.iter().enumerate() {
        let piano_group = &system.staff_groups[0];
        assert_eq!(piano_group.staves.len(), 2, "Piano should have 2 staves");

        let bracket_glyph = piano_group
            .bracket_glyph
            .as_ref()
            .unwrap_or_else(|| panic!("System {}: Piano should have bracket_glyph", sys_idx));

        let top_y = piano_group.staves[0].staff_lines[0].y_position;

        assert_eq!(
            bracket_glyph.y, top_y,
            "System {sys_idx}: bracket_glyph.y ({}) must equal top staff line y_position ({top_y}). \
             BUG: current code uses center_y = (top_y + bottom_y) / 2.0 instead.",
            bracket_glyph.y
        );
    }
}

/// T032b: bracket_glyph.bounding_box.y is always top_y (independent of T034)
///
/// The bounding_box already uses top_y correctly — this regression test
/// ensures we don't accidentally break it when fixing bracket_glyph.y.
#[test]
fn test_bracket_glyph_bounding_box_y_equals_top_y() {
    let score = piano_score();
    let config = LayoutConfig::default();
    let layout = compute_layout(&score, &config);

    for (sys_idx, system) in layout.systems.iter().enumerate() {
        let piano_group = &system.staff_groups[0];

        let bracket_glyph = piano_group
            .bracket_glyph
            .as_ref()
            .unwrap_or_else(|| panic!("System {sys_idx}: Piano should have bracket_glyph"));

        let top_y = piano_group.staves[0].staff_lines[0].y_position;

        assert_eq!(
            bracket_glyph.bounding_box.y, top_y,
            "System {sys_idx}: bracket_glyph.bounding_box.y ({}) must equal top_y ({top_y})",
            bracket_glyph.bounding_box.y
        );
    }
}
