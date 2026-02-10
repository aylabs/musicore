/**
 * Onboarding Configuration Constants
 * 
 * Feature: 013-demo-onboarding
 * Static configuration for onboarding behavior
 */

import type { OnboardingConfig } from './types';

/**
 * Onboarding configuration
 * These values are not persisted - they are compile-time constants
 */
export const ONBOARDING_CONFIG: OnboardingConfig = {
  /**
   * Default view mode for first run
   * Always "stacked" per spec.md requirement FR-003
   */
  defaultViewMode: 'stacked',
  
  /**
   * Path to bundled demo MusicXML file
   * File is copied to public/demo/ during build
   */
  demoBundlePath: '/demo/CanonD.musicxml',
  
  /**
   * Whether to show "Reload Demo" UI
   * false for MVP/P1, true for P3 feature
   */
  enableDemoReload: false,
  
  /**
   * Maximum time to wait for demo loading before timeout
   * 5 seconds per spec.md SC-001 requirement
   */
  firstRunTimeoutMs: 5000,
};

/**
 * Local Storage keys
 */
export const STORAGE_KEYS = {
  /** First-run state key */
  FIRST_RUN: 'musicore_firstRun',
  
  /** View mode preference key */
  VIEW_MODE: 'musicore_viewMode',
} as const;
