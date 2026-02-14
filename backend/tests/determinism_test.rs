//! Determinism test for layout engine (T077)
//! 
//! Verifies that running the same input through the layout engine
//! produces byte-identical output every time.

use musicore_backend::layout::{compute_layout, LayoutConfig};
use sha2::{Sha256, Digest};
use std::fs;
use std::path::PathBuf;

#[test]
fn test_deterministic_layout_violin() {
    // Load violin fixture
    let fixture_path = PathBuf::from("tests/fixtures/violin_10_measures.json");
    let json_content = fs::read_to_string(&fixture_path)
        .expect("Failed to read violin_10_measures.json");
    
    // Parse JSON once before running multiple iterations
    let score: serde_json::Value = serde_json::from_str(&json_content)
        .expect("Failed to parse JSON");
    
    let config = LayoutConfig::default();
    
    // Run layout 10 times and collect SHA256 hashes
    let mut hashes = Vec::new();
    
    for run in 0..10 {
        let layout = compute_layout(&score, &config);
        
        // Serialize to JSON for stable comparison
        let json = serde_json::to_string(&layout)
            .expect("Failed to serialize layout");
        
        // Compute SHA256 hash
        let mut hasher = Sha256::new();
        hasher.update(json.as_bytes());
        let hash = hasher.finalize();
        let hash_hex = format!("{:x}", hash);
        
        println!("Run {}: hash = {}", run, &hash_hex[..16]);
        hashes.push(hash_hex);
    }
    
    // Verify all hashes are identical
    let first_hash = &hashes[0];
    for (i, hash) in hashes.iter().enumerate() {
        assert_eq!(
            hash, first_hash,
            "Layout output differs on run {}! Expected consistent hash but got different result",
            i
        );
    }
    
    println!("✅ Determinism test passed: All 10 runs produced identical output");
    println!("   Hash: {}", &first_hash[..32]);
}

#[test]
fn test_deterministic_layout_piano() {
    // Load piano fixture (multi-staff scenario)
    let fixture_path = PathBuf::from("tests/fixtures/piano_8_measures.json");
    let json_content = fs::read_to_string(&fixture_path)
        .expect("Failed to read piano_8_measures.json");
    
    // Parse JSON once before running multiple iterations
    let score: serde_json::Value = serde_json::from_str(&json_content)
        .expect("Failed to parse JSON");
    
    let config = LayoutConfig::default();
    
    // Run layout 10 times and collect SHA256 hashes
    let mut hashes = Vec::new();
    
    for run in 0..10 {
        let layout = compute_layout(&score, &config);
        
        // Serialize to JSON for stable comparison
        let json = serde_json::to_string(&layout)
            .expect("Failed to serialize layout");
        
        // Compute SHA256 hash
        let mut hasher = Sha256::new();
        hasher.update(json.as_bytes());
        let hash = hasher.finalize();
        let hash_hex = format!("{:x}", hash);
        
        hashes.push(hash_hex);
    }
    
    // Verify all hashes are identical
    let first_hash = &hashes[0];
    for (i, hash) in hashes.iter().enumerate() {
        assert_eq!(
            hash, first_hash,
            "Piano layout output differs on run {}! Expected consistent hash",
            i
        );
    }
    
    println!("✅ Piano determinism test passed: All 10 runs produced identical output");
    println!("   Hash: {}", &first_hash[..32]);
}
