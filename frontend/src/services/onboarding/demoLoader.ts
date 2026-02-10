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
import { saveScoreToIndexedDB } from '../storage/local-storage';
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
   * Load bundled Canon D demo into music library
   */
  async loadBundledDemo(): Promise<DemoScoreMetadata> {
    try {
      console.log(`[DemoLoader] Demo path configured as: ${this.demoBundlePath}`);
      console.log(`[DemoLoader] import.meta.env.BASE_URL = ${import.meta.env.BASE_URL}`);
      console.log(`[DemoLoader] Fetching demo from ${this.demoBundlePath}`);

      // 1. Fetch bundled MusicXML
      const response = await fetch(this.demoBundlePath);
      if (!response.ok) {
        throw this.createError(
          'fetch_failed',
          `Failed to fetch demo: HTTP ${response.status} ${response.statusText}`
        );
      }

      const musicXML = await response.text();
      console.log(`[DemoLoader] Fetched ${musicXML.length} bytes of MusicXML`);

      // 2. Parse via WASM engine (Feature 011)
      const parsedScore = await parseMusicXML(musicXML);
      console.log(`[DemoLoader] Parsed score with ${parsedScore.instruments.length} instruments`);

      // 3. Validate score structure (must have at least 1 instrument)
      const instrumentCount = parsedScore.instruments?.length ?? 0;
      if (instrumentCount < 1) {
        throw this.createError(
          'parse_failed',
          `Demo must have at least 1 instrument, found ${instrumentCount}`
        );
      }

      // 4. Create demo metadata (extend Score with demo properties)
      const demoScore: DemoScoreMetadata = {
        ...parsedScore,
        title: 'Canon in D',
        composer: 'Johann Pachelbel',
        isDemoScore: true,
        sourceType: 'bundled',
        bundledPath: this.demoBundlePath,
        loadedDate: new Date().toISOString(),
      };

      // 5. Store in IndexedDB (Feature 011)
      await saveScoreToIndexedDB(demoScore);
      console.log(`[DemoLoader] Demo score stored with ID: ${demoScore.id}`);

      return demoScore;
    } catch (error) {
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
   */
  async getDemoScore(): Promise<DemoScoreMetadata | null> {
    try {
      const allScores = await getAllScoresFromIndexedDB();
      
      // Find the demo score (marked with isDemoScore=true)
      const demoScore = allScores.find((score: any) => score.isDemoScore === true) as DemoScoreMetadata | undefined;
      
      return demoScore ?? null;
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
