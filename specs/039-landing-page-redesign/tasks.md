# Tasks: Landing Page Redesign — Color & Typography Exploration

**Input**: Design documents from `/specs/039-landing-page-redesign/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tech Stack**: TypeScript 5.x · React 18 · CSS3 custom properties · Vite 5 · Vitest · Playwright  
**Approach**: CSS-themed React variants — one shared `LandingScreen` component, 10 `.theme-*` CSS classes, horizontally-scrollable `DesignNavbar`, self-hosted fonts.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no outstanding dependencies)
- **[Story]**: US1 Navbar · US2 Color Palettes · US3 Typography · US4 Structure · US5 Accessibility
- All paths relative to repository root

---

## Phase 1: Setup

**Purpose**: Download self-hosted font files and create new directories

- [X] T001 Download Inter woff2 files (Regular/400, Medium/500, SemiBold/600, Bold/700) from https://github.com/rsms/inter/releases into `frontend/public/fonts/` as `Inter-Regular.woff2`, `Inter-Medium.woff2`, `Inter-SemiBold.woff2`, `Inter-Bold.woff2`
- [X] T002 [P] Download IBM Plex Sans woff2 files (Regular/400, Medium/500, SemiBold/600, Bold/700) from https://github.com/IBM/plex/releases into `frontend/public/fonts/` as `IBMPlexSans-Regular.woff2`, `IBMPlexSans-Medium.woff2`, `IBMPlexSans-SemiBold.woff2`, `IBMPlexSans-Bold.woff2`
- [X] T003 [P] Download Space Grotesk woff2 files (Regular/400, Medium/500, SemiBold/600, Bold/700) from https://github.com/floriankarsten/space-grotesk/releases into `frontend/public/fonts/` as `SpaceGrotesk-Regular.woff2`, `SpaceGrotesk-Medium.woff2`, `SpaceGrotesk-SemiBold.woff2`, `SpaceGrotesk-Bold.woff2`
- [X] T004 [P] Create directory `frontend/src/themes/` for theme configuration files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user story phases depend on. Must complete before any story phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Add `@font-face` declarations for Inter (4 weights: 400/500/600/700), IBM Plex Sans (4 weights), and Space Grotesk (4 weights) to `frontend/src/index.css` — each with `font-display: swap`, source pointing to `/fonts/<FileName>.woff2`, and system sans-serif fallback stack; total 12 new declarations
- [X] T006 [P] Create `frontend/src/themes/landing-themes.ts` with TypeScript interfaces `ThemePalette`, `ThemeTypography`, `LandingTheme` (from `contracts/typescript-interfaces.md`), empty `LANDING_THEMES` array stub, exported `getThemeById(id)`, `getThemeFromHash()` helper, and `DEFAULT_THEME_ID = 'ember'` constant
- [X] T007 [P] Create `frontend/src/themes/landing-themes.css` as an empty skeleton file with a comment header documenting the 11 CSS custom property token names (`--ls-bg`, `--ls-heading`, `--ls-body`, `--ls-cta-bg`, `--ls-cta-text`, `--ls-accent`, `--ls-navbar-bg`, `--ls-navbar-active`, `--ls-note-1`, `--ls-note-2`, `--ls-note-3`) and placeholder `.theme-ember { }` through `.theme-rust { }` class blocks
- [X] T008 Extend `LandingScreenProps` interface in `frontend/src/components/LandingScreen.tsx` with optional `activeThemeId?: string` and `noteColors?: readonly [string, string, string]` props; apply `theme-${activeThemeId}` compound class to the root `.landing-screen` div when `activeThemeId` is provided; thread `noteColors` into the rAF animation loop so it overrides the hardcoded `NOTE_COLORS` constant when supplied — maintain full backwards-compatibility when props are absent
- [X] T009 Update `frontend/src/components/LandingScreen.css` to replace hardcoded background color `#f5f5f5` with `var(--ls-bg, #f5f5f5)` and wire the CTA button styles to use `var(--ls-cta-bg)` and `var(--ls-cta-text)` tokens; import `../themes/landing-themes.css` at the top of the file
- [X] T010 Add theme prop tests to `frontend/src/test/components/LandingScreen.test.tsx`: verify root div gains `theme-ember` class when `activeThemeId="ember"` is passed; verify absence of theme class when prop is omitted; verify `noteColors` prop passes through to animation (stub the rAF)

