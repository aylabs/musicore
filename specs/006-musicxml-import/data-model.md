# Data Model: MusicXML Import

**Feature**: 006-musicxml-import  
**Phase**: Phase 1 - Design  
**Date**: 2026-02-08  

## Overview

This document defines the data structures for importing MusicXML files exported by MuseScore and converting them to musicore's domain model.

## Import Pipeline Types

### MusicXMLDocument (Intermediate Representation)

Parsed MusicXML structure before domain conversion.

```rust
/// Raw MusicXML document structure after parsing
pub struct MusicXMLDocument {
    /// Document format version (e.g., "3.1", "4.0")
    pub version: String,
    
    /// Encoding metadata
    pub encoding: EncodingMetadata,
    
    /// List of parts (instruments) in the score
    pub parts: Vec<PartData>,
    
    /// Default tempo if not specified in parts (defaults to 120 BPM)
    pub default_tempo: f64,
}

/// Metadata from <encoding> element
pub struct EncodingMetadata {
    pub software: Option<String>,  // e.g., "MuseScore 4.2.1"
    pub encoding_date: Option<String>,
    pub supports: Vec<String>,     // MusicXML feature flags
}

/// Represents a <part> element (single instrument)
pub struct PartData {
    /// Part ID (e.g., "P1", "P2")
    pub id: String,
    
    /// Instrument name (e.g., "Piano", "Violin", "Flute")
    pub name: String,
    
    /// List of measures in this part
    pub measures: Vec<MeasureData>,
    
    /// Number of staves (1 for single staff, 2 for grand staff, etc.)
    pub staff_count: usize,
}

/// Represents a <measure> element
pub struct MeasureData {
    /// Measure number (1-indexed)
    pub number: i32,
    
    /// Timing context from <attributes> element
    pub attributes: Option<AttributesData>,
    
    /// All elements in this measure (notes, rests, etc.)
    pub elements: Vec<MeasureElement>,
}

/// Timing and notation attributes from <attributes> element
pub struct AttributesData {
    /// Divisions (ticks per quarter note in source file)
    pub divisions: Option<i32>,
    
    /// Key signature
    pub key: Option<KeyData>,
    
    /// Time signature
    pub time: Option<TimeSignatureData>,
    
    /// Clefs for each staff (indexed by staff number - 1)
    pub clefs: Vec<ClefData>,
    
    /// Tempo marking
    pub tempo: Option<f64>,
}

/// Key signature from <key> element
pub struct KeyData {
    /// Circle of fifths (-7 to +7, 0 = C/Am)
    pub fifths: i32,
    
    /// Mode: "major", "minor", etc.
    pub mode: String,
}

/// Time signature from <time> element
pub struct TimeSignatureData {
    /// Numerator (beats per measure)
    pub beats: i32,
    
    /// Denominator (note value that gets the beat)
    pub beat_type: i32,
}

/// Clef from <clef> element
pub struct ClefData {
    /// Staff number (1-indexed, 1 = first staff)
    pub staff_number: usize,
    
    /// Clef sign: "G", "F", "C", etc.
    pub sign: String,
    
    /// Staff line the clef is placed on
    pub line: i32,
}

/// Element within a measure (note, rest, or other)
pub enum MeasureElement {
    Note(NoteData),
    Rest(RestData),
    Backup(i32),  // Move timing backward by N duration units
    Forward(i32), // Move timing forward by N duration units (rest in voice)
}

/// Note from <note> element
pub struct NoteData {
    /// Pitch information (None for unpitched percussion)
    pub pitch: Option<PitchData>,
    
    /// Duration in source file's divisions units
    pub duration: i32,
    
    /// Voice number (1-indexed, defaults to 1)
    pub voice: usize,
    
    /// Staff number (1-indexed, defaults to 1)
    pub staff: usize,
    
    /// Note type (e.g., "quarter", "eighth", "half")
    pub note_type: Option<String>,
    
    /// Is this a chord note? (starts at same time as previous note)
    pub is_chord: bool,
}

/// Pitch from <pitch> element
pub struct PitchData {
    /// Step: 'C', 'D', 'E', 'F', 'G', 'A', 'B'
    pub step: char,
    
    /// Octave (C4 = middle C)
    pub octave: i32,
    
    /// Alteration: -2 (double flat), -1 (flat), 0 (natural), 1 (sharp), 2 (double sharp)
    pub alter: i32,
}

/// Rest from <note> element with <rest/> child
pub struct RestData {
    /// Duration in source file's divisions units
    pub duration: i32,
    
    /// Voice number
    pub voice: usize,
    
    /// Staff number
    pub staff: usize,
}
```

