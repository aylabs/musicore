/**
 * TempoControl Component Tests
 * 
 * Feature 008 - Tempo Change: Unit tests for tempo control buttons
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import TempoControl from './TempoControl';
import * as TempoStateContext from '../../services/state/TempoStateContext';

// Mock the TempoStateContext
vi.mock('../../services/state/TempoStateContext', () => ({
  useTempoState: vi.fn(),
}));

describe('TempoControl', () => {
  const mockAdjustTempo = vi.fn();
  const mockResetTempo = vi.fn();
  const mockGetEffectiveTempo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEffectiveTempo.mockReturnValue(120);

    vi.mocked(TempoStateContext.useTempoState).mockReturnValue({
      tempoState: {
        tempoMultiplier: 1.0,
        originalTempo: 120,
      },
      setTempoMultiplier: vi.fn(),
      adjustTempo: mockAdjustTempo,
      resetTempo: mockResetTempo,
      getEffectiveTempo: mockGetEffectiveTempo,
      setOriginalTempo: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('should render increment button', () => {
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      expect(incrementButton).toBeInTheDocument();
    });

    it('should render decrement button', () => {
      render(<TempoControl />);
      
      const decrementButton = screen.getByRole('button', { name: /decrease.*tempo/i });
      expect(decrementButton).toBeInTheDocument();
    });

    it('should render reset button', () => {
      render(<TempoControl />);
      
      const resetButton = screen.getByRole('button', { name: /reset.*tempo/i });
      expect(resetButton).toBeInTheDocument();
    });

    it('should display current tempo percentage', () => {
      render(<TempoControl />);
      
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should display effective tempo in BPM', () => {
      render(<TempoControl />);
      
      expect(screen.getByText(/120.*BPM/i)).toBeInTheDocument();
    });
  });

  describe('single click interactions', () => {
    it('should call adjustTempo(1) on increment single click', async () => {
      const user = userEvent.setup();
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      await user.click(incrementButton);
      
      expect(mockAdjustTempo).toHaveBeenCalledWith(1);
    });

    it('should call adjustTempo(-1) on decrement single click', async () => {
      const user = userEvent.setup();
      render(<TempoControl />);
      
      const decrementButton = screen.getByRole('button', { name: /decrease.*tempo/i });
      await user.click(decrementButton);
      
      expect(mockAdjustTempo).toHaveBeenCalledWith(-1);
    });

    it('should call resetTempo on reset button click', async () => {
      vi.mocked(TempoStateContext.useTempoState).mockReturnValue({
        tempoState: {
          tempoMultiplier: 1.2,
          originalTempo: 120,
        },
        setTempoMultiplier: vi.fn(),
        adjustTempo: mockAdjustTempo,
        resetTempo: mockResetTempo,
        getEffectiveTempo: () => 144,
        setOriginalTempo: vi.fn(),
      });
      
      const user = userEvent.setup();
      render(<TempoControl />);
      
      const resetButton = screen.getByRole('button', { name: /reset.*tempo/i });
      await user.click(resetButton);
      
      expect(mockResetTempo).toHaveBeenCalledTimes(1);
    });
  });

  describe('long-press interactions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call adjustTempo(10) on increment long-press', () => {
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      
      // Simulate pointer down
      act(() => {
        incrementButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      
      // Advance past threshold (500ms)
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockAdjustTempo).toHaveBeenCalledWith(10);
    });

    it('should call adjustTempo(-10) on decrement long-press', () => {
      render(<TempoControl />);
      
      const decrementButton = screen.getByRole('button', { name: /decrease.*tempo/i });
      
      // Simulate pointer down
      act(() => {
        decrementButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      
      // Advance past threshold (500ms)
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockAdjustTempo).toHaveBeenCalledWith(-10);
    });

    it('should repeat adjustTempo(10) while increment held', () => {
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      
      act(() => {
        incrementButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      
      // Advance to trigger long-press and repeats
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      // Should trigger at 500ms, then repeat at 600ms, 700ms, 800ms, 900ms, 1000ms
      expect(mockAdjustTempo).toHaveBeenCalledTimes(6);
      expect(mockAdjustTempo).toHaveBeenCalledWith(10);
    });

    it('should stop repeating on pointer up', () => {
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      
      act(() => {
        incrementButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      
      // Advance to trigger some repeats
      act(() => {
        vi.advanceTimersByTime(700);
      });
      
      // Release
      act(() => {
        incrementButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      });
      
      const callsBefore = mockAdjustTempo.mock.calls.length;
      
      // Advance more time - should not trigger more calls
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockAdjustTempo.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('boundary conditions', () => {
    it('should disable increment button at maximum (200%)', () => {
      vi.mocked(TempoStateContext.useTempoState).mockReturnValue({
        tempoState: {
          tempoMultiplier: 2.0,
          originalTempo: 120,
        },
        setTempoMultiplier: vi.fn(),
        adjustTempo: mockAdjustTempo,
        resetTempo: mockResetTempo,
        getEffectiveTempo: () => 240,
        setOriginalTempo: vi.fn(),
      });
      
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      expect(incrementButton).toBeDisabled();
    });

    it('should disable decrement button at minimum (50%)', () => {
      vi.mocked(TempoStateContext.useTempoState).mockReturnValue({
        tempoState: {
          tempoMultiplier: 0.5,
          originalTempo: 120,
        },
        setTempoMultiplier: vi.fn(),
        adjustTempo: mockAdjustTempo,
        resetTempo: mockResetTempo,
        getEffectiveTempo: () => 60,
        setOriginalTempo: vi.fn(),
      });
      
      render(<TempoControl />);
      
      const decrementButton = screen.getByRole('button', { name: /decrease.*tempo/i });
      expect(decrementButton).toBeDisabled();
    });

    it('should enable increment button near maximum (199%)', () => {
      vi.mocked(TempoStateContext.useTempoState).mockReturnValue({
        tempoState: {
          tempoMultiplier: 1.99,
          originalTempo: 120,
        },
        setTempoMultiplier: vi.fn(),
        adjustTempo: mockAdjustTempo,
        resetTempo: mockResetTempo,
        getEffectiveTempo: () => 239,
        setOriginalTempo: vi.fn(),
      });
      
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      expect(incrementButton).not.toBeDisabled();
    });

    it('should enable decrement button near minimum (51%)', () => {
      vi.mocked(TempoStateContext.useTempoState).mockReturnValue({
        tempoState: {
          tempoMultiplier: 0.51,
          originalTempo: 120,
        },
        setTempoMultiplier: vi.fn(),
        adjustTempo: mockAdjustTempo,
        resetTempo: mockResetTempo,
        getEffectiveTempo: () => 61,
        setOriginalTempo: vi.fn(),
      });
      
      render(<TempoControl />);
      
      const decrementButton = screen.getByRole('button', { name: /decrease.*tempo/i });
      expect(decrementButton).not.toBeDisabled();
    });
  });

  describe('visual feedback', () => {
    it('should show pressed state on increment button', () => {
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      
      act(() => {
        incrementButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      
      // Check for pressed class
      expect(incrementButton).toHaveClass('pressed');
    });

    it('should show pressed state on decrement button', () => {
      render(<TempoControl />);
      
      const decrementButton = screen.getByRole('button', { name: /decrease.*tempo/i });
      
      act(() => {
        decrementButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      
      // Check for pressed class
      expect(decrementButton).toHaveClass('pressed');
    });

    it('should remove pressed state on pointer up', () => {
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      
      act(() => {
        incrementButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(incrementButton).toHaveClass('pressed');
      
      act(() => {
        incrementButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      });
      expect(incrementButton).not.toHaveClass('pressed');
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on increment button', () => {
      render(<TempoControl />);
      
      const incrementButton = screen.getByRole('button', { name: /increase.*tempo/i });
      expect(incrementButton).toHaveAccessibleName();
    });

    it('should have aria-label on decrement button', () => {
      render(<TempoControl />);
      
      const decrementButton = screen.getByRole('button', { name: /decrease.*tempo/i });
      expect(decrementButton).toHaveAccessibleName();
    });

    it('should have aria-label on reset button', () => {
      render(<TempoControl />);
      
      const resetButton = screen.getByRole('button', { name: /reset.*tempo/i });
      expect(resetButton).toHaveAccessibleName();
    });
  });
});
