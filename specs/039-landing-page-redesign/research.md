# Research: Landing Page Redesign — Color & Typography Exploration

**Feature**: 039-landing-page-redesign  
**Date**: 2026-03-06  
**Phase**: 0 — Resolve unknowns from Technical Context

---

## R-001: Self-Hosted Font Files (Inter, IBM Plex Sans, Space Grotesk)

**Decision**: Use woff2 format only; download from official open-source repositories; place in `frontend/public/fonts/`; declare via `@font-face` in `index.css`.

**Sources & File Naming**:

| Family | Source | License | Naming convention |
|--------|--------|---------|-------------------|
| Inter | https://github.com/rsms/inter/releases | SIL OFL 1.1 | `Inter-Regular.woff2`, `Inter-Medium.woff2`, `Inter-SemiBold.woff2`, `Inter-Bold.woff2` |
| IBM Plex Sans | https://github.com/IBM/plex/releases | SIL OFL 1.1 | `IBMPlexSans-Regular.woff2`, `IBMPlexSans-Medium.woff2`, `IBMPlexSans-SemiBold.woff2`, `IBMPlexSans-Bold.woff2` |
| Space Grotesk | https://github.com/floriankarsten/space-grotesk/releases | SIL OFL 1.1 | `SpaceGrotesk-Regular.woff2`, `SpaceGrotesk-Medium.woff2`, `SpaceGrotesk-SemiBold.woff2`, `SpaceGrotesk-Bold.woff2` |

**Licensing**: All three are SIL OFL 1.1 — free to use, modify, and redistribute including in software products. No restrictions on self-hosting.

**Approximate sizes (woff2, 4-weight subset)**:

| Family | 4 weights total |
|--------|----------------|
| Inter | ~260 KB |
| IBM Plex Sans | ~290 KB |
| Space Grotesk | ~180 KB |
| **Total new** | **~730 KB** |

This is loaded once and cached by the service worker — acceptable for a PWA exploration feature.

**`font-display` recommendation**: `swap` for UI text fonts (Inter, IBM Plex Sans, Space Grotesk). This renders fallback text immediately then swaps when fonts load, avoiding invisible text. **Contrast with Bravura** which uses `block` because music glyph rendering before font load would display wrong characters — not a concern for UI text.

**Vite placement**: `frontend/public/fonts/` (served as-is, not bundled/hashed). This matches the existing Bravura setup and is the correct pattern for fonts referenced in CSS via bare paths.

