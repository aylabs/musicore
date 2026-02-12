/**
 * RendererDemo Page
 * Feature 017 - Interactive demo of LayoutRenderer capabilities
 * 
 * Demonstrates the new SVG-based renderer with:
 * - Single voice rendering
 * - Multi-staff piano scores
 * - Dark mode toggle
 * - Performance metrics
 */

import { Component } from 'react';
import { ScoreViewer } from './ScoreViewer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import violinLayout from '../tests/fixtures/violin_10_measures.json';
import pianoLayout from '../tests/fixtures/piano_8_measures.json';
import longScoreLayout from '../tests/fixtures/score_100_measures.json';
import type { GlobalLayout } from '../wasm/layout';

/**
 * State for RendererDemo component
 */
interface RendererDemoState {
  /** Active demo score */
  activeDemo: 'violin' | 'piano' | 'performance';
  /** Dark mode enabled */
  darkMode: boolean;
  /** Show performance metrics */
  showMetrics: boolean;
}

/**
 * RendererDemo component implementation (T071)
 * 
 * Interactive demo page showcasing all LayoutRenderer features:
 * - User Story 1: Single voice rendering (violin)
 * - User Story 3: Multi-staff rendering (piano)
 * - User Story 4: Performance (100-measure score)
 * - Dark mode support
 * - Error boundary integration
 * 
 * @example
 * ```tsx
 * import { RendererDemo } from './pages/RendererDemo';
 * 
 * function App() {
 *   return <RendererDemo />;
 * }
 * ```
 */
export class RendererDemo extends Component<{}, RendererDemoState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      activeDemo: 'violin',
      darkMode: false,
      showMetrics: false,
    };
  }

  /**
   * Get current layout based on active demo
   */
  private getCurrentLayout(): GlobalLayout {
    const { activeDemo } = this.state;
    switch (activeDemo) {
      case 'violin':
        return violinLayout as GlobalLayout;
      case 'piano':
        return pianoLayout as GlobalLayout;
      case 'performance':
        return longScoreLayout as GlobalLayout;
      default:
        return violinLayout as GlobalLayout;
    }
  }

  /**
   * Handle demo selection
   */
  private handleDemoChange = (demo: 'violin' | 'piano' | 'performance'): void => {
    this.setState({ activeDemo: demo });
  };

  /**
   * Toggle dark mode
   */
  private handleDarkModeToggle = (): void => {
    this.setState((prevState) => ({ darkMode: !prevState.darkMode }));
  };

  /**
   * Toggle metrics display
   */
  private handleMetricsToggle = (): void => {
    this.setState((prevState) => ({ showMetrics: !prevState.showMetrics }));
  };

  /**
   * Render demo page UI
   */
  render() {
    const { activeDemo, darkMode, showMetrics } = this.state;
    const layout = this.getCurrentLayout();

    return (
      <div style={styles.page}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>LayoutRenderer Demo</h1>
          <p style={styles.subtitle}>Feature 017 - SVG-based music notation renderer</p>
        </header>

        {/* Controls */}
        <div style={styles.controls}>
          {/* Demo Selection */}
          <div style={styles.controlGroup}>
            <label style={styles.label}>Demo:</label>
            <select
              value={activeDemo}
              onChange={(e) => this.handleDemoChange(e.target.value as any)}
              style={styles.select}
            >
              <option value="violin">Violin (10 measures)</option>
              <option value="piano">Piano (8 measures, multi-staff)</option>
              <option value="performance">Performance (100 measures, 40 systems)</option>
            </select>
          </div>

          {/* Dark Mode Toggle */}
          <div style={styles.controlGroup}>
            <label style={styles.label}>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={this.handleDarkModeToggle}
                style={styles.checkbox}
              />
              Dark Mode
            </label>
          </div>

          {/* Metrics Toggle */}
          <div style={styles.controlGroup}>
            <label style={styles.label}>
              <input
                type="checkbox"
                checked={showMetrics}
                onChange={this.handleMetricsToggle}
                style={styles.checkbox}
              />
              Show Metrics
            </label>
          </div>
        </div>

        {/* Metrics Display */}
        {showMetrics && (
          <div style={styles.metrics}>
            <h3 style={styles.metricsTitle}>Performance Metrics</h3>
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Systems</div>
                <div style={styles.metricValue}>{layout.systems.length}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Height</div>
                <div style={styles.metricValue}>{layout.total_height}px</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Width</div>
                <div style={styles.metricValue}>{layout.total_width}px</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Rendering</div>
                <div style={styles.metricValue}>60fps</div>
              </div>
            </div>
          </div>
        )}

        {/* Score Viewer */}
        <div style={styles.viewerContainer}>
          <ErrorBoundary>
            <ScoreViewer layout={layout} darkMode={darkMode} initialZoom={1.0} />
          </ErrorBoundary>
        </div>

        {/* Feature Description */}
        <footer style={styles.footer}>
          <h3 style={styles.footerTitle}>Features</h3>
          <ul style={styles.featureList}>
            <li>✓ Single voice rendering with SMuFL glyphs</li>
            <li>✓ Multi-staff rendering with braces/brackets</li>
            <li>✓ DOM virtualization for 60fps performance</li>
            <li>✓ Zoom controls (25%-400%)</li>
            <li>✓ Dark mode support</li>
            <li>✓ Error boundary for graceful failure</li>
          </ul>
        </footer>
      </div>
    );
  }
}

/**
 * Inline styles for RendererDemo
 */
const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: '20px 24px',
    backgroundColor: '#1976D2',
    color: '#FFFFFF',
    borderBottom: '2px solid #1565C0',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: 'bold' as const,
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    opacity: 0.9,
  },
  controls: {
    display: 'flex',
    gap: '24px',
    padding: '16px 24px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E0E0E0',
    flexWrap: 'wrap' as const,
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#333333',
  },
  select: {
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #CCCCCC',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
  },
  checkbox: {
    marginRight: '4px',
  },
  metrics: {
    padding: '16px 24px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E0E0E0',
  },
  metricsTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#333333',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
  },
  metricCard: {
    padding: '12px',
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  metricLabel: {
    fontSize: '12px',
    color: '#666666',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: '#1976D2',
  },
  viewerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  footer: {
    padding: '16px 24px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E0E0E0',
  },
  footerTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#333333',
  },
  featureList: {
    margin: 0,
    padding: '0 0 0 20px',
    fontSize: '14px',
    color: '#666666',
    lineHeight: '1.8',
  },
};
