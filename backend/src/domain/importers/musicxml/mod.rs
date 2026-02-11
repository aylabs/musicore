// MusicXML import module - feature 006-musicxml-import

pub mod errors;
pub mod types;
pub mod timing;
pub mod mapper;
// Compression handler only for native (uses std::fs and zip, not available in WASM)
#[cfg(not(target_arch = "wasm32"))]
pub mod compression;
pub mod parser;
pub mod converter;

pub use errors::{ImportError, MappingError, ConversionError, ImportWarning, WarningSeverity, WarningCategory};
pub use types::*;
pub use timing::Fraction;
pub use mapper::ElementMapper;
#[cfg(not(target_arch = "wasm32"))]
pub use compression::CompressionHandler;
pub use parser::MusicXMLParser;
pub use converter::MusicXMLConverter;

/// Context for accumulating warnings during MusicXML import
///
/// Tracks the current parsing context (measure, instrument, staff) and
/// collects warnings without failing the import operation.
pub struct ImportContext {
    /// Accumulated warnings during import
    warnings: Vec<ImportWarning>,
    /// Current measure number (1-indexed)
    current_measure: Option<i32>,
    /// Current instrument name
    current_instrument: Option<String>,
    /// Current staff number (1-indexed)
    current_staff: Option<i32>,
    /// Count of skipped elements
    skipped_elements: usize,
}

impl ImportContext {
    /// Create a new import context
    pub fn new() -> Self {
        Self {
            warnings: Vec::new(),
            current_measure: None,
            current_instrument: None,
            current_staff: None,
            skipped_elements: 0,
        }
    }

    /// Add a warning with current context
    pub fn warn(&mut self, severity: WarningSeverity, category: WarningCategory, message: String) {
        let mut warning = ImportWarning::new(severity, category, message);
        
        // Apply current context
        if let Some(measure) = self.current_measure {
            warning = warning.with_measure(measure);
        }
        if let Some(ref instrument) = self.current_instrument {
            warning = warning.with_instrument(instrument.clone());
        }
        if let Some(staff) = self.current_staff {
            warning = warning.with_staff(staff);
        }
        
        self.warnings.push(warning);
    }

    /// Set current measure context
    pub fn set_measure(&mut self, measure_number: i32) {
        self.current_measure = Some(measure_number);
    }

    /// Set current instrument context
    pub fn set_instrument(&mut self, instrument_name: String) {
        self.current_instrument = Some(instrument_name);
    }

    /// Set current staff context
    pub fn set_staff(&mut self, staff_number: i32) {
        self.current_staff = Some(staff_number);
    }

    /// Clear context for new parsing scope
    pub fn clear_context(&mut self) {
        self.current_measure = None;
        self.current_instrument = None;
        self.current_staff = None;
    }

    /// Increment skipped element counter
    pub fn skip_element(&mut self) {
        self.skipped_elements += 1;
    }

    /// Get accumulated warnings count
    pub fn warning_count(&self) -> usize {
        self.warnings.len()
    }

    /// Get skipped elements count
    pub fn skipped_element_count(&self) -> usize {
        self.skipped_elements
    }

    /// Check if any Error-severity warnings exist (indicates partial import)
    pub fn has_partial_import(&self) -> bool {
        self.warnings.iter()
            .any(|w| matches!(w.severity, WarningSeverity::Error))
    }

    /// Consume context and return warnings
    pub fn finish(self) -> Vec<ImportWarning> {
        self.warnings
    }
}

impl Default for ImportContext {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(not(target_arch = "wasm32"))]
use std::path::Path;
#[cfg(not(target_arch = "wasm32"))]
use crate::ports::importers::{IMusicXMLImporter, ImportResult, ImportMetadata, ImportStatistics};
#[cfg(not(target_arch = "wasm32"))]
use crate::domain::score::Score;

/// Main service for MusicXML import operations (native only)
#[cfg(not(target_arch = "wasm32"))]
pub struct MusicXMLImporter;

#[cfg(not(target_arch = "wasm32"))]
impl MusicXMLImporter {
    /// Create a new MusicXML importer service
    pub fn new() -> Self {
        Self
    }

    /// Build ImportResult from a Score with warnings
    fn build_result(
        score: Score, 
        format: String, 
        file_name: Option<String>,
        warnings: Vec<ImportWarning>,
        skipped_element_count: usize,
    ) -> ImportResult {
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

        // Check if any Error-severity warnings exist (indicates partial import)
        let partial_import = warnings.iter()
            .any(|w| matches!(w.severity, WarningSeverity::Error));
        
        let warning_count = warnings.len();

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
                warning_count,
                skipped_element_count,
            },
            warnings,
            partial_import,
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl IMusicXMLImporter for MusicXMLImporter {
    fn import_file(&self, path: &Path) -> Result<ImportResult, Box<dyn std::error::Error>> {
        // Create import context for warning collection
        let mut context = ImportContext::new();
        
        // Load file content (handles both .xml and .mxl)
        let xml_content = CompressionHandler::load_content(path)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Get file name for metadata
        let file_name = path.file_name()
            .and_then(|name| name.to_str())
            .map(|s| s.to_string());
        
        // Parse XML to intermediate representation
        let doc = MusicXMLParser::parse(&xml_content, &mut context)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Store format for metadata
        let format = format!("MusicXML {}", doc.version);
        
        // Convert to domain Score
        let score = MusicXMLConverter::convert(doc, &mut context)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Extract warnings and counts from context
        let skipped_element_count = context.skipped_element_count();
        let warnings = context.finish();
        
        // Build result with metadata, statistics, and warnings
        Ok(Self::build_result(score, format, file_name, warnings, skipped_element_count))
    }

    fn import_content(&self, content: &str) -> Result<ImportResult, Box<dyn std::error::Error>> {
        // Create import context for warning collection
        let mut context = ImportContext::new();
        
        // Parse XML to intermediate representation
        let doc = MusicXMLParser::parse(content, &mut context)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Store format for metadata
        let format = format!("MusicXML {}", doc.version);
        
        // Convert to domain Score
        let score = MusicXMLConverter::convert(doc, &mut context)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        
        // Extract warnings and counts from context
        let skipped_element_count = context.skipped_element_count();
        let warnings = context.finish();
        
        // Build result with metadata, statistics, and warnings
        Ok(Self::build_result(score, format, None, warnings, skipped_element_count))
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl Default for MusicXMLImporter {
    fn default() -> Self {
        Self::new()
    }
}
