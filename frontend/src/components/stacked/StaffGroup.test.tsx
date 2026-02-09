/**
 * Tests for StaffGroup component
 * Feature 010: Stacked Staves View - User Story 3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaffGroup } from './StaffGroup';
import type { Staff } from '../../types/score';

describe('StaffGroup', () => {
  const mockStaff: Staff = {
    id: 'staff-1',
    active_clef: 'Treble',
    voices: [
      { id: 'voice-1', interval_events: [] }
    ],
    staff_structural_events: [
      { Clef: { tick: 0, clef_type: 'Treble' } }
    ]
  };

  const mockPlaybackProps = {
    currentTick: 0,
    playbackStatus: 'stopped' as const,
    onSeekToTick: vi.fn(),
    onUnpinStartTick: vi.fn()
  };

  it('should render instrument label when first staff', () => {
    render(
      <StaffGroup
        instrumentName="Piano"
        staff={mockStaff}
        isFirstStaffOfInstrument={true}
        {...mockPlaybackProps}
      />
    );

    expect(screen.getByText('Piano')).toBeDefined();
  });

  it('should not render instrument label when not first staff', () => {
    render(
      <StaffGroup
        instrumentName="Piano"
        staff={mockStaff}
        isFirstStaffOfInstrument={false}
        {...mockPlaybackProps}
      />
    );

    expect(screen.queryByText('Piano')).toBeNull();
  });

  it('should render MultiVoiceStaff component', () => {
    render(
      <StaffGroup
        instrumentName="Piano"
        staff={mockStaff}
        isFirstStaffOfInstrument={true}
        {...mockPlaybackProps}
      />
    );

    // MultiVoiceStaff wrapper should be present
    const multiVoiceStaff = screen.getByTestId('multi-voice-staff');
    expect(multiVoiceStaff).toBeDefined();
    expect(multiVoiceStaff.classList.contains('multi-voice-staff')).toBe(true);
  });

  it('should render staff notation component', () => {
    render(
      <StaffGroup
        instrumentName="Piano"
        staff={mockStaff}
        isFirstStaffOfInstrument={true}
        {...mockPlaybackProps}
      />
    );

    // StaffNotation renders an SVG with testid
    const notationSvg = screen.getByTestId('notation-svg');
    expect(notationSvg).toBeDefined();
  });
});
