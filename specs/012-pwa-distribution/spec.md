# Feature Specification: PWA Distribution for Tablets

**Feature Branch**: `012-pwa-distribution`  
**Created**: 2026-02-10  
**Status**: Draft  
**Input**: User description: "Create a PWA to distribute the application to tablets"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install Music Stand App on Tablet (Priority: P1)

A practicing musician wants to install Musicore on their tablet (iPad, Surface, Android tablet) as a native-like app for quick access during practice sessions. The installation should feel app-like without requiring app store downloads, approval delays, or updates.

**Why this priority**: Installation is the entry point for all users. Without an installable PWA, musicians cannot easily access the app during practice. This is the foundation that enables all other PWA capabilities.

**Independent Test**: Can be fully tested by navigating to the web app on a tablet browser, receiving an install prompt, installing the app, and launching it from the home screen. Delivers standalone app experience without app store friction.

**Acceptance Scenarios**:

1. **Given** a musician visits Musicore on Safari (iPad), **When** the PWA install criteria are met (HTTPS, manifest, service worker), **Then** Safari shows an install banner/prompt
2. **Given** a musician visits Musicore on Chrome (Android tablet), **When** the PWA is installable, **Then** Chrome shows "Add to Home Screen" prompt
3. **Given** the musician taps "Install", **When** installation completes, **Then** a Musicore icon appears on the home screen with the app name and icon from the manifest
4. **Given** the app is installed, **When** the musician taps the home screen icon, **Then** the app launches in standalone mode (no browser UI) with splash screen
5. **Given** the app is running in standalone mode, **When** the musician interacts with scores, **Then** the experience feels native (no browser chrome, proper status bar integration)

---

### User Story 2 - Access Scores Offline During Practice (Priority: P2)

A practicing musician is in a rehearsal room with no internet connection. They need to open previously loaded scores, view notation, add annotations, and use playback/practice aids without network access.

**Why this priority**: Practice rooms often lack reliable WiFi. Offline capability is essential for uninterrupted practice sessions. This directly supports the intelligent music stand use case defined in the constitution.

**Independent Test**: Can be fully tested by loading scores while online, disconnecting from network (airplane mode), launching the PWA, and verifying all practice features (display, annotations, playback) work without connectivity. Delivers core value of offline-first music stand.

**Acceptance Scenarios**:

1. **Given** a musician has loaded scores while online, **When** they lose internet connection, **Then** the service worker serves cached app shell and score data
2. **Given** the musician is offline, **When** they open a previously loaded score, **Then** the score displays correctly with all notation, markings, and metadata
3. **Given** the musician is offline, **When** they add annotations (fingerings, bowings, markings), **Then** changes are persisted to IndexedDB and sync when online
4. **Given** the musician is offline, **When** they use playback/metronome features, **Then** audio engine (Tone.js) functions without network requests
5. **Given** the musician is offline, **When** they navigate between cached scores, **Then** page turns and navigation work instantly without network errors
6. **Given** the musician regains connectivity, **When** the PWA detects online status, **Then** locally cached annotations sync to backend (if applicable)

---

### User Story 3 - Receive Automatic App Updates (Priority: P3)

A musician has Musicore installed on their tablet. When new features or bug fixes are released, the app should update automatically without requiring manual app store updates or reinstallation.

**Why this priority**: PWA updates happen transparently via service worker, eliminating app store approval delays and ensuring users always have the latest version. This improves maintainability and user experience but is less critical than initial installation and offline access.

**Independent Test**: Can be fully tested by deploying a new version of the PWA, launching the installed app, verifying the service worker detects the update, and confirming the app updates in the background with user notification. Delivers seamless update experience.

**Acceptance Scenarios**:

1. **Given** a new version of the PWA is deployed, **When** the musician launches the installed app, **Then** the service worker detects a new version available
2. **Given** a service worker update is detected, **When** the app is running, **Then** the new version downloads in the background without interrupting current practice session
3. **Given** the new version is downloaded, **When** the download completes, **Then** a non-intrusive notification prompts the musician to reload for the update
4. **Given** the musician accepts the update, **When** they reload, **Then** the new version activates seamlessly with all cached data preserved
5. **Given** the musician ignores the update prompt, **When** they close and reopen the app later, **Then** the new version activates automatically on next launch

---

### Edge Cases

