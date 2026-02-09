// WASM Loader - Feature 011-wasm-music-engine
// Handles WASM module initialization and loading

// WASM module interface - represents the exported functions from Rust
interface WasmModule {
  default: () => Promise<void>;
  parse_musicxml: (xmlContent: string) => unknown;
}

let wasmModule: WasmModule | null = null;
let wasmInitialized = false;
let initializationPromise: Promise<WasmModule> | null = null;

/**
 * Initialize the WASM module
 * @returns Promise that resolves with the initialized WASM module
 * @throws Error if WASM initialization fails
 */
export async function initWasm(): Promise<WasmModule> {
  // Return existing initialization if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return cached module if already initialized
  if (wasmInitialized && wasmModule) {
    return wasmModule;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Load WASM module - in production, this is in /wasm/ directory
      // The JS bindings will automatically load the .wasm file from the same directory
      const jsUrl = new URL('/wasm/musicore_backend.js', window.location.origin);
      
      // Dynamically import the JS bindings
      const wasm = await import(/* @vite-ignore */ jsUrl.href) as WasmModule;
      
      // Initialize the WASM module (calls wasm_bindgen initialization)
      await wasm.default();
      
      wasmModule = wasm;
      wasmInitialized = true;
      
      console.log('[WASM] Music engine initialized successfully');
      return wasmModule;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[WASM] Failed to initialize music engine:', errorMessage);
      throw new Error(`WASM initialization failed: ${errorMessage}`);
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Get the initialized WASM module
 * @returns The WASM module or null if not initialized
 */
export function getWasmModule(): WasmModule | null {
  if (!wasmInitialized) {
    console.warn('[WASM] getWasmModule called before initialization');
    return null;
  }
  return wasmModule;
}

/**
 * Check if WASM is initialized
 * @returns true if WASM module is ready to use
 */
export function isWasmInitialized(): boolean {
  return wasmInitialized;
}

/**
 * Reset WASM initialization state (useful for testing)
 */
export function resetWasmState(): void {
  wasmModule = null;
  wasmInitialized = false;
  initializationPromise = null;
}
