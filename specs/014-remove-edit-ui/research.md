# Research: Remove Editing Interface

**Feature**: 014-remove-edit-ui  
**Date**: 2026-02-10  
**Status**: Complete

## Overview

This document consolidates research findings for removing the editing interface from Musicore. Since this is a UI removal feature with no new technology choices or architectural decisions, the research focuses on cataloging existing UI elements and confirming no dependencies will be broken.

---

## Decision 1: Which UI Elements to Remove

**Decision**: Remove all editing-related buttons and input fields from 4 main components:
1. **ScoreViewer.tsx**: "New Score" button, "Save" button, score name input field
2. **InstrumentList.tsx**: "Add Voice" button, "Add Staff" button
3. **NoteDisplay.tsx**: "Add Note" button
4. **ScoreViewer.tsx (keyboard shortcuts)**: Ctrl+S (Save), Ctrl+N (New Score), Ctrl+O (Load from backend)

**Rationale**: 
- These UI elements rely on REST API endpoints (`/api/scores`, `/api/instruments/:id/staves`, etc.) that are unavailable in the PWA deployment on GitHub Pages (static hosting only).
- Users clicking these buttons see errors because the backend is not accessible in production.
- Removing broken UI improves user experience by focusing on functional features (playback, view modes, file import, demo onboarding).

**Alternatives Considered**:
1. **Migrate editing operations to WASM** - Rejected because this is a much larger effort requiring full WASM API design, implementation, and testing. Future feature, not this one.
2. **Disable buttons instead of removing them** - Rejected because disabled buttons with tooltips explaining why they don't work creates visual clutter and suggests future functionality that may never arrive.
3. **Keep "Save" for local file export only** - Rejected because the current "Save" button is tied to backend API and file state tracking that assumes backend persistence. File export is already handled by browser download after import/demo.

---

## Decision 2: Preserve Existing Functionality

**Decision**: No changes to the following functional areas:
- **Playback controls**: Play/pause, tempo slider, metronome toggle
- **View mode switching**: Individual vs. stacked staff view (Feature 010)
- **File import**: MusicXML import via ImportButton component
- **Demo onboarding**: Demo score loading on first run (Feature 013)
- **Offline storage**: IndexedDB storage for imported scores and demo

**Rationale**:
- These features are WASM-powered or use browser APIs (File API, IndexedDB) and work offline without REST API.
- Spec requirements (FR-009, FR-010, FR-011, FR-012) explicitly preserve these.
- Existing tests for these features should continue to pass.

**Validation Approach**:
- Run existing test suite after UI removal to confirm no regressions.
- Manual testing on GitHub Pages deployment after merge.

---

## Decision 3: FileStateContext Deprecation Strategy

**Decision**: Leave `FileStateContext` in place but document it as potentially deprecated/unused.

**Rationale**:
- `FileStateContext` tracks modified state, last saved timestamp, and file path for backend persistence.
- With editing removed, there is no modified state to track.
- However, removing it now may break other components that import it (need to audit dependencies).
- Safe approach: Leave it in place, mark as deprecated in comments, consider removal in future refactoring.

**Alternatives Considered**:
1. **Remove FileStateContext entirely** - Rejected because requires dependency audit across all components to ensure nothing breaks. Out of scope for this feature.
2. **Simplify to only track current file path** - Rejected for same reason as #1, plus adds complexity without clear benefit.

**Follow-up**: Future feature could audit and remove FileStateContext if no components depend on its state.

---

## Decision 4: Test Strategy

**Decision**: Add negative assertion tests for removed UI elements:
- `ScoreViewer.test.tsx`: Verify "New Score" button does not render
- `ScoreViewer.test.tsx`: Verify "Save" button does not render
- `ScoreViewer.test.tsx`: Verify score name input does not render
- `InstrumentList.test.tsx`: Verify "Add Voice" button does not render
- `InstrumentList.test.tsx`: Verify "Add Staff" button does not render
- `NoteDisplay.test.tsx`: Verify "Add Note" button does not render

