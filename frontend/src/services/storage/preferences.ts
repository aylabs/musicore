/**
 * Local Storage Adapters for Preferences
 * 
 * Feature: 013-demo-onboarding
 * Implements first-run detection and view mode preference persistence
 * using browser localStorage.
 */

import type {
  FirstRunState,
  ViewMode,
  ViewModePreference,
  ViewModeSource,
  IFirstRunStorage,
  IViewModePreferenceStorage,
} from '../onboarding/types';
import { STORAGE_KEYS } from '../onboarding/config';

// ============================================================================
// First-Run Storage Adapter
// ============================================================================

/**
 * LocalStorage adapter for first-run state
 * Hexagonal Architecture: Adapter implementing IFirstRunStorage port
 */
export class LocalStorageFirstRunAdapter implements IFirstRunStorage {
  private readonly KEY = STORAGE_KEYS.FIRST_RUN;

  /**
   * Check if this is the first run
   * Fail-safe: returns true on any error
   */
  isFirstRun(): boolean {
    try {
      const stored = localStorage.getItem(this.KEY);
      if (stored === null) return true; // Never set = first run

      const state: FirstRunState = JSON.parse(stored);
      return state.isFirstRun;
    } catch (error) {
      console.warn('[FirstRun] Check failed, assuming first run:', error);
      return true; // Fail-safe: treat unclear state as first run
    }
  }

  /**
   * Get full first-run state
   */
  getFirstRunState(): FirstRunState | null {
    try {
      const stored = localStorage.getItem(this.KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[FirstRun] Failed to read state:', error);
      return null;
    }
  }

  /**
   * Mark first run as complete
   * Non-blocking: logs error but doesn't throw
   */
  markFirstRunComplete(version?: string): void {
    try {
      const state: FirstRunState = {
        isFirstRun: false,
        firstRunDate: new Date().toISOString(),
        firstRunVersion: version,
      };
      localStorage.setItem(this.KEY, JSON.stringify(state));
      console.log('[FirstRun] Marked complete', version ? `(v${version})` : '');
    } catch (error) {
      console.error('[FirstRun] Failed to mark complete:', error);
      // Non-blocking: app continues even if persistence fails
    }
  }

  /**
   * Reset first-run state (for testing/debugging)
   */
  resetFirstRun(): void {
    try {
      localStorage.removeItem(this.KEY);
      console.log('[FirstRun] State reset');
    } catch (error) {
      console.error('[FirstRun] Failed to reset:', error);
    }
  }
}

// ============================================================================
// View Mode Preference Storage Adapter
// ============================================================================

/**
 * LocalStorage adapter for view mode preferences
 * Hexagonal Architecture: Adapter implementing IViewModePreferenceStorage port
 */
export class LocalStorageViewModeAdapter implements IViewModePreferenceStorage {
  private readonly KEY = STORAGE_KEYS.VIEW_MODE;
  private readonly DEFAULT_MODE: ViewMode = 'stacked';

  /**
   * Get current view mode preference
   */
  getViewModePreference(): ViewModePreference | null {
    try {
      const stored = localStorage.getItem(this.KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[ViewMode] Failed to read preference:', error);
      return null;
    }
  }

  /**
   * Get current view mode (convenience method)
   * Returns default "stacked" if not set
   */
  getViewMode(): ViewMode {
    const pref = this.getViewModePreference();
    return pref?.mode ?? this.DEFAULT_MODE;
  }

  /**
   * Set view mode preference
   * Non-blocking: logs error but doesn't throw
   */
  setViewMode(mode: ViewMode, source: ViewModeSource = 'user'): void {
    try {
      const pref: ViewModePreference = {
        mode,
        lastUpdated: new Date().toISOString(),
        source,
      };
      localStorage.setItem(this.KEY, JSON.stringify(pref));
      console.log(`[ViewMode] Set to "${mode}" (source: ${source})`);
    } catch (error) {
      console.error('[ViewMode] Failed to set preference:', error);
      // Non-blocking: view mode remains in-memory
    }
  }

  /**
   * Check if view mode preference exists
   */
  hasViewModePreference(): boolean {
    try {
      return localStorage.getItem(this.KEY) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clear view mode preference (for testing)
   */
  clearViewModePreference(): void {
    try {
      localStorage.removeItem(this.KEY);
      console.log('[ViewMode] Preference cleared');
    } catch (error) {
      console.error('[ViewMode] Failed to clear:', error);
    }
  }
}

// ============================================================================
// Singleton Instances (T013)
// ============================================================================

/**
 * Singleton instance of first-run storage
 * Export for use in onboarding service
 */
export const firstRunStorage = new LocalStorageFirstRunAdapter();

/**
 * Singleton instance of view mode storage
 * Export for use in onboarding hooks
 */
export const viewModeStorage = new LocalStorageViewModeAdapter();
