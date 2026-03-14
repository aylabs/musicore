# ADR Template Contract

**Purpose**: Defines the required structure for each Architecture Decision Record produced by this feature.

## ADR Document Structure

Each ADR MUST follow this structure. Fields marked (required) cannot be omitted.

```markdown
# ADR-049-NNN: [Title]

**Status**: [Draft | Proposed | Accepted | Superseded]  
**Date**: YYYY-MM-DD  
**Concern Area**: [Plugin Architecture | MIDI Processing | Frontend Framework | Test Strategy | Scalability]

## Context (required)

[Current situation: what exists today, including concrete metrics and code references]

## Concern (required)

[The specific question this ADR answers. One clear question.]

## Alternatives Considered (required, minimum 2)

### Alternative 1: [Name]
- **Description**: [What this entails]
- **Pros**: [List]
- **Cons**: [List]

### Alternative 2: [Name]
- **Description**: [What this entails]
- **Pros**: [List]
- **Cons**: [List]

[Additional alternatives as needed]

## Decision (required)

[What was decided and why. Reference the selected alternative.]

## Comparison Matrix (required for Framework and MIDI ADRs)

| Criterion | Weight | Option A | Option B | Option C |
|-----------|--------|----------|----------|----------|
| [criterion] | [0.0-1.0] | [1-5] | [1-5] | [1-5] |
| **Weighted Total** | | [sum] | [sum] | [sum] |

## Consequences (required)

### Positive
- [What improves]

### Negative  
- [What trade-offs are accepted]

### Neutral
- [What doesn't change]

## Risk Assessment (required)

[What could go wrong if this decision is followed. Specific scenarios.]

## Action Items (required, minimum 1)

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-NNN | [Task] | P1/P2/P3 | S/M/L/XL | [IDs or none] |
```

## ADR Numbering

| ADR ID | Concern Area |
|--------|-------------|
| ADR-049-001 | Plugin Architecture |
| ADR-049-002 | MIDI Processing Boundary |
| ADR-049-003 | Frontend Framework |
| ADR-049-004 | Test Strategy |
| ADR-049-005 | Scalability Readiness |

## Validation Rules

1. All (required) sections must be present and non-empty.
2. Alternatives Considered must have ≥ 2 entries.
3. Comparison Matrix required for ADR-049-002 and ADR-049-003.
4. Action Items must have ≥ 1 entry per ADR.
5. Risk Assessment must describe at least one specific failure scenario.
6. Written for mixed audience (FR-008): avoid unexplained jargon.
