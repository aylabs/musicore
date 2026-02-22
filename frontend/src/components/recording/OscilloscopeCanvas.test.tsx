/**
 * Tests for OscilloscopeCanvas component
 * T018 — canvas rendering, RAF loop, and cleanup
 *
 * TDD: Written before implementation to confirm RED.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { OscilloscopeCanvas } from './OscilloscopeCanvas';
import { stubCanvas2D } from '../../test/setup';

/** Stub requestAnimationFrame to fire the callback ONCE only, then become a no-op. */
function stubRAFOnce() {
  let fired = false;
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    if (!fired) {
      fired = true;
      cb(0);
    }
    return 1; // fixed handle
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
}

describe('OscilloscopeCanvas (T018)', () => {
  beforeEach(() => {
    stubRAFOnce();
  });

  it('renders a canvas element', () => {
    const ctx2d = stubCanvas2D();
    render(<OscilloscopeCanvas waveform={null} />);
    expect(document.querySelector('canvas')).not.toBeNull();
    void ctx2d;
  });

  it('calls clearRect on each animation frame', () => {
    const ctx2d = stubCanvas2D();
    render(<OscilloscopeCanvas waveform={new Float32Array(2048)} />);
    expect(ctx2d.clearRect).toHaveBeenCalled();
  });

  it('draws a flat line when buffer is all zeros', () => {
    const ctx2d = stubCanvas2D();
    const zeros = new Float32Array(2048).fill(0);
    // Render with explicit height so the midpoint check is not tied to defaults
    render(<OscilloscopeCanvas waveform={zeros} height={200} />);
    // lineTo should be called but all y values should equal canvas centre (height/2 = 100)
    const lineToYValues = (ctx2d.lineTo as ReturnType<typeof vi.fn>).mock.calls.map(
      ([, y]: [number, number]) => y,
    );
    expect(lineToYValues.every((y: number) => Math.abs(y - 100) < 1)).toBe(true);
  });

  it('draws non-centre y values for a non-zero buffer', () => {
    const ctx2d = stubCanvas2D();
    const wave = new Float32Array(2048);
    // Set alternating +1/-1 samples — should produce non-centre y values
    for (let i = 0; i < wave.length; i++) wave[i] = i % 2 === 0 ? 1.0 : -1.0;
    render(<OscilloscopeCanvas waveform={wave} />);
    const lineToYValues = (ctx2d.lineTo as ReturnType<typeof vi.fn>).mock.calls.map(
      ([, y]: [number, number]) => y,
    );
    const hasNonCentre = lineToYValues.some((y: number) => Math.abs(y - 100) > 1);
    expect(hasNonCentre).toBe(true);
  });

  it('calls cancelAnimationFrame when component unmounts', () => {
    const cancelRAF = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelRAF);
    // RAF doesn't fire callback — just returns a handle
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(42));

    const ctx2d = stubCanvas2D();
    const { unmount } = render(<OscilloscopeCanvas waveform={new Float32Array(2048)} />);
    act(() => {
      unmount();
    });
    expect(cancelRAF).toHaveBeenCalled();
    void ctx2d;
  });
});
