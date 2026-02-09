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
- 010-stacked-staves-view: Added TypeScript 5.9, React 19.2 + React, Vite (bundler), Vitest (testing), Tone.js (audio playback)
- 009-playback-scroll-highlight: Added N/A (no data persistence - scroll/highlight state is ephemeral playback state)
- 007-clef-notation: Added TypeScript 5.9 (frontend), Rust 1.82+ (backend API - minimal changes) + React 19.2, Bravura music font (SMuFL), Vite 7.2 bundler; backend: Axum 0.7, serde


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
