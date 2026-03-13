# Feature Specification: PWA Hosting Service

**Feature Branch**: `001-pwa-hosting-service`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "Web Service to download the PWA. We need to analyze the best options to host the PWA and the current limits with Github Pages. We need to track the use of the PWA. We need to optimize the downloading size of the PWA."

## Clarifications

### Session 2026-03-12

- Q: Is migration from GitHub Pages already decided, or could the comparison conclude that staying is acceptable? → A: Conditional — the comparison could result in staying on GitHub Pages if it satisfies requirements.
- Q: Should analytics be self-hosted, SaaS, or embedded in the backend? → A: SaaS — privacy-first, no-cookie provider (free or low-cost tier, zero ops overhead).
- Q: What connection speed defines "standard mobile connection" for performance benchmarks? → A: Lighthouse "Slow 4G" throttle (10 Mbps down / 1 Mbps up / 35ms RTT).
- Q: Should analytics track install events only, or also every returning standalone session? → A: Both — install events (acquisition) and every standalone session (retention).
- Q: What is the initial asset size budget threshold enforced in CI? → A: 2 MB total initial transfer size (compressed), matching SC-005; CI fails if exceeded.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evaluate and Optimise PWA Hosting Platform (Priority: P1)

The Graditone team needs to evaluate whether GitHub Pages can sustainably host the PWA as the user base grows and identify its constraints (bandwidth caps, lack of custom response headers, no server-side control). Based on the evaluation, the team either confirms that GitHub Pages is adequate (possibly with workarounds) or migrates to a more capable platform. Either outcome is valid; the goal is a documented, conscious decision.

**Why this priority**: Without a reliable hosting platform that delivers necessary HTTP headers (e.g., `Cross-Origin-Embedder-Policy` for WASM) and handles growth, users experience slow loads, broken PWA installs, or service interruption. Resolving the platform question is a prerequisite for tracking and optimization work.

**Independent Test**: Can be fully tested by completing the platform evaluation, making a documented hosting decision, and verifying the chosen platform (whether GitHub Pages or an alternative) meets all installability and custom-header requirements. Delivers a stable, conscious hosting baseline.

**Acceptance Scenarios**:

1. **Given** the current GitHub Pages deployment, **When** a team member documents all encountered limits (bandwidth, header restrictions, build frequency), **Then** a written comparison exists covering at least GitHub Pages, Cloudflare Pages, Netlify, and Vercel for cost, bandwidth, custom headers, CDN quality, and CI/CD integration
2. **Given** the platform comparison, **When** the team selects a hosting platform (including potentially retaining GitHub Pages with enhancements), **Then** a recorded decision exists with rationale referencing the comparison criteria
3. **Given** a chosen hosting platform, **When** the PWA is deployed via automated CI/CD, **Then** the deployment succeeds in under 5 minutes from code merge to live URL
3. **Given** the new hosting platform, **When** a musician visits the URL on a tablet, **Then** the PWA passes all installability checks (HTTPS, web app manifest, service worker with `fetch` handler)
4. **Given** the new hosting platform, **When** the WASM music engine is loaded, **Then** it loads without cross-origin isolation errors and the app functions correctly
5. **Given** the new hosting platform, **When** monthly traffic exceeds the current GitHub Pages soft bandwidth limit, **Then** users continue to receive the app without degradation or service interruption

---

### User Story 2 - Track PWA Usage and Installs (Priority: P2)

The Graditone team needs visibility into how many users are downloading, installing, and actively using the PWA so they can make informed decisions about feature prioritization, hosting capacity, and growth.

**Why this priority**: Without usage data, there is no way to validate that optimizations and hosting changes produce real user impact. Tracking is foundational for data-driven decisions but does not block musicians from using the app today.

**Independent Test**: Can be fully tested by installing the PWA on a test device, navigating through core screens, then verifying that page views, install events, and session counts appear in the analytics dashboard within a reasonable time. Delivers actionable metrics about real user behavior.

**Acceptance Scenarios**:

