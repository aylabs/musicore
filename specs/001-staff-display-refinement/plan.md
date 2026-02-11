# Implementation Plan: Staff Display Refinement

**Branch**: `001-staff-display-refinement` | **Date**: 2026-02-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-staff-display-refinement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Improve tablet reading experience by adjusting staff visual presentation: reduce vertical spacing between staves by 25%, increase staff height by 20%, and lighten structural elements (clefs, staff lines,bar lines) using CSS opacity to enhance note prominence. Primary goal is maximizing visible measures on tablet screens while improving readability at music stand distance.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19  
**Primary Dependencies**: React (UI), Vitest (testing), Bravura font (SMuFL notation)  
**Storage**: N/A (visual presentation only)  
**Testing**: Vitest 4.0 (component tests), visual regression testing recommended  
**Target Platform**: Tablet devices (iPad, Surface, Android 10-12 inch screens), PWA in standalone mode
**Project Type**: Web application (frontend-only changes)  
**Performance Goals**: Maintain minimum 45fps scrolling (60fps target), no visual overlap between staves, 30% more measures visible on tablet viewport  
**Constraints**: Visual changes only (no domain logic changes), must work across light/dark color schemes, preserve all existing functionality (playback, auto-scroll, note highlighting)  
**Scale/Scope**: Single feature affecting ~5 files (NotationRenderer, StaffGroup CSS, config constants), ~200 lines of code changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Domain-Driven Design
**Status**: ✅ **PASS** (No domain model changes)

**Evaluation**: This feature modifies visual presentation only. No changes to domain entities (Score, Instrument, Staff, Voice, Note), value objects (Tick, Pitch, Clef), or business rules. The ubiquitous language remains unchanged. Staff spacing and sizing are UI concerns, not domain concepts.

### Principle II: Hexagonal Architecture  
**Status**: ✅ **PASS** (Presentation layer only)

**Evaluation**: Changes are confined to the presentation layer (React components, CSS, SVG rendering). No modifications to hexagonal core (music engine domain logic, ports, adapters). NotationRenderer and StaffGroup are presentation adapters that consume layout data from services - arch boundaries intact.

### Principle III: PWA Architecture
**Status**: ✅ **PASS** (Tablet-optimized enhancement)

**Evaluation**: Feature directly supports PWA tablet optimization goal. Larger staves and reduced spacing address tablet readability at music stand distance. No offline capability impact (purely CSS/SVG changes cached by service worker). Enhances tablet-native experience per constitution mandate.

### Principle IV: Precision & Fidelity
**Status**: ✅ **PASS** (Display only, no timing impact)

**Evaluation**: Visual presentation changes do not affect 960 PPQ timing calculations, note positioning algorithms, or MIDI tick arithmetic. Staff spacing/sizing are pixel-based display concerns independent of domain precision requirements. Layout engine's proportional spacing logic unchanged.

### Principle V: Test-First Development
**Status**: ✅ **PASS** (TDD workflow required)

**Evaluation**: Feature requires test-first approach: (1) Visual regression tests for opacity values, (2) Layout tests for spacing/sizing changes, (3) Performance tests for 45+ fps scrolling. Existing tests must pass after changes. Component tests will verify CSS properties and DOM structure.

**Overall Gate Status**: ✅ **ALL GATES PASS** - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-staff-display-refinement/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (N/A - visual feature only)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── checklists/
    └── requirements.md  # Requirements validation checklist
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── notation/
│   │   │   ├── NotationRenderer.tsx          # [MODIFY] Add opacity to staff lines, clefs, barlines
│   │   │   └── NotationRenderer.test.tsx     # [ADD] Tests for visual changes
│   │   └── stacked/
│   │       ├── StaffGroup.css                # [MODIFY] Reduce margin-bottom for staff spacing
│   │       └── StaffGroup.test.tsx           # [ADD] Tests for spacing changes
│   ├── types/
│   │   └── notation/
│   │       └── config.ts                     # [MODIFY] Increase staffSpace constant
│   └── services/
│       └── notation/
│           ├── NotationLayoutEngine.ts       # [VERIFY] Layout calculations still correct
│           └── NotationLayoutEngine.test.ts  # [UPDATE] Tests for new sizing
└── tests/
    └── visual/                                # [ADD] Visual regression tests (optional)
