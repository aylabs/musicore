/**
 * LayoutRenderer Component
 * Feature 017 - SVG-based music notation renderer
 * 
 * Renders music notation using exact glyph positions computed by
 * Feature 016 (Rust Layout Engine). Uses SVG DOM with viewBox for
 * resolution-independent display.
 */

import { Component, createRef, type RefObject } from 'react';
import type { GlobalLayout, System, StaffGroup, Staff, GlyphRun } from '../wasm/layout';
import type { RenderConfig } from '../types/RenderConfig';
import type { Viewport } from '../types/Viewport';
import { 
  validateRenderConfig, 
  validateViewport,
  getVisibleSystems,
  createSVGElement,
  createSVGGroup,
  svgNS,
} from '../utils/renderUtils';

/**
 * Props for LayoutRenderer component
 */
export interface LayoutRendererProps {
  /** Computed layout from Feature 016's computeLayout() */
  layout: GlobalLayout | null;
  /** Rendering configuration (colors, fonts, sizing) */
  config: RenderConfig;
  /** Visible viewport region (for virtualization) */
  viewport: Viewport;
  /** Optional CSS class name for SVG element */
  className?: string;
}

/**
 * LayoutRenderer component implementation
 * 
 * @example
 * ```tsx
 * import { computeLayout } from '../wasm/layout';
 * import { createDefaultConfig } from '../utils/renderUtils';
 * 
 * function ScoreDisplay({ score }) {
 *   const layout = computeLayout(score, { max_system_width: 1200 });
 *   const config = createDefaultConfig();
 *   const viewport = { x: 0, y: 0, width: 1200, height: 800 };
 * 
 *   return <LayoutRenderer layout={layout} config={config} viewport={viewport} />;
 * }
 * ```
 */
export class LayoutRenderer extends Component<LayoutRendererProps> {
  /** Reference to SVG element for direct DOM manipulation */
  private svgRef: RefObject<SVGSVGElement | null>;

  constructor(props: LayoutRendererProps) {
    super(props);
    this.svgRef = createRef();

    // Validate config on construction
    validateRenderConfig(props.config);
    validateViewport(props.viewport);
  }

  /**
   * Render SVG after component mounts
   */
  componentDidMount(): void {
    this.renderSVG();
  }

  /**
   * Re-render SVG when props change
   */
  componentDidUpdate(prevProps: LayoutRendererProps): void {
    // Re-render if layout, config, or viewport changed
    if (
      prevProps.layout !== this.props.layout ||
      prevProps.config !== this.props.config ||
      prevProps.viewport !== this.props.viewport
    ) {
      this.renderSVG();
    }
  }

