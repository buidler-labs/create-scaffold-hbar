---
name: notion-plan-to-tickets
description: This skill should be used when the user has an implementation plan (from Claude planning agent or explicit breakdown) and wants to create tickets in the Notion Issue Tracking database. The user will ask to "push plan to board", "create tickets for this plan", "add these tasks to Notion", or provide a plan that needs to be converted into actionable tickets.
---

# Notion Plan to Tickets

Convert implementation plans into actionable Notion tickets and push them to the Issue Tracking board.

## Purpose

Take a structured implementation plan from the chat context and break it down into discrete work items. Generate Notion tickets with complete context, estimates, priority, and status, then present them for user approval before creation.

## Workflow

### 1. Parse the Implementation Plan

Extract from the chat context:
- **Plan name/title** — what is this plan called?
- **Discrete work units** — individual tasks/features/fixes
- **Dependencies** — which tasks block others?
- **Complexity indicators** — simple config, new API endpoint, refactor, etc.

Look for:
- Numbered steps or "Step X" language
- "before/after" or "first/then" dependencies
- Scope boundaries (what's in/out)

If no plan exists, ask user: "What's the implementation plan? (Can be prose, outline, or explicit list)"

### 2. Chunk into Tickets

Break the plan into logically independent units suitable for a single developer:
- One coherent change per ticket
- Reviewable and completable in one session
- Clear scope and acceptance criteria

**Dependency signals:**
- Schema changes → code that uses them
- API creation → client code that calls it
- Shared utilities → features that import them
- Same step number = can work in parallel

### 3. Generate Ticket Details

For each ticket, determine:

| Field | How to Determine |
|-------|------------------|
| **Issue** (title) | Clear action: "Add API endpoint for X", "Refactor Y module", "Fix Z bug" |
| **Description** | Markdown with context, scope, technical notes, acceptance criteria |
| **Priority** | ASAP (blocker), HIGH (critical path), MEDIUM (standard), LOW (nice-to-have) |
| **Status** | Always "Open" initially (ready for dev to start) |
| **Assigned to** | *(Optional)* User ID if known from context; ask if needed: "Who should these be assigned to?" |
| **Due date** | Calculate based on priority and total duration (see Duration Heuristics) |

### 4. Duration Estimation

Estimate in minutes per ticket:

| Task Type | Duration |
|-----------|----------|
| Config/env var change | 15-30 min |
| Simple bug fix | 30-60 min |
| Add/modify single function | 30-60 min |
| New utility/helper module | 60-90 min |
| API endpoint (simple) | 60-90 min |
| API endpoint (complex) | 120-180 min |
| New component/service | 120-240 min |
| Integration with external service | 180-300 min |
| Database migration | 60-120 min |
| Refactor (small scope) | 60-90 min |
| Refactor (large scope) | 180-300 min |

Adjust based on codebase familiarity and complexity signals in the plan.

### 5. Present for Approval

Display all tickets in table format before creating:

```
Plan: "User Authentication Flow"

| # | Name | Priority | Duration | Notes |
|---|------|----------|----------|-------|
| 1 | [Step 1] Schema migration | HIGH | 60 min | Blocks #2, #3 |
| 2 | [Step 2] Implement server auth middleware | HIGH | 90 min | Parallel with #3 |
| 3 | [Step 2] Install/wire UI component | HIGH | 60 min | Parallel with #2 |
| 4 | [Step 3] E2E tests | MEDIUM | 120 min | Depends on #2, #3 |
```

**Step numbering:**
- Same step = parallelizable
- Higher step = blocked by all lower steps

Ask for confirmation: "Plan: **{Plan Name}**. Ready to create these {N} tickets in Notion? (yes/no/edit)"

### 6. Create in Notion via MCP

After approval, use `notion-create-pages` for each ticket in the Issue Tracking database.

**Data source ID for Issue Tracking:** `2ffc57bf-38f2-8005-9014-000b246b2211`

**Properties to set:**
```json
{
  "Issue": "ticket title",
  "Description": "markdown content",
  "Priority": "High" | "Medium" | "Low",
  "Status": "Open",
  "Assigned to": "[user id]",
  "date:Due date:start": "YYYY-MM-DD",
  "date:Due date:is_datetime": 0
}
```

**Notes:**
- **Status is always "Open"** — ready for development to start
- **Priority values** must match the Notion SELECT options exactly: "High", "Medium", "Low"
- **Assigned to** expects a user ID (JSON array); ask user if assignment needed
- **Due date** is optional but recommended for HIGH priority; calculate from duration heuristics

### 7. Confirm Creation

After all tickets created, display confirmation:

```
✅ Tickets created in Notion!

Plan: User Authentication Flow
Tickets: 4
Status: All set to "Open"
Assigned: [names if applicable]

View in Notion: https://www.notion.so/[database-url]
```

## Ticket Description Template

Use this structure for ticket descriptions:

```markdown
## Context
[Why this work exists, background from the implementation plan]

## Scope
- [ ] [Specific deliverable 1]
- [ ] [Specific deliverable 2]
- [ ] [Specific deliverable 3]

## Out of Scope
[Explicitly what this ticket does NOT cover]

## Technical Notes
[Implementation hints, relevant files, dependencies, any blockers to note]

## Acceptance Criteria
- [Measurable outcome 1]
- [Measurable outcome 2]
```

## Notion Issue Tracking Structure

Assumes the Issue Tracking database with these properties:
- **Issue** (TITLE) — ticket name
- **Status** (STATUS) — Backlog, Open, In progress, In review, Testing, Resolved, Won't fix
- **Priority** (SELECT) — High, Medium, Low
- **Assigned to** (PERSON) — developer assignment
- **Due date** (DATE) — deadline
- **Created time** (CREATED_TIME) — auto-set

## Key Principles

- **Status always "Open"** — tickets are ready for work immediately
- **Present before creating** — user approves scope before Notion is modified
- **Flexible naming** — ticket names can be simple or include plan/step prefixes, adapt to context
- **Clear dependencies** — help developers understand the sequence (step numbers, blocking relationships)
- **Estimation included** — due dates set based on realistic duration estimates

