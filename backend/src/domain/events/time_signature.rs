use crate::domain::value_objects::Tick;
use serde::{Deserialize, Serialize};

/// Time signature event defines meter at a specific tick
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TimeSignatureEvent {
    pub tick: Tick,
    pub numerator: u8,
    pub denominator: u8,
}

impl TimeSignatureEvent {
    pub fn new(tick: Tick, numerator: u8, denominator: u8) -> Self {
        Self {
            tick,
            numerator,
            denominator,
        }
    }
}
