/**
 * Type Definitions: Demo Music Onboarding
 * 
 * Feature: 013-demo-onboarding
 * Purpose: Type contracts for first-run detection, view mode preferences, and demo loading
 * 
 * Data Model: specs/013-demo-onboarding/data-model.md
 * Plan: specs/013-demo-onboarding/plan.md
 */

// ============================================================================
// First-Run State Types
// ============================================================================

/**
 * First-run state tracking whether user has launched app before
 * Storage: Local Storage (key: 'musicore_firstRun')
 */
export interface FirstRunState {
  /** True if user has never launched app, false otherwise */
  isFirstRun: boolean;
  
  /** ISO 8601 timestamp when first run was completed (null if still first run) */
  firstRunDate: string | null;
  
  /** App version during first run (for migration tracking, optional) */
  firstRunVersion?: string;
}

// ============================================================================
// View Mode Preference Types
// ============================================================================

/**
 * Valid view mode values
 */
export type ViewMode = 'stacked' | 'single';

/**
 * Source of view mode preference (for analytics)
 */
export type ViewModeSource = 'default' | 'user' | 'onboarding';

/**
 * View mode preference persisted across sessions
 * Storage: Local Storage (key: 'musicore_viewMode')
 */
export interface ViewModePreference {
  /** Current view mode setting */
  mode: ViewMode;
  
  /** ISO 8601 timestamp of last preference change */
  lastUpdated: string;
  
  /** How preference was set (default, user action, or onboarding) */
  source: ViewModeSource;
}

// ============================================================================
// Demo Score Types
// ============================================================================

/**
 * Source type for scores in the library
 */
export type ScoreSourceType = 'bundled' | 'imported';

/**
 * Metadata extension for demo score identification
 * Extends existing Score entity from Feature 011
 */
export interface DemoScoreMetadata {
  /** Unique identifier (UUID) for score in library */
  id: string;
  
  /** Score title (e.g., "Canon in D") */
  title: string;
  
  /** Composer name (e.g., "Johann Pachelbel") */
  composer: string;
  
  /** True if this is the bundled demo score */
  isDemoScore: boolean;
  
  /** Whether score was bundled or user-imported */
  sourceType: ScoreSourceType;
  
  /** Path to bundled asset (only for bundled scores) */
  bundledPath?: string;
  
  /** ISO 8601 timestamp when score was loaded into library */
  loadedDate: string;
}

// ============================================================================
// Onboarding Configuration Types
// ============================================================================

/**
 * Static configuration for onboarding behavior
 * Not persisted - defined as code constants
 */
export interface OnboardingConfig {
  /** Default view mode for first run (always "stacked" per spec) */
  defaultViewMode: ViewMode;
  
  /** Path to bundled demo MusicXML file */
  demoBundlePath: string;
  
  /** Whether to show "Reload Demo" UI (false for MVP/P1, true for P3) */
  enableDemoReload: boolean;
  
  /** Maximum time to wait for demo loading before timeout (milliseconds) */
  firstRunTimeoutMs: number;
}

// ============================================================================
// Onboarding Hook Return Type
// ============================================================================

/**
 * Return type for useOnboarding React hook
 */
export interface OnboardingHookResult {
  /** Current view mode state */
  viewMode: ViewMode;
  
  /** Function to update view mode (updates state and persists preference) */
  setViewMode: (mode: ViewMode) => void;
  
  /** True if currently on first run (before completion) */
  isFirstRun: boolean;
  
  /** True if demo is currently loading */
  isDemoLoading: boolean;
  
  /** Error message if demo loading failed (null if no error) */
  demoError: string | null;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Demo loading error with context
 */
export interface DemoLoadingError {
  /** Error type for classification */
  type: 'fetch_failed' | 'parse_failed' | 'storage_failed' | 'timeout';
  
  /** Human-readable error message */
  message: string;
  
  /** Original error object (if available) */
  originalError?: Error;
}

// ============================================================================
// Storage Port Interfaces
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
// Service Port Interfaces
// ============================================================================

/**
 * Port for demo music loading (adapter fetches bundled asset, parses via WASM)
 * Hexagonal Architecture: Port defined by domain, implemented by adapter
 */
export interface IDemoLoaderService {
  /**
   * Load bundled Canon D demo into music library
   * @returns Promise resolving to demo score metadata
   * @throws DemoLoadingError if fetch, parse, or storage fails
   */
  loadBundledDemo(): Promise<DemoScoreMetadata>;
  
  /**
   * Check if demo currently exists in library
   * @returns Promise resolving to true if demo found, false otherwise
   */
  isDemoLoaded(): Promise<boolean>;
  
  /**
   * Get demo score metadata if it exists in library
   * @returns Promise resolving to metadata or null if not found
   */
  getDemoScore(): Promise<DemoScoreMetadata | null>;
  
  /**
   * Reload demo (re-fetch and parse even if already in library)
   * Use case: User deleted demo and wants to restore it (P3 feature)
   * @returns Promise resolving to demo score metadata
   * @throws DemoLoadingError if reload fails
   */
  reloadDemo(): Promise<DemoScoreMetadata>;
}

/**
 * Port for onboarding orchestration (coordinates first-run flow)
 * Hexagonal Architecture: Application service coordinating multiple ports
 */
export interface IOnboardingService {
  /**
   * Initialize onboarding (called on app mount)
   * - Checks first-run status
   * - Loads demo if first run
   * - Sets default view mode
   * - Marks first run complete
   * 
   * @returns Promise resolving when initialization completes
   * @throws Never (errors logged, app continues with degraded state)
   */
  initialize(): Promise<void>;
  
  /**
   * Get current onboarding configuration
   * @returns Static onboarding config
   */
  getConfig(): OnboardingConfig;
}
