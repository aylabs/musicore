# Feature Specification: Layout-Driven Renderer

**Feature Branch**: `017-layout-renderer`  
**Created**: 2026-02-12  
**Status**: Draft  
**Depends On**: Feature 016 (Rust Layout Engine)  
**Input**: User description: "Create a new renderer to display an instrument voice based on the new layout engine and compare results with current renderer"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Render Single Voice Using Layout Engine (Priority: P1)

Musicians practice individual instrument parts (e.g., right hand of piano, violin part in sonata). The new renderer must display a single voice using exact glyph positions computed by the layout engine, proving the layout-renderer integration works correctly. This establishes the foundation for full score rendering.

**Why this priority**: Core proof-of-concept that validates layout engine integration. Without this working, nothing else in the feature can proceed. Delivers immediate value by showing notes rendered at correct positions.

**Independent Test**: Import a 10-measure single-staff score (e.g., violin melody), compute layout with layout engine, render using new renderer, verify noteheads appear at exact (x, y) positions from GlobalLayout (within ±2 pixels after logical→pixel conversion).

**Acceptance Scenarios**:

1. **Given** a 10-measure treble clef score with 40 quarter notes, **When** layout engine computes GlobalLayout and new renderer draws glyphs, **Then** each notehead appears at position matching glyph.position.x and glyph.position.y from layout (±2 pixel tolerance)
2. **Given** a GlobalLayout with 3 systems containing different numbers of measures (4, 3, 3 measures), **When** new renderer draws systems, **Then** system boundaries match layout engine's system bounding boxes exactly
3. **Given** layout engine computes staff lines at specific y-positions, **When** new renderer draws staff, **Then** 5 staff lines are drawn at exact y-positions from layout.systems[].staff_groups[].staves[].staff_lines[]

---

### User Story 2 - Visual Comparison with Current Renderer (Priority: P1)

Developers need confidence that the new layout-driven renderer produces visually equivalent output to the existing TypeScript renderer. Without visual validation, we cannot safely replace the old renderer. Side-by-side comparison reveals discrepancies requiring investigation.

**Why this priority**: Critical for validating correctness. If new renderer produces significantly different output, it indicates bugs or algorithmic differences that must be resolved before proceeding.

**Independent Test**: Render the same 10-measure score with both old and new renderers, capture screenshots, perform pixel-diff comparison, verify <5% visual difference (accounting for anti-aliasing variations).

**Acceptance Scenarios**:

1. **Given** a 10-measure piano score, **When** rendered with old renderer and new layout-driven renderer, **Then** screenshot pixel diff shows <5% difference (ignoring anti-aliasing)
2. **Given** the same score rendered in both renderers, **When** comparing system break points, **Then** both renderers break at same measure boundaries (±1 system acceptable)
3. **Given** both renderers displaying noteheads, **When** measuring notehead positions, **Then** x,y positions differ by <2 pixels on average (sub-pixel rendering tolerance)

---

### User Story 3 - Render Multi-Staff Voice (Piano Right Hand) (Priority: P2)

Musicians practicing piano need to see both hands (treble + bass clefs). The renderer must display multi-staff instruments using layout engine's StaffGroup structure, with correct staff spacing and bracket rendering.

**Why this priority**: Extends single-voice capability to multi-staff context. Required for piano, organ, and other keyboard instruments. Demonstrates layout engine's staff grouping works correctly.

**Independent Test**: Render 8-measure piano score (treble + bass), verify both staves appear with correct vertical spacing, staff bracket/brace drawn between staves, notes on both staves positioned correctly.

**Acceptance Scenarios**:

1. **Given** an 8-measure piano score with notes in both treble and bass clefs, **When** new renderer draws StaffGroup, **Then** both staves appear with vertical separation matching layout engine's staff_lines[0].y_position difference
2. **Given** layout engine computes StaffGroup with bracket_type = Brace, **When** new renderer draws staff group, **Then** piano brace symbol is drawn connecting leftmost edges of both staves
3. **Given** simultaneous notes in treble and bass (same tick), **When** new renderer draws glyphs, **Then** both noteheads have identical x-positions (vertical alignment from layout engine)

---

### User Story 4 - Performance Validation (60fps Scrolling) (Priority: P2)

Musicians scroll through long scores during practice and performance. The new renderer must maintain 60fps (16ms frame budget) by leveraging layout engine's system virtualization to render only visible content.

**Why this priority**: Essential for good user experience with long scores. Without virtualization, rendering degrades to <30fps with 100+ measure scores.

**Independent Test**: Render 100-measure score, scroll viewport continuously, measure frame rate using browser DevTools Performance tab, verify sustained 60fps during scrolling.

**Acceptance Scenarios**:

1. **Given** a 100-measure score with 40 systems, **When** user scrolls viewport showing measures 50-55, **Then** renderer only draws 2-3 visible systems (verified via performance profiling showing <50 draw calls)
2. **Given** viewport intersection with layout engine's system bounding boxes, **When** renderer queries visible systems using getVisibleSystems(), **Then** query completes in <1ms (O(1) with binary search)
3. **Given** continuous scrolling at 60fps, **When** rendering new systems as they enter viewport, **Then** frame time remains <16ms per frame (no dropped frames)

