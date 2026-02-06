use crate::domain::value_objects::{KeySignature, Tick};
use serde::{Deserialize, Serialize};

/// Key signature event defines key at a specific tick
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeySignatureEvent {
    pub tick: Tick,
    pub key: KeySignature,
}

impl KeySignatureEvent {
    pub fn new(tick: Tick, key: KeySignature) -> Self {
        Self { tick, key }
    }
}
