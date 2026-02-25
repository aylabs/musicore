/**
 * Lint boundary regression fixture — T029
 * Feature 030: Plugin Architecture
 *
 * THIS FILE MUST NEVER BE MODIFIED TO FIX THE LINT ERROR.
 * It exists to prove that ESLint catches illegal imports from plugins/.
 *
 * Run: npx eslint plugins/lint-test/bad-import.ts
 * Expected: no-restricted-imports error on the import below.
 *
 * @see frontend/eslint.config.js — scoped rule for plugins/**
 * @see specs/030-plugin-architecture/contracts/plugin-api.ts
 */

// This import intentionally violates the plugin API boundary.
// Plugins must ONLY import from ../../src/plugin-api and nothing else in src/.
import { pluginRegistry } from '../../src/services/plugins/PluginRegistry';

// Suppress "unused variable" — the lint error is the only thing that matters here.
void pluginRegistry;

export {};
