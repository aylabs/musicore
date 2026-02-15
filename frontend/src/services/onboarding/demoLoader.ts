/**
 * Demo Loader Service
 * 
 * Feature: 013-demo-onboarding
 * Loads bundled Canon D demo music from public assets
 * Integrates with WASM parser (Feature 011) and IndexedDB storage
 */

import type {
  DemoScoreMetadata,
  DemoLoadingError,
  IDemoLoaderService,
} from './types';
import { ONBOARDING_CONFIG } from './config';
import { parseMusicXML } from '../wasm/music-engine';
import { saveScoreToIndexedDB, deleteScoreFromIndexedDB, getAllScoresFromIndexedDBUnfiltered } from '../storage/local-storage';
import { getAllScoresFromIndexedDB } from '../storage/local-storage';

/**
 * Demo Loader Service Implementation
 * Hexagonal Architecture: Adapter implementing IDemoLoaderService port
 */
export class DemoLoaderService implements IDemoLoaderService {
  private readonly demoBundlePath: string;

  constructor() {
    this.demoBundlePath = ONBOARDING_CONFIG.demoBundlePath;
  }

  /**
   * Create a DemoLoadingError from an error
   */
  private createError(
    type: DemoLoadingError['type'],
    message: string,
    originalError?: Error
  ): DemoLoadingError {
    return { type, message, originalError };
  }

  /**
   * Get any existing demo from IndexedDB (ignores schema version)
   * Private method used for cleanup before reload
   */
  private async getAnyExistingDemo(): Promise<DemoScoreMetadata | null> {
    try {
      // Use unfiltered version to find demos with ANY schema version (for cleanup)
      const allScores = await getAllScoresFromIndexedDBUnfiltered();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const demoScore = allScores.find((score: any) => score.isDemoScore === true) as DemoScoreMetadata | undefined;
      return demoScore ?? null;
    } catch (error) {
      console.error('[DemoLoader] Error getting existing demo:', error);
      return null;
    }
  }

