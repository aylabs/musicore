import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadNewScoreButton } from './LoadNewScoreButton';

/**
 * T019: Unit tests for LoadNewScoreButton component
 * Feature 028 — Load Score Dialog: User Story 4
 */
describe('LoadNewScoreButton', () => {
  it('renders a button labeled "Load from File"', () => {
    render(<LoadNewScoreButton onImportComplete={vi.fn()} />);
    expect(screen.getByRole('button', { name: /load from file/i })).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoadNewScoreButton onImportComplete={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: /load from file/i })).toBeDisabled();
  });

  it('renders a hidden file input with correct accept filter', () => {
    const { container } = render(<LoadNewScoreButton onImportComplete={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', '.musicxml,.xml,.mxl');
  });
});
