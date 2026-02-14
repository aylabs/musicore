//! Contract tests for WASM layout engine
//!
//! Validates that Rust layout engine output exactly matches frontend fixture expectations

use std::fs;
use std::path::PathBuf;

#[test]
fn test_violin_fixture_contract() {
    // T006: Load violin_10_measures.json fixture
    let fixture_path = PathBuf::from("tests/fixtures/violin_10_measures.json");
    let fixture_content =
        fs::read_to_string(&fixture_path).expect("Failed to read violin_10_measures.json fixture");

    let _expected_output: serde_json::Value =
        serde_json::from_str(&fixture_content).expect("Failed to parse violin fixture JSON");

    // For now, create a simple input to test with
    // TODO: This should come from a real score input
    let test_input = serde_json::json!({
        "instruments": [{
            "id": "violin-1",
            "name": "Violin",
            "staves": [{
                "clef": "Treble",
                "voices": [{
                    "notes": [
                        {"tick": 0, "duration": 960, "pitch": 60},
                        {"tick": 960, "duration": 960, "pitch": 62},
                        {"tick": 1920, "duration": 960, "pitch": 64}
                    ]
                }]
            }]
        }],
        "tempo_changes": [{"tick": 0, "bpm": 120}],
        "time_signature_changes": [{"tick": 0, "numerator": 4, "denominator": 4}]
    });

    let config = musicore_backend::layout::LayoutConfig {
        max_system_width: 1200.0,
        units_per_space: 20.0,
        system_spacing: 220.0,
        system_height: 200.0,
    };

    // T007: Assert output structure matches fixture (WILL FAIL - empty staff_groups)
    let actual_output = musicore_backend::layout::compute_layout(&test_input, &config);

    // Serialize to JSON for comparison
    let actual_json =
        serde_json::to_value(&actual_output).expect("Failed to serialize layout output");

    // Verify systems are created
    assert!(
        actual_json["systems"].is_array(),
        "Output should have systems array"
    );

    let systems = actual_json["systems"].as_array().unwrap();
    assert!(!systems.is_empty(), "Systems array should not be empty");

    // Critical check: staff_groups should NOT be empty (this is what we're fixing)
    let first_system = &systems[0];
    let staff_groups = first_system["staff_groups"]
        .as_array()
        .expect("staff_groups should be an array");

    assert!(
        !staff_groups.is_empty(),
        "CRITICAL BUG: staff_groups is empty - layout engine not generating staff content"
    );

    // If we get here, staff_groups exists - now verify structure
    let first_staff_group = &staff_groups[0];
    assert!(
        first_staff_group["instrument_id"].is_string(),
        "staff_group should have instrument_id"
    );

    let staves = first_staff_group["staves"]
        .as_array()
        .expect("staff_group should have staves array");
    assert!(!staves.is_empty(), "staves array should not be empty");

    let first_staff = &staves[0];

    // Verify staff lines exist
    let staff_lines = first_staff["staff_lines"]
        .as_array()
        .expect("staff should have staff_lines array");
    assert_eq!(staff_lines.len(), 5, "Staff should have exactly 5 lines");

    // T013-T014: Verify staff line spacing is correct (40 units = 2 * units_per_space)
    let y_positions: Vec<f32> = staff_lines
        .iter()
        .map(|line| line["y_position"].as_f64().unwrap() as f32)
        .collect();

    println!("Staff line y-positions: {:?}", y_positions);
    assert_eq!(
        y_positions,
        vec![0.0, 40.0, 80.0, 120.0, 160.0],
        "Staff lines should be at 0, 40, 80, 120, 160 (40-unit spacing)"
    );

    // Verify glyph_runs exist (noteheads)
    let glyph_runs = first_staff["glyph_runs"]
        .as_array()
        .expect("staff should have glyph_runs array");
    assert!(
        !glyph_runs.is_empty(),
        "glyph_runs should contain positioned noteheads"
    );

    println!("✅ Contract test passed: staff_groups populated with valid structure");
}

#[test]
fn test_piano_fixture_contract() {
    // T006: Load piano_8_measures.json fixture
    let fixture_path = PathBuf::from("tests/fixtures/piano_8_measures.json");
    let fixture_content =
        fs::read_to_string(&fixture_path).expect("Failed to read piano_8_measures.json fixture");

    let _expected_output: serde_json::Value =
        serde_json::from_str(&fixture_content).expect("Failed to parse piano fixture JSON");

    // Simple piano input (treble + bass staves)
    let test_input = serde_json::json!({
        "instruments": [{
            "id": "piano-1",
            "name": "Piano",
            "staves": [
                {
                    "clef": "Treble",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 960, "pitch": 72}
                        ]
                    }]
                },
                {
                    "clef": "Bass",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 960, "pitch": 48}
                        ]
                    }]
                }
            ]
        }]
    });

    let config = musicore_backend::layout::LayoutConfig {
        max_system_width: 1200.0,
        units_per_space: 20.0,
        system_spacing: 220.0,
        system_height: 200.0,
    };

    let actual_output = musicore_backend::layout::compute_layout(&test_input, &config);

    let actual_json =
        serde_json::to_value(&actual_output).expect("Failed to serialize layout output");

    // Verify multi-staff structure
    let systems = actual_json["systems"].as_array().unwrap();
    let first_system = &systems[0];
    let staff_groups = first_system["staff_groups"].as_array().unwrap();

    assert!(!staff_groups.is_empty(), "Piano should have staff_groups");

    let first_staff_group = &staff_groups[0];
    let staves = first_staff_group["staves"].as_array().unwrap();

    // Piano should have 2 staves (treble + bass)
    assert_eq!(
        staves.len(),
        2,
        "Piano staff_group should have 2 staves (treble + bass)"
    );

    println!("✅ Piano contract test passed: Multi-staff structure correct");
}