1. **Given** a musician visits the PWA landing page, **When** the page loads, **Then** a page-view event is recorded without any personally identifiable information (PII) being stored
2. **Given** a musician accepts the browser install prompt, **When** the install completes, **Then** a PWA install event is captured and visible in the analytics dashboard
3. **Given** a musician opens the installed PWA from their home screen on any subsequent visit, **When** the app launches in standalone mode, **Then** each standalone launch is recorded as a separate session event (distinguishable from browser sessions), enabling retention measurement across the installed user base
4. **Given** usage data has been collected for at least 7 days, **When** the team views the analytics dashboard, **Then** they can see: daily active users, total installs, page views by section, and approximate geographic distribution
5. **Given** a musician with privacy-focused settings (e.g., "Do Not Track" enabled), **When** the app loads, **Then** no tracking events are fired and the app functions identically
6. **Given** the analytics solution, **When** it is evaluated, **Then** it must not require a cookie consent banner for usage in the EU (GDPR-compliant, privacy-first approach assumed)

---

### User Story 3 - Reduce PWA Initial Download Size (Priority: P3)

A musician on a tablet with a slow cellular connection downloads the PWA for the first time. The total initial payload (HTML, JS, CSS, fonts, WASM, icons) must be as small as possible so the app becomes interactive quickly without excessive data use.

**Why this priority**: Large download sizes discourage first-time users on mobile connections and increase hosting bandwidth costs. Optimization directly improves conversion from visit to active install. It is P3 because the app is already functional — this is a quality-of-experience improvement.

**Independent Test**: Can be fully tested by running a production build audit tool on the deployed URL, comparing the total transfer size and time-to-interactive metrics before and after each optimization, using a simulated throttled connection. Delivers a measurable reduction in the amount of data a new user must download.

**Acceptance Scenarios**:

1. **Given** the current production build, **When** a before-and-after audit is run, **Then** a baseline is established for total transfer size, largest assets, and number of network requests
2. **Given** the fonts serving strategy is reviewed, **When** font files are optimized (subsetting, format selection, lazy loading non-critical weights), **Then** font transfer size is reduced by at least 40% without visible degradation of text rendering
3. **Given** the WASM binary is reviewed, **When** compression (Brotli or equivalent) is enabled on the hosting platform, **Then** the compressed WASM transfer size is reduced by at least 50% compared to uncompressed delivery
4. **Given** the JavaScript bundle is reviewed, **When** code splitting and lazy loading are applied to non-critical paths, **Then** the initial JS bundle size required for first meaningful paint is reduced by at least 30%
5. **Given** all optimizations are applied, **When** the PWA is loaded on a simulated mid-range tablet under Lighthouse "Slow 4G" throttle conditions (10 Mbps down / 1 Mbps up / 35ms RTT), **Then** the app becomes interactive in under 5 seconds and the total initial transfer size is under 2MB

---

### Edge Cases

