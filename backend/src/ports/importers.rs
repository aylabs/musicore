// Port for MusicXML import - feature 006-musicxml-import

use std::path::Path;
use crate::domain::score::Score;
use serde::{Deserialize, Serialize};

/// Result type for import operations with metadata and warnings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    /// Successfully imported score
    pub score: Score,
    /// Import metadata (file format, version, etc.)
    pub metadata: ImportMetadata,
    /// Import statistics (note count, duration, etc.)
    pub statistics: ImportStatistics,
    /// Non-fatal warnings during import
    pub warnings: Vec<ImportWarning>,
}

/// Metadata about the imported file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportMetadata {
    /// Original file format (e.g., "MusicXML 3.1")
    pub format: String,
    /// Original file name (if available)
    pub file_name: Option<String>,
    /// Work title from MusicXML metadata
    pub work_title: Option<String>,
    /// Composer from MusicXML metadata
    pub composer: Option<String>,
}

/// Statistics about the imported score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportStatistics {
    /// Number of instruments
    pub instrument_count: usize,
    /// Number of staves across all instruments
    pub staff_count: usize,
    /// Number of voices across all staves
    pub voice_count: usize,
    /// Total number of notes
    pub note_count: usize,
    /// Score duration in ticks
    pub duration_ticks: u32,
}

/// Non-fatal warning during import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportWarning {
    /// Warning message
    pub message: String,
    /// Context (e.g., "measure 5, voice 2")
    pub context: Option<String>,
}

/// Port for MusicXML import functionality
pub trait IMusicXMLImporter {
    /// Import MusicXML from file path (.xml or .mxl)
    ///
    /// # Arguments
    /// * `path` - Path to MusicXML file
    ///
    /// # Returns
    /// ImportResult with score, metadata, statistics, and warnings
    ///
    /// # Errors
    /// Returns error if file cannot be read, parsed, or converted
    fn import_file(&self, path: &Path) -> Result<ImportResult, Box<dyn std::error::Error>>;

    /// Import MusicXML from string content (for API usage)
    ///
    /// # Arguments
    /// * `content` - MusicXML content as string
    ///
    /// # Returns
    /// ImportResult with score, metadata, statistics, and warnings
    ///
    /// # Errors
    /// Returns error if content cannot be parsed or converted
    fn import_content(&self, content: &str) -> Result<ImportResult, Box<dyn std::error::Error>>;
}
