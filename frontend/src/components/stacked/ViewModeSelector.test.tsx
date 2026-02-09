/**
 * Tests for ViewModeSelector component
 * Feature 010: Stacked Staves View - User Story 1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeSelector, type ViewMode } from './ViewModeSelector';

describe('ViewModeSelector', () => {
  it('should render both view mode buttons', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    expect(screen.getByText('Individual View')).toBeDefined();
    expect(screen.getByText('Stacked View')).toBeDefined();
  });

  it('should highlight the active button', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    const individualButton = screen.getByText('Individual View');
    expect(individualButton.classList.contains('active')).toBe(true);

    rerender(<ViewModeSelector currentMode="stacked" onChange={onChange} />);
    const stackedButton = screen.getByText('Stacked View');
    expect(stackedButton.classList.contains('active')).toBe(true);
  });

  it('should call onChange when clicking a button', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    const stackedButton = screen.getByText('Stacked View');
    fireEvent.click(stackedButton);

    expect(onChange).toHaveBeenCalledWith('stacked');
  });

  it('should not call onChange when clicking the active button', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    const individualButton = screen.getByText('Individual View');
    fireEvent.click(individualButton);

    expect(onChange).toHaveBeenCalledWith('individual');
  });
});
