import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteDisplay } from "../../components/NoteDisplay";

/**
 * T003: Unit tests for NoteDisplay component - Feature 014
 *
 * Feature 014 - Remove Editing Interface: User Story 1
 * Tests that Add Note button does not render
 * after editing interface removal.
 */
describe("NoteDisplay - Editing UI Removal", () => {
  const mockProps = {
    notes: [],
    voiceId: "voice-1",
    staffId: "staff-1",
    instrumentId: "inst-1",
    scoreId: "test-score-id",
    onUpdate: () => {},
    clef: "Treble" as const,
    instrumentIndex: 0,
    staffIndex: 0,
    voiceIndex: 0,
  };

  /**
   * Test: Add Note button should NOT render
   */
  it("should not render Add Note button", () => {
    render(<NoteDisplay {...mockProps} />);

    // Query for Add Note button by text pattern
    const addNoteButton = screen.queryByRole("button", { name: /add note/i });
    expect(addNoteButton).not.toBeInTheDocument();
  });

  /**
   * Test: Empty state message should still render
   */
  it("should render empty state when no notes present", () => {
    render(<NoteDisplay {...mockProps} />);

    // Verify "No notes yet" message displays
    expect(screen.getByText("No notes yet")).toBeInTheDocument();
  });

  /**
   * Test: Notes should render when present
   */
  it("should render notes list without Add Note button", async () => {
    const user = userEvent.setup();
    const propsWithNotes = {
      ...mockProps,
      notes: [
        {
          start_tick: 0,
          duration_ticks: 960,
          pitch: 60, // Middle C
        },
      ],
    };

    render(<NoteDisplay {...propsWithNotes} />);

    // Click "Show Note Details" button to reveal note details
    const toggleButton = screen.getByText(/Show Note Details/i);
    await user.click(toggleButton);

    // Verify note renders (checking for "C4" note name or MIDI 60)
    expect(screen.getByText(/MIDI 60/)).toBeInTheDocument();

    // Verify Add Note button still does not render
    const addNoteButton = screen.queryByRole("button", { name: /add note/i });
    expect(addNoteButton).not.toBeInTheDocument();
  });
});
