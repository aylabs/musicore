use serde::{Deserialize, Serialize};
use std::fmt;

/// Domain-level errors for business rule violations
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DomainError {
    /// Validation error with description
    ValidationError(String),
    
    /// Entity not found
    NotFound(String),
    
    /// Duplicate entity or event
    DuplicateError(String),
    
    /// Constraint violation (e.g., overlapping notes with same pitch)
    ConstraintViolation(String),
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            Self::NotFound(msg) => write!(f, "Not found: {}", msg),
            Self::DuplicateError(msg) => write!(f, "Duplicate: {}", msg),
            Self::ConstraintViolation(msg) => write!(f, "Constraint violation: {}", msg),
        }
    }
}

impl std::error::Error for DomainError {}

/// Persistence layer errors
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PersistenceError {
    /// Entity not found in storage
    NotFound(String),
    
    /// Storage operation failed
    StorageError(String),
    
    /// Serialization/deserialization error
    SerializationError(String),
}

impl fmt::Display for PersistenceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound(msg) => write!(f, "Not found in storage: {}", msg),
            Self::StorageError(msg) => write!(f, "Storage error: {}", msg),
            Self::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
        }
    }
}

impl std::error::Error for PersistenceError {}
