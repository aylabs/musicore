# Feature Specification: Android App Distribution via Google Play

**Feature Branch**: `040-android-app-pwa`  
**Created**: 2026-03-08  
**Status**: Draft  
**Input**: User description: "Create Android App from PWA - It is time to create the Android App from the PWA and upload it to Google Play so it can be installed as a normal App."

> **Note on naming**: The workspace folder is named `musicore` but the published app product name is **Graditone** (as defined in the PWA manifest and the `graditone/graditone` GitHub repository). All Play Store references in this specification use the correct product name **Graditone**.

## Overview

Musicore is a project codebase whose published app is **Graditone**. The Graditone app is currently distributed as a Progressive Web App (PWA). This feature packages the existing PWA into a proper Android application and publishes it on the Google Play Store, so that users can discover, install, and use Graditone exactly like any other Android app — with a home-screen icon, full-screen experience, and no visible browser chrome.

## Clarifications

### Session 2026-03-08

- Q: Does Musicore collect or transmit any personal user data? → A: No personal data collected or transmitted.
- Q: Should the Android app include crash reporting or error monitoring? → A: Anonymous crash reporting only (no PII).
- Q: Which Google Play release track strategy should be used for the first publish? → A: Internal testing → Closed testing (beta) → Production staged rollout.
- Q: Should the Android app build and publish process be automated or manual? → A: Automated build (CI generates signed bundle on tag/merge), manual publish approval via Play Console.
- Q: What is the intended target audience / content rating for the Play Store listing? → A: General audience — all ages, no content restrictions (PEGI 3 / Everyone).

## Assumptions

- The existing PWA already meets the technical baseline required for Play Store packaging (HTTPS, valid Web App Manifest, Service Worker).
- The production PWA URL is stable and will remain accessible after Play Store publishing.
- The team has (or will create) a Google Play Developer account.
- App icons, name, and short description already exist or will be derived from current PWA metadata.
- Minimum supported Android version: Android 9.0 (API level 28), covering over 90% of active Android devices as of 2026.
- Annual Google Play Developer account fee is accepted as a business cost.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install App from Google Play (Priority: P1)

A new user discovers Musicore on the Google Play Store, installs it, and opens it on their Android device. The app launches full-screen, showing the same familiar interface as the web version, but without any browser address bar or navigation controls.

**Why this priority**: This is the core deliverable — without a published, installable app there is no feature. Every other story depends on this being in place.

**Independent Test**: Can be fully tested by searching "Musicore" on the Google Play Store, installing the app, and launching it — delivers a standalone installable app experience.

**Acceptance Scenarios**:

1. **Given** a user searches "Graditone" on the Google Play Store, **When** they find the listing, **Then** they see correct app name, icon, screenshots, and description.
2. **Given** a user taps "Install" on the Play Store listing, **When** installation completes, **Then** a Musicore icon appears on the home screen and app drawer.
3. **Given** a user taps the Musicore icon, **When** the app launches, **Then** the app opens full-screen without any browser address bar, navigation bar, or browser UI elements.
4. **Given** the app is open, **When** the user interacts with any feature, **Then** behaviour is identical to using the PWA in a browser.

---

### User Story 2 - Offline Usage (Priority: P2)

A user who has previously opened the app at least once can continue using Musicore in offline mode (viewing and playing previously loaded scores) even when their device has no internet connection.

**Why this priority**: PWA offline support is a key differentiator over a plain website shortcut. Preserving this in the Android app significantly increases its usefulness and perceived quality.

**Independent Test**: Can be fully tested by opening the app once with internet, enabling airplane mode, then reopening — delivers offline score playback without any network connection.

**Acceptance Scenarios**:

1. **Given** the app has been opened at least once with an internet connection, **When** the user opens it while offline, **Then** the app loads and displays previously cached content.
2. **Given** the user is offline inside the app, **When** they attempt to load a score that was previously accessed, **Then** the score loads and plays correctly.
3. **Given** the user is offline and attempts to access content that requires a network, **When** the request fails, **Then** the app displays a clear, user-friendly offline message rather than a blank page or error.

---

### User Story 3 - App Update Delivery (Priority: P3)

When the development team ships a new version of Musicore, Android users automatically receive the update through Google Play without needing to manually reinstall the app.

**Why this priority**: Sustainable distribution requires a reliable update mechanism. Users should always be on the latest version without manual intervention.

**Independent Test**: Can be fully tested by publishing an update through the Play Store console and verifying that installed devices receive and apply the update automatically.

**Acceptance Scenarios**:

1. **Given** a new version of the app is published on Google Play, **When** the user's device checks for updates (automatically or manually), **Then** the new version is downloaded and installed.
2. **Given** an update has been applied, **When** the user next opens the app, **Then** they see the updated version with no additional manual steps.

---

### Edge Cases

