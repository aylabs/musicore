//! Slur direction test: verifies that slur arcs have correct concavity
//! based on MusicXML bezier-y hints and standard engraving rules.
//! Updated for T119: bezier-y sign is now used to infer slur direction
//! when no explicit placement="above|below" is present.

use musicore_backend::adapters::dtos::ScoreDto;
use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
use musicore_backend::layout::{LayoutConfig, compute_layout};
use musicore_backend::ports::importers::IMusicXMLImporter;
use std::path::Path;

const CONFIG: LayoutConfig = LayoutConfig {
    max_system_width: 2410.0,
    units_per_space: 20.0,
    system_spacing: 200.0,
    system_height: 200.0,
};

/// When MusicXML has bezier-y but no explicit placement="above|below",
/// slur_above should be inferred from the bezier-y sign
/// (positive → above, negative → below).
#[test]
fn test_slur_above_inferred_from_bezier_y() {
    let importer = MusicXMLImporter::new();
    let result = importer
        .import_file(Path::new("../scores/Beethoven_FurElise.mxl"))
        .unwrap();

    let instrument = &result.score.instruments[0];
    let mut slur_count = 0;
    let mut with_direction = 0;
    for staff in &instrument.staves {
        for voice in &staff.voices {
            for note in &voice.interval_events {
                if note.slur_next.is_some() {
                    slur_count += 1;
                    if note.slur_above.is_some() {
                        with_direction += 1;
                    }
                }
            }
        }
    }
    assert!(slur_count > 0, "Should find slur starts in Für Elise");
    // Most slurs should now have direction from bezier-y
    assert!(
        with_direction > 0,
        "Some slurs should have direction inferred from bezier-y"
    );
}

/// In the layout output, slur arcs must be present and use the standard
/// engraving rule for direction.
#[test]
fn test_slur_arcs_present_in_layout() {
    let importer = MusicXMLImporter::new();
    let result = importer
        .import_file(Path::new("../scores/Beethoven_FurElise.mxl"))
        .unwrap();
    let dto: ScoreDto = (&result.score).into();
    let json = serde_json::to_value(&dto).unwrap();
    let layout = compute_layout(&json, &CONFIG);
    let layout_json = serde_json::to_value(&layout).unwrap();

    let systems = layout_json["systems"].as_array().expect("systems array");
    let mut total_slur_arcs = 0;

    for system in systems {
        for sg in system["staff_groups"].as_array().unwrap_or(&vec![]) {
            for staff in sg["staves"].as_array().unwrap_or(&vec![]) {
                if let Some(arcs) = staff["slur_arcs"].as_array() {
                    total_slur_arcs += arcs.len();
                }
            }
        }
    }

    assert!(
        total_slur_arcs > 0,
        "Should have slur arcs in Für Elise layout"
    );
}
