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

  /**
   * T010 [US1]: Verify vertical spacing reduction for better screen real estate
   * Feature 001-staff-display-refinement: Reduce gap between staves by 25%
   * Previous: 10px margin-bottom, New: 7.5px margin-bottom
   */
  it('should have margin-bottom of 7.5px for improved screen real estate', () => {
    const { container } = render(
      <StaffGroup
        instrumentName="Piano"
        staff={mockStaff}
        isFirstStaffOfInstrument={true}
        {...mockPlaybackProps}
      />
    );

    // Find the staff-group container element
    const staffGroup = container.querySelector('.staff-group');
    expect(staffGroup).toBeDefined();

    // Verify CSS margin-bottom is 7.5px (25% reduction from 10px)
    const styles = window.getComputedStyle(staffGroup!);
    expect(styles.marginBottom).toBe('7.5px');
  });
});
