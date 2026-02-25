/**
 * PluginImporter — T022
 * Feature 030: Plugin Architecture (US2 — Import a Third-Party Plugin)
 *
 * Validates a ZIP package, enforces all FR-009 / FR-018 / FR-019 / FR-021
 * rules, then delegates persistence to the provided PluginRegistry instance.
 *
 * Constitution Principle VI: PluginNoteEvent carries no coordinate data;
 * this module never touches note events.
 */

import { unzipSync } from 'fflate';
import { PLUGIN_API_VERSION, type PluginManifest } from '../../plugin-api/index';
import { type PluginRegistry, type PluginAsset } from './PluginRegistry';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ImportResult =
  | { success: true; manifest: PluginManifest }
  | { success: false; error: string; duplicate?: false }
  | { success: false; duplicate: true; manifest: PluginManifest; error?: string };

export interface ImportOptions {
  /** When true, overwrite an already-installed plugin with the same id. */
  overwrite?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Plugin ids must be lowercase alphanumeric + hyphens only (FR-009). */
const VALID_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function err(error: string): ImportResult {
  return { success: false, error };
}

/** Assert that a raw JSON object has all required PluginManifest fields. */
function validateManifestShape(
  raw: unknown
): raw is Omit<PluginManifest, 'origin'> {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r['id'] === 'string' &&
    typeof r['name'] === 'string' &&
    typeof r['version'] === 'string' &&
    typeof r['pluginApiVersion'] === 'string' &&
    typeof r['entryPoint'] === 'string'
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate and import a plugin ZIP package.
 *
 * @param file     The ZIP file selected by the user.
 * @param registry The PluginRegistry instance to persist into (injected for testability).
 * @param options  Optional overwrite flag for duplicate handling.
 */
export async function importPlugin(
  file: File,
  registry: PluginRegistry,
  options: ImportOptions = {}
): Promise<ImportResult> {
  // ── FR-021: Size guard (before any extraction) ───────────────────────────
  if (file.size > MAX_BYTES) {
    return err(`Plugin package exceeds the 5 MB size limit (file is ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
  }

  // ── Extract ZIP ──────────────────────────────────────────────────────────
  let files: Record<string, Uint8Array>;
  try {
    const buf = await file.arrayBuffer();
    files = unzipSync(new Uint8Array(buf));
  } catch {
    return err('Failed to read ZIP package. The file may be corrupt or is not a valid ZIP.');
  }

  // ── Also enforce 5 MB uncompressed total (FR-021, belt + suspenders) ────
  const totalUncompressed = Object.values(files).reduce(
    (sum, bytes) => sum + bytes.byteLength,
    0
  );
  if (totalUncompressed > MAX_BYTES) {
    return err(`Plugin package uncompressed size exceeds the 5 MB limit.`);
  }

  // ── FR-009: Require plugin.json ──────────────────────────────────────────
  if (!('plugin.json' in files)) {
    return err('The package does not contain a plugin.json manifest.');
  }

  // ── FR-009: Parse + validate plugin.json ────────────────────────────────
  let rawManifest: unknown;
  try {
    const json = new TextDecoder().decode(files['plugin.json']);
    rawManifest = JSON.parse(json);
  } catch {
    return err('plugin.json is not valid JSON.');
  }

  if (!validateManifestShape(rawManifest)) {
    const raw = rawManifest as Record<string, unknown>;
    if (!raw || typeof raw['id'] !== 'string') {
      return err('plugin.json is missing the required "id" field.');
    }
    return err('plugin.json is missing one or more required fields (id, name, version, pluginApiVersion, entryPoint).');
  }

  // ── FR-009: Validate id pattern ──────────────────────────────────────────
  if (!VALID_ID_RE.test(rawManifest.id)) {
    return err(
      `Invalid plugin id "${rawManifest.id}". Plugin ids must be lowercase alphanumeric characters and hyphens only (e.g. "my-plugin").`
    );
  }

  // ── FR-019: API version check ────────────────────────────────────────────
  const apiVer = parseInt(rawManifest.pluginApiVersion, 10);
  const hostVer = parseInt(PLUGIN_API_VERSION, 10);
  if (Number.isNaN(apiVer) || apiVer > hostVer) {
    return err(
      `Plugin requires pluginApiVersion "${rawManifest.pluginApiVersion}" but this host only supports up to version "${PLUGIN_API_VERSION}".`
    );
  }

  // ── FR-009: entryPoint must exist in ZIP ─────────────────────────────────
  if (!(rawManifest.entryPoint in files)) {
    return err(
      `The plugin manifest specifies entryPoint "${rawManifest.entryPoint}" but that file is not present in the package.`
    );
  }

  // Build full manifest (origin = 'imported') ──────────────────────────────
  const manifest: PluginManifest = {
    ...rawManifest,
    origin: 'imported' as const,
  };

  // ── FR-018: Duplicate detection ──────────────────────────────────────────
  const existing = await registry.get(manifest.id);
  if (existing && !options.overwrite) {
    return { success: false, duplicate: true, manifest };
  }

  // ── Register in IndexedDB ─────────────────────────────────────────────────
  await registry.register(
    manifest,
    // Persist each file as an asset keyed by filename
    Object.entries(files).map<PluginAsset>(([name, bytes]) => ({
      pluginId: manifest.id,
      name,
      data: bytes.buffer as ArrayBuffer,
    }))
  );

  return { success: true, manifest };
}
