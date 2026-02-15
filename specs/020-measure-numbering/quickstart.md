# Quickstart: Measure Numbering

**Feature**: 020-measure-numbering  
**Date**: 2026-02-15

## Overview

This feature adds measure numbers at the start of each system in the rendered score. The number indicates which measure begins that system (1-based). It is positioned above the topmost staff line, horizontally aligned with the clef glyph.

## Architecture

```
┌─────────────────────────────────┐
│  Layout Engine (Rust/WASM)      │
│                                 │
│  compute_layout()               │
│    ├── extract_measures()       │
│    ├── break_into_systems()     │
│    │   └── create_system()      │
│    │       measure_number: None │
│    └── populate systems         │
│        └── compute measure_number ◄── NEW
│            number = tick/3840+1 │
│            position = (60, y-30)│
│                                 │
│  Output: GlobalLayout JSON      │
│    └── System.measure_number    │
└──────────────┬──────────────────┘
               │ JSON via WASM
               ▼
┌─────────────────────────────────┐
│  Renderer (React/SVG)           │
│                                 │
│  renderSystem()                 │
│    ├── render measure_number ◄── NEW
│    │   <text> at (x, y)         │
│    │   font: system-ui, 14px    │
│    └── renderStaffGroup()       │
│        └── renderStaff()        │
└─────────────────────────────────┘
```

## Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `backend/src/layout/types.rs` | Add `MeasureNumber` struct, add field to `System` | Data model |
| `backend/src/layout/breaker.rs` | Initialize `measure_number: None` in `create_system` | System creation |
| `backend/src/layout/mod.rs` | Compute measure number + position after system population | Layout logic |
| `frontend/src/wasm/layout.ts` | Add `MeasureNumber` interface, update `System` | TypeScript types |
| `frontend/src/components/LayoutRenderer.tsx` | Render measure number in `renderSystem()` | SVG rendering |
| `backend/tests/layout_test.rs` | Add measure numbering tests | Unit tests |
| `backend/tests/layout_integration_test.rs` | Add multi-system measure number tests | Integration tests |

## Key Constants

| Constant | Value | Source |
|----------|-------|--------|
| Ticks per measure (4/4) | 3840 | 960 PPQ × 4 beats |
| Clef x-position | 60.0 | `mod.rs` line 153 |
| Measure number y-offset | -30.0 | Above top staff line |
| Renderer font | `system-ui, sans-serif` | Standard text (not SMuFL) |
| Renderer font size | 14 | Small, unobtrusive |

## Implementation Order

1. **types.rs**: Add `MeasureNumber` struct and `measure_number` field to `System`
2. **breaker.rs**: Initialize `measure_number: None` in `create_system`
3. **mod.rs**: Compute measure number + position after staff group population
4. **layout.ts**: Add TypeScript `MeasureNumber` interface and update `System`
5. **LayoutRenderer.tsx**: Render measure number `<text>` in `renderSystem()`
6. **Tests**: Add unit and integration tests for measure numbering

## Test Strategy

- **Unit test**: Inline JSON score → `compute_layout` → assert `system.measure_number.number == 1` for first system
- **Multi-system test**: Score with many measures → verify each system has correct sequential measure number
- **Position test**: Verify measure number x=60.0 and y < topmost staff line y
- **Multi-instrument test**: Score with multiple instruments → verify one measure number per system
- **Determinism test**: Same input → same measure numbers and positions

## Constitution Compliance

| Principle | How Addressed |
|-----------|---------------|
| VI. Layout Engine Authority | Positions computed entirely in Rust; renderer reads coordinates only |
| V. Test-First Development | Tests written for both backend computation and frontend rendering |
| II. Hexagonal Architecture | Layout engine (core) produces data; renderer (adapter) displays it |
| IV. Precision & Fidelity | Integer division for measure index; no floating-point timing |
