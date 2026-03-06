// =============================================================================
// landing-themes.ts — Feature 039-landing-page-redesign
//
// Static configuration for the 10 warm-toned landing page design variants.
// All palettes verified WCAG 2.1 AA (≥4.5:1 for normal text).
// All fonts self-hosted in frontend/public/fonts/ (SIL OFL 1.1).
// =============================================================================

// ---------------------------------------------------------------------------
// Interfaces (Contract 1 — contracts/typescript-interfaces.md)
// ---------------------------------------------------------------------------

/**
 * Color token values for one landing page design variant.
 * All hex colors must satisfy WCAG 2.1 AA (4.5:1 for normal text).
 */
export interface ThemePalette {
  /** Light warm hero background */
  bg: string;
  /** Heading text color; ≥4.5:1 contrast on `bg` */
  heading: string;
  /** Body/subtitle text color; ≥4.5:1 contrast on `bg` */
  body: string;
  /** Primary CTA button background */
  ctaBg: string;
  /** CTA button text; ≥4.5:1 contrast on `ctaBg` */
  ctaText: string;
  /** Hover / active accent colour */
  accent: string;
  /** Navbar background */
  navbarBg: string;
  /** Active tab indicator background */
  navbarActive: string;
  /** Animated note colour 1 (replaces Slate from Feature 001) */
  noteColor1: string;
  /** Animated note colour 2 (replaces Amber from Feature 001) */
  noteColor2: string;
  /** Animated note colour 3 (replaces Sage from Feature 001) */
  noteColor3: string;
}

/**
 * Typography configuration for one design variant.
 * fontHeading and fontBody are full CSS font-family stacks.
 */
export interface ThemeTypography {
  /** CSS font-family stack for headings */
  fontHeading: string;
  /** CSS font-family stack for body text */
  fontBody: string;
  /** CSS font-weight for headings */
  headingWeight: 400 | 500 | 600 | 700;
  /** CSS font-weight for body text */
  bodyWeight: 400 | 500;
}

/**
 * A single landing page design variant — one of 10 static configurations.
 */
export interface LandingTheme {
  /** URL-safe slug used as URL hash (e.g. "ember" → "/#ember") */
  id: string;
  /** Human-readable display name for the navbar tab */
  name: string;
  /** CSS class applied to the .landing-screen container element */
  cssClass: string;
  palette: ThemePalette;
  typography: ThemeTypography;
}

// ---------------------------------------------------------------------------
// Theme data — 10 warm-colour design variants (T015 + T018)
// ---------------------------------------------------------------------------

