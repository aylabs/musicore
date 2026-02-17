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
import type { ITickSource } from '../types/playback';

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
  /** Feature 019: Set of note IDs to highlight during playback */
  highlightedNoteIds?: Set<string>;
  /** Feature 019: Map from SourceReference keys to Note IDs */
  sourceToNoteIdMap?: Map<string, string>;
  /** Toggle playback on click/touch of the score */
  onTogglePlayback?: () => void;
  /** Callback when a note glyph is clicked */
  onNoteClick?: (noteId: string) => void;
  /** ID of the currently selected note */
  selectedNoteId?: string;
  /** Feature 024: Tick source ref for rAF-driven highlights.
   * Must be a ref object so the rAF loop reads live tick data
   * even when shouldComponentUpdate blocks React re-renders. */
  tickSourceRef?: { current: ITickSource };
  /** Feature 024: Notes array for building HighlightIndex */
  notes?: ReadonlyArray<{ id: string; start_tick: number; duration_ticks: number }>;
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
/**
 * Base scale factor: the layout coordinate system is authored at 2x visual size,
 * so a user-facing zoom of 100% actually renders at 0.5× layout units.
 */
const BASE_SCALE = 0.5;

export class ScoreViewer extends Component<ScoreViewerProps, ScoreViewerState> {
  /** Reference to scroll container */
  private containerRef: RefObject<HTMLDivElement | null>;
  
  /** Reference to the wrapper div for scroll-into-view calculations */
  private wrapperRef: RefObject<HTMLDivElement | null>;
  
  /** Debounce timer for scroll events */
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;

  /** Track which system we last auto-scrolled to, to avoid redundant scrolls */
  private lastAutoScrollSystemIndex: number = -1;

  /** Active auto-scroll animation frame ID */
  private autoScrollAnimationId: number | null = null;

  /** True while auto-scroll animation is in progress — suppresses viewport updates */
  private isAutoScrolling = false;

  /** Feature 024 (T026): rAF-based scroll throttle ID */
  private scrollRafId: number = 0;

  /** Feature 024 (T027): Last scroll position applied to viewport (avoid redundant setState) */
  private lastAppliedScrollTop: number = 0;

  /** Feature 024 (T027): Minimum scroll delta before updating viewport state (pixels) */
  private static readonly SCROLL_THRESHOLD = 4;

