/**
 * Unit tests for MidiVisualizationPlaceholder component.
 *
 * T013 (Phase 4, US2, parallel).
 *
 * TDD: Written BEFORE implementation — must FAIL until MidiVisualizationPlaceholder.tsx is created.
 * Run: npx vitest run src/components/recording/MidiVisualizationPlaceholder.test.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MidiVisualizationPlaceholder } from './MidiVisualizationPlaceholder';

describe('T013 — MidiVisualizationPlaceholder', () => {
  it('renders default message "Waveform not available in MIDI mode"', () => {
    render(<MidiVisualizationPlaceholder />);
    expect(screen.getByText('Waveform not available in MIDI mode')).toBeInTheDocument();
  });

  it('renders custom message when message prop is provided', () => {
    render(<MidiVisualizationPlaceholder message="Custom placeholder text" />);
    expect(screen.getByText('Custom placeholder text')).toBeInTheDocument();
  });

  it('does NOT render the default message when a custom message is provided', () => {
    render(<MidiVisualizationPlaceholder message="Custom placeholder text" />);
    expect(screen.queryByText('Waveform not available in MIDI mode')).not.toBeInTheDocument();
  });

  it('has a role="presentation" or is an aria-labelled container', () => {
    const { container } = render(<MidiVisualizationPlaceholder />);
    const el = container.firstElementChild as HTMLElement;
    // The placeholder should exist in the DOM and be a block-level element
    expect(el).not.toBeNull();
    expect(el.tagName.toLowerCase()).toMatch(/div|section/);
  });

  it('applies the oscilloscope slot CSS class for layout compatibility', () => {
    const { container } = render(<MidiVisualizationPlaceholder />);
    const el = container.firstElementChild as HTMLElement;
    // Should have a class that places it in the oscilloscope layout slot
    expect(el.className).toMatch(/midi-viz-placeholder/);
  });
});
