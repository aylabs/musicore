// WASM Error Handling - Feature 011-wasm-music-engine
// Converts Rust domain errors to JavaScript-compatible error objects

use crate::domain::errors::DomainError;
use crate::domain::importers::musicxml::errors::ImportError;
use serde::Serialize;
use wasm_bindgen::JsValue;

/// Error type that can be serialized to JavaScript
#[derive(Serialize)]
pub struct WasmError {
    pub error: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl From<DomainError> for WasmError {
    fn from(e: DomainError) -> Self {
        match &e {
            DomainError::ValidationError(msg) => WasmError {
                error: "ValidationError".to_string(),
                message: msg.clone(),
                details: None,
            },
            DomainError::NotFound(msg) => WasmError {
                error: "NotFound".to_string(),
                message: msg.clone(),
                details: None,
            },
            DomainError::DuplicateError(msg) => WasmError {
                error: "DuplicateError".to_string(),
                message: msg.clone(),
                details: None,
            },
            DomainError::ConstraintViolation(msg) => WasmError {
                error: "ConstraintViolation".to_string(),
                message: msg.clone(),
                details: None,
            },
        }
    }
}

impl From<ImportError> for WasmError {
    fn from(e: ImportError) -> Self {
        match &e {
            ImportError::FileReadError { path, .. } => WasmError {
                error: "FileReadError".to_string(),
                message: format!("Failed to read file: {}", path),
                details: Some(serde_json::json!({ "path": path })),
            },
            ImportError::UnsupportedFileType { extension } => WasmError {
                error: "UnsupportedFileType".to_string(),
                message: format!("Unsupported file type: {}", extension),
                details: Some(serde_json::json!({ "extension": extension })),
            },
            ImportError::ParseError {
                line,
                column,
                message,
            } => WasmError {
                error: "ParseError".to_string(),
                message: message.clone(),
                details: Some(serde_json::json!({
                    "line": line,
                    "column": column,
                })),
            },
            ImportError::InvalidStructure { reason } => WasmError {
                error: "InvalidStructure".to_string(),
                message: reason.clone(),
                details: None,
            },
            ImportError::MappingError { context, .. } => WasmError {
                error: "MappingError".to_string(),
                message: context.clone(),
                details: None,
            },
            ImportError::ConversionError { context, .. } => WasmError {
                error: "ConversionError".to_string(),
                message: context.clone(),
                details: None,
            },
            ImportError::ValidationError { errors } => WasmError {
                error: "ValidationError".to_string(),
                message: format!("Validation failed with {} error(s)", errors.len()),
                details: Some(serde_json::json!({ "errors": errors })),
            },
            ImportError::CompressionError { message } => WasmError {
                error: "CompressionError".to_string(),
                message: message.clone(),
                details: None,
            },
        }
    }
}

/// Convert DomainError to JsValue for WASM boundary
pub fn to_js_error(e: DomainError) -> JsValue {
    let wasm_error: WasmError = e.into();
    serde_wasm_bindgen::to_value(&wasm_error)
        .unwrap_or_else(|_| JsValue::from_str("Serialization error"))
}

/// Convert ImportError to JsValue for WASM boundary
pub fn import_error_to_js(e: ImportError) -> JsValue {
    let wasm_error: WasmError = e.into();
    serde_wasm_bindgen::to_value(&wasm_error)
        .unwrap_or_else(|_| JsValue::from_str("Serialization error"))
}

/// Convert any error to JsValue
pub fn error_to_js<E: std::fmt::Display>(e: E) -> JsValue {
    let wasm_error = WasmError {
        error: "InternalError".to_string(),
        message: e.to_string(),
        details: None,
    };
    serde_wasm_bindgen::to_value(&wasm_error).unwrap_or_else(|_| JsValue::from_str(&e.to_string()))
}
