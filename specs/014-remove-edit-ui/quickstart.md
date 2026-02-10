# Quickstart: Remove Editing Interface

**Feature**: 014-remove-edit-ui  
**Date**: 2026-02-10  
**Audience**: Developers and users

## What Changed

Musicore is now a **read-only score viewer and player**. All editing functionality has been removed from the user interface.

---

## For Users

### What You Can Still Do ✅

1. **Load Demo Music**: Demo onboarding on first visit works as before
2. **Import MusicXML Files**: Use the "Import MusicXML" button to load your own scores
3. **Play Music**: All playback controls (play/pause, tempo, metronome) are fully functional
4. **Switch View Modes**: Toggle between individual and stacked staff views
5. **Navigate Scores**: Scroll, zoom, and view score notation

### What's Removed ❌

1. **Create New Scores**: "New Score" button removed (landing page and viewer header)
2. **Load from File (Landing Page)**: "Load Score" button removed from landing page (still available in header when score is loaded)
3. **Edit Scores**: Cannot add notes, voices, staves, or instruments
4. **Save to Backend**: "Save" button removed (no backend persistence available)
5. **Keyboard Shortcuts**: Ctrl+S (save), Ctrl+N (new score), Ctrl+O (load from backend) removed

### Why This Change?

The backend REST API is not available in the PWA deployment on GitHub Pages (static hosting). Editing features relied on this API and were non-functional. Removing them creates a cleaner, more focused experience for viewing and playing music.

---

## For Developers

### Modified Components

1. **`frontend/src/components/ScoreViewer.tsx`**
   - Removed "New Score" button
   - Removed "Save" button  
   - Removed score name input field
   - Removed "Load Score" button from landing page (kept in header when score is loaded)
   - Removed keyboard shortcuts (`handleKeyDown` event listener for Ctrl+S, Ctrl+N, Ctrl+O)
   - Removed unsaved changes warning (`beforeunload` event listener)

2. **`frontend/src/components/InstrumentList.tsx`**
   - Removed "Add Voice" button
   - Removed "Add Staff" button
   - Removed `addStaff()` and `addVoice()` functions
   - Removed unused state variables and API imports

3. **`frontend/src/components/NoteDisplay.tsx`**
   - Removed "Add Note" button
   - Removed add note form (tick, duration, pitch inputs)
   - Removed `addNote()` function
   - Removed unused state variables and props

### Unchanged Components

- **`PlaybackControls.tsx`**: Playback UI fully preserved
- **`ViewModeSelector.tsx`**: View mode toggle fully preserved
- **`ImportButton.tsx`**: File import fully preserved
- **`demoLoader` service**: Demo onboarding fully preserved
- **`StackedStaffView.tsx`**: Stacked view rendering fully preserved

### Testing

Run the test suite to verify:
```bash
cd frontend
npm test
```

Key test files:
- `ScoreViewer.test.tsx` - Verifies removed buttons are not rendered
- `InstrumentList.test.tsx` - Verifies removed buttons are not rendered
- `NoteDisplay.test.tsx` - Verifies removed button is not rendered
- Existing playback/view tests - Should all pass (regression prevention)

### Deployment

No special deployment steps. Feature is purely frontend UI changes.

```bash
cd frontend
npm run build
# Deploy dist/ to GitHub Pages as usual
```

### Rollback Plan

If this feature needs to be reverted:
1. Checkout previous commit before this feature
2. Re-deploy to GitHub Pages
3. Note: Editing functionality will still be broken (backend API unavailable), so rollback only restores broken UI

---

## API Contracts

**N/A** - This feature does not modify or introduce API contracts. Backend REST API endpoints remain in code but are unused by frontend after this change.

---

## Future Work

If editing functionality is needed in the future, it should be implemented via:
1. **WASM-first approach**: Migrate score mutation operations to Rust WASM module
2. **Local-first architecture**: Editing works entirely offline, no backend API required
3. **Export-based persistence**: Save edited scores as MusicXML files for download

This would align with Constitution Principle III (PWA Architecture) and enable offline editing.

---

## Questions?

See [spec.md](spec.md) for full feature requirements and acceptance criteria.
