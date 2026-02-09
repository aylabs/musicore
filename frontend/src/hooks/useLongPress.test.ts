/**
 * useLongPress Hook Tests
 * 
 * Feature 008 - Tempo Change: Tests for long-press button detection hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '../../src/hooks/useLongPress';

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should trigger onSingleClick when released before threshold', () => {
    const onSingleClick = vi.fn();
    const onLongPress = vi.fn();
    
    const { result } = renderHook(() =>
      useLongPress(onSingleClick, onLongPress, {
        longPressThreshold: 500,
        repeatInterval: 100,
      })
    );

    // Press button
    act(() => {
      result.current.onPointerDown();
    });

    expect(result.current.isPressed).toBe(true);

    // Release before threshold (after 300ms)
    act(() => {
      vi.advanceTimersByTime(300);
      result.current.onPointerUp();
    });

    expect(onSingleClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
    expect(result.current.isPressed).toBe(false);
  });

  it('should trigger onLongPress when held past threshold', () => {
    const onSingleClick = vi.fn();
    const onLongPress = vi.fn();
    
    const { result } = renderHook(() =>
      useLongPress(onSingleClick, onLongPress, {
        longPressThreshold: 500,
        repeatInterval: 100,
      })
    );

    // Press button
    act(() => {
      result.current.onPointerDown();
    });

    // Hold past threshold (600ms)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Should trigger once at 500ms threshold, then once at 600ms (first repeat)
    expect(onLongPress).toHaveBeenCalledTimes(2);
    expect(onSingleClick).not.toHaveBeenCalled();
    expect(result.current.isPressed).toBe(true);
  });

  it('should repeat onLongPress at interval while held', () => {
    const onSingleClick = vi.fn();
    const onLongPress = vi.fn();
    
    const { result } = renderHook(() =>
      useLongPress(onSingleClick, onLongPress, {
        longPressThreshold: 500,
        repeatInterval: 100,
      })
    );

    // Press button
    act(() => {
      result.current.onPointerDown();
    });

    // Hold for 1000ms (500ms threshold + 500ms repeat)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should trigger once at threshold, then 5 more times at 100ms intervals
    expect(onLongPress).toHaveBeenCalledTimes(6);
    expect(onSingleClick).not.toHaveBeenCalled();
  });

  it('should stop repeat on pointer up', () => {
    const onSingleClick = vi.fn();
    const onLongPress = vi.fn();
    
    const { result } = renderHook(() =>
      useLongPress(onSingleClick, onLongPress, {
        longPressThreshold: 500,
        repeatInterval: 100,
      })
    );

    // Press button
    act(() => {
      result.current.onPointerDown();
    });

    // Hold past threshold
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(onLongPress).toHaveBeenCalledTimes(3); // Once at 500ms, twice at 600ms, 700ms

    // Release
    act(() => {
      result.current.onPointerUp();
    });

    // Advance time - should not trigger more
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(3); // Still 3, no more triggers
    expect(result.current.isPressed).toBe(false);
  });

  it('should cancel on pointer leave without triggering either callback', () => {
    const onSingleClick = vi.fn();
    const onLongPress = vi.fn();
    
    const { result } = renderHook(() =>
      useLongPress(onSingleClick, onLongPress, {
        longPressThreshold: 500,
        repeatInterval: 100,
      })
    );

    // Press button
    act(() => {
      result.current.onPointerDown();
    });

    // Move pointer away before threshold
    act(() => {
      vi.advanceTimersByTime(300);
      result.current.onPointerLeave();
    });

    expect(onSingleClick).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
    expect(result.current.isPressed).toBe(false);
  });

  it('should use default options when not provided', () => {
    const onSingleClick = vi.fn();
    const onLongPress = vi.fn();
    
    const { result } = renderHook(() =>
      useLongPress(onSingleClick, onLongPress)
    );

    // Press button
    act(() => {
      result.current.onPointerDown();
    });

    // Hold for default threshold (should be 500ms)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onLongPress).toHaveBeenCalled();
  });

  it('should reset state when multiple press/release cycles', () => {
    const onSingleClick = vi.fn();
    const onLongPress = vi.fn();
    
    const { result } = renderHook(() =>
      useLongPress(onSingleClick, onLongPress, {
        longPressThreshold: 500,
        repeatInterval: 100,
      })
    );

    // First press - single click
    act(() => {
      result.current.onPointerDown();
    });
    act(() => {
      vi.advanceTimersByTime(300);
      result.current.onPointerUp();
    });

    expect(onSingleClick).toHaveBeenCalledTimes(1);
    expect(result.current.isPressed).toBe(false);

    // Second press - long press
    act(() => {
      result.current.onPointerDown();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onLongPress).toHaveBeenCalled();
    expect(result.current.isPressed).toBe(true);
  });
});
