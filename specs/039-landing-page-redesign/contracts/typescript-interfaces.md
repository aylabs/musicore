# TypeScript Contracts: Landing Page Redesign

**Feature**: 039-landing-page-redesign  
**Date**: 2026-03-06  
**Type**: Frontend TypeScript interface contracts between components

---

## Overview

This feature has no backend API and no WASM boundary. Contracts here define the TypeScript interfaces between:
1. The static theme configuration and the `DesignNavbar` + `LandingScreen` components.
2. The `DesignNavbar` component's public prop contract.
3. The modified `LandingScreen` component's extended prop contract.

---

## Contract 1: `LandingTheme` — Static Theme Configuration

**File**: `frontend/src/themes/landing-themes.ts`

```typescript
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
  /** CSS font-family stack for headings; first family must be one of the 3 spec families */
  fontHeading: string;
  /** CSS font-family stack for body text; first family must be one of the 3 spec families */
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
  /** URL-safe slug; used as URL hash (e.g., "ember" → "/#ember") */
  id: string;
  /** Human-readable display name for the navbar tab */
  name: string;
  /** CSS class applied to the .landing-screen container element */
  cssClass: string;
  palette: ThemePalette;
  typography: ThemeTypography;
}

/**
 * The complete ordered list of all 10 design variants.
 * Order determines navbar tab order (left to right).
 */
export declare const LANDING_THEMES: readonly LandingTheme[];

/**
 * Returns the theme matching the given id, or the first theme as fallback.
 */
export declare function getThemeById(id: string): LandingTheme;

/**
 * Returns the theme id that matches the current window.location.hash,
 * or the default theme id if the hash is absent or does not match any theme.
 */
export declare function getThemeFromHash(): string;

/** The default theme id shown when no hash is present */
export declare const DEFAULT_THEME_ID: string;
```

---

## Contract 2: `DesignNavbar` Component Props

**File**: `frontend/src/components/DesignNavbar.tsx`

```typescript
import type { LandingTheme } from '../themes/landing-themes';

export interface DesignNavbarProps {
  /** Ordered list of all 10 design variants (passed from parent) */
  themes: readonly LandingTheme[];
  /** The id of the currently active theme */
  activeThemeId: string;
  /** Called when the user selects a different design variant */
  onThemeChange: (themeId: string) => void;
}
```

**Behaviour contract**:
- MUST render exactly `themes.length` tab buttons.
- MUST mark the button whose `theme.id === activeThemeId` as the active tab (aria-selected="true", visible active style).
- MUST call `onThemeChange(theme.id)` when a tab button is pressed (click or keyboard Enter/Space).
- MUST NOT manage its own active state — it is a controlled component.
- MUST be keyboard navigable: Tab moves focus, Enter/Space activates.
- MUST render as a horizontally scrollable strip on viewports ≤600px wide.

---

## Contract 3: `LandingScreen` — Extended Props

**File**: `frontend/src/components/LandingScreen.tsx`

```typescript
export interface LandingScreenProps {
  // --- existing props (unchanged) ---
  onShowInstruments?: () => void;
  corePlugins?: Array<{ id: string; name: string; icon?: string }>;
  onLaunchPlugin?: (pluginId: string) => void;

  // --- new props (Feature 039) ---
  /**
   * The id of the active landing theme.
   * When provided, the component applies the corresponding CSS class
   * and uses the theme's note colour tokens for the animation cycle.
   * When absent, falls back to the original Feature 001 behaviour.
   */
  activeThemeId?: string;

  /**
   * Note colour cycle for the animated glyph.
   * Overrides the built-in NOTE_COLORS constant when provided.
   * Must be a tuple of exactly 3 CSS colour strings.
   */
  noteColors?: readonly [string, string, string];
}
```

**Behaviour contract**:
- When `activeThemeId` is provided, `className` of the root div MUST include the corresponding `theme-<id>` class alongside `landing-screen`.
- When `noteColors` is provided, the rAF colour cycle MUST use those 3 colours instead of the hardcoded `NOTE_COLORS` constant.
- When both are absent, behaviour is identical to the pre-Feature-039 implementation (backwards-compatible).

---

## Contract 4: URL Hash Deep Link

**Implicit contract** (no TypeScript type; runtime agreement between App/ScoreViewer and DesignNavbar).

- URL hash format: `/#<themeId>` (e.g., `/#ember`, `/#saffron`)
- `themeId` MUST be a valid `LandingTheme.id` from `LANDING_THEMES`.
- On mount: `DesignNavbar`'s parent reads `window.location.hash.slice(1)` and validates against `LANDING_THEMES`.
- On tab change: parent updates `window.location.hash` to `#${newThemeId}`.
- On browser back/forward: parent listens to `window` `hashchange` event and syncs `activeThemeId` state.
- Invalid/absent hash: falls back to `DEFAULT_THEME_ID` (`"ember"`).
