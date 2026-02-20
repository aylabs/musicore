/**
 * TempoControl Component Tests
 *
 * Feature 008 - Tempo Change: Unit tests for tempo control slider
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import TempoControl from './TempoControl';
import * as TempoStateContext from '../../services/state/TempoStateContext';

// Mock the TempoStateContext
vi.mock('../../services/state/TempoStateContext', () => ({
  useTempoState: vi.fn(),
}));

function makeMock(tempoMultiplier = 1.0, originalTempo = 120) {
  const mockSetTempoMultiplier = vi.fn();
  const mockResetTempo = vi.fn();
  vi.mocked(TempoStateContext.useTempoState).mockReturnValue({
    tempoState: { tempoMultiplier, originalTempo },
    setTempoMultiplier: mockSetTempoMultiplier,
    adjustTempo: vi.fn(),
    resetTempo: mockResetTempo,
    getEffectiveTempo: () => Math.round(originalTempo * tempoMultiplier),
    setOriginalTempo: vi.fn(),
  });
  return { mockSetTempoMultiplier, mockResetTempo };
}

describe('TempoControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render a range slider', () => {
      makeMock();
      render(<TempoControl />);

      const slider = screen.getByRole('slider', { name: /tempo/i });
      expect(slider).toBeInTheDocument();
    });

    it('should display current tempo percentage', () => {
      makeMock(1.0, 120);
      render(<TempoControl />);

      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should display effective tempo in BPM', () => {
      makeMock(1.0, 120);
      render(<TempoControl />);

      expect(screen.getByText(/120.*BPM/i)).toBeInTheDocument();
    });

    it('should display 150% at 1.5 multiplier', () => {
      makeMock(1.5, 120);
      render(<TempoControl />);

      expect(screen.getByText(/150%/)).toBeInTheDocument();
    });

    it('should render the TEMPO label', () => {
      makeMock();
      render(<TempoControl />);

      expect(screen.getByText(/tempo/i)).toBeInTheDocument();
    });

    it('should render the center tick marker', () => {
      makeMock();
      render(<TempoControl />);

      // The center tick is a hidden <span> with class tempo-center-tick
      const tick = document.querySelector('.tempo-center-tick');
      expect(tick).toBeInTheDocument();
    });
  });

  describe('slider value', () => {
    it('should set slider value to the current tempoMultiplier', () => {
      makeMock(1.2);
      render(<TempoControl />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(parseFloat(slider.value)).toBeCloseTo(1.2, 2);
    });

    it('should set slider min to 0.5', () => {
      makeMock();
      render(<TempoControl />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(parseFloat(slider.min)).toBe(0.5);
    });

    it('should set slider max to 2.0', () => {
      makeMock();
      render(<TempoControl />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(parseFloat(slider.max)).toBe(2.0);
    });
  });

  describe('slider interactions', () => {
    it('should call setTempoMultiplier with new value when slider moved', () => {
      const { mockSetTempoMultiplier } = makeMock(1.0);
      render(<TempoControl />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '1.3' } });

      expect(mockSetTempoMultiplier).toHaveBeenCalledWith(1.3);
    });

    it('should snap to 1.0 when slider is within snap threshold (within 5%)', () => {
      const { mockSetTempoMultiplier } = makeMock(1.0);
      render(<TempoControl />);

      const slider = screen.getByRole('slider');
      // 1.03 is within ±0.05 of 1.0 → should snap to 1.0
      fireEvent.change(slider, { target: { value: '1.03' } });

      expect(mockSetTempoMultiplier).toHaveBeenCalledWith(1.0);
    });

    it('should snap to 1.0 when slider is within snap threshold below center', () => {
      const { mockSetTempoMultiplier } = makeMock(1.0);
      render(<TempoControl />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0.97' } });

      expect(mockSetTempoMultiplier).toHaveBeenCalledWith(1.0);
    });

    it('should NOT snap when slider is outside threshold (>5% away)', () => {
      const { mockSetTempoMultiplier } = makeMock(1.0);
      render(<TempoControl />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '1.2' } });

      expect(mockSetTempoMultiplier).toHaveBeenCalledWith(1.2);
    });
  });

  describe('reset via value label', () => {
    it('should call resetTempo when value label clicked at non-default', async () => {
      const { mockResetTempo } = makeMock(1.3);
      const user = userEvent.setup();
      render(<TempoControl />);

      // The value label is clickable when not at default
      const label = screen.getByText(/156.*BPM/i);
      await user.click(label);

      expect(mockResetTempo).toHaveBeenCalledTimes(1);
    });

    it('should NOT call resetTempo when value label clicked at 100%', async () => {
      const { mockResetTempo } = makeMock(1.0);
      const user = userEvent.setup();
      render(<TempoControl />);

      const label = screen.getByText(/120.*BPM/i);
      await user.click(label);

      expect(mockResetTempo).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable the slider when disabled prop is true', () => {
      makeMock();
      render(<TempoControl disabled />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider).toBeDisabled();
    });

    it('should add disabled modifier class to container when disabled', () => {
      makeMock();
      render(<TempoControl disabled />);

      const container = document.querySelector('.tempo-control');
      expect(container).toHaveClass('tempo-control--disabled');
    });

    it('should enable the slider when disabled prop is false', () => {
      makeMock();
      render(<TempoControl disabled={false} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider).not.toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on slider', () => {
      makeMock();
      render(<TempoControl />);

      const slider = screen.getByRole('slider', { name: /tempo/i });
      expect(slider).toHaveAccessibleName();
    });

    it('should have aria-valuetext reflecting current tempo', () => {
      makeMock(1.0, 120);
      render(<TempoControl />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuetext', expect.stringMatching(/120.*BPM/i));
    });
  });
});
