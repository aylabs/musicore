// Adapters will be added as needed
pub mod persistence;

// API adapter only for native backend (uses axum, tower, not available in WASM)
#[cfg(not(target_arch = "wasm32"))]
pub mod api;

// WASM adapter only for wasm32 target
#[cfg(target_arch = "wasm32")]
pub mod wasm;
