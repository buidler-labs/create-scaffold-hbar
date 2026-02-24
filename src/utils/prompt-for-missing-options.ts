/**
 * TODO (Prompt 3): Replace this stub with the full @clack/prompts implementation.
 *
 * Current state: stub that falls back to DEFAULT_OPTIONS for every missing field
 * so the project compiles while the interactive prompt work is in progress.
 *
 * The final implementation must use p.group() with these prompts:
 *   1. project name   — p.text, validated with validate-npm-package-name
 *   2. template       — p.select, from TEMPLATES const
 *   3. frontend       — p.select, from FRONTENDS const
 *   4. solidityFramework — p.select, from SOLIDITY_FRAMEWORK_OPTIONS const
 *   5. wallet         — p.multiselect, hidden when frontend === 'none'
 *   6. network        — p.select, from NETWORKS const
 *   7. packageManager — p.select, initial from detectPackageManager()
 *   8. install        — p.confirm, default true
 */
import { Options, RawOptions, SolidityFramework } from "../types";
import { DEFAULT_OPTIONS } from "./consts";

export function promptForMissingOptions(options: RawOptions): Promise<Options> {
  const project = options.project ?? DEFAULT_OPTIONS.project;
  const template = options.template ?? DEFAULT_OPTIONS.template;
  const frontend = options.frontend ?? DEFAULT_OPTIONS.frontend;
  const wallet = options.wallet ?? [...DEFAULT_OPTIONS.wallet];
  const network = options.network ?? DEFAULT_OPTIONS.network;
  const packageManager = options.packageManager ?? DEFAULT_OPTIONS.packageManager;
  const install = options.install;
  const dev = options.dev ?? false;
  const externalExtension = options.externalExtension ?? null;

  const rawFramework = options.solidityFramework ?? DEFAULT_OPTIONS.solidityFramework;
  const solidityFramework: SolidityFramework | null = rawFramework === "none" ? null : rawFramework;

  const mergedOptions: Options = {
    project,
    template,
    frontend,
    wallet,
    network,
    packageManager,
    install,
    dev,
    externalExtension,
    solidityFramework,
  };

  return Promise.resolve(mergedOptions);
}
