/**
 * useLongPress Hook
 * 
 * Feature 008 - Tempo Change: Custom React hook for detecting long-press interactions
 * 
 * Provides different callbacks for single click vs long-press (button held down).
 * Single click: Triggered when button released before threshold (default 500ms)
 * Long press: Triggered when button held past threshold, repeats at interval (default 100ms)
 */

import { useState, useRef, useCallback } from 'react';

/**
 * Options for useLongPress hook
 */
export interface UseLongPressOptions {
  /**
   * Time in milliseconds before long-press is triggered
   * Standard: 500ms (matches iOS/Android behavior)
   */
  longPressThreshold: number;

  /**
   * Time in milliseconds between repeated long-press triggers
   * While button is held, action repeats every N ms
   * Recommended: 100ms for responsive feedback
   */
  repeatInterval: number;
}

/**
 * Return value from useLongPress hook
 */
export interface UseLongPressReturn {
  /**
   * Pointer down event handler
   */
  onPointerDown: () => void;

  /**
   * Pointer up event handler
   */
  onPointerUp: () => void;

  /**
   * Pointer leave event handler (cancels press)
   */
  onPointerLeave: () => void;

  /**
   * Whether button is currently pressed
   * Used for visual feedback (styling)
   */
  isPressed: boolean;
}

/**
 * Default options for useLongPress
 */
const DEFAULT_OPTIONS: UseLongPressOptions = {
  longPressThreshold: 500,  // 500ms standard for long-press
  repeatInterval: 100,       // 100ms repeat for smooth feedback
};

/**
 * Custom hook for detecting long-press interactions
 * 
 * @param onSingleClick - Callback for single click (released before threshold)
 * @param onLongPress - Callback for long press (held past threshold, repeats)
 * @param options - Configuration options (threshold and repeat interval)
 * @returns Pointer event handlers and pressed state
 * 
 * @example
 * ```tsx
 * const incrementHandlers = useLongPress(
 *   () => adjustTempo(1),   // +1% on click
 *   () => adjustTempo(10),  // +10% on long-press (repeated)
 *   { longPressThreshold: 500, repeatInterval: 100 }
 * );
 * 
 * <button {...incrementHandlers}>+</button>
 * ```
 */
export function useLongPress(
  onSingleClick: () => void,
  onLongPress: () => void,
  options: Partial<UseLongPressOptions> = {}
): UseLongPressReturn {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const wasLongPress = useRef(false);

  const opts = { ...DEFAULT_OPTIONS, ...options };

  const cleanup = useCallback(() => {
    setIsPressed(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    setIsPressed(true);
    wasLongPress.current = false;

    // Start timer for initial long-press threshold
    timerRef.current = window.setTimeout(() => {
      wasLongPress.current = true;
      onLongPress(); // First long-press trigger
      
      // Start repeat interval
      intervalRef.current = window.setInterval(() => {
        onLongPress();
      }, opts.repeatInterval);
    }, opts.longPressThreshold);
  }, [onLongPress, opts.longPressThreshold, opts.repeatInterval]);

  const handlePointerUp = useCallback(() => {
    // If released before threshold, it's a single click
    if (!wasLongPress.current && timerRef.current !== null) {
      onSingleClick();
    }
    cleanup();
  }, [onSingleClick, cleanup]);

  const handlePointerLeave = useCallback(() => {
    // Cancel on leave (no action triggered)
    cleanup();
  }, [cleanup]);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    isPressed,
  };
}