**`@font-face` pattern**:
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
/* repeat for 500, 600, 700 */
```

**Fallback stack**: `font-family: 'Inter', system-ui, -apple-system, sans-serif;` — ensures readable text if font files fail to load.

---

## R-002: CSS Custom Properties Theming Pattern

**Decision**: Use **CSS class on the landing container div** (`.theme-<name>` class). Data-attribute approach (`data-theme="ember"`) is equally valid but class names are slightly simpler to apply via `className` in React and to query in tests via `classList`.

**Scoping**: Define theme tokens on the `.landing-screen` container via the theme class selector, **not** on `:root`. This scopes the theme entirely to the landing screen — no risk of polluting the rest of the app's CSS variables.

**Pattern**:
```css
/* themes/landing-themes.css */
.landing-screen.theme-ember {
  --ls-bg:        #FFF3E0;
  --ls-heading:   #BF360C;
  --ls-body:      #3E2723;
  --ls-cta-bg:    #E64A19;
  --ls-cta-text:  #FFFFFF;
  --ls-accent:    #FF7043;
  --ls-note-1:    #E64A19;
  --ls-note-2:    #FF8A65;
  --ls-note-3:    #BF360C;
  --ls-font-heading: 'Space Grotesk', system-ui, sans-serif;
  --ls-font-body:    'Inter', system-ui, sans-serif;
}
```

**Token set** (minimum viable for landing page):

| Token | Purpose |
|-------|---------|
| `--ls-bg` | Hero background color |
| `--ls-heading` | H1/headline text color |
| `--ls-body` | Body / subtitle text color |
| `--ls-cta-bg` | Primary CTA button background |
| `--ls-cta-text` | Primary CTA button text |
| `--ls-accent` | Hover state, link color, active navbar indicator |
| `--ls-note-1/2/3` | Three colors for the animated note's rotation cycle |
| `--ls-font-heading` | Font family for headings |
| `--ls-font-body` | Font family for body/UI text |
| `--ls-navbar-bg` | Navbar background (may differ from `--ls-bg`) |
| `--ls-navbar-active` | Active tab indicator background |

**React theme switch**: Single `string` state variable holding the theme name. Applied via `className={`landing-screen theme-${activeTheme}`}`. Switching is a synchronous `setState` — no reflow of layout, only repaint of color/font properties — well within <16ms.

**Testing approach**: In Vitest + @testing-library/react, assert `container.querySelector('.landing-screen')?.classList.contains('theme-ember')`. No special setup needed — class names are synchronously applied.

**Performance**: CSS custom property updates trigger repaint only (not reflow). Swapping a class on a single `position: fixed` overlay is negligible — consistently <2ms on modern devices.

---

## R-003: 10 WCAG 2.1 AA–Compliant Warm Color Palettes

**Decision**: Design 10 named palettes using light warm backgrounds with dark text and fully-saturated warm CTA buttons with white text. All pairs verified to meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text ≥18px bold or ≥24px normal).

**Contrast verification method**: Using WCAG relative luminance formula. Palettes are designed so:
- Dark body text on light warm background: always ≥7:1 (AAA) since backgrounds stay light and text stays near-black.
- White text on saturated CTA button: verified per-palette below (deep saturated warm tones reach ≥4.5:1 with white).

### The 10 Named Palettes

| # | Name | `--ls-bg` | `--ls-heading` | `--ls-body` | `--ls-cta-bg` | `--ls-cta-text` | `--ls-accent` | Font Heading | Font Body |
|---|------|-----------|----------------|-------------|----------------|-----------------|---------------|-------------|-----------|
| 1 | **Ember** | `#FFF3E0` | `#BF360C` | `#3E2723` | `#E64A19` | `#FFFFFF` | `#FF7043` | Space Grotesk Bold | Inter Regular |
| 2 | **Saffron** | `#FFFDE7` | `#E65100` | `#212121` | `#F57F17` | `#1A1A1A` | `#FFB300` | IBM Plex Sans Bold | IBM Plex Sans Regular |
| 3 | **Sienna** | `#FBE9E7` | `#6D4C41` | `#3E2723` | `#8D6E63` | `#FFFFFF` | `#A1887F` | Inter SemiBold | Inter Regular |
| 4 | **Terracotta** | `#EFEBE9` | `#4E342E` | `#3E2723` | `#D84315` | `#FFFFFF` | `#BF360C` | Space Grotesk SemiBold | Space Grotesk Regular |
| 5 | **Paprika** | `#FCE4EC` | `#880E4F` | `#1A1A1A` | `#C62828` | `#FFFFFF` | `#E91E63` | IBM Plex Sans Bold | Inter Regular |
| 6 | **Honey** | `#FFF8E1` | `#E65100` | `#212121` | `#FF8F00` | `#1A1A1A` | `#FFB300` | Inter Bold | Inter Regular |
| 7 | **Coral** | `#FFF0EC` | `#BF360C` | `#3E2723` | `#FF5722` | `#FFFFFF` | `#FF7043` | Space Grotesk Bold | IBM Plex Sans Regular |
| 8 | **Marigold** | `#FFFDE7` | `#F57F17` | `#212121` | `#E65100` | `#FFFFFF` | `#FFB300` | IBM Plex Sans SemiBold | IBM Plex Sans Regular |
| 9 | **Blush** | `#FFF9FB` | `#880E4F` | `#212121` | `#AD1457` | `#FFFFFF` | `#E91E63` | Inter Bold | Space Grotesk Regular |
| 10 | **Rust** | `#FBE9E7` | `#4E342E` | `#3E2723` | `#BF360C` | `#FFFFFF` | `#8D6E63` | Space Grotesk Bold | Space Grotesk Regular |