---

## Timing Conversion Types

### TimingContext

Maintains state during timing conversion from MusicXML divisions to 960 PPQ.

```rust
/// Context for converting MusicXML timing to 960 PPQ ticks
pub struct TimingContext {
    /// Source file's divisions (ticks per quarter note)
    pub source_divisions: i32,
    
    /// Current absolute tick position in musicore 960 PPQ
    pub current_tick: i64,
    
    /// Tick position at the start of current measure
    pub measure_start_tick: i64,
    
    /// Current measure number (1-indexed)
    pub current_measure: i32,
    
    /// Warnings collected during conversion
    pub warnings: Vec<TimingWarning>,
}

impl TimingContext {
    /// Convert MusicXML duration to 960 PPQ ticks using rational arithmetic
    pub fn convert_duration(&mut self, source_duration: i32) -> Result<i32, ConversionError> {
        let fraction = Fraction::from_musicxml(source_duration, self.source_divisions);
        let ticks = fraction.to_ticks()?;
        
        if fraction.denominator != 1 {
            // Rounding occurred - log precision warning
            self.warnings.push(TimingWarning::PrecisionLoss {
                measure: self.current_measure,
                original: fraction,
                rounded: ticks,
            });
        }
        
        Ok(ticks)
    }
    
    /// Advance current tick position by duration
    pub fn advance(&mut self, duration_ticks: i32) {
        self.current_tick += duration_ticks as i64;
    }
    
    /// Move to next measure
    pub fn next_measure(&mut self, time_signature: &TimeSignature) {
        // Calculate measure duration from time signature
        let measure_ticks = (960 * 4 * time_signature.numerator) / time_signature.denominator;
        self.measure_start_tick += measure_ticks as i64;
        self.current_tick = self.measure_start_tick;
        self.current_measure += 1;
    }
}

/// Rational fraction for lossless timing conversion
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
            Ok(self.numerator as i32)
        } else {
            // Round to nearest integer
            let rounded = (self.numerator + self.denominator / 2) / self.denominator;
            Ok(rounded as i32)
        }
    }
}

/// Warning about timing conversion precision loss
pub enum TimingWarning {
    PrecisionLoss {
        measure: i32,
        original: Fraction,
        rounded: i32,
    },
    UnsupportedDivisions {
        divisions: i32,
        suggestion: String,
    },
}
```

---

## Domain Conversion Types

### ImportResult

Result of importing and converting a MusicXML file.

```rust
/// Result of MusicXML import operation
pub struct ImportResult {
    /// Successfully converted score
    pub score: Score,
    
    /// Metadata about the import
    pub metadata: ImportMetadata,
    
    /// Non-fatal warnings collected during import
    pub warnings: Vec<ImportWarning>,
    
    /// Statistics about the import
    pub statistics: ImportStatistics,
}

/// Metadata about the imported file
pub struct ImportMetadata {
    /// Source file name
    pub file_name: String,
    
    /// MusicXML version
    pub version: String,
    
    /// Source software (e.g., "MuseScore 4.2.1")
    pub source_software: Option<String>,
    
    /// Import timestamp
    pub imported_at: String,  // ISO 8601 format
    
    /// Source file's divisions value
    pub source_divisions: i32,
}

/// Warning during import (non-fatal)
pub enum ImportWarning {
    /// Element type not supported, skipped
    UnsupportedElement {
        element_type: String,
        measure: i32,
        context: String,
    },
    
    /// Timing conversion required rounding
    TimingPrecisionLoss {
        measure: i32,
        note_count: usize,
        max_error_ticks: i32,
    },
    
    /// Attribute missing, using default
    MissingAttribute {
        attribute: String,
        default_value: String,
        location: String,
    },
    
    /// Large file warning
    LargeFile {
        size_mb: f64,
        note_count: usize,
        import_duration_ms: u64,
    },
}

/// Statistics about imported content
pub struct ImportStatistics {
    /// Total notes imported
    pub note_count: usize,
    
    /// Total instruments
    pub instrument_count: usize,
    
    /// Total staves across all instruments
    pub staff_count: usize,
    
    /// Total voices across all staves
    pub voice_count: usize,
    
    /// Total measures
    pub measure_count: i32,
    
    /// Import duration
    pub import_duration_ms: u64,
    
    /// Warnings count by type
    pub warning_counts: std::collections::HashMap<String, usize>,
}
```