---

### Edge Cases

- What happens when layout engine produces system with single oversized measure (>800 logical units)? *[Renderer should render full system width, enable horizontal scroll if needed]*
- How does renderer handle empty measures (whole rests) from layout engine? *[Draw whole rest glyph at computed position, staff lines extend full measure width]*
- What happens when glyph bounding box extends outside system boundary (e.g., dynamics far below staff)? *[Increase system bounding box to include all glyphs, document as layout engine enhancement needed]*
- How does renderer handle missing glyphs in SMuFL font (invalid codepoint)? *[Render placeholder box with codepoint hex value, log warning to console]*
- What happens when logical-to-pixel conversion produces non-integer positions? *[Round to nearest pixel, accept ±0.5 pixel positioning variance]*
- How does renderer handle viewport entirely outside score bounds (scrolled past end)? *[Render nothing, no errors, frame budget maintained]*
- What happens when canvas context is unavailable (WebGL context lost)? *[Fall back to Canvas 2D, or show error message if Canvas 2D also unavailable]*

## Requirements *(mandatory)*

### Core Rendering

- **FR-001**: Renderer MUST accept GlobalLayout as primary input (not CompiledScore) for all rendering operations
- **FR-002**: Renderer MUST draw glyphs at exact (x, y) positions from GlobalLayout.systems[].staff_groups[].staves[].glyph_runs[].glyphs[].position
- **FR-003**: Renderer MUST convert logical units to pixels using formula: `pixels = logicalUnits * (pixelsPerSpace / layout.unitsPerSpace)` where pixelsPerSpace is configurable
- **FR-004**: Renderer MUST draw staff lines at y-positions from GlobalLayout.systems[].staff_groups[].staves[].staff_lines[].y_position (exactly 5 lines per staff)
- **FR-005**: Renderer MUST use SMuFL font for all musical symbols, rendering glyphs via codepoint from GlobalLayout.glyphs[].codepoint

### Layout Engine Integration

- **FR-006**: Renderer MUST use layout engine's bounding boxes (not compute its own) for all spatial queries and hit testing
- **FR-007**: Renderer MUST render GlyphRuns in batch mode - single draw call per run containing all glyphs with identical drawing properties
- **FR-008**: Renderer MUST respect layout engine's system breaks - no glyph repositioning or re-breaking allowed
- **FR-009**: Renderer MUST query visible systems using getVisibleSystems(layout, viewport) from layoutUtils before rendering
- **FR-010**: Renderer MUST not compute any layout logic - all positions, spacing, breaking determined solely by GlobalLayout

### Visual Correctness

- **FR-011**: Rendered glyph positions MUST match layout engine output within ±2 pixels (tolerance for sub-pixel rendering and coordinate conversion)
- **FR-012**: System boundaries in rendered output MUST match layout engine's system bounding boxes (x, y, width, height) exactly
- **FR-013**: Staff spacing (distance between staves in multi-staff groups) MUST match layout engine's staff_lines[0].y_position differences
- **FR-014**: Multi-staff brackets/braces MUST be drawn using layout.staff_groups[].bracket_type (Brace for piano, Bracket for choir, None for solo)
- **FR-015**: Vertical alignment of simultaneous notes MUST use layout engine's x-positions (same x for notes at same tick across staves)

### Performance

- **FR-016**: Renderer MUST render only visible systems determined by viewport intersection with layout.systems[].bounding_box
- **FR-017**: Rendering MUST maintain 60fps (≤16ms frame time) for 100-measure scores with 40 systems during continuous scrolling
- **FR-018**: Visible system query using layoutUtil's getVisibleSystems MUST complete in <1ms using O(log n) binary search on system bounding boxes
- **FR-019**: Renderer MUST leverage GlyphRun batching to reduce draw calls - target <10 draw calls per visible system (vs 100+ individual glyph draws)

### Comparison & Validation

- **FR-020**: Test harness MUST capture screenshots from both old renderer and new layout-driven renderer for same input score
- **FR-021**: Visual diff comparison MUST compute pixel difference percentage between old and new renderer outputs
- **FR-022**: Renderer MUST document discrepancies >5% pixel diff, categorized as: position errors, missing glyphs, spacing differences, or rendering bugs
- **FR-023**: Test suite MUST validate system break parity - new renderer breaks at same measures as old renderer (±1 system tolerance)

### Error Handling

- **FR-024**: Renderer MUST handle missing GlobalLayout gracefully - display error message, no rendering, no crashes
- **FR-025**: Renderer MUST handle invalid SMuFL codepoints by rendering placeholder box with hex value and logging warning
- **FR-026**: Renderer MUST handle viewport outside score bounds (scrolled past end) by rendering nothing without errors
- **FR-027**: Renderer MUST provide fallback if canvas context unavailable (e.g., WebGL context lost → fall back to Canvas 2D)

