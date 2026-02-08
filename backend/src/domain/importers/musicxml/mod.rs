// MusicXML import module - feature 006-musicxml-import

pub mod errors;
pub mod types;
pub mod timing;
pub mod mapper;
pub mod compression;
pub mod parser;
pub mod converter;

pub use errors::{ImportError, MappingError, ConversionError};
pub use types::*;
pub use timing::Fraction;
pub use mapper::ElementMapper;
pub use compression::CompressionHandler;
pub use parser::MusicXMLParser;
pub use converter::MusicXMLConverter;

use std::path::Path;
use crate::ports::importers::{IMusicXMLImporter, ImportResult, ImportMetadata, ImportStatistics};
use crate::domain::score::Score;

/// Main service for MusicXML import operations
pub struct MusicXMLImporter;

impl MusicXMLImporter {
    /// Create a new MusicXML importer service
    pub fn new() -> Self {
        Self
    }

    /// Build ImportResult from a Score
    fn build_result(score: Score, format: String, file_name: Option<String>) -> ImportResult {
        // Calculate statistics
        let instrument_count = score.instruments.len();
        let staff_count = score.instruments.iter()
            .map(|inst| inst.staves.len())
            .sum();
        let voice_count = score.instruments.iter()
            .flat_map(|inst| &inst.staves)
            .map(|staff| staff.voices.len())
            .sum();
        let note_count = score.instruments.iter()
            .flat_map(|inst| &inst.staves)
            .flat_map(|staff| &staff.voices)
            .map(|voice| voice.interval_events.len())
            .sum();
        
        // Calculate duration (max end_tick across all notes)
        let duration_ticks = score.instruments.iter()
            .flat_map(|inst| &inst.staves)
            .flat_map(|staff| &staff.voices)
            .flat_map(|voice| &voice.interval_events)
            .map(|note| note.end_tick().value())
            .max()
            .unwrap_or(0);

        ImportResult {
            score,
            metadata: ImportMetadata {
                format,
                file_name,
                work_title: None,  // TODO: Extract from MusicXML metadata
                composer: None,    // TODO: Extract from MusicXML metadata
            },
            statistics: ImportStatistics {
                instrument_count,
                staff_count,
                voice_count,
                note_count,
                duration_ticks,
            },
            warnings: Vec::new(),  // TODO: Collect warnings during conversion
        }
    }
}

impl IMusicXMLImporter for MusicXMLImporter {
    fn import_file(&self, path: &Path) -> Result<ImportResult, Box<dyn std::error::Error>> {
        // Load file content (handles both .xml and .mxl)
        let xml_content = CompressionHandler::load_content(path)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Get file name for metadata
        let file_name = path.file_name()
            .and_then(|name| name.to_str())
            .map(|s| s.to_string());
        
        // Parse XML to intermediate representation
        let doc = MusicXMLParser::parse(&xml_content)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Store format for metadata
        let format = format!("MusicXML {}", doc.version);
        
        // Convert to domain Score
        let score = MusicXMLConverter::convert(doc)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Build result with metadata and statistics
        Ok(Self::build_result(score, format, file_name))
    }

    fn import_content(&self, content: &str) -> Result<ImportResult, Box<dyn std::error::Error>> {
        // Parse XML to intermediate representation
        let doc = MusicXMLParser::parse(content)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Store format for metadata
        let format = format!("MusicXML {}", doc.version);
        
        // Convert to domain Score
        let score = MusicXMLConverter::convert(doc)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Build result with metadata and statistics
        Ok(Self::build_result(score, format, None))
    }
}

impl Default for MusicXMLImporter {
    fn default() -> Self {
        Self::new()
    }
}
