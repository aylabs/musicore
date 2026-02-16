/**
 * Tests for ViewModeSelector component
 * Feature 010: Stacked Staves View - User Story 1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeSelector } from './ViewModeSelector';

describe('ViewModeSelector', () => {
  it('should render both view mode buttons', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    expect(screen.getByText('Instruments View')).toBeDefined();
    expect(screen.getByText('Play View')).toBeDefined();
    expect(screen.getByText('Play Legacy View')).toBeDefined();
  });

  it('should highlight the active button', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    const individualButton = screen.getByText('Instruments View');
    expect(individualButton.classList.contains('active')).toBe(true);

    rerender(<ViewModeSelector currentMode="layout" onChange={onChange} />);
    const layoutButton = screen.getByText('Play View');
    expect(layoutButton.classList.contains('active')).toBe(true);
  });

  it('should call onChange when clicking a button', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    const playButton = screen.getByText('Play View');
    fireEvent.click(playButton);

    expect(onChange).toHaveBeenCalledWith('layout');
  });

  it('should not call onChange when clicking the active button', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    const individualButton = screen.getByText('Instruments View');
    fireEvent.click(individualButton);

    expect(onChange).toHaveBeenCalledWith('individual');
  });
});
