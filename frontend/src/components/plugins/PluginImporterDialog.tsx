/**
 * PluginImporterDialog — T023
 * Feature 030: Plugin Architecture (US2 — Import a Third-Party Plugin)
 *
 * Modal dialog for importing a third-party plugin from a ZIP file.
 *
 * States:
 *  idle     — waiting for the user to choose a file
 *  loading  — ZIP is being processed
 *  success  — plugin imported successfully
 *  error    — import rejected (validation, size, etc.)
 *  duplicate — plugin id already installed; waits for user confirmation
 */

import React, { useRef, useState } from 'react';
import type { PluginManifest } from '../../plugin-api/index';
import { importPlugin } from '../../services/plugins/PluginImporter';
import { pluginRegistry } from '../../services/plugins/PluginRegistry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DialogState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; manifest: PluginManifest }
  | { phase: 'error'; message: string }
  | { phase: 'duplicate'; manifest: PluginManifest; pendingFile: File };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface PluginImporterDialogProps {
  onImportComplete: (manifest: PluginManifest) => void;
  onClose: () => void;
}

export function PluginImporterDialog({
  onImportComplete,
  onClose,
}: PluginImporterDialogProps) {
  const [state, setState] = useState<DialogState>({ phase: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File selection ─────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setState({ phase: 'loading' });

    const result = await importPlugin(file, pluginRegistry);

    if (result.success) {
      setState({ phase: 'success', manifest: result.manifest });
      onImportComplete(result.manifest);
    } else if ((result as { duplicate?: boolean }).duplicate) {
      const dup = result as { duplicate: true; manifest: PluginManifest };
      setState({ phase: 'duplicate', manifest: dup.manifest, pendingFile: file });
    } else {
      setState({ phase: 'error', message: (result as { error?: string }).error ?? 'Unknown error.' });
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // ── Duplicate confirmation ─────────────────────────────────────────────

  async function handleReplace() {
    if (state.phase !== 'duplicate') return;
    const { pendingFile } = state;
    setState({ phase: 'loading' });

    const result = await importPlugin(pendingFile, pluginRegistry, { overwrite: true });
    if (result.success) {
      setState({ phase: 'success', manifest: result.manifest });
      onImportComplete(result.manifest);
    } else {
      setState({ phase: 'error', message: (result as { error?: string }).error ?? 'Unknown error.' });
    }
  }

  function handleCancelDuplicate() {
    setState({ phase: 'idle' });
    // Reset file input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import Plugin"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          color: '#222',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          width: 'min(420px, 92vw)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a' }}>
            Import Plugin
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              lineHeight: 1,
              cursor: 'pointer',
              color: '#666',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            ×
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* ── File picker ─────────────────────────────────────────────── */}
          {(state.phase === 'idle' || state.phase === 'error') && (
            <>
              <label
                htmlFor="plugin-file-input"
                style={{ fontSize: '0.9rem', color: '#444', fontWeight: 500 }}
              >
                Select a plugin ZIP package:
              </label>
              <input
                ref={inputRef}
                id="plugin-file-input"
                data-testid="plugin-file-input"
                type="file"
                accept=".zip"
                onChange={handleInputChange}
                style={{ fontSize: '0.875rem', cursor: 'pointer' }}
              />
              {state.phase === 'error' && (
                <p
                  role="alert"
                  style={{
                    margin: 0,
                    padding: '10px 12px',
                    background: '#fff0f0',
                    border: '1px solid #f5c6c6',
                    borderRadius: '6px',
                    color: '#c0392b',
                    fontSize: '0.875rem',
                  }}
                >
                  {state.message}
                </p>
              )}
            </>
          )}

          {/* ── Loading ─────────────────────────────────────────────────── */}
          {state.phase === 'loading' && (
            <p aria-live="polite" style={{ margin: 0, color: '#555', fontSize: '0.9rem' }}>
              Installing plugin…
            </p>
          )}

          {/* ── Success ─────────────────────────────────────────────────── */}
          {state.phase === 'success' && (
            <p
              role="status"
              style={{
                margin: 0,
                padding: '10px 12px',
                background: '#f0fff4',
                border: '1px solid #a8e6c3',
                borderRadius: '6px',
                color: '#27ae60',
                fontSize: '0.875rem',
              }}
            >
              ✓ "{state.manifest.name}" imported successfully!
            </p>
          )}

          {/* ── Duplicate confirm ────────────────────────────────────────── */}
          {state.phase === 'duplicate' && (
            <div
              role="alert"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>
                A plugin named <strong>"{state.manifest.name}"</strong> is already installed.
                Replace it?
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancelDuplicate}
                  style={{
                    padding: '7px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    background: '#fff',
                    color: '#444',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReplace}
                  style={{
                    padding: '7px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#e74c3c',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  Replace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
