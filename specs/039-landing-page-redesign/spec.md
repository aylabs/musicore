# Feature Specification: Landing Page Redesign — Color & Typography Exploration

**Feature Branch**: `039-landing-page-redesign`  
**Created**: 2026-03-06  
**Status**: Draft  
**Input**: User description: "Landing page redesign focusing on colors and typography. Create 10 different designs using warm colors and typography families (Inter, IBM Plex Sans, Space Grotesk). All designs accessible via a navbar. Evolve one into the final election."

## Clarifications

### Session 2026-03-06

- Q: What is the implementation form for the 10 design variants? → A: CSS-themed React variants inside the existing frontend app — one shared `LandingScreen` component with 10 CSS theme classes (custom property tokens), living inside the existing React/Vite app.
- Q: How should the three font families (Inter, IBM Plex Sans, Space Grotesk) be loaded? → A: Self-hosted — font files downloaded and bundled with the frontend, served locally (no CDN dependency).
- Q: How is the final design variant selected after comparison? → A: External decision only — no in-app selection UI; stakeholders discuss and agree on a variant out-of-band (conversation, ticket, or screenshot review); the chosen design number is passed to the next feature.
- Q: What is the mobile navbar pattern for the 10 design links? → A: Horizontally scrollable single-row strip (scrollable tab bar) — no hamburger menu or dropdown.
- Q: How are the 10 design variants labeled in the navbar? → A: Evocative warm-tone names chosen at implementation time (e.g. "Ember", "Saffron", "Sienna", "Terracotta") — no numeric-only labels.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Design Variants via Navbar (Priority: P1)

A stakeholder (designer, product owner, or developer) opens the landing page and sees a persistent navigation bar at the top of the screen. The navbar displays links to 10 different landing page designs, each labeled clearly (e.g., "Design 1", "Design 2", …, "Design 10"). Clicking any link navigates to that design variant instantly, allowing quick comparison.

**Why this priority**: Without the ability to switch between designs, the entire comparison workflow is impossible. The navbar is the backbone of the feature — it enables all evaluation, discussion, and decision-making.

**Independent Test**: Can be fully tested by loading the app, verifying the navbar is visible on every design variant, and clicking each of the 10 links to confirm navigation works correctly.

**Acceptance Scenarios**:

1. **Given** the user opens the landing page, **When** the page loads, **Then** a navbar is displayed at the top with 10 links, each labeled with an evocative warm-tone name (e.g. "Ember", "Saffron", "Sienna") chosen to reflect the palette character of that variant.
2. **Given** the user is viewing the "Sienna" variant, **When** they click the "Ember" link in the navbar, **Then** the Ember variant is displayed and the navbar remains visible with "Ember" visually highlighted as the active item.
3. **Given** the user is on any design variant, **When** they look at the navbar, **Then** the currently active design is visually distinguished from the others (e.g., bold text, underline, or contrasting background).
4. **Given** the user resizes the browser to a mobile width, **When** they view the navbar, **Then** all 10 design links are accessible via a horizontally scrollable single-row strip (no hamburger menu or dropdown required).

---

### User Story 2 - View 10 Distinct Warm-Color Design Variants (Priority: P1)

A stakeholder navigates through the 10 design variants and sees that each one has a distinctly different warm color palette. Each design uses a unique combination of warm tones (reds, oranges, ambers, corals, terracottas, golds, warm yellows, warm pinks) for backgrounds, headings, buttons, and accents — creating a clearly distinguishable visual identity per variant.

**Why this priority**: The whole purpose of this feature is to explore different visual directions. If the designs don't look meaningfully different, the comparison exercise has no value.

**Independent Test**: Can be fully tested by navigating through all 10 designs and confirming that each uses a unique warm color palette that is visually distinct from all others.

**Acceptance Scenarios**:

1. **Given** the user views Design 1, **When** they navigate to Design 2, **Then** the color palette is visibly different (different primary, secondary, and accent warm colors).
2. **Given** the user compares all 10 designs, **When** they review the color schemes, **Then** no two designs share the same primary background-and-heading color combination.
3. **Given** the user views any design, **When** they examine the page, **Then** the color palette uses only warm tones (no cool blues, greens, or purples as primary colors).
4. **Given** the user views any design, **When** they check interactive elements (buttons, links, hover states), **Then** all interactive elements use colors from the same warm palette of that design.

---

### User Story 3 - Typography Variety Across Designs (Priority: P1)

A stakeholder sees that the 10 designs explore different typography combinations using the three specified font families: Inter, IBM Plex Sans, and Space Grotesk. Designs vary in which font is used for headings vs. body text, font weights, sizes, and letter-spacing — producing meaningfully different typographic feels.

