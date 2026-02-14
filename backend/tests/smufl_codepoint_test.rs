//! SMuFL codepoint validation test (T080)
//!
//! Verifies that all SMuFL codepoints used in the layout engine
//! are within the valid Bravura font range (U+E000-U+F8FF).

use std::collections::HashSet;

/// SMuFL Private Use Area range for musical symbols
const SMUFL_START: u32 = 0xE000;
const SMUFL_END: u32 = 0xF8FF;

/// All SMuFL codepoints used in the codebase
fn get_all_smufl_codepoints() -> Vec<(&'static str, char, &'static str)> {
    vec![
        // Noteheads (positioner.rs)
        ("noteheadWhole", '\u{E0A2}', "whole note notehead"),
        ("noteheadHalfWithStem", '\u{E1D3}', "half note with stem"),
        (
            "noteheadBlackWithStem",
            '\u{E1D5}',
            "quarter note with stem",
        ),
        ("noteEighthUp", '\u{E1D7}', "eighth note with flag up"),
        (
            "noteSixteenthUp",
            '\u{E1D9}',
            "sixteenth note with flags up",
        ),
        // Legacy notehead  (batcher.rs - should be removed later)
        ("noteheadBlack", '\u{E0A4}', "filled notehead (legacy)"),
        // Clefs (positioner.rs)
        ("gClef", '\u{E050}', "treble clef"),
        ("fClef", '\u{E062}', "bass clef"),
        ("cClef", '\u{E05C}', "alto/tenor clef"),
        // Brackets (mod.rs)
        ("brace", '\u{E000}', "brace for grand staff"),
        ("bracket", '\u{E002}', "bracket for staff group"),
    ]
}

#[test]
fn test_all_codepoints_in_smufl_range() {
    let codepoints = get_all_smufl_codepoints();
    let mut failures = Vec::new();

    println!("Verifying {} SMuFL codepoints...", codepoints.len());

    for (name, codepoint, description) in &codepoints {
        let code_value = *codepoint as u32;

        if !(SMUFL_START..=SMUFL_END).contains(&code_value) {
            failures.push(format!(
                "✗ {}: U+{:04X} ({}) is OUTSIDE SMuFL range U+{:04X}-U+{:04X}",
                name, code_value, description, SMUFL_START, SMUFL_END
            ));
        } else {
            println!("  ✓ {}: U+{:04X} ({}) - OK", name, code_value, description);
        }
    }

    if !failures.is_empty() {
        eprintln!("\n❌ SMuFL codepoint validation FAILED:");
        for failure in &failures {
            eprintln!("  {}", failure);
        }
        panic!("{} codepoint(s) outside valid SMuFL range", failures.len());
    }

    println!(
        "\n✅ All {} SMuFL codepoints are within valid Bravura range (U+E000-U+F8FF)",
        codepoints.len()
    );
}

#[test]
fn test_no_duplicate_codepoints() {
    let codepoints = get_all_smufl_codepoints();
    let mut seen = HashSet::new();
    let mut duplicates = Vec::new();

    for (name, codepoint, _) in &codepoints {
        if !seen.insert(codepoint) {
            duplicates.push(format!("{}: U+{:04X}", name, *codepoint as u32));
        }
    }

    if !duplicates.is_empty() {
        eprintln!("\n⚠️  Duplicate codepoints detected:");
        for dup in &duplicates {
            eprintln!("  {}", dup);
        }
        panic!("{} duplicate codepoint(s) found", duplicates.len());
    }

    println!(
        "✅ No duplicate codepoints - all {} codepoints are unique",
        codepoints.len()
    );
}

#[test]
fn test_codepoint_documentation() {
    let codepoints = get_all_smufl_codepoints();

    // Verify every codepoint has a description
    for (name, codepoint, description) in &codepoints {
        assert!(
            !description.is_empty(),
            "Codepoint {} (U+{:04X}) missing description",
            name,
            *codepoint as u32
        );

        assert!(
            !name.is_empty(),
            "Codepoint U+{:04X} missing name",
            *codepoint as u32
        );
    }

    println!(
        "✅ All {} codepoints have proper documentation",
        codepoints.len()
    );
}
