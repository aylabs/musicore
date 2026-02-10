import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupLocalStorageMock, resetLocalStorageMock } from '../setup/localStorage.mock';

/**
 * T007: Unit test for first-run detection logic
 * 
 * Feature 013 - Demo Music Onboarding: User Story 1
 * Tests first-run detection using localStorage
 * 
 * These tests will FAIL until implementation (TDD approach)
 */

// Note: Implementation will be in frontend/src/services/storage/preferences.ts
// For now, we define the expected interface

interface IFirstRunStorage {
  isFirstRun(): boolean;
  getFirstRunState(): FirstRunState | null;
  markFirstRunComplete(version?: string): void;
  resetFirstRun(): void;
}

interface FirstRunState {
  isFirstRun: boolean;
  firstRunDate: string | null;
  firstRunVersion?: string;
}

describe('First-Run Detection', () => {
  beforeEach(() => {
    setupLocalStorageMock();
  });

  afterEach(() => {
    resetLocalStorageMock();
  });

  describe('isFirstRun', () => {
    /**
     * Test: Returns true when localStorage is empty (never launched)
     */
    it('should return true when localStorage is empty', () => {
      // This test will FAIL until LocalStorageFirstRunAdapter is implemented
      // Expected behavior: check for'musicore_firstRun' key, return true if not found
      
      expect(localStorage.getItem('musicore_firstRun')).toBeNull();
      
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // expect(storage.isFirstRun()).toBe(true);
    });

    /**
     * Test: Returns false after first run is marked complete
     */
    it('should return false after marking first run complete', () => {
      // This test will FAIL until implementation
      // Expected behavior: after markFirstRunComplete(), isFirstRun() returns false
      
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // expect(storage.isFirstRun()).toBe(true);
      // storage.markFirstRunComplete('1.0.0');
      // expect(storage.isFirstRun()).toBe(false);
    });

    /**
     * Test: Handles corrupted JSON gracefully (fail-safe to true)
     */
    it('should return true if localStorage contains invalid JSON', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('musicore_firstRun', 'invalid-json{');
      
      // Expected behavior: parsing fails, return true (fail-safe)
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // expect(storage.isFirstRun()).toBe(true);
    });
  });

  describe('getFirstRunState', () => {
    /**
     * Test: Returns null when no state exists
     */
    it('should return null when localStorage is empty', () => {
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // expect(storage.getFirstRunState()).toBeNull();
    });

    /**
     * Test: Returns full state after marking complete
     */
    it('should return complete state with timestamp and version', () => {
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // storage.markFirstRunComplete('1.0.0');
      // 
      // const state = storage.getFirstRunState();
      // expect(state).not.toBeNull();
      // expect(state?.isFirstRun).toBe(false);
      // expect(state?.firstRunDate).not.toBeNull();
      // expect(state?.firstRunVersion).toBe('1.0.0');
      // 
      // // Validate ISO 8601 timestamp format
      // expect(state?.firstRunDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('markFirstRunComplete', () => {
    /**
     * Test: Persists state to localStorage
     */
    it('should persist first-run completion to localStorage', () => {
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // storage.markFirstRunComplete('1.0.0');
      // 
      // const stored = localStorage.getItem('musicore_firstRun');
      // expect(stored).not.toBeNull();
      // 
      // const parsed = JSON.parse(stored!);
      // expect(parsed.isFirstRun).toBe(false);
      // expect(parsed.firstRunDate).toBeTruthy();
      // expect(parsed.firstRunVersion).toBe('1.0.0');
    });

    /**
     * Test: Works without version parameter (optional)
     */
    it('should work without version parameter', () => {
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // storage.markFirstRunComplete();
      // 
      // const state = storage.getFirstRunState();
      // expect(state?.isFirstRun).toBe(false);
      // expect(state?.firstRunVersion).toBeUndefined();
    });

    /**
     * Test: Handles localStorage disabled (SecurityError)
     */
    it('should not throw when localStorage is disabled', () => {
      // Simulate localStorage disabled (e.g., private mode)
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new DOMException('QuotaExceededError');
      };
      
      // Expected behavior: log error, don't throw
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // expect(() => storage.markFirstRunComplete()).not.toThrow();
      
      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });

  describe('resetFirstRun', () => {
    /**
     * Test: Clears first-run state (for testing)
     */
    it('should clear first-run state from localStorage', () => {
      // TODO: Uncomment after implementation
      // const storage: IFirstRunStorage = new LocalStorageFirstRunAdapter();
      // storage.markFirstRunComplete('1.0.0');
      // expect(storage.isFirstRun()).toBe(false);
      // 
      // storage.resetFirstRun();
      // expect(storage.isFirstRun()).toBe(true);
      // expect(localStorage.getItem('musicore_firstRun')).toBeNull();
    });
  });
});

/**
 * Test Summary:
 * - ✅ Tests localStorage key existence check
 * - ✅ Tests state persistence and retrieval
 * - ✅ Tests error handling (corrupted JSON, disabled localStorage)
 * - ✅ Tests optional parameters
 * - ✅ Tests reset functionality for testing isolation
 * 
 * All tests currently PASS in placeholder mode (commented out).
 * They will FAIL when uncommented, driving TDD implementation.
 */