- What happens when GitHub Pages bandwidth limit is reached mid-month? → Users receive GitHub's default error page; the spec must define an alert threshold before this occurs
- What happens when the chosen hosting platform has an outage? → Musicians with the PWA installed can still use cached content offline (service worker); new visitors cannot reach the app
- What happens if tracking scripts are blocked by ad-blockers? → Data is silently missing for those users; dashboards must not alert on normal fluctuation, and the app must not degrade functionally
- What happens if the WASM binary grows significantly in future? → Compression and caching policies must be re-evaluated; streaming instantiation should be used to avoid blocking the main thread
- What happens if a hosting migration breaks the existing CNAME or service worker scope? → Existing installed PWAs may lose update capability; migration plan must include rollback steps and staged rollout

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Team MUST produce a documented comparison of at least 4 hosting platforms (GitHub Pages, Cloudflare Pages, Netlify, Vercel) covering: free-tier bandwidth, custom HTTP headers support, CDN edge locations, CI/CD integration, and GDPR compliance stance
- **FR-002**: Team MUST identify and document all current GitHub Pages limitations that affect the PWA (bandwidth, header restrictions, file size limits, deployment frequency caps, lack of server-side logic) and assess whether each limitation can be mitigated without migrating
- **FR-002b**: Team MUST record a hosting decision document stating the chosen platform (which may be GitHub Pages if requirements are satisfied) with rationale
- **FR-003**: The chosen hosting platform MUST support serving custom HTTP response headers (at minimum: `Cache-Control`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`) without requiring a paid tier
- **FR-004**: The deployment pipeline MUST automatically publish the PWA to the hosting platform on every merge to the main branch without manual intervention
- **FR-005**: System MUST collect PWA usage metrics using a SaaS privacy-first analytics provider, including: unique visitors, page views, install events (prompt accepted), and every standalone session launch (to measure both acquisition and ongoing retention) — without requiring self-hosted infrastructure
- **FR-006**: The chosen SaaS analytics provider MUST be GDPR-compliant by design: no cookies used for tracking, no PII collected, no consent banner required, and data anonymised at point of collection (e.g., Plausible, Fathom, or equivalent)
- **FR-007**: System MUST respect the browser's "Do Not Track" signal or equivalent browser privacy settings by disabling all analytics collection for those users
- **FR-008**: Analytics data MUST be accessible via a dashboard showing at minimum: daily/weekly active users, total installs, top pages, and geographic region (country-level only)
- **FR-009**: System MUST serve all static assets (JS, CSS, WASM, fonts) with compression (Brotli preferred, gzip as fallback) enabled at the hosting/CDN layer
- **FR-010**: Fonts MUST be subsetted to include only characters used in the application UI languages, eliminating unused glyph data
- **FR-011**: Non-critical JavaScript MUST be split into lazily-loaded chunks so only code required for the initial view is downloaded on first load
- **FR-012**: The WASM binary MUST be delivered with streaming instantiation enabled to avoid blocking the main thread during initial load
- **FR-013**: All optimizations MUST be validated with an automated build-time asset size budget check that fails the CI pipeline if the total compressed initial transfer size exceeds 2 MB, preventing future regressions

### Key Entities

- **Hosting Platform**: The service that serves the PWA static assets; defined by: bandwidth capacity, CDN coverage, custom header support, CI/CD integration, cost tier
- **Usage Event**: An anonymous record of a user interaction; types: page view, install (prompt accepted), standalone session launch; attributes: event type, timestamp, geographic region (country), PWA display mode — no PII. Standalone session events are recorded on every launch (not deduplicated) to enable retention analysis.
- **Asset Budget**: A defined upper limit for the total compressed initial transfer size (2 MB) enforced as a CI pipeline check; build fails automatically if the threshold is exceeded, preventing regressions
- **Deployment Pipeline**: The automated workflow that builds and publishes the PWA to the hosting platform on code change

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The hosting platform comparison document is completed and a recorded hosting decision (to stay on GitHub Pages or migrate) is made before any implementation work begins
- **SC-002**: The PWA is deployed to the chosen platform via automated CI/CD, with zero manual deployment steps required after initial setup
- **SC-003**: The deployed PWA passes all browser PWA installability audits with a score of 100% on standard checklist tools
- **SC-004**: Usage analytics data is visible in a dashboard within 24 hours of a musician's first visit, with no personal information stored
- **SC-005**: Total initial transfer size of the PWA (first visit, cold cache) is under 2MB on the production deployment
- **SC-006**: Time-to-interactive for the PWA on a simulated mid-range tablet under Lighthouse "Slow 4G" throttle (10 Mbps down / 1 Mbps up / 35ms RTT) is under 5 seconds
- **SC-007**: Font payload is reduced by at least 40% compared to the baseline measured before optimization
- **SC-008**: Compressed WASM transfer size is at least 50% smaller than the uncompressed binary size delivered prior to this feature
- **SC-009**: CI pipeline enforces an asset size budget and automatically fails builds that exceed it, preventing future regressions

## Assumptions

- The PWA is currently deployed to GitHub Pages and uses a CNAME for a custom domain
- Self-hosted fonts (~730 KB total across 4 weights × 3 families) represent the largest non-WASM asset and are the primary font optimization target
- The WASM music engine binary is the single largest individual asset and the highest-impact compression target
- A SaaS privacy-first analytics solution (e.g., Plausible Cloud, Fathom) is chosen over self-hosted or cookie-based solutions: GDPR-compliant by design, zero ops overhead, free or low-cost tier
- The project is open source and must prefer free-tier hosting unless budget is explicitly approved
- Existing installed PWAs on musicians' devices must not break during any hosting migration (service worker scope and update flow must be preserved)

