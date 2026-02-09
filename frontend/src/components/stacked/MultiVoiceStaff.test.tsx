/**
 * Tests for MultiVoiceStaff component
 * Feature 010: Stacked Staves View - User Story 2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiVoiceStaff } from './MultiVoiceStaff';
import type { Voice } from '../../types/score';

describe('MultiVoiceStaff', () => {
  const mockPlaybackProps = {
    currentTick: 0,
    playbackStatus: 'stopped' as const,
    onSeekToTick: vi.fn(),
    onUnpinStartTick: vi.fn()
  };

  it('should render StaffNotation component', () => {
    const voices: Voice[] = [
      {
        id: 'voice-1',
        interval_events: [
          { id: 'note-1', start_tick: 0, duration_ticks: 100, pitch: 60 },
          { id: 'note-2', start_tick: 200, duration_ticks: 100, pitch: 64 }
        ]
      },
      {
        id: 'voice-2',
        interval_events: [
          { id: 'note-3', start_tick: 100, duration_ticks: 100, pitch: 67 },
          { id: 'note-4', start_tick: 300, duration_ticks: 100, pitch: 72 }
        ]
      }
    ];

    render(<MultiVoiceStaff voices={voices} clef="Treble" {...mockPlaybackProps} />);

    // StaffNotation renders an SVG element
    const notationSvg = screen.getByTestId('notation-svg');
    expect(notationSvg).toBeDefined();
  });

  it('should render with multi-voice-staff wrapper', () => {
    const voices: Voice[] = [
      {
        id: 'voice-1',
        interval_events: [
          { id: 'note-1', start_tick: 100, duration_ticks: 100, pitch: 60 }
        ]
      }
    ];

    render(<MultiVoiceStaff voices={voices} clef="Treble" {...mockPlaybackProps} />);

    const wrapper = screen.getByTestId('multi-voice-staff');
    expect(wrapper).toBeDefined();
    expect(wrapper.classList.contains('multi-voice-staff')).toBe(true);
  });

  it('should handle empty voices', () => {
    const voices: Voice[] = [
      { id: 'voice-1', interval_events: [] },
      { id: 'voice-2', interval_events: [] }
    ];

    render(<MultiVoiceStaff voices={voices} clef="Treble" {...mockPlaybackProps} />);

    // Should still render notation SVG even with no notes
    const notationSvg = screen.getByTestId('notation-svg');
    expect(notationSvg).toBeDefined();
  });
});
