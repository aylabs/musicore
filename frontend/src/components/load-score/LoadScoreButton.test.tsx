import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadScoreButton } from './LoadScoreButton';

/**
 * T006: Unit tests for LoadScoreButton component
 * Feature 028 — Load Score Dialog: User Story 1
 */
describe('LoadScoreButton', () => {
  it('renders with default label "Load Score"', () => {
    render(<LoadScoreButton onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /load score/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<LoadScoreButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /load score/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoadScoreButton onClick={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<LoadScoreButton onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('accepts optional aria-label override', () => {
    render(<LoadScoreButton onClick={vi.fn()} aria-label="Open score library" />);
    expect(screen.getByRole('button', { name: /open score library/i })).toBeInTheDocument();
  });
});
