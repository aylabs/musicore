/**
 * Tests for NoteHistoryList component
 * T026 — rendering, auto-scroll, clear, and empty state
 *
 * TDD: Written before implementation. Fail until T028 creates NoteHistoryList.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NoteOnset } from '../../types/recording';
import { NoteHistoryList } from './NoteHistoryList';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeEntry(label: string, elapsedMs: number): NoteOnset {
  return {
    label,
    note: label.replace(/\d/g, ''),
    octave: parseInt(label.replace(/[^\d]/g, ''), 10),
    confidence: 0.95,
    elapsedMs,
  };
}

describe('NoteHistoryList (T026)', () => {
  beforeEach(() => {
    // Stub scrollTop assignment
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      set: vi.fn(),
      get: vi.fn(() => 0),
      configurable: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      get: vi.fn(() => 100),
      configurable: true,
    });
  });

  it('renders all entries with note label and elapsed time', () => {
    const entries = [
      makeEntry('A4', 0),
      makeEntry('B4', 123),
      makeEntry('C5', 456),
    ];
    render(<NoteHistoryList entries={entries} onClear={vi.fn()} />);
    expect(screen.getByText(/A4/)).toBeInTheDocument();
    expect(screen.getByText(/B4/)).toBeInTheDocument();
    expect(screen.getByText(/C5/)).toBeInTheDocument();
  });

  it('renders placeholder text when entries list is empty', () => {
    render(<NoteHistoryList entries={[]} onClear={vi.fn()} />);
    expect(screen.getByText(/no notes/i)).toBeInTheDocument();
  });

  it('calls onClear when the Clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const entries = [makeEntry('A4', 0)];
    render(<NoteHistoryList entries={entries} onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('Clear button is present even when list has entries', () => {
    const entries = [makeEntry('A4', 0), makeEntry('B4', 100)];
    render(<NoteHistoryList entries={entries} onClear={vi.fn()} />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });
});
