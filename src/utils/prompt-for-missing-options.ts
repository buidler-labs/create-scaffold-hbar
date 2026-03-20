import * as p from "@clack/prompts";
import type { Frontend, Network, Options, PackageManager, RawOptions, SolidityFramework, Wallet } from "../types";
import {
  DEFAULT_OPTIONS,
  EXIT_CODES,
  FRONTENDS,
  NETWORKS,
  PACKAGE_MANAGERS,
  SOLIDITY_FRAMEWORK_OPTIONS,
  WALLETS,
} from "./consts";
import { fetchAvailableTemplates } from "./fetch-available-templates";
import { detectPackageManager } from "./parse-arguments-into-options";
import { validateNpmName } from "./validate-name";
import { resolveTemplateCapabilities } from "./template-capabilities";
import { ValidationError } from "./errors";

/**
 * Interactively prompts the user for any options not already set via CLI flags.
 * Uses @clack/prompts p.group() so a single Ctrl-C cancels the entire flow.
 * When a value is already present in `rawOptions`, the corresponding prompt
 * is silently skipped and the pre-supplied value is used.
 */
export async function promptForMissingOptions(rawOptions: RawOptions): Promise<Options> {
  const acceptDefaults = process.env.HBAR_ACCEPT_DEFAULTS === "1" || process.env.HBAR_CI === "1";

  const onCancel = () => {
    p.cancel("Scaffolding cancelled.");
    process.exit(EXIT_CODES.CANCELLED);
  };

  const resolvePromptValue = <T>(value: T): T => {
    if (p.isCancel(value)) onCancel();
    return value;
  };

  const project =
    rawOptions.project ??
    (acceptDefaults
      ? DEFAULT_OPTIONS.project
      : resolvePromptValue(
          (await p.text({
            message: "What is your project name?",
            placeholder: DEFAULT_OPTIONS.project,
            defaultValue: DEFAULT_OPTIONS.project,
            validate(value) {
              if (!value.trim()) return "Project name cannot be empty.";
              const result = validateNpmName(value);
              if (!result.valid) return `Invalid project name: ${result.problems[0]}`;
            },
          })) as string,
        ));

  const template =
    rawOptions.template ??
    (acceptDefaults
      ? DEFAULT_OPTIONS.template
      : await (async () => {
          const templateOptions = await fetchAvailableTemplates();
          const initialValue = templateOptions.some(t => t.value === DEFAULT_OPTIONS.template)
            ? DEFAULT_OPTIONS.template
            : templateOptions[0]?.value;
          return resolvePromptValue(
            (await p.select({
              message: "Which starter template?",
              options: templateOptions.map(t => ({ value: t.value, label: t.label, ...(t.hint && { hint: t.hint }) })),
              initialValue: initialValue ?? DEFAULT_OPTIONS.template,
            })) as string,
          );
        })());

  const capabilities = await resolveTemplateCapabilities(template);

  let frontend: Frontend;
  if (rawOptions.frontend != null) {
    if (!capabilities.frontend.includes(rawOptions.frontend)) {
      throw new ValidationError(
        `Template "${template}" does not support frontend "${rawOptions.frontend}". Allowed: ${capabilities.frontend.join(", ")}`,
      );
    }
    frontend = rawOptions.frontend;
  } else if (capabilities.frontend.length === 1) {
    frontend = capabilities.frontend[0];
  } else if (acceptDefaults) {
    frontend = capabilities.defaults.frontend ?? (DEFAULT_OPTIONS.frontend as Frontend);
  } else {
    frontend = resolvePromptValue(
      (await p.select({
        message: "Which frontend framework?",
        options: FRONTENDS.filter(f => capabilities.frontend.includes(f.value as Frontend)).map(f => ({
          value: f.value,
          label: f.label,
        })),
        initialValue: capabilities.defaults.frontend ?? (DEFAULT_OPTIONS.frontend as Frontend),
      })) as Frontend,
    );
  }

  let solidityFramework: SolidityFramework | null;
  if (rawOptions.solidityFramework != null) {
    if (!capabilities.solidityFramework.includes(rawOptions.solidityFramework)) {
      throw new ValidationError(
        `Template "${template}" does not support solidity framework "${rawOptions.solidityFramework}". Allowed: ${capabilities.solidityFramework.join(", ")}`,
      );
    }
    solidityFramework = rawOptions.solidityFramework === "none" ? null : rawOptions.solidityFramework;
  } else if (capabilities.solidityFramework.length === 0) {
    solidityFramework = null;
  } else if (capabilities.solidityFramework.length === 1) {
    solidityFramework = capabilities.solidityFramework[0] === "none" ? null : capabilities.solidityFramework[0];
  } else if (acceptDefaults) {
    const defaultFramework = capabilities.defaults.solidityFramework ?? DEFAULT_OPTIONS.solidityFramework;
    solidityFramework = defaultFramework === "none" ? null : defaultFramework;
  } else {
    const selected = resolvePromptValue(
      (await p.select({
        message: "Which Solidity framework?",
        options: SOLIDITY_FRAMEWORK_OPTIONS.filter(s =>
          capabilities.solidityFramework.includes(s.value as SolidityFramework | "none"),
        ).map(s => ({ value: s.value, label: s.label })),
        initialValue:
          capabilities.defaults.solidityFramework ?? (DEFAULT_OPTIONS.solidityFramework as SolidityFramework),
      })) as SolidityFramework | "none",
    );
    solidityFramework = selected === "none" ? null : selected;
  }

  const wallet =
    rawOptions.wallet ??
    (acceptDefaults
      ? ([...DEFAULT_OPTIONS.wallet] as Wallet[])
      : resolvePromptValue(
          (await p.multiselect({
            message: "Which wallet connector(s)?",
            options: WALLETS.map(w => ({ value: w.value, label: w.label, hint: w.hint })),
            initialValues: [...DEFAULT_OPTIONS.wallet] as Wallet[],
            required: true,
          })) as Wallet[],
        ));

  const network =
    rawOptions.network ??
    (acceptDefaults
      ? (DEFAULT_OPTIONS.network as Network)
      : resolvePromptValue(
          (await p.select({
            message: "Which Hedera network?",
            options: NETWORKS.map(n => ({ value: n.value, label: n.label, ...("hint" in n && { hint: n.hint }) })),
            initialValue: DEFAULT_OPTIONS.network as Network,
          })) as Network,
        ));

  const packageManager =
    rawOptions.packageManager ??
    (acceptDefaults
      ? detectPackageManager()
      : resolvePromptValue(
          (await p.select({
            message: "Which package manager?",
            options: PACKAGE_MANAGERS.map(pm => ({ value: pm.value, label: pm.label })),
            initialValue: detectPackageManager(),
          })) as PackageManager,
        ));

  const install =
    rawOptions.install === false
      ? false
      : rawOptions.install === true
        ? true
        : acceptDefaults
          ? DEFAULT_OPTIONS.install
          : resolvePromptValue(
              (await p.confirm({
                message: "Install dependencies after scaffolding?",
                initialValue: DEFAULT_OPTIONS.install,
              })) as boolean,
            );

  return {
    project,
    template,
    frontend,
    wallet,
    network,
    packageManager,
    install: Boolean(install),
    solidityFramework,
  };
}
