/**
 * Onboarding Service
 * 
 * Feature: 013-demo-onboarding
 * Orchestrates first-run onboarding flow:
 * - Checks first-run status
 * - Loads demo music  
 * - Sets default view mode
 * - Marks first-run complete
 */

import type { IOnboardingService, OnboardingConfig } from './types';
import { ONBOARDING_CONFIG } from './config';
import { firstRunStorage, viewModeStorage } from '../storage/preferences';
import { demoLoaderService } from './demoLoader';

/**
 * Onboarding Service Implementation
 * Hexagonal Architecture: Application service coordinating multiple ports
 */
export class OnboardingService implements IOnboardingService {
  private readonly config: OnboardingConfig;

  constructor() {
    this.config = ONBOARDING_CONFIG;
  }

  /**
   * Initialize onboarding (called on app mount)
   * Non-blocking: errors are logged but don't prevent app from continuing
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Onboarding] Starting initialization...');
      const startTime = performance.now();

      // Check if this is the first run
      const isFirst = firstRunStorage.isFirstRun();
      console.log(`[Onboarding] First run: ${isFirst}`);

      if (isFirst) {
        await this.performFirstRunSetup(startTime);
      } else {
        console.log('[Onboarding] Returning user, skipping first-run setup');
      }

      console.log('[Onboarding] Initialization complete');
    } catch (error) {
      // Non-blocking: log error but continue app initialization
      console.error('[Onboarding] Initialization failed:', error);
      console.log('[Onboarding] App will continue without demo');
    }
  }

  /**
   * Perform first-run setup with timeout handling
   */
  private async performFirstRunSetup(startTime: number): Promise<void> {
    console.log('[Onboarding] Performing first-run setup...');
    console.log(`[Onboarding] Timeout set to ${this.config.firstRunTimeoutMs}ms (for mobile compatibility)`);

    // Wrap demo loading in timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Demo loading timeout after ${this.config.firstRunTimeoutMs}ms`));
      }, this.config.firstRunTimeoutMs);
    });

    const demoLoadPromise = this.loadDemoAndSetDefaults();

    try {
      // Race between demo loading and timeout
      await Promise.race([demoLoadPromise, timeoutPromise]);

      // Calculate and log load time
      const loadTime = performance.now() - startTime;
      console.log(`[Onboarding] First-run setup complete in ${loadTime.toFixed(0)}ms`);

      // Mark first-run complete
      const appVersion = this.getAppVersion();
      firstRunStorage.markFirstRunComplete(appVersion);

      // Log analytics
      this.logFirstRunAnalytics(loadTime, appVersion);
    } catch (error) {
      // Timeout or loading error
      const loadTime = performance.now() - startTime;
      console.error(`[Onboarding] First-run setup failed after ${loadTime.toFixed(0)}ms:`, error);
      
      // Still mark as complete to avoid retry loop
      // User can manually load demo later
      firstRunStorage.markFirstRunComplete();
      
      throw error; // Re-throw for caller to handle
    }
  }

  /**
   * Load demo and set default preferences
   */
  private async loadDemoAndSetDefaults(): Promise<void> {
    // Check if demo already loaded (e.g., app crashed after loading but before marking complete)
    const alreadyLoaded = await demoLoaderService.isDemoLoaded();
    if (alreadyLoaded) {
      console.log('[Onboarding] Demo already loaded, skipping fetch');
    } else {
      // Load Canon D demo
      const demoScore = await demoLoaderService.loadBundledDemo();
      console.log(`[Onboarding] Demo loaded: ${demoScore.title} by ${demoScore.composer}`);
    }

    // Set default view mode to "stacked" (FR-003)
    viewModeStorage.setViewMode(this.config.defaultViewMode, 'onboarding');
    console.log(`[Onboarding] Default view mode set to "${this.config.defaultViewMode}"`);
  }

  /**
   * Get current onboarding configuration
   */
  getConfig(): OnboardingConfig {
    return { ...this.config };
  }

  /**
   * Get app version from package.json (if available)
   */
  private getAppVersion(): string | undefined {
    // In production, this would come from import.meta or process.env
    // For now, return undefined (optional parameter)
    return undefined;
  }

  /**
   * Log first-run analytics (T020)
   */
  private logFirstRunAnalytics(loadTimeMs: number, appVersion?: string): void {
    const analytics = {
      event: 'first_run_complete',
      timestamp: new Date().toISOString(),
      loadTimeMs: Math.round(loadTimeMs),
      appVersion,
      defaultViewMode: this.config.defaultViewMode,
    };

    // Log to console for now (could send to analytics service later)
    console.log('[Onboarding] Analytics:', JSON.stringify(analytics, null, 2));

    // TODO: Send to analytics service when implemented
    // analytics.track('first_run_complete', analytics);
  }
}

/**
 * Singleton instance of onboarding service
 * Export for use in React hooks
 */
export const onboardingService = new OnboardingService();