**Checkpoint**: Foundation complete — existing `LandingScreen` tests pass, component accepts theme props, font-face declarations loaded, theme CSS skeleton exists.

---

## Phase 3: User Story 1 — Browse Design Variants via Navbar (Priority: P1) 🎯 MVP

**Goal**: Stakeholder can open the app, see a persistent scrollable navbar listing all 10 warm-named designs, click any tab to switch instantly, and navigate back/forward via browser history. Each design is deep-linkable via URL hash.

**Independent Test**: Load `http://localhost:5173` — confirm navbar displays 10 named tabs. Click each tab — confirm active tab is highlighted and no full reload occurs. Resize to 375px — confirm tabs remain accessible via horizontal scroll. Open `http://localhost:5173/#saffron` directly — confirm Saffron variant loads with active tab highlighted.

### Tests for US1 (TDD — write tests FIRST, verify they FAIL before implementing)

- [X] T011 [US1] Create `frontend/src/test/components/DesignNavbar.test.tsx` with unit tests: (a) renders exactly 10 tab buttons; (b) button matching `activeThemeId` has `aria-selected="true"`; (c) clicking a non-active tab calls `onThemeChange` with correct `themeId`; (d) pressing Enter/Space on a focused tab calls `onThemeChange`; (e) component is accessible with `role="tablist"` wrapper and `role="tab"` buttons

### Implementation for US1

- [X] T012 [P] [US1] Implement `DesignNavbar` component in `frontend/src/components/DesignNavbar.tsx` using `DesignNavbarProps` interface from `contracts/typescript-interfaces.md`; render a `<nav role="tablist">` containing one `<button role="tab">` per theme; mark active with `aria-selected="true"` and `className="active"`; call `onThemeChange(theme.id)` on click; handle Enter/Space keyboard activation
- [X] T013 [P] [US1] Implement `frontend/src/components/DesignNavbar.css`: `position: sticky; top: 0; z-index: 10` wrapper; `display: flex; flex-direction: row; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none` strip; tab button base styles with padding, font-size, border-bottom; `.active` tab style with bold weight and `var(--ls-accent, #FF7043)` bottom border indicator; `@media (min-width: 601px)` to allow natural wrap or fixed row
- [X] T014 [US1] Add URL hash routing to `frontend/src/components/ScoreViewer.tsx` (the component that renders `LandingScreen`): (a) initialize `activeThemeId` state from `getThemeFromHash()` on mount; (b) update `window.location.hash` when user changes theme; (c) add `window` `hashchange` event listener to sync state on browser back/forward; (d) pass `activeThemeId`, `onThemeChange`, and computed `noteColors` from active theme down to `LandingScreen` and render `<DesignNavbar>` above `<LandingScreen>` when no score is loaded

**Checkpoint**: US1 independently testable. Navbar renders, tabs switch themes via CSS class, hash routing works. Color/font tokens may still be empty — that is expected at this point.

---

## Phase 4: User Story 2 — View 10 Distinct Warm-Color Design Variants (Priority: P1)

**Goal**: Each of the 10 named designs shows a visually distinct warm color palette on backgrounds, headings, buttons, and navbar. No two designs share the same primary+accent color combination.

**Independent Test**: Navigate through all 10 tabs — confirm each design has a different background color, heading color, and CTA button color. Confirm all colors are warm-toned (no blues/greens as primary).

### Implementation for US2

