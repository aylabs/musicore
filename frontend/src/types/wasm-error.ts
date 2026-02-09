// WASM Error Types - Feature 011-wasm-music-engine
// TypeScript definitions for errors returned from WASM

/**
 * Error structure returned from WASM functions
 * Corresponds to WasmError struct in Rust
 */
export interface WasmError {
  /** Error type identifier (e.g., "ValidationError", "NotFound") */
  error: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Optional additional error details (structured data) */
  details?: Record<string, unknown>;
}

/**
 * Type guard to check if an object is a WasmError
 */
export function isWasmError(obj: unknown): obj is WasmError {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const error = obj as Record<string, unknown>;
  return (
    typeof error.error === 'string' &&
    typeof error.message === 'string' &&
    (error.details === undefined || typeof error.details === 'object')
  );
}

/**
 * Convert a WASM error to a user-friendly message
 */
export function formatWasmError(error: WasmError): string {
  let message = error.message;
  
  // Add error type as prefix for better context
  if (error.error && error.error !== 'InternalError') {
    message = `[${error.error}] ${message}`;
  }
  
  // Add details if available
  if (error.details) {
    const detailsStr = JSON.stringify(error.details, null, 2);
    message += `\n\nDetails:\n${detailsStr}`;
  }
  
  return message;
}

/**
 * Custom error class for WASM-related errors
 */
export class WasmEngineError extends Error {
  public readonly wasmError?: WasmError;
  
  constructor(message: string, wasmError?: WasmError) {
    super(message);
    this.name = 'WasmEngineError';
    this.wasmError = wasmError;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WasmEngineError);
    }
  }
  
  /**
   * Create from a WASM error object
   */
  static fromWasmError(wasmError: WasmError): WasmEngineError {
    return new WasmEngineError(formatWasmError(wasmError), wasmError);
  }
  
  /**
   * Convert to a plain object for serialization
   */
  toJSON(): { name: string; message: string; wasmError?: WasmError } {
    return {
      name: this.name,
      message: this.message,
      wasmError: this.wasmError,
    };
  }
}
