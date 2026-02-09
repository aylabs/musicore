// Music Engine TypeScript Wrapper - Feature 011-wasm-music-engine
// Provides a TypeScript-friendly interface to WASM music functions

import { getWasmModule, initWasm } from './loader';
import type { WasmError } from '../../types/wasm-error';
import { isWasmError, WasmEngineError } from '../../types/wasm-error';
import type { Score } from '../../types/score';

/**
 * Ensure WASM is initialized before calling functions
 * @throws WasmEngineError if WASM is not initialized
 */
async function ensureWasmInitialized(): Promise<void> {
  const module = getWasmModule();
  if (!module) {
    try {
      await initWasm();
    } catch (error) {
      throw new WasmEngineError(
        'Failed to initialize WASM engine',
        error instanceof Error ? undefined : error as WasmError
      );
    }
  }
}

/**
 * Handle WASM function errors
 * Converts WASM errors to WasmEngineError instances
 */
function handleWasmError(error: unknown): never {
  if (isWasmError(error)) {
    throw WasmEngineError.fromWasmError(error);
  }
  
  if (error instanceof Error) {
    throw new WasmEngineError(error.message);
  }
  
  throw new WasmEngineError('Unknown WASM error occurred');
}

// ============================================================================
// Phase 3: User Story 1 - MusicXML Parsing
// ============================================================================

/**
 * Parse MusicXML content using WASM engine
 * 
 * @param xmlContent - MusicXML file content as string
 * @returns Parsed Score object
 * @throws WasmEngineError if parsing fails
 */
export async function parseMusicXML(xmlContent: string): Promise<Score> {
  await ensureWasmInitialized();
  
  try {
    const wasmModule = getWasmModule();
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }
    
    // Call the WASM function
    const result = wasmModule.parse_musicxml(xmlContent);
    
    // The result is already a JavaScript object (deserialized by wasm-bindgen)
    return result as Score;
  } catch (error) {
    handleWasmError(error);
  }
}

// ============================================================================
// Phase 4: User Story 2 - Domain Operations
// ============================================================================

// Domain operation wrappers will be added in Phase 4:
// - addNote
// - updateNote
// - deleteNote
// - addInstrument
// - updateInstrument
// - etc.

/**
 * Export utility functions for use in other modules
 */
export { ensureWasmInitialized, handleWasmError };
