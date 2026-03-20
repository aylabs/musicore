//! Regression tests for augmentation dot rendering in Für Elise.
//!
//! T112: In M63 the upper augmentation dot on a 4-note chord was hidden
//! because two notes (Bb4 on a line and C#5 in the space above) had their
//! dots placed at the same staff space.  The fix de-collides chord dots so
//! every note in a chord has its dot in a unique space.

use musicore_backend::adapters::dtos::ScoreDto;
use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
use musicore_backend::layout::{LayoutConfig, compute_layout};
use musicore_backend::ports::importers::IMusicXMLImporter;
use std::collections::HashSet;
use std::path::Path;

const CONFIG: LayoutConfig = LayoutConfig {
    max_system_width: 2410.0,
    units_per_space: 20.0,
    system_spacing: 200.0,
    system_height: 200.0,
};

/// No two augmentation dots in any system/staff should share the exact same
/// (x, y) coordinates — that would make one dot invisible behind the other.
#[test]
fn test_no_duplicate_dot_positions() {
    let importer = MusicXMLImporter::new();
    let result = importer
        .import_file(Path::new("../scores/Beethoven_FurElise.mxl"))
        .unwrap();
    let dto: ScoreDto = (&result.score).into();
    let json = serde_json::to_value(&dto).unwrap();
    let layout = compute_layout(&json, &CONFIG);
    let layout_json = serde_json::to_value(&layout).unwrap();

    let systems = layout_json["systems"].as_array().expect("systems array");

    for (si, system) in systems.iter().enumerate() {
        for sg in system["staff_groups"].as_array().unwrap_or(&vec![]) {
            for (staff_idx, staff) in sg["staves"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .enumerate()
            {
                if let Some(dots) = staff["notation_dots"].as_array() {
                    let mut seen: HashSet<(i32, i32)> = HashSet::new();
                    for dot in dots {
                        let x = (dot["x"].as_f64().unwrap() * 10.0) as i32;
                        let y = (dot["y"].as_f64().unwrap() * 10.0) as i32;
                        assert!(
                            seen.insert((x, y)),
                            "Duplicate dot at ({}, {}) in System {} Staff {}",
                            dot["x"].as_f64().unwrap(),
                            dot["y"].as_f64().unwrap(),
                            si,
                            staff_idx
                        );
                    }
                }
            }
        }
    }
}

/// The 4-note dotted chord in M63 (E4, G4, Bb4, C#5) must produce exactly
/// 4 augmentation dots with distinct y-positions.
#[test]
fn test_m63_chord_produces_four_distinct_dots() {
    let importer = MusicXMLImporter::new();
    let result = importer
        .import_file(Path::new("../scores/Beethoven_FurElise.mxl"))
        .unwrap();
    let dto: ScoreDto = (&result.score).into();
    let json = serde_json::to_value(&dto).unwrap();
    let layout = compute_layout(&json, &CONFIG);
    let layout_json = serde_json::to_value(&layout).unwrap();

    // M63 is 3/8 time → 1440 ticks/measure, 1-based measure 63 → start tick ~89280.
    // Find the system whose tick_range contains M63 instead of hardcoding an index.
    let systems = layout_json["systems"].as_array().expect("systems");
    let m63_tick = 89280u64; // approximate start tick for M63
    let system = systems
        .iter()
        .find(|s| {
            let st = s["tick_range"]["start_tick"].as_u64().unwrap_or(0);
            let et = s["tick_range"]["end_tick"].as_u64().unwrap_or(0);
            m63_tick >= st && m63_tick < et
        })
        .expect("No system contains M63");
    let staff = &system["staff_groups"][0]["staves"][0];
    let all_dots = staff["notation_dots"].as_array().expect("notation_dots");

    // Group dots by their x position (rounded to 1 decimal) and find the cluster
    // with exactly 4 dots — that's the M63 4-note dotted chord.
    let mut x_groups: std::collections::HashMap<i32, Vec<&serde_json::Value>> =
        std::collections::HashMap::new();
    for d in all_dots {
        let xk = (d["x"].as_f64().unwrap_or(0.0) * 10.0) as i32;
        x_groups.entry(xk).or_default().push(d);
    }
    let dots: Vec<&&serde_json::Value> = x_groups
        .values()
        .find(|g| g.len() == 4)
        .expect("Expected a group of 4 dots at the same x (M63 chord)")
        .iter()
        .collect();
    assert_eq!(dots.len(), 4, "Expected 4 dots for the 4-note chord in M63");

    let ys: Vec<i32> = dots
        .iter()
        .map(|d| (d["y"].as_f64().unwrap() * 10.0) as i32)
        .collect();
    let unique: HashSet<i32> = ys.iter().copied().collect();
    assert_eq!(
        ys.len(),
        unique.len(),
        "All 4 M63 chord dots must have distinct y-positions, got: {:?}",
        ys
    );
}
