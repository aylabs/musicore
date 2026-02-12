//! SMuFL font metrics
//!
//! Provides glyph bounding boxes and baseline positions from embedded
//! Bravura font metadata.

use crate::layout::types::BoundingBox;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Embedded Bravura font metadata JSON
const BRAVURA_METRICS: &str = include_str!("../../assets/bravura_metadata.json");

/// Glyph metrics from SMuFL font metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
struct GlyphMetrics {
    bBoxNE: [f32; 2], // Northeast corner [x, y]
    bBoxSW: [f32; 2], // Southwest corner [x, y]
}

/// Bravura font metadata structure
#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
struct BravuraMetadata {
    glyphBBoxes: HashMap<String, GlyphMetrics>,
}

/// Parsed metrics cache
static METRICS: Lazy<HashMap<String, GlyphMetrics>> = Lazy::new(|| {
    let metadata: BravuraMetadata =
        serde_json::from_str(BRAVURA_METRICS).expect("Failed to parse Bravura metrics JSON");
    metadata.glyphBBoxes
});

/// Get bounding box for a SMuFL glyph codepoint
///
/// Returns default bounding box if glyph not found in metrics.
pub fn get_glyph_bbox(glyph_name: &str) -> BoundingBox {
    METRICS
        .get(glyph_name)
        .map(|metrics| {
            // Convert SMuFL metrics to BoundingBox
            // SMuFL uses staff spaces, with origin at baseline
            let width = metrics.bBoxNE[0] - metrics.bBoxSW[0];
            let height = metrics.bBoxNE[1] - metrics.bBoxSW[1];
            BoundingBox {
                x: metrics.bBoxSW[0],
                y: metrics.bBoxSW[1],
                width,
                height,
            }
        })
        .unwrap_or(BoundingBox {
            x: 0.0,
            y: -0.5,
            width: 1.0,
            height: 1.0,
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_load() {
        // Verify metrics can be loaded
        let bbox = get_glyph_bbox("noteheadBlack");
        assert!(bbox.width > 0.0);
        assert!(bbox.height > 0.0);
    }

    #[test]
    fn test_missing_glyph_returns_default() {
        let bbox = get_glyph_bbox("nonexistent_glyph");
        assert_eq!(bbox.width, 1.0);
        assert_eq!(bbox.height, 1.0);
    }
}
