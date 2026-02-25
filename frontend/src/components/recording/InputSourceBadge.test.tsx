/**
 * Unit tests for InputSourceBadge component.
 *
 * T012 (Phase 4, US2, parallel).
 *
 * TDD: Written BEFORE implementation — must FAIL until InputSourceBadge.tsx is created.
 * Run: npx vitest run src/components/recording/InputSourceBadge.test.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InputSourceBadge } from './InputSourceBadge';

describe('T012 — InputSourceBadge', () => {
  it('renders "Microphone" for { kind: "microphone" }', () => {
    render(<InputSourceBadge source={{ kind: 'microphone' }} />);
    expect(screen.getByText('Microphone')).toBeInTheDocument();
  });

  it('renders "MIDI — Piano" for { kind: "midi", deviceName: "Piano" }', () => {
    render(<InputSourceBadge source={{ kind: 'midi', deviceName: 'Piano', deviceId: 'x' }} />);
    expect(screen.getByText('MIDI — Piano')).toBeInTheDocument();
  });

  it('renders "MIDI — [device name]" with any device name', () => {
    render(<InputSourceBadge source={{ kind: 'midi', deviceName: 'Arturia KeyLab', deviceId: 'abc' }} />);
    expect(screen.getByText('MIDI — Arturia KeyLab')).toBeInTheDocument();
  });

  it('is visible in idle state (no aria-hidden)', () => {
    const { container } = render(<InputSourceBadge source={{ kind: 'microphone' }} />);
    const badge = container.firstElementChild;
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute('aria-hidden')).not.toBe('true');
  });

  it('has correct role or aria-label for accessibility', () => {
    render(<InputSourceBadge source={{ kind: 'microphone' }} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
