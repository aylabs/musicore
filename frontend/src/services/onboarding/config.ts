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
   * Layout mode is the primary Play View
   */
  defaultViewMode: 'layout',
  
  /**
   * Path to bundled demo MusicXML file
   * File is copied to public/demo/ during build
   * Uses Vite's BASE_URL to work with GitHub Pages deployment
   */
  demoBundlePath: `${import.meta.env.BASE_URL}demo/CanonD.musicxml`,
  
  /**
   * Demo schema version - increment when data structure changes
   * Forces reload of cached demo to pick up new fields (e.g., active_clef)
   */
  demoSchemaVersion: 2,
  
  /**
   * Whether to show "Reload Demo" UI
   * false for MVP/P1, true for P3 feature
   */
  enableDemoReload: false,
  
  /**
   * Maximum time to wait for demo loading before timeout
   * 15 seconds to handle slower mobile connections (was 5s)
   * Mobile devices with slow networks need more time for:
   * - Fetching 120KB MusicXML file
   * - WASM initialization and parsing
   * - IndexedDB write operations
   */
  firstRunTimeoutMs: 15000,
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