**Rationale**:
- Constitution requires test-first development.
- Negative assertions ensure UI elements don't accidentally get re-introduced.
- Existing tests for playback, view modes, and import should continue to pass (regression prevention).

**Alternatives Considered**:
1. **Skip tests since we're only removing code** - Rejected because constitution explicitly requires tests for all features, and tests document expected behavior.
2. **Only test playback/view functionality preservation** - Rejected because it doesn't verify the removal itself, leaving risk of accidental UI re-introduction.

---

## Decision 5: Browser Unsaved Changes Warning

**Decision**: Remove the `beforeunload` event listener that warns users about unsaved changes.

**Rationale**:
- With editing removed, there are no unsaved changes to warn about.
- Keeping the warning would confuse users (why am I being warned when I can't edit?).
- Spec requirement FR-001 through FR-008 collectively imply no editing means no unsaved state.

**Alternatives Considered**:
1. **Keep warning for imported scores** - Rejected because imported scores are immediately saved to IndexedDB and persist across sessions. No backend state to lose.

---

## Technology Stack Confirmation

No new technologies or dependencies required for this feature. All work uses existing:
- **React 19.2.0**: Conditional rendering to hide buttons
- **TypeScript ~5.9.3**: Type safety for component props
- **Vitest + @testing-library/react**: Test framework already in use
- **Vite 7.2.4**: Build tool (no config changes needed)

---

## Component Dependency Analysis

**Affected Components**:
1. **ScoreViewer.tsx** (779 lines) - Primary component, most changes here
2. **InstrumentList.tsx** (281 lines) - Remove Add Voice/Staff buttons
3. **NoteDisplay.tsx** (unknown size, need to check) - Remove Add Note button
4. **FileStateContext.tsx** (unknown size) - May deprecate but not remove

**Unaffected Components**:
- **PlaybackControls.tsx**: No changes (preserves FR-009)
- **ViewModeSelector.tsx**: No changes (preserves FR-010)
- **ImportButton.tsx**: No changes (preserves FR-011)
- **demoLoader service**: No changes (preserves FR-012)
- **StackedStaffView.tsx**: No changes (view-only component)
- **App.tsx**: Minimal changes if any (header already exists, no landing page separate from ScoreViewer)

**Dependency Flow**:
```
App.tsx
  └─> ScoreViewer.tsx (controlled viewMode from useOnboarding hook)
        ├─> InstrumentList.tsx (renders instruments)
        │     └─> NoteDisplay.tsx (renders notes per voice)
        ├─> PlaybackControls.tsx (playback UI)
        ├─> ViewModeSelector.tsx (individual/stacked toggle)
        ├─> ImportButton.tsx (file import)
        └─> StackedStaffView.tsx (when viewMode === 'stacked')
```

**Risk Assessment**: Low risk. Changes are localized to 3 components (ScoreViewer, InstrumentList, NoteDisplay). No shared utility functions or state management changes beyond FileStateContext (which we're leaving in place).

---

## Summary of Research Findings

| Research Area | Finding | Impact |
|---------------|---------|--------|
| UI Elements to Remove | 6 button types + 1 input field + 3 keyboard shortcuts | Affects 3 components |
| Functionality to Preserve | Playback, view modes, import, demo | No changes to 5+ components |
| FileStateContext | Deprecated but not removed | Zero risk of breakage |
| Test Strategy | Negative assertions + regression tests | Requires ~6 new test cases |
| Technology Stack | No new dependencies | Zero learning curve |
| Deployment | GitHub Pages PWA | Already deployed (v0.1.5) |

**Conclusion**: All NEEDS CLARIFICATION items resolved. Feature is well-scoped, low-risk, and ready for Phase 1 (though data-model.md and contracts/ are N/A for UI removal).
