# Notion MCP Reference for Plan-to-Tickets Skill

Quick reference for creating pages in Notion Issue Tracking database.

## Database Info

**Database:** Issue Tracking
**Data Source ID:** `2ffc57bf-38f2-8005-9014-000b246b2211`
**Workspace:** Buidler Labs

## Creating Tickets

Use `notion-create-pages` tool with parent data source:

```json
{
  "parent": {
    "data_source_id": "2ffc57bf-38f2-8005-9014-000b246b2211"
  },
  "pages": [
    {
      "properties": {
        "Issue": "Ticket title here",
        "Description": "## Context\nTicket description in markdown",
        "Priority": "High",
        "Status": "Open",
        "Assigned to": "[user-id-json-array]",
        "date:Due date:start": "2026-03-15",
        "date:Due date:is_datetime": 0
      }
    }
  ]
}
```

## Property Field Mappings

| Notion Field | Type | Possible Values | Notes |
|--------------|------|-----------------|-------|
| Issue | TITLE | (any string) | Primary ticket name |
| Description | RICH_TEXT | (markdown string) | Multi-line context |
| Priority | SELECT | "High", "Medium", "Low" | Must match exactly |
| Status | STATUS | "Backlog", "Open", "In progress", "In review", "Testing", "Resolved", "Won't fix" | Always "Open" for new tickets |
| Assigned to | PERSON | User ID (JSON array format) | Optional; ask user if needed |
| Due date | DATE | "YYYY-MM-DD" format | Use `date:Due date:start` |
| Created time | CREATED_TIME | (auto-set) | Do not include in creation |

## Date Properties

For dates, use expanded format:

```json
"date:Due date:start": "2026-03-15",
"date:Due date:is_datetime": 0
```

- `start`: ISO date string (YYYY-MM-DD)
- `is_datetime`: 0 for date-only, 1 for date+time
- `end`: omit unless it's a date range

## Searching/Querying Existing Tickets

Use `notion-search` to find tickets:

```
Search query: "ticket name" or "keyword"
Filters by: Title, description content
```

Query all Open tickets for backlog display:

```
notion-search with filter for Status = "Open"
```

## Batch Creation

Multiple tickets in one call:

```json
{
  "parent": {"data_source_id": "2ffc57bf-38f2-8005-9014-000b246b2211"},
  "pages": [
    {
      "properties": {
        "Issue": "First ticket",
        ...
      }
    },
    {
      "properties": {
        "Issue": "Second ticket",
        ...
      }
    }
  ]
}
```

All in the same call = faster, cleaner than individual calls.

## User IDs (for Assigned to)

Assigned to field expects JSON array of user IDs:

```json
"Assigned to": "[\"user-id-here\"]"
```

To get user IDs:
- Use `notion-get-users` tool to list workspace members
- Returns user ID and email
- Ask user: "Who should tickets be assigned to?" and get IDs from list

## Common Errors

**Priority field rejected:**
- Check exact casing: "High", "Medium", "Low" (capital H/M/L)

**Assigned to field rejected:**
- Must be JSON array format: `["user-id"]`
- User ID must exist in workspace

**Date format error:**
- Use ISO format: "YYYY-MM-DD"
- Include `is_datetime`: 0 for dates

