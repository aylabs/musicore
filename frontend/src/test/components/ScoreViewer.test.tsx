import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ScoreViewer } from "../../components/ScoreViewer";
import { FileStateProvider } from "../../services/state/FileStateContext";
import { TempoStateProvider } from "../../services/state/TempoStateContext";
import { apiClient } from "../../services/score-api";

/**
 * T004 & T011: Unit tests for ScoreViewer component - Feature 014
 *
 * Feature 014 - Remove Editing Interface: User Stories 1 & 2
 * Tests that editing UI elements do not render:
 * - Save button (US1)
 * - Score name input field (US1)
 * - New Score button (US2)
 */

// Mock WASM loader to prevent initialization errors in tests
vi.mock("../../services/wasm/loader", () => ({
  initWasm: vi.fn().mockResolvedValue(undefined),
}));

// Mock WASM engine with minimal implementation
vi.mock("../../services/wasm/music-engine", () => ({
  parseScore: vi.fn(),
  addInstrument: vi.fn(),
  getScore: vi.fn(),
}));

// Mock API client
vi.mock("../../services/score-api", () => ({
  apiClient: {
    getScore: vi.fn(),
    createScore: vi.fn(),
    addInstrument: vi.fn(),
  },
}));

// Mock demo loader service
vi.mock("../../services/onboarding/demoLoader", () => ({
  demoLoaderService: {
    shouldLoadDemo: vi.fn().mockReturnValue(false),
    loadDemo: vi.fn(),
    markDemoLoaded: vi.fn(),
  },
}));

// Mock storage service
vi.mock("../../services/storage/local-storage", () => ({
  loadScoreFromIndexedDB: vi.fn().mockResolvedValue(null),
  saveScoreToIndexedDB: vi.fn(),
}));

// Mock useOnboarding hook to control view mode and demo loading
vi.mock("../../hooks/useOnboarding", () => ({
  useOnboarding: vi.fn().mockReturnValue({
    viewMode: "individual",
    setViewMode: vi.fn(),
    isDemoLoading: false,
    demoError: null,
  }),
}));

// Wrapper component for providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <TempoStateProvider>
      <FileStateProvider>{children}</FileStateProvider>
    </TempoStateProvider>
  );
}

describe("ScoreViewer - Editing UI Removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Save button should NOT render in viewer header
   */
  it("should not render Save button in score viewer header", async () => {
    // Mock score with all required fields
    const mockScore = {
      id: "test-id",
      title: "Test Score",
      instruments: [
        {
          id: "inst-1",
          name: "Piano",
          staves: [],
        },
      ],
      tempo_changes: [],
      global_structural_events: [
        {
          Tempo: {
            tick: 0,
            bpm: 120,
          },
        },
        {
          TimeSignature: {
            tick: 0,
            numerator: 4,
            denominator: 4,
          },
        },
      ],
    };

    vi.mocked(apiClient.getScore).mockResolvedValue(mockScore);

    render(
      <TestWrapper>
        <ScoreViewer scoreId="test-id" />
      </TestWrapper>
    );

    // Wait for score to load
    await waitFor(() => {
      expect(screen.queryByText("Piano")).toBeInTheDocument();
    });

    // Query for Save button
    const saveButton = screen.queryByRole("button", { name: /^save$/i });
    expect(saveButton).not.toBeInTheDocument();
  });

  /**
   * Test: Score name input field should NOT render
   */
  it("should not render score filename input field", async () => {
    const mockScore = {
      id: "test-id",
      title: "Test Score",
      instruments: [],
      tempo_changes: [],
      global_structural_events: [
        {
          Tempo: {
            tick: 0,
            bpm: 120,
          },
        },
        {
          TimeSignature: {
            tick: 0,
            numerator: 4,
            denominator: 4,
          },
        },
      ],
    };

    vi.mocked(apiClient.getScore).mockResolvedValue(mockScore);

    render(
      <TestWrapper>
        <ScoreViewer scoreId="test-id" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(apiClient.getScore).toHaveBeenCalled();
    });

    // Query for filename input by placeholder text
    const filenameInput = screen.queryByPlaceholderText(/filename.*optional/i);
    expect(filenameInput).not.toBeInTheDocument();
  });

  /**
   * Test: New Score button should NOT render in landing page
   */
  it("should not render New Score button in landing page", async () => {
    render(
      <TestWrapper>
        <ScoreViewer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText("No Score Loaded")).toBeInTheDocument();
    });

    // Query for New Score button in landing page
    const newScoreButton = screen.queryByRole("button", { name: /^new score$/i });
    expect(newScoreButton).not.toBeInTheDocument();
  });

  /**
   * Test: New button should NOT render in viewer header
   */
  it("should not render New button in viewer header", async () => {
    const mockScore = {
      id: "test-id",
      title: "Test Score",
      instruments: [],
      tempo_changes: [],
      global_structural_events: [
        {
          Tempo: {
            tick: 0,
            bpm: 120,
          },
        },
        {
          TimeSignature: {
            tick: 0,
            numerator: 4,
            denominator: 4,
          },
        },
      ],
    };

    vi.mocked(apiClient.getScore).mockResolvedValue(mockScore);

    render(
      <TestWrapper>
        <ScoreViewer scoreId="test-id" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(apiClient.getScore).toHaveBeenCalled();
    });

    // Query for New button (shorter label in header)
    const newButton = screen.queryByRole("button", { name: /^new$/i });
    expect(newButton).not.toBeInTheDocument();
  });

  /**
   * Test: Import button should still render (functionality preserved)
   */
  it("should still render Import button", async () => {
    render(
      <TestWrapper>
        <ScoreViewer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText("No Score Loaded")).toBeInTheDocument();
    });

    // Verify Import button is present
    const importButton = screen.queryByRole("button", { name: /import/i });
    expect(importButton).toBeInTheDocument();
  });

  /**
   * Test: Demo button should still render on landing page (functionality preserved)
   */
  it("should still render Demo button on landing page", async () => {
    render(
      <TestWrapper>
        <ScoreViewer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText("No Score Loaded")).toBeInTheDocument();
    });

    // Verify Demo button is present on landing page
    const demoButton = screen.queryByRole("button", { name: /demo/i });
    expect(demoButton).toBeInTheDocument();
  });
});
