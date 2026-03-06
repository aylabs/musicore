# Implementation Plan: Landing Page Redesign — Color & Typography Exploration

**Branch**: `039-landing-page-redesign` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/039-landing-page-redesign/spec.md`

## Summary

Implement 10 CSS-themed landing page design variants inside the existing React/Vite frontend, each using a unique warm color palette and a font pairing drawn from Inter, IBM Plex Sans, and Space Grotesk (all self-hosted). A persistent horizontally-scrollable navbar lets stakeholders switch between variants instantly (client-side CSS class swap on the shared `LandingScreen` component). The goal is visual exploration, not production deployment — one selected variant will be evolved in a follow-up feature.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, CSS3 (custom properties)  
**Primary Dependencies**: Vite 5 (bundler), React 18, @testing-library/react, Vitest (unit), Playwright (E2E)  
**Storage**: N/A (no persistence; theme state is React component state)  
**Testing**: Vitest (unit + component), Playwright (E2E)  
**Target Platform**: Tablet devices (iPad, Surface, Android) + desktop browsers; PWA (Chrome 57+, Safari 11+, Edge 16+)  
**Project Type**: Web (frontend-only change; no backend involved)  
**Performance Goals**: Instant theme switch (CSS class swap, <16ms); self-hosted font load on first paint only  
**Constraints**: Offline-capable (self-hosted fonts, no CDN); WCAG 2.1 AA contrast on all 10 variants; no Rust/WASM changes  
**Scale/Scope**: 10 design variants × 3 font families; pure CSS/React; no new routes or data model

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Domain-Driven Design | ✅ PASS | No music domain entities involved; purely UI/visual. No DDD violations possible. |
| II. Hexagonal Architecture | ✅ PASS | Frontend-only change; no backend ports/adapters touched. |
| III. PWA Architecture | ✅ PASS | Fonts are self-hosted (offline-capable). No CDN dependencies added. |
| IV. Precision & Fidelity | ✅ PASS | No timing or music data involved. |
| V. Test-First Development | ✅ PASS | Unit tests for `DesignNavbar` component and theme class application required before implementation. Contract: navbar must render 10 links and apply correct theme class on selection. |
| VI. Layout Engine Authority | ✅ PASS | No spatial coordinates, bounding boxes, or layout calculations in frontend code. CSS themes only affect color/font tokens. |
| VII. Regression Prevention | ✅ PASS | Existing `LandingScreen.test.tsx` suite must remain green. Any bug found during implementation requires a failing test first. |

**Gate result: PASS — no violations. Phase 0 may proceed.**

## Project Structure

### Documentation (this feature)

```text
specs/039-landing-page-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── public/
│   └── fonts/
│       ├── Bravura.woff2                 # existing
│       ├── Inter-Regular.woff2           # NEW — self-hosted Inter
│       ├── Inter-Medium.woff2
│       ├── Inter-SemiBold.woff2
│       ├── Inter-Bold.woff2
│       ├── IBMPlexSans-Regular.woff2     # NEW — self-hosted IBM Plex Sans
│       ├── IBMPlexSans-Medium.woff2
│       ├── IBMPlexSans-SemiBold.woff2
│       ├── IBMPlexSans-Bold.woff2
│       ├── SpaceGrotesk-Regular.woff2    # NEW — self-hosted Space Grotesk
│       ├── SpaceGrotesk-Medium.woff2
│       ├── SpaceGrotesk-SemiBold.woff2
│       └── SpaceGrotesk-Bold.woff2
├── src/
│   ├── components/
│   │   ├── LandingScreen.tsx             # MODIFY — accept `theme` prop
│   │   ├── LandingScreen.css             # MODIFY — add CSS custom property tokens
│   │   ├── DesignNavbar.tsx              # NEW — persistent 10-design switcher
│   │   └── DesignNavbar.css              # NEW — navbar styles + mobile scroll strip
│   ├── themes/
│   │   └── landing-themes.css            # NEW — 10 .theme-* CSS classes with custom properties
│   └── index.css                         # MODIFY — add @font-face declarations for 3 families
└── src/test/components/
    ├── LandingScreen.test.tsx             # MODIFY — add theme prop test cases
    └── DesignNavbar.test.tsx              # NEW — navbar unit tests (TDD)
```

**Structure Decision**: Web application (Option 2 — frontend-only). All changes confined to `frontend/`. No backend modifications. New files are limited to: `DesignNavbar.tsx/css`, `themes/landing-themes.css`. Modified files: `LandingScreen.tsx/css`, `index.css`, and `LandingScreen.test.tsx`.

## Complexity Tracking

*No constitution violations — this section is not required.*
