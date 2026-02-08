import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportButton } from "./ImportButton";
import type { ImportResult } from "../../services/import/MusicXMLImportService";

/**
 * T079: Unit tests for ImportButton component
 *
 * Feature 006 - MusicXML Import: User Story 1
 * Tests file selection, upload, loading state, error display,
 * and success callback with import result.
 */
describe("ImportButton", () => {
  // Mock fetch globally
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Test: Component renders button with default text
   */
  it("should render button with default text", () => {
    render(<ImportButton />);

    expect(
      screen.getByRole("button", { name: /import musicxml/i })
    ).toBeInTheDocument();
  });

  /**
   * Test: Component renders button with custom text
   */
  it("should render button with custom text", () => {
    render(<ImportButton buttonText="Upload Score" />);

    expect(
      screen.getByRole("button", { name: /upload score/i })
    ).toBeInTheDocument();
  });

  /**
   * Test: File input has correct accept attribute
   */
  it("should have file input with correct accept filter", () => {
    render(<ImportButton />);

    const fileInput = screen.getByLabelText(/upload musicxml file/i);
    expect(fileInput).toHaveAttribute("accept", ".musicxml,.xml,.mxl");
  });

  /**
   * Test: Button is disabled when disabled prop is true
   */
  it("should disable button when disabled prop is true", () => {
    render(<ImportButton disabled />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  /**
   * Test: File selection triggers import process
   */
  it("should trigger import when file is selected", async () => {
    const mockImportResult: ImportResult = {
      score: {
        id: "test-score-id",
        title: "Test Score",
        instruments: [],
        tempo_changes: [],
      },
      metadata: {
        format: "MusicXML",
        file_name: "test.musicxml",
        work_title: "Test Score",
        composer: "Test Composer",
      },
      statistics: {
        instrument_count: 1,
        staff_count: 1,
        voice_count: 1,
        note_count: 8,
        measure_count: 8,
        duration_ticks: 7680,
      },
      warnings: [],
    };

    // Mock fetch to return success
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockImportResult,
    } as Response);

    const onImportComplete = vi.fn();
    render(<ImportButton onImportComplete={onImportComplete} />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const testFile = new File(
      ['<?xml version="1.0"?><score-partwise></score-partwise>'],
      "test.musicxml",
      { type: "application/xml" }
    );

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for import to complete
    await waitFor(() => {
      expect(onImportComplete).toHaveBeenCalledWith(mockImportResult);
    });
  });

  /**
   * Test: Loading state is displayed during import
   */
  it("should display loading state during import", async () => {
    // Mock fetch with delayed response
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  score: { id: "test", instruments: [] },
                  metadata: { format: "MusicXML" },
                  statistics: { note_count: 0 },
                  warnings: [],
                }),
              }),
            100
          );
        })
    );

    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const testFile = new File(["test"], "test.musicxml", {
      type: "application/xml",
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Check loading state appears
    await waitFor(() => {
      expect(screen.getByText(/importing\.\.\./i)).toBeInTheDocument();
    });

    // Check loading message appears
    expect(
      screen.getByText(/uploading and processing file/i)
    ).toBeInTheDocument();

    // Button should be disabled during loading
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  /**
   * Test: Error message is displayed on import failure
   */
  it("should display error message on import failure", async () => {
    // Mock fetch to return error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: "Invalid MusicXML structure",
        details: "Missing required <part-list> element",
      }),
    } as Response);

    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const testFile = new File(["invalid"], "test.musicxml", {
      type: "application/xml",
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText(/import failed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/invalid musicxml structure/i)
    ).toBeInTheDocument();
  });

  /**
   * Test: Error can be dismissed
   */
  it("should dismiss error when dismiss button is clicked", async () => {
    // Mock fetch to return error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: "Invalid MusicXML",
      }),
    } as Response);

    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const testFile = new File(["invalid"], "test.musicxml", {
      type: "application/xml",
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Click dismiss button
    const dismissButton = screen.getByLabelText(/dismiss error/i);
    fireEvent.click(dismissButton);

    // Error should be removed
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Success message displays statistics
   */
  it("should display success message with statistics", async () => {
    const mockImportResult: ImportResult = {
      score: {
        id: "test-score-id",
        title: "Test Score",
        instruments: [],
        tempo_changes: [],
      },
      metadata: {
        format: "MusicXML",
        file_name: "test.musicxml",
        work_title: "Test Score",
        composer: "Test Composer",
      },
      statistics: {
        instrument_count: 2,
        staff_count: 3,
        voice_count: 3,
        note_count: 120,
        measure_count: 16,
        duration_ticks: 15360,
      },
      warnings: [],
    };

    // Mock fetch to return success
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockImportResult,
    } as Response);

    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const testFile = new File(["test"], "test.musicxml", {
      type: "application/xml",
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/import successful/i)).toBeInTheDocument();
    });

    // Check statistics are displayed
    expect(screen.getByText(/2 instrument\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3 staff\/staves/i)).toBeInTheDocument();
    expect(screen.getByText(/120 notes/i)).toBeInTheDocument();
  });

  /**
   * Test: Warnings are displayed when present
   */
  it("should display warnings when present in import result", async () => {
    const mockImportResult: ImportResult = {
      score: {
        id: "test-score-id",
        title: "Test Score",
        instruments: [],
        tempo_changes: [],
      },
      metadata: {
        format: "MusicXML",
        file_name: "test.musicxml",
        work_title: "Test Score",
        composer: "Test Composer",
      },
      statistics: {
        instrument_count: 1,
        staff_count: 1,
        voice_count: 1,
        note_count: 8,
        measure_count: 8,
        duration_ticks: 7680,
      },
      warnings: [
        {
          code: "PRECISION_LOSS",
          message: "Timing conversion resulted in ±5 tick precision loss",
          context: "measure 4",
        },
        {
          code: "UNSUPPORTED_ELEMENT",
          message: "Lyrics element not supported",
          context: "measure 8",
        },
      ],
    };

    // Mock fetch to return success with warnings
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockImportResult,
    } as Response);

    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const testFile = new File(["test"], "test.musicxml", {
      type: "application/xml",
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for success message with warnings
    await waitFor(() => {
      expect(screen.getByText(/2 warning\(s\)/i)).toBeInTheDocument();
    });

    // Expand warnings
    const warningsSummary = screen.getByText(/2 warning\(s\)/i);
    fireEvent.click(warningsSummary);

    // Check warning messages are displayed
    expect(
      screen.getByText(/timing conversion resulted in/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/lyrics element not supported/i)).toBeInTheDocument();
  });

  /**
   * Test: File input is reset after import (allows re-importing same file)
   */
  it("should reset file input after import completes", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        score: { id: "test", instruments: [] },
        metadata: { format: "MusicXML" },
        statistics: { note_count: 8 },
        warnings: [],
      }),
    } as Response);

    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const testFile = new File(["test"], "test.musicxml", {
      type: "application/xml",
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for import to complete
    await waitFor(() => {
      expect(screen.getByText(/import successful/i)).toBeInTheDocument();
    });

    // File input should be reset (empty value)
    expect(fileInput.value).toBe("");
  });

  /**
   * Test: Button click triggers hidden file input
   */
  it("should trigger file input when button is clicked", () => {
    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const button = screen.getByRole("button");

    // Mock the click method
    const inputClickMock = vi.fn();
    fileInput.click = inputClickMock;

    // Click the button
    fireEvent.click(button);

    // File input click should be triggered
    expect(inputClickMock).toHaveBeenCalled();
  });

  /**
   * Test: Invalid file extension validation
   */
  it("should handle invalid file extension", async () => {
    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;
    const testFile = new File(["test"], "test.pdf", {
      type: "application/pdf",
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Should show error about invalid file type
    expect(
      screen.getByText(/unsupported file type/i)
    ).toBeInTheDocument();
  });

  /**
   * Test: File size limit validation
   */
  it("should handle file size limit exceeded", async () => {
    render(<ImportButton />);

    const fileInput = screen.getByLabelText(
      /upload musicxml file/i
    ) as HTMLInputElement;

    // Create a file larger than 10MB
    const largeContent = "x".repeat(11 * 1024 * 1024); // 11MB
    const largeFile = new File([largeContent], "large.musicxml", {
      type: "application/xml",
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Should show error about file size
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });
});