  /**
   * Load bundled Canon D demo into music library
   */
  async loadBundledDemo(): Promise<DemoScoreMetadata> {
    try {
      console.log('========================================');
      console.log('[DemoLoader] START: Loading bundled demo');
      console.log(`[DemoLoader] Demo path configured as: ${this.demoBundlePath}`);
      console.log(`[DemoLoader] import.meta.env.BASE_URL = "${import.meta.env.BASE_URL}"`);
      console.log(`[DemoLoader] window.location.origin = "${window.location.origin}"`);
      console.log(`[DemoLoader] window.location.pathname = "${window.location.pathname}"`);
      
      const fullUrl = new URL(this.demoBundlePath, window.location.origin + window.location.pathname);
      console.log(`[DemoLoader] Resolved full URL: ${fullUrl.href}`);
      console.log(`[DemoLoader] Fetching demo from: ${this.demoBundlePath}`);

      // 1. Fetch bundled MusicXML
      const response = await fetch(this.demoBundlePath);
      console.log(`[DemoLoader] Fetch response status: ${response.status} ${response.statusText}`);
      console.log(`[DemoLoader] Fetch response URL: ${response.url}`);
      console.log(`[DemoLoader] Content-Type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        console.error(`[DemoLoader] ERROR: Fetch failed with status ${response.status}`);
        throw this.createError(
          'fetch_failed',
          `Failed to fetch demo: HTTP ${response.status} ${response.statusText}`
        );
      }

      const musicXML = await response.text();
      console.log(`[DemoLoader] SUCCESS: Fetched ${musicXML.length} bytes of MusicXML`);
      console.log(`[DemoLoader] First 100 chars: ${musicXML.substring(0, 100)}`);

      // 2. Parse via WASM engine (Feature 011)
      console.log('[DemoLoader] Parsing MusicXML via WASM engine...');
      const wasmResult = await parseMusicXML(musicXML);
      console.log(`[DemoLoader] SUCCESS: Parsed score with ${wasmResult.score.instruments.length} instruments`);

      // 3. Validate score structure (must have at least 1 instrument)
      const instrumentCount = wasmResult.score.instruments?.length ?? 0;
      if (instrumentCount < 1) {
        throw this.createError(
          'parse_failed',
          `Demo must have at least 1 instrument, found ${instrumentCount}`
        );
      }

      // 4. Create demo metadata (extend Score with demo properties)
      const demoScore: DemoScoreMetadata = {
        ...wasmResult.score,
        title: 'Canon in D',
        composer: 'Johann Pachelbel',
        isDemoScore: true,
        sourceType: 'bundled',
        bundledPath: this.demoBundlePath,
        loadedDate: new Date().toISOString(),
        schemaVersion: ONBOARDING_CONFIG.demoSchemaVersion,
      };

      // 5. Delete any existing demo (e.g., outdated schema version)
      const existingDemo = await this.getAnyExistingDemo();
      if (existingDemo) {
        console.log('[DemoLoader] Deleting existing demo before saving new version...');
        await deleteScoreFromIndexedDB(existingDemo.id);
      }

      // 6. Store in IndexedDB (Feature 011)
      console.log('[DemoLoader] Saving to IndexedDB...');
      await saveScoreToIndexedDB(demoScore);
      console.log(`[DemoLoader] SUCCESS: Demo score stored with ID: ${demoScore.id}`);
      console.log('[DemoLoader] COMPLETE: Demo loaded successfully');
      console.log('========================================');

      return demoScore;
    } catch (error) {
      console.error('========================================');
      console.error('[DemoLoader] FATAL ERROR loading demo:', error);
      console.error('[DemoLoader] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[DemoLoader] Error message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('[DemoLoader] Stack trace:', error.stack);
      }
      console.error('========================================');
      
      // Normalize error to DemoLoadingError
      if (this.isDemoLoadingError(error)) {
        throw error;
      }

      // Handle WASM parse errors
      if (error instanceof Error && error.message.includes('parse')) {
        throw this.createError('parse_failed', error.message, error);
      }

      // Handle storage errors
      if (error instanceof Error && error.message.includes('IndexedDB')) {
        throw this.createError('storage_failed', error.message, error);
      }

      // Generic fetch/network errors
      throw this.createError(
        'fetch_failed',
        error instanceof Error ? error.message : 'Unknown error loading demo',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if demo currently exists in library
   */
  async isDemoLoaded(): Promise<boolean> {
    try {
      const demo = await this.getDemoScore();
      return demo !== null;
    } catch (error) {
      console.error('[DemoLoader] Error checking if demo loaded:', error);
      return false;
    }
  }

  /**
   * Get demo score metadata if it exists in library
   * Returns null if cached demo has outdated schema version
   */
  async getDemoScore(): Promise<DemoScoreMetadata | null> {
    try {
      const allScores = await getAllScoresFromIndexedDB();
      
      // Find the demo score (marked with isDemoScore=true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const demoScore = allScores.find((score: any) => score.isDemoScore === true) as DemoScoreMetadata | undefined;
      
      if (!demoScore) {
        return null;
      }
      
      // Check schema version - force reload if outdated or missing
      const currentVersion = ONBOARDING_CONFIG.demoSchemaVersion;
      const cachedVersion = demoScore.schemaVersion ?? 1; // Default to 1 for old demos
      
      if (cachedVersion < currentVersion) {
        console.log(`[DemoLoader] Demo schema outdated (v${cachedVersion} < v${currentVersion}), will reload`);
        return null; // Return null to trigger reload
      }
      
      return demoScore;
    } catch (error) {
      console.error('[DemoLoader] Error getting demo score:', error);
      return null;
    }
  }

  /**
   * Reload demo (P3 feature - not implemented for MVP)
   */
  async reloadDemo(): Promise<DemoScoreMetadata> {
    // For MVP (P1), this just delegates to loadBundledDemo
    // In P3, this would delete existing demo first
    console.log('[DemoLoader] Reloading demo...');
    return this.loadBundledDemo();
  }

  /**
   * Type guard for DemoLoadingError
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isDemoLoadingError(error: any): error is DemoLoadingError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error
    );
  }
}

/**
 * Singleton instance of demo loader service
 * Export for use in onboarding service
 */
export const demoLoaderService = new DemoLoaderService();
