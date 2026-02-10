/**
 * Type Definitions: Demo Music Onboarding
 * 
 * Feature: 013-demo-onboarding
 * Purpose: Type contracts for first-run detection, view mode preferences, and demo loading
 * 
 * Data Model: ../data-model.md
 * Plan: ../plan.md
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
