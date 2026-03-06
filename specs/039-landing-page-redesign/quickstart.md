# Quickstart: Landing Page Redesign — Color & Typography Exploration

**Feature**: 039-landing-page-redesign  
**Date**: 2026-03-06

---

## What Was Built

10 visual landing page design variants, switchable via a persistent scrollable navbar. Each variant applies a unique warm color palette and font pairing (Inter, IBM Plex Sans, or Space Grotesk) to the existing `LandingScreen` component via CSS custom property tokens. No backend changes. Deep-linkable via URL hash.

---

## Running Locally

```bash
# from repo root
cd frontend
npm install      # if first run or after font files added
npm run dev
```

Open http://localhost:5173 — the app loads with the first design ("Ember") active. Use the navbar to switch variants.

**Deep link a specific design**:
```
http://localhost:5173/#saffron
http://localhost:5173/#sienna
```

---

## The 10 Designs at a Glance

| # | URL hash | Name | Heading font | Bg / CTA |
|---|----------|------|-------------|----------|
| 1 | `#ember` | Ember | Space Grotesk | Cream / Deep Orange |
| 2 | `#saffron` | Saffron | IBM Plex Sans | Warm Yellow / Amber |
| 3 | `#sienna` | Sienna | Inter | Blush Rose / Brown |
| 4 | `#terracotta` | Terracotta | Space Grotesk | Greige / Brick Red |
| 5 | `#paprika` | Paprika | IBM Plex Sans | Pink / Crimson |
| 6 | `#honey` | Honey | Inter | Cream / Amber |
| 7 | `#coral` | Coral | Space Grotesk | Peach / Coral Red |
| 8 | `#marigold` | Marigold | IBM Plex Sans | Light Yellow / Deep Orange |
| 9 | `#blush` | Blush | Inter | White Pink / Magenta |
| 10 | `#rust` | Rust | Space Grotesk | Stone / Rust Red |

---

## Key Files Changed

| File | Change |
|------|--------|
| `frontend/public/fonts/Inter-*.woff2` | New — self-hosted Inter (4 weights) |
| `frontend/public/fonts/IBMPlexSans-*.woff2` | New — self-hosted IBM Plex Sans (4 weights) |
| `frontend/public/fonts/SpaceGrotesk-*.woff2` | New — self-hosted Space Grotesk (4 weights) |
| `frontend/src/index.css` | Added `@font-face` declarations for 3 families |
| `frontend/src/themes/landing-themes.ts` | New — `LANDING_THEMES` constant array, `getThemeById`, `getThemeFromHash` |
| `frontend/src/themes/landing-themes.css` | New — 10 `.theme-*` CSS classes with custom property tokens |
| `frontend/src/components/DesignNavbar.tsx` | New — scrollable tab bar switching between variants |
| `frontend/src/components/DesignNavbar.css` | New — navbar styles + mobile scroll strip |
| `frontend/src/components/LandingScreen.tsx` | Modified — add `activeThemeId` + `noteColors` props |
| `frontend/src/components/LandingScreen.css` | Modified — wire up `--ls-*` token usage |
| `frontend/src/test/components/DesignNavbar.test.tsx` | New — unit tests (TDD) |
| `frontend/src/test/components/LandingScreen.test.tsx` | Modified — add theme prop tests |

---

## Running Tests

```bash
cd frontend
npm run test                  # Vitest unit + component tests
npm run test:e2e              # Playwright E2E (requires dev server running)
```

Ensure all existing `LandingScreen.test.tsx` tests still pass (regression requirement).

---

## Selecting a Design

Browse the 10 designs and share feedback in the follow-up ticket. The chosen variant `id` (e.g., `"coral"`) becomes the input for the production landing page feature.

---

## Accessibility Checks

All 10 palettes are designed to meet WCAG 2.1 AA. To verify manually:
- Use Chrome DevTools → Accessibility → Contrast Ratio on heading and body text.
- Or use https://webaim.org/resources/contrastchecker/ with hex values from [research.md](research.md#r-003).

Keyboard navigation: Tab through the navbar, activate with Enter/Space. Each tab shows a visible focus ring.