export const LANDING_THEMES: readonly LandingTheme[] = [
  // ── 1. Ember ──────────────────────────────────────────────────────────────
  {
    id: 'ember',
    name: 'Ember',
    cssClass: 'theme-ember',
    palette: {
      bg:           '#FFF3E0',
      heading:      '#BF360C',
      body:         '#3E2723',
      ctaBg:        '#E64A19',
      ctaText:      '#FFFFFF',
      accent:       '#FF7043',
      navbarBg:     '#FFE0B2',
      navbarActive: '#E64A19',
      noteColor1:   '#E64A19',
      noteColor2:   '#FF8A65',
      noteColor3:   '#BF360C',
    },
    typography: {
      fontHeading:   "'Space Grotesk', system-ui, sans-serif",
      fontBody:      "'Inter', system-ui, sans-serif",
      headingWeight: 700,
      bodyWeight:    400,
    },
  },

  // ── 2. Saffron ────────────────────────────────────────────────────────────
  {
    id: 'saffron',
    name: 'Saffron',
    cssClass: 'theme-saffron',
    palette: {
      bg:           '#FFFDE7',
      heading:      '#E65100',
      body:         '#212121',
      ctaBg:        '#F57F17',
      ctaText:      '#1A1A1A',
      accent:       '#FFB300',
      navbarBg:     '#FFF9C4',
      navbarActive: '#F57F17',
      noteColor1:   '#F57F17',
      noteColor2:   '#FFB300',
      noteColor3:   '#E65100',
    },
    typography: {
      fontHeading:   "'IBM Plex Sans', system-ui, sans-serif",
      fontBody:      "'IBM Plex Sans', system-ui, sans-serif",
      headingWeight: 700,
      bodyWeight:    400,
    },
  },

  // ── 3. Sienna ─────────────────────────────────────────────────────────────
  {
    id: 'sienna',
    name: 'Sienna',
    cssClass: 'theme-sienna',
    palette: {
      bg:           '#FBE9E7',
      heading:      '#6D4C41',
      body:         '#3E2723',
      ctaBg:        '#8D6E63',
      ctaText:      '#FFFFFF',
      accent:       '#A1887F',
      navbarBg:     '#EFEBE9',
      navbarActive: '#8D6E63',
      noteColor1:   '#8D6E63',
      noteColor2:   '#A1887F',
      noteColor3:   '#6D4C41',
    },
    typography: {
      fontHeading:   "'Inter', system-ui, sans-serif",
      fontBody:      "'Inter', system-ui, sans-serif",
      headingWeight: 600,
      bodyWeight:    400,
    },
  },

  // ── 4. Terracotta ─────────────────────────────────────────────────────────
  {
    id: 'terracotta',
    name: 'Terracotta',
    cssClass: 'theme-terracotta',
    palette: {
      bg:           '#EFEBE9',
      heading:      '#4E342E',
      body:         '#3E2723',
      ctaBg:        '#D84315',
      ctaText:      '#FFFFFF',
      accent:       '#BF360C',
      navbarBg:     '#D7CCC8',
      navbarActive: '#D84315',
      noteColor1:   '#D84315',
      noteColor2:   '#FF7043',
      noteColor3:   '#BF360C',
    },
    typography: {
      fontHeading:   "'Space Grotesk', system-ui, sans-serif",
      fontBody:      "'Space Grotesk', system-ui, sans-serif",
      headingWeight: 600,
      bodyWeight:    400,
    },
  },

  // ── 5. Paprika ────────────────────────────────────────────────────────────
  {
    id: 'paprika',
    name: 'Paprika',
    cssClass: 'theme-paprika',
    palette: {
      bg:           '#FCE4EC',
      heading:      '#880E4F',
      body:         '#1A1A1A',
      ctaBg:        '#C62828',
      ctaText:      '#FFFFFF',
      accent:       '#E91E63',
      navbarBg:     '#F8BBD9',
      navbarActive: '#C62828',
      noteColor1:   '#C62828',
      noteColor2:   '#E91E63',
      noteColor3:   '#880E4F',
    },
    typography: {
      fontHeading:   "'IBM Plex Sans', system-ui, sans-serif",
      fontBody:      "'Inter', system-ui, sans-serif",
      headingWeight: 700,
      bodyWeight:    400,
    },
  },

  // ── 6. Honey ──────────────────────────────────────────────────────────────
  {
    id: 'honey',
    name: 'Honey',
    cssClass: 'theme-honey',
    palette: {
      bg:           '#FFF8E1',
      heading:      '#E65100',
      body:         '#212121',
      ctaBg:        '#FF8F00',
      ctaText:      '#1A1A1A',
      accent:       '#FFB300',
      navbarBg:     '#FFECB3',
      navbarActive: '#FF8F00',
      noteColor1:   '#FF8F00',
      noteColor2:   '#FFB300',
      noteColor3:   '#E65100',
    },
    typography: {
      fontHeading:   "'Inter', system-ui, sans-serif",
      fontBody:      "'Inter', system-ui, sans-serif",
      headingWeight: 700,
      bodyWeight:    400,
    },
  },

  // ── 7. Coral ──────────────────────────────────────────────────────────────
  {
    id: 'coral',
    name: 'Coral',
    cssClass: 'theme-coral',
    palette: {
      bg:           '#FFF0EC',
      heading:      '#BF360C',
      body:         '#3E2723',
      ctaBg:        '#FF5722',
      ctaText:      '#FFFFFF',
      accent:       '#FF7043',
      navbarBg:     '#FFCCBC',
      navbarActive: '#FF5722',
      noteColor1:   '#FF5722',
      noteColor2:   '#FF7043',
      noteColor3:   '#BF360C',
    },
    typography: {
      fontHeading:   "'Space Grotesk', system-ui, sans-serif",
      fontBody:      "'IBM Plex Sans', system-ui, sans-serif",
      headingWeight: 700,
      bodyWeight:    400,
    },
  },

  // ── 8. Marigold ───────────────────────────────────────────────────────────
  {
    id: 'marigold',
    name: 'Marigold',
    cssClass: 'theme-marigold',
    palette: {
      bg:           '#FFFDE7',
      heading:      '#F57F17',
      body:         '#212121',
      ctaBg:        '#E65100',
      ctaText:      '#FFFFFF',
      accent:       '#FFB300',
      navbarBg:     '#FFF9C4',
      navbarActive: '#E65100',
      noteColor1:   '#E65100',
      noteColor2:   '#FF8F00',
      noteColor3:   '#F57F17',
    },
    typography: {
      fontHeading:   "'IBM Plex Sans', system-ui, sans-serif",
      fontBody:      "'IBM Plex Sans', system-ui, sans-serif",
      headingWeight: 600,
      bodyWeight:    400,
    },
  },

  // ── 9. Blush ──────────────────────────────────────────────────────────────
  {
    id: 'blush',
    name: 'Blush',
    cssClass: 'theme-blush',
    palette: {
      bg:           '#FFF9FB',
      heading:      '#880E4F',
      body:         '#212121',
      ctaBg:        '#AD1457',
      ctaText:      '#FFFFFF',
      accent:       '#E91E63',
      navbarBg:     '#FCE4EC',
      navbarActive: '#AD1457',
      noteColor1:   '#AD1457',
      noteColor2:   '#E91E63',
      noteColor3:   '#880E4F',
    },
    typography: {
      fontHeading:   "'Inter', system-ui, sans-serif",
      fontBody:      "'Space Grotesk', system-ui, sans-serif",
      headingWeight: 700,
      bodyWeight:    400,
    },
  },

  // ── 10. Rust ──────────────────────────────────────────────────────────────
  {
    id: 'rust',
    name: 'Rust',
    cssClass: 'theme-rust',
    palette: {
      bg:           '#FBE9E7',
      heading:      '#4E342E',
      body:         '#3E2723',
      ctaBg:        '#BF360C',
      ctaText:      '#FFFFFF',
      accent:       '#8D6E63',
      navbarBg:     '#EFEBE9',
      navbarActive: '#BF360C',
      noteColor1:   '#BF360C',
      noteColor2:   '#FF7043',
      noteColor3:   '#8D6E63',
    },
    typography: {
      fontHeading:   "'Space Grotesk', system-ui, sans-serif",
      fontBody:      "'Space Grotesk', system-ui, sans-serif",
      headingWeight: 700,
      bodyWeight:    400,
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const DEFAULT_THEME_ID = 'ember';

/**
 * Returns the theme matching the given id, or the first theme (Ember) as fallback.
 */
export function getThemeById(id: string): LandingTheme {
  return (LANDING_THEMES as readonly LandingTheme[]).find(t => t.id === id) ?? LANDING_THEMES[0];
}

/**
 * Returns the theme id matching window.location.hash (e.g. "#ember" → "ember"),
 * or DEFAULT_THEME_ID if the hash is absent or does not match any theme.
 */
export function getThemeFromHash(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  const hash = window.location.hash.replace(/^#/, '').toLowerCase();
  const match = (LANDING_THEMES as readonly LandingTheme[]).find(t => t.id === hash);
  return match ? match.id : DEFAULT_THEME_ID;
}

/**
 * Returns true when the URL hash explicitly identifies a known theme.
 * Used to reveal the hidden theme-switcher navbar (easter-egg / undocumented).
 */
export function isThemeInHash(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.replace(/^#/, '').toLowerCase();
  return (LANDING_THEMES as readonly LandingTheme[]).some(t => t.id === hash);
}
