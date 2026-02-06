use crate::domain::value_objects::{Clef, Tick};
use serde::{Deserialize, Serialize};

/// Clef event defines clef at a specific tick
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClefEvent {
    pub tick: Tick,
    pub clef: Clef,
}

impl ClefEvent {
    pub fn new(tick: Tick, clef: Clef) -> Self {
        Self { tick, clef }
    }
}