## Key Entities *(mandatory)*

### LayoutRenderer

**Purpose**: Main renderer class that draws musical notation using layout engine's computed positions

**Responsibilities**:
- Accept GlobalLayout and viewport as input
- Query visible systems using layoutUtils
- Draw staff lines, glyphs, brackets/braces at computed positions
- Convert logical units to pixels
- Batch draw glyphs via GlyphRuns

**Key Methods**:
- `render(layout: GlobalLayout, viewport: Viewport): void` - Main rendering entry point
- `renderSystem(system: System, offsetY: number): void` - Render single system
- `renderStaffGroup(group: StaffGroup, offsetY: number): void` - Render staves + bracket
- `renderGlyphRun(run: GlyphRun): void` - Batch draw glyphs
- `logicalToPixels(logical: number): number` - Coordinate conversion

### RenderConfig

**Purpose**: Configuration for renderer behavior (pixel scaling, fonts, colors)

**Key Fields**:
- `pixelsPerSpace: number` - How many pixels = 1 staff space (default: 10)
- `fontFamily: string` - SMuFL font name (default: "Bravura")
- `backgroundColor: string` - Canvas background color
- `staffLineColor: string` - Color for staff lines
- `glyphColor: string` - Default color for glyphs (can be overridden per GlyphRun)

### VisualComparison

**Purpose**: Test utility for comparing old renderer vs new renderer output

**Responsibilities**:
- Render same score with both renderers
- Capture canvas snapshots
- Compute pixel diff percentage
- Identify discrepancy regions (bounding boxes of differing areas)
- Generate visual diff report

**Key Methods**:
- `compareRenderers(score: CompiledScore): ComparisonResult` - Run comparison
- `captureSnapshot(canvas: HTMLCanvasElement): ImageData` - Get pixel data
- `computePixelDiff(img1: ImageData, img2: ImageData): number` - Calculate % difference
- `generateReport(result: ComparisonResult): string` - Create diff report

### Viewport

**Purpose**: Represents visible region of score (for virtualized rendering)

**Key Fields**:
- `x: number` - Left edge of viewport in pixels
- `y: number` - Top edge of viewport in pixels  
- `width: number` - Viewport width in pixels
- `height: number` - Viewport height in pixels

## Success Criteria *(mandatory)*

### Functional Completeness

- **SC-001**: New renderer renders single-voice 10-measure score with all noteheads, staff lines, and structural glyphs (clefs, key sigs) visible and correctly positioned
- **SC-002**: New renderer renders multi-staff 8-measure piano score with both treble and bass clefs, correct vertical spacing, and piano brace
- **SC-003**: Visual comparison shows <5% pixel difference between old and new renderer for 10-measure violin score (accounting for anti-aliasing)
- **SC-004**: System breaks in new renderer match old renderer output (same measure boundaries ±1 system)

### Performance Targets

- **SC-005**: New renderer maintains 60fps during scrolling of 100-measure score (verified via Chrome DevTools Performance profiling)
- **SC-006**: Visible system query completes in <1ms for 100-measure score with 40 systems
- **SC-007**: Rendering uses GlyphRun batching with <10 draw calls per visible system

### Visual Accuracy

- **SC-008**: Notehead positions differ by <2 pixels average between layout engine positions and rendered positions (after logical→pixel conversion)
- **SC-009**: Staff line positions match layout engine's staff_lines[].y_position exactly (0 pixel difference)
- **SC-010**: Multi-staff bracket/brace appears at correct position connecting staves (visual inspection passes)

## Assumptions *(optional)*

- Layout engine (Feature 016) is production-ready and accessible via WASM bindings
- SMuFL Bravura font is available in browser (loaded via @font-face)
- Canvas 2D API is available (fallback to Canvas 2D if WebGL unavailable)
- Viewport dimensions are provided by parent component managing scroll state
- Pixel density (pixelsPerSpace) is configurable but defaults to 10 pixels per staff space
- Visual comparison uses headless browser (Playwright) for deterministic screenshot capture
- Old renderer (current TypeScript implementation) remains available for comparison testing
- Feature 016's layoutUtils are fully implemented with 47 passing tests

## Out of Scope *(optional)*

- **Not Included**: Replacing/removing old renderer (that's a separate cleanup task after validation)
- **Not Included**: User interaction (clicking notes, selection) - focus is pure rendering
- **Not Included**: Playback cursor rendering - separate feature depending on layout engine
- **Not Included**: Editing capabilities (drag notes to reposition) - read-only renderer only
- **Not Included**: Print-quality rendering (300+ DPI) - focus is screen display (72-144 DPI)
- **Not Included**: Performance optimization beyond virtualization - GlyphRun batching is sufficient
- **Not Included**: Support for non-SMuFL fonts - Bravura only
- **Not Included**: Accessibility features (screen reader support for music notation) - future enhancement
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]
