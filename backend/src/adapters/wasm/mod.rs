// WASM Adapter Module - Feature 011-wasm-music-engine
// Provides WebAssembly interface for music domain logic

pub mod error_handling;
pub mod bindings;

pub use error_handling::{WasmError, to_js_error, import_error_to_js, error_to_js};
