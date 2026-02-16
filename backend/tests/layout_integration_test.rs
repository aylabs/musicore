//! T012: Integration tests for layout engine structure
//!
//! Tests for single-staff and multi-staff layout structure, verifying systems, staff_groups, staves

use musicore_backend::layout::{LayoutConfig, compute_layout};

#[test]
fn test_single_staff_layout_structure() {
    // Create a simple single-staff score (violin with a few notes)
    let input = serde_json::json!({
        "instruments": [{
            "id": "violin-1",
            "name": "Violin",
            "staves": [{
                "clef": "Treble",
                "voices": [{
                    "notes": [
                        {"tick": 0, "duration": 960, "pitch": 60},    // C4
                        {"tick": 960, "duration": 960, "pitch": 62},  // D4
                        {"tick": 1920, "duration": 960, "pitch": 64}, // E4
                    ]
                }]
            }]
        }]
    });

    let config = LayoutConfig {
        max_system_width: 1200.0,
        units_per_space: 20.0,
        system_spacing: 220.0,
        system_height: 200.0,
    };

    let output = compute_layout(&input, &config);
    let json_output = serde_json::to_value(&output).unwrap();

    // Verify systems exist
    let systems = json_output["systems"]
        .as_array()
        .expect("Output should have systems array");
    assert!(!systems.is_empty(), "Should have at least one system");

    // Verify each system has correct structure
    for (idx, system) in systems.iter().enumerate() {
        // Verify staff_groups exist
        let staff_groups = system["staff_groups"]
            .as_array()
            .unwrap_or_else(|| panic!("System {} should have staff_groups", idx));
        assert!(
            !staff_groups.is_empty(),
            "System {} staff_groups should not be empty",
            idx
        );

        // For single instrument, should have exactly 1 staff_group
        assert_eq!(
            staff_groups.len(),
            1,
            "Single instrument should have 1 staff_group"
        );

        let staff_group = &staff_groups[0];

        // Verify instrument_id
        assert_eq!(
            staff_group["instrument_id"].as_str().unwrap(),
            "violin-1",
            "Staff group should reference correct instrument"
        );

        // Verify staves exist
        let staves = staff_group["staves"]
            .as_array()
            .expect("Staff group should have staves");
        assert_eq!(
            staves.len(),
            1,
            "Single-staff instrument should have 1 staff"
        );

        let staff = &staves[0];

        // Verify staff_lines exist (5 lines)
        let staff_lines = staff["staff_lines"]
            .as_array()
            .expect("Staff should have staff_lines");
        assert_eq!(staff_lines.len(), 5, "Staff should have exactly 5 lines");

        // Verify staff_lines have correct spacing
        let y_positions: Vec<f32> = staff_lines
            .iter()
            .map(|line| line["y_position"].as_f64().unwrap() as f32)
            .collect();

        // Staff lines should be 20 units apart (1 * units_per_space)
        for i in 0..4 {
            let spacing = y_positions[i + 1] - y_positions[i];
            assert_eq!(
                spacing,
                20.0,
                "Staff lines {} and {} should be 20 units apart",
                i,
                i + 1
            );
        }
    }

    println!("✅ Single-staff layout structure test passed");
}

#[test]
fn test_multi_staff_layout_structure() {
    // Create a piano score (grand staff: treble + bass)
    let input = serde_json::json!({
        "instruments": [{
            "id": "piano-1",
            "name": "Piano",
            "staves": [
                {
                    "clef": "Treble",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 960, "pitch": 72}  // C5
                        ]
                    }]
                },
                {
                    "clef": "Bass",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 960, "pitch": 48}  // C3
                        ]
                    }]
                }
            ]
        }]
    });

    let config = LayoutConfig {
        max_system_width: 1200.0,
        units_per_space: 20.0,
        system_spacing: 220.0,
        system_height: 200.0,
    };

    let output = compute_layout(&input, &config);
    let json_output = serde_json::to_value(&output).unwrap();

    // Verify systems exist
    let systems = json_output["systems"]
        .as_array()
        .expect("Output should have systems array");
    assert!(!systems.is_empty(), "Should have at least one system");

    let first_system = &systems[0];
    let staff_groups = first_system["staff_groups"]
        .as_array()
        .expect("First system should have staff_groups");

    assert_eq!(staff_groups.len(), 1, "Piano should have 1 staff_group");

    let staff_group = &staff_groups[0];
    let staves = staff_group["staves"]
        .as_array()
        .expect("Staff group should have staves");

    // Piano grand staff should have 2 staves (treble + bass)
    assert_eq!(staves.len(), 2, "Piano grand staff should have 2 staves");

    // Verify both staves have correct structure
    for (staff_idx, staff) in staves.iter().enumerate() {
        let staff_lines = staff["staff_lines"]
            .as_array()
            .unwrap_or_else(|| panic!("Staff {} should have staff_lines", staff_idx));
        assert_eq!(
            staff_lines.len(),
            5,
            "Staff {} should have exactly 5 lines",
            staff_idx
        );
    }

    // Verify vertical separation between staves
    let staff_0_lines = staves[0]["staff_lines"].as_array().unwrap();
    let staff_1_lines = staves[1]["staff_lines"].as_array().unwrap();

    let staff_0_top = staff_0_lines[0]["y_position"].as_f64().unwrap() as f32;
    let staff_1_top = staff_1_lines[0]["y_position"].as_f64().unwrap() as f32;

    // Staves should be separated by 14 staff spaces (280 units with units_per_space=20)
    // This provides ample room for ledger lines and bracket between piano grand staff staves
    let staff_separation = staff_1_top - staff_0_top;
    assert_eq!(
        staff_separation, 280.0,
        "Piano staves should be separated by 280 units (14 staff spaces)"
    );

    println!("✅ Multi-staff layout structure test passed");
}