- What happens when the browser does not support PWA installation (older browsers)? → Graceful fallback: app works as web app, display informational message about PWA benefits
- How does the system handle limited storage on tablets (full cache)? → Service worker implements cache size limits, evicts oldest scores first (LRU), notifies user when storage is low
- What happens when service worker registration fails? → App continues as standard web app, logs error, retries registration on next visit
- How does the app handle manifest.json parsing errors? → Falls back to default browser behavior, logs error for debugging
- What happens when the user uninstalls the PWA from home screen? → Service worker and cache remain until browser clears them, no data loss if user reinstalls
- How does the system handle conflicts between locally modified scores and server versions? → Show conflict resolution UI, allow user to choose local/server version or merge (if applicable)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Web App Manifest (`manifest.json`) with required fields: name, short_name, icons (192x192, 512x512), start_url, display (standalone), theme_color, background_color, orientation (portrait/landscape)
- **FR-002**: System MUST register a Service Worker on HTTPS that intercepts network requests and implements caching strategies
- **FR-003**: Service Worker MUST implement cache-first strategy for app shell (HTML, CSS, JS, WASM module) to enable offline app loading
- **FR-004**: Service Worker MUST implement network-first with cache fallback strategy for score data (MusicXML files, metadata) to prioritize fresh data when online
- **FR-005**: System MUST cache WASM module (musiccore_backend_bg.wasm) and JS bindings for offline music engine functionality
- **FR-006**: System MUST trigger browser install prompt on supported devices (iOS Safari, Android Chrome, Edge) when PWA installability criteria are met
- **FR-007**: System MUST display app in standalone mode (no browser UI) when launched from home screen icon
- **FR-008**: System MUST provide a splash screen during app launch using manifest icons and background_color
- **FR-009**: System MUST handle service worker lifecycle: install, activate, fetch, and update events
- **FR-010**: System MUST implement background sync for annotations/changes made while offline (when network returns)
- **FR-011**: Service Worker MUST implement cache versioning and stale-while-revalidate pattern for assets that change frequently
- **FR-012**: System MUST provide offline fallback UI when network requests fail and no cached version exists
- **FR-013**: System MUST detect online/offline status changes using navigator.onLine API and update UI accordingly (integrate with existing OfflineBanner component)
- **FR-014**: System MUST notify users when a new service worker version is available with option to update immediately or defer
- **FR-015**: System MUST clean up old cache versions when service worker activates to prevent storage bloat
- **FR-016**: Manifest MUST specify tablet-optimized viewport settings and orientation preferences (allow portrait and landscape)
- **FR-017**: System MUST handle iOS-specific PWA requirements: apple-touch-icon, apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style meta tags
- **FR-018**: System MUST implement Service Worker skip waiting and clients claim for immediate activation of new versions when user requests update

### Key Entities

- **Web App Manifest**: JSON file describing PWA metadata (name, icons, display mode, theme colors, start URL, orientation preferences). Served at `/manifest.json` with `application/manifest+json` content type.
- **Service Worker**: JavaScript file running in background thread, intercepts network requests, manages cache storage, handles offline scenarios, implements update strategies. Registered at root scope (`/`).
- **Cache Storage**: Browser API storing versioned caches for app shell, WASM modules, score data. Managed by service worker with cache-first, network-first, and stale-while-revalidate strategies.
- **Install Prompt**: Browser-provided UI element (banner, dialog) allowing user to add PWA to home screen. Triggered by beforeinstallprompt event when installability criteria met.
- **Background Sync**: API allowing service worker to defer actions (annotation sync, score uploads) until network connectivity restored. Registered via sync event.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: PWA passes Google Lighthouse PWA audit with score ≥90 (installability, service worker, manifest, HTTPS, responsive design)
- **SC-002**: Musicians can install the PWA on iOS Safari, Android Chrome, and Edge with no more than 3 taps (visit URL → install prompt → confirm)
- **SC-003**: App shell (HTML, CSS, JS, WASM) loads within 1 second on repeat visits when cached (measured via Performance API)
- **SC-004**: Offline mode supports 100% of core practice features: score display, annotations, playback, metronome, navigation (measured by feature availability without network)
- **SC-005**: Service worker cache successfully stores the 144KB WASM module and JS bindings for offline music engine functionality
- **SC-006**: Update cycle completes within 5 seconds: detect new version → download in background → activate on reload (measured from service worker update detection to activation)
- **SC-007**: PWA works correctly in standalone mode with no browser chrome visible, proper status bar integration on iOS and Android tablets
## Assumptions *(optional - fill only if needed)*

- The Musicore web app is already served over HTTPS (required for PWA)
- The frontend build pipeline (Vite) supports PWA plugin or manual service worker configuration
- Tablets have at least 100MB available storage for PWA caches (app shell + WASM + scores)
- Musicians will grant browser permissions for storage quota increases if needed
- IndexedDB (already implemented for offline score storage in Feature 011) will serve as the offline database for annotations/scores
- Service worker will not cache user authentication tokens (security concern) - authentication handled separately
- The existing OfflineBanner component (Feature 011) provides UI feedback for offline status

