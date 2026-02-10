import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InstrumentList } from "../../components/InstrumentList";
import type { Instrument } from "../../types/score";

/**
 * T002: Unit tests for InstrumentList component - Feature 014
 *
 * Feature 014 - Remove Editing Interface: User Story 1
 * Tests that Add Voice and Add Staff buttons do not render
 * after editing interface removal.
 */
describe("InstrumentList - Editing UI Removal", () => {
  const mockInstruments: Instrument[] = [
    {
      id: "inst-1",
      name: "Piano",
      staves: [
        {
          id: "staff-1",
          voices: [
            {
              id: "voice-1",
              interval_events: [],
            },
          ],
          staff_structural_events: [],
          active_clef: "Treble",
          active_key: "CMajor",
        },
      ],
    },
  ];

  const mockProps = {
    instruments: mockInstruments,
    scoreId: "test-score-id",
    onUpdate: () => {},
  };

  /**
   * Test: Add Voice button should NOT render
   */
  it("should not render Add Voice button", () => {
    render(<InstrumentList {...mockProps} />);

    // Expand the instrument to reveal buttons
    const instrumentHeader = screen.getByText("Piano");
    fireEvent.click(instrumentHeader);

    // Query for Add Voice button by text pattern
    const addVoiceButton = screen.queryByRole("button", { name: /add voice/i });
    expect(addVoiceButton).not.toBeInTheDocument();
  });

  /**
   * Test: Add Staff button should NOT render
   */
  it("should not render Add Staff button", () => {
    render(<InstrumentList {...mockProps} />);

    // Expand the instrument to reveal buttons
    const instrumentHeader = screen.getByText("Piano");
    fireEvent.click(instrumentHeader);

    // Query for Add Staff button by text pattern
    const addStaffButton = screen.queryByRole("button", { name: /add staff/i });
    expect(addStaffButton).not.toBeInTheDocument();
  });

  /**
   * Test: Instruments should still render normally
   */
  it("should render instruments list without editing buttons", () => {
    render(<InstrumentList {...mockProps} />);

    // Verify instrument renders
    expect(screen.getByText("Piano")).toBeInTheDocument();

    // Verify staff count badge renders
    expect(screen.getByText("1 staves")).toBeInTheDocument();
  });
});
