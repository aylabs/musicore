# musicore Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-06

## Active Technologies
- TypeScript 5.0+, React 18+ + React, TypeScript, Bravura font (SMuFL), existing Score API clien (002-staff-notation-view)
- N/A (frontend-only feature, reads from existing backend API) (002-staff-notation-view)
- Backend: Rust (latest stable 1.75+), Frontend: TypeScript 5.0+, React 18+ + Backend: serde (existing), Frontend: Tone.js 14.7+ (new), React, TypeScript (existing) (003-music-playback)
- Backend uses existing in-memory Score repository with ScoreRepository trait (no changes needed) (003-music-playback)
- TypeScript 5.9, React 19 (frontend only - no backend changes) + Browser File API (native), existing Score type definitions (004-save-load-scores)
- Client-side browser file system via download/upload (no server-side storage) (004-save-load-scores)
- TypeScript 5.9 (frontend), Rust 1.82+ (backend) + React 19, Vite bundler (frontend); Axum web framework, Tokio async runtime (backend) (005-chord-symbols)
- In-memory (no database persistence for chords) (005-chord-symbols)
- Rust 1.82+ (backend/parsing engine), TypeScript 5.9 (frontend UI) + quick-xml or roxmltree (Rust XML parsing), zip crate (Rust .mxl decompression), React 19, Axum web framework (006-musicxml-import)
- In-memory repository (existing), file system for uploaded MusicXML files (temporary) (006-musicxml-import)
- TypeScript 5.9 (frontend), Rust 1.82+ (backend API - minimal changes) + React 19.2, Bravura music font (SMuFL), Vite 7.2 bundler; backend: Axum 0.7, serde (007-clef-notation)
- N/A (display-only feature; clef data already stored in domain model via Feature 006) (007-clef-notation)
- N/A (no data persistence - scroll/highlight state is ephemeral playback state) (009-playback-scroll-highlight)
- TypeScript 5.9, React 19.2 + React, Vite (bundler), Vitest (testing), Tone.js (audio playback) (010-stacked-staves-view)
- N/A (frontend only, uses existing backend API) (010-stacked-staves-view)
- TypeScript 5.9 (frontend), JavaScript ES2022 (service worker), JSON (manifest) (012-pwa-distribution)
- Cache Storage API (browser native), IndexedDB (already implemented in Feature 011 for scores) (012-pwa-distribution)
- TypeScript 5.9 (frontend), Rust 1.75+ (backend WASM module - limited changes) (013-demo-onboarding)
- Browser Local Storage (for first-run flag and view mode preference), IndexedDB (for demo score storage, already implemented in Feature 011) (013-demo-onboarding)
- TypeScript ~5.9.3, React 19.2.0 + React 19.2.0, Vite 7.2.4, WASM music engine (backend Rust compiled via wasm-pack) (014-remove-edit-ui)
- IndexedDB for offline score storage (already implemented) (014-remove-edit-ui)
- TypeScript 5.9, React 19 + React (UI), Vitest (testing), Bravura font (SMuFL notation) (001-staff-display-refinement)
- N/A (visual presentation only) (001-staff-display-refinement)
- Rust 1.93+ (backend/WASM), TypeScript 5.9+ (frontend) + quick-xml (XML parsing), wasm-bindgen (JS interop), serde (serialization), JSZip (frontend .mxl decompression) (015-musicxml-error-handling)
- N/A (parser operates in-memory; storage handled by existing score persistence layer) (015-musicxml-error-handling)

- Rust (latest stable 1.75+) + serde 1.0+, serde_json 1.0+ (serialization), thiserror 1.0+ (errors); web framework TBD in contracts phase (axum or actix-web) (001-score-model)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

cargo test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] cargo clippy

## Code Style

Rust (latest stable 1.75+): Follow standard conventions

## Recent Changes
- 015-musicxml-error-handling: Added Rust 1.93+ (backend/WASM), TypeScript 5.9+ (frontend) + quick-xml (XML parsing), wasm-bindgen (JS interop), serde (serialization), JSZip (frontend .mxl decompression)
- 001-staff-display-refinement: Added TypeScript 5.9, React 19 + React (UI), Vitest (testing), Bravura font (SMuFL notation)
- 014-remove-edit-ui: Added TypeScript ~5.9.3, React 19.2.0 + React 19.2.0, Vite 7.2.4, WASM music engine (backend Rust compiled via wasm-pack)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
