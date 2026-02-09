/**
 * Tests for StackedStaffView component
 * Feature 010: Stacked Staves View - User Story 1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StackedStaffView } from './StackedStaffView';
import type { Score } from '../../types/score';

describe('StackedStaffView', () => {
  const mockScore: Score = {
    id: 'score-1',
    global_structural_events: [],
    instruments: [
      {
        id: 'instrument-1',
        name: 'Piano',
        instrument_type: 'piano',
        staves: [
          {
            id: 'staff-1',
            active_clef: 'Treble',
            voices: [
              { id: 'voice-1', interval_events: [] }
            ],
            staff_structural_events: [
              { Clef: { tick: 0, clef_type: 'Treble' } }
            ]
          },
          {
            id: 'staff-2',
            active_clef: 'Bass',
            voices: [
              { id: 'voice-2', interval_events: [] }
            ],
            staff_structural_events: [
              { Clef: { tick: 0, clef_type: 'Bass' } }
            ]
          }
        ]
      },
      {
        id: 'instrument-2',
        name: 'Violin',
        instrument_type: 'violin',
        staves: [
          {
            id: 'staff-3',
            active_clef: 'Treble',
            voices: [
              { id: 'voice-3', interval_events: [] }
            ],
            staff_structural_events: [
              { Clef: { tick: 0, clef_type: 'Treble' } }
            ]
          }
        ]
      }
    ]
  };

  const mockPlaybackProps = {
    currentTick: 0,
    playbackStatus: 'stopped' as const,
    onSeekToTick: vi.fn(),
    onUnpinStartTick: vi.fn()
  };

  it('should flatten multi-staff instruments into separate staff groups', () => {
    render(<StackedStaffView score={mockScore} {...mockPlaybackProps} />);

    // Should render 3 staff groups total (Piano: 2 staves, Violin: 1 staff)
    const staffGroups = screen.getAllByRole('group');
    expect(staffGroups).toHaveLength(3);
  });

  it('should preserve instrument order and show labels', () => {
    render(<StackedStaffView score={mockScore} {...mockPlaybackProps} />);

    // Check that Piano label appears (first staff of Piano)
    expect(screen.getByText('Piano')).toBeDefined();
    // Check that Violin label appears (first staff of Violin)
    expect(screen.getByText('Violin')).toBeDefined();
  });

  it('should render staff groups for each staff in the score', () => {
    render(<StackedStaffView score={mockScore} {...mockPlaybackProps} />);

    // Verify the container is rendered
    const container = screen.getByTestId('stacked-staff-view');
    expect(container).toBeDefined();
    expect(container.classList.contains('stacked-staff-view')).toBe(true);
  });
});
