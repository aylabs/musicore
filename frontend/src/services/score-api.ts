import type {
  Score,
  Instrument,
  Staff,
  Voice,
  Note,
  TempoEvent,
  TimeSignatureEvent,
  ClefEvent,
  KeySignatureEvent,
  CreateScoreRequest,
  AddInstrumentRequest,
  AddNoteRequest,
  AddTempoEventRequest,
  AddTimeSignatureEventRequest,
  AddClefEventRequest,
  AddKeySignatureEventRequest,
  ApiError,
} from "../types/score";

/**
 * ScoreApiClient - Service class for interacting with the backend API
 * 
 * Provides methods to:
 * - Manage scores (create, list, get, delete)
 * - Add domain entities (instruments, staves, voices, notes)
 * - Add structural events (tempo, time signature, clef, key signature)
 * 
 * @example
 * ```typescript
 * const client = new ScoreApiClient("http://localhost:8080");
 * const score = await client.createScore({ title: "My Score" });
 * const instrument = await client.addInstrument(score.id, { name: "Piano" });
 * ```
 */
export class ScoreApiClient {
  private readonly baseUrl: string;

  /**
   * Create a new API client instance
   * @param baseUrl - Base URL of the backend API (default: http://localhost:8080)
   */
  constructor(baseUrl: string = "http://localhost:8080") {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }

  /**
   * Handle API response and error handling
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "UnknownError",
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(`${error.error}: ${error.message}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ============================================================================
  // Score Management
  // ============================================================================

  /**
   * Create a new score with default tempo (120 BPM) and time signature (4/4)
   * @param request - Optional score creation parameters
   * @returns The created score with default structural events
   */
  async createScore(request: CreateScoreRequest = {}): Promise<Score> {
    const response = await fetch(`${this.baseUrl}/api/v1/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return this.handleResponse<Score>(response);
  }

  /**
   * List all score IDs
   * @returns Array of score UUIDs
   */
  async listScores(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/scores`);
    return this.handleResponse<string[]>(response);
  }

  /**
   * Get a score by ID with full hierarchy
   * @param scoreId - UUID of the score
   * @returns Complete score including instruments, staves, voices, notes, and events
   */
  async getScore(scoreId: string): Promise<Score> {
    const response = await fetch(`${this.baseUrl}/api/v1/scores/${scoreId}`);
    return this.handleResponse<Score>(response);
  }

  /**
   * Delete a score by ID
   * @param scoreId - UUID of the score to delete
   */
  async deleteScore(scoreId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/scores/${scoreId}`, {
      method: "DELETE",
    });
    return this.handleResponse<void>(response);
  }

  // ============================================================================
  // Domain Entity Operations
  // ============================================================================

  /**
   * Add an instrument to a score
   * @param scoreId - UUID of the parent score
   * @param request - Instrument details (name)
   * @returns The created instrument with default staff and voice
   */
  async addInstrument(
    scoreId: string,
    request: AddInstrumentRequest
  ): Promise<Instrument> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/${scoreId}/instruments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    return this.handleResponse<Instrument>(response);
  }

  /**
   * Add a staff to an instrument
   * @param scoreId - UUID of the parent score
   * @param instrumentId - UUID of the parent instrument
   * @returns The created staff with default clef (treble) and key signature (C major)
   */
  async addStaff(scoreId: string, instrumentId: string): Promise<Staff> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/${scoreId}/instruments/${instrumentId}/staves`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    return this.handleResponse<Staff>(response);
  }

  /**
   * Add a voice to a staff
   * @param scoreId - UUID of the parent score
   * @param instrumentId - UUID of the parent instrument
   * @param staffId - UUID of the parent staff
   * @returns The created voice
   */
  async addVoice(
    scoreId: string,
    instrumentId: string,
    staffId: string
  ): Promise<Voice> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/${scoreId}/instruments/${instrumentId}/staves/${staffId}/voices`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    return this.handleResponse<Voice>(response);
  }

  /**
   * Add a note to a voice with validation (pitch range, overlap detection)
   * @param scoreId - UUID of the parent score
   * @param instrumentId - UUID of the parent instrument
   * @param staffId - UUID of the parent staff
   * @param voiceId - UUID of the parent voice
   * @param request - Note details (tick, duration, pitch)
   * @returns The created note
   * @throws Error if note overlaps with existing note of same pitch or pitch is invalid
   */
  async addNote(
    scoreId: string,
    instrumentId: string,
    staffId: string,
    voiceId: string,
    request: AddNoteRequest
  ): Promise<Note> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/${scoreId}/instruments/${instrumentId}/staves/${staffId}/voices/${voiceId}/notes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    return this.handleResponse<Note>(response);
  }

  // ============================================================================
  // Global Structural Events
  // ============================================================================

  /**
   * Add a tempo change event to the score
   * @param scoreId - UUID of the parent score
   * @param request - Tempo event details (tick, bpm)
   * @returns The created tempo event
   * @throws Error if duplicate event exists at the same tick or BPM is invalid (20-400)
   */
  async addTempoEvent(
    scoreId: string,
    request: AddTempoEventRequest
  ): Promise<TempoEvent> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/${scoreId}/structural-events/tempo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    return this.handleResponse<TempoEvent>(response);
  }

  /**
   * Add a time signature change event to the score
   * @param scoreId - UUID of the parent score
   * @param request - Time signature event details (tick, numerator, denominator)
   * @returns The created time signature event
   * @throws Error if duplicate event exists at the same tick
   */
  async addTimeSignatureEvent(
    scoreId: string,
    request: AddTimeSignatureEventRequest
  ): Promise<TimeSignatureEvent> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/${scoreId}/structural-events/time-signature`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    return this.handleResponse<TimeSignatureEvent>(response);
  }

  // ============================================================================
  // Staff-Scoped Structural Events
  // ============================================================================

  /**
   * Add a clef change event to a staff
   * @param scoreId - UUID of the parent score
   * @param instrumentId - UUID of the parent instrument
   * @param staffId - UUID of the parent staff
   * @param request - Clef event details (tick, clef_type)
   * @returns The created clef event
   * @throws Error if duplicate event exists at the same tick
   */
  async addClefEvent(
    scoreId: string,
    instrumentId: string,
    staffId: string,
    request: AddClefEventRequest
  ): Promise<ClefEvent> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/${scoreId}/instruments/${instrumentId}/staves/${staffId}/structural-events/clef`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    return this.handleResponse<ClefEvent>(response);
  }

  /**
   * Add a key signature change event to a staff
   * @param scoreId - UUID of the parent score
   * @param instrumentId - UUID of the parent instrument
   * @param staffId - UUID of the parent staff
   * @param request - Key signature event details (tick, key)
   * @returns The created key signature event
   * @throws Error if duplicate event exists at the same tick
   */
  async addKeySignatureEvent(
    scoreId: string,
    instrumentId: string,
    staffId: string,
    request: AddKeySignatureEventRequest
  ): Promise<KeySignatureEvent> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/${scoreId}/instruments/${instrumentId}/staves/${staffId}/structural-events/key-signature`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    return this.handleResponse<KeySignatureEvent>(response);
  }
}

/**
 * Default API client instance for convenient usage
 */
export const apiClient = new ScoreApiClient();