**Why this priority**: Typography is the other core exploration axis alongside color. The designs must demonstrate enough variety in typographic treatment to inform a final decision.

**Independent Test**: Can be fully tested by inspecting each design and confirming that the font choices (heading font, body font, weights, sizes) vary across the 10 variants.

**Acceptance Scenarios**:

1. **Given** the user views any design, **When** they inspect the headings and body text, **Then** the fonts used are from the set {Inter, IBM Plex Sans, Space Grotesk}.
2. **Given** the user compares designs across the 10 variants, **When** they examine typography, **Then** at least 3 different heading/body font pairings are represented.
3. **Given** the user views a design with Space Grotesk headings, **When** they compare it with a design using Inter headings, **Then** the typographic character feels distinctly different (weight, spacing, proportions).
4. **Given** the user views any design, **When** they check text readability, **Then** body text is legible at standard reading distances with appropriate line-height and contrast.

---

### User Story 4 - Consistent Landing Page Structure Across Variants (Priority: P2)

Each of the 10 design variants retains the same structural sections as the existing landing page (hero area, headline/banner, call-to-action buttons, and the animated musical note from Feature 001). Only the visual presentation (colors, typography, spacing, button styles) differs between variants — not the content or layout structure.

**Why this priority**: Keeping layout consistent ensures that the comparison is purely about visual style. If layouts differ, it becomes impossible to isolate whether a preference is about color/type or about structure.

**Independent Test**: Can be fully tested by verifying that each variant contains the same set of content sections (hero, headline, CTA buttons, animated note) and that only visual styling changes.

**Acceptance Scenarios**:

1. **Given** the user views any of the 10 designs, **When** they examine the page structure, **Then** the same content sections are present: hero area, headline/banner text, primary call-to-action, and animated musical note.
2. **Given** the user switches between Design 1 and Design 5, **When** they compare the layouts, **Then** the structural placement of elements is identical; only colors, fonts, button styles, and spacing differ.
3. **Given** the user views the animated musical note on any variant, **When** the animation plays, **Then** the note animation from Feature 001 is preserved and works correctly, applying the variant's color palette to the note colors.

---

### User Story 5 - Accessibility Compliance for All Variants (Priority: P2)

Every design variant meets basic accessibility standards. Text has sufficient color contrast against backgrounds, interactive elements have visible focus indicators, the navbar is keyboard-navigable, and font sizes are readable. No warm color palette sacrifices legibility for aesthetics.

**Why this priority**: Any design ultimately chosen must be accessible. Validating this upfront avoids picking a design that would require significant rework later.

**Independent Test**: Can be fully tested by running contrast checks on text/background combinations in each design and verifying keyboard navigation through the navbar and CTAs.

**Acceptance Scenarios**:

1. **Given** the user views any design variant, **When** they check heading text against the background, **Then** the contrast ratio meets WCAG 2.1 AA (minimum 4.5:1 for normal text, 3:1 for large text).
2. **Given** the user navigates using only the keyboard, **When** they tab through the navbar links, **Then** each link receives a visible focus indicator and can be activated with Enter or Space.
3. **Given** the user views body text on any design, **When** they read the content, **Then** the font size is at least 16px equivalent and line-height is at least 1.4.

---

### Edge Cases

