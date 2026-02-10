# Manual Testing Checklist - Feature 014

**Branch**: `014-remove-edit-ui`  
**Date**: 2026-02-10  
**Purpose**: Verify UI removal and preserved functionality

---

## Test Environment Setup

```bash
cd frontend
npm run dev
# Open http://localhost:5173 in browser
```

---

## Test Scenarios

### ✅ Scenario 1: Landing Page (No Score Loaded)

**Expected Result**: Streamlined landing showing only Demo and Import options

- [ ] Open app with no score loaded
- [ ] Verify **Demo** button is visible
- [ ] Verify **Import Score** button is visible
- [ ] Verify **NO "Load Score" button** appears (removed from landing page)
- [ ] Verify **NO "New Score" button** appears
- [ ] Landing page is clean and uncluttered with only 2 buttons

**Screenshot**: Attach screenshot of landing page

---

### ✅ Scenario 2: Demo Onboarding

**Expected Result**: Demo loads and plays without editing clutter

- [ ] Click **Demo** button
- [ ] Demo score loads successfully
- [ ] Music auto-plays (if first-time user)
- [ ] Stacked view mode active
- [ ] Verify **NO "New Score" button** in header
- [ ] Verify **NO "Save" button** in header
- [ ] Verify **NO filename input** field in header
- [ ] Verify **Load** button IS present
- [ ] Verify **Import** button IS present
- [ ] Playback controls work (play/pause/tempo)

**Screenshot**: Attach screenshot of demo score view

---

### ✅ Scenario 3: Import MusicXML File

**Expected Result**: File import works, score displays without editing UI

- [ ] Click **Import Score** button
- [ ] Select a valid MusicXML file (e.g., test fixture from `fixtures/`)
- [ ] Score imports successfully
- [ ] Instruments and staves render correctly
- [ ] Verify **NO "Add Voice" buttons** on staffs
- [ ] Verify **NO "Add Staff" buttons** on instruments
- [ ] Verify **NO "Add Note" buttons** in note displays
- [ ] Verify **NO "Add Instrument" control** (no input field or button)
- [ ] Verify **NO "Save" button** in header
- [ ] Verify **NO filename input** field

**Screenshot**: Attach screenshot of imported score

---

### ✅ Scenario 4: Playback Functionality

**Expected Result**: All playback features work normally

- [ ] Load demo or import a score
- [ ] Click **Play** button
- [ ] Music plays correctly
- [ ] Click **Pause** button
- [ ] Music pauses correctly
- [ ] Adjust **Tempo** slider
- [ ] Tempo change applies correctly
- [ ] Toggle **Metronome**
- [ ] Metronome clicks audible
- [ ] Verify score auto-scrolls during playback (Feature 009)

---

### ✅ Scenario 5: View Mode Switching

**Expected Result**: Both view modes render without editing UI

- [ ] Load demo or import a score
- [ ] Verify starts in **Stacked** view mode (if demo) or **Individual** (if imported)
- [ ] Switch to **Individual** view
- [ ] All instruments expand correctly
- [ ] Verify **NO "Add Voice" buttons**
- [ ] Verify **NO "Add Staff" buttons**
- [ ] Switch to **Stacked** view
- [ ] All staves stack correctly
- [ ] Grand staff grouping works (if applicable)

---

### ✅ Scenario 6: Keyboard Shortcuts (Removed)

**Expected Result**: Editing shortcuts do nothing, no errors

- [ ] Load demo or import a score
- [ ] Press **Ctrl+S** (or Cmd+S on Mac)
- [ ] EXPECTED: Nothing happens, no download prompt
- [ ] Press **Ctrl+N** (or Cmd+N on Mac)
- [ ] EXPECTED: Nothing happens, no new score created
- [ ] Press **Ctrl+O** (or Cmd+O on Mac)
- [ ] EXPECTED: Nothing happens
- [ ] Verify no console errors appear

---

### ✅ Scenario 7: Browser Refresh (No Unsaved Warning)

**Expected Result**: No beforeunload warning when leaving page

- [ ] Load demo or import a score
- [ ] Attempt to refresh page (Ctrl+R or Cmd+R)
- [ ] EXPECTED: Page refreshes immediately, NO unsaved changes warning
- [ ] Attempt to close tab
- [ ] EXPECTED: Tab closes immediately, NO warning dialog

---

## Regression Testing

### ✅ Core Features Preserved

- [ ] **File Loading**: Load button and file picker work
- [ ] **MusicXML Import**: ImportButton component functional  
- [ ] **Demo Onboarding**: demoLoader service works
- [ ] **Notation Rendering**: Staff notation displays correctly
- [ ] **Chord Symbols**: Chord symbols render (if present in score)
- [ ] **Tempo Display**: Tempo events show in score
- [ ] **Time Signature**: Time signature displays correctly

---

## Test Results

**Test Date**: ___________________  
**Tested By**: ___________________  
**Browser**: ___________________  
**OS**: ___________________  

**Overall Status**: [ ] PASS  [ ] FAIL

**Issues Found**:
- [ ] Issue 1: _______________________________________________
- [ ] Issue 2: _______________________________________________
- [ ] Issue 3: _______________________________________________

**Notes**:
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________

---

## Next Steps

If all tests pass:
- ✅ Mark T019 complete in tasks.md
- ✅ Proceed to T020 (Deploy to GitHub Pages)
- ✅ Proceed to T021 (Quickstart validation)

If any tests fail:
- ❌ Document failures in this checklist
- ❌ Create GitHub issue with reproduction steps
- ❌ Fix issues and re-test
