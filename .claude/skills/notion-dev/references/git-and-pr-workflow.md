# Git and PR Workflow Reference

## Branch Naming Convention

Format: `{prefix}/{kebab-case-title}`

**Prefixes by ticket priority:**

| Priority | Prefix | Example |
|----------|--------|---------|
| HIGH | `feature/` or `fix/` | `feature/add-api-endpoint` |
| MEDIUM | `feature/` | `feature/improve-logging` |
| LOW | `feature/` | `feature/update-docs` |

**Creating branch name from ticket title:**

1. Take ticket title: "Add API response time telemetry"
2. Lowercase and replace spaces: "add-api-response-time-telemetry"
3. Remove special characters, keep hyphens
4. Truncate if >50 chars (rare)
5. Add prefix: `feature/add-api-response-time-telemetry`

## Conventional Commits

**Format:**
```
<type>: <short description>

<optional body>
```

**Types:**
- `feat:` — New feature or capability
- `fix:` — Bug fix
- `refactor:` — Code restructuring, no behavior change
- `docs:` — Documentation only
- `test:` — Tests added or updated
- `chore:` — Dependencies, config, maintenance
- `perf:` — Performance improvement

**Examples:**

```
feat: Add API response time telemetry

- Add middleware to capture request/response timing
- Emit telemetry events with endpoint, method, duration, status
```

```
fix: Handle null values in telemetry processor
```

```
refactor: Extract timing logic to separate module
```

## Git Commands

**Create and switch to branch:**
```bash
git checkout -b feature/add-api-response-time-telemetry
```

**Commit (with developer approval):**
```bash
git commit -m "feat: Add API response time telemetry"
```

**Push (after developer approval):**
```bash
git push -u origin feature/add-api-response-time-telemetry
```

**Create PR (after developer approval):**
```bash
gh pr create --title "feat: [Step 1] Add API response time telemetry" --body "..."
```

## PR Title and Description

**Title format:**
```
<type>: <ticket name or description>
```

Examples:
- `feat: [Step 1] Add API response time telemetry`
- `fix: Handle null values in response processor`
- `refactor: Extract timing middleware to separate module`

**Body template:**

```markdown
## Notion Ticket
**[Step 1] Add API response time telemetry**

[Link to Notion: https://www.notion.so/...]

## Summary
Adds middleware to capture and emit telemetry for API response times, enabling performance monitoring and bottleneck identification.

## Changes
- Add timing middleware in `src/middleware/timing.ts`
- Integrate telemetry events in `src/telemetry/events.ts`
- Add middleware tests in `src/__tests__/timing.test.ts`

## Testing
- Manual testing of middleware on sample endpoints
- Unit tests passing locally
- No breaking changes to existing APIs

## Checklist
- [x] Code follows project conventions
- [x] Tests added/updated
- [x] Documentation updated (if applicable)
```

## Confirmation Prompts

Always ask for confirmation before:

1. **Creating branch:** "Creating branch `feature/add-api-response-time-telemetry`. OK? (yes/no)"
2. **Committing:** "Commit this? (yes/no/revise message)"
3. **Pushing:** "Push branch and create PR? (yes/no)"
4. **Updating Notion:** "Update ticket to 'In Review' and add PR link? (yes/no)"

Never skip confirmations. Developer is in control.

## Updating Notion Ticket

After PR is created:

1. Change Status from "In progress" to "In Review"
2. Add comment with PR link

Use `notion-update-page` to update status:

```json
{
  "page_id": "[ticket-page-id]",
  "command": "update_properties",
  "properties": {
    "Status": "In Review"
  }
}
```

Use `notion-create-comment` to add PR link:

```json
{
  "page_id": "[ticket-page-id]",
  "rich_text": [
    {
      "text": {
        "content": "PR: https://github.com/org/repo/pull/123"
      }
    }
  ]
}
```

## Multi-Commit Workflow

For larger tickets, create multiple commits as logical units:

```
Ticket: [Step 1] Add API response time telemetry

Commit 1: feat: Add timing middleware
Commit 2: feat: Integrate telemetry events
Commit 3: test: Add middleware tests
```

Each commit is atomic and makes sense independently. All pushed in same PR.

