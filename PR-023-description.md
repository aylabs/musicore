## Summary

Enable the Play View to render **all instruments** from a score instead of only the first, with correct vertical spacing, instrument name labels, playback highlighting across all instruments, and production-quality engraving.

## What's Included

### Core Feature (Phases 1-5: T001-T028)
- Multi-instrument rendering in Play View - all instruments stacked vertically per system
- Correct intra-instrument and inter-instrument vertical spacing
- Instrument name labels positioned at system start (left of bracket/brace)
- Playback note highlighting across all instruments
- Contract tests, integration tests, quickstart validation

### Engraving Improvements (Phase 6: T029-T066)
Iterative visual fixes discovered during manual testing:

**Staff and Spacing**
- Staff line spacing reduced to 1xups (standard engraving proportion)
- Intra-staff multiplier tuned: 5 to 14 to 8 (compact with ledger line room)
- Inter-instrument multiplier: 8 to 5 (tighter gap between instruments)
- Dynamic collision-aware spacing: when notes extend toward an adjacent staff, spacing is automatically increased for that system only (T065-T066)

**Note Rendering**
- Stem direction fix: notes on/above middle line get stems down (standard rule)
- Direction-aware SMuFL codepoints for half/quarter/eighth/sixteenth notes
- Compress-only note spacing (no stretching to fill system width)
- Beam slope clamp fix for negative dx values

**Layout and Viewport**
- Zoom rescaled: 100% = natural reading size (BASE_SCALE=0.5)
- max_system_width increased to 2400 for 3+ measures per system
- Staff lines trimmed to rightmost barline (no excess right padding)
- Container overflow: visible (browser scrollbar instead of inner scrollbar)
- Label margin reduced 200 to 80, ledger line width 1.25 to 0.7 ups

### Legacy Code Cleanup (T067)
- Removed the legacy "Play Legacy View" (Feature 010 stacked mode)
- Now only two view modes: Instruments View and Play View
- **709 lines of code deleted**: StackedStaffView, MultiVoiceStaff, StaffGroup components
- ViewMode type simplified: `'individual' | 'layout'` (removed `'stacked'`)

## Test Results
- **302 Rust backend tests** - all passing
- **777 frontend tests** - all passing (down from 789, removed 12 stacked view tests)
- **WASM build** - 416K module, compiles successfully

## Success Criteria Met
SC-001 through SC-014 (see spec.md for details)

## Tasks
67 tasks completed (T001-T066 + legacy cleanup), organized in 6 phases + cleanup. See specs/023-multi-instrument-play/tasks.md
