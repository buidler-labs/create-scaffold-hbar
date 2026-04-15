import * as p from "@clack/prompts";
<<<<<<< HEAD
import type { Frontend, Network, Options, RawOptions, SolidityFramework } from "../types";
import { DEFAULT_OPTIONS, EXIT_CODES, FRONTENDS, NETWORKS, SOLIDITY_FRAMEWORK_OPTIONS } from "./consts";
=======
import type { Frontend, Network, Options, RawOptions, SolidityFramework, Wallet, PackageManager } from "../types";
import {
  DEFAULT_OPTIONS,
  EXIT_CODES,
  FRONTENDS,
  NETWORKS,
  SOLIDITY_FRAMEWORK_OPTIONS,
  WALLETS,
  PACKAGE_MANAGERS,
} from "./consts";
>>>>>>> 377484a (feat: implement npm support as pm for templates)
import { fetchAvailableTemplates } from "./fetch-available-templates";
import { validateNpmName } from "./validate-name";
import { resolveTemplateCapabilities } from "./template-capabilities";
import { detectPackageManager } from "./detect-pm";
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
              const effective = value.trim() || DEFAULT_OPTIONS.project;
              const result = validateNpmName(effective);
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

  const packageManager: PackageManager =
    rawOptions.packageManager ??
    (acceptDefaults
      ? DEFAULT_OPTIONS.packageManager
      : resolvePromptValue(
          (await p.select({
            message: "Which package manager?",
            options: PACKAGE_MANAGERS.map(pm => {
              const option: { value: PackageManager; label: string; hint?: string } = {
                value: pm.value,
                label: pm.label,
              };
              if ("hint" in pm && pm.hint) {
                option.hint = pm.hint;
              }
              return option;
            }),
            initialValue: detectPackageManager(),
          })) as PackageManager,
        ));

  return {
    project,
    template,
    frontend,
    network,
    packageManager,
    install: Boolean(install),
    solidityFramework,
  };
}
