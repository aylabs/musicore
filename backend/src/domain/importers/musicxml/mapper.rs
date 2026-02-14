// Element Mapping for MusicXML Import - Feature 006-musicxml-import
// Maps MusicXML elements to domain types (clefs, pitches, key signatures)

use super::errors::MappingError;
use crate::domain::value_objects::{Clef, KeySignature, Pitch};

/// Maps MusicXML elements to domain value objects
pub struct ElementMapper;

impl ElementMapper {
    /// Maps MusicXML clef sign and line to Clef enum
    ///
    /// # Arguments
    /// * `sign` - Clef sign: "G", "F", "C", "TAB", "percussion", "jianpu"
    /// * `line` - Staff line number (1-5)
    ///
    /// # Returns
    /// Clef or MappingError if unsupported
    pub fn map_clef(sign: &str, line: i32) -> Result<Clef, MappingError> {
        match (sign, line) {
            ("G", 2) => Ok(Clef::Treble), // G-clef on line 2
            ("F", 4) => Ok(Clef::Bass),   // F-clef on line 4
            ("C", 3) => Ok(Clef::Alto),   // C-clef on line 3 (viola)
            ("C", 4) => Ok(Clef::Tenor),  // C-clef on line 4 (cello, trombone)
            _ => Err(MappingError::UnsupportedClef {
                sign: sign.to_string(),
                line,
            }),
        }
    }

    /// Maps MusicXML pitch to Pitch value object (MIDI note number 0-127)
    ///
    /// # Arguments
    /// * `step` - Note letter A-G
    /// * `octave` - Octave number (C4 = middle C)
    /// * `alter` - Chromatic alteration: -2=double flat, -1=flat, 0=natural, +1=sharp, +2=double sharp
    ///
    /// # Formula
    /// MIDI = 12 * (octave + 1) + step_offset + alter
    /// C4 = 60, A4 = 69
    pub fn map_pitch(step: char, octave: i32, alter: i32) -> Result<Pitch, MappingError> {
        // Validate step character
        let step_upper = step.to_ascii_uppercase();
        if !matches!(step_upper, 'A'..='G') {
            return Err(MappingError::InvalidPitchStep(step));
        }

        // Map step to chromatic offset (C=0, D=2, E=4, F=5, G=7, A=9, B=11)
        let step_offset = match step_upper {
            'C' => 0,
            'D' => 2,
            'E' => 4,
            'F' => 5,
            'G' => 7,
            'A' => 9,
            'B' => 11,
            _ => unreachable!(), // Already validated above
        };

        // Calculate MIDI note number
        let midi = 12 * (octave + 1) + step_offset + alter;

        // Validate range (0-127)
        if !(0..=127).contains(&midi) {
            return Err(MappingError::PitchOutOfRange {
                midi,
                step: step_upper,
                octave,
                alter,
            });
        }

        Pitch::new(midi as u8).map_err(|_| MappingError::PitchOutOfRange {
            midi,
            step: step_upper,
            octave,
            alter,
        })
    }

    /// Maps MusicXML key signature to KeySignature value object
    ///
    /// # Arguments
    /// * `fifths` - Number of sharps (positive) or flats (negative) in circle of fifths
    ///   Example: C major = 0, G major = 1, F major = -1, D major = 2, Bb major = -2
    /// * `_mode` - "major" or "minor" (not used in current domain model)
    ///
    /// Note: Mode information is currently not stored in the domain KeySignature type.
    /// The KeySignature stores only the fifths value (sharps/flats count).
    pub fn map_key(fifths: i32, _mode: Option<&str>) -> Result<KeySignature, MappingError> {
        // Validate fifths range (-7 to +7 for standard keys)
        if !(-7..=7).contains(&fifths) {
            return Err(MappingError::UnsupportedKey {
                fifths,
                mode: _mode.unwrap_or("major").to_string(),
            });
        }

        KeySignature::new(fifths as i8).map_err(|_| MappingError::UnsupportedKey {
            fifths,
            mode: _mode.unwrap_or("major").to_string(),
        })
    }

    /// Infers default clef from instrument name
    /// Used when MusicXML doesn't specify a clef explicitly
    ///
    /// # Arguments
    /// * `name` - Instrument name (e.g., "Violin", "Cello", "Piano")
    ///
    /// # Returns
    /// Clef (defaults to Treble if unrecognized)
    pub fn infer_clef_from_instrument(name: &str) -> Clef {
        let name_lower = name.to_lowercase();

        if name_lower.contains("bass")
            || name_lower.contains("cello")
            || name_lower.contains("trombone")
            || name_lower.contains("contrabass")
        {
            Clef::Bass
        } else if name_lower.contains("viola") {
            Clef::Alto
        } else if name_lower.contains("tenor")
            && (name_lower.contains("trombone") || name_lower.contains("voice"))
        {
            Clef::Tenor
        } else {
            // Default to treble for violin, flute, trumpet, piano (RH), voice (soprano/alto)
            Clef::Treble
        }
    }
}