  /**
   * Main rendering entry point (Task T016).
   * Clears SVG, queries visible systems, renders them.
   * Includes performance monitoring (T060).
   */
  private renderSVG(): void {
    const startTime = performance.now();
    
    const svg = this.svgRef.current;
    if (!svg) {
      console.warn('LayoutRenderer: SVG ref not available');
      return;
    }

    const { layout, viewport, config } = this.props;

    // Handle missing layout (Task T022)
    if (!layout) {
      this.renderError(svg, 'No layout available');
      return;
    }

    // Clear existing content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Set background color
    svg.style.backgroundColor = config.backgroundColor;

    // Set viewBox to match layout coordinate system (Task T021)
    // Use logical units from layout engine (staff space = 20)
    svg.setAttribute(
      'viewBox',
      `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`
    );

    // Query visible systems using virtualization (Task T009)
    const visibleSystems = getVisibleSystems(layout.systems, viewport);

    // Debug logging for performance demo
    if (layout.systems.length > 10) {
      console.log('LayoutRenderer.renderSVG:', {
        viewport,
        totalSystems: layout.systems.length,
        visibleSystemCount: visibleSystems.length,
        visibleIndexes: visibleSystems.map(s => s.index),
        firstSystemBounds: layout.systems[0]?.bounding_box
      });
    }

    // Create document fragment for efficient DOM insertion (Task T059)
    const fragment = document.createDocumentFragment();

    // Render each visible system (Task T017)
    for (const system of visibleSystems) {
      const systemGroup = this.renderSystem(system, 0, 0);
      fragment.appendChild(systemGroup);
    }

    // Append all systems at once
    svg.appendChild(fragment);

    // Performance monitoring (T060): Warn if render exceeds 16ms (60fps budget)
    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(
        `LayoutRenderer: Slow frame detected - ${renderTime.toFixed(2)}ms (threshold: 16ms for 60fps)`,
        {
          viewport,
          systemCount: layout.systems.length,
          visibleSystemCount: visibleSystems.length,
          renderTime: `${renderTime.toFixed(2)}ms`
        }
      );
    }
  }

  /**
   * Renders a single music system (Task T017).
   * Called by renderSVG() for each visible system.
   * 
   * @param system - System to render (from GlobalLayout.systems)
   * @param offsetX - X offset in logical units (typically 0 for left-aligned)
   * @param offsetY - Y offset in logical units (for viewport scrolling)
   * @returns SVG group element containing system content
   */
  private renderSystem(system: System, offsetX: number, offsetY: number): SVGGElement {
    const systemGroup = createSVGGroup();
    
    // Apply transform to position system (Task T017)
    const x = system.bounding_box.x + offsetX;
    const y = system.bounding_box.y + offsetY;
    systemGroup.setAttribute('transform', `translate(${x}, ${y})`);
    systemGroup.setAttribute('data-system-index', system.index.toString());

    // Render each staff group (Task T018)
    for (const staffGroup of system.staff_groups) {
      const staffGroupElement = this.renderStaffGroup(staffGroup);
      systemGroup.appendChild(staffGroupElement);
    }

    return systemGroup;
  }

  /**
   * Renders staff lines, braces, brackets for a group of staves (Task T018).
   * 
   * @param staffGroup - Staff group from system.staffGroups
   * @returns SVG group element containing staff group content
   */
  private renderStaffGroup(staffGroup: StaffGroup): SVGGElement {
    const staffGroupElement = createSVGGroup();
    staffGroupElement.setAttribute('data-staff-group', 'true');
    staffGroupElement.setAttribute('data-instrument-id', staffGroup.instrument_id);

    // Render braces/brackets if multi-staff (Tasks T045, T046 - US3)
    if (staffGroup.staves.length > 1 && staffGroup.bracket_type !== 'None') {
      const bracketElement = this.renderBracket(staffGroup);
      if (bracketElement) {
        staffGroupElement.appendChild(bracketElement);
      }
    }

    // Render each staff (Task T019)
    for (const staff of staffGroup.staves) {
      const staffElement = this.renderStaff(staff);
      staffGroupElement.appendChild(staffElement);
    }

    return staffGroupElement;
  }

  /**
   * Renders brace or bracket for multi-staff instrument (Tasks T045, T046).
   * 
   * @param staffGroup - Staff group with multiple staves
   * @returns SVG group element with brace/bracket glyph, or null if not applicable
   */
  private renderBracket(staffGroup: StaffGroup): SVGGElement | null {
    if (staffGroup.staves.length < 2) {
      return null;
    }

    const { config } = this.props;
    const bracketGroup = createSVGGroup();
    bracketGroup.setAttribute('class', 'bracket');

    // Calculate vertical span of all staves
    const firstStaff = staffGroup.staves[0];
    const lastStaff = staffGroup.staves[staffGroup.staves.length - 1];
    
    const topY = firstStaff.staff_lines[0].y_position;
    const bottomY = lastStaff.staff_lines[lastStaff.staff_lines.length - 1].y_position;
    const centerY = (topY + bottomY) / 2;
    const height = bottomY - topY;

    // SMuFL brace/bracket glyphs
    let codepoint: string;
    let xPosition: number = 10; // Left margin before staff lines
    
    if (staffGroup.bracket_type === 'Brace') {
      // Task T045: Brace rendering
      codepoint = '\uE000'; // SMuFL: brace
      
      // Render brace glyph with SMuFL standard fontSize 80
      const braceGlyph = this.renderGlyph(
        {
          position: { x: 0, y: 0 }, // Position via transform instead
          bounding_box: { x: xPosition - 5, y: topY, width: 20, height },
          codepoint,
          source_reference: {
            instrument_id: staffGroup.instrument_id,
            staff_index: 0,
            voice_index: 0,
            event_index: 0,
          },
        },
        config.fontFamily,
        80,
        config.glyphColor
      );
      
      // Apply vertical scaling to stretch brace to cover staff height
      // Use transform pattern: translate to position, then scale
      const scale = height / 160; // Brace natural height ~160 logical units
      braceGlyph.setAttribute('transform', `translate(${xPosition}, ${centerY}) scale(1, ${scale.toFixed(3)})`);
      braceGlyph.setAttribute('data-bracket-type', 'brace');
      
      bracketGroup.appendChild(braceGlyph);
      
    } else if (staffGroup.bracket_type === 'Bracket') {
      // Task T046: Bracket rendering
      codepoint = '\uE002'; // SMuFL: bracket
      
      // Render bracket glyph with SMuFL standard fontSize 80
      const bracketGlyph = this.renderGlyph(
        {
          position: { x: 0, y: 0 }, // Position via transform instead
          bounding_box: { x: xPosition - 5, y: topY, width: 20, height },
          codepoint,
          source_reference: {
            instrument_id: staffGroup.instrument_id,
            staff_index: 0,
            voice_index: 0,
            event_index: 0,
          },
        },
        config.fontFamily,
        80,
        config.glyphColor
      );
      
      // Apply vertical scaling for bracket
      const scale = height / 160;
      bracketGlyph.setAttribute('transform', `translate(${xPosition}, ${centerY}) scale(1, ${scale.toFixed(3)})`);
      bracketGlyph.setAttribute('data-bracket-type', 'bracket');
      
      bracketGroup.appendChild(bracketGlyph);
    }

    return bracketGroup;
  }

  /**
   * Renders 5 horizontal staff lines using SVG <line> elements (Task T019).
   * 
   * @param staff - Staff from staffGroup.staves
   * @returns SVG group element containing staff lines and glyphs
   */
  private renderStaff(staff: Staff): SVGGElement {
    const staffElement = createSVGGroup();
    staffElement.setAttribute('class', 'staff');

    const { config } = this.props;

    // Render 5 staff lines (Task T019)
    for (const staffLine of staff.staff_lines) {
      const line = createSVGElement('line');
      line.setAttribute('x1', staffLine.start_x.toString());
      line.setAttribute('y1', staffLine.y_position.toString());
      line.setAttribute('x2', staffLine.end_x.toString());
      line.setAttribute('y2', staffLine.y_position.toString());
      line.setAttribute('stroke', config.staffLineColor);
      line.setAttribute('stroke-width', '1');
      staffElement.appendChild(line);
    }

    // Render glyph runs (Task T020)
    for (const glyphRun of staff.glyph_runs) {
      const glyphRunElement = this.renderGlyphRun(glyphRun);
      staffElement.appendChild(glyphRunElement);
    }

    // Render structural glyphs (clefs, key signatures, time signatures)
    for (const glyph of staff.structural_glyphs) {
      // Structural glyphs use SMuFL standard: fontSize 80 = 4 staff spaces = 1em
      const glyphElement = this.renderGlyph(glyph, config.fontFamily, 80, config.glyphColor);
      staffElement.appendChild(glyphElement);
    }

    return staffElement;
  }

  /**
   * Renders a batch of identical glyphs via SVG <text> elements (Task T020).
   * Leverages Feature 016's GlyphRun batching for performance.
   * 
   * @param run - Glyph run from system.glyphRuns
   * @returns SVG group element containing glyph batch
   */
  private renderGlyphRun(run: GlyphRun): SVGGElement {
    const glyphRunGroup = createSVGGroup();
    glyphRunGroup.setAttribute('class', 'glyph-run');

    // Use the GlyphRun's font properties, not the generic config
    const fontFamily = run.font_family || 'Bravura';
    const fontSize = run.font_size || 40;
    const color = run.color ? `rgb(${run.color.r}, ${run.color.g}, ${run.color.b})` : '#000000';

    // Render each glyph in the run (Task T020)
    for (const glyph of run.glyphs) {
      const glyphElement = this.renderGlyph(glyph, fontFamily, fontSize, color);
      glyphRunGroup.appendChild(glyphElement);
    }

    return glyphRunGroup;
  }

  /**
   * Renders a single glyph as SVG <text> element with SMuFL codepoint.
   * 
   * @param glyph - Glyph to render
   * @param fontFamily - Font family (e.g., 'Bravura')
   * @param fontSize - Font size in logical units
   * @param color - Fill color
   * @returns SVG text element
   */
  private renderGlyph(glyph: any, fontFamily: string, fontSize: number, color: string): SVGTextElement {
    const text = createSVGElement('text');
    
    text.setAttribute('x', glyph.position.x.toString());
    text.setAttribute('y', glyph.position.y.toString());
    text.setAttribute('font-family', fontFamily);
    text.setAttribute('font-size', fontSize.toString());
    text.setAttribute('fill', color);
    
    // SMuFL noteheads should be vertically centered on staff lines
    // Use 'middle' to center horizontally on X coordinate
    // Use 'middle' baseline to center vertically on Y coordinate (staff line position)
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    
    // Set SMuFL codepoint as text content (Task T020)
    // Handle invalid codepoints (Task T023)
    try {
      text.textContent = glyph.codepoint;
    } catch (error) {
      // Render placeholder for invalid codepoint (Task T023)
      console.warn(`Invalid SMuFL codepoint: ${glyph.codepoint}`, error);
      text.textContent = '\u25A1'; // Empty square placeholder
      text.setAttribute('fill', '#FF0000'); // Red to indicate error
    }

    return text;
  }

  /**
   * Renders error message when layout is missing (Task T022).
   * 
   * @param svg - SVG element to render error into
   * @param message - Error message to display
   */
  private renderError(svg: SVGSVGElement, message: string): void {
    // Clear existing content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const text = createSVGElement('text');
    text.setAttribute('x', '50%');
    text.setAttribute('y', '50%');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-family', 'system-ui, sans-serif');
    text.setAttribute('font-size', '16');
    text.setAttribute('fill', '#999999');
    text.textContent = message;

    svg.appendChild(text);
  }

  /**
   * React render method - returns SVG element
   */
  render() {
    const { className } = this.props;
    
    return (
      <svg
        ref={this.svgRef}
        className={className}
        xmlns={svgNS}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
}
