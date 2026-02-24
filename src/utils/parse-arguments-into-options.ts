import type {
  Args,
  SolidityFramework,
  RawOptions,
  SolidityFrameworkChoices,
  PackageManager,
  Network,
  Frontend,
  Wallet,
} from "../types";
import { Command } from "commander";
import { getSolidityFrameworkDirsFromExternalExtension, validateExternalExtension } from "./external-extensions";
import chalk from "chalk";
import {
  SOLIDITY_FRAMEWORKS,
  DEFAULT_OPTIONS,
  EXIT_CODES,
  TEMPLATES,
  FRONTENDS,
  SOLIDITY_FRAMEWORK_OPTIONS,
  WALLETS,
  NETWORKS,
  PACKAGE_MANAGERS,
} from "./consts";
import { validateNpmName } from "./validate-name";
import packageJson from "../../package.json";
import { execa } from "execa";
import * as p from "@clack/prompts";
import * as fs from "fs";

// ─── Valid enum values derived from consts (single source of truth) ───────────
// Extracting .value from each option array means adding a new entry to consts.ts
// automatically makes it valid here — no second edit needed.

const VALID_TEMPLATES = TEMPLATES.map(t => t.value);
const VALID_FRONTENDS = FRONTENDS.map(f => f.value) as readonly Frontend[];
const VALID_SOLIDITY_FRAMEWORKS = SOLIDITY_FRAMEWORK_OPTIONS.map(s => s.value) as readonly (
  | SolidityFramework
  | "none"
)[];
const VALID_WALLETS = WALLETS.map(w => w.value) as readonly Wallet[];
const VALID_NETWORKS = NETWORKS.map(n => n.value) as readonly Network[];
const VALID_PACKAGE_MANAGERS = PACKAGE_MANAGERS.map(pm => pm.value) as readonly PackageManager[];
const VALID_LOG_LEVELS = ["error", "warn", "info", "verbose", "debug"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Prints an error message and exits with BAD_ARGS (exit code 2).
 * Used for invalid flag values caught at parse time.
 */
function exitWithBadArgs(message: string): never {
  console.error(chalk.red(`\nError: ${message}`));
  console.error(chalk.gray(`Run with --help to see available options.\n`));
  process.exit(EXIT_CODES.BAD_ARGS);
}

/**
 * Validates that a flag value belongs to an allowed set.
 * Exits with code 2 if the value is not in the list.
 */
function validateEnum<T extends string>(value: string, allowed: readonly T[], flagName: string): T {
  const lower = value.toLowerCase() as T;
  if (!allowed.includes(lower)) {
    exitWithBadArgs(`"${value}" is not a valid value for --${flagName}. Allowed: ${allowed.join(", ")}`);
  }
  return lower;
}

/**
 * Detects the package manager from the npm_config_user_agent env var (set
 * automatically when using `npm/pnpm/yarn/bun create`) or from lockfiles in cwd.
 * Falls back to "npm".
 */
export function detectPackageManager(): PackageManager {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("bun")) return "bun";
  if (agent.startsWith("npm")) return "npm";

  // Lockfile detection as secondary signal
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
  if (fs.existsSync("yarn.lock")) return "yarn";
  if (fs.existsSync("bun.lockb")) return "bun";

  return "npm";
}

/**
 * Parses CLI arguments using commander and returns raw (pre-prompt) options.
 * Keeps the return signature compatible with cli.ts which also expects
 * `solidityFrameworkChoices` (used by the extension system).
 */
