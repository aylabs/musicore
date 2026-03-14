# Data Model: Architecture Review

**Feature**: 049-architecture-review  
**Date**: 2026-03-13

## Overview

This feature produces documentation artifacts (ADRs), not runtime data structures. The "data model" defines the structure of ADR documents and the roadmap entity.

---

## Entities

### Architecture Decision Record (ADR)

One document per concern area. Five total.

| Field | Type | Description |
|-------|------|-------------|
| id | string | ADR identifier (e.g., "ADR-049-001") |
| title | string | Concern area name |
| status | enum | Draft → Proposed → Accepted → Superseded |
| date | date | Decision date |
| context | text | Current situation and problem statement |
| concern | text | Specific architectural question being addressed |
| alternatives | Alternative[] | Options considered (minimum 2) |
| decision | text | What was decided |
| consequences | text | Trade-offs accepted, risks identified |
| action_items | ActionItem[] | Concrete follow-up tasks |
| risk_assessment | text | What could go wrong if this decision is followed |

### Alternative

An option evaluated within an ADR.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Alternative name |
| description | text | What this alternative entails |
| pros | string[] | Advantages |
| cons | string[] | Disadvantages |
| selected | boolean | Whether this alternative was chosen |

### ActionItem

A concrete task resulting from an ADR.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Action item identifier (e.g., "AI-049-001") |
| adr_id | string | Parent ADR reference |
| description | text | What needs to be done |
| priority | enum | P1 (immediate), P2 (next cycle), P3 (backlog) |
| effort | enum | S (< 1 day), M (1-3 days), L (1-2 weeks), XL (> 2 weeks) |
| dependencies | string[] | Other action item IDs that must complete first |

### ComparisonMatrix

Used for framework and MIDI boundary decisions.

| Field | Type | Description |
|-------|------|-------------|
| criteria | Criterion[] | Evaluation criteria with weights |
| candidates | Candidate[] | Options being compared |
| scores | number[][] | Score per candidate per criterion (1-5) |
| weighted_totals | number[] | Weighted sum per candidate |

### Criterion

| Field | Type | Description |
|-------|------|-------------|
| name | string | Criterion name (e.g., "Plugin coupling", "Bundle size") |
| weight | number | Relative importance (0.0-1.0, total = 1.0) |

### Roadmap

| Field | Type | Description |
|-------|------|-------------|
| items | RoadmapItem[] | Prioritized list of improvements |

### RoadmapItem

| Field | Type | Description |
|-------|------|-------------|
| rank | number | Priority order (1 = highest) |
| action_item_id | string | Reference to originating ActionItem |
| title | string | Short description |
| impact | enum | High, Medium, Low |
| effort | enum | S, M, L, XL |
| planning_cycle | number | Target cycle (1, 2, or 3) |

---

## Relationships

```
ADR (5 instances)
├── Alternative[] (2+ per ADR)
├── ActionItem[] (1+ per ADR)
│   └── RoadmapItem (1:1 mapping for prioritized items)
└── ComparisonMatrix (optional, for framework and MIDI ADRs)
```

## Validation Rules

- Each ADR must have at least 2 alternatives.
- Each ADR must have at least 1 action item.
- Each action item must reference a valid ADR.
- ComparisonMatrix criteria weights must sum to 1.0.
- Roadmap items must reference existing action items.
- ADR status transitions: Draft → Proposed → Accepted (or Superseded).