---

## Element Mapping Types

### ElementMapper

Handles conversion of MusicXML string values to musicore enums.

```rust
/// Maps MusicXML element values to musicore domain types
pub struct ElementMapper;

impl ElementMapper {
    /// Map MusicXML clef to ClefType
    pub fn map_clef(sign: &str, line: i32) -> Result<ClefType, MappingError> {
        match (sign, line) {
            ("G", 2) => Ok(ClefType::Treble),
            ("F", 4) => Ok(ClefType::Bass),
            ("C", 3) => Ok(ClefType::Alto),
            ("C", 4) => Ok(ClefType::Tenor),
            _ => Err(MappingError::UnsupportedClef {
                sign: sign.to_string(),
                line,
            }),
        }
    }
    
    /// Map MusicXML key signature to KeySignature
    pub fn map_key(fifths: i32, mode: &str) -> Result<KeySignature, MappingError> {
        match (fifths, mode) {
            (0, "major") => Ok(KeySignature::CMajor),
            (0, "minor") => Ok(KeySignature::AMinor),
            (1, "major") => Ok(KeySignature::GMajor),
            (-1, "major") => Ok(KeySignature::FMajor),
            // ... full circle of fifths mapping (24 total keys)
            _ => Err(MappingError::UnsupportedKey { fifths, mode: mode.to_string() }),
        }
    }
    
    /// Map MusicXML pitch to MIDI number (0-127)
    pub fn map_pitch(step: char, octave: i32, alter: i32) -> Result<u8, MappingError> {
        let base_pitch = match step {
            'C' => 0, 'D' => 2, 'E' => 4, 'F' => 5,
            'G' => 7, 'A' => 9, 'B' => 11,
            _ => return Err(MappingError::InvalidPitchStep(step)),
        };
        
        let midi = (octave + 1) * 12 + base_pitch + alter;
        
        if midi < 0 || midi > 127 {
            Err(MappingError::PitchOutOfRange { midi, step, octave, alter })
        } else {
            Ok(midi as u8)
        }
    }
    
    /// Infer default clef from instrument name if clef missing
    pub fn infer_clef_from_instrument(instrument_name: &str) -> ClefType {
        let lower = instrument_name.to_lowercase();
        if lower.contains("bass") || lower.contains("cello") || lower.contains("trombone") {
            ClefType::Bass
        } else if lower.contains("viola") {
            ClefType::Alto
        } else {
            ClefType::Treble  // Default
        }
    }
}

/// Error during element mapping
pub enum MappingError {
    UnsupportedClef { sign: String, line: i32 },
    UnsupportedKey { fifths: i32, mode: String },
    InvalidPitchStep(char),
    PitchOutOfRange { midi: i32, step: char, octave: i32, alter: i32 },
}
```

---

## Compression Handling Types

### CompressionHandler

Handles .mxl (compressed MusicXML) file format.

