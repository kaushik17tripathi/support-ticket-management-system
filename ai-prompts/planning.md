# Planning Prompts

## Prompt 1 — Repo scaffold

**Prompt:**

Create this exact folder and file structure for a new repo called support-ticket-management-system.
Do not generate any implementation code — just create the folders and files, each file
containing only a single top-level markdown header matching its filename (e.g.
requirements-analysis.md should just contain "# Requirement Analysis").

```text
support-ticket-management-system/
  README.md
  candidate-info.md
  tool-workflow.md
  requirements-analysis.md
  acceptance-criteria.md
  implementation-plan.md
  design-notes.md
  api-contract.md
  data-model.md
  ui-flow.md
  test-strategy.md
  test-results.md
  debugging-notes.md
  code-review-notes.md
  review-fixes.md
  pr-description.md
  reflection.md
  final-ai-usage-summary.md
  src/
  tests/
  database/
    schema-or-migrations/
    seed-data/
    setup-notes.md
  ai-prompts/
    planning.md
    design.md
    implementation.md
    testing.md
    debugging.md
    code-review.md
    documentation.md
  tool-specific/
    cursor-workflow/
      project-context.md
      spec.md
      tasks.md
      acceptance-criteria.md
      cursor-rules-or-instructions.md
```

**AI Response Summary:**

Created full folder/file tree as specified with header stubs.

**Accepted:**

All folder/file names as-is.

**Changed:**

N/A

**Rejected:**

N/A

## Prompt 2 — Requirements analysis (first pass)

**Prompt:**

I'm building a Support Ticket Management System. Here is the Core spec:

Entities:
- User (seeded only, no UI): id, name, email, role
- Ticket: id, title, description, priority, status, assignedTo, createdBy, createdAt, updatedAt
- Comment: id, ticketId, message, createdBy, createdAt

Features:
- Create/list/view/update tickets
- Change status through this state machine only:
  Open -> In Progress
  In Progress -> Resolved
  Resolved -> Closed
  Open -> Cancelled
  In Progress -> Cancelled
- Add comments to a ticket
- Keyword search + status filter
- Data persists across restarts
- Backend validation on all required fields
- Meaningful error states in UI

Write requirements-analysis.md with these sections:
## My Understanding (in my own words)
## Functional Requirements
## Non-Functional Requirements
## Assumptions
## Clarifications (questions I'd ask a product owner)
## Edge Cases

Be especially thorough on edge cases around the status state machine.

## Prompt 3 — Resolve contradictions and over-broad open questions
**Prompt:** Two issues to fix:

1. Assumption #9 and the Edge Cases > Comments section contradict each other on
whether comments are allowed on Closed/Cancelled tickets. Resolve this: comments
are BLOCKED on Closed and Cancelled tickets (terminal tickets are fully read-only,
consistent with Assumption #8). Update both sections to agree.

2. The Clarifications section has too many open questions for a scoped Core exercise.
For each of the 15 questions, either:
(a) convert it into a firm Assumption with a one-line justification, if it's
reasonable to decide now and doesn't block Core delivery, or
(b) keep it as a genuine Clarification only if it's something that would meaningfully
change the Core implementation and can't be reasonably assumed.

Specifically resolve these as firm assumptions:
- Priority enum: Low, Medium, High, Critical
- Acting user: hardcoded demo user selected via a dropdown of seeded users (no auth)
- assignedTo: optional at all times, not required to move to In Progress
- Search scope: title + description only, case-insensitive, empty query returns all
- Status filter: single status at a time
- No pagination or sorting in Core (explicitly out of scope)
- No reopening of Closed/Cancelled tickets in Core
- Roles do not gate any actions in Core

Keep only genuinely open questions in Clarifications — I expect that list to shrink
to 3-5 items max.
**AI Response Summary:**

 Fixed the comments-on-terminal-ticket contradiction (now
consistently blocked). Converted 10 of 15 clarification questions into firm
assumptions with justification; kept 5 as genuine open questions for a PO.


**Accepted:**

 The contradiction fix, and the assumption defaults as specified.


**Changed:**

 N/A — I dictated the exact values rather than letting AI guess.


**Rejected:**

 N/A


**Note:**

Caught AI mistake — first pass had a direct contradiction between
Assumption #9 and the Edge Cases section on the same rule.

## Prompt 4 — Acceptance criteria

**Prompt:**

Based on requirements-analysis.md, write acceptance-criteria.md using this template:

## Core
- [ ] ...
## Validation
- [ ] ...
## Error Handling
- [ ] ...
## Testing
- [ ] ...
## Documentation
- [ ] ...

Each item should be a single, testable, checkbox-style statement (Given/When/Then style
is fine but not required). Cover: ticket CRUD, the state machine transitions (list each
valid transition and each class of rejected transition explicitly), comments, terminal-ticket
read-only behavior, search/filter, and persistence across restart. Base every item strictly
on what's in requirements-analysis.md — don't introduce new scope.

**Accepted:**

 All


**Changed:**

 N/A 


**Rejected:**

 N/A

