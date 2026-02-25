/**
 * PluginImporterDialog tests — T021
 * Feature 030: Plugin Architecture (US2 — Import a Third-Party Plugin)
 *
 * Constitution Principle V: written before PluginImporterDialog.tsx
 * implementation.
 *
 * Uses vi.mock to stub out importPlugin so these tests exercise the dialog
 * UI in isolation (no real ZIP / IndexedDB required).
 *
 * Covers:
 * - File picker input is rendered
 * - Selecting a valid ZIP shows success state and calls onImportComplete
 * - Selecting an invalid ZIP shows an error message
 * - A duplicate triggers a confirmation prompt
 * - Cancelling duplicate leaves existing plugin and does NOT call onImportComplete
 * - Confirming duplicate calls importPlugin with overwrite: true and onImportComplete
 * - Close button / onClose prop is triggered
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PluginManifest } from '../../plugin-api/index';
import type { ImportResult } from '../../services/plugins/PluginImporter';

// ---------------------------------------------------------------------------
// Mock PluginImporter — must be declared before the component import
// ---------------------------------------------------------------------------
const mockImportPlugin = vi.fn<(file: File, _registry: unknown, _opts?: unknown) => Promise<ImportResult>>();

vi.mock('../../services/plugins/PluginImporter', () => ({
  importPlugin: (...args: Parameters<typeof mockImportPlugin>) => mockImportPlugin(...args),
}));

// Static import — vi.mock above is hoisted so the stub is applied first
import { PluginImporterDialog } from './PluginImporterDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeManifest: PluginManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  pluginApiVersion: '1',
  entryPoint: 'index.js',
  origin: 'imported',
};

function makeZipFile(name = 'plugin.zip') {
  return new File(['fake zip bytes'], name, { type: 'application/zip' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PluginImporterDialog', () => {
  let onImportComplete: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onImportComplete = vi.fn();
    onClose = vi.fn();
    mockImportPlugin.mockReset();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders a file input that accepts .zip files', () => {
    render(<PluginImporterDialog onImportComplete={onImportComplete} onClose={onClose} />);
    const input = screen.getByTestId('plugin-file-input') as HTMLInputElement;
    expect(input.accept).toContain('.zip');
  });

  it('renders a close button that calls onClose', () => {
    render(<PluginImporterDialog onImportComplete={onImportComplete} onClose={onClose} />);
    const btn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it('calls onImportComplete with manifest on successful import', async () => {
    mockImportPlugin.mockResolvedValue({ success: true, manifest: fakeManifest });

    render(<PluginImporterDialog onImportComplete={onImportComplete} onClose={onClose} />);
    const input = screen.getByTestId('plugin-file-input');
    fireEvent.change(input, { target: { files: [makeZipFile()] } });

    await waitFor(() => {
      expect(onImportComplete).toHaveBeenCalledWith(fakeManifest);
    });
  });

  it('shows a success confirmation message after import', async () => {
    mockImportPlugin.mockResolvedValue({ success: true, manifest: fakeManifest });

    render(<PluginImporterDialog onImportComplete={onImportComplete} onClose={onClose} />);
    fireEvent.change(screen.getByTestId('plugin-file-input'), { target: { files: [makeZipFile()] } });

    await waitFor(() => {
      expect(screen.getByText(/imported successfully|installed/i)).toBeInTheDocument();
    });
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it('shows error message when importPlugin returns success: false', async () => {
    mockImportPlugin.mockResolvedValue({ success: false, error: 'invalid plugin.json' });

    render(<PluginImporterDialog onImportComplete={onImportComplete} onClose={onClose} />);
    fireEvent.change(screen.getByTestId('plugin-file-input'), { target: { files: [makeZipFile()] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid plugin\.json/i)).toBeInTheDocument();
    });
    expect(onImportComplete).not.toHaveBeenCalled();
  });

  // ── Duplicate path ────────────────────────────────────────────────────────

  it('shows a duplicate-confirmation dialog when a duplicate is detected', async () => {
    mockImportPlugin.mockResolvedValue({
      success: false,
      duplicate: true,
      manifest: fakeManifest,
    });

    render(<PluginImporterDialog onImportComplete={onImportComplete} onClose={onClose} />);
    fireEvent.change(screen.getByTestId('plugin-file-input'), { target: { files: [makeZipFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // Confirm the duplicate prompt mentions the plugin name
    expect(screen.getByRole('alert').textContent).toMatch(/My Plugin/);
    expect(onImportComplete).not.toHaveBeenCalled();
  });

  it('does NOT overwrite when user cancels the duplicate confirm', async () => {
    mockImportPlugin.mockResolvedValue({
      success: false,
      duplicate: true,
      manifest: fakeManifest,
    });

    render(<PluginImporterDialog onImportComplete={onImportComplete} onClose={onClose} />);
    fireEvent.change(screen.getByTestId('plugin-file-input'), { target: { files: [makeZipFile()] } });

    // Wait for the duplicate confirmation prompt
    await waitFor(() => screen.getByRole('alert'));

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onImportComplete).not.toHaveBeenCalled();
  });

  it('overwrites and calls onImportComplete when user confirms duplicate replace', async () => {
    // First call → duplicate; second call (with overwrite) → success
    mockImportPlugin
      .mockResolvedValueOnce({ success: false, duplicate: true, manifest: fakeManifest })
      .mockResolvedValueOnce({ success: true, manifest: fakeManifest });

    render(<PluginImporterDialog onImportComplete={onImportComplete} onClose={onClose} />);
    fireEvent.change(screen.getByTestId('plugin-file-input'), { target: { files: [makeZipFile()] } });

    await waitFor(() => screen.getByRole('alert'));

    fireEvent.click(screen.getByRole('button', { name: /replace|overwrite|yes/i }));

    await waitFor(() => {
      expect(onImportComplete).toHaveBeenCalledWith(fakeManifest);
    });
    // The second call must pass overwrite: true
    expect(mockImportPlugin).toHaveBeenCalledTimes(2);
    expect(mockImportPlugin.mock.calls[1][2]).toMatchObject({ overwrite: true });
  });
});
