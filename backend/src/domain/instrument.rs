use crate::domain::{ids::InstrumentId, staff::Staff};
use serde::{Deserialize, Serialize};

/// Instrument contains one or more staves
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Instrument {
    pub id: InstrumentId,
    pub name: String,
    pub staves: Vec<Staff>,
}

impl Instrument {
    /// Create a new instrument with one default staff
    pub fn new(name: String) -> Self {
        Self {
            id: InstrumentId::new(),
            name,
            staves: vec![Staff::new()],
        }
    }
}
