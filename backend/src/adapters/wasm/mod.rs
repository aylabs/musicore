// WASM Adapter Module - Feature 011-wasm-music-engine
// Provides WebAssembly interface for music domain logic

pub mod bindings;
pub mod error_handling;

pub use error_handling::{WasmError, error_to_js, import_error_to_js, to_js_error};
