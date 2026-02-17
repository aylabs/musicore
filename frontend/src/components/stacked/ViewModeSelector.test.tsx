/**
 * Tests for ViewModeSelector component
 * Updated: Removed legacy stacked view
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeSelector } from './ViewModeSelector';

describe('ViewModeSelector', () => {
  it('should show only Play View button when in individual mode', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    expect(screen.getByText('Play View')).toBeDefined();
    expect(screen.queryByText('Instruments View')).toBeNull();
    expect(screen.queryByText('Instruments')).toBeNull();
  });

  it('should show only Instruments button when in layout mode', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="layout" onChange={onChange} />);

    expect(screen.getByText('Instruments')).toBeDefined();
    expect(screen.queryByText('Play View')).toBeNull();
    expect(screen.queryByText('Instruments View')).toBeNull();
  });

  it('should call onChange with layout when clicking Play View button', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="individual" onChange={onChange} />);

    const playButton = screen.getByText('Play View');
    fireEvent.click(playButton);

    expect(onChange).toHaveBeenCalledWith('layout');
  });

  it('should call onChange with individual when clicking Instruments button', () => {
    const onChange = vi.fn();
    render(<ViewModeSelector currentMode="layout" onChange={onChange} />);

    const instrumentsButton = screen.getByText('Instruments');
    fireEvent.click(instrumentsButton);

    expect(onChange).toHaveBeenCalledWith('individual');
  });
});
