// Error types for MusicXML import - feature 006-musicxml-import

use thiserror::Error;

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
