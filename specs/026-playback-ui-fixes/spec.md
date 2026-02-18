# Feature Specification: Playback UI Fixes

**Feature Branch**: `026-playback-ui-fixes`  
**Created**: 2026-02-18  
**Status**: Draft  
**Input**: User description: "When a score playback ends, replay mixes scores and the play status is wrong. When the playback ends, we need a button to return to the start of the score. When the playback ends, the score container is larger than the web page containing it. During the playback, the label of the instrument for each system is cut because the systems container seems to be wider to the left than the web page viewport for it"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Replay Resets Cleanly (Priority: P1)

A musician finishes listening to a score and presses Replay. The score resets fully — the display returns to the beginning, the play status correctly shows "playing", and no visual content from the previous playback bleeds through. The musician experiences a clean, fresh playback start every time.

**Why this priority**: Replay state corruption breaks the core interaction loop of the app. A musician who replays a score and sees mixed or stale visual state loses trust in the app immediately. This is the most disruptive of the reported issues.

**Independent Test**: Play a score to completion, press Replay, and verify the score display shows only the start of the score with correct playing status — independently validating state reset and display correctness.

**Acceptance Scenarios**:

1. **Given** a score has played to completion, **When** the user triggers Replay, **Then** the playback status changes to "playing" and the score view returns to measure 1
2. **Given** a score has played to completion, **When** the user triggers Replay, **Then** no visual elements from the previous playback remain visible during the new playback
3. **Given** a score is replayed multiple times consecutively, **When** each replay completes, **Then** each subsequent replay starts with the same clean initial state

---

### User Story 2 - Instrument Labels Always Visible (Priority: P2)

A musician plays back a score with multiple instruments (e.g., piano and violin). During playback, scrolling through the systems, the instrument name label on the left side of each system is always fully readable — it is never clipped, hidden, or pushed outside the viewport.

**Why this priority**: This bug is visible throughout the entire playback session. Every system in every score with multiple instruments is affected, making it a pervasive visual defect that degrades the reading experience constantly.

**Independent Test**: Load any multi-instrument score and start playback. Verify all instrument labels on the left of each system are fully visible and not clipped — no other changes needed beyond the layout fix.

**Acceptance Scenarios**:

1. **Given** a score with multiple instruments is displayed, **When** playback begins, **Then** all instrument name labels on the left of each system are fully visible without horizontal clipping
2. **Given** the score scrolls during playback to reveal later systems, **When** each new system appears, **Then** its instrument label is fully visible
3. **Given** a score is displayed on a narrow viewport (tablet or mobile), **When** playback is active, **Then** instrument labels remain fully visible without being cut off

---

### User Story 3 - Return to Start Button (Priority: P3)

A musician finishes listening to a score and wants to read from the beginning before playing again. They press a "Return to Start" button and the score view immediately scrolls back to measure 1 without starting playback. The playback status shows stopped and the score is ready for a fresh play.

**Why this priority**: This is a quality-of-life feature that completes the natural end-of-playback flow. Without it, the musician must manually scroll back to the beginning. It pairs directly with the replay fix (P1) but adds a distinct non-playing "reset view" capability.

**Independent Test**: Play a score to completion, press "Return to Start", and verify the view resets to measure 1 with playback stopped — no audio plays, only the view resets.

**Acceptance Scenarios**:

1. **Given** playback has ended, **When** the user presses "Return to Start", **Then** the score view scrolls to measure 1 and playback remains stopped
2. **Given** playback has ended, **When** the user presses "Return to Start", **Then** the playback position indicator resets to the beginning
3. **Given** the user is mid-score during playback, **When** the user presses "Return to Start", **Then** playback stops and the view returns to measure 1

---

### User Story 4 - Score Container Fits Viewport After Playback (Priority: P4)

A musician's score has finished playing. The score container fits within the page — there is no overflow, no unexpected scrollbar appears, and the layout looks the same as when the score was first loaded.

**Why this priority**: This is a visual layout regression that only appears after playback ends. While it does not break functionality, it leaves the page in a broken-looking state. It is lower priority than the constant label clipping (P2) because it only occurs at end-of-playback.

**Independent Test**: Play any score to completion and inspect the page layout — verify the score container does not extend beyond the page boundaries and no unexpected overflow exists.

**Acceptance Scenarios**:

1. **Given** a score has finished playing, **When** playback ends, **Then** the score container dimensions do not exceed the viewport width or height
2. **Given** a score has finished playing, **When** the user inspects the page, **Then** no horizontal or vertical overflow is introduced by the score container
3. **Given** playback ends and the user presses "Return to Start", **When** the view resets, **Then** the score container remains correctly sized within the viewport

---

### Edge Cases

- What happens when playback is stopped manually mid-score and then Replay is pressed — does it also reset cleanly?
- How does the system handle a score with only one instrument — are single-instrument label and container layout correct?
- What happens on very short scores (1-2 measures) where playback ends almost immediately after starting?
- How does "Return to Start" behave if pressed while the score is already at measure 1?
- Does the container overflow bug compound with the label clipping bug — do both fixes need to be applied together or are they independent?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When playback ends naturally (last note played), the playback status MUST reflect a stopped or ended state — not an intermediate or playing state
- **FR-002**: When Replay is triggered after playback ends, the system MUST fully reset playback state before starting the new session — no residual visual or state data from the previous session may persist
- **FR-003**: After playback ends, a "Return to Start" control MUST be available that resets the score view to measure 1 without initiating playback
- **FR-004**: "Return to Start" MUST also function during active playback, stopping playback and repositioning the view to measure 1
- **FR-005**: The score container MUST NOT exceed the viewport boundaries at any point during or after playback
- **FR-006**: Instrument name labels on the left side of each system MUST be fully visible within the viewport during playback — the systems layout container MUST NOT extend beyond the left viewport edge causing label clipping
- **FR-007**: All layout and state fixes MUST apply consistently across single-instrument and multi-instrument scores
- **FR-008**: All fixes MUST apply on both desktop and mobile or tablet viewport sizes

### Key Entities

- **PlaybackState**: Tracks whether audio is playing, stopped, or ended; the current position within the score; and whether a reset has been applied
- **ScoreContainer**: The DOM region displaying the rendered score systems; its dimensions must remain bounded by the viewport at all times
- **SystemRow**: A single horizontal line of notation containing staves for all instruments at a given point in the score
- **InstrumentLabel**: The text name of an instrument displayed to the left of each system row; must never be clipped by viewport overflow
- **PlaybackControls**: The UI element set containing Play, Stop, Replay, and the new Return-to-Start button

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Replay after end-of-playback produces a clean start 100% of the time — zero occurrences of mixed or stale score content visible after pressing Replay
- **SC-002**: All instrument labels are fully visible during playback in 100% of test cases across single- and multi-instrument scores on all supported viewport sizes
- **SC-003**: The score container dimensions remain within the viewport bounds 100% of the time — measured before, during, and after playback
- **SC-004**: "Return to Start" button is reachable and functional within 1 interaction (single tap or click) after playback ends
- **SC-005**: Pressing "Return to Start" repositions the score view in under 300 milliseconds with no visible layout jitter

## Assumptions

- The app already has Play and Stop controls; "Return to Start" is an additive control placed alongside these
- "Replay" refers to the existing replay action already present in the playback controls
- The instrument label clipping is caused by the systems container having an incorrect left offset that pushes content outside the left viewport edge — this is a layout fix, not a data issue
- The score container overflow after playback is caused by a dimension or scroll position not being reset when playback ends, not by content actually growing in size
- "Return to Start" does not need to animate the scroll — an instant or fast scroll is acceptable
