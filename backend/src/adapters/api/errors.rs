use crate::domain::errors::{DomainError, PersistenceError};
use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

/// API error response format
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

/// Convert domain errors to HTTP responses
impl IntoResponse for DomainError {
    fn into_response(self) -> Response {
        let (status, error, message) = match self {
            DomainError::ValidationError(msg) => (StatusCode::BAD_REQUEST, "validation_error", msg),
            DomainError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg),
            DomainError::DuplicateError(msg) => (StatusCode::CONFLICT, "duplicate_error", msg),
            DomainError::ConstraintViolation(msg) => {
                (StatusCode::BAD_REQUEST, "constraint_violation", msg)
            }
        };

        let body = Json(ErrorResponse {
            error: error.to_string(),
            message,
        });

        (status, body).into_response()
    }
}

/// Convert persistence errors to HTTP responses
impl IntoResponse for PersistenceError {
    fn into_response(self) -> Response {
        let (status, error, message) = match self {
            PersistenceError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg),
            PersistenceError::StorageError(msg) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "storage_error", msg)
            }
            PersistenceError::SerializationError(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "serialization_error",
                msg,
            ),
        };

        let body = Json(ErrorResponse {
            error: error.to_string(),
            message,
        });

        (status, body).into_response()
    }
}
