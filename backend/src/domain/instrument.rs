use crate::domain::{
    errors::DomainError,
    ids::{InstrumentId, StaffId},
    staff::Staff,
};
use serde::{Deserialize, Serialize};

/// Instrument contains one or more staves
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Instrument {
    pub id: InstrumentId,
    pub name: String,
    /// Type of instrument for playback (e.g., "piano", "guitar")
    /// Feature 003: Music Playback - MVP always "piano"
    pub instrument_type: String,
    pub staves: Vec<Staff>,
}

impl Instrument {
    /// Create a new instrument with one default staff
    pub fn new(name: String) -> Self {
        Self {
            id: InstrumentId::new(),
            name,
            instrument_type: "piano".to_string(), // Default to piano for MVP
            staves: vec![Staff::new()],
        }
    }

    /// Add an additional staff to the instrument
    pub fn add_staff(&mut self, staff: Staff) {
        self.staves.push(staff);
    }

    /// Get a staff by ID (immutable)
    pub fn get_staff(&self, id: StaffId) -> Result<&Staff, DomainError> {
        self.staves
            .iter()
            .find(|s| s.id == id)
            .ok_or_else(|| DomainError::NotFound(format!("Staff with id {} not found", id)))
    }

    /// Get a staff by ID (mutable)
    pub fn get_staff_mut(&mut self, id: StaffId) -> Result<&mut Staff, DomainError> {
        self.staves
            .iter_mut()
            .find(|s| s.id == id)
            .ok_or_else(|| DomainError::NotFound(format!("Staff with id {} not found", id)))
    }
}
