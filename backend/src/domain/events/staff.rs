use crate::domain::events::{clef::ClefEvent, key_signature::KeySignatureEvent};
use serde::{Deserialize, Serialize};

/// Staff-scoped structural events
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum StaffStructuralEvent {
    Clef(ClefEvent),
    KeySignature(KeySignatureEvent),
}
