# Template flow (giget)

The CLI uses **giget** to download the chosen template. There is no embedded `templates/` directory in the create-hbar repo.

## Role

- **Template = repo#branch**: Built-in names (e.g. `blank`, `dex`) are resolved to `TEMPLATE_REPO#templates/<name>` (see `src/utils/consts.ts`). Community templates use `org/repo` or `org/repo#branch` as-is.
- **Fetch**: `getTemplateSpec()` + `downloadTemplate(\`gh:${spec}\`)`in`src/tasks/copy-template-files.ts` download the template into a temp dir, then copy into the user’s project directory.
- **Dynamic list**: In interactive mode, "Which starter template?" is filled by fetching branches matching `templates/*` from the template repo (GitHub API). Fallback list is in `TEMPLATES_FALLBACK` in consts.

## See also

- `src/utils/fetch-available-templates.ts` — `getTemplateSpec()`, `fetchAvailableTemplates()`
- `src/tasks/copy-template-files.ts` — single giget path + `processTemplateManifest()`
