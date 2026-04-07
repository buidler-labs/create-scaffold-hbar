# Template flow (giget)

The CLI uses **giget** to download the chosen template. There are **no embedded templates** in the create-scaffold-hbar repo and **no extension system**. Template content lives in the template repo as **branch names** (e.g. `templates/blank-template`, `templates/payments-scheduler`).

## Flow

- **Template = branch name**: A built-in key (e.g. `blank`, `payments-scheduler`) is resolved to `https://github.com/buidler-labs/scaffold-hbar#templates/<branch>` (see `getTemplateSpec()` in `src/utils/fetch-available-templates.ts`). The `blank` key maps to branch `templates/blank-template`. Community templates use `org/repo` or `org/repo#branch` as-is.
- **List from GitHub API**: In interactive mode, the "Which starter template?" prompt is filled by calling the GitHub API (matching-refs for `templates/*`). If the request fails (e.g. offline), a **fallback list** from `TEMPLATES_FALLBACK` in `src/utils/consts.ts` is used.
- **Fetch**: `getTemplateSpec()` and `downloadTemplate(gh:spec)` in `src/tasks/copy-template-files.ts` download the template into a temp dir, then copy into the user's project directory.

## `template.json` — custom outro

Optional `create-scaffold-hbar.outro.steps` is a non-empty array of lines inserted **after** the shared header (`Congratulations`, `cd`, optional install hint) and **before** the closing thanks line. It **replaces** the default contract/frontend-specific middle section when present.

- **`+` prefix**: render the rest of the line in bold.
- **`{run:script}`**: expanded to the correct package-manager command (e.g. `{run:start}` → `yarn start`, `npm run start`, `pnpm start`).

Omit `outro` to keep the standard Scaffold-HBAR next-steps text.

## See also

- `src/utils/fetch-available-templates.ts` — `getTemplateSpec()`, `fetchAvailableTemplates()`
- `src/tasks/copy-template-files.ts` — giget download + `processTemplateManifest()`
