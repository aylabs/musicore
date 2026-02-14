/**
 * ScoreViewer Component
 * Feature 017 - Interactive music score viewer with scrolling and zoom
 * 
 * Integrates LayoutRenderer with viewport management, scroll handling,
 * and zoom controls for production use.
 */

import { Component, createRef, type RefObject } from 'react';
import { LayoutRenderer } from '../components/LayoutRenderer';
import { createDefaultConfig } from '../utils/renderUtils';
import type { GlobalLayout } from '../wasm/layout';
import type { RenderConfig } from '../types/RenderConfig';
import type { Viewport } from '../types/Viewport';

/**
 * Props for ScoreViewer component
 */
export interface ScoreViewerProps {
  /** Computed layout from Feature 016's computeLayout() */
  layout: GlobalLayout | null;
  /** Optional custom rendering configuration */
  config?: RenderConfig;
  /** Initial zoom level (1.0 = 100%, 2.0 = 200%) */
  initialZoom?: number;
  /** Enable dark mode (overrides config colors) */
  darkMode?: boolean;
}

/**
 * State for ScoreViewer component
 */
interface ScoreViewerState {
  /** Current viewport region */
  viewport: Viewport;
  /** Current zoom level (1.0 = 100%) */
  zoom: number;
  /** Rendering configuration (supports dark mode) */
  config: RenderConfig;
  /** Current scroll position in pixels */
  scrollTop: number;
}

/**
 * ScoreViewer component implementation (T066-T067)
 * 
 * Features:
 * - Scroll-based viewport tracking (T066)
 * - Zoom controls via viewBox manipulation (T067)
 * - Dark mode support (T069)
 * - Error boundary integration (T070)
 * 
 * @example
 * ```tsx
 * import { computeLayout } from '../wasm/layout';
 * 
 * function App() {
 *   const [layout, setLayout] = useState<GlobalLayout | null>(null);
 * 
 *   useEffect(() => {
 *     const result = computeLayout(compiledScore);
 *     setLayout(result);
 *   }, [compiledScore]);
 * 
 *   return <ScoreViewer layout={layout} />;
 * }
 * ```
 */
export class ScoreViewer extends Component<ScoreViewerProps, ScoreViewerState> {
  /** Reference to scroll container */
  private containerRef: RefObject<HTMLDivElement | null>;
  
