# Data Model: Landing Page Redesign — Color & Typography Exploration

**Feature**: 039-landing-page-redesign  
**Date**: 2026-03-06  
**Phase**: 1 — Entity extraction from spec + research

---

## Entities

This feature is purely UI/CSS — there is no persistent data, no backend model, and no database schema. The only "data" is the in-memory state of the active design variant and the static configuration of the 10 themes.

---

### Entity: `LandingTheme`

Represents a single design variant's complete visual configuration. This is a static record — all 10 instances are defined as constants at build time.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (1–10 slug) | Unique identifier, URL-safe (e.g., `"ember"`) |
| `name` | `string` | Display name in navbar (e.g., `"Ember"`) |
| `cssClass` | `string` | CSS class applied to `.landing-screen` container (e.g., `"theme-ember"`) |
| `palette` | `ThemePalette` | Color token values |
| `typography` | `ThemeTypography` | Font family and weight configuration |

**Validation rules**:
- `id` MUST be unique across all 10 themes.
- `id` MUST match the URL hash used for deep linking (`/#ember` → theme with `id: "ember"`).
- `cssClass` MUST match the CSS class defined in `landing-themes.css`.

---

### Entity: `ThemePalette`

The warm color token set for one design variant.

| Field | CSS Token | Type | WCAG constraint |
|-------|-----------|------|-----------------|
| `bg` | `--ls-bg` | `string` (hex) | Light warm background |
| `heading` | `--ls-heading` | `string` (hex) | ≥4.5:1 contrast on `bg` |
| `body` | `--ls-body` | `string` (hex) | ≥4.5:1 contrast on `bg` |
| `ctaBg` | `--ls-cta-bg` | `string` (hex) | Saturated warm tone |
| `ctaText` | `--ls-cta-text` | `string` (hex) | ≥4.5:1 contrast on `ctaBg` |
| `accent` | `--ls-accent` | `string` (hex) | Hover / active states |
| `noteColor1` | `--ls-note-1` | `string` (hex) | First animated note color |
| `noteColor2` | `--ls-note-2` | `string` (hex) | Second animated note color |
| `noteColor3` | `--ls-note-3` | `string` (hex) | Third animated note color |
| `navbarBg` | `--ls-navbar-bg` | `string` (hex) | Navbar background |
| `navbarActive` | `--ls-navbar-active` | `string` (hex) | Active tab indicator |

**Validation rules**:
- All palette values MUST be valid CSS color hex strings.
- `heading` and `body` contrast against `bg` MUST be ≥4.5:1.
- `ctaText` contrast against `ctaBg` MUST be ≥4.5:1.
- All palette colors MUST be from the warm spectrum (hue angle 0°–60° or 330°–360°; browns/earth tones accepted).

---

### Entity: `ThemeTypography`

Font stack configuration for one design variant.

| Field | CSS Token | Type | Allowed values |
|-------|-----------|------|----------------|
| `headingFamily` | `--ls-font-heading` | `string` (CSS font stack) | Must start with one of: `'Inter'`, `'IBM Plex Sans'`, `'Space Grotesk'` |
| `bodyFamily` | `--ls-font-body` | `string` (CSS font stack) | Must start with one of: `'Inter'`, `'IBM Plex Sans'`, `'Space Grotesk'` |
| `headingWeight` | — | `400 \| 500 \| 600 \| 700` | Applied via CSS `font-weight` in theme class |
| `bodyWeight` | — | `400 \| 500` | Applied via CSS `font-weight` in theme class |

---

### Entity: `DesignNavbarState` (React component state)

The in-memory state held by the `DesignNavbar` parent component (or lifted to the nearest common ancestor).

| Field | Type | Description |
|-------|------|-------------|
| `activeThemeId` | `string` | The `id` of the currently active `LandingTheme`. Initialized from `window.location.hash` on mount; falls back to `"ember"` (Design 1) if hash is absent or invalid. |

**State transitions**:
- `mount` → read `window.location.hash` → set `activeThemeId` to matching theme `id` or default.
- `user clicks navbar tab` → update `activeThemeId`, update `window.location.hash`.
- `hashchange` event → update `activeThemeId` to match new hash (supports browser back/forward).

---

## Relationship Diagram

```text
LANDING_THEMES: LandingTheme[] (10 static constants)
  ├── id: string (slug / URL hash)
  ├── name: string (navbar display)
  ├── cssClass: string
  ├── palette: ThemePalette
  │     ├── bg, heading, body, ctaBg, ctaText
  │     ├── accent, navbarBg, navbarActive
  │     └── noteColor1, noteColor2, noteColor3
  └── typography: ThemeTypography
        ├── headingFamily, bodyFamily (CSS font stacks)
        └── headingWeight, bodyWeight

DesignNavbarState (React state)
  └── activeThemeId: string ──► selects one LandingTheme from LANDING_THEMES
                                └── cssClass applied to .landing-screen div
                                └── typography tokens drive font-family/weight
                                └── palette.noteColor* fed to LandingScreen animation
```

---

## Static Configuration (all 10 themes)

Defined in `frontend/src/themes/landing-themes.ts` (TypeScript constants) and `landing-themes.css` (CSS class definitions). See [research.md](research.md#r-003-10-wcag-21-aacompliant-warm-color-palettes) for full palette hex values.

| # | id | name | Heading font | Body font |
|---|----|----|-------------|-----------|
| 1 | `ember` | Ember | Space Grotesk Bold | Inter Regular |
| 2 | `saffron` | Saffron | IBM Plex Sans Bold | IBM Plex Sans Regular |
| 3 | `sienna` | Sienna | Inter SemiBold | Inter Regular |
| 4 | `terracotta` | Terracotta | Space Grotesk SemiBold | Space Grotesk Regular |
| 5 | `paprika` | Paprika | IBM Plex Sans Bold | Inter Regular |
| 6 | `honey` | Honey | Inter Bold | Inter Regular |
| 7 | `coral` | Coral | Space Grotesk Bold | IBM Plex Sans Regular |
| 8 | `marigold` | Marigold | IBM Plex Sans SemiBold | IBM Plex Sans Regular |
| 9 | `blush` | Blush | Inter Bold | Space Grotesk Regular |
| 10 | `rust` | Rust | Space Grotesk Bold | Space Grotesk Regular |
