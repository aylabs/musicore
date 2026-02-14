// Error types for MusicXML import - feature 006-musicxml-import

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Severity level of an import warning
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WarningSeverity {
    /// Informational: Defaults applied, non-critical adjustments
    Info,
    /// Warning: Recovered errors, structural issues requiring review
    Warning,
    /// Error: Partial failures, skipped content requiring attention
    Error,
}

/// Category classification for warning grouping
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WarningCategory {
    /// Same-pitch notes overlapping in single voice, split into multiple voices
    OverlapResolution,
    /// Required elements absent (tempo, time signature, clef), defaults applied
    MissingElements,
    /// Malformed XML, encoding problems, skipped elements
    StructuralIssues,
    /// Content skipped due to unrecoverable errors (instrument truncation, etc.)
    PartialImport,
}

/// Non-fatal issue encountered during MusicXML import
///
/// Provides detailed, actionable feedback about recovered errors,
/// applied defaults, and skipped content without failing the import operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportWarning {
    /// Impact level: Info, Warning, or Error
    pub severity: WarningSeverity,
    /// Classification for UI grouping and filtering
    pub category: WarningCategory,
    /// Human-readable description of the issue and resolution
    pub message: String,
    /// Specific measure context (1-indexed), if applicable
    pub measure_number: Option<i32>,
    /// Instrument context (e.g., "Piano - Right Hand"), if applicable
    pub instrument_name: Option<String>,
    /// Staff within instrument (1-indexed), if applicable
    pub staff_number: Option<i32>,
    /// Voice within staff (1-indexed), if applicable
    pub voice_number: Option<i32>,
}

impl ImportWarning {
    /// Create a new warning with required fields
    pub fn new(severity: WarningSeverity, category: WarningCategory, message: String) -> Self {
        Self {
            severity,
            category,
            message,
            measure_number: None,
            instrument_name: None,
            staff_number: None,
            voice_number: None,
        }
    }

    /// Set measure context (builder pattern)
    pub fn with_measure(mut self, measure_number: i32) -> Self {
        self.measure_number = Some(measure_number);
        self
    }

    /// Set instrument context (builder pattern)
    pub fn with_instrument(mut self, instrument_name: String) -> Self {
        self.instrument_name = Some(instrument_name);
        self
    }

    /// Set staff context (builder pattern)
    pub fn with_staff(mut self, staff_number: i32) -> Self {
        self.staff_number = Some(staff_number);
        self
    }

    /// Set voice context (builder pattern)
    pub fn with_voice(mut self, voice_number: i32) -> Self {
        self.voice_number = Some(voice_number);
        self
    }
}

/// Error during MusicXML import
#[derive(Error, Debug)]
pub enum ImportError {
    /// File not found or cannot be read
    #[error("File read error: {path}")]
    FileReadError {
        path: String,
        #[source]
        source: std::io::Error,
    },

    /// Unsupported file extension    
    #[error("Unsupported file type: {extension}")]
    UnsupportedFileType { extension: String },

    /// XML parsing error
    #[error("XML parse error at line {line}, column {column}: {message}")]
    ParseError {
        line: usize,
        column: usize,
        message: String,
    },

    /// Invalid MusicXML structure
    #[error("Invalid MusicXML structure: {reason}")]
    InvalidStructure { reason: String },

    /// Element mapping error
    #[error("Element mapping error: {context}")]
    MappingError {
        context: String,
        #[source]
        source: MappingError,
    },

    /// Timing conversion error
    #[error("Timing conversion error: {context}")]
    ConversionError {
        context: String,
        #[source]
        source: ConversionError,
    },

    /// Domain validation error (score doesn't satisfy invariants)
    #[error("Domain validation failed")]
    ValidationError { errors: Vec<String> },

    /// ZIP/compression error
    #[error("Compression error: {message}")]
    CompressionError { message: String },
}

/// Error during element mapping
#[derive(Error, Debug)]
pub enum MappingError {
    /// Unsupported clef type
    #[error("Unsupported clef: sign={sign}, line={line}")]
    UnsupportedClef { sign: String, line: i32 },

    /// Invalid pitch step (must be A-G)
    #[error("Invalid pitch step: {0}")]
    InvalidPitchStep(char),

    /// MIDI pitch out of range (0-127)
    #[error("Pitch out of range: MIDI {midi} (step={step}, octave={octave}, alter={alter})")]
    PitchOutOfRange {
        midi: i32,
        step: char,
        octave: i32,
        alter: i32,
    },

    /// Unsupported key signature
    #[error("Unsupported key signature: fifths={fifths}, mode={mode}")]
    UnsupportedKey { fifths: i32, mode: String },
}

/// Error during timing conversion
#[derive(Error, Debug)]
pub enum ConversionError {
    /// Division value is invalid (must be positive)
    #[error("Invalid divisions value: {divisions}")]
    InvalidDivisions { divisions: i32 },

    /// Duration cannot be represented in 960 PPQ
    #[error("Unrepresentable duration: {numerator}/{denominator}")]
    UnrepresentableDuration { numerator: i64, denominator: i64 },

    /// Tick value overflow (exceeds i32 range)
    #[error("Tick overflow: {value}")]
    TickOverflow { value: i64 },
}

impl From<std::io::Error> for ImportError {
    fn from(err: std::io::Error) -> Self {
        ImportError::FileReadError {
            path: "unknown".to_string(),
            source: err,
        }
    }
}

impl From<quick_xml::Error> for ImportError {
    fn from(err: quick_xml::Error) -> Self {
        ImportError::ParseError {
            line: 0,
            column: 0,
            message: err.to_string(),
        }
    }
}

// ZIP error conversion only for native (zip crate not available in WASM)
#[cfg(not(target_arch = "wasm32"))]
impl From<zip::result::ZipError> for ImportError {
    fn from(err: zip::result::ZipError) -> Self {
        ImportError::CompressionError {
            message: err.to_string(),
        }
    }
}

impl From<ConversionError> for ImportError {
    fn from(err: ConversionError) -> Self {
        ImportError::ConversionError {
            context: "Timing conversion".to_string(),
            source: err,
        }
    }
}

impl From<MappingError> for ImportError {
    fn from(err: MappingError) -> Self {
        ImportError::MappingError {
            context: "Element mapping".to_string(),
            source: err,
        }
    }
}

impl From<crate::domain::errors::DomainError> for ImportError {
    fn from(err: crate::domain::errors::DomainError) -> Self {
        ImportError::ValidationError {
            errors: vec![err.to_string()],
        }
    }
}