// ============================================================================
// TESTS (TDD Approach - Tests Written First)
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // T022: Test clef mapping for treble clef (G clef on line 2)
    #[test]
    fn test_map_clef_treble() {
        assert_eq!(ElementMapper::map_clef("G", 2).unwrap(), Clef::Treble);
    }

    #[test]
    fn test_map_clef_bass() {
        assert_eq!(ElementMapper::map_clef("F", 4).unwrap(), Clef::Bass);
    }

    #[test]
    fn test_map_clef_alto() {
        assert_eq!(ElementMapper::map_clef("C", 3).unwrap(), Clef::Alto);
    }

    #[test]
    fn test_map_clef_tenor() {
        assert_eq!(ElementMapper::map_clef("C", 4).unwrap(), Clef::Tenor);
    }

    #[test]
    fn test_map_clef_unsupported() {
        let result = ElementMapper::map_clef("TAB", 1);
        assert!(result.is_err());
        match result.err().unwrap() {
            MappingError::UnsupportedClef { sign, line } => {
                assert_eq!(sign, "TAB");
                assert_eq!(line, 1);
            }
            _ => panic!("Expected UnsupportedClef error"),
        }
    }

    // T023: Test pitch mapping for middle C (MIDI 60)
    #[test]
    fn test_map_pitch_middle_c() {
        assert_eq!(ElementMapper::map_pitch('C', 4, 0).unwrap().value(), 60);
    }

    #[test]
    fn test_map_pitch_a440() {
        assert_eq!(ElementMapper::map_pitch('A', 4, 0).unwrap().value(), 69);
    }

    // T024: Test pitch mapping with alteration (C# = MIDI 61)
    #[test]
    fn test_map_pitch_c_sharp() {
        assert_eq!(ElementMapper::map_pitch('C', 4, 1).unwrap().value(), 61);
    }

    #[test]
    fn test_map_pitch_b_flat() {
        assert_eq!(ElementMapper::map_pitch('B', 4, -1).unwrap().value(), 70);
    }

    #[test]
    fn test_map_pitch_out_of_range() {
        let result = ElementMapper::map_pitch('C', 10, 0); // MIDI 132 > 127
        assert!(result.is_err());
    }

    #[test]
    fn test_map_pitch_invalid_step() {
        let result = ElementMapper::map_pitch('X', 4, 0);
        assert!(result.is_err());
        match result.err().unwrap() {
            MappingError::InvalidPitchStep(step) => {
                assert_eq!(step, 'X');
            }
            _ => panic!("Expected InvalidPitchStep error"),
        }
    }

    #[test]
    fn test_map_key_c_major() {
        let key = ElementMapper::map_key(0, None).unwrap();
        assert_eq!(key.sharps(), 0); // C major = 0 sharps/flats
    }

    #[test]
    fn test_map_key_g_major() {
        let key = ElementMapper::map_key(1, Some("major")).unwrap();
        assert_eq!(key.sharps(), 1); // G major = 1 sharp
    }

    #[test]
    fn test_map_key_f_major() {
        let key = ElementMapper::map_key(-1, Some("major")).unwrap();
        assert_eq!(key.sharps(), -1); // F major = 1 flat
    }

    #[test]
    fn test_map_key_a_minor() {
        // A minor has same key signature as C major (0 sharps/flats)
        let key = ElementMapper::map_key(0, Some("minor")).unwrap();
        assert_eq!(key.sharps(), 0);
    }

    #[test]
    fn test_map_key_d_minor() {
        // D minor has same key signature as F major (1 flat)
        let key = ElementMapper::map_key(-1, Some("minor")).unwrap();
        assert_eq!(key.sharps(), -1);
    }

    #[test]
    fn test_map_key_unsupported() {
        let result = ElementMapper::map_key(10, None); // 10 sharps is invalid
        assert!(result.is_err());
    }

    #[test]
    fn test_infer_clef_violin() {
        assert_eq!(
            ElementMapper::infer_clef_from_instrument("Violin"),
            Clef::Treble
        );
    }

    #[test]
    fn test_infer_clef_cello() {
        assert_eq!(
            ElementMapper::infer_clef_from_instrument("Cello"),
            Clef::Bass
        );
    }

    #[test]
    fn test_infer_clef_viola() {
        assert_eq!(
            ElementMapper::infer_clef_from_instrument("Viola"),
            Clef::Alto
        );
    }

    #[test]
    fn test_infer_clef_trombone() {
        assert_eq!(
            ElementMapper::infer_clef_from_instrument("Trombone"),
            Clef::Bass
        );
    }

    #[test]
    fn test_infer_clef_unknown() {
        assert_eq!(
            ElementMapper::infer_clef_from_instrument("Theremin"),
            Clef::Treble
        );
    }
}
