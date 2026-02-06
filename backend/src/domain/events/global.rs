use crate::domain::events::{tempo::TempoEvent, time_signature::TimeSignatureEvent};
use serde::{Deserialize, Serialize};

/// Global structural events that affect the entire score
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum GlobalStructuralEvent {
    Tempo(TempoEvent),
    TimeSignature(TimeSignatureEvent),
}