```

**Structure Decision**: Frontend-only changes targeting React PWA presentation layer. Core modifications in NotationRenderer (SVG opacity), StaffGroup.css (vertical spacing), and config.ts (staff sizing constant). Backend/ directory unchanged - no WASM/domain logic involved.

## Complexity Tracking

> No Constitution Check violations - this section is empty.

---

## Phase 1 Constitution Re-check

*Re-evaluation after design artifacts completed (research.md, data-model.md, quickstart.md, contracts/)*

### Principle I: Domain-Driven Design
**Status**: ✅ **PASS** (Confirmed post-design)

**Re-evaluation**: Design artifacts confirm zero domain model changes. Research.md documents purely visual CSS/SVG implementation. Data-model.md explicitly states "No changes to domain entities, value objects, or business rules." Domain layer untouched.

### Principle II: Hexagonal Architecture  
**Status**: ✅ **PASS** (Confirmed post-design)

**Re-evaluation**: Implementation plan confined to presentation adapters (NotationRenderer.tsx, StaffGroup.css). Research.md confirms changes to SVG opacity attributes and CSS margins only. No ports, no core domain modifications, no adapter logic changes. Hexagonal boundaries preserved.

### Principle III: PWA Architecture
**Status**: ✅ **PASS** (Confirmed post-design)

**Re-evaluation**: Design directly enhances PWA tablet experience. Quickstart.md includes tablet testing procedures (iPad, Surface, Android). Larger staves and reduced spacing optimize for 10-12 inch screens and music stand viewing distance (24-36 inches) per PWA tablet-first mandate. All changes client-side, fully offline-capable.

### Principle IV: Precision & Fidelity
**Status**: ✅ **PASS** (Confirmed post-design)

**Re-evaluation**: Research.md confirms staffSpace change is presentation-only (pixel sizing, not PPQ timing). NotationLayoutEngine tests will update expected pixel values but maintain 960 PPQ arithmetic integrity. No floating-point timing, no tick calculations modified. Musical precision unaffected.

### Principle V: Test-First Development
**Status**: ✅ **PASS** (Confirmed post-design)

**Re-evaluation**: Quickstart.md documents comprehensive testing approach: component tests (opacity values), layout tests (sizing calculations), performance tests (45+ fps scrolling), visual validation (tablet distance viewing). Test-first workflow maintained: write tests for opacity, verify failure, implement, verify pass.

**Overall Post-Phase 1 Gate Status**: ✅ **ALL GATES PASS** - Ready for implementation (Phase 2: /speckit.tasks)

---

## Planning Summary

**Feature**: Staff Display Refinement (001-staff-display-refinement)  
**Status**: ✅ **Planning Complete**  
**Branch**: `001-staff-display-refinement`

### Artifacts Generated
- ✅ [plan.md](plan.md) - This file (implementation plan)
- ✅ [research.md](research.md) - Phase 0 research (opacity implementation, spacing/sizing decisions)
- ✅ [data-model.md](data-model.md) - Phase 1 (N/A - visual feature only)
- ✅ [quickstart.md](quickstart.md) - Phase 1 (testing and validation guide)
- ✅ [contracts/README.md](contracts/README.md) - Phase 1 (N/A - frontend-only changes)

### Key Decisions
1. **Opacity Implementation**: Use inline SVG `opacity` attributes (0.55 for staff lines, 0.65 for clefs/bars, 1.0 for notes)
2. **Spacing Reduction**: CSS `margin-bottom` change (10px → 7.5px = 25% reduction)
3. **Staff Sizing**: `staffSpace` constant increase (10px → 12px = 20% staff height increase)
4. **Performance Priority**: Visual quality over strict 60fps (45fps minimum acceptable)

### Next Step
Run `/speckit.tasks` to generate task breakdown for implementation.
