import * as p from "@clack/prompts";
import type { Frontend, Network, Options, PackageManager, RawOptions, SolidityFramework, Wallet } from "../types";
import {
  DEFAULT_OPTIONS,
  EXIT_CODES,
  FRONTENDS,
  NETWORKS,
  PACKAGE_MANAGERS,
  SOLIDITY_FRAMEWORK_OPTIONS,
  TEMPLATES,
  WALLETS,
} from "./consts";
import { detectPackageManager } from "./parse-arguments-into-options";
import { validateNpmName } from "./validate-name";

/**
 * Interactively prompts the user for any options not already set via CLI flags.
 * Uses @clack/prompts p.group() so a single Ctrl-C cancels the entire flow.
 * When a value is already present in `rawOptions`, the corresponding prompt
 * is silently skipped and the pre-supplied value is used.
 */
export async function promptForMissingOptions(rawOptions: RawOptions): Promise<Options> {
  const answers = await p.group(
    {
      project: () => {
        if (rawOptions.project != null) return Promise.resolve(rawOptions.project);
        return p.text({
          message: "What is your project name?",
          placeholder: DEFAULT_OPTIONS.project,
          defaultValue: DEFAULT_OPTIONS.project,
          validate(value) {
            if (!value.trim()) return "Project name cannot be empty.";
            const result = validateNpmName(value);
            if (!result.valid) return `Invalid project name: ${result.problems[0]}`;
          },
        });
      },

      template: () => {
        if (rawOptions.template != null) return Promise.resolve(rawOptions.template);
        return p.select({
          message: "Which starter template?",
          options: TEMPLATES.map(t => ({ value: t.value, label: t.label, hint: t.hint })),
          initialValue: DEFAULT_OPTIONS.template,
        });
      },

      frontend: () => {
        if (rawOptions.frontend != null) return Promise.resolve(rawOptions.frontend);
        return p.select({
          message: "Which frontend framework?",
          options: FRONTENDS.map(f => ({ value: f.value, label: f.label })),
          initialValue: DEFAULT_OPTIONS.frontend as Frontend,
        });
      },

      solidityFramework: () => {
        if (rawOptions.solidityFramework != null) return Promise.resolve(rawOptions.solidityFramework);
        return p.select({
          message: "Which Solidity framework?",
          options: SOLIDITY_FRAMEWORK_OPTIONS.map(s => ({ value: s.value, label: s.label })),
          initialValue: DEFAULT_OPTIONS.solidityFramework as SolidityFramework | "none",
        });
      },

      wallet: () => {
        if (rawOptions.wallet != null) return Promise.resolve(rawOptions.wallet);
        return p.multiselect({
          message: "Which wallet connector(s)?",
          options: WALLETS.map(w => ({ value: w.value, label: w.label, hint: w.hint })),
          initialValues: [...DEFAULT_OPTIONS.wallet] as Wallet[],
          required: true,
        });
      },

      network: () => {
        if (rawOptions.network != null) return Promise.resolve(rawOptions.network);
        return p.select({
          message: "Which Hedera network?",
          options: NETWORKS.map(n => ({ value: n.value, label: n.label, ...("hint" in n && { hint: n.hint }) })),
          initialValue: DEFAULT_OPTIONS.network as Network,
        });
      },

      packageManager: () => {
        if (rawOptions.packageManager != null) return Promise.resolve(rawOptions.packageManager);
        const detected = detectPackageManager();
        return p.select({
          message: "Which package manager?",
          options: PACKAGE_MANAGERS.map(pm => ({ value: pm.value, label: pm.label })),
          initialValue: detected,
        });
      },

      install: () => {
        // Skip prompt when already set by --skip-install or --yes
        if (rawOptions.install === false) return Promise.resolve(false);
        if (rawOptions.install === true) return Promise.resolve(true);
        return p.confirm({
          message: "Install dependencies after scaffolding?",
          initialValue: DEFAULT_OPTIONS.install,
        });
      },
    },
    {
      onCancel() {
        p.cancel("Scaffolding cancelled.");
        process.exit(EXIT_CODES.CANCELLED);
      },
    },
  );

  const rawFramework = answers.solidityFramework as SolidityFramework | "none";
  const solidityFramework: SolidityFramework | null = rawFramework === "none" ? null : rawFramework;

  const options: Options = {
    project: answers.project,
    template: answers.template as string,
    frontend: answers.frontend as Frontend,
    wallet: answers.wallet,
    network: answers.network as Network,
    packageManager: answers.packageManager as PackageManager,
    install: Boolean(answers.install),
    dev: rawOptions.dev,
    externalExtension: rawOptions.externalExtension,
    solidityFramework,
  };

  return options;
}
