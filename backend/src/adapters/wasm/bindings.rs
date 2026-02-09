// WASM Bindings - Feature 011-wasm-music-engine
// Exports Rust functions to JavaScript using wasm-bindgen

use wasm_bindgen::prelude::*;
use crate::domain::importers::musicxml::{MusicXMLParser, MusicXMLConverter};
use super::error_handling::import_error_to_js;

// ============================================================================
// Phase 3: User Story 1 - MusicXML Parsing
// ============================================================================

/// Parse MusicXML content and return a Score
///
/// # Arguments
/// * `xml_content` - MusicXML file content as string
///
/// # Returns
/// * JsValue representing the parsed Score (serialized as JSON)
///
/// # Errors
/// * Returns JsValue error if parsing or conversion fails
#[wasm_bindgen]
pub fn parse_musicxml(xml_content: &str) -> Result<JsValue, JsValue> {
    // Parse XML into intermediate MusicXMLDocument
    let doc = MusicXMLParser::parse(xml_content)
        .map_err(import_error_to_js)?;
    
    // Convert MusicXMLDocument to domain Score
    let score = MusicXMLConverter::convert(doc)
        .map_err(import_error_to_js)?;
    
    // Serialize Score to JsValue for JavaScript
    serde_wasm_bindgen::to_value(&score)
        .map_err(|e| {
            JsValue::from_str(&format!("Serialization error: {}", e))
        })
}

// ============================================================================
// Phase 4: User Story 2 - Domain Operations
// ============================================================================

// WASM exports will be implemented in Phase 3 (User Story 1) and Phase 4 (User Story 2)
// This module provides the foundation for WASM function exports