- [X] T015 [US2] Populate all 10 `palette` fields in `LANDING_THEMES` array in `frontend/src/themes/landing-themes.ts` using the hex values from `research.md#r-003`: Ember (#FFF3E0 / #BF360C / #E64A19), Saffron (#FFFDE7 / #E65100 / #F57F17), Sienna (#FBE9E7 / #6D4C41 / #8D6E63), Terracotta (#EFEBE9 / #4E342E / #D84315), Paprika (#FCE4EC / #880E4F / #C62828), Honey (#FFF8E1 / #E65100 / #FF8F00), Coral (#FFF0EC / #BF360C / #FF5722), Marigold (#FFFDE7 / #F57F17 / #E65100), Blush (#FFF9FB / #880E4F / #AD1457), Rust (#FBE9E7 / #4E342E / #BF360C) — including all 11 palette tokens per theme
- [X] T016 [P] [US2] Implement color CSS custom property tokens for all 10 `.theme-*` classes in `frontend/src/themes/landing-themes.css` — populate `--ls-bg`, `--ls-heading`, `--ls-body`, `--ls-cta-bg`, `--ls-cta-text`, `--ls-accent`, `--ls-navbar-bg`, `--ls-navbar-active`, `--ls-note-1`, `--ls-note-2`, `--ls-note-3` for each theme using values from T015
- [X] T017 [US2] Update `LandingScreen.css` to apply `--ls-heading` to H1/headline elements, `--ls-body` to subtitle/body text, `--ls-navbar-bg` to the navbar background, and `--ls-navbar-active` to the `.active` tab indicator in `DesignNavbar.css`

**Checkpoint**: US2 independently testable. Switching tabs produces visually distinct warm color palettes. Animated note cycling uses `noteColors` from active theme's palette.

---

## Phase 5: User Story 3 — Typography Variety Across Designs (Priority: P1)

**Goal**: Each design uses one of the three specified font families (Inter, IBM Plex Sans, Space Grotesk) for headings and body text, with varied weights and spacing, producing meaningfully different typographic feels across the 10 variants.

**Independent Test**: Switch between tabs — confirm heading font changes between designs (inspect in DevTools). Confirm at least 3 distinct heading/body pairings exist. Confirm body text is legible (≥16px, line-height ≥1.4).

### Implementation for US3

- [X] T018 [US3] Populate all 10 `typography` fields in `LANDING_THEMES` array in `frontend/src/themes/landing-themes.ts` per pairings from `research.md#r-003` and `data-model.md`: Ember (Space Grotesk Bold heading / Inter Regular body), Saffron (IBM Plex Sans Bold / IBM Plex Sans Regular), Sienna (Inter SemiBold / Inter Regular), Terracotta (Space Grotesk SemiBold / Space Grotesk Regular), Paprika (IBM Plex Sans Bold / Inter Regular), Honey (Inter Bold / Inter Regular), Coral (Space Grotesk Bold / IBM Plex Sans Regular), Marigold (IBM Plex Sans SemiBold / IBM Plex Sans Regular), Blush (Inter Bold / Space Grotesk Regular), Rust (Space Grotesk Bold / Space Grotesk Regular)
- [X] T019 [P] [US3] Add typography CSS custom property tokens (`--ls-font-heading`, `--ls-font-body`) to all 10 `.theme-*` classes in `frontend/src/themes/landing-themes.css` using the full fallback stacks from `research.md#r-001` (e.g., `'Space Grotesk', system-ui, sans-serif`); add `--ls-heading-weight` and `--ls-body-weight` tokens per theme
- [X] T020 [US3] Apply typography tokens in `frontend/src/components/LandingScreen.css`: set `font-family: var(--ls-font-heading)` and `font-weight: var(--ls-heading-weight, 700)` on the `.landing-headline` (or equivalent H1) element; set `font-family: var(--ls-font-body)` and `font-weight: var(--ls-body-weight, 400)` on body/subtitle text; ensure `line-height: 1.5` and `font-size: 1rem` (≥16px) minimum on body text; add `letter-spacing: -0.01em` to heading for modern feel

**Checkpoint**: US3 independently testable. Switching tabs shows different font families and weights for headings and body text. All 3 families represented across designs.

---

## Phase 6: User Story 4 — Consistent Landing Page Structure Across Variants (Priority: P2)

**Goal**: All 10 design variants contain the same structural sections (hero, headline, CTA buttons, animated musical note). The animated note uses each theme's `noteColor1/2/3` for its rotation cycle, preserving Feature 001 behavior.

**Independent Test**: Switch between Design 1 and Design 5 — confirm hero, headline, CTA buttons, and animated note are all present and structurally identical. Confirm the note animation runs and cycles through 3 warm colors matching the active theme.

### Implementation for US4

- [X] T021 [US4] In `frontend/src/components/ScoreViewer.tsx`, wire the active theme's `palette.noteColor1/2/3` into the `noteColors` prop of `LandingScreen`; extract them from the `LandingTheme` object returned by `getThemeById(activeThemeId)` so the note color cycle always reflects the current theme
- [X] T022 [P] [US4] Verify all existing tests in `frontend/src/test/components/LandingScreen.test.tsx` pass after the T008 modifications; fix any regressions (backwards-compatible: when `activeThemeId` is absent, `NOTE_COLORS` constant must still be used); confirm the component data-testid attribute is unchanged

**Checkpoint**: US4 independently testable. Hero + headline + CTA + animated note present on every variant. Note cycles warm colors matching the active theme.

---

## Phase 7: User Story 5 — Accessibility Compliance for All Variants (Priority: P2)

**Goal**: All 10 designs meet WCAG 2.1 AA contrast (4.5:1 text), keyboard navigation works through the navbar and CTAs, and focus indicators are visible.

**Independent Test**: Tab through the navbar with keyboard only — all 10 tabs reachable and activatable with Enter/Space, each showing a visible focus ring. Run DevTools contrast checker on heading/body text against background on each design — all pass 4.5:1.

### Implementation for US5

- [X] T023 [US5] Add keyboard event handler (`onKeyDown`) to tab `<button>` elements in `frontend/src/components/DesignNavbar.tsx` to handle Enter and Space activation; add `aria-label="Design variants"` to the `<nav>` wrapper; add `aria-label={theme.name}` to each tab button; verify T011 tests now pass
- [X] T024 [P] [US5] Add focus ring styles to `frontend/src/components/DesignNavbar.css`: `button:focus-visible { outline: 3px solid var(--ls-accent, #FF7043); outline-offset: 2px; border-radius: 4px; }` — ensure visible and high-contrast on warm backgrounds
- [X] T025 [P] [US5] Add `aria-hidden="true"` to the animated note glyph `span` in `frontend/src/components/LandingScreen.tsx` (decorative element; adds no semantic information); verify CTA buttons retain their existing accessible labels
- [X] T026 [US5] Validate WCAG 2.1 AA compliance for all 10 palettes: for each theme compute relative luminance of `--ls-body` vs `--ls-bg` and `--ls-cta-text` vs `--ls-cta-bg`; document pass/fail in a comment block at the top of `frontend/src/themes/landing-themes.css`; fix any non-compliant palette values (reference `research.md#r-003` for pre-verified hex pairs)

**Checkpoint**: US5 independently testable. Keyboard nav through all 10 tabs works. Focus rings visible. Contrast ratios documented and compliant.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Responsiveness, deep linking validation, edge cases, and documentation update.

- [X] T027 Add `max-width: 1440px; margin: 0 auto` constraint to the hero content container in `frontend/src/components/LandingScreen.css` to prevent infinite horizontal stretch on ultra-wide screens (>2560px)
- [X] T028 [P] Verify responsive layout at 375px viewport width: confirm `DesignNavbar` strip scrolls horizontally without content overflow; confirm `LandingScreen` hero fills viewport without horizontal scrollbar; fix any overflow in `frontend/src/components/DesignNavbar.css` or `LandingScreen.css`
- [X] T029 [P] Test all 10 deep links manually: open `/#ember`, `/#saffron`, `/#sienna`, `/#terracotta`, `/#paprika`, `/#honey`, `/#coral`, `/#marigold`, `/#blush`, `/#rust` — confirm each loads the correct theme with active tab highlighted; test unknown hash (`/#unknown`) falls back to Ember default
- [X] T030 Update `FEATURES.md` at repository root to document feature 039: "Landing Page Redesign — 10 warm-color themed design variants with navbar switcher, self-hosted Inter/IBM Plex Sans/Space Grotesk fonts, deep-linkable via URL hash"

---

## Dependencies

```
US1 (Navbar) ───────────────────────────────────────────────→ US4 (structure/note)
US2 (Color Palettes) ────────────────────────────────────────→ US4 (note colors)
US3 (Typography) ────────────────────────────────────────────→ Polish
US1 + US2 ───────────────────────────────────────────────────→ US5 (keyboard nav)

Phase 1 (Fonts) ────────────────────────────────────────────→ Phase 2 (font-face)
Phase 2 (Foundation) ───────────────────────────────────────→ All story phases
Phase 3 (US1) ──────────────────────────────────────────────→ Phase 4, 5, 6, 7
Phase 4 (US2) + Phase 5 (US3) ──────────────────────────────→ Phase 6 (US4)
Phase 6 (US4) + Phase 7 (US5) ──────────────────────────────→ Phase 8 (Polish)
```

**Story completion order** (priority-driven):
1. Phase 1 → Phase 2 (setup + foundation) — blocking
2. **Phase 3 (US1)** ← MVP: navbar renders and switches themes
3. **Phase 4 (US2)** ← all 10 color palettes visible
4. **Phase 5 (US3)** ← all 3 font families rendering with variety
5. Phase 6 (US4) ← animated note uses theme colors
6. Phase 7 (US5) ← accessibility complete
7. Phase 8 ← polish and docs

---

## Parallel Execution Examples

### Phase 1 (can all start together)
```
T001 Download Inter fonts
T002 Download IBM Plex Sans fonts   ← parallel with T001
T003 Download Space Grotesk fonts   ← parallel with T001, T002
T004 Create themes/ directory       ← parallel with T001–T003
```

### Phase 2 (after Phase 1 completes)
```
T005 @font-face in index.css
T006 landing-themes.ts interfaces   ← parallel with T005 (different file)
T007 landing-themes.css skeleton    ← parallel with T005, T006 (different file)
then: T008 LandingScreen.tsx mods  ← needs T006
then: T009 LandingScreen.css mods  ← needs T008
then: T010 LandingScreen.test.tsx  ← needs T008
```

### Phase 3 — US1 (after Phase 2 completes, TDD order)
```
T011 DesignNavbar.test.tsx (write tests first, verify RED)
then:
T012 DesignNavbar.tsx               ← parallel with T013 (different file)
T013 DesignNavbar.css               ← parallel with T012
then: T014 Hash routing in ScoreViewer.tsx
```

### Phase 4+5 — US2+US3 (after Phase 3 completes)
```
T015 LANDING_THEMES palette data in landing-themes.ts
T016 Color CSS tokens in landing-themes.css   ← parallel with T015 (different file)
then: T017 Wire --ls-heading/body in LandingScreen.css

T018 LANDING_THEMES typography data in landing-themes.ts
T019 Typography CSS tokens in landing-themes.css   ← parallel with T018 (different file)
then: T020 Apply typography tokens in LandingScreen.css
```

---

## Implementation Strategy

**MVP scope** (minimum to demonstrate value): Complete Phases 1 → 3 (T001–T014). This delivers the navbar with 10 switchable themes — even without real color palettes or fonts, the switching mechanism and structure are demonstrable.

**Incremental delivery**:
- Sprint 1: Phases 1–3 → navbar functional, themes switch (empty CSS classes)
- Sprint 2: Phases 4–5 → all 10 designs visually distinct with colors and typography
- Sprint 3: Phases 6–7 → animated note integrated, accessibility complete
- Sprint 4: Phase 8 → polish and stakeholder review ready
