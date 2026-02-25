/**
 * PluginRegistry — IndexedDB persistence for installed plugins
 * Feature 030: Plugin Architecture
 *
 * The aggregate root for all plugin lifecycle operations.
 * Built-in plugins (origin: 'builtin') should not be registered here —
 * they are held in-memory via builtinPlugins.ts.
 *
 * IndexedDB schema (see data-model.md):
 *   DB name:  plugin-registry       (configurable for testing)
 *   Version:  1
 *
 *   Object store 'manifests'  — keyPath: 'id'
 *     Stores: StoredManifestEntry (PluginManifest + installedAt)
 *
 *   Object store 'assets'     — keyPath: 'key'
 *     Stores: StoredAsset, keyed by '{pluginId}/{filename}'
 *     Query by pluginId: IDBKeyRange.bound('{id}/', '{id}/\uffff')
 *
 * Invariants (spec FR-018, data-model.md):
 *   - duplicate id → overwrite (caller is responsible for showing confirmation)
 *   - manifest + assets written in a single atomic transaction
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PluginManifest } from '../../plugin-api/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Asset stored in indexedDB (key = '{pluginId}/{name}'). */
export interface PluginAsset {
  pluginId: string;
  name: string;
  data: ArrayBuffer;
}

/** Single row stored in the 'manifests' object store. */
interface StoredManifestEntry {
  id: string;      // matches manifest.id, used as keyPath
  manifest: PluginManifest;
  installedAt: Date;
}

/** Single row stored in the 'assets' object store. */
interface StoredAsset extends PluginAsset {
  /** Compound key: '{pluginId}/{name}' */
  key: string;
}

/** What callers receive from get() and list(). */
export interface PluginRegistryEntry {
  manifest: PluginManifest;
  installedAt: Date;
}

interface PluginDBSchema extends DBSchema {
  manifests: {
    key: string;
    value: StoredManifestEntry;
  };
  assets: {
    key: string;
    value: StoredAsset;
  };
}

// ---------------------------------------------------------------------------
// PluginRegistry
// ---------------------------------------------------------------------------

export class PluginRegistry {
  private readonly dbName: string;
  private dbPromise: Promise<IDBPDatabase<PluginDBSchema>> | null = null;

  constructor(dbName = 'plugin-registry') {
    this.dbName = dbName;
  }

  private getDb(): Promise<IDBPDatabase<PluginDBSchema>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<PluginDBSchema>(this.dbName, 1, {
        upgrade(db) {
          db.createObjectStore('manifests', { keyPath: 'id' });
          db.createObjectStore('assets', { keyPath: 'key' });
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Register (or overwrite) a plugin. Writes manifest + assets atomically.
   * Caller must ensure duplicate confirmation has occurred (FR-018).
   */
  async register(manifest: PluginManifest, assets: PluginAsset[]): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['manifests', 'assets'], 'readwrite');

    // Remove existing assets for this plugin before writing new ones
    const assetStore = tx.objectStore('assets');
    const existingKeys = await assetStore.getAllKeys(
      IDBKeyRange.bound(`${manifest.id}/`, `${manifest.id}/\uffff`)
    );
    await Promise.all(existingKeys.map(k => assetStore.delete(k)));

    // Write new manifest
    await tx.objectStore('manifests').put({
      id: manifest.id,
      manifest,
      installedAt: new Date(),
    });

    // Write new assets
    await Promise.all(
      assets.map(asset =>
        assetStore.put({
          key: `${asset.pluginId}/${asset.name}`,
          pluginId: asset.pluginId,
          name: asset.name,
          data: asset.data,
        })
      )
    );

    await tx.done;
  }

  /** Return all registered plugins (imported only; builtins are held in-memory). */
  async list(): Promise<PluginRegistryEntry[]> {
    const db = await this.getDb();
    const entries = await db.getAll('manifests');
    return entries.map(e => ({ manifest: e.manifest, installedAt: e.installedAt }));
  }

  /** Retrieve a single plugin by id. Returns undefined if not found. */
  async get(id: string): Promise<PluginRegistryEntry | undefined> {
    const db = await this.getDb();
    const entry = await db.get('manifests', id);
    if (!entry) return undefined;
    return { manifest: entry.manifest, installedAt: entry.installedAt };
  }

  /** Retrieve all stored assets for a given plugin id. */
  async getAssets(pluginId: string): Promise<PluginAsset[]> {
    const db = await this.getDb();
    const stored = await db.getAll(
      'assets',
      IDBKeyRange.bound(`${pluginId}/`, `${pluginId}/\uffff`)
    );
    return stored.map(s => ({ pluginId: s.pluginId, name: s.name, data: s.data }));
  }

  /**
   * Remove a plugin and all its assets. No-op if plugin not registered.
   */
  async remove(id: string): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['manifests', 'assets'], 'readwrite');

    await tx.objectStore('manifests').delete(id);

    const assetStore = tx.objectStore('assets');
    const keys = await assetStore.getAllKeys(
      IDBKeyRange.bound(`${id}/`, `${id}/\uffff`)
    );
    await Promise.all(keys.map(k => assetStore.delete(k)));

    await tx.done;
  }
}

/** Singleton instance used by the application. */
export const pluginRegistry = new PluginRegistry();
