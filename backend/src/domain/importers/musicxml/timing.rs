// Timing conversion for MusicXML divisions to 960 PPQ - feature 006-musicxml-import

use super::errors::ConversionError;

/// Rational fraction for lossless timing conversion
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Fraction {
    pub numerator: i64,
    pub denominator: i64,
}

impl Fraction {
    /// Create fraction for MusicXML duration → 960 PPQ conversion
    pub fn from_musicxml(duration: i32, source_divisions: i32) -> Self {
        let numerator = duration as i64 * 960;
        let denominator = source_divisions as i64;
        Self::new(numerator, denominator).normalize()
    }

    /// Create a new fraction
    pub fn new(numerator: i64, denominator: i64) -> Self {
        Self {
            numerator,
            denominator,
        }
    }

    /// Reduce to lowest terms using GCD
    fn normalize(self) -> Self {
        let gcd = gcd(self.numerator, self.denominator);
        Fraction {
            numerator: self.numerator / gcd,
            denominator: self.denominator / gcd,
        }
    }

    /// Convert to integer ticks (may require rounding)
    pub fn to_ticks(&self) -> Result<i32, ConversionError> {
        if self.denominator == 1 {
            // Exact conversion
            if self.numerator > i32::MAX as i64 || self.numerator < i32::MIN as i64 {
                return Err(ConversionError::TickOverflow {
                    value: self.numerator,
                });
            }
            Ok(self.numerator as i32)
        } else {
            // Round to nearest integer
            let rounded = (self.numerator + self.denominator / 2) / self.denominator;
            if rounded > i32::MAX as i64 || rounded < i32::MIN as i64 {
                return Err(ConversionError::TickOverflow { value: rounded });
            }
            Ok(rounded as i32)
        }
    }

    /// Check if rounding is required (denominator != 1)
    pub fn requires_rounding(&self) -> bool {
        self.denominator != 1
    }
}

/// Compute greatest common divisor using Euclidean algorithm
fn gcd(a: i64, b: i64) -> i64 {
    let a = a.abs();
    let b = b.abs();
    if b == 0 { a } else { gcd(b, a % b) }
}

#[cfg(test)]
mod tests {
    use super::*;

    // T015: Test quarter note with 480 divisions
    #[test]
    fn test_quarter_note_480_divisions() {
        // divisions=480, quarter note duration=480
        // Expected: (480 * 960) / 480 = 960 ticks (exact)
        let fraction = Fraction::from_musicxml(480, 480);
        assert_eq!(fraction.numerator, 960);
        assert_eq!(fraction.denominator, 1);
        assert_eq!(fraction.to_ticks().unwrap(), 960);
        assert!(!fraction.requires_rounding());
    }

    // T016: Test triplet eighth with 768 divisions
    #[test]
    fn test_triplet_eighth_768_divisions() {
        // divisions=768, triplet eighth=256 (1/3 of quarter note at 768 divisions)
        // Expected: (256 * 960) / 768 = 245760 / 768 = 320 ticks (exact after normalization)
        let fraction = Fraction::from_musicxml(256, 768);

        // After normalization, should be 320/1 (exact)
        assert_eq!(fraction.numerator, 320);
        assert_eq!(fraction.denominator, 1);
        assert_eq!(fraction.to_ticks().unwrap(), 320);
        assert!(!fraction.requires_rounding());
    }

    #[test]
    fn test_half_note_480_divisions() {
        // divisions=480, half note duration=960
        // Expected: (960 * 960) / 480 = 1920 ticks
        let fraction = Fraction::from_musicxml(960, 480);
        assert_eq!(fraction.to_ticks().unwrap(), 1920);
    }

    #[test]
    fn test_whole_note_480_divisions() {
        // divisions=480, whole note duration=1920
        // Expected: (1920 * 960) / 480 = 3840 ticks
        let fraction = Fraction::from_musicxml(1920, 480);
        assert_eq!(fraction.to_ticks().unwrap(), 3840);
    }

    #[test]
    fn test_eighth_note_480_divisions() {
        // divisions=480, eighth note duration=240
        // Expected: (240 * 960) / 480 = 480 ticks
        let fraction = Fraction::from_musicxml(240, 480);
        assert_eq!(fraction.to_ticks().unwrap(), 480);
    }

    #[test]
    fn test_gcd() {
        assert_eq!(gcd(48, 18), 6);
        assert_eq!(gcd(100, 50), 50);
        assert_eq!(gcd(7, 3), 1);
        assert_eq!(gcd(0, 5), 5);
        assert_eq!(gcd(5, 0), 5);
    }

    #[test]
    fn test_normalization() {
        let fraction = Fraction::new(480, 240).normalize();
        assert_eq!(fraction.numerator, 2);
        assert_eq!(fraction.denominator, 1);
    }

    #[test]
    fn test_rounding_detection() {
        let exact = Fraction::new(960, 1);
        assert!(!exact.requires_rounding());

        let needs_rounding = Fraction::new(961, 3);
        assert!(needs_rounding.requires_rounding());
    }
}
