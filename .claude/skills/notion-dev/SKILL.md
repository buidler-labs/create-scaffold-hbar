---
name: notion-dev
description: This skill should be used when a developer wants to work on a Notion ticket from the Issue Tracking database. The user will ask to "work on [ticket name]", "pick up a ticket", "open this ticket", provide a ticket URL, or request to see available backlog items. Handles ticket loading, branch creation, iterative implementation, conventional commits, PR creation, and Notion ticket updates through completion.
---

# Notion Dev

Consume Notion tickets and execute development work through to pull request.

## Purpose

Load a Notion ticket from the Issue Tracking database, implement the work iteratively with developer feedback, manage commits with conventional format, create a PR with full traceability, and update the ticket status to "In Review".

## Workflow

### 1. Find and Load Ticket

**Three ways to find tickets:**

**Option A: By name**
```
Developer: "Work on the API response time telemetry ticket"
```
Use Notion MCP `notion-search` to find tickets by name. If multiple matches, display and ask to select.

**Option B: By URL**
```
Developer: "https://www.notion.so/317c57bf38f281ad93a2c5c01217367b"
```
Fetch directly using `notion-fetch` with the URL or ID.

**Option C: From backlog**
```
Developer: "Show me open tickets" or "What's in the backlog?"
```
Query the Issue Tracking database for all "Open" status tickets, display as list, ask which to work on.

**Once ticket is loaded, display:**

```
📋 Ticket: [Step 1] Add API response time telemetry
Priority: HIGH | Status: Open | Assigned: [name if applicable]

## Context
[Brief context from description]

## Scope
- [ ] Deliverable 1
- [ ] Deliverable 2

## Acceptance Criteria
- Measurable outcome 1
- Measurable outcome 2
```

### 2. Update Ticket Status

Immediately after loading, update the Notion ticket:
- Change **Status** from "Open" to "In progress"
- Ask for confirmation: "Starting work on this ticket. Ready? (yes/no)"

This signals to the team that the ticket is being worked on.

### 3. Create Branch

Determine branch prefix from Priority:

| Priority | Branch Prefix |
|----------|---------------|
| HIGH | `feature/` or `fix/` (based on ticket type) |
| MEDIUM | `feature/` (default) |
| LOW | `feature/` (default) |

Generate branch name from ticket title:
- Lowercase
- Replace spaces/special chars with hyphens
- Remove articles (a, the)
- Truncate to ~50 chars if needed

Example: "Add API response time telemetry" → `feature/add-api-response-time-telemetry`

```bash
git checkout -b feature/add-api-response-time-telemetry
```

**Ask confirmation:** "Creating branch `feature/add-api-response-time-telemetry`. OK? (yes/no)"

### 4. Implement Iteratively

**This is an iterative process.** Implement scope items one at a time, present changes, get developer feedback, iterate until approved.

**Implementation cycle per scope item:**

```
1. Implement next piece of scope
2. Show files changed
3. Ask: "Ready to review?"
4. Incorporate feedback OR approve and commit
5. Move to next scope item
```

**After each implementation, present:**

```
I've implemented: [description]

Files changed:
- src/middleware/timing.ts (new)
- src/index.ts (modified)

Ready to review? Let me know:
- Explain any part
- Make changes
- Continue to next scope item
- Commit this as-is
```

**Developer feedback examples:**
- "Looks good, commit it" → commit and continue
- "Can you add error handling?" → iterate on code
- "Show me the middleware file" → display code for review
- "This won't work because X" → revise approach

**Never commit without explicit approval.**

### 5. Commit with Conventional Commits

Use conventional commit format based on work type:

| Type | When to Use |
|------|-------------|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring, no behavior change |
| `docs:` | Documentation only |
| `test:` | Adding/updating tests |
| `chore:` | Dependencies, config, maintenance |

**Commit message format:**
```
<type>: <short description>

<optional body with more details>
```

**Include scope from ticket:**
```
feat: Add API response time telemetry

- Add middleware to capture request/response timing
- Emit telemetry events with endpoint, method, duration, status
```

**Ask before committing:** "Commit this? (yes/no/revise message)"

### 6. Developer Optimisation Pass

Before code review, ask developer for optimisations they noticed:

```
Before PR: Any optimisations during implementation?
- Code to extract/centralise?
- Utilities to reuse?
- Patterns to follow?
```

Implement any approved optimisations, commit separately as `refactor:`.

### 7. Final Audit

After implementation is complete:

```
📋 Final Audit

Before we proceed to PR:

1. Code Understanding:
   - Do you understand all code written?
   - Can you explain changes if asked?

2. Quality:
   - Tests passing locally?
   - Feature tested manually?

3. TODOs:
   - Any out-of-scope items discovered that need new tickets?

Paste any TODOs and ready check.
```

If developer provides TODOs:
1. Review each item
2. Ask: "Create a new ticket for this?" for each
3. Create as new "Open" tickets in Notion if approved

### 8. Final Review Before PR

Present summary for sign-off:

```
📋 Implementation Complete

Ticket: [Step 1] Add API response time telemetry

Commits:
1. feat: add timing middleware
2. feat: integrate telemetry events
3. test: add middleware tests

Scope Complete:
✅ Add middleware to capture request/response timing
✅ Emit telemetry events with endpoint, method, duration, status

PR will be titled: feat: [Step 1] Add API response time telemetry

Ready to create PR? (yes / need changes)
```

**Do not create PR until developer explicitly confirms.**

### 9. Create Pull Request

Only after developer sign-off:

```bash
git push -u origin feature/add-api-response-time-telemetry
gh pr create --title "feat: [Step 1] Add API response time telemetry" --body "..."
```

**PR title format:** Include ticket name for traceability:
```
<type>: <ticket_name>
```

**PR body:**
```markdown
## Notion Ticket
**[Step 1] Add API response time telemetry**

[Link to Notion ticket]

## Summary
[What this PR accomplishes]

## Testing
[How changes were tested]

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated if applicable
```

**Ask confirmation:** "Push branch and create PR? (yes/no)"

Capture the PR URL from output.

### 10. Update Notion Ticket

After PR is created:

```
Updating Notion ticket...
- Status: "In Review"
- Add PR link as comment
```

Ask: "Update ticket to 'In Review' and add PR link? (yes/no)"

### 11. Summary

```
✅ Work complete!

Ticket: [Step 1] Add API response time telemetry
Branch: feature/add-api-response-time-telemetry
PR: https://github.com/org/repo/pull/123
Status: In Notion as "In Review"

Ready for code review.
```

## Key Principles

- **Developer is in control** — always ask for approval before git actions
- **Never commit without approval** — developer must understand and approve all changes
- **Iterative feedback** — present changes for review, incorporate feedback, iterate
- **Explicit confirmations** — ask before branch creation, commits, push, PR creation, Notion updates
- **Clear communication** — explain changes, show affected files, discuss trade-offs

## Notion Issue Tracking Structure

Works with the Issue Tracking database:
- **Issue** (TITLE) — ticket name
- **Status** (STATUS) — Open, In progress, In review, Testing, Resolved, Won't fix
- **Priority** (SELECT) — High, Medium, Low
- **Description** (RICH_TEXT) — context, scope, acceptance criteria
- **Assigned to** (PERSON) — developer assignment
- **Due date** (DATE) — deadline

## Multiple Ticket Entry Points

Support all three methods of finding tickets:
1. **Name search** — "Work on [ticket name]"
2. **URL** — "https://www.notion.so/[ticket-id]"
3. **Backlog list** — "What's open?" or "Show me available tickets"

For backlog queries, filter to Status = "Open" and display as list with priority/assignee.

