/**
 * useOnboarding Hook
 * 
 * Feature: 013-demo-onboarding
 * Manages first-run onboarding state and view mode preferences
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { viewMode, setViewMode, isFirstRun, isDemoLoading, demoError } = useOnboarding();
 *   
 *   if (isDemoLoading) return <LoadingSpinner />;
 *   if (demoError) return <ErrorNotification message={demoError} />;
 *   
 *   return <ScoreViewer viewMode={viewMode} onViewModeChange={setViewMode} />;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import type { ViewMode, OnboardingHookResult } from '../services/onboarding/types';
import { onboardingService } from '../services/onboarding/OnboardingService';
import { firstRunStorage, viewModeStorage } from '../services/storage/preferences';

/**
 * React hook for onboarding initialization and view mode management
 */
export function useOnboarding(): OnboardingHookResult {
  // Initialize view mode from localStorage (lazy initializer for SSR safety)
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return viewModeStorage.getViewMode(); // Defaults to "stacked" if not set
  });

  // Track first-run status
  const [isFirstRun, setIsFirstRun] = useState<boolean>(() => {
    return firstRunStorage.isFirstRun();
  });

  // Track demo loading state
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);

  // Track demo loading errors
  const [demoError, setDemoError] = useState<string | null>(null);

  /**
   * Initialize onboarding on mount
   */
  useEffect(() => {
    let mounted = true;

    async function initializeOnboarding() {
      if (!isFirstRun) {
        console.log('[useOnboarding] Not first run, skipping initialization');
        return;
      }

      console.log('[useOnboarding] Starting first-run initialization...');
      setIsDemoLoading(true);
      setDemoError(null);

      try {
        // Call onboarding service to load demo and set defaults
        await onboardingService.initialize();

        if (mounted) {
          // Update first-run status
          setIsFirstRun(false);
          
          // Update view mode from storage (should be "stacked" after first-run)
          const updatedMode = viewModeStorage.getViewMode();
          setViewModeState(updatedMode);
          
          console.log('[useOnboarding] First-run initialization complete');
        }
      } catch (error) {
        console.error('[useOnboarding] Initialization failed:', error);
        
        if (mounted) {
          // Set error message for UI display
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to load demo music. You can import your own MusicXML files.';
          setDemoError(errorMessage);
          
          // Still mark as complete to avoid retry loop
          setIsFirstRun(false);
        }
      } finally {
        if (mounted) {
          setIsDemoLoading(false);
        }
      }
    }

    initializeOnboarding();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []); // Run once on mount

  /**
   * Update view mode and persist to localStorage
   */
  const setViewMode = (mode: ViewMode) => {
    console.log(`[useOnboarding] Changing view mode to "${mode}"`);
    
    // Update React state
    setViewModeState(mode);
    
    // Persist to localStorage (with source="user" to track manual changes)
    viewModeStorage.setViewMode(mode, 'user');
  };

  return {
    viewMode,
    setViewMode,
    isFirstRun,
    isDemoLoading,
    demoError,
  };
}