  constructor(props: ScoreViewerProps) {
    super(props);
    this.containerRef = createRef();
    this.wrapperRef = createRef();

    const baseConfig = props.config || createDefaultConfig();
    const config = props.darkMode ? this.createDarkModeConfig(baseConfig) : baseConfig;

    this.state = {
      viewport: {
        x: 0,
        y: 0,
        width: 2400,
        height: 10000, // Large initial height to show all systems until updateViewport adjusts it
      },
      zoom: 1.0,
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
   * Uses window scroll since container has overflow:visible (page scrollbar)
   */
  componentDidMount(): void {
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    this.updateViewport();
  }

  /**
   * Cleanup scroll event listener
   */
  componentWillUnmount(): void {
    window.removeEventListener('scroll', this.handleScroll);
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    if (this.autoScrollAnimationId !== null) {
      cancelAnimationFrame(this.autoScrollAnimationId);
    }
    // Feature 024 (T026): Cancel pending scroll rAF
    if (this.scrollRafId !== 0) {
      cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = 0;
    }
  }

  /**
   * Update config when dark mode changes, update viewport when layout changes,
   * and auto-scroll to follow highlighted notes during playback.
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

    // Auto-scroll to follow highlighted notes during playback
    if (
      this.props.highlightedNoteIds !== prevProps.highlightedNoteIds &&
      this.props.highlightedNoteIds &&
      this.props.highlightedNoteIds.size > 0 &&
      this.props.layout &&
      this.props.sourceToNoteIdMap
    ) {
      this.scrollToHighlightedSystem();
    }

    // Reset auto-scroll tracking when highlighting stops (playback stopped)
    if (
      prevProps.highlightedNoteIds &&
      prevProps.highlightedNoteIds.size > 0 &&
      (!this.props.highlightedNoteIds || this.props.highlightedNoteIds.size === 0)
    ) {
      this.lastAutoScrollSystemIndex = -1;
    }
  }

  /**
   * Handle scroll events with rAF-based throttling (T066, T026)
   * Feature 024 (T026): Replaced setTimeout debounce with rAF for
   * efficient scroll handling that aligns with display refresh rate.
   */
  private handleScroll = (): void => {
    // rAF-based throttle: coalesce all scroll events within one frame
    if (this.scrollRafId === 0) {
      this.scrollRafId = requestAnimationFrame(() => {
        this.scrollRafId = 0;
        this.updateViewport();
      });
    }
  };

  /**
   * Update viewport based on page scroll position (T066)
   * Since the container has overflow:visible, scrolling is handled by the
   * browser page scrollbar. We compute the effective "scrollTop" by measuring
   * how far the container's top has scrolled above the viewport.
   * Feature 024 (T027): Skips setState when scroll delta is below threshold
   * to reduce React re-renders during playback auto-scroll.
   */
  private updateViewport(): void {
    const container = this.containerRef.current;
    if (!container || !this.props.layout) {
      return;
    }

    // Skip viewport updates during auto-scroll animation to prevent
    // scroll fight loop: scrollTo → scroll event → setState({viewport}) →
    // LayoutRenderer re-render → SVG rebuild → layout shift → more scrolling
    if (this.isAutoScrolling) {
      return;
    }

    const { zoom } = this.state;
    const renderScale = zoom * BASE_SCALE;

    // Compute effective scroll offset: how many pixels of the container
    // are above the viewport. containerRect.top is negative when scrolled past.
    const containerRect = container.getBoundingClientRect();
    const scrollTop = Math.max(0, -containerRect.top);

    // Feature 024 (T027): Skip viewport update if scroll delta is negligible
    if (Math.abs(scrollTop - this.lastAppliedScrollTop) < ScoreViewer.SCROLL_THRESHOLD) {
      return;
    }
    this.lastAppliedScrollTop = scrollTop;

    const clientHeight = window.innerHeight;

    // Calculate viewport in logical units
    // renderScale affects the visible area: higher scale = smaller viewport
    // Add padding to viewport to show glyphs that extend beyond system bounds
    // Use extra padding to show more systems and avoid sudden pop-in
    const viewportPadding = 150; // Extra space top/bottom for smooth scrolling
    
    // Use window innerHeight as the visible viewport height
    const viewportHeight = (clientHeight / renderScale) + viewportPadding;
    
    // Allow negative Y to show glyphs above first system (e.g., clef at y=-10)
    const viewportY = (scrollTop / renderScale) - (viewportPadding / 2);
    const viewportWidth = this.props.layout.total_width;

    // Expand viewport leftward to show instrument name labels (Feature 023)
    const labelMargin = 80;
    this.setState({
      viewport: {
        x: -labelMargin,
        y: viewportY,
        width: viewportWidth + labelMargin,
        height: viewportHeight,
      },
      scrollTop,
    });
  }

  /**
   * Auto-scroll to keep the system containing highlighted notes visible.
   * Uses requestAnimationFrame with ease-out interpolation for smooth scrolling
   * that doesn't jump abruptly between systems.
   * 
   * Checks visibility: even if the same system index, re-scroll if it has
   * drifted out of the visible viewport area.
   */
  private scrollToHighlightedSystem(): void {
    const { layout, highlightedNoteIds, sourceToNoteIdMap } = this.props;
    if (!layout || !highlightedNoteIds || !sourceToNoteIdMap) return;

    // Find the system index containing highlighted notes
    let targetSystemIndex = -1;

    for (const system of layout.systems) {
      for (const [key, noteId] of sourceToNoteIdMap.entries()) {
        const keySystemIndex = parseInt(key.split('/')[0], 10);
        if (keySystemIndex === system.index && highlightedNoteIds.has(noteId)) {
          targetSystemIndex = system.index;
          break;
        }
      }
      if (targetSystemIndex >= 0) break;
    }

    if (targetSystemIndex < 0) {
      return;
    }

    const targetSystem = layout.systems[targetSystemIndex];
    if (!targetSystem) return;

    const { zoom } = this.state;
    const renderScale = zoom * BASE_SCALE;
    const systemTopPx = targetSystem.bounding_box.y * renderScale;
    const systemHeight = (targetSystem.bounding_box.height || 200) * renderScale;

    const container = this.containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    
    // Calculate where the system currently is relative to the viewport
    const systemViewportTop = containerRect.top + systemTopPx;
    const systemViewportBottom = systemViewportTop + systemHeight;
    const viewportHeight = window.innerHeight;

    // Check if system is already well-visible (within 15%-85% of viewport)
    const topThreshold = viewportHeight * 0.15;
    const bottomThreshold = viewportHeight * 0.85;
    
    const isVisible = systemViewportTop >= topThreshold && systemViewportBottom <= bottomThreshold;

    // Skip if same system and still visible
    if (targetSystemIndex === this.lastAutoScrollSystemIndex && isVisible) {
      return;
    }

    this.lastAutoScrollSystemIndex = targetSystemIndex;

    // Calculate target page scroll: position system ~20% from viewport top
    const currentPageScroll = window.scrollY || document.documentElement.scrollTop;
    const containerTopInPage = containerRect.top + currentPageScroll;
    const targetScroll = Math.max(0, containerTopInPage + systemTopPx - viewportHeight * 0.2);

    // Cancel any in-progress animation
    if (this.autoScrollAnimationId !== null) {
      cancelAnimationFrame(this.autoScrollAnimationId);
      this.autoScrollAnimationId = null;
      this.isAutoScrolling = false;
    }

    // Animate scroll with ease-out curve over 400ms for smooth feel
    const startScroll = window.scrollY;
    const distance = targetScroll - startScroll;

    // Skip if distance is negligible
    if (Math.abs(distance) < 2) return;

    const duration = 400; // ms — shorter for tighter tracking
    const startTime = performance.now();

    const animateScroll = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: decelerates smoothly
      const eased = 1 - Math.pow(1 - progress, 3);

      window.scrollTo(0, startScroll + distance * eased);

      if (progress < 1) {
        this.autoScrollAnimationId = requestAnimationFrame(animateScroll);
      } else {
        this.autoScrollAnimationId = null;
        this.isAutoScrolling = false;
        // Catch-up: single viewport update after animation completes
        this.updateViewport();
      }
    };

    this.isAutoScrolling = true;
    this.autoScrollAnimationId = requestAnimationFrame(animateScroll);
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

    // Calculate scroll container dimensions based on layout and renderScale
    // Include label margin in width so SVG viewBox and element aspect ratios match
    const labelMargin = 80; // Must match value in updateViewport
    const renderScale = zoom * BASE_SCALE;
    const totalHeight = layout.total_height * renderScale;
    const totalWidth = (layout.total_width + labelMargin) * renderScale;

    return (
      <div ref={this.wrapperRef} style={styles.wrapper}>
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
          onClick={this.props.onTogglePlayback}
          style={{
            ...styles.container,
            backgroundColor: config.backgroundColor,
            cursor: this.props.onTogglePlayback ? 'pointer' : 'default',
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
              height: `${viewport.height * renderScale}px`,
              pointerEvents: 'none',
            }}>
              <LayoutRenderer 
                layout={layout} 
                config={config} 
                viewport={viewport}
                highlightedNoteIds={this.props.highlightedNoteIds}
                sourceToNoteIdMap={this.props.sourceToNoteIdMap}
                onNoteClick={this.props.onNoteClick}
                selectedNoteId={this.props.selectedNoteId}
                tickSourceRef={this.props.tickSourceRef}
                notes={this.props.notes}
              />
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
    color: '#000000',
  },
  container: {
    flex: 1,
    overflow: 'visible' as const, // Use global browser scrollbar for both axes
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
