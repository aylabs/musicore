use crate::domain::value_objects::{BPM, Tick};
use serde::{Deserialize, Serialize};

/// Tempo event defines BPM at a specific tick
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TempoEvent {
    pub tick: Tick,
    pub bpm: BPM,
}

impl TempoEvent {
    pub fn new(tick: Tick, bpm: BPM) -> Self {
        Self { tick, bpm }
    }
}