## Out of Scope *(optional - fill only if needed)*

- Native app distribution via Apple App Store or Google Play Store (PWA bypasses app stores)
- Desktop PWA support (focus is tablet-native; desktop may work but not optimized)
- Push notifications (not essential for practice sessions; could be future enhancement)
- Background fetch API for large score libraries (current scope: cache user-accessed scores)
- Periodic background sync for automatic score updates (could be future enhancement)
- Advanced conflict resolution UI for offline annotation syncing (MVP: last-write-wins or user prompt)
- Service worker analytics/telemetry (could be added later)

## Notes for Implementation *(optional - fill only if needed)*

### PWA Best Practices
- Use Workbox library (Google) for robust service worker generation and caching strategies (simplifies FR-002 to FR-015)
- Implement proper cache versioning: include build hash or timestamp in cache names for safe updates
- Test on physical devices (iPad, Surface, Android tablets) - PWA behavior differs from desktop Chrome DevTools

### iOS-Specific Considerations
- Safari on iOS has PWA quirks: no beforeinstallprompt event, requires manual "Add to Home Screen" from share menu
- iOS PWAs have separate storage quota from Safari browser - test storage limits
- iOS does not support beforeinstallprompt, so install instructions may need different UX (e.g., informational modal)
- iOS standalone mode has different status bar behavior - test with apple-mobile-web-app-status-bar-style values

### Service Worker Strategies
- App Shell (cache-first): HTML, CSS, JS, WASM module - never wait for network
- Score Data (network-first with cache fallback): Prioritize fresh data, fall back to cache offline
- Stale-while-revalidate for images/assets: Show cached version immediately, update in background

### Offline Sync Strategy
- Leverage existing IndexedDB implementation (Feature 011: offline score storage)
- Queue annotation changes in IndexedDB with pending sync flag
- Use Background Sync API to trigger sync when connectivity returns
- Handle conflicts: Default to last-write-wins for annotations; consider conflict UI for future enhancement

### Testing Strategy
- Unit tests: Service worker event handlers (install, activate, fetch)
- Integration tests: Cache strategies, offline scenarios, update flow
- Manual testing: Install flow on iOS Safari, Android Chrome, Edge (tablet devices)
- Lighthouse PWA audit in CI pipeline to catch regressions

## Dependencies *(optional - if feature cannot proceed without other features)*

- **Feature 011 (WASM Music Engine)**: PWA caches WASM module for offline music engine - must be deployed and working
- **Offline Score Storage (Feature 011)**: PWA relies on IndexedDB implementation for offline score persistence
- **HTTPS Deployment**: PWA requires HTTPS - production hosting must have valid SSL certificate

## Constraints *(optional - technical/business limits)*

- **Browser Support**: PWA features vary by browser/OS. iOS Safari has limited PWA support vs Chrome (no beforeinstallprompt, limited background sync). Must test on target platforms.
- **Storage Limits**: Browsers enforce storage quotas (varies by device). Service worker must handle quota exceeded errors gracefully.
- **Update Timing**: Service workers activate on next page load by default (users may not see updates immediately). Implement "Update Available" UI to prompt reload.
- **Tablet Fragmentation**: Wide variety of tablet screen sizes, OS versions, browser versions. Must test responsive design across iPad, Surface, Android tablets.

## Risks *(optional - concerns that could derail success)*

- **iOS Safari PWA Limitations**: Apple's PWA support lags behind Chrome/Edge. Features like beforeinstallprompt, background sync may not work on iOS. Mitigation: Provide iOS-specific install instructions, test extensively on Safari.
- **Cache Invalidation Bugs**: Service worker cache bugs can trap users on old versions. Mitigation: Implement robust cache versioning, provide manual cache clear option.
- **Storage Quota Exceeded**: Tablets with limited storage may hit quota limits. Mitigation: Implement LRU cache eviction, notify users when storage is low.
- **Service Worker Debugging Complexity**: Service worker issues are harder to debug than regular JavaScript. Mitigation: Add extensive logging, use Chrome DevTools Service Worker panel, test on physical devices.

## Related Features *(optional - other features this interacts with)*

- **Feature 011 (WASM Music Engine)**: PWA caches WASM module and JS bindings for offline music engine functionality. Service worker must cache these assets correctly.
- **Feature 004 (Save/Load Scores)**: PWA offline sync interacts with score persistence. Annotations made offline must sync when connectivity returns.
- **Offline Detection (Feature 011)**: Existing OfflineBanner component provides UI feedback. PWA service worker enhances this with actual offline capability.
- **Future: Authentication/Sync**: If user authentication is added, service worker must not cache sensitive tokens. Background sync will handle annotation/score syncing.