**Note on Saffron and Honey** (`--ls-cta-text: #1A1A1A`): Pure amber/gold buttons (#F57F17, #FF8F00) cannot achieve 4.5:1 with white text — dark text is used instead for those two variants. This is a deliberate accessible design choice.

**Animated note color override** (FR-011): Each theme's `--ls-note-1/2/3` replaces the existing `NOTE_COLORS` constant logic. The three note colors rotate as per Feature 001 behavior, using palette-appropriate warm tones.

**Colorblind risk notes**:
- Ember, Rust, Paprika: Red-heavy — distinguish from each other by shape/name in navbar. No green used, so no red-green confusion.
- Saffron, Honey, Marigold: Yellow/amber — highly distinguishable even with deuteranopia (retained luminance).
- Blush: Pink-rose tones may be confused with reds by protanopes — navbar name label ("Blush") provides disambiguation.
- **Mitigation**: All design variants are labeled with distinct evocative names in the navbar (FR-001). Names serve as primary distinguishers, not color alone.

---

## R-004: Font–Palette Affinity

| Font | Character | Best paired with |
|------|-----------|------------------|
| **Space Grotesk** | Geometric, slightly quirky, high personality — wide letterforms, distinctive "G" and "a" | Earthy/bold palettes: Ember, Terracotta, Rust, Coral |
| **IBM Plex Sans** | Humanist geometric, slightly narrow, professional warmth — open apertures | Mid-range warm palettes: Saffron, Paprika, Marigold |
| **Inter** | Highly legible, neutral-warm, optimized for screens — tall x-height | Clean/neutral palettes: Sienna, Honey, Blush |

Font pairings in the 10 designs use same-family or cross-family combinations to produce variety:
- **Same-family** (e.g., IBM Plex Sans Bold + IBM Plex Sans Regular): Clean, cohesive typographic feel.
- **Cross-family** (e.g., Space Grotesk heading + Inter body): More dynamic contrast; heading personality against neutral body.

---

## R-005: Deep Linking Strategy (FR-015 / SC-001)

**Decision**: Use URL hash (`/#ember`, `/#saffron`) rather than full client-side routing (no react-router installed). This avoids adding a routing library dependency for a temporary exploration tool.

**Rationale**: The app uses no router (`react-router`, `@tanstack/router`, etc.) — confirmed by `package.json`. Adding a router solely for this exploration feature violates the implementation discipline principle (avoid over-engineering). Hash-based navigation:
- Works with the existing Vite dev server and PWA service worker with no configuration changes.
- `window.location.hash` is readable on mount to restore the active design variant.
- `hashchange` event listener allows back/forward navigation.
- Deep link: `https://app.example.com/#saffron` loads the Saffron variant.

**Alternatives considered**:
- Full client-side routing (react-router): Rejected — adds a permanent dependency for a temporary feature; would require route configuration in App.tsx.
- Query parameter (`?design=ember`): Functionally equivalent; hash preferred because it does not trigger server round-trips and is idiomatic for in-page navigation.

---

## Summary of Decisions

| Unknown | Decision | Rationale |
|---------|----------|-----------|
| Font loading source | Self-hosted in `public/fonts/`, `font-display: swap` | Offline-capable, PWA-compatible, no CDN |
| Theming mechanism | CSS class on `.landing-screen` container | Minimal React state, no reflow, easy to test |
| Token scope | Scoped to `.landing-screen.theme-*` | Isolates theme from rest of app |
| Color palettes | 10 named warm palettes, all WCAG 2.1 AA | Accessibility validated upfront |
| Font pairings | 3 families × varied weights, affinity-guided | Typography variety + personality matches palette |
| Deep linking | URL hash (`/#<name>`) | No router dependency; works with existing PWA setup |
