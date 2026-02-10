/**
 * Service Interface Contracts: Demo Music Onboarding
 * 
 * Feature: 013-demo-onboarding
 * Purpose: Service interfaces for demo loading and onboarding orchestration
 * 
 * Data Model: ../data-model.md
 * Types: ./types.ts
 */

import type { DemoScoreMetadata, DemoLoadingError, OnboardingConfig } from './types';

// ============================================================================
// Demo Loader Service Port
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

// ============================================================================
// Onboarding Service Port (Orchestrator)
// ============================================================================

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

// ============================================================================
// Demo Loader Implementation Guidelines
// ============================================================================

/**
 * Implementation notes for Demo Loader adapter:
 * 
 * 1. Asset Loading:
 *    - Fetch from public/demo/CanonD.musicxml via fetch API
 *    - Response should be cached by service worker (Feature 012)
 *    - Handle offline scenarios (service worker serves cached asset)
 * 
 * 2. MusicXML Parsing:
 *    - Reuse existing WASM MusicXML parser from Feature 011
 *    - Call parseMusicXML(xmlString) via music-engine.ts
 *    - Validate parsed score has ≥4 instruments
 * 
 * 3. Storage:
 *    - Reuse existing score storage service from Feature 011
 *    - Call storeScore(score) to persist in IndexedDB
 *    - Add isDemoScore: true, sourceType: "bundled" metadata
 * 
 * 4. Error Handling:
 *    - Fetch failure (404): DemoLoadingError type: 'fetch_failed'
 *    - Parse failure (invalid XML): type: 'parse_failed'
 *    - Storage failure (quota): type: 'storage_failed'
 *    - Timeout (>5s): type: 'timeout'
 * 
 * 5. Timeout Handling:
 *    - Wrap loadBundledDemo in Promise.race with timeout promise
 *    - If demo loading exceeds firstRunTimeoutMs, reject with timeout error
 *    - Allows app to continue without blocking indefinitely
 */

/**
 * Example implementation (pseudo-code)
 */
export class DemoLoaderAdapter implements IDemoLoaderService {
  constructor(
    private readonly config: OnboardingConfig,
    private readonly wasmEngine: any, // MusicEngine from Feature 011
    private readonly scoreStorage: any // Score storage service from Feature 011
  ) {}
  
  async loadBundledDemo(): Promise<DemoScoreMetadata> {
    try {
      // 1. Fetch bundled MusicXML
      const response = await fetch(this.config.demoBundlePath);
      if (!response.ok) {
        throw {
          type: 'fetch_failed',
          message: `Failed to fetch demo: ${response.statusText}`
        } as DemoLoadingError;
      }
      const musicXML = await response.text();
      
      // 2. Parse via WASM engine (Feature 011)
      const score = await this.wasmEngine.parseMusicXML(musicXML);
      
      // 3. Validate score structure
      if (score.instruments.length < 4) {
        throw {
          type: 'parse_failed',
          message: 'Demo score must have at least 4 instruments'
        } as DemoLoadingError;
      }
      
      // 4. Add demo metadata
      const demoScore = {
        ...score,
        isDemoScore: true,
        sourceType: 'bundled' as const,
        bundledPath: this.config.demoBundlePath,
        loadedDate: new Date().toISOString()
      };
      
      // 5. Store in IndexedDB (Feature 011)
      await this.scoreStorage.storeScore(demoScore);
      
      return demoScore;
    } catch (error) {
      // Wrap errors in DemoLoadingError format
      throw this.normalizeError(error);
    }
  }
  
  async isDemoLoaded(): Promise<boolean> {
    const demo = await this.getDemoScore();
    return demo !== null;
  }
  
  async getDemoScore(): Promise<DemoScoreMetadata | null> {
    // Query IndexedDB for score with isDemoScore = true
    const scores = await this.scoreStorage.getAllScores();
    return scores.find(s => s.isDemoScore) ?? null;
  }
  
  async reloadDemo(): Promise<DemoScoreMetadata> {
    // Same as loadBundledDemo (overwrites if exists, creates if deleted)
    return this.loadBundledDemo();
  }
  
  private normalizeError(error: any): DemoLoadingError {
    if (error.type) return error; // Already DemoLoadingError
    
    return {
      type: 'parse_failed',
      message: error.message || 'Unknown demo loading error',
      originalError: error
    };
  }
}

/**
 * Onboarding service orchestrator (pseudo-code)
 */
export class OnboardingServiceAdapter implements IOnboardingService {
  constructor(
    private readonly config: OnboardingConfig,
    private readonly firstRunStorage: any, // IFirstRunStorage
    private readonly viewModeStorage: any, // IViewModePreferenceStorage
    private readonly demoLoader: IDemoLoaderService
  ) {}
  
  async initialize(): Promise<void> {
    try {
      const isFirstRun = this.firstRunStorage.isFirstRun();
      
      if (isFirstRun) {
        // First-run flow
        console.log('First run detected, loading demo...');
        
        // Load demo with timeout
        await this.loadDemoWithTimeout();
        
        // Set default view mode
        this.viewModeStorage.setViewMode(
          this.config.defaultViewMode,
          'onboarding'
        );
        
        // Mark first run complete
        this.firstRunStorage.markFirstRunComplete('1.0.0'); // Version from package.json
        
        console.log('First-run onboarding complete');
      } else {
        // Returning user - no action needed
        console.log('Returning user, skipping onboarding');
      }
    } catch (error) {
      // Non-blocking: log error, allow app to continue
      console.error('Onboarding initialization failed:', error);
      // App still usable - user can import music manually
    }
  }
  
  private async loadDemoWithTimeout(): Promise<void> {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => {
        reject({
          type: 'timeout',
          message: `Demo loading exceeded ${this.config.firstRunTimeoutMs}ms timeout`
        } as DemoLoadingError);
      }, this.config.firstRunTimeoutMs);
    });
    
    await Promise.race([
      this.demoLoader.loadBundledDemo(),
      timeout
    ]);
  }
  
  getConfig(): OnboardingConfig {
    return this.config;
  }
}
