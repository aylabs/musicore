# musicore Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-06

## Active Technologies
- TypeScript 5.0+, React 18+ + React, TypeScript, Bravura font (SMuFL), existing Score API clien (002-staff-notation-view)
- N/A (frontend-only feature, reads from existing backend API) (002-staff-notation-view)
- Backend: Rust (latest stable 1.75+), Frontend: TypeScript 5.0+, React 18+ + Backend: serde (existing), Frontend: Tone.js 14.7+ (new), React, TypeScript (existing) (003-music-playback)
- Backend uses existing in-memory Score repository with ScoreRepository trait (no changes needed) (003-music-playback)
- TypeScript 5.9, React 19 (frontend only - no backend changes) + Browser File API (native), existing Score type definitions (004-save-load-scores)
- Client-side browser file system via download/upload (no server-side storage) (004-save-load-scores)

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
- 004-save-load-scores: Added TypeScript 5.9, React 19 (frontend only - no backend changes) + Browser File API (native), existing Score type definitions
- 003-music-playback: Added Backend: Rust (latest stable 1.75+), Frontend: TypeScript 5.0+, React 18+ + Backend: serde (existing), Frontend: Tone.js 14.7+ (new), React, TypeScript (existing)
- 002-staff-notation-view: Added TypeScript 5.0+, React 18+ + React, TypeScript, Bravura font (SMuFL), existing Score API clien


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
