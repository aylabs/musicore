// Feature 011: Local Score Storage using IndexedDB
// Provides offline persistence for scores using browser IndexedDB

import type { Score } from '../../types/score';

const DB_NAME = 'musicore-db';
const DB_VERSION = 1;
const SCORES_STORE = 'scores';

/**
 * Initialize IndexedDB database
 * @returns Promise<IDBDatabase>
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create scores object store if it doesn't exist
      if (!db.objectStoreNames.contains(SCORES_STORE)) {
        const objectStore = db.createObjectStore(SCORES_STORE, { keyPath: 'id' });
        objectStore.createIndex('lastModified', 'lastModified', { unique: false });
        console.log('[IndexedDB] Scores object store created');
      }
    };
  });
}

/**
 * Save a score to IndexedDB
 * @param score - Score object to save
 * @returns Promise<void>
 */
export async function saveScoreToIndexedDB(score: Score): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([SCORES_STORE], 'readwrite');
    const store = transaction.objectStore(SCORES_STORE);

    // Add metadata for tracking
    const scoreWithMetadata = {
      ...score,
      lastModified: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(scoreWithMetadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save score: ${request.error?.message}`));
    });

    db.close();
    console.log(`[IndexedDB] Score ${score.id} saved successfully`);
  } catch (error) {
    console.error('[IndexedDB] Error saving score:', error);
    throw error;
  }
}

/**
 * Load a score from IndexedDB
 * @param scoreId - UUID of the score to load
 * @returns Promise<Score | null>
 */
export async function loadScoreFromIndexedDB(scoreId: string): Promise<Score | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([SCORES_STORE], 'readonly');
    const store = transaction.objectStore(SCORES_STORE);

    const score = await new Promise<Score | null>((resolve, reject) => {
      const request = store.get(scoreId);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result || null);
      };
      request.onerror = () => reject(new Error(`Failed to load score: ${request.error?.message}`));
    });

    db.close();

    if (score) {
      console.log(`[IndexedDB] Score ${scoreId} loaded successfully`);
      // Remove metadata before returning
      const { lastModified, ...scoreWithoutMetadata } = score as Score & { lastModified?: string };
      return scoreWithoutMetadata;
    }

    return null;
  } catch (error) {
    console.error('[IndexedDB] Error loading score:', error);
    throw error;
  }
}

/**
 * Get all score IDs from IndexedDB
 * @returns Promise<string[]>
 */
export async function listScoreIdsFromIndexedDB(): Promise<string[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([SCORES_STORE], 'readonly');
    const store = transaction.objectStore(SCORES_STORE);

    const keys = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new Error(`Failed to list scores: ${request.error?.message}`));
    });

    db.close();
    console.log(`[IndexedDB] Found ${keys.length} cached scores`);
    return keys;
  } catch (error) {
    console.error('[IndexedDB] Error listing scores:', error);
    throw error;
  }
}

/**
 * Get all scores from IndexedDB
 * Feature 013: Added for demo score detection
 * @returns Promise<Score[]>
 */
export async function getAllScoresFromIndexedDB(): Promise<Score[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([SCORES_STORE], 'readonly');
    const store = transaction.objectStore(SCORES_STORE);

    const scores = await new Promise<Score[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get all scores: ${request.error?.message}`));
    });

    db.close();
    console.log(`[IndexedDB] Retrieved ${scores.length} scores`);
    return scores;
  } catch (error) {
    console.error('[IndexedDB] Error getting all scores:', error);
    throw error;
  }
}

/**
 * Delete a score from IndexedDB
 * @param scoreId - UUID of the score to delete
 * @returns Promise<void>
 */
export async function deleteScoreFromIndexedDB(scoreId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([SCORES_STORE], 'readwrite');
    const store = transaction.objectStore(SCORES_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(scoreId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete score: ${request.error?.message}`));
    });

    db.close();
    console.log(`[IndexedDB] Score ${scoreId} deleted successfully`);
  } catch (error) {
    console.error('[IndexedDB] Error deleting score:', error);
    throw error;
  }
}

/**
 * Clear all scores from IndexedDB (for testing/debugging)
 * @returns Promise<void>
 */
export async function clearAllScoresFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([SCORES_STORE], 'readwrite');
    const store = transaction.objectStore(SCORES_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear scores: ${request.error?.message}`));
    });

    db.close();
    console.log('[IndexedDB] All scores cleared');
  } catch (error) {
    console.error('[IndexedDB] Error clearing scores:', error);
    throw error;
  }
}