export async function parseArgumentsIntoOptions(
  rawArgs: Args,
): Promise<{ rawOptions: RawOptions; solidityFrameworkChoices: SolidityFrameworkChoices }> {
  const program = new Command();

  program
    .name("create-hbar")
    .description("Scaffold a Hedera dApp project")
    .version(packageJson.version, "-v, --version", "Print CLI version and exit")
    .argument("[project-name]", "Name / path of the project directory to create")
    .option("-d, --destination <path>", "Output directory (alternative to positional arg)")
    .option("-t, --template <template>", "Starter template key or GitHub org/repo")
    .option("-f, --frontend <framework>", "Frontend framework (nextjs-app|nextjs-pages|vite-react|none)")
    .option("-s, --solidity-framework <fw>", "Solidity framework (foundry|hardhat|none)")
    .option("-w, --wallet <wallets>", "Wallet connector(s), comma-separated (walletconnect,metamask)")
    .option("--network <network>", "Target network (testnet|mainnet|local)")
    .option("--use-npm", "Use npm as package manager")
    .option("-p, --use-pnpm", "Use pnpm as package manager")
    .option("--use-yarn", "Use yarn as package manager")
    .option("--use-bun", "Use bun as package manager")
    .option("--skip-install", "Skip dependency installation")
    .option("-y, --yes", "Accept all defaults and skip all prompts")
    .option("--ci", "CI mode: non-interactive, structured log output, no TTY color")
    .option("--log-level <level>", "Log verbosity (error|warn|info|verbose|debug)", "info")
    .option("-e, --extension <ext>", "Community extension (owner/repo or curated name)")
    .option("--dev", "Dev mode: use local externalExtensions/ symlinks instead of downloads")
    .helpOption("-h, --help", "Display help text and exit")
    // Prevent commander from calling process.exit on unknown options so we
    // can surface a friendlier BAD_ARGS message ourselves.
    .allowUnknownOption(false)
    .exitOverride();

  try {
    program.parse(rawArgs);
  } catch (err: any) {
    // commander throws CommanderError for --help / --version (exit code 0)
    // and for unknown options (exit code 1). Re-map parse errors to BAD_ARGS.
    if (err?.code === "commander.helpDisplayed" || err?.code === "commander.version") {
      process.exit(EXIT_CODES.SUCCESS);
    }
    exitWithBadArgs(err?.message ?? "Invalid arguments");
  }

  const opts = program.opts();
  const [positionalName] = program.args;

  // ── Resolve project name: destination flag > positional arg ──────────────
  const rawProject: string | null = (opts.destination as string | undefined) ?? positionalName ?? null;

  let project: string | null = rawProject;
  if (project) {
    const validation = validateNpmName(project);
    if (!validation.valid) {
      console.error(chalk.red(`\nCould not create a project called ${chalk.yellow(`"${project}"`)}`));
      validation.problems.forEach((prob: string) => console.error(chalk.red(`  >> ${prob}`)));
      project = null;
    }
  }

  // ── Validate enum flags ───────────────────────────────────────────────────
  const template = opts.template
    ? (opts.template as string).includes("/")
      ? (opts.template as string) // community template: org/repo — pass through
      : validateEnum(opts.template as string, VALID_TEMPLATES, "template")
    : null;

  const frontend = opts.frontend ? validateEnum(opts.frontend as string, VALID_FRONTENDS, "frontend") : null;

  const solidityFrameworkRaw = opts.solidityFramework
    ? validateEnum(opts.solidityFramework as string, VALID_SOLIDITY_FRAMEWORKS, "solidity-framework")
    : null;

  const network = opts.network ? validateEnum(opts.network as string, VALID_NETWORKS, "network") : null;

  const logLevel = validateEnum(opts.logLevel as string, VALID_LOG_LEVELS, "log-level");

  // ── Resolve wallet (comma-separated multiselect) ──────────────────────────
  const wallet: Wallet[] | null = opts.wallet
    ? (opts.wallet as string).split(",").map((w: string) => validateEnum(w.trim(), VALID_WALLETS, "wallet"))
    : null;

  // ── Resolve package manager (explicit flags take priority over detection) ──
  let packageManager: PackageManager | null = null;
  const pmFlagCount = [opts.useNpm, opts.usePnpm, opts.useYarn, opts.useBun].filter(Boolean).length;
  if (pmFlagCount > 1) {
    exitWithBadArgs(
      "Only one package manager flag may be specified at a time (--use-npm, --use-pnpm, --use-yarn, --use-bun)",
    );
  }
  if (opts.useNpm) packageManager = validateEnum("npm", VALID_PACKAGE_MANAGERS, "use-npm");
  else if (opts.usePnpm) packageManager = validateEnum("pnpm", VALID_PACKAGE_MANAGERS, "use-pnpm");
  else if (opts.useYarn) packageManager = validateEnum("yarn", VALID_PACKAGE_MANAGERS, "use-yarn");
  else if (opts.useBun) packageManager = validateEnum("bun", VALID_PACKAGE_MANAGERS, "use-bun");

  // ── --ci implies --yes ────────────────────────────────────────────────────
  const isCi = Boolean(opts.ci);
  const acceptDefaults = Boolean(opts.yes) || isCi;

  // ── Extension system (kept from original) ─────────────────────────────────
  const dev = Boolean(opts.dev);
  const extensionName = opts.extension as string | undefined;
  const extension = extensionName ? await validateExternalExtension(extensionName, dev) : null;

  if (extension && typeof extension === "object" && !extension.isTrusted) {
    console.log(
      chalk.yellow(
        ` You are using a third-party extension. Make sure you trust the source of ${chalk.yellow.bold(extension.repository)}\n`,
      ),
    );
  }

  // Check if extension recommends a different create-hbar version
  if (extension && typeof extension === "object" && extension.recommendedCreateEthVersion) {
    const currentVersion = packageJson.version;
    if (extension.recommendedCreateEthVersion !== currentVersion) {
      console.log(
        chalk.yellow(
          `\n⚠️  This extension recommends create-hbar ${chalk.bold(`v${extension.recommendedCreateEthVersion}`)}, but you are running ${chalk.bold(`v${currentVersion}`)}.\n`,
        ),
      );

      if (!isCi) {
        const switchVersion = await p.confirm({
          message: `Run with the recommended version (${extension.recommendedCreateEthVersion})?`,
          initialValue: true,
        });

        if (switchVersion && !p.isCancel(switchVersion)) {
          console.log(chalk.gray(`\nSwitching to create-hbar@${extension.recommendedCreateEthVersion}...\n`));
          await execa("npx", [`create-hbar@${extension.recommendedCreateEthVersion}`, ...rawArgs.slice(2)], {
            stdio: "inherit",
          });
          process.exit(EXIT_CODES.SUCCESS);
        }

        const proceed = await p.confirm({
          message: "Proceed with the current version anyway?",
          initialValue: false,
        });

        if (!proceed || p.isCancel(proceed)) {
          p.cancel("Cancelled. No project was created.");
          process.exit(EXIT_CODES.CANCELLED);
        }
      }
    }
  }

  // ── Build solidityFrameworkChoices (extension may narrow the list) ─────────
  let solidityFrameworkChoices: SolidityFrameworkChoices = [
    SOLIDITY_FRAMEWORKS.HARDHAT,
    SOLIDITY_FRAMEWORKS.FOUNDRY,
    { value: null, name: "none" },
  ];

  if (extension) {
    const dirs = await getSolidityFrameworkDirsFromExternalExtension(extension);
    if (dirs.length !== 0) {
      solidityFrameworkChoices = dirs;
    }
  }

  // If the extension narrows to exactly one framework, use it automatically.
  const solidityFramework: SolidityFramework | "none" | null =
    solidityFrameworkChoices.length === 1
      ? (solidityFrameworkChoices[0] as SolidityFramework | "none")
      : solidityFrameworkRaw;

  // ── Apply --yes / --ci defaults for any still-null fields ─────────────────
  const rawOptions: RawOptions = {
    project: acceptDefaults ? (project ?? DEFAULT_OPTIONS.project) : project,
    install: opts.skipInstall ? false : acceptDefaults ? DEFAULT_OPTIONS.install : true,
    dev,
    externalExtension: extension,
    help: false, // --help is handled by commander before we reach here
    solidityFramework:
      acceptDefaults && !solidityFramework
        ? (DEFAULT_OPTIONS.solidityFramework as SolidityFramework)
        : solidityFramework,
    template: acceptDefaults ? (template ?? DEFAULT_OPTIONS.template) : template,
    frontend: acceptDefaults ? (frontend ?? DEFAULT_OPTIONS.frontend) : frontend,
    wallet: acceptDefaults ? (wallet ?? [...DEFAULT_OPTIONS.wallet]) : wallet,
    network: acceptDefaults ? (network ?? DEFAULT_OPTIONS.network) : network,
    packageManager: packageManager ?? (acceptDefaults ? detectPackageManager() : null),
  };

  // Expose ci and logLevel on the process env so downstream modules can read them
  // without needing to thread Options through every call site.
  if (isCi) process.env.HBAR_CI = "1";
  process.env.HBAR_LOG_LEVEL = logLevel;

  return { rawOptions, solidityFrameworkChoices };
}
