# Template flow (giget)

The CLI uses **giget** to download the chosen template. There are **no embedded templates** in the create-hbar repo and **no extension system**. Template content lives in the template repo as **branch names** (e.g. `templates/blank-template`, `templates/hts-nft`).

## Flow

- **Template = branch name**: A built-in key (e.g. `blank`, `hts-nft`) is resolved to `TEMPLATE_REPO#templates/<branch>` (see `getTemplateSpec()` in `src/utils/fetch-available-templates.ts`). The `blank` key maps to branch `templates/blank-template`. Community templates use `org/repo` or `org/repo#branch` as-is.
- **List from GitHub API**: In interactive mode, the "Which starter template?" prompt is filled by calling the GitHub API (matching-refs for `templates/*`). If the request fails (e.g. offline), a **fallback list** from `TEMPLATES_FALLBACK` in `src/utils/consts.ts` is used.
- **Fetch**: `getTemplateSpec()` and `downloadTemplate(gh:spec)` in `src/tasks/copy-template-files.ts` download the template into a temp dir, then copy into the user's project directory. No `.template.mjs` / `.args.mjs` processing—templates are plain files on the branch.

## See also

- `src/utils/fetch-available-templates.ts` — `getTemplateSpec()`, `fetchAvailableTemplates()`
- `src/tasks/copy-template-files.ts` — giget download + `processTemplateManifest()`
