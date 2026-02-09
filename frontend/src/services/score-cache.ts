// Feature 011: Score Caching Service
// Automatically saves scores to IndexedDB for offline persistence

import type { Score } from '../../types/score';
import {
  saveScoreToIndexedDB,
  loadScoreFromIndexedDB,
  listScoreIdsFromIndexedDB,
  deleteScoreFromIndexedDB,
} from '../storage/local-storage';

/**
 * Cache strategy for score persistence
 */
export class ScoreCache {
  /**
   * Save score to cache (IndexedDB)
   * @param score - Score to cache
   */
  static async cache(score: Score): Promise<void> {
    try {
      await saveScoreToIndexedDB(score);
      console.log(`[ScoreCache] Score ${score.id} cached successfully`);
    } catch (error) {
      console.error('[ScoreCache] Failed to cache score:', error);
      // Don't throw - caching failure shouldn't break the app
    }
  }

  /**
   * Get score from cache
   * @param scoreId - UUID of score to retrieve
   * @returns Score or null if not found
   */
  static async get(scoreId: string): Promise<Score | null> {
    try {
      const score = await loadScoreFromIndexedDB(scoreId);
      if (score) {
        console.log(`[ScoreCache] Score ${scoreId} retrieved from cache`);
      }
      return score;
    } catch (error) {
      console.error('[ScoreCache] Failed to retrieve score from cache:', error);
      return null;
    }
  }

  /**
   * List all cached score IDs
   * @returns Array of score UUIDs
   */
  static async list(): Promise<string[]> {
    try {
      return await listScoreIdsFromIndexedDB();
    } catch (error) {
      console.error('[ScoreCache] Failed to list cached scores:', error);
      return [];
    }
  }

  /**
   * Remove score from cache
   * @param scoreId - UUID of score to remove
   */
  static async remove(scoreId: string): Promise<void> {
    try {
      await deleteScoreFromIndexedDB(scoreId);
      console.log(`[ScoreCache] Score ${scoreId} removed from cache`);
    } catch (error) {
      console.error('[ScoreCache] Failed to remove score from cache:', error);
    }
  }

  /**
   * Check if a score is cached
   * @param scoreId - UUID of score to check
   * @returns true if score exists in cache
   */
  static async has(scoreId: string): Promise<boolean> {
    const cached = await ScoreCache.get(scoreId);
    return cached !== null;
  }
}

/**
 * Hook for automatic score caching
 * Call this whenever a score is loaded or modified
 * 
 * @param score - Current score to cache (or null if no score loaded)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [score, setScore] = useState<Score | null>(null);
 *   
 *   useEffect(() => {
 *     if (score) {
 *       ScoreCache.cache(score);
 *     }
 *   }, [score]);
 * }
 * ```
 */
export function useScorecache(score: Score | null): void {
  // Implementation would go here using useEffect
  // Kept as separate export for potential future use
  if (score) {
    ScoreCache.cache(score);
  }
}
