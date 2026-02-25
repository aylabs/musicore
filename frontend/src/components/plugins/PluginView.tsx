/**
 * PluginView — per-plugin error boundary (T017)
 * Feature 030: Plugin Architecture
 *
 * Wraps any plugin component in a React class-based error boundary.
 * On crash: displays plugin name + error message + "Reload plugin" button.
 * "Reload plugin" resets boundary state so the plugin's component is remounted.
 *
 * This is intentionally a separate class from ErrorBoundary.tsx so it can
 * render the plugin name + caught error in its fallback without modifying
 * the existing ErrorBoundary API. (FR-020 / research.md R-005)
 */

import { Component, type ReactNode } from 'react';
import type { PluginManifest } from '../../plugin-api/index';

export interface PluginViewProps {
  /** Manifest of the plugin whose Component is being wrapped. */
  plugin: PluginManifest;
  children: ReactNode;
}

interface PluginViewState {
  hasError: boolean;
  error: Error | null;
}

export class PluginView extends Component<PluginViewProps, PluginViewState> {
  constructor(props: PluginViewProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PluginViewState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    console.error(`[PluginView] Plugin "${this.props.plugin.name}" crashed:`, error);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { plugin, children } = this.props;

    if (hasError) {
      return (
        <div className="plugin-error" style={styles.container}>
          <div style={styles.card}>
            <p style={styles.message}>
              Plugin &ldquo;{plugin.name}&rdquo; encountered an error:{' '}
              {error?.message ?? 'Unknown error'}
            </p>
            <button onClick={this.handleReset} style={styles.button}>
              Reload plugin
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '20px',
    background: '#f9f9f9',
  },
  card: {
    maxWidth: '480px',
    padding: '20px',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  message: {
    margin: '0 0 16px',
    fontSize: '0.95rem',
    color: '#555',
    lineHeight: '1.5',
  },
  button: {
    padding: '8px 20px',
    fontSize: '0.875rem',
    fontWeight: 'bold' as const,
    color: '#fff',
    background: '#1976D2',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};
