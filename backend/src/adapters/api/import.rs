use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use std::sync::Arc;

use crate::domain::importers::musicxml::MusicXMLImporter;
use crate::ports::importers::{IMusicXMLImporter};
use crate::ports::persistence::ScoreRepository;

/// Application state with repository
pub type AppState = Arc<dyn ScoreRepository + Send + Sync>;

/// Maximum file size for MusicXML import (10MB)
const MAX_FILE_SIZE: usize = 10 * 1024 * 1024;

#[derive(Debug, Serialize)]
pub struct ImportErrorResponse {
    pub error: String,
    pub details: Option<String>,
}

/// POST /api/v1/scores/import-musicxml - Import MusicXML file
///
/// Accepts multipart/form-data with a "file" field containing .musicxml, .xml, or .mxl file
///
/// Returns: 200 OK with ImportResult JSON on success
///
/// Error responses:
/// - 400 Bad Request: Missing or invalid file field
/// - 413 Payload Too Large: File exceeds 10MB
/// - 422 Unprocessable Entity: Invalid MusicXML or validation error
/// - 500 Internal Server Error: Unexpected errors
pub async fn import_musicxml(
    State(repo): State<AppState>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    // T058: Extract file bytes from multipart form field "file"
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let field_name = field.name().unwrap_or("").to_string();

        if field_name == "file" {
            filename = field.file_name().map(|s| s.to_string());

            match field.bytes().await {
                Ok(data) => {
                    // Check file size (T060: Handle file too large error)
                    if data.len() > MAX_FILE_SIZE {
                        return (
                            StatusCode::PAYLOAD_TOO_LARGE,
                            Json(ImportErrorResponse {
                                error: format!(
                                    "File too large: {} bytes exceeds maximum of {} bytes (10MB)",
                                    data.len(),
                                    MAX_FILE_SIZE
                                ),
                                details: None,
                            }),
                        )
                            .into_response();
                    }

                    file_bytes = Some(data.to_vec());
                    break;
                }
                Err(e) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(ImportErrorResponse {
                            error: "Failed to read file data".to_string(),
                            details: Some(e.to_string()),
                        }),
                    )
                        .into_response();
                }
            }
        }
    }

    // Validate file field was provided
    let bytes = match file_bytes {
        Some(b) => b,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ImportErrorResponse {
                    error: "Missing 'file' field in multipart form".to_string(),
                    details: Some(
                        "Expected multipart/form-data with a 'file' field containing MusicXML file"
                            .to_string(),
                    ),
                }),
            )
                .into_response();
        }
    };

    // Validate file extension
    if let Some(fname) = &filename {
        let valid_extensions = [".musicxml", ".xml", ".mxl"];
        let has_valid_ext = valid_extensions
            .iter()
            .any(|ext| fname.to_lowercase().ends_with(ext));

        if !has_valid_ext {
            return (
                StatusCode::BAD_REQUEST,
                Json(ImportErrorResponse {
                    error: format!("Unsupported file type: {}", fname),
                    details: Some(
                        "Only .musicxml, .xml, and .mxl files are supported".to_string(),
                    ),
                }),
            )
                .into_response();
        }
    }

    // T059: Call MusicXMLImporter::import_content() and return Json<ImportResult>
    let importer = MusicXMLImporter::new();

    // Convert bytes to string for XML content
    // For .mxl files, the importer will handle decompression internally
    // We'll try to detect if it's a compressed file by checking magic bytes
    let is_zip = bytes.len() >= 4 && bytes[0] == 0x50 && bytes[1] == 0x4B;

    let import_result = if is_zip {
        // For .mxl (compressed), we need to use import_file with a temp file
        // For now, return an error - this will be handled in a future task
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(ImportErrorResponse {
                error: "Compressed .mxl files not yet supported via API".to_string(),
                details: Some("Please use uncompressed .musicxml or .xml files".to_string()),
            }),
        )
            .into_response();
    } else {
        // Uncompressed XML
        let xml_content = match String::from_utf8(bytes) {
            Ok(content) => content,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(ImportErrorResponse {
                        error: "Invalid UTF-8 in file".to_string(),
                        details: Some(e.to_string()),
                    }),
                )
                    .into_response();
            }
        };

        importer.import_content(&xml_content)
    };

    // T060: Handle errors and return appropriate HTTP status codes
    match import_result {
        Ok(result) => {
            // Save the score to repository
            if let Err(e) = repo.save(result.score.clone()) {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ImportErrorResponse {
                        error: "Failed to save imported score".to_string(),
                        details: Some(format!("{:?}", e)),
                    }),
                )
                    .into_response();
            }

            // Return the import result
            (StatusCode::OK, Json(result)).into_response()
        }
        Err(e) => {
            // Try to downcast to ImportError for specific handling
            use crate::domain::importers::musicxml::ImportError;

            if let Some(import_err) = e.downcast_ref::<ImportError>() {
                let (status, error_msg, details) = match import_err {
                    ImportError::ParseError {
                        line,
                        message,
                        ..
                    } => (
                        StatusCode::UNPROCESSABLE_ENTITY,
                        format!("XML parse error at line {}", line),
                        Some(message.clone()),
                    ),
                    ImportError::InvalidStructure { reason } => (
                        StatusCode::UNPROCESSABLE_ENTITY,
                        "Invalid MusicXML structure".to_string(),
                        Some(reason.clone()),
                    ),
                    ImportError::UnsupportedFileType { extension } => (
                        StatusCode::BAD_REQUEST,
                        format!("Unsupported file type: {}", extension),
                        None,
                    ),
                    ImportError::ConversionError { context, .. } => (
                        StatusCode::UNPROCESSABLE_ENTITY,
                        "Conversion error".to_string(),
                        Some(context.clone()),
                    ),
                    ImportError::MappingError { context, .. } => (
                        StatusCode::UNPROCESSABLE_ENTITY,
                        "Mapping error".to_string(),
                        Some(context.clone()),
                    ),
                    ImportError::FileReadError { path, .. } => (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "File read error".to_string(),
                        Some(path.clone()),
                    ),
                    ImportError::ValidationError { errors } => (
                        StatusCode::UNPROCESSABLE_ENTITY,
                        "Domain validation failed".to_string(),
                        Some(errors.join("; ")),
                    ),
                    ImportError::CompressionError { message } => (
                        StatusCode::UNPROCESSABLE_ENTITY,
                        "Compression error".to_string(),
                        Some(message.clone()),
                    ),
                };

                (
                    status,
                    Json(ImportErrorResponse {
                        error: error_msg,
                        details,
                    }),
                )
                    .into_response()
            } else {
                // Generic error handling for non-ImportError types
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ImportErrorResponse {
                        error: "Internal error during import".to_string(),
                        details: Some(e.to_string()),
                    }),
                )
                    .into_response()
            }
        }
    }
}
