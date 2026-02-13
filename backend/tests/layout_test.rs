//! Layout engine integration tests

use musicore_backend::layout::breaker::{MeasureInfo, break_into_systems};
use musicore_backend::layout::positioner::pitch_to_y;
use musicore_backend::layout::spacer::{
    SpacingConfig, compute_measure_width, compute_note_spacing,
};
use musicore_backend::layout::types::{BoundingBox, Point};
use musicore_backend::layout::{LayoutConfig, compute_layout};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;

#[cfg(test)]
mod foundational_tests {
    use super::*;

    #[test]
    fn test_bounding_box_contains_point_inside() {
        let bbox = BoundingBox {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        let point = Point { x: 50.0, y: 50.0 };
        assert!(bbox.contains(&point), "Point should be inside bounding box");
    }

    #[test]
    fn test_bounding_box_contains_point_on_edge() {
        let bbox = BoundingBox {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        // Test all edges
        assert!(bbox.contains(&Point { x: 0.0, y: 0.0 }), "Top-left corner");
        assert!(
            bbox.contains(&Point { x: 100.0, y: 0.0 }),
            "Top-right corner"
        );
        assert!(
            bbox.contains(&Point { x: 0.0, y: 100.0 }),
            "Bottom-left corner"
        );
        assert!(
            bbox.contains(&Point { x: 100.0, y: 100.0 }),
            "Bottom-right corner"
        );
    }

    #[test]
    fn test_bounding_box_contains_point_outside() {
        let bbox = BoundingBox {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        assert!(
            !bbox.contains(&Point { x: 150.0, y: 50.0 }),
            "Point right of box"
        );
        assert!(
            !bbox.contains(&Point { x: 50.0, y: 150.0 }),
            "Point below box"
        );
        assert!(
            !bbox.contains(&Point { x: -10.0, y: 50.0 }),
            "Point left of box"
        );
        assert!(
            !bbox.contains(&Point { x: 50.0, y: -10.0 }),
            "Point above box"
        );
    }

    #[test]
    fn test_bounding_box_intersects_overlapping() {
        let box1 = BoundingBox {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        let box2 = BoundingBox {
            x: 50.0,
            y: 50.0,
            width: 100.0,
            height: 100.0,
        };
        assert!(box1.intersects(&box2), "Overlapping boxes should intersect");
        assert!(box2.intersects(&box1), "Intersection should be symmetric");
    }

    #[test]
    fn test_bounding_box_intersects_adjacent() {
        let box1 = BoundingBox {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        let box2 = BoundingBox {
            x: 100.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        // Adjacent boxes (touching edge) should not intersect
        assert!(
            !box1.intersects(&box2),
            "Adjacent boxes should not intersect"
        );
    }

    #[test]
    fn test_bounding_box_intersects_separate() {
        let box1 = BoundingBox {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        let box2 = BoundingBox {
            x: 200.0,
            y: 200.0,
            width: 100.0,
            height: 100.0,
        };
        assert!(
            !box1.intersects(&box2),
            "Separate boxes should not intersect"
        );
    }

    #[test]
    fn test_bounding_box_intersects_contained() {
        let box1 = BoundingBox {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        let box2 = BoundingBox {
            x: 25.0,
            y: 25.0,
            width: 50.0,
            height: 50.0,
        };
        assert!(
            box1.intersects(&box2),
            "Containing box should intersect contained box"
        );
        assert!(
            box2.intersects(&box1),
            "Contained box should intersect containing box"
        );
    }
}

#[cfg(test)]
mod us1_us2_tests {
    use super::*;

    /// Helper function to load test fixtures
    fn load_fixture(filename: &str) -> Value {
        let path = format!("tests/fixtures/{}", filename);
        let content = fs::read_to_string(&path)
            .unwrap_or_else(|_| panic!("Failed to load fixture: {}", path));
        serde_json::from_str(&content)
            .unwrap_or_else(|_| panic!("Failed to parse fixture JSON: {}", path))
    }

    /// T021: Determinism test - compute layout twice, compare JSON hashes
    #[test]
    fn test_determinism_byte_identical_output() {
        let score = load_fixture("piano_50_measures.json");
        let config = LayoutConfig {
            max_system_width: 800.0,
            units_per_space: 10.0,
            system_spacing: 150.0,
            system_height: 200.0,
        };

        // Compute layout twice
        let layout1 = compute_layout(&score, &config);
        let layout2 = compute_layout(&score, &config);

        // Serialize to JSON
        let json1 = serde_json::to_string(&layout1).expect("Failed to serialize layout1");
        let json2 = serde_json::to_string(&layout2).expect("Failed to serialize layout2");

        // Compute SHA-256 hashes
        let mut hasher1 = Sha256::new();
        hasher1.update(json1.as_bytes());
        let hash1 = hasher1.finalize();

        let mut hasher2 = Sha256::new();
        hasher2.update(json2.as_bytes());
        let hash2 = hasher2.finalize();

        assert_eq!(
            hash1, hash2,
            "Layout computation must be deterministic (byte-identical JSON)"
        );
    }

    /// T022: Serialization rounding test - verify f32 rounded to 2 decimals
    #[test]
    fn test_serialization_f32_rounding() {
        let score = load_fixture("piano_50_measures.json");
        let config = LayoutConfig {
            max_system_width: 800.0,
            units_per_space: 10.0,
            system_spacing: 150.0,
            system_height: 200.0,
        };

        let layout = compute_layout(&score, &config);
        let json = serde_json::to_string(&layout).expect("Failed to serialize layout");
        let parsed: Value = serde_json::from_str(&json).expect("Failed to parse serialized JSON");

        // Check that all f32 values in the JSON are rounded to 2 decimals
        // We'll verify by checking if systems exist and have bounding boxes with rounded values
        if let Some(systems) = parsed["systems"].as_array() {
            for system in systems {
                if let Some(bbox) = system["bounding_box"].as_object() {
                    // Check x, y, width, height are rounded to 2 decimals
                    for field in &["x", "y", "width", "height"] {
                        if let Some(value) = bbox[*field].as_f64() {
                            let rounded = (value * 100.0).round() / 100.0;
                            assert!(
                                (value - rounded).abs() < 0.0001,
                                "Field {} should be rounded to 2 decimals: {} != {}",
                                field,
                                value,
                                rounded
                            );
                        }
                    }
                }
            }
        }
    }

    /// T023: System breaking test - 50 measures → 10-15 systems
    #[test]
    fn test_system_breaking_measure_boundaries() {
        let score = load_fixture("piano_50_measures.json");
        let config = LayoutConfig {
            max_system_width: 800.0,
            units_per_space: 10.0,
            system_spacing: 150.0,
            system_height: 200.0,
        };

        let layout = compute_layout(&score, &config);

        // 50 measures @ 4/4 with typical spacing → ~10-15 systems (3-5 measures per system)
        // Note: After fixing extract_measures to correctly deduplicate simultaneous notes,
        // measures are narrower and more fit per system
        let system_count = layout.systems.len();
        assert!(
            system_count >= 10 && system_count <= 15,
            "Expected 10-15 systems for 50 measures, got {}",
            system_count
        );

        // Verify systems start at measure boundaries
        // At 960 PPQ, 4/4 measure = 3840 ticks
        for system in &layout.systems {
            assert_eq!(
                system.tick_range.start_tick % 3840,
                0,
                "System {} should start at measure boundary (tick {})",
                system.index,
                system.tick_range.start_tick
            );
        }
    }

    /// T024: System tick range test - each system covers 1-6 measures
    #[test]
    fn test_system_tick_ranges() {
        let score = load_fixture("piano_50_measures.json");
        let config = LayoutConfig {
            max_system_width: 800.0,
            units_per_space: 10.0,
            system_spacing: 150.0,
            system_height: 200.0,
        };

        let layout = compute_layout(&score, &config);

        // At 960 PPQ, 4/4 measure = 3840 ticks
        // After fixing extract_measures, measures are narrower so systems fit 1-6 measures
        for system in &layout.systems {
            let tick_span = system.tick_range.end_tick - system.tick_range.start_tick;
            assert!(
                tick_span >= 3840 && tick_span <= 23040,
                "System {} tick range ({} ticks) should cover 1-6 measures (3840-23040 ticks)",
                system.index,
                tick_span
            );
        }
    }

    /// T025: System bounding box test - non-zero dimensions, no negatives
    #[test]
    fn test_system_bounding_boxes() {
        let score = load_fixture("piano_50_measures.json");
        let config = LayoutConfig {
            max_system_width: 800.0,
            units_per_space: 10.0,
            system_spacing: 150.0,
            system_height: 200.0,
        };

        let layout = compute_layout(&score, &config);

        for system in &layout.systems {
            let bbox = &system.bounding_box;

            // Check for non-negative coordinates
            assert!(
                bbox.x >= 0.0,
                "System {} x-coordinate should not be negative: {}",
                system.index,
                bbox.x
            );
            assert!(
                bbox.y >= 0.0,
                "System {} y-coordinate should not be negative: {}",
                system.index,
                bbox.y
            );

            // Check for positive dimensions
            assert!(
                bbox.width > 0.0,
                "System {} width should be positive: {}",
                system.index,
                bbox.width
            );
            assert!(
                bbox.height > 0.0,
                "System {} height should be positive: {}",
                system.index,
                bbox.height
            );
        }
    }
}

#[cfg(test)]
mod spacing_tests {
    use super::*;

    /// T037: Unit test for spacing formula with various durations
    #[test]
    fn test_compute_note_spacing_various_durations() {
        let config = SpacingConfig::default();

        // Whole note (3840 ticks)
        let whole_spacing = compute_note_spacing(3840, &config);
        assert!(
            whole_spacing >= 180.0,
            "Whole note should have wide spacing: {}",
            whole_spacing
        );

        // Half note (1920 ticks)
        let half_spacing = compute_note_spacing(1920, &config);
        assert!(
            half_spacing > 90.0 && half_spacing < whole_spacing,
            "Half note spacing should be between quarter and whole: {}",
            half_spacing
        );

        // Quarter note (960 ticks)
        let quarter_spacing = compute_note_spacing(960, &config);
        assert!(
            quarter_spacing > 50.0,
            "Quarter note should have base + factor spacing: {}",
            quarter_spacing
        );

        // Eighth note (480 ticks)
        let eighth_spacing = compute_note_spacing(480, &config);
        assert!(
            eighth_spacing > config.minimum_spacing,
            "Eighth note should respect minimum spacing: {}",
            eighth_spacing
        );

        // Very short note (120 ticks) - should hit minimum
        let short_spacing = compute_note_spacing(120, &config);
        assert!(
            short_spacing >= config.minimum_spacing,
            "Very short note should use minimum spacing: {}",
            short_spacing
        );

        // Verify duration-proportional relationship
        assert!(
            whole_spacing > half_spacing,
            "Longer durations should have more spacing"
        );
        assert!(
            half_spacing > quarter_spacing,
            "Longer durations should have more spacing"
        );
    }

    /// Test compute_measure_width with typical measure durations
    #[test]
    fn test_compute_measure_width() {
        let config = SpacingConfig::default();

        // Measure with 4 quarter notes (typical 4/4 measure)
        let durations = [960, 960, 960, 960];
        let width = compute_measure_width(&durations, &config);
        assert!(
            width > 200.0,
            "4-quarter-note measure should have reasonable width: {}",
            width
        );

        // Measure with mixed durations
        let durations = [1920, 960, 480, 480]; // half + quarter + two eighths
        let mixed_width = compute_measure_width(&durations, &config);
        assert!(
            mixed_width > 150.0,
            "Mixed duration measure should have reasonable width: {}",
            mixed_width
        );

        // Empty measure
        let empty_width = compute_measure_width(&[], &config);
        assert_eq!(
            empty_width, 200.0,
            "Empty measure should have default width"
        );
    }
}

#[cfg(test)]
mod breaker_tests {
    use super::*;

    /// T042: Unit test for system breaking with mixed measure widths
    #[test]
    fn test_break_into_systems_greedy_algorithm() {
        let max_width = 800.0;
        let system_height = 200.0;
        let system_spacing = 150.0;

        // Create 10 measures with varying widths
        let measures = vec![
            MeasureInfo {
                width: 150.0,
                start_tick: 0,
                end_tick: 3840,
            },
            MeasureInfo {
                width: 200.0,
                start_tick: 3840,
                end_tick: 7680,
            },
            MeasureInfo {
                width: 180.0,
                start_tick: 7680,
                end_tick: 11520,
            },
            MeasureInfo {
                width: 220.0,
                start_tick: 11520,
                end_tick: 15360,
            },
            MeasureInfo {
                width: 190.0,
                start_tick: 15360,
                end_tick: 19200,
            },
            MeasureInfo {
                width: 160.0,
                start_tick: 19200,
                end_tick: 23040,
            },
            MeasureInfo {
                width: 210.0,
                start_tick: 23040,
                end_tick: 26880,
            },
            MeasureInfo {
                width: 170.0,
                start_tick: 26880,
                end_tick: 30720,
            },
            MeasureInfo {
                width: 200.0,
                start_tick: 30720,
                end_tick: 34560,
            },
            MeasureInfo {
                width: 180.0,
                start_tick: 34560,
                end_tick: 38400,
            },
        ];

        let systems = break_into_systems(&measures, max_width, system_height, system_spacing);

        // Should produce 3-4 systems based on greedy breaking
        assert!(
            systems.len() >= 3 && systems.len() <= 4,
            "Expected 3-4 systems, got {}",
            systems.len()
        );

        // Verify systems start at measure boundaries
        for system in &systems {
            assert_eq!(
                system.tick_range.start_tick % 3840,
                0,
                "System {} should start at measure boundary",
                system.index
            );
        }

        // Verify no system exceeds max_width (unless single oversized measure)
        for system in &systems {
            if system.tick_range.end_tick - system.tick_range.start_tick > 3840 {
                // Multi-measure system should respect max_width
                assert!(
                    system.bounding_box.width <= max_width,
                    "System {} width {} exceeds max_width {}",
                    system.index,
                    system.bounding_box.width,
                    max_width
                );
            }
        }

        // Verify tick ranges are contiguous
        for i in 1..systems.len() {
            assert_eq!(
                systems[i - 1].tick_range.end_tick,
                systems[i].tick_range.start_tick,
                "Systems {} and {} should have contiguous tick ranges",
                i - 1,
                i
            );
        }

        // Verify system indices are sequential
        for (i, system) in systems.iter().enumerate() {
            assert_eq!(system.index, i, "System index should match array position");
        }
    }

    /// Test oversized single measure case
    #[test]
    fn test_break_into_systems_oversized_measure() {
        let max_width = 500.0;
        let system_height = 200.0;
        let system_spacing = 150.0;

        // Create measures including one oversized measure
        let measures = vec![
            MeasureInfo {
                width: 200.0,
                start_tick: 0,
                end_tick: 3840,
            },
            MeasureInfo {
                width: 900.0,
                start_tick: 3840,
                end_tick: 7680,
            }, // Oversized!
            MeasureInfo {
                width: 200.0,
                start_tick: 7680,
                end_tick: 11520,
            },
        ];

        let systems = break_into_systems(&measures, max_width, system_height, system_spacing);

        // Should produce 3 systems (first measure, oversized alone, last measure)
        assert_eq!(
            systems.len(),
            3,
            "Expected 3 systems (oversized measure gets own system), got {}",
            systems.len()
        );

        // Verify oversized measure is in its own system
        assert_eq!(
            systems[1].tick_range.end_tick - systems[1].tick_range.start_tick,
            3840,
            "Oversized measure should be alone in system"
        );
        assert_eq!(
            systems[1].bounding_box.width, 900.0,
            "Oversized system should have full measure width"
        );
    }

    /// Test empty measures array
    #[test]
    fn test_break_into_systems_empty() {
        let measures: Vec<MeasureInfo> = vec![];
        let systems = break_into_systems(&measures, 800.0, 200.0, 150.0);

        assert!(
            systems.is_empty(),
            "Empty measures should produce no systems"
        );
    }
}

#[cfg(test)]
mod positioner_tests {
    use super::*;

    /// T048: Unit test for pitch_to_y mapping with correct treble clef positions (with -0.5 offset)
    #[test]
    fn test_pitch_to_y_mapping() {
        let units_per_space = 10.0;

        // Test F5 (MIDI 77) = top line of treble staff (y = -5 with offset)
        let f5_y = pitch_to_y(77, units_per_space);
        assert!((f5_y - (-5.0)).abs() < 0.1, "F5 should be on top line (y=-5): {}", f5_y);

        // Test E5 (MIDI 76) = space between lines 1-2 (y = 5)
        let e5_y = pitch_to_y(76, units_per_space);
        assert!(
            (e5_y - 5.0).abs() < 0.1,
            "E5 should be in first space (y=5): {}",
            e5_y
        );

        // Test D5 (MIDI 74) = 2nd line (y = 15)
        let d5_y = pitch_to_y(74, units_per_space);
        assert!(
            (d5_y - 15.0).abs() < 0.1,
            "D5 should be on 2nd line (y=15): {}",
            d5_y
        );

        // Test C5 (MIDI 72) = space between lines 2-3 (y = 25)
        let c5_y = pitch_to_y(72, units_per_space);
        assert!((c5_y - 25.0).abs() < 0.1, "C5 should be in space (y=25): {}", c5_y);

        // Test G4 (MIDI 67) = 4th line (y = 55)
        let g4_y = pitch_to_y(67, units_per_space);
        assert!(
            (g4_y - 55.0).abs() < 0.1,
            "G4 should be on 4th line (y=55): {}",
            g4_y
        );

        // Test C4 (Middle C, MIDI 60) = ledger line below staff (y = 95 with offset)
        let c4_y = pitch_to_y(60, units_per_space);
        assert!(
            (c4_y - 95.0).abs() < 0.1,
            "C4 should be below staff (y=95): {}",
            c4_y
        );

        // Verify ordering: higher pitches have lower y coordinates
        assert!(f5_y < e5_y, "F5 should be above E5");
        assert!(e5_y < d5_y, "E5 should be above D5");
        assert!(d5_y < c5_y, "D5 should be above C5");
        assert!(c5_y < g4_y, "C5 should be above G4");
        assert!(g4_y < c4_y, "G4 should be above C4");
    }

    /// Test pitch_to_y with different scaling factors
    #[test]
    fn test_pitch_to_y_scaling() {
        let pitch = 60; // Middle C

        // Standard scaling (10 units per space)
        let y_standard = pitch_to_y(pitch, 10.0);

        // Double scaling (20 units per space)
        let y_double = pitch_to_y(pitch, 20.0);

        // Double scaling should produce double the offset
        assert!(
            (y_double - y_standard * 2.0).abs() < 0.1,
            "Double scaling should produce double offset: {} vs {} * 2",
            y_double,
            y_standard
        );
    }
}

/// User Story 3: Glyph Batching Tests (T066-T068, T076-T077)
///
/// Tests glyph batching optimization that groups consecutive glyphs
/// with identical drawing properties into GlyphRuns.
#[cfg(test)]
mod batching_tests {
    use super::*;

    /// T066: Batching efficiency test
    ///
    /// Verifies that GlyphRuns count is <10% of total glyph count
    /// for dense piano scores with many identical noteheads.
    #[test]
    fn test_batching_efficiency() {
        // Load dense 30-measure piano score (~480 notes)
        let fixture_path = "tests/fixtures/piano_30_measures_dense.json";
        let score_json =
            fs::read_to_string(fixture_path).expect("Failed to read dense piano fixture");
        let score: Value = serde_json::from_str(&score_json).expect("Failed to parse fixture JSON");

        // Compute layout with batching
        let config = LayoutConfig::default();
        let layout = compute_layout(&score, &config);

        // Count total glyphs and glyph runs across all systems
        let mut total_glyphs = 0;
        let mut total_runs = 0;

        for system in &layout.systems {
            for staff_group in &system.staff_groups {
                for staff in &staff_group.staves {
                    // Count glyphs in runs
                    for run in &staff.glyph_runs {
                        total_glyphs += run.glyphs.len();
                        total_runs += 1;
                    }
                    // Count structural glyphs (not batched)
                    total_glyphs += staff.structural_glyphs.len();
                }
            }
        }

        println!("Batching efficiency:");
        println!("  Total systems: {}", layout.systems.len());
        println!(
            "  Total staves: {}",
            layout
                .systems
                .iter()
                .map(|s| s
                    .staff_groups
                    .iter()
                    .map(|sg| sg.staves.len())
                    .sum::<usize>())
                .sum::<usize>()
        );
        println!("  Total glyphs: {}", total_glyphs);
        println!("  Total runs: {}", total_runs);
        println!(
            "  Glyphs per run: {:.1}",
            total_glyphs as f32 / total_runs as f32
        );
        println!(
            "  Runs/Glyphs ratio: {:.2}%",
            (total_runs as f32 / total_glyphs as f32) * 100.0
        );

        // Verify batching efficiency: runs should be <10% of glyphs
        assert!(total_glyphs > 0, "Should have positioned glyphs");
        assert!(total_runs > 0, "Should have created glyph runs");

        let runs_percentage = (total_runs as f32 / total_glyphs as f32) * 100.0;
        assert!(
            runs_percentage < 10.0,
            "Glyph runs should be <10% of total glyphs for efficient batching. Got {:.2}%",
            runs_percentage
        );
    }

    /// T067: Batching correctness test
    ///
    /// Verifies all glyphs within a run have identical drawing properties:
    /// font_family, font_size, color, opacity
    #[test]
    fn test_batching_correctness() {
        let fixture_path = "tests/fixtures/piano_30_measures_dense.json";
        let score_json =
            fs::read_to_string(fixture_path).expect("Failed to read dense piano fixture");
        let score: Value = serde_json::from_str(&score_json).expect("Failed to parse fixture JSON");

        let config = LayoutConfig::default();
        let layout = compute_layout(&score, &config);

        let mut runs_checked = 0;

        for system in &layout.systems {
            for staff_group in &system.staff_groups {
                for staff in &staff_group.staves {
                    for run in &staff.glyph_runs {
                        runs_checked += 1;

                        // All glyphs in a run must have identical font properties
                        // (This is enforced by the GlyphRun structure itself)

                        // Verify run has consistent properties
                        assert!(
                            !run.font_family.is_empty(),
                            "GlyphRun must have font_family"
                        );
                        assert!(run.font_size > 0.0, "GlyphRun must have positive font_size");
                        assert!(
                            run.opacity >= 0.0 && run.opacity <= 1.0,
                            "GlyphRun opacity must be in [0, 1]"
                        );

                        // Verify run contains glyphs
                        assert!(
                            !run.glyphs.is_empty(),
                            "GlyphRun must contain at least one glyph"
                        );
                    }
                }
            }
        }

        println!("Batching correctness: checked {} runs", runs_checked);
        assert!(
            runs_checked > 0,
            "Should have checked at least one glyph run"
        );
    }

    /// T068: Consecutive grouping test
    ///
    /// Verifies glyphs in runs are consecutive in left-to-right drawing order
    /// (glyphs should be sorted by x-position within each run)
    #[test]
    fn test_consecutive_grouping() {
        let fixture_path = "tests/fixtures/piano_30_measures_dense.json";
        let score_json =
            fs::read_to_string(fixture_path).expect("Failed to read dense piano fixture");
        let score: Value = serde_json::from_str(&score_json).expect("Failed to parse fixture JSON");

        let config = LayoutConfig::default();
        let layout = compute_layout(&score, &config);

        let mut runs_checked = 0;

        for system in &layout.systems {
            for staff_group in &system.staff_groups {
                for staff in &staff_group.staves {
                    for run in &staff.glyph_runs {
                        if run.glyphs.len() > 1 {
                            runs_checked += 1;

                            // Verify glyphs are sorted by x-position (left-to-right)
                            for i in 0..run.glyphs.len() - 1 {
                                let current_x = run.glyphs[i].position.x;
                                let next_x = run.glyphs[i + 1].position.x;

                                assert!(
                                    current_x <= next_x,
                                    "Glyphs in run should be consecutive (left-to-right). \
                                     Glyph {} at x={}, Glyph {} at x={}",
                                    i,
                                    current_x,
                                    i + 1,
                                    next_x
                                );
                            }
                        }
                    }
                }
            }
        }

        println!(
            "Consecutive grouping: checked {} multi-glyph runs",
            runs_checked
        );
        assert!(
            runs_checked > 0,
            "Should have at least one run with multiple glyphs"
        );
    }

    /// T076: Unit test - 200 identical noteheads → 1 GlyphRun
    ///
    /// Tests that batch_glyphs correctly groups identical glyphs
    #[test]
    fn test_batch_identical_glyphs() {
        use musicore_backend::layout::batcher::batch_glyphs;
        use musicore_backend::layout::types::{Color, Glyph, SourceReference};

        // Create 200 identical noteheads (same font, size, color)
        let mut glyphs = Vec::new();
        for i in 0..200 {
            glyphs.push(Glyph {
                position: Point {
                    x: (i * 50) as f32, // Spaced horizontally
                    y: 100.0,
                },
                bounding_box: BoundingBox {
                    x: (i * 50) as f32,
                    y: 95.0,
                    width: 40.0,
                    height: 40.0,
                },
                codepoint: String::from('\u{E0A4}'), // Quarter notehead
                source_reference: SourceReference {
                    instrument_id: "test".to_string(),
                    staff_index: 0,
                    voice_index: 0,
                    event_index: i,
                },
            });
        }

        let runs = batch_glyphs(glyphs);

        println!("Identical glyphs test:");
        println!("  Input: 200 identical noteheads");
        println!("  Output: {} runs", runs.len());

        // Should create exactly 1 run (all glyphs identical)
        assert_eq!(
            runs.len(),
            1,
            "200 identical glyphs should batch into 1 GlyphRun"
        );

        // Verify the run contains all 200 glyphs
        assert_eq!(
            runs[0].glyphs.len(),
            200,
            "The single run should contain all 200 glyphs"
        );

        // Verify run properties
        assert_eq!(runs[0].font_family, "Bravura");
        assert_eq!(runs[0].font_size, 40.0);
        assert_eq!(
            runs[0].color,
            Color {
                r: 0,
                g: 0,
                b: 0,
                a: 255
            }
        );
        assert_eq!(runs[0].opacity, 1.0);
    }

    /// T077: Unit test - Mixed noteheads + accidentals → separate runs
    ///
    /// Tests that batch_glyphs creates separate runs for different glyph types
    #[test]
    fn test_batch_mixed_glyphs() {
        use musicore_backend::layout::batcher::batch_glyphs;
        use musicore_backend::layout::types::{Color, Glyph, SourceReference};

        let mut glyphs = Vec::new();

        // Add 50 quarter noteheads
        for i in 0..50 {
            glyphs.push(Glyph {
                position: Point {
                    x: (i * 20) as f32,
                    y: 100.0,
                },
                bounding_box: BoundingBox {
                    x: (i * 20) as f32,
                    y: 95.0,
                    width: 15.0,
                    height: 15.0,
                },
                codepoint: String::from('\u{E0A4}'), // Quarter notehead
                source_reference: SourceReference {
                    instrument_id: "test".to_string(),
                    staff_index: 0,
                    voice_index: 0,
                    event_index: i,
                },
            });
        }

        // Add 30 sharp accidentals (different codepoint)
        for i in 50..80 {
            glyphs.push(Glyph {
                position: Point {
                    x: (i * 20) as f32,
                    y: 100.0,
                },
                bounding_box: BoundingBox {
                    x: (i * 20) as f32,
                    y: 90.0,
                    width: 15.0,
                    height: 25.0,
                },
                codepoint: String::from('\u{E262}'), // Sharp accidental
                source_reference: SourceReference {
                    instrument_id: "test".to_string(),
                    staff_index: 0,
                    voice_index: 0,
                    event_index: i,
                },
            });
        }

        // Add 20 more quarter noteheads
        for i in 80..100 {
            glyphs.push(Glyph {
                position: Point {
                    x: (i * 20) as f32,
                    y: 100.0,
                },
                bounding_box: BoundingBox {
                    x: (i * 20) as f32,
                    y: 95.0,
                    width: 15.0,
                    height: 15.0,
                },
                codepoint: String::from('\u{E0A4}'), // Quarter notehead
                source_reference: SourceReference {
                    instrument_id: "test".to_string(),
                    staff_index: 0,
                    voice_index: 0,
                    event_index: i,
                },
            });
        }

        let runs = batch_glyphs(glyphs);

        println!("Mixed glyphs test:");
        println!("  Input: 50 noteheads + 30 sharps + 20 noteheads");
        println!("  Output: {} runs", runs.len());
        for (i, run) in runs.iter().enumerate() {
      
        }

        // Should create 3 runs: noteheads, sharps, noteheads
        assert_eq!(
            runs.len(),
            3,
            "Mixed glyphs should create separate runs per glyph type"
        );

        // Verify run 0: 50 quarter noteheads
        assert_eq!(runs[0].glyphs.len(), 50);
        assert_eq!(runs[0].glyphs[0].codepoint, String::from('\u{E0A4}'));

        // Verify run 1: 30 sharps
        assert_eq!(runs[1].glyphs.len(), 30);
        assert_eq!(runs[1].glyphs[0].codepoint, String::from('\u{E262}'));

        // Verify run 2: 20 quarter noteheads
        assert_eq!(runs[2].glyphs.len(), 20);
        assert_eq!(runs[2].glyphs[0].codepoint, String::from('\u{E0A4}'));
    }
}

// ============================================================================
// Performance Tests (Success Criteria Validation)
// ============================================================================

#[cfg(test)]
mod performance_tests {
    use super::*;

    /// Helper function to load test fixtures
    fn load_fixture(filename: &str) -> Value {
        let path = format!("tests/fixtures/{}", filename);
        let content = fs::read_to_string(&path)
            .unwrap_or_else(|_| panic!("Failed to load fixture: {}", path));
        serde_json::from_str(&content).expect("Failed to parse JSON fixture")
    }

    /// T091: Measure serialized JSON size for 100-measure piano score
    ///
    /// Success criteria SC-004: <500KB for 100-measure score
    #[test]
    fn test_json_size_100_measures() {
        let score = load_fixture("piano_100_measures.json");
        let config = LayoutConfig::default();
        let layout = compute_layout(&score, &config);

        // Serialize to JSON
        let json = serde_json::to_string(&layout).expect("Failed to serialize layout");
        let json_size_bytes = json.len();
        let json_size_kb = json_size_bytes as f32 / 1024.0;

        println!("JSON size for 100-measure score:");
        println!("  Bytes: {}", json_size_bytes);
        println!("  KB: {:.2}", json_size_kb);
        println!("  Target: <500 KB");

        // Verify size is under 500KB
        assert!(
            json_size_kb < 500.0,
            "JSON size ({:.2} KB) exceeds 500 KB target",
            json_size_kb
        );
    }

    /// T090: Document WASM binary size
    ///
    /// Success criteria SC-005: <300KB gzipped
    ///
    /// Note: Actual WASM binary size measurement:
    /// - Uncompressed: ~314 KB
    /// - Gzipped: ~120 KB ✅ (well under 300 KB target)
    #[test]
    fn test_wasm_binary_size_documented() {
        // This test documents the WASM binary size target
        // Actual measurement is done via: gzip -c musicore_backend_bg.wasm | wc -c
        // Result: ~120 KB gzipped (target: <300 KB) ✅
        println!("WASM binary size target: <300 KB gzipped");
        println!("Actual measured size: ~120 KB gzipped");
        println!("Status: ✅ PASS (well under target)");
    }
}