- What happens when a user accesses a design variant directly via URL (deep linking)? The correct design should load with the navbar showing the active state.
- How do designs behave on very wide screens (>2560px)? Content should remain centered with max-width constraints rather than stretching infinitely.
- How do designs render when web fonts fail to load? A system sans-serif fallback stack should ensure the page remains readable.
- What happens if the user's browser has forced high-contrast mode? The designs should degrade gracefully, maintaining structural readability.
- How do the warm color palettes appear to users with color vision deficiencies (deuteranopia, protanopia)? Red/green warm tones can be problematic — each palette should be tested against a colorblind simulation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a persistent top navbar on all 10 landing page design variants, with a link to each design labeled with an evocative warm-tone name; on mobile viewports the navbar renders as a horizontally scrollable single-row strip with no hamburger menu or dropdown.
- **FR-002**: System MUST render 10 visually distinct landing page designs, each with a unique warm color palette.
- **FR-003**: Each design MUST use fonts exclusively from the set: Inter, IBM Plex Sans, and Space Grotesk.
- **FR-004**: System MUST serve the three font families (Inter, IBM Plex Sans, Space Grotesk) as self-hosted font files bundled with the frontend build — no external CDN dependency at runtime.
- **FR-005**: Each design MUST maintain the same structural layout: hero area, headline/banner, call-to-action buttons, and animated musical note.
- **FR-006**: The navbar MUST visually indicate which design variant is currently active; the active variant's name label MUST be clearly distinguished (e.g. bold weight, underline, or contrasting background tab).
- **FR-007**: Navigating between designs MUST preserve the navbar position and not cause a full page reload; variant switching is achieved via client-side state (CSS theme class swap on a shared component), requiring no route change or page reload.
- **FR-008**: All text in every design MUST meet WCAG 2.1 AA color contrast requirements (4.5:1 normal text, 3:1 large text).
- **FR-009**: The navbar MUST be fully navigable via keyboard (Tab to move, Enter/Space to activate).
- **FR-010**: Each design MUST include a fallback font stack (system sans-serif) in case web fonts fail to load.
- **FR-011**: The animated musical note from Feature 001-landing-redesign MUST continue to function on every design variant, adapting its color cycle to the design's warm palette.
- **FR-012**: Each warm color palette MUST consist of at least 3 colors: a primary background tone, a heading/accent color, and a button/CTA color — all from the warm spectrum (reds, oranges, ambers, corals, golds, warm yellows, warm pinks, terracottas).
- **FR-013**: The 10 designs MUST explore varied typography treatments: different heading/body font pairings, weights (regular, medium, semibold, bold), and letter-spacing values across the set of 3 font families.
- **FR-014**: Designs MUST be responsive, rendering correctly on mobile (~375px), tablet (~768px), and desktop (~1440px) viewports.
- **FR-015**: Users MUST be able to access a specific design variant via a direct URL (deep link support).

### Key Entities

- **Design Variant**: A complete visual configuration of the landing page, defined by a unique warm color palette, font pairings, and typographic treatments. Each variant has a numeric identifier (1–10) and a unique evocative warm-tone name (e.g. "Ember", "Saffron", "Sienna", "Terracotta") assigned at implementation time.
- **Warm Color Palette**: A set of at least 3 warm colors (primary, accent, CTA) applied across one design variant. No cool hues (blue, green, purple) as primary colors.
- **Font Pairing**: A combination of heading font and body font, selected from {Inter, IBM Plex Sans, Space Grotesk}, along with weight and spacing parameters.
- **Navbar**: A persistent navigation component displayed across all variants, containing links to each design and indicating the active selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 10 design variants are accessible and navigable from the navbar within 1 click each.
- **SC-002**: Each of the 10 designs uses a unique warm color palette — no two share the same primary+accent color combination.
- **SC-003**: All 3 font families (Inter, IBM Plex Sans, Space Grotesk) are used across the 10 designs, with at least 3 distinct heading/body pairings.
- **SC-004**: 100% of text elements across all 10 designs pass WCAG 2.1 AA contrast checks.
- **SC-005**: A stakeholder can browse all 10 designs and identify a preferred direction in under 5 minutes; no in-app voting or selection mechanism is required.
- **SC-006**: All designs render correctly (no overflow, clipping, or broken layouts) on mobile (375px), tablet (768px), and desktop (1440px) viewports.
- **SC-007**: The animated musical note from Feature 001 functions correctly on every design variant.
- **SC-008**: Switching between design variants happens without full page reload (perceived instant transition).

## Assumptions

- The 10 design variants are implemented as CSS theme classes (using CSS custom properties) applied to a single shared `LandingScreen` component inside the existing React/Vite frontend app — not as separate HTML files, separate routes, or Storybook stories.
- The existing landing page structure from Feature 001-landing-redesign (hero, animated note, CTA buttons) serves as the baseline layout for all 10 variants.
- The 10 designs are an exploration tool — only one will be selected and evolved into the final production landing page in a subsequent feature.
- "Warm colors" encompasses the range: reds, oranges, ambers, corals, golds, warm yellows, warm pinks, and terracottas. Earth tones like warm browns are also acceptable.
- The animated musical note's three-color cycle (currently Slate/Amber/Sage) will be adapted per-variant to use colors from that variant's warm palette.
- The design selection process is entirely external to this feature — no in-app "vote", "pick", or "select" mechanism will be built. The chosen variant number is communicated out-of-band and passed as input to the subsequent production-landing feature.
- The navbar for switching between designs is a temporary exploratory tool and may not be part of the final production landing page.
- Font files (Inter, IBM Plex Sans, Space Grotesk) are downloaded and self-hosted inside the frontend package — no Google Fonts CDN or other external font CDN is used, keeping the feature compatible with the existing offline/PWA mode (Feature 025).
- Font loading performance is acceptable for exploration; optimization (e.g., font subsetting) can be addressed when the final design is chosen.

## Known Issues & Regression Tests *(if applicable)*

<!-- This section is intentionally empty at spec creation time. Issues will be documented here as they are discovered during implementation. -->