```rust
/// Handles decompression of .mxl files (ZIP format)
pub struct CompressionHandler;

impl CompressionHandler {
    /// Load MusicXML content from file (handles both .mxl and .musicxml)
    pub fn load_content(file_path: &Path) -> Result<String, ImportError> {
        match file_path.extension().and_then(|s| s.to_str()) {
            Some("mxl") => Self::load_compressed(file_path),
            Some("musicxml") | Some("xml") => Self::load_uncompressed(file_path),
            _ => Err(ImportError::UnsupportedFileType {
                extension: file_path.extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("none")
                    .to_string(),
            }),
        }
    }
    
    /// Load compressed .mxl file
    fn load_compressed(file_path: &Path) -> Result<String, ImportError> {
        let file = File::open(file_path)?;
        let mut archive = ZipArchive::new(file)?;
        
        // Read container manifest
        let manifest = Self::read_container_manifest(&mut archive)?;
        
        // Extract main score file
        let mut score_file = archive.by_name(&manifest.rootfile_path)?;
        let mut content = String::new();
        score_file.read_to_string(&mut content)?;
        
        Ok(content)
    }
    
    /// Load uncompressed .musicxml/.xml file
    fn load_uncompressed(file_path: &Path) -> Result<String, ImportError> {
        fs::read_to_string(file_path).map_err(|e| ImportError::FileReadError {
            path: file_path.to_path_buf(),
            error: e.to_string(),
        })
    }
    
    /// Parse META-INF/container.xml to find main score file
    fn read_container_manifest(archive: &mut ZipArchive<File>) -> Result<ContainerManifest, ImportError> {
        let mut container_file = archive.by_name("META-INF/container.xml")?;
        let mut content = String::new();
        container_file.read_to_string(&mut content)?;
        
        // Parse container.xml to extract rootfile path
        // (simplified - actual implementation would parse XML)
        Ok(ContainerManifest {
            rootfile_path: "score.musicxml".to_string(),  // Extract from XML
        })
    }
}

/// Manifest from META-INF/container.xml in .mxl file
struct ContainerManifest {
    /// Path to main MusicXML file within archive
    pub rootfile_path: String,
}
```

---

## Error Types

```rust
/// Error during MusicXML import
pub enum ImportError {
    /// File not found or cannot be read
    FileReadError { path: PathBuf, error: String },
    
    /// Unsupported file extension
    UnsupportedFileType { extension: String },
    
    /// XML parsing error
    ParseError { line: usize, column: usize, message: String },
    
    /// Invalid MusicXML structure
    InvalidStructure { reason: String },
    
    /// Element mapping error
    MappingError { error: MappingError, context: String },
    
    /// Timing conversion error
    ConversionError { error: ConversionError, context: String },
    
    /// Domain validation error (score doesn't satisfy invariants)
    ValidationError { errors: Vec<String> },
    
    /// ZIP/compression error
    CompressionError { message: String },
}

/// Error during timing conversion
pub enum ConversionError {
    /// Division value is invalid
    InvalidDivisions { divisions: i32 },
    
    /// Duration cannot be represented in 960 PPQ
    UnrepresentableDuration { fraction: Fraction },
    
    /// Tick value overflow
    TickOverflow { value: i64 },
}
```

---

## Domain Model Mapping

### MusicXML → Musicore Domain Entities

| MusicXML Element | Musicore Entity | Conversion Notes |
|------------------|-----------------|------------------|
| `<part>` | `Instrument` | Part name → instrument name |
| `<staff>` (attribute) | `Staff` | Staff number → staff index |
| `<voice>` | `Voice` | Voice number → voice index |
| `<note>` | `NoteEvent` | Pitch + duration → tick + MIDI |
| `<attributes><divisions>` | `TimingContext` | Convert to 960 PPQ using rational arithmetic |
| `<attributes><key>` | `KeySignatureEvent` | Fifths + mode → KeySignature enum |
| `<attributes><time>` | `TimeSignatureEvent` | Beats + beat-type → TimeSignature |
| `<attributes><clef>` | `ClefEvent` | Sign + line → ClefType enum |
| `<sound tempo>` | `TempoEvent` | BPM value directly |
| `<measure>` | Tick grouping | Calculate barline positions, not stored as entity |

---

## Validation Rules

After conversion, the imported `Score` must satisfy all domain invariants:

1. **Timing Consistency**: All event ticks must be non-negative and monotonically increasing within each voice
2. **Instrument Hierarchy**: Score → Instrument → Staff → Voice (no empty containers)
3. **Clef Continuity**: Each staff must have a clef at tick 0
4. **Time Signature**: At least one time signature event at tick 0
5. **Key Signature**: At least one key signature event at tick 0
6. **MIDI Range**: All note MIDI values must be 0-127
7. **Duration Validity**: All note durations must be positive integers

The domain validation layer will reject any imported score that violates these invariants.

---

## Next Steps

✅ Data model complete

**Proceed to**: Generate contracts/ directory with API specifications