/// T012: Multi-instrument score has exactly one measure number per system (US2)
#[test]
fn test_measure_number_single_per_multi_instrument_system() {
    // Create a multi-instrument score (violin + cello)
    let input = serde_json::json!({
        "instruments": [
            {
                "id": "violin-1",
                "name": "Violin",
                "staves": [{
                    "clef": "Treble",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 3840, "pitch": 67},
                            {"tick": 3840, "duration": 3840, "pitch": 69},
                            {"tick": 7680, "duration": 3840, "pitch": 71}
                        ]
                    }]
                }]
            },
            {
                "id": "cello-1",
                "name": "Cello",
                "staves": [{
                    "clef": "Bass",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 3840, "pitch": 48},
                            {"tick": 3840, "duration": 3840, "pitch": 50},
                            {"tick": 7680, "duration": 3840, "pitch": 52}
                        ]
                    }]
                }]
            }
        ]
    });

    let config = LayoutConfig::default();
    let layout = compute_layout(&input, &config);
    let layout_json = serde_json::to_value(&layout).unwrap();

    let systems = layout_json["systems"].as_array().unwrap();
    assert!(!systems.is_empty(), "Should have at least one system");

    for (idx, system) in systems.iter().enumerate() {
        // Each system should have exactly one measure_number (not per staff group)
        assert!(
            system["measure_number"].is_object(),
            "System {} should have a single measure_number object",
            idx
        );

        // Verify it has the expected fields
        let mn = &system["measure_number"];
        assert!(
            mn["number"].is_number(),
            "measure_number.number should be present for system {}",
            idx
        );
        assert!(
            mn["position"]["x"].is_number() && mn["position"]["y"].is_number(),
            "measure_number.position should have x and y for system {}",
            idx
        );

        // Verify it's NOT duplicated at the staff group level
        let staff_groups = system["staff_groups"].as_array().unwrap();
        assert!(
            staff_groups.len() >= 2,
            "Should have 2+ staff groups for multi-instrument score"
        );

        for sg in staff_groups {
            assert!(
                sg.get("measure_number").is_none() || sg["measure_number"].is_null(),
                "measure_number should NOT appear on staff_group level"
            );
        }

        // T026: Verify instrument_name field is correct on each staff group
        assert_eq!(
            staff_groups[0]["instrument_name"].as_str().unwrap(),
            "Violin",
            "First staff group instrument_name should be 'Violin' in system {}",
            idx
        );
        assert_eq!(
            staff_groups[1]["instrument_name"].as_str().unwrap(),
            "Cello",
            "Second staff group instrument_name should be 'Cello' in system {}",
            idx
        );
    }

    println!("✅ Multi-instrument measure number single-per-system test passed");
}

/// T013: Measure number is above the topmost staff in multi-instrument layout (US2)
#[test]
fn test_measure_number_above_topmost_staff_multi_instrument() {
    // Create a multi-instrument score
    let input = serde_json::json!({
        "instruments": [
            {
                "id": "violin-1",
                "name": "Violin",
                "staves": [{
                    "clef": "Treble",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 3840, "pitch": 67}
                        ]
                    }]
                }]
            },
            {
                "id": "cello-1",
                "name": "Cello",
                "staves": [{
                    "clef": "Bass",
                    "voices": [{
                        "notes": [
                            {"tick": 0, "duration": 3840, "pitch": 48}
                        ]
                    }]
                }]
            }
        ]
    });

    let config = LayoutConfig::default();
    let layout = compute_layout(&input, &config);
    let layout_json = serde_json::to_value(&layout).unwrap();

    let systems = layout_json["systems"].as_array().unwrap();
    let system = &systems[0];

    let mn_y = system["measure_number"]["position"]["y"].as_f64().unwrap();

    // Get topmost staff line y from first staff group, first staff, first line
    let first_staff_group = &system["staff_groups"][0];
    let first_staff = &first_staff_group["staves"][0];
    let first_staff_line_y = first_staff["staff_lines"][0]["y_position"]
        .as_f64()
        .unwrap();

    assert!(
        mn_y < first_staff_line_y,
        "Measure number y ({}) should be above topmost staff line y ({}) in multi-instrument layout",
        mn_y,
        first_staff_line_y
    );

    // T026: Verify instrument_name on staff groups
    let staff_groups = system["staff_groups"].as_array().unwrap();
    assert_eq!(
        staff_groups[0]["instrument_name"].as_str().unwrap(),
        "Violin"
    );
    assert_eq!(
        staff_groups[1]["instrument_name"].as_str().unwrap(),
        "Cello"
    );

    println!("✅ Multi-instrument measure number position test passed");
}
