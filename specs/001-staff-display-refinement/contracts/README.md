# API Contracts

**Feature**: 001-staff-display-refinement  
**Status**: N/A

## Contract Changes

**This feature does not introduce or modify any API contracts.**

### Rationale

Staff Display Refinement is a frontend-only visual styling feature. It makes no changes to:
- Backend WASM module interfaces
- REST API endpoints (backend is legacy, not modified)
- TypeScript type definitions for data exchange
- Service contracts between frontend components

All changes are confined to:
- **Presentation components**: React TSX files (NotationRenderer)
- **Stylesheets**: CSS files (StaffGroup.css)
- **Configuration constants**: Frontend config.ts

No data flows across boundaries that would require contract validation.

### Component Interfaces (Internal Only)

The only "interface" changes are internal React component props - these are TypeScript-enforced at compile time, not runtime contracts:

**NotationRenderer.tsx** (no prop changes):
- Existing props remain unchanged
- Render logic adds inline `opacity` attributes to SVG elements
- No contract validation needed (internal implementation detail)

**StaffGroup Component** (no prop changes):
- Existing props remain unchanged  
- CSS styling changes only (margin-bottom reduction)
- No contract validation needed (visual styling)

### Related Documentation

- **Technical Design**: See [research.md](research.md) for implementation details
- **Data Model**: See [data-model.md](data-model.md) (also N/A)
