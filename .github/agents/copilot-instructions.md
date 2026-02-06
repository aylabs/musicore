# musicore Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-06

## Active Technologies
- TypeScript 5.0+, React 18+ + React, TypeScript, Bravura font (SMuFL), existing Score API clien (002-staff-notation-view)
- N/A (frontend-only feature, reads from existing backend API) (002-staff-notation-view)

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
- 002-staff-notation-view: Added TypeScript 5.0+, React 18+ + React, TypeScript, Bravura font (SMuFL), existing Score API clien
- 002-staff-notation-view: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

- 001-score-model: Added Rust (latest stable 1.75+) + serde 1.0+, serde_json 1.0+ (serialization), thiserror 1.0+ (errors); web framework TBD in contracts phase (axum or actix-web)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