- What happens when the user opens the app for the first time with no internet connection? → The app MUST display a clear offline message and not crash or show a blank screen.
- What happens when the user presses the Android back button? → Navigation behaves consistently: back navigates within the app, and pressing back at the root screen prompts the user before closing the app.
- What happens if the PWA's production URL becomes temporarily unavailable? → The app falls back to the cached offline version where available; an error is shown if no cache exists.
- What happens when the device screen orientation changes? → The app handles rotation gracefully, consistent with the PWA's responsive layout.
- What happens when an incoming phone call interrupts app use? → The app resumes correctly when the user returns, with no data loss.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST be publicly available for download on the Google Play Store.
- **FR-002**: The app MUST launch in full-screen mode with no visible browser chrome (address bar, navigation controls, or browser menu).
- **FR-003**: The installed app MUST display the correct Musicore app icon, name, and branding on the device home screen, app drawer, and Play Store listing.
- **FR-004**: All core functionality of the PWA MUST work identically within the Android app.
- **FR-005**: The app MUST preserve offline capabilities: previously loaded content MUST remain accessible without a network connection.
- **FR-006**: The app MUST display a user-friendly message when opened offline for the first time (no cached content).
- **FR-007**: The app MUST handle the Android back button: navigating within the app's content and prompting the user before exiting at the root.
- **FR-008**: A signed release build and Play Store app signing configuration MUST be established so future updates can be published without re-establishing signing credentials.
- **FR-009**: The app MUST support Android 9.0 (API level 28) and above.
- **FR-010**: The Play Store listing MUST include a description, at least one screenshot, and a privacy policy link. The privacy policy MUST declare that no personal data is collected and that anonymous crash diagnostics (device model, OS version, stack traces) are collected solely for stability purposes. The Play Store Data Safety form MUST be completed declaring no PII collected and app diagnostics shared with the crash reporting provider.
- **FR-011**: The team MUST have a documented release process for publishing updates to Google Play.
- **FR-012**: The app MUST include anonymous crash reporting with no personally identifiable information (PII) collected. Crash reports MUST NOT be linked to individual users or devices in any identifiable way.
- **FR-013**: The first public release MUST follow a staged rollout: internal testing track → closed testing (beta) track → production. The app MUST NOT be published directly to production without passing both prior tracks.
- **FR-014**: The CI/CD pipeline MUST automatically produce a signed, release-ready app bundle when a release tag is pushed or a release branch is merged. Publishing to the Play Store MUST require explicit manual approval via the Play Console by a team member.
- **FR-015**: The Play Store content rating questionnaire MUST be completed to obtain a general-audience rating (PEGI 3 / Everyone). The app MUST NOT include any content that would result in a restricted age rating.

### Key Entities

- **Android App Package**: The signed, distributable application derived from the PWA, uniquely identified by a package name and distributed via Google Play.
- **Play Store Listing**: The public-facing store page including app name, description, screenshots, icon, category, and privacy policy.
- **App Signing Credentials**: The cryptographic credentials used to authenticate published builds; must be securely stored and backed up, as they are required for all future updates.
- **App Version**: A numbered release of the app tied to a specific PWA deployment, used by Google Play to manage updates and rollouts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The app is publicly available on the Google Play Store and can be found by searching "Graditone".
- **SC-002**: A new user can find, install, and launch the app within 3 minutes on any supported Android device.
- **SC-003**: The app launches full-screen with zero browser chrome visible on 100% of test devices running Android 9.0 and above.
- **SC-004**: 100% of PWA core features (score loading, playback, navigation) work correctly inside the Android app.
- **SC-005**: The app loads previously accessed content successfully in airplane mode on 100% of test devices.
- **SC-006**: A subsequent release update reaches installed devices via Google Play within 24 hours of publishing.
- **SC-007**: The release process is documented such that any team member can publish an update without external assistance.

## Known Issues & Regression Tests *(if applicable)*

<!--
  CONSTITUTION REQUIREMENT: Principle VII (Regression Prevention)
  
  When bugs/errors are discovered during implementation, deployment, or production:
  1. Document the issue here
  2. Create a failing test that reproduces it (reference the test file/line)
  3. Fix the issue
  4. Verify the test passes
  5. Keep this documentation as a record of what was learned
  
  This section should be ADDED or UPDATED as issues are discovered.
  It's normal for this section to be empty initially and grow during development.
-->

### Issue #1: [Brief Description of Bug]

**Discovered**: [Date] during [context: deployment/testing/production/code review]

**Symptom**: [What went wrong - be specific]
- Example: "GitHub Actions build failed with error: Cannot find module '../wasm/layout'"
- Example: "Test suite reported 13 failures due to incorrect field names in mock data"

**Root Cause**: [Why it happened]
- Example: ".gitignore contained wildcard '*' that excluded required TypeScript interface files"
- Example: "Tests used `x_position`/`y_position` but actual interface uses `x`/`y`"

**Affected Components**: [Which parts of the system]
- Example: "CI/CD pipeline, WASM integration"
- Example: "Unit tests: LayoutRenderer.test.tsx, renderUtils.test.ts"

**Regression Test**: [Reference to test file that prevents recurrence]
- Example: `tests/integration/test_wasm_files_tracked.py` - verifies critical WASM files are git-tracked
- Example: `tests/unit/LayoutRenderer.test.tsx` lines 186-201 - validates correct BoundingBox field names

**Resolution**: [What was fixed]
- Example: "Updated .gitignore to allow `*.ts` and `*.md` files in `frontend/src/wasm/`"
- Example: "Corrected mock data to use `{x, y}` instead of `{x_position, y_position}`"

**Lessons Learned**: [What this teaches about the system]
- Example: "Wildcard gitignore patterns can hide essential source files during local development"
- Example: "Interface contracts between Rust and TypeScript must be validated with actual fixture data"

---

### Issue #2: [Next Issue if any]

[Repeat structure above]

<!--
  NOTE: This section grows organically during development and maintenance.
  Each issue becomes documentation + a regression test.
  Over time, this builds a comprehensive record of edge cases and failure modes.
-->

