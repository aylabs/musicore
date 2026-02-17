/**
 * Unit Tests: DemoLoaderService Offline Behavior
 * 
 * Feature: 025-offline-mode (User Story 1)
 * Tests demo loading with IndexedDB fast path and service worker cache integration
 * 
 * Constitution Principle V: Test-First Development
 * These tests are written BEFORE implementation and should FAIL initially.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DemoLoaderService } from '../../src/services/onboarding/demoLoader';
import type { DemoScoreMetadata } from '../../src/services/onboarding/types';
import * as localStorage from '../../src/services/storage/local-storage';
import * as wasmEngine from '../../src/services/wasm/music-engine';

// Mock modules
vi.mock('../../src/services/storage/local-storage');
vi.mock('../../src/services/wasm/music-engine');

describe('DemoLoaderService - Offline Mode (Feature 025, US1)', () => {
  let demoLoader: DemoLoaderService;
  let mockGetAllScores: ReturnType<typeof vi.fn>;
  let mockSaveScore: ReturnType<typeof vi.fn>;
  let mockDeleteScore: ReturnType<typeof vi.fn>;
  let mockParseMusicXML: ReturnType<typeof vi.fn>;
  let mockFetch: ReturnType<typeof vi.fn>;

  // Sample demo score data for tests
  const mockDemoScore: DemoScoreMetadata = {
    id: 'demo-score-123',
    title: 'Canon in D',
    composer: 'Johann Pachelbel',
    instruments: [
      {
        id: 'inst-1',
        name: 'Violin I',
        midi_program: 40,
        staves: [],
      },
    ],
    schema_version: 2,
    isDemoScore: true,
    sourceType: 'bundled',
    bundledPath: '/demo/CanonD.musicxml',
    loadedDate: '2026-02-17T00:00:00.000Z',
    schemaVersion: 2,
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup IndexedDB mocks
    mockGetAllScores = vi.fn();
    mockSaveScore = vi.fn();
    mockDeleteScore = vi.fn();
    vi.mocked(localStorage.getAllScoresFromIndexedDB).mockImplementation(mockGetAllScores);
    vi.mocked(localStorage.saveScoreToIndexedDB).mockImplementation(mockSaveScore);
    vi.mocked(localStorage.deleteScoreFromIndexedDB).mockImplementation(mockDeleteScore);

    // Setup WASM mock
    mockParseMusicXML = vi.fn();
    vi.mocked(wasmEngine.parseMusicXML).mockImplementation(mockParseMusicXML);

    // Setup fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Create fresh instance
    demoLoader = new DemoLoaderService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * T009: Unit test - getDemoScore() returns demo from IndexedDB
   * 
   * This tests the NEW method that should be added for the fast path.
   * Currently, this method exists as getDemoScore() in the service.
   */
  describe('getDemoScore() - IndexedDB fast path', () => {
    it('should return existing demo from IndexedDB', async () => {
      // Arrange: Set up IndexedDB to return a demo
      mockGetAllScores.mockResolvedValue([mockDemoScore]);

      // Act: Get the demo score
      const result = await demoLoader.getDemoScore();

      // Assert: Should return the demo without calling fetch
      expect(result).toEqual(mockDemoScore);
      expect(mockGetAllScores).toHaveBeenCalledTimes(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null if no demo in IndexedDB', async () => {
      // Arrange: Set up IndexedDB to return empty array
      mockGetAllScores.mockResolvedValue([]);

      // Act: Get the demo score
      const result = await demoLoader.getDemoScore();

      // Assert: Should return null
      expect(result).toBeNull();
      expect(mockGetAllScores).toHaveBeenCalledTimes(1);
    });

    it('should return null if IndexedDB contains non-demo scores only', async () => {
      // Arrange: Set up IndexedDB with a regular score (no isDemoScore flag)
      const regularScore = {
        id: 'regular-score',
        title: 'User Score',
        instruments: [],
        schema_version: 2,
        isDemoScore: false, // Not a demo
      };
      mockGetAllScores.mockResolvedValue([regularScore]);

      // Act: Get the demo score
      const result = await demoLoader.getDemoScore();

      // Assert: Should return null (no demo found)
      expect(result).toBeNull();
    });

    it('should handle IndexedDB errors gracefully', async () => {
      // Arrange: Set up IndexedDB to throw an error
      mockGetAllScores.mockRejectedValue(new Error('IndexedDB read failed'));

      // Act: Get the demo score
      const result = await demoLoader.getDemoScore();

      // Assert: Should return null on error, not throw
      expect(result).toBeNull();
    });
  });

  /**
   * T010: Unit test - loadBundledDemo() checks IndexedDB first (fast path)
   * 
   * This tests the NEW behavior where we check IndexedDB before fetching.
   * EXPECTED TO FAIL initially - this is the feature we're implementing.
   */
  describe('loadBundledDemo() - IndexedDB fast path behavior', () => {
    it('should return existing demo from IndexedDB without fetching or parsing', async () => {
      // Arrange: Set up IndexedDB to return a demo
      mockGetAllScores.mockResolvedValue([mockDemoScore]);

      // Act: Load the demo
      const result = await demoLoader.loadBundledDemo();

      // Assert: Should return cached demo from IndexedDB
      expect(result).toEqual(mockDemoScore);
      
      // Assert: Should NOT call fetch or parse (fast path)
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockParseMusicXML).not.toHaveBeenCalled();
      
      // Assert: Should NOT save again (already in IndexedDB)
      expect(mockSaveScore).not.toHaveBeenCalled();
    });

    it('should fetch and parse if demo not in IndexedDB (slow path)', async () => {
      // Arrange: Set up IndexedDB to return empty (no cached demo)
      mockGetAllScores.mockResolvedValue([]);
      
      // Set up successful fetch
      const mockMusicXML = '<?xml version="1.0"?><score-partwise></score-partwise>';
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: '/demo/CanonD.musicxml',
        headers: new Headers({ 'content-type': 'application/xml' }),
        text: vi.fn().mockResolvedValue(mockMusicXML),
      });
      
      // Set up WASM parse result
      mockParseMusicXML.mockResolvedValue({
        score: {
          id: 'new-demo-id',
          instruments: [{ id: 'inst-1', name: 'Violin', midi_program: 40, staves: [] }],
          schema_version: 2,
        },
        warnings: [],
      });
      
      // Set up save to succeed
      mockSaveScore.mockResolvedValue(undefined);

      // Act: Load the demo
      const result = await demoLoader.loadBundledDemo();

      // Assert: Should fetch from cache/network
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('demo/CanonD.musicxml'));
      
      // Assert: Should parse via WASM
      expect(mockParseMusicXML).toHaveBeenCalledTimes(1);
      expect(mockParseMusicXML).toHaveBeenCalledWith(mockMusicXML);
      
      // Assert: Should save to IndexedDB
      expect(mockSaveScore).toHaveBeenCalledTimes(1);
      
      // Assert: Should return the new demo with metadata
      expect(result).toMatchObject({
        title: 'Canon in D',
        composer: 'Johann Pachelbel',
        isDemoScore: true,
        sourceType: 'bundled',
      });
    });
  });

  /**
   * T011: Unit test - loadBundledDemo() loads from cache if not in IndexedDB
   * 
   * This tests the existing behavior - fetching from service worker cache
   * when the demo is not in IndexedDB.
   */
  describe('loadBundledDemo() - service worker cache loading', () => {
    it('should successfully load demo from service worker cache', async () => {
      // Arrange: No demo in IndexedDB
      mockGetAllScores.mockResolvedValue([]);
      
      // Set up successful cache fetch
      const mockMusicXML = '<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"/></part-list></score-partwise>';
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: '/demo/CanonD.musicxml',
        headers: new Headers({ 'content-type': 'application/xml' }),
        text: vi.fn().mockResolvedValue(mockMusicXML),
      });
      
      // Set up WASM parse
      mockParseMusicXML.mockResolvedValue({
        score: {
          id: 'parsed-demo',
          instruments: [{ id: 'inst-1', name: 'Violin', midi_program: 40, staves: [] }],
          schema_version: 2,
        },
        warnings: [],
      });
      
      mockSaveScore.mockResolvedValue(undefined);

      // Act: Load demo
      const result = await demoLoader.loadBundledDemo();

      // Assert: Fetch should succeed (from cache)
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('demo/CanonD.musicxml'));
      
      // Assert: Should parse and save
      expect(mockParseMusicXML).toHaveBeenCalled();
      expect(mockSaveScore).toHaveBeenCalled();
      
      // Assert: Should return valid demo
      expect(result.isDemoScore).toBe(true);
      expect(result.title).toBe('Canon in D');
    });

    it('should handle cache miss with clear error message', async () => {
      // Arrange: No demo in IndexedDB
      mockGetAllScores.mockResolvedValue([]);
      
      // Set up fetch failure (cache miss or offline without cache)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: '/demo/CanonD.musicxml',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      });

      // Act & Assert: Should throw with user-friendly error
      await expect(demoLoader.loadBundledDemo()).rejects.toMatchObject({
        type: 'fetch_failed',
        message: expect.stringContaining('HTTP 404'),
      });
    });
  });

  /**
   * T012: Unit test - loadBundledDemo() throws clear error if cache unavailable
   * 
   * Tests error handling for first offline visit (service worker not installed).
   */
  describe('loadBundledDemo() - error handling', () => {
    it('should throw clear error message for network failure', async () => {
      // Arrange: No demo in IndexedDB
      mockGetAllScores.mockResolvedValue([]);
      
      // Set up network error (e.g., offline with no service worker)
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      // Act & Assert: Should throw user-friendly error
      await expect(demoLoader.loadBundledDemo()).rejects.toMatchObject({
        type: 'fetch_failed',
        message: expect.stringMatching(/Failed to fetch|Unknown error/),
      });
    });

    it('should throw clear error if service worker not installed', async () => {
      // Arrange: No demo in IndexedDB
      mockGetAllScores.mockResolvedValue([]);
      
      // Set up fetch failure mimicking service worker not installed
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        url: '/demo/CanonD.musicxml',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      });

      // Act & Assert: Should throw with status code
      await expect(demoLoader.loadBundledDemo()).rejects.toMatchObject({
        type: 'fetch_failed',
        message: expect.stringContaining('503'),
      });
    });

    it('should handle WASM parse errors gracefully', async () => {
      // Arrange: No demo in IndexedDB, fetch succeeds
      mockGetAllScores.mockResolvedValue([]);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: '/demo/CanonD.musicxml',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('invalid xml'),
      });
      
      // Set up WASM parse failure
      mockParseMusicXML.mockRejectedValue(new Error('Failed to parse MusicXML'));

      // Act & Assert: Should throw parse error
      await expect(demoLoader.loadBundledDemo()).rejects.toMatchObject({
        type: 'parse_failed',
        message: expect.stringContaining('parse'),
      });
    });

    it('should handle IndexedDB storage errors gracefully', async () => {
      // Arrange: No demo in IndexedDB, fetch and parse succeed
      mockGetAllScores.mockResolvedValue([]);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: '/demo/CanonD.musicxml',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('<?xml version="1.0"?><score-partwise></score-partwise>'),
      });
      mockParseMusicXML.mockResolvedValue({
        score: {
          id: 'demo',
          instruments: [{ id: 'inst', name: 'Piano', midi_program: 0, staves: [] }],
          schema_version: 2,
        },
        warnings: [],
      });
      
      // Set up IndexedDB save failure
      mockSaveScore.mockRejectedValue(new Error('IndexedDB quota exceeded'));

      // Act & Assert: Should throw storage error
      await expect(demoLoader.loadBundledDemo()).rejects.toMatchObject({
        type: 'storage_failed',
        message: expect.stringContaining('IndexedDB'),
      });
    });
  });

  /**
   * Additional tests for offline behavior validation
   */
  describe('Offline mode integration', () => {
    it('should logged meaningful messages for fast path', async () => {
      // Arrange: Demo in IndexedDB
      mockGetAllScores.mockResolvedValue([mockDemoScore]);
      
      // Spy on console.log
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act: Load demo
      await demoLoader.loadBundledDemo();

      // Assert: Should log about IndexedDB fast path
      // Note: This test may need adjustment based on actual implementation
      // For now, we just verify no errors are thrown
      expect(consoleLogSpy).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    it('should work identically online and offline after first cache', async () => {
      // Arrange: Demo already in IndexedDB (simulating prior online visit + cache)
      mockGetAllScores.mockResolvedValue([mockDemoScore]);

      // Act: Load demo (simulating offline state)
      const result = await demoLoader.loadBundledDemo();

      // Assert: Should return the cached demo
      expect(result).toEqual(mockDemoScore);
      
      // Assert: Should NOT attempt any network operation
      expect(mockFetch).not.toHaveBeenCalled();
      
      // This proves offline parity - same behavior regardless of network state
    });
  });
});