  /** Debounce timer for scroll events */
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ScoreViewerProps) {
    super(props);
    this.containerRef = createRef();

    const baseConfig = props.config || createDefaultConfig();
    const config = props.darkMode ? this.createDarkModeConfig(baseConfig) : baseConfig;

    this.state = {
      viewport: {
        x: 0,
        y: 0,
        width: 1200,
        height: 10000, // Large initial height to show all systems until updateViewport adjusts it
      },
      zoom: props.initialZoom || 1.0,
      scrollTop: 0,
      config,
    };
  }

  /**
   * Create dark mode configuration (T069)
   */
  private createDarkModeConfig(base: RenderConfig): RenderConfig {
    return {
      ...base,
      backgroundColor: '#1E1E1E',
      staffLineColor: '#CCCCCC',
      glyphColor: '#FFFFFF',
    };
  }

  /**
   * Setup scroll event listener
   */
  componentDidMount(): void {
    const container = this.containerRef.current;
    if (container) {
      container.addEventListener('scroll', this.handleScroll);
      this.updateViewport();
    }
  }

  /**
   * Cleanup scroll event listener
   */
  componentWillUnmount(): void {
    const container = this.containerRef.current;
    if (container) {
      container.removeEventListener('scroll', this.handleScroll);
    }
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
  }

  /**
   * Update config when dark mode changes, and update viewport when layout changes
   */
  componentDidUpdate(prevProps: ScoreViewerProps): void {
    if (prevProps.darkMode !== this.props.darkMode) {
      const baseConfig = this.props.config || createDefaultConfig();
      const config = this.props.darkMode ? this.createDarkModeConfig(baseConfig) : baseConfig;
      this.setState({ config });
    }
    
    // Update viewport when layout changes (new score loaded)
    if (prevProps.layout !== this.props.layout && this.props.layout) {
      this.updateViewport();
    }
  }

  /**
   * Handle scroll events with debouncing (T066)
   */
  private handleScroll = (): void => {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }

    // Debounce scroll updates (16ms = 60fps)
    this.scrollTimer = setTimeout(() => {
      this.updateViewport();
    }, 16);
  };

  /**
   * Update viewport based on scroll position (T066)
   */
  private updateViewport(): void {
    const container = this.containerRef.current;
    if (!container || !this.props.layout) {
      return;
    }

    const { zoom } = this.state;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    // Calculate viewport in logical units
    // Zoom affects the visible area: higher zoom = smaller viewport
    // Add padding to viewport to show glyphs that extend beyond system bounds
    // Use extra padding to show more systems and avoid sudden pop-in
    const viewportPadding = 150; // Extra space top/bottom for smooth scrolling
    
    // When at top of page (not scrolled), use full layout height to show all systems
    // Otherwise use small viewport for efficient virtualized rendering
    const viewportHeight = scrollTop === 0 
      ? this.props.layout.total_height + viewportPadding
      : (clientHeight / zoom) + viewportPadding;
    
    // Allow negative Y to show glyphs above first system (e.g., clef at y=-10)
    const viewportY = (scrollTop / zoom) - (viewportPadding / 2);
    const viewportWidth = this.props.layout.total_width;

    this.setState({
      viewport: {
        x: 0,
        y: viewportY,
        width: viewportWidth,
        height: viewportHeight,
      },
      scrollTop,
    });
  }

  /**
   * Handle zoom in (T067)
   */
  private handleZoomIn = (): void => {
    this.setState(
      (prevState) => ({
        zoom: Math.min(prevState.zoom * 1.2, 4.0), // Max 400%
      }),
      () => this.updateViewport()
    );
  };

  /**
   * Handle zoom out (T067)
   */
  private handleZoomOut = (): void => {
    this.setState(
      (prevState) => ({
        zoom: Math.max(prevState.zoom / 1.2, 0.25), // Min 25%
      }),
      () => this.updateViewport()
    );
  };

  /**
   * Reset zoom to 100% (T067)
   */
  private handleZoomReset = (): void => {
    this.setState({ zoom: 1.0 }, () => this.updateViewport());
  };

  /**
   * Render ScoreViewer UI
   */
  render() {
    const { layout } = this.props;
    const { viewport, zoom, config, scrollTop } = this.state;

    if (!layout) {
      return (
        <div style={styles.container}>
          <div style={styles.message}>No score loaded</div>
        </div>
      );
    }

    // Calculate scroll container dimensions based on layout and zoom
    const totalHeight = layout.total_height * zoom;
    const totalWidth = layout.total_width * zoom;

    return (
      <div style={styles.wrapper}>
        {/* Zoom Controls (T067) */}
        <div style={styles.controls}>
          <button onClick={this.handleZoomOut} style={styles.button} title="Zoom Out">
            -
          </button>
          <span style={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button onClick={this.handleZoomIn} style={styles.button} title="Zoom In">
            +
          </button>
          <button onClick={this.handleZoomReset} style={styles.button} title="Reset Zoom">
            Reset
          </button>
        </div>

        {/* Scroll Container (T066) */}
        <div
          ref={this.containerRef}
          style={{
            ...styles.container,
            backgroundColor: config.backgroundColor,
          }}
        >
          <div style={{ 
            height: `${totalHeight}px`,
            width: `${totalWidth}px`,
            position: 'relative',
          }}>
            {/* SVG container positioned at scroll position (not viewport.y which includes padding) */}
            <div style={{
              position: 'absolute',
              top: `${scrollTop}px`,
              left: 0,
              width: `${totalWidth}px`,
              height: `${viewport.height * zoom}px`,
              pointerEvents: 'none',
            }}>
              <LayoutRenderer layout={layout} config={config} viewport={viewport} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Inline styles for ScoreViewer
 */
const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    width: '100%',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#F5F5F5',
    borderBottom: '1px solid #DDDDDD',
  },
  button: {
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    border: '1px solid #CCCCCC',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  zoomLabel: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    minWidth: '50px',
    textAlign: 'center' as const,
  },
  container: {
    flex: 1,
    overflowX: 'auto', // Container handles horizontal scrolling (accessible without scrolling down)
    overflowY: 'hidden', // Prevent vertical scrolling in container - page handles it
    position: 'relative' as const,
  },
  message: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: '18px',
    color: '#999999',
  },
};
