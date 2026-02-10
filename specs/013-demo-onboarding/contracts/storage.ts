/**
 * Storage Interface Contracts: Demo Music Onboarding
 * 
 * Feature: 013-demo-onboarding
 * Purpose: Interface definitions for first-run state and preference persistence
 * 
 * Data Model: ../data-model.md
 * Types: ./types.ts
 */

import type { FirstRunState, ViewModePreference, ViewMode, ViewModeSource } from './types';

// ============================================================================
// First-Run Storage Port
// ============================================================================

/**
 * Port for first-run state persistence (Local Storage adapter)
 * Hexagonal Architecture: Port defined by domain, implemented by adapter
 */
export interface IFirstRunStorage {
  /**
   * Check if this is the first run
   * @returns true if user has never launched app, false otherwise
   * @throws Never (returns true on error for fail-safe behavior)
   */
  isFirstRun(): boolean;
  
  /**
   * Get full first-run state (for analytics/debugging)
   * @returns FirstRunState or null if not initialized
   */
  getFirstRunState(): FirstRunState | null;
  
  /**
   * Mark first run as complete
   * @param version App version completing first run (optional)
   * @throws Never (logs error on failure, continues without blocking)
   */
  markFirstRunComplete(version?: string): void;
  
  /**
   * Reset first-run state (for testing/debugging only)
   * WARNING: Clears first-run flag and date
   */
  resetFirstRun(): void;
}

// ============================================================================
// View Mode Preference Storage Port
// ============================================================================

/**
 * Port for view mode preference persistence (Local Storage adapter)
 * Hexagonal Architecture: Port defined by domain, implemented by adapter
 */
export interface IViewModePreferenceStorage {
  /**
   * Get current view mode preference
   * @returns ViewModePreference or null if not set (defaults to "stacked")
   */
  getViewModePreference(): ViewModePreference | null;
  
  /**
   * Get current view mode (convenience method)
   * @returns ViewMode, defaults to "stacked" if not set
   */
  getViewMode(): ViewMode;
  
  /**
   * Set view mode preference
   * @param mode View mode to persist
   * @param source How preference was set (default: "user")
   * @throws Never (logs error on failure, state remains in-memory)
   */
  setViewMode(mode: ViewMode, source?: ViewModeSource): void;
  
  /**
   * Check if view mode preference exists
   * @returns true if preference has been set, false otherwise
   */
  hasViewModePreference(): boolean;
  
  /**
   * Clear view mode preference (for testing)
   * WARNING: Removes stored preference
   */
  clearViewModePreference(): void;
}

// ============================================================================
// Local Storage Adapter Implementation Guidelines
// ============================================================================

/**
 * Implementation notes for Local Storage adapter:
 * 
 * 1. Key Namespace:
 *    - First-run: 'musicore_firstRun'
 *    - View mode: 'musicore_viewMode'
 * 
 * 2. Value Encoding:
 *    - Store as JSON strings: JSON.stringify() / JSON.parse()
 *    - Handle corrupted JSON gracefully (return defaults, log warning)
 * 
 * 3. Error Handling:
 *    - localStorage disabled (private mode): Return defaults, log info
 *    - Storage quota exceeded: Log error, continue without persistence
 *    - SecurityError (iframe context): Fail gracefully with in-memory fallback
 * 
 * 4. Browser Compatibility:
 *    - Synchronous API (supported in all modern browsers)
 *    - iOS Safari standalone PWA: Fully supported (validated in Feature 012)
 *    - Private/Incognito mode: May not persist, graceful degradation
 * 
 * 5. Testing:
 *    - Mock localStorage for unit tests
 *    - Simulate quota exceeded, disabled localStorage
 *    - Manual testing in private browsing mode
 */

// ============================================================================
// Storage Adapter Example (Pseudo-code)
// ============================================================================

/**
 * Example implementation (actual code in frontend/src/services/storage/preferences.ts)
 */
export class LocalStorageFirstRunAdapter implements IFirstRunStorage {
  private readonly KEY = 'musicore_firstRun';
  
  isFirstRun(): boolean {
    try {
      const stored = localStorage.getItem(this.KEY);
      if (stored === null) return true; // Never set = first run
      const state: FirstRunState = JSON.parse(stored);
      return state.isFirstRun;
    } catch (error) {
      console.warn('First-run check failed, assuming first run:', error);
      return true; // Fail-safe: treat as first run
    }
  }
  
  getFirstRunState(): FirstRunState | null {
    try {
      const stored = localStorage.getItem(this.KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to read first-run state:', error);
      return null;
    }
  }
  
  markFirstRunComplete(version?: string): void {
    try {
      const state: FirstRunState = {
        isFirstRun: false,
        firstRunDate: new Date().toISOString(),
        firstRunVersion: version
      };
      localStorage.setItem(this.KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to mark first-run complete:', error);
      // Non-blocking: app continues even if persistence fails
    }
  }
  
  resetFirstRun(): void {
    try {
      localStorage.removeItem(this.KEY);
    } catch (error) {
      console.error('Failed to reset first-run state:', error);
    }
  }
}

export class LocalStorageViewModeAdapter implements IViewModePreferenceStorage {
  private readonly KEY = 'musicore_viewMode';
  private readonly DEFAULT_MODE: ViewMode = 'stacked';
  
  getViewModePreference(): ViewModePreference | null {
    try {
      const stored = localStorage.getItem(this.KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to read view mode preference:', error);
      return null;
    }
  }
  
  getViewMode(): ViewMode {
    const pref = this.getViewModePreference();
    return pref?.mode ?? this.DEFAULT_MODE;
  }
  
  setViewMode(mode: ViewMode, source: ViewModeSource = 'user'): void {
    try {
      const pref: ViewModePreference = {
        mode,
        lastUpdated: new Date().toISOString(),
        source
      };
      localStorage.setItem(this.KEY, JSON.stringify(pref));
    } catch (error) {
      console.error('Failed to persist view mode preference:', error);
      // Non-blocking: in-memory state continues
    }
  }
  
  hasViewModePreference(): boolean {
    try {
      return localStorage.getItem(this.KEY) !== null;
    } catch {
      return false;
    }
  }
  
  clearViewModePreference(): void {
    try {
      localStorage.removeItem(this.KEY);
    } catch (error) {
      console.error('Failed to clear view mode preference:', error);
    }
  }
}
