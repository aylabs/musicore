# API Contracts: Playback Scroll and Highlight

**Feature**: 009-playback-scroll-highlight  
**Status**: No API changes required

---

## Summary

This feature is **frontend-only** with no backend API modifications. All functionality is implemented as presentation layer logic that coordinates existing playback state with notation display.

---

## Rationale

**Why no API changes?**

1. **Presentation Layer Feature**: Scroll and highlight are pure view concerns - they visualize existing domain data without modifying it

2. **Existing Data Sufficient**: All required information already available:
   - Current playback tick: `MusicTimeline.currentTick` (Feature 003)
   - Note data: Score API already provides notes with `start_tick` and `duration_ticks`
   - Layout coordinates: NotationLayoutEngine already calculates pixel positions

3. **No Domain Model Changes**: 
   - No new entities, value objects, or aggregates
   - No modifications to Score, Note, or Timeline domain models
   - Scroll/highlight state is ephemeral view state (not persisted)

4. **Architecture Compliance**:
   - Maintains hexagonal architecture (presentation adapters only)
   - Preserves API-first development (no contract coupling)
   - No backend deployment required for feature release

---

## Integration Points

While no _new_ API contracts exist, the feature leverages these _existing_ contracts:

### GET /api/scores/{id}

**Existing Response** (no changes):
```json
{
  "id": "score-123",
  "title": "Example Score",
  "voices": [
    {
      "id": "voice-1",
      "interval_events": [
        {
          "id": "note-1",
          "pitch": 60,
          "start_tick": 0,
          "duration_ticks": 960
        }
      ]
    }
  ],
  "tempo": 120
}
```

**Usage by Feature**:
- `notes[].start_tick`: Used by NoteHighlightService to identify playing notes
- `notes[].duration_ticks`: Used to calculate note end time for highlighting
- `tempo`: Already used by playback (Feature 003), scroll adapts via currentTick

### Playback State (Client-Side, No API)

**MusicTimeline Hook State**:
```typescript
interface PlaybackState {
  currentTick: number;        // Used to calculate scroll position
  status: PlaybackStatus;     // Controls when scroll/highlight are active
  // ... other state
}
```

This state is managed entirely client-side. No server communication required during playback.

---

## Future Considerations

If feature requirements change to include server-side functionality, potential API additions could be:

### Hypothetical: Scroll Position Persistence (Not in Current Scope)

```typescript
// POST /api/users/{userId}/preferences/scroll
{
  "scoreId": "score-123",
  "scrollPosition": 0.3,        // Target position ratio
  "autoScrollEnabled": true
}

// GET /api/users/{userId}/preferences/scroll/{scoreId}
{
  "scrollPosition": 0.3,
  "autoScrollEnabled": true
}
```

**Note**: This is _not_ part of the current feature specification. Scroll preferences are not persisted.

---

## Validation

**Contract Test Requirement**: None

Since no API contracts are modified or added, no contract tests are required for this feature. Integration tests verify client-side behavior only.

**Existing Contract Tests**: Continue to pass without modification (backward compatible).

---

## Summary

✅ No API contract changes  
✅ No backend deployment required  
✅ No contract test updates needed  
✅ Feature entirely self-contained in frontend

This directory exists for completeness in following the `/speckit.plan` workflow template but contains no actual contract specifications.